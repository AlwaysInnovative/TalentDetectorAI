import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const { interest_id, accepted, comment } = await request.json()

    if (!interest_id || typeof accepted !== 'boolean') {
      return NextResponse.json(
        { error: 'Missing or invalid fields: interest_id, accepted' },
        { status: 400 }
      )
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Fetch interest with related data
    const { data: interest, error: fetchError } = await supabaseAdmin
      .from('candidate_interests')
      .select(`
        *,
        candidates(id, name, email, user_id),
        jobs(id, title),
        profiles!candidate_interests_agency_id_fkey(id, full_name, email)
      `)
      .eq('id', interest_id)
      .single()

    if (fetchError || !interest) {
      return NextResponse.json(
        { error: 'Interest not found' },
        { status: 404 }
      )
    }

    const newStatus = accepted ? 'interested' : 'not_interested'
    const acceptance = accepted ? 'accepted' : 'rejected'

    const { error: updateError } = await supabaseAdmin
      .from('candidate_interests')
      .update({
        candidate_acceptance_status: acceptance,
        candidate_response: acceptance,
        candidate_response_comment: comment || null,
        candidate_responded_at: new Date().toISOString(),
        status: newStatus
      })
      .eq('id', interest_id)

    if (updateError) {
      console.error('Update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to save response' },
        { status: 500 }
      )
    }

    // Notify agency
    await supabaseAdmin.from('notifications').insert({
      user_id: interest.agency_id,
      type: 'candidate_responded',
      title: accepted ? 'Candidate accepted opportunity' : 'Candidate declined opportunity',
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
      status: newStatus,
      acceptance
    })
  } catch (error: any) {
    console.error('Respond-to-interest error:', error)
    return NextResponse.json(
      { error: error?.message || 'Unexpected error' },
      { status: 500 }
    )
  }
}
