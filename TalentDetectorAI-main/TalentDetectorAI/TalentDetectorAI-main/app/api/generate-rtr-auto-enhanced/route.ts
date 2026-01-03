import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 45

/**
 * Generate RTR (Right-to-Represent) document content
 */
function generateRTRContent(
  interest: any,
  candidate: any,
  job: any,
  agency: any
): string {
  const generatedDate = new Date().toLocaleString('en-GB', { timeZone: 'UTC' })

  return `
==============================================================
                 RIGHT TO REPRESENT AGREEMENT
                 Powered by TalentDetector AI
==============================================================

Document ID: ${interest.id}
Generated: ${generatedDate}
AI Match Score: ${interest.ai_match_score ?? 'N/A'}%

==============================================================
PARTIES

Recruitment Agency
  Name      : ${agency.full_name || 'Not specified'}
  Company   : ${agency.company || 'Not specified'}
  Email     : ${agency.email}
  Phone     : ${agency.phone || 'Not specified'}

Candidate
  Name      : ${candidate.name}
  Email     : ${candidate.email}
  Phone     : ${candidate.phone || 'Not specified'}
  Location  : ${candidate.location || 'Not specified'}

Position
  Title     : ${job.title}
  Company   : ${job.company || 'Not specified'}
  Location  : ${job.location}
  Type      : ${job.employment_type || 'Not specified'}
  Salary    : ${job.salary_min && job.salary_max ? `₹${(job.salary_min / 100000).toFixed(1)}L - ₹${(job.salary_max / 100000).toFixed(1)}L` : 'Not specified'}

==============================================================
TERMS AND CONDITIONS

1. EXCLUSIVE REPRESENTATION
   The Recruitment Agency ("Agency") shall have the exclusive right to
   represent the Candidate for the above-specified position for a period
   of 12 months from the date of this agreement, unless the Candidate
   accepts an offer or the Agreement is terminated as per Section 6.

2. CANDIDATE CONSENT
   The Candidate hereby grants the Agency permission to:
   - Submit their CV and application materials to the hiring company
   - Represent them in negotiations regarding this position
   - Act as the primary point of contact with the employer
   - Share relevant information for the purpose of recruitment

3. CONFIDENTIALITY
   Both parties agree to maintain confidentiality of all information
   shared during the recruitment process, including salary expectations,
   medical information, and personal details, except as required by law
   or with explicit written consent.

4. CANDIDATE OBLIGATIONS
   The Candidate agrees to:
   - Not apply directly to the company for this position
   - Not engage with other agencies for this specific role
   - Promptly respond to communications from the Agency
   - Provide accurate and truthful information
   - Inform the Agency of any changes in circumstances or interest

5. AGENCY OBLIGATIONS
   The Agency agrees to:
   - Act in the Candidate's best interests
   - Maintain professional standards at all times
   - Keep the Candidate informed of application progress
   - Protect the Candidate's personal information
   - Not share CV without candidate's explicit consent

6. TERMINATION
   Either party may terminate this agreement with 7 days' written notice,
   except where the Candidate's application is already under active
   consideration by the employer. In such cases, the Agency remains the
   recruitment contact for a period of 3 months.

7. FEES & COSTS
   The Candidate shall not be liable for any recruitment, placement, or
   administrative fees. All recruitment fees are the sole responsibility
   of the hiring company. The Candidate authorizes deduction of agreed
   benefits only from final salary, if explicitly agreed in writing.

8. CANDIDATE RIGHTS
   The Candidate has the right to:
   - Request closure of this agreement at any time
   - Receive copies of all communications on their behalf
   - Refuse any position offered by the Agency
   - Withdraw from the recruitment process

==============================================================
CANDIDATE ACKNOWLEDGMENT & DIGITAL SIGNATURE

By signing this agreement electronically, I (${candidate.name}) acknowledge that:

☑ I have read and understood all terms and conditions above
☑ I consent to the Agency representing me for the position of ${job.title}
☑ All information I have provided is accurate and complete
☑ I agree to the exclusive representation terms outlined above
☑ I understand this is a legally binding agreement

This document was generated digitally and is legally binding when signed
electronically in accordance with the Information Technology Act, 2000.

Candidate Signature: _________________________________
                     (Electronic signature required)

Date: _________________________________

==============================================================
AGENCY REPRESENTATIVE

Agency Signatory: _________________________________

Date: _________________________________

==============================================================
TERMS EFFECTIVE

This agreement becomes effective immediately upon execution by both
parties and shall remain in force for 12 months or until terminated as
per the terms above, whichever comes first.

==============================================================
CONTACT INFORMATION FOR DISPUTES

For any queries, disputes, or clarifications:
Agency Contact: ${agency.email} | ${agency.phone || 'Not specified'}
Candidate Contact: ${candidate.email} | ${candidate.phone || 'Not specified'}

==============================================================
                    END OF AGREEMENT
==============================================================

This RTR document is legally binding when signed electronically by the Candidate.
Generated by TalentDetector AI - Intelligent Recruitment Platform
${generatedDate}
`.trim()
}

/**
 * POST: Generate RTR document
 * Creates RTR document, uploads to storage, sends to candidate
 */
export async function POST(request: Request) {
  try {
    const { interestId } = await request.json()

    if (!interestId) {
      return NextResponse.json({ error: 'Interest ID required' }, { status: 400 })
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Fetch interest
    const { data: interest, error: interestError } = await supabaseAdmin
      .from('job_interests')
      .select('*')
      .eq('id', interestId)
      .single()

    if (interestError || !interest) {
      throw new Error(`Interest not found: ${interestError?.message}`)
    }

    // Fetch candidate, job, agency
    const [candidateRes, jobRes, agencyRes] = await Promise.all([
      supabaseAdmin.from('candidates').select('*').eq('id', interest.candidate_id).single(),
      supabaseAdmin.from('job_postings').select('*').eq('id', interest.job_id).single(),
      supabaseAdmin.from('profiles').select('*').eq('id', interest.agency_id).single()
    ])

    const candidate = candidateRes.data
    const job = jobRes.data
    const agency = agencyRes.data

    if (!candidate || !job || !agency) {
      throw new Error('Missing required data: candidate, job, or agency')
    }

    // Generate RTR content
    const rtrContent = generateRTRContent(interest, candidate, job, agency)

    // Upload RTR to storage
    const fileName = `rtr/${interestId}.txt`
    const { error: uploadError } = await supabaseAdmin.storage
      .from('documents')
      .upload(fileName, rtrContent, {
        contentType: 'text/plain',
        upsert: true,
        cacheControl: '3600'
      })

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`)
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage.from('documents').getPublicUrl(fileName)
    const publicUrl = urlData.publicUrl

    // Update interest with RTR URL and status
    const { error: updateError } = await supabaseAdmin
      .from('job_interests')
      .update({
        right_to_represent_url: publicUrl,
        right_to_represent_signed: false,
        rtr_status: 'ready',
        agency_notes: `RTR generated on ${new Date().toISOString()}`
      })
      .eq('id', interestId)

    if (updateError) {
      throw new Error(`Update failed: ${updateError.message}`)
    }

    // Send notifications
    const notificationPromises = []

    // Notify candidate
    if (candidate.user_id) {
      notificationPromises.push(
        supabaseAdmin.from('notifications').insert({
          user_id: candidate.user_id,
          type: 'rtr_ready',
          title: '✍️ RTR ready to sign',
          message: `Your Right-to-Represent agreement for "${job.title}" at ${job.company} is ready. Please review and sign.`,
          link: `/dashboard/candidate/interests/${interestId}/sign-rtr`,
          ai_priority: 'high',
          metadata: {
            interest_id: interestId,
            job_title: job.title,
            rtr_url: publicUrl
          }
        })
      )
    }

    // Notify agency
    notificationPromises.push(
      supabaseAdmin.from('notifications').insert({
        user_id: interest.agency_id,
        type: 'rtr_generated',
        title: '📄 RTR generated',
        message: `RTR for ${candidate.name} on "${job.title}" has been generated and sent to candidate for signature.`,
        link: `/dashboard/agency/interests/${interestId}`,
        ai_priority: 'normal',
        metadata: {
          interest_id: interestId,
          candidate_name: candidate.name,
          job_title: job.title
        }
      })
    )

    await Promise.all(notificationPromises)

    return NextResponse.json({
      success: true,
      rtr_url: publicUrl,
      message: 'RTR generated successfully and sent to candidate'
    })
  } catch (err: any) {
    console.error('RTR generation error:', err)
    return NextResponse.json(
      { error: err?.message || 'RTR generation failed' },
      { status: 500 }
    )
  }
}

/**
 * PUT: Handle RTR signed webhook
 * Called when candidate signs RTR
 * Auto-triggers summary generation
 */
export async function PUT(request: Request) {
  try {
    const { interestId, signed_at } = await request.json()

    if (!interestId) {
      return NextResponse.json({ error: 'Interest ID required' }, { status: 400 })
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Fetch interest
    const { data: interest, error: interestError } = await supabaseAdmin
      .from('job_interests')
      .select('*')
      .eq('id', interestId)
      .single()

    if (interestError || !interest) {
      throw new Error(`Interest not found: ${interestError?.message}`)
    }

    // Mark RTR as signed
    const { error: updateError } = await supabaseAdmin
      .from('job_interests')
      .update({
        right_to_represent_signed: true,
        right_to_represent_signed_at: signed_at || new Date().toISOString(),
        rtr_status: 'signed'
      })
      .eq('id', interestId)

    if (updateError) {
      throw new Error(`Update failed: ${updateError.message}`)
    }

    // ========== AUTO-TRIGGER: Generate Summary ==========
    try {
      const summaryResponse = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/generate-candidate-summary-enhanced`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ interestId })
        }
      )

      if (!summaryResponse.ok) {
        console.warn('Summary generation failed:', await summaryResponse.text())
        // Don't fail the entire request if summary generation fails
        // The summary can be generated manually later
      }
    } catch (summaryError) {
      console.warn('Summary generation request failed (non-critical):', summaryError)
    }

    // Fetch candidate and job for notifications
    const [candidateRes, jobRes] = await Promise.all([
      supabaseAdmin.from('candidates').select('*').eq('id', interest.candidate_id).single(),
      supabaseAdmin.from('job_postings').select('*').eq('id', interest.job_id).single()
    ])

    const candidate = candidateRes.data
    const job = jobRes.data

    // Send notifications
    const notificationPromises = []

    // Notify candidate
    if (candidate?.user_id) {
      notificationPromises.push(
        supabaseAdmin.from('notifications').insert({
          user_id: candidate.user_id,
          type: 'rtr_signed',
          title: '✅ RTR Signed Successfully',
          message: `Your RTR for "${job?.title}" has been received. The agency will now prepare your candidate summary.`,
          link: `/dashboard/candidate/interests/${interestId}`,
          ai_priority: 'normal',
          metadata: {
            interest_id: interestId,
            job_title: job?.title
          }
        })
      )
    }

    // Notify agency
    notificationPromises.push(
      supabaseAdmin.from('notifications').insert({
        user_id: interest.agency_id,
        type: 'rtr_signed_agency',
        title: '🎉 RTR Signed & Summary Generating',
        message: `${candidate?.name} has signed the RTR for "${job?.title}". AI candidate summary is being generated...`,
        link: `/dashboard/agency/interests/${interestId}`,
        ai_priority: 'high',
        metadata: {
          interest_id: interestId,
          candidate_name: candidate?.name,
          job_title: job?.title
        }
      })
    )

    await Promise.all(notificationPromises)

    return NextResponse.json({
      success: true,
      message: 'RTR marked as signed and summary generation triggered',
      interest_id: interestId
    })
  } catch (err: any) {
    console.error('RTR signing error:', err)
    return NextResponse.json(
      { error: err?.message || 'RTR signing failed' },
      { status: 500 }
    )
  }
}
