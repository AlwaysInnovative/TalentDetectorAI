import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function isAuthorized(request: Request) {
  const expected = process.env.CRON_SECRET
  const authorization = request.headers.get('authorization')
  return Boolean(expected && authorization === `Bearer ${expected}`)
}

function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) throw new Error('Server configuration is incomplete')
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM_EMAIL
  if (!apiKey || !from) {
    return NextResponse.json(
      { error: 'Email delivery is not configured' },
      { status: 503 }
    )
  }

  try {
    const supabaseAdmin = createAdminClient()
    const resend = new Resend(apiKey)

    const { data: emails, error: fetchError } = await supabaseAdmin
      .from('email_queue')
      .select('id, to_email, to_name, subject, body, status')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(10)

    if (fetchError) {
      console.error('Email queue fetch failed:', fetchError.message)
      return NextResponse.json({ error: 'Failed to fetch email queue' }, { status: 500 })
    }

    if (!emails?.length) {
      return NextResponse.json({ success: true, message: 'No pending emails', count: 0 })
    }

    const results: Array<{ id: string; status: 'sent' | 'failed' }> = []

    for (const email of emails) {
      // Claim the row before sending so overlapping cron invocations are less likely
      // to send the same message. The schema's status constraint must include processing
      // before this claim is enabled; until then keep the pending->sent/failed schema.
      const { error: claimError } = await supabaseAdmin
        .from('email_queue')
        .update({ status: 'failed', error_message: 'Delivery attempt in progress' })
        .eq('id', email.id)
        .eq('status', 'pending')

      if (claimError) {
        console.error('Email queue claim failed:', claimError.message)
        results.push({ id: email.id, status: 'failed' })
        continue
      }

      try {
        const { error: sendError } = await resend.emails.send({
          from,
          to: [email.to_email],
          subject: email.subject,
          text: email.body
        })

        if (sendError) throw new Error(sendError.message)

        const { error: updateError } = await supabaseAdmin
          .from('email_queue')
          .update({ status: 'sent', sent_at: new Date().toISOString(), error_message: null })
          .eq('id', email.id)

        if (updateError) throw new Error('Email sent but queue status could not be updated')
        results.push({ id: email.id, status: 'sent' })
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Email delivery failed'
        console.error('Email delivery failed for queue row:', email.id, message)
        await supabaseAdmin
          .from('email_queue')
          .update({ status: 'failed', error_message: message.slice(0, 500) })
          .eq('id', email.id)
        results.push({ id: email.id, status: 'failed' })
      }
    }

    return NextResponse.json({
      success: results.every(result => result.status === 'sent'),
      count: results.length,
      sent: results.filter(result => result.status === 'sent').length,
      failed: results.filter(result => result.status === 'failed').length
    })
  } catch (error) {
    console.error('Email queue processing failed:', error)
    return NextResponse.json({ error: 'Email queue processing failed' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabaseAdmin = createAdminClient()
    const { data, error } = await supabaseAdmin
      .from('email_queue')
      .select('status')

    if (error) {
      console.error('Email queue status read failed:', error.message)
      return NextResponse.json({ error: 'Failed to read queue status' }, { status: 500 })
    }

    const summary = (data || []).reduce((acc: Record<string, number>, row: { status: string }) => {
      acc[row.status] = (acc[row.status] || 0) + 1
      return acc
    }, {})

    return NextResponse.json({ status: 'healthy', queue_summary: summary })
  } catch (error) {
    console.error('Email queue health check failed:', error)
    return NextResponse.json({ error: 'Email queue health check failed' }, { status: 500 })
  }
}
