import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { summaryId, hiringManagerId } = await request.json()

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const timestamp = new Date().toISOString()

    // Update summary
    const { data: summary, error: updateError } = await supabaseAdmin
      .from('candidate_summaries')
      .update({
        hiring_manager_id: hiringManagerId,
        status: 'sent_to_hm',
        sent_to_hm_at: timestamp
      })
      .eq('id', summaryId)
      .select(`
        *,
        candidates(name),
        jobs(title)
      `)
      .single()

    if (updateError) throw updateError

    // Send notification to hiring manager
    await supabaseAdmin.from('notifications').insert({
      user_id: hiringManagerId,
      type: 'candidate_summary',
      title: '📊 New Candidate Summary',
      message: `Review ${summary.candidates.name} for ${summary.jobs.title}`,
      link: `/dashboard/hiring-manager/summaries/${summaryId}`,
      ai_priority: 'high',
      metadata: {
        summary_id: summaryId,
        candidate_name: summary.candidates.name,
        job_title: summary.jobs.title
      }
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
