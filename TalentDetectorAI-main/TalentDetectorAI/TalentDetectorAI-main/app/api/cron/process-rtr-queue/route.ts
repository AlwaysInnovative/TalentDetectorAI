import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    // Get pending jobs
    const { data: jobs, error } = await supabaseAdmin
      .from('rtr_generation_queue')
      .select('*')
      .eq('status', 'pending')
      .lt('attempts', 3)
      .order('created_at', { ascending: true })
      .limit(10)

    if (error) throw error

    const results = await Promise.allSettled(
      jobs.map(async (job) => {
        // Update to processing
        await supabaseAdmin
          .from('rtr_generation_queue')
          .update({ 
            status: 'processing',
            attempts: job.attempts + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', job.id)

        // Call generation API
        const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/generate-rtr-auto`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ interestId: job.interest_id })
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Generation failed')
        }

        return { success: true, interestId: job.interest_id }
      })
    )

    const successful = results.filter(r => r.status === 'fulfilled').length
    const failed = results.filter(r => r.status === 'rejected').length

    return NextResponse.json({
      processed: jobs.length,
      successful,
      failed,
      results
    })

  } catch (error: any) {
    console.error('Queue processing error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
