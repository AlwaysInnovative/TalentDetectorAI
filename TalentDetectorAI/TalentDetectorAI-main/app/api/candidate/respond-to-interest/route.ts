import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    // Accept BOTH field names (interestId OR interest_id)
    const { interest_id, interestId, accepted, comment } = body
    const interestIdFinal = interestId || interest_id

    console.log('API Received:', { interestId, interest_id, accepted, comment })

    if (!interestIdFinal || typeof accepted !== 'boolean') {
      return NextResponse.json(
        { 
          error: `Missing fields. Got: interestId="${interestId}", interest_id="${interest_id}", accepted=${accepted}` 
        },
        { status: 400 }
      )
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: { autoRefreshToken: false, persistSession: false }
      }
    )

    const { data: interest, error: fetchError } = await supabaseAdmin
      .from('candidate_interests')
      .select(`
        *,
        candidates(id, name, email, user_id),
        jobs(id, title),
        profiles!candidate_interests_agency_id_fkey(id, full_name, email)
      `)
      .eq('id', interestIdFinal)
      .single()

    if (fetchError || !interest) {
      console.error('Interest fetch error:', fetchError)
      return NextResponse.json({ error: 'Interest not found' }, { status: 404 })
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
      .eq('id', interestIdFinal)

    if (updateError) {
      console.error('Update error:', updateError)
      return NextResponse.json({ error: 'Failed to save response: ' + updateError.message }, { status: 500 })
    }

    // Safe notification insert
    await supabaseAdmin.from('notifications').insert({
      user_id: interest.agency_id || interest.profiles?.id,
      type: 'candidate_responded',
      title: accepted ? '✅ Candidate Accepted Opportunity' : '❌ Candidate Declined Opportunity',
      message: `${interest.candidates?.name || 'Candidate'} has ${accepted ? 'accepted' : 'declined'} the "${interest.jobs?.title || 'job'}" opportunity${comment ? `: ${comment}` : ''}`,
      link: `/dashboard/agency/interests/${interestIdFinal}`,
      ai_priority: 'high',
      metadata: {
        interest_id: interestIdFinal,
        candidate_id: interest.candidate_id,
        accepted,
        comment
      }
    }).catch(err => console.warn('Notification insert failed (non-critical):', err))

    return NextResponse.json({
      success: true,
      status: newStatus,
      acceptance,
      interestId: interestIdFinal
    })
  } catch (error: any) {
    console.error('Respond-to-interest ERROR:', error)
    return NextResponse.json(
      { error: error?.message || 'Unexpected server error' },
      { status: 500 }
    )
  }
}
