import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function isAuthorized(request: Request) {
  const expected = process.env.CRON_SECRET
  return Boolean(expected && request.headers.get('authorization') === `Bearer ${expected}`)
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
  if (!isAuthorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM_EMAIL
  if (!apiKey || !from) {
    return NextResponse.json({ error: 'Email delivery is not configured' }, { status: 503 })
  }

  try {
    const supabaseAdmin = createAdminClient()
    const resend = new Resend(apiKey)
    const { data: emails, error: fetchError } = await supabaseAdmin
      .from('email_queue')
      .select('id, to_email, subject, body')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(10)

    if (fetchError) {
      console.error('Email queue fetch failed:', fetchError.message)
      return NextResponse.json({ error: 'Failed to fetch email queue' }, { status: 500 })
    }
    if (!emails?.length) return NextResponse.json({ success: true, message: 'No pending emails', count: 0 })

    const results: Array<{ id: string; status: 'sent' | 'failed' | 'skipped' }> = []

    for (const email of emails) {
      // Atomic compare-and-set claim; only the worker that changes pending to processing may send.
      const { data: claimed, error: claimError } = await supabaseAdmin
        .from('email_queue')
        .update({ status: 'processing', error_message: null })
        .eq('id', email.id)
        .eq('status', 'pending')
        .select('id')
        .maybeSingle()

      if (claimError) {
        console.error('Email queue claim failed:', claimError.message)
        results.push({ id: email.id, status: 'failed' })
        continue
      }
      if (!claimed) {
        results.push({ id: email.id, status: 'skipped' })
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
          .eq('status', 'processing')
        if (updateError) throw new Error('Delivery succeeded but queue status update failed')
        results.push({ id: email.id, status: 'sent' })
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Email delivery failed'
        console.error('Email delivery failed for queue row:', email.id, message)
        await supabaseAdmin.from('email_queue')
          .update({ status: 'failed', error_message: message.slice(0, 500) })
          .eq('id', email.id)
          .eq('status', 'processing')
        results.push({ id: email.id, status: 'failed' })
      }
    }

    return NextResponse.json({
      success: results.every(result => result.status === 'sent' || result.status === 'skipped'),
      count: results.length,
      sent: results.filter(result => result.status === 'sent').length,
      failed: results.filter(result => result.status === 'failed').length,
      skipped: results.filter(result => result.status === 'skipped').length
    })
  } catch (error) {
    console.error('Email queue processing failed:', error)
    return NextResponse.json({ error: 'Email queue processing failed' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { data, error } = await createAdminClient().from('email_queue').select('status')
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
