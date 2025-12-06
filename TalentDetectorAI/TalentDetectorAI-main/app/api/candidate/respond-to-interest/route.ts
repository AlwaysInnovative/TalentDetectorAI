import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { interest_id, interestId, accepted, comment } = body
    const interestIdFinal = interestId || interest_id

    console.log('API Payload:', { interestId, interest_id, accepted, comment: comment?.slice(0, 50) + '...' })

    if (!interestIdFinal || typeof accepted !== 'boolean') {
      return NextResponse.json(
        { error: `Missing: interest_id="${interestIdFinal}", accepted=${accepted}` },
        { status: 400 }
      )
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Fetch interest with relations
    const { data: interest, error: fetchError } = await supabaseAdmin
      .from('candidate_interests')
      .select(`
        id, status, agency_id, candidate_id, candidate_acceptance_status,
        candidates(id, name),
        jobs(id, title),
        profiles!candidate_interests_agency_id_fkey(id, full_name)
      `)
      .eq('id', interestIdFinal)
      .single()

    if (fetchError || !interest) {
      console.error('Interest not found:', fetchError)
      return NextResponse.json({ error: 'Interest not found' }, { status: 404 })
    }

    // Prevent double responses
    if (interest.candidate_acceptance_status !== 'pending_response') {
      return NextResponse.json(
        { error: `Already responded: ${interest.candidate_acceptance_status}` },
        { status: 400 }
      )
    }

    const newStatus = accepted ? 'interested' : 'not_interested'
    const acceptance = accepted ? 'accepted' : 'rejected'

    // Update interest
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
      console.error('Update failed:', updateError)
      return NextResponse.json({ error: 'Failed to save response' }, { status: 500 })
    }

    // Agency notification (safe)
    try {
      await supabaseAdmin.from('notifications').insert({
        user_id: interest.agency_id,
        type: 'candidate_responded',
        title: accepted ? '✅ Candidate Accepted' : '❌ Candidate Declined',
        message: `${interest.candidates?.name || 'Candidate'} ${accepted ? 'accepted' : 'declined'} "${interest.jobs?.title}". ${comment || ''}`,
        link: `/dashboard/agency/interests/${interestIdFinal}`,
        ai_priority: 'high'
      })
    } catch (notifError) {
      console.warn('Notification failed:', notifError)
    }

    return NextResponse.json({ success: true, status: newStatus })
  } catch (error: any) {
    console.error('API Error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
