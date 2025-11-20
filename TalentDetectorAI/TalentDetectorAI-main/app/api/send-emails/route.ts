import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const secret = searchParams.get('secret')
    
    if (!secret || secret !== process.env.CRON_SECRET) {
      return NextResponse.json(
        { error: 'Unauthorized - invalid secret' },
        { status: 401 }
      )
    }

    // Check environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // Get pending emails
    const { data: emails, error: fetchError } = await supabaseAdmin
      .from('email_queue')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(10)

    if (fetchError) {
      console.error('Fetch error:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch emails', details: fetchError.message },
        { status: 500 }
      )
    }

    if (!emails || emails.length === 0) {
      return NextResponse.json({ 
        success: true,
        message: 'No pending emails',
        count: 0 
      })
    }

    const results = []

    for (const email of emails) {
      try {
        console.log('📧 Processing email:', email.id)
        console.log('   To:', email.to_email)
        console.log('   Subject:', email.subject)
        
        // TODO: Send actual email here
        // For now, just mark as sent
        
        await supabaseAdmin
          .from('email_queue')
          .update({ 
            status: 'sent', 
            sent_at: new Date().toISOString() 
          })
          .eq('id', email.id)

        results.push({ 
          id: email.id, 
          status: 'sent', 
          to: email.to_email 
        })

      } catch (emailError: any) {
        console.error('Email processing error:', emailError)
        
        await supabaseAdmin
          .from('email_queue')
          .update({ 
            status: 'failed',
            error_message: emailError.message 
          })
          .eq('id', email.id)

        results.push({ 
          id: email.id, 
          status: 'failed', 
          error: emailError.message 
        })
      }
    }

    return NextResponse.json({ 
      success: true,
      message: 'Email batch processed',
      count: results.length,
      results 
    })

  } catch (error: any) {
    console.error('Send emails error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error.message,
        details: error.toString()
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )
    
    const { data, error } = await supabaseAdmin
      .from('email_queue')
      .select('status')

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    const summary = (data || []).reduce((acc: any, row: any) => {
      acc[row.status] = (acc[row.status] || 0) + 1
      return acc
    }, {})

    return NextResponse.json({ 
      status: 'healthy',
      queue_summary: summary,
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
