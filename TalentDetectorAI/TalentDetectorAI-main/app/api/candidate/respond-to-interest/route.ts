import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { interest_id, interestId, accepted, comment } = body
    const interestIdFinal = interestId || interest_id

    console.log('🔄 [respond-to-interest] Incoming Request:', {
      interestId: interestIdFinal,
      accepted,
      comment: comment ? comment.slice(0, 50) + '...' : 'none'
    })

    // Validation
    if (!interestIdFinal || typeof accepted !== 'boolean') {
      console.error('❌ Validation failed:', { interestIdFinal, accepted })
      return NextResponse.json(
        { error: `Missing required fields: interestId="${interestIdFinal}", accepted=${accepted}` },
        { status: 400 }
      )
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Fetch interest with relations
    console.log('📥 Fetching interest:', interestIdFinal)
    const { data: interest, error: fetchError } = await supabaseAdmin
      .from('candidate_interests')
      .select(`
        id,
        status,
        agency_id,
        candidate_id,
        job_id,
        candidate_acceptance_status,
        candidates(id, name, email, user_id),
        jobs(id, title, location, salary_min, salary_max),
        profiles!candidate_interests_agency_id_fkey(id, full_name, email, company)
      `)
      .eq('id', interestIdFinal)
      .single()

    if (fetchError || !interest) {
      console.error('❌ Interest fetch failed:', fetchError?.message || 'Not found')
      return NextResponse.json({ error: 'Interest not found or invalid ID' }, { status: 404 })
    }

    console.log('✅ Interest fetched:', {
      id: interest.id,
      currentStatus: interest.candidate_acceptance_status,
      candidate: interest.candidates?.name,
      job: interest.jobs?.title
    })

    // Prevent double responses
    if (interest.candidate_acceptance_status && interest.candidate_acceptance_status !== 'pending_response') {
      console.warn('⚠️ Double response attempt:', interest.candidate_acceptance_status)
      return NextResponse.json(
        { error: `Already responded as "${interest.candidate_acceptance_status}". Cannot change response.` },
        { status: 400 }
      )
    }

    const newStatus = accepted ? 'interested' : 'not_interested'
    const acceptance = accepted ? 'accepted' : 'rejected'
    const timestamp = new Date().toISOString()

    console.log('🔄 Updating interest status:', { interestIdFinal, acceptance, newStatus })

    // Update interest with all required fields
    const { error: updateError, data: updatedInterest } = await supabaseAdmin
      .from('candidate_interests')
      .update({
        candidate_acceptance_status: acceptance,
        candidate_response: acceptance,
        candidate_response_comment: comment || null,
        candidate_responded_at: timestamp,
        status: newStatus,
        updated_at: timestamp
      })
      .eq('id', interestIdFinal)
      .select()
      .single()

    if (updateError || !updatedInterest) {
      console.error('❌ Update failed:', updateError?.message || 'Unknown error')
      return NextResponse.json(
        { error: 'Failed to save your response. Please try again.' },
        { status: 500 }
      )
    }

    console.log('✅ Interest updated successfully:', newStatus)

    // Agency notification
    if (interest.agency_id) {
      try {
        console.log('📬 Sending agency notification...')
        const notificationTitle = accepted
          ? `✅ ${interest.candidates?.name} Accepted "${interest.jobs?.title}"`
          : `❌ ${interest.candidates?.name} Declined "${interest.jobs?.title}"`

        const notificationMessage = accepted
          ? `${interest.candidates?.name} has accepted your offer for ${interest.jobs?.title}. ${comment ? 'Comment: ' + comment : ''}`
          : `${interest.candidates?.name} has declined your offer for ${interest.jobs?.title}. ${comment ? 'Reason: ' + comment : ''}`

        await supabaseAdmin.from('notifications').insert({
          user_id: interest.agency_id,
          type: accepted ? 'candidate_accepted' : 'candidate_rejected',
          title: notificationTitle,
          message: notificationMessage,
          link: `/dashboard/agency/interests/${interestIdFinal}`,
          ai_priority: 'high',
          read_at: null,
          metadata: {
            interest_id: interestIdFinal,
            candidate_id: interest.candidate_id,
            candidate_name: interest.candidates?.name,
            job_title: interest.jobs?.title,
            status: acceptance
          }
        })
        console.log('✅ Agency notification sent')
      } catch (notifError: any) {
        console.warn('⚠️ Agency notification failed (non-critical):', notifError.message)
      }
    }

    // Candidate confirmation notification
    if (interest.candidates?.user_id) {
      try {
        console.log('📬 Sending candidate confirmation notification...')
        await supabaseAdmin.from('notifications').insert({
          user_id: interest.candidates.user_id,
          type: 'response_confirmed',
          title: accepted ? '✅ Response Confirmed' : '✋ Declined',
          message: accepted
            ? `You have accepted "${interest.jobs?.title}". Next steps: await RTR agreement.`
            : `You have declined "${interest.jobs?.title}". Good luck with other opportunities!`,
          link: `/dashboard/candidate/interests/${interestIdFinal}`,
          ai_priority: 'normal',
          read_at: null,
          metadata: {
            interest_id: interestIdFinal,
            status: acceptance
          }
        })
        console.log('✅ Candidate confirmation sent')
      } catch (notifError: any) {
        console.warn('⚠️ Candidate confirmation failed (non-critical):', notifError.message)
      }
    }

    console.log('✅ [respond-to-interest] SUCCESS - All operations completed')

    return NextResponse.json({
      success: true,
      status: newStatus,
      acceptance,
      message: accepted
        ? `You have accepted "${interest.jobs?.title}". The agency will send you an RTR agreement soon.`
        : `You have declined "${interest.jobs?.title}". The agency has been notified.`,
      interest: {
        id: interest.id,
        status: newStatus,
        candidateName: interest.candidates?.name,
        jobTitle: interest.jobs?.title
      }
    })
  } catch (error: any) {
    console.error('❌ [respond-to-interest] FATAL ERROR:', error)
    return NextResponse.json(
      { error: error?.message || 'An unexpected error occurred' },
      { status: 500 }
    )
  }
}
