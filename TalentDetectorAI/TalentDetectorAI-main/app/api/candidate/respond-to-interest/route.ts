import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const { interest_id, accepted, comment } = await request.json()

    if (!interest_id || accepted === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Fetch interest with related data
    const { data: interest, error: fetchErr } = await supabaseAdmin
      .from('candidate_interests')
      .select(`
        *,
        candidates(id, name, email),
        jobs(id, title),
        profiles!candidate_interests_agency_id_fkey(id, full_name, email)
      `)
      .eq('id', interest_id)
      .single()

    if (fetchErr || !interest) {
      return NextResponse.json({ error: 'Interest not found' }, { status: 404 })
    }

    // Update interest with candidate response
    // Use ALLOWED status values only: 'interested' or 'not_interested'
    const newStatus = accepted ? 'interested' : 'not_interested'

    const { error: updateErr } = await supabaseAdmin
      .from('candidate_interests')
      .update({
        candidate_acceptance_status: accepted ? 'accepted' : 'rejected',
        candidate_response: accepted ? 'accepted' : 'rejected',
        candidate_response_comment: comment || null,
        candidate_responded_at: new Date().toISOString(),
        status: newStatus
      })
      .eq('id', interest_id)

    if (updateErr) {
      console.error('Update error:', updateErr)
      return NextResponse.json({ error: 'Failed to save response' }, { status: 500 })
    }

    // Notify agency
    await supabaseAdmin.from('notifications').insert({
      user_id: interest.profiles.id,
      type: accepted ? 'candidate_accepted' : 'candidate_rejected',
      title: accepted ? 'Candidate Accepted' : 'Candidate Declined',
      message: `${interest.candidates.name} has ${accepted ? 'accepted' : 'declined'} the ${interest.jobs.title} opportunity${comment ? ': ' + comment : ''}`,
      link: `/dashboard/agency/interests/${interest_id}`,
      ai_priority: 'high',
      metadata: {
        interest_id,
        candidate_id: interest.candidate_id,
        accepted,
        comment
      }
    })

    return NextResponse.json({
      success: true,
      message: accepted ? 'You accepted this opportunity!' : 'You declined this opportunity'
    })

  } catch (error: any) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 })
  }
}
