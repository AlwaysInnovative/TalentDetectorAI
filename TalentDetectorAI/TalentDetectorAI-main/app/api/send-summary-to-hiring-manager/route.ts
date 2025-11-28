import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

export async function POST(request: Request) {
  try {
    const { interestId, editedCommissionPercentage, editedSalaryMin, editedSalaryMax } = await request.json()

    if (!interestId) {
      return NextResponse.json({ error: 'Interest ID required' }, { status: 400 })
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Fetch interest, job, candidate
    const { data: interest } = await supabaseAdmin
      .from('candidate_interests')
      .select('*')
      .eq('id', interestId)
      .single()

    const { data: job } = await supabaseAdmin
      .from('jobs')
      .select('*')
      .eq('id', interest.job_id)
      .single()

    const { data: candidate } = await supabaseAdmin
      .from('candidates')
      .select('*')
      .eq('id', interest.candidate_id)
      .single()

    // Fetch AI summary
    const { data: analytics } = await supabaseAdmin
      .from('interest_analytics')
      .select('summary')
      .eq('interest_id', interestId)
      .single()

    if (!analytics?.summary) {
      throw new Error('AI summary not found')
    }

    // Update with edited values
    const updatedSummary = {
      ...analytics.summary,
      commission: {
        ...analytics.summary.commission,
        percentage: editedCommissionPercentage || analytics.summary.commission.percentage,
        estimatedFee: Math.round(
          ((editedSalaryMax || analytics.summary.salary.proposedMax) * (editedCommissionPercentage || analytics.summary.commission.percentage)) / 100
        )
      },
      salary: {
        ...analytics.summary.salary,
        proposedMin: editedSalaryMin || analytics.summary.salary.proposedMin,
        proposedMax: editedSalaryMax || analytics.summary.salary.proposedMax
      }
    }

    // Get hiring manager (job owner/creator)
    const { data: hiringManager } = await supabaseAdmin
      .from('profiles')
      .select('id, email, full_name')
      .eq('id', job.created_by)
      .single()

    if (!hiringManager) {
      throw new Error('Hiring manager not found')
    }

    // Create summary card record for hiring manager
    const { data: summaryCard, error: cardError } = await supabaseAdmin
      .from('candidate_summary_cards')
      .insert({
        interest_id: interestId,
        candidate_id: interest.candidate_id,
        job_id: interest.job_id,
        agency_id: interest.agency_id,
        hiring_manager_id: hiringManager.id,
        summary: updatedSummary,
        sent_at: new Date().toISOString(),
        status: 'sent'
      })
      .select()
      .single()

    if (cardError) throw new Error(`Failed to create summary card: ${cardError.message}`)

    // Send notification to hiring manager
    await supabaseAdmin.from('notifications').insert({
      user_id: hiringManager.id,
      type: 'candidate_summary_received',
      title: `📋 New Candidate Summary: ${candidate.name}`,
      message: `Agency has submitted an AI-powered candidate summary for ${candidate.name} for the ${job.title} role. AI match score: ${updatedSummary.aiMatchScore}%`,
      link: `/dashboard/hiring-manager/candidate-summaries/${summaryCard.id}`,
      action_type: 'view_summary',
      ai_priority: 'high',
      metadata: {
        interest_id: interestId,
        candidate_name: candidate.name,
        job_title: job.title,
        ai_match_score: updatedSummary.aiMatchScore,
        commission_percentage: editedCommissionPercentage || analytics.summary.commission.percentage
      }
    })

    // Update interest_analytics with sent status
    await supabaseAdmin
      .from('interest_analytics')
      .update({
        summary: updatedSummary,
        sent_to_hiring_manager_at: new Date().toISOString(),
        hiring_manager_id: hiringManager.id
      })
      .eq('interest_id', interestId)

    return NextResponse.json({
      success: true,
      message: 'Summary sent to hiring manager',
      summaryCard
    })
  } catch (err: any) {
    console.error('Send summary error:', err)
    return NextResponse.json({ error: err?.message || 'Failed to send summary' }, { status: 500 })
  }
}
