import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 30 // Vercel timeout

export async function POST(request: Request) {
  const startTime = Date.now()
  
  try {
    const { interestId } = await request.json()

    if (!interestId) {
      return NextResponse.json({ error: 'Interest ID required' }, { status: 400 })
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

    // Fetch interest with all related data
    const { data: interest, error: fetchError } = await supabaseAdmin
      .from('candidate_interests')
      .select(`
        *,
        candidates(id, name, email, phone, location, user_id),
        jobs(id, title, location, salary_min, salary_max, employment_type, company),
        profiles!candidate_interests_agency_id_fkey(id, full_name, company, email, phone)
      `)
      .eq('id', interestId)
      .single()

    if (fetchError || !interest) {
      throw new Error(`Interest not found: ${fetchError?.message}`)
    }

    const { candidates: candidate, jobs: job, profiles: agency } = interest

    // Generate RTR content
    const rtrContent = generateRTRContent(interest, candidate, job, agency)

    // Upload to storage
    const fileName = `rtr_${interestId}_${Date.now()}.txt`
    const { error: uploadError } = await supabaseAdmin.storage
      .from('documents')
      .upload(fileName, rtrContent, {
        contentType: 'text/plain',
        upsert: false,
        cacheControl: '3600'
      })

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`)
    }

    // Get public URL
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('documents')
      .getPublicUrl(fileName)

    // Update interest record
    const { error: updateError } = await supabaseAdmin
      .from('candidate_interests')
      .update({
        right_to_represent_url: publicUrl,
        status: 'rtr_ready',
        agency_notes: `RTR generated on ${new Date().toISOString()}`
      })
      .eq('id', interestId)

    if (updateError) {
      throw new Error(`Update failed: ${updateError.message}`)
    }

    // Send notifications
    await Promise.all([
      // Notify candidate
      candidate.user_id && supabaseAdmin.from('notifications').insert({
        user_id: candidate.user_id,
        type: 'rtr_ready',
        title: '✍️ Document Ready for Signature',
        message: `Your Right-to-Represent agreement for "${job.title}" is ready`,
        link: `/dashboard/candidate/interests/${interestId}/sign-rtr`,
        ai_priority: 'high',
        metadata: { interest_id: interestId, job_title: job.title }
      }),
      
      // Notify agency
      supabaseAdmin.from('notifications').insert({
        user_id: interest.agency_id,
        type: 'rtr_generated',
        title: '📄 RTR Generated',
        message: `RTR sent to ${candidate.name} for signature`,
        link: `/dashboard/agency/interests`,
        ai_priority: 'normal',
        metadata: { interest_id: interestId, candidate_name: candidate.name }
      })
    ])

    // Mark queue job as completed
    await supabaseAdmin
      .from('rtr_generation_queue')
      .update({
        status: 'completed',
        processed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('interest_id', interestId)

    const duration = Date.now() - startTime

    return NextResponse.json({
      success: true,
      rtr_url: publicUrl,
      duration_ms: duration,
      candidate_notified: !!candidate.user_id
    })

  } catch (error: any) {
    console.error('RTR Generation Error:', error)

    // Update queue with error
    if (request.body) {
      const { interestId } = await request.json()
      const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )

      await supabaseAdmin
        .from('rtr_generation_queue')
        .update({
          status: 'failed',
          error_message: error.message,
          attempts: supabaseAdmin.rpc('increment_attempts', { queue_id: interestId }),
          updated_at: new Date().toISOString()
        })
        .eq('interest_id', interestId)
    }

    return NextResponse.json(
      { error: error.message || 'RTR generation failed' },
      { status: 500 }
    )
  }
}

function generateRTRContent(interest: any, candidate: any, job: any, agency: any): string {
  return `
═══════════════════════════════════════════════════════════════
              RIGHT TO REPRESENT AGREEMENT
              Powered by TalentDetector AI
═══════════════════════════════════════════════════════════════

Document ID: ${interest.id}
Generated: ${new Date().toLocaleString('en-GB', { timeZone: 'UTC' })}
AI Match Score: ${interest.ai_match_score || 'N/A'}%

═══════════════════════════════════════════════════════════════

PARTIES TO THIS AGREEMENT

📋 RECRUITMENT AGENCY
   Name: ${agency.full_name}
   Company: ${agency.company || 'Not specified'}
   Email: ${agency.email}
   Phone: ${agency.phone || 'Not specified'}

👤 CANDIDATE
   Name: ${candidate.name}
   Email: ${candidate.email}
   Phone: ${candidate.phone || 'Not specified'}
   Location: ${candidate.location || 'Not specified'}

💼 POSITION DETAILS
   Title: ${job.title}
   Company: ${job.company || 'Not specified'}
   Location: ${job.location}
   Employment Type: ${job.employment_type || 'Not specified'}
   Salary Range: £${job.salary_min?.toLocaleString()} - £${job.salary_max?.toLocaleString()}

═══════════════════════════════════════════════════════════════

AGREEMENT TERMS

1. EXCLUSIVE REPRESENTATION
   The Candidate grants the Agency exclusive right to represent them
   for the position of "${job.title}" for a period of 90 days from
   the date of signing this agreement.

2. SCOPE OF REPRESENTATION
   ✓ Agency may submit Candidate's CV to the hiring company
   ✓ Agency serves as primary intermediary for all communications
   ✓ Candidate will not apply directly during representation period
   ✓ Agency will keep Candidate informed of application progress

3. CANDIDATE OBLIGATIONS
   ✓ Provide accurate and complete information
   ✓ Respond to communications within 48 hours
   ✓ Participate in scheduled interviews
   ✓ Notify Agency of any direct contact with hiring company

4. AGENCY OBLIGATIONS
   ✓ Present Candidate's qualifications professionally
   ✓ Maintain confidentiality of personal information
   ✓ Provide timely updates on application status
   ✓ Act in Candidate's best interests

5. FEES & COMPENSATION
   ✓ No fee charged to Candidate
   ✓ Agency receives commission from hiring company (typically 10-25%)
   ✓ Candidate's salary unaffected by agency fee

6. TERMINATION
   Either party may terminate with 7 days written notice.
   Existing applications remain under agreement terms.

7. DATA PROTECTION
   Both parties comply with UK GDPR and Data Protection Act 2018.

═══════════════════════════════════════════════════════════════

ELECTRONIC SIGNATURE ACKNOWLEDGMENT

By signing below, both parties acknowledge they have read, understood,
and agree to all terms of this agreement. Electronic signatures have
the same legal effect as handwritten signatures under the Electronic
Communications Act 2000.

Candidate Signature: _____________________________

Date: ___________________________________________

IP Address: (Recorded at time of signature)

═══════════════════════════════════════════════════════════════

Generated by TalentDetector AI
© ${new Date().getFullYear()} TalentDetector. All rights reserved.

This is a legally binding document. Keep a copy for your records.
`.trim()
}
