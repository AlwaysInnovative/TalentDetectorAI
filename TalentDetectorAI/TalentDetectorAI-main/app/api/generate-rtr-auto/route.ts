import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

/**
 * Generate comprehensive RTR (Right to Represent) document
 */
function generateRTRContent(interest: any, candidate: any, job: any, agency: any): string {
  const generatedDate = new Date().toLocaleString('en-GB', {
    timeZone: 'UTC',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })

  const salaryInfo = job.salary_min && job.salary_max
    ? `£${job.salary_min.toLocaleString()} - £${job.salary_max.toLocaleString()} per annum`
    : 'Negotiable'

  return `
================================================================================
              RIGHT TO REPRESENT AGREEMENT (RTR)
                 TalentDetector AI - Recruitment Platform
================================================================================

AGREEMENT REFERENCE: RTR-${interest.id.substring(0, 8).toUpperCase()}
GENERATED: ${generatedDate} UTC
MATCH SCORE: ${interest.ai_match_score ?? 'N/A'}%

================================================================================
1. PARTIES TO THIS AGREEMENT
================================================================================

CANDIDATE:
  Name: ${candidate.name || 'N/A'}
  Email: ${candidate.email || 'N/A'}
  Phone: ${candidate.phone || 'N/A'}
  Location: ${candidate.location || 'N/A'}
  Status: Active

RECRUITMENT AGENCY/RECRUITER:
  Name: ${agency.full_name || 'N/A'}
  Company: ${agency.company || 'N/A'}
  Email: ${agency.email || 'N/A'}
  Phone: ${agency.phone || 'N/A'}

================================================================================
2. POSITION DETAILS
================================================================================

Job Title: ${job.title}
Location: ${job.location || 'N/A'}
Employment Type: ${job.employment_type || 'Full-time'}
Salary Range: ${salaryInfo}
Department: ${job.department || 'Not specified'}

Job Description:
${job.description || 'Position details to be discussed'}

================================================================================
3. TERMS & CONDITIONS
================================================================================

3.1 REPRESENTATION AUTHORITY
The candidate grants the agency the exclusive right to represent them for the
position detailed above. The candidate commits to:
  • Not applying for this position through other recruitment channels
  • Maintaining confidentiality about the position details
  • Being available for interviews and assessments
  • Providing accurate information throughout the process

3.2 CANDIDATE OBLIGATIONS
The candidate shall:
  • Respond to agency communication within 24 business hours
  • Attend all scheduled interviews
  • Provide necessary documentation and references
  • Maintain professional conduct throughout the recruitment process
  • Notify the agency of any changes to contact information

3.3 AGENCY OBLIGATIONS
The agency shall:
  • Submit the candidate's CV to the employer
  • Keep the candidate informed of progress
  • Respect the candidate's privacy and confidentiality
  • Follow all applicable data protection regulations
  • Provide fair and transparent communication

3.4 VALIDITY PERIOD
This agreement is valid for the duration of the recruitment process for the
specified position. The agency has exclusive representation rights until:
  • The candidate is offered and accepts the position, OR
  • 60 days from the date of this agreement, whichever comes first, OR
  • Either party terminates this agreement with written notice

3.5 TERMINATION
Either party may terminate this agreement with 5 business days' written notice.
Upon termination, the candidate may pursue other opportunities.

================================================================================
4. CONFIDENTIALITY & DATA PROTECTION
================================================================================

Both parties agree to:
  • Keep all information shared confidential
  • Use information solely for recruitment purposes
  • Comply with GDPR and UK data protection regulations
  • Not share candidate information with unauthorized third parties

The candidate's data will be processed in accordance with our Privacy Policy.

================================================================================
5. FEES & COMPENSATION
================================================================================

No fees are charged to the candidate. Any fees are between the agency and
the hiring company. The candidate will not be held liable for any costs
related to this recruitment process.

================================================================================
6. AI MATCH ANALYSIS
================================================================================

AI Match Score: ${interest.ai_match_score ?? 'N/A'}%

This score represents our AI system's analysis of the candidate's fit for
the position based on:
  • Skills alignment
  • Experience relevance
  • Qualification match
  • Location compatibility
  • Salary expectations

Score Interpretation:
  90-100%: Excellent match
  75-89%:  Good match
  60-74%:  Moderate match
  Below 60%: Consider supplementary candidates

================================================================================
7. CANDIDATE ACKNOWLEDGEMENTS
================================================================================

By signing this agreement, the candidate confirms:
  ☐ I have read and understood all terms
  ☐ I grant exclusive representation for this position
  ☐ I will not apply for this position through other channels
  ☐ I authorize the agency to submit my CV to the employer
  ☐ I consent to data processing as described
  ☐ I understand the validity period and termination terms

================================================================================
8. SIGNATURES & DATES
================================================================================

CANDIDATE SIGNATURE:
  Name: ____________________________
  Signature: ____________________________
  Date: ____________________________


AGENCY REPRESENTATIVE SIGNATURE:
  Name: ${agency.full_name || '____________________________'}
  Signature: ____________________________
  Date: ____________________________


WITNESS (OPTIONAL):
  Name: ____________________________
  Signature: ____________________________
  Date: ____________________________

================================================================================
9. CONTACT INFORMATION
================================================================================

For questions about this agreement, please contact:

AGENCY:
  Email: ${agency.email || 'support@talentdetectorai.com'}
  Phone: ${agency.phone || '+44 (0) 2071 928050'}

CANDIDATE SUPPORT:
  Email: support@talentdetectorai.com
  Phone: +44 (0) 2071 928050

================================================================================
10. LEGAL NOTICES
================================================================================

This agreement is governed by English law and the courts of England and Wales
have jurisdiction. This agreement constitutes the entire agreement between the
parties and supersedes all prior negotiations and understandings.

Generated by TalentDetector AI
Platform Version: 2.0.0
================================================================================

DOCUMENT GENERATED: ${new Date().toISOString()}
REFERENCE: RTR-${interest.id}
STATUS: AWAITING SIGNATURE
================================================================================
`.trim()
}

export async function POST(request: Request) {
  try {
    const { interestId } = await request.json()

    console.log('🚀 [generate-rtr-auto] Starting RTR generation for:', interestId)

    if (!interestId || typeof interestId !== 'string') {
      console.error('❌ Invalid interestId:', interestId)
      return NextResponse.json(
        { error: 'Invalid or missing interest ID' },
        { status: 400 }
      )
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Fetch interest
    console.log('📥 Fetching interest details...')
    const { data: interest, error: fetchError } = await supabaseAdmin
      .from('candidate_interests')
      .select('*')
      .eq('id', interestId)
      .single()

    if (fetchError || !interest) {
      console.error('❌ Interest fetch failed:', fetchError?.message || 'Not found')
      return NextResponse.json(
        { error: 'Interest not found' },
        { status: 404 }
      )
    }

    console.log('✅ Interest fetched:', interest.id)

    // Fetch candidate, job, agency in parallel
    console.log('📥 Fetching related entities...')
    const [candidateRes, jobRes, agencyRes] = await Promise.all([
      supabaseAdmin
        .from('candidates')
        .select('id, name, email, phone, location, skills')
        .eq('id', interest.candidate_id)
        .single(),
      supabaseAdmin
        .from('jobs')
        .select('id, title, location, department, employment_type, salary_min, salary_max, description')
        .eq('id', interest.job_id)
        .single(),
      supabaseAdmin
        .from('profiles')
        .select('id, full_name, company, email, phone')
        .eq('id', interest.agency_id)
        .single()
    ])

    const candidate = candidateRes.data
    const job = jobRes.data
    const agency = agencyRes.data

    // Validate all required data
    if (!candidate) {
      console.error('❌ Candidate not found:', interest.candidate_id)
      return NextResponse.json({ error: 'Candidate data not found' }, { status: 404 })
    }
    if (!job) {
      console.error('❌ Job not found:', interest.job_id)
      return NextResponse.json({ error: 'Job data not found' }, { status: 404 })
    }
    if (!agency) {
      console.error('❌ Agency not found:', interest.agency_id)
      return NextResponse.json({ error: 'Agency data not found' }, { status: 404 })
    }

    console.log('✅ All entities fetched:', {
      candidate: candidate.name,
      job: job.title,
      agency: agency.full_name
    })

    // Generate RTR content
    console.log('📝 Generating RTR document content...')
    const rtrContent = generateRTRContent(interest, candidate, job, agency)
    const fileName = `rtr/${interest.id}.txt`

    // Upload to storage
    console.log('📤 Uploading RTR to storage...')
    const { error: uploadError } = await supabaseAdmin.storage
      .from('documents')
      .upload(fileName, rtrContent, {
        contentType: 'text/plain',
        upsert: true,
        cacheControl: '3600'
      })

    if (uploadError) {
      console.error('❌ Storage upload failed:', uploadError.message)
      return NextResponse.json(
        { error: `Upload failed: ${uploadError.message}` },
        { status: 500 }
      )
    }

    console.log('✅ RTR uploaded to storage:', fileName)

    // Get public URL
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('documents')
      .getPublicUrl(fileName)

    console.log('✅ Public URL generated:', publicUrl)

    // Update interest record
    console.log('🔄 Updating interest record...')
    const { error: updateError, data: updatedInterest } = await supabaseAdmin
      .from('candidate_interests')
      .update({
        right_to_represent_url: publicUrl,
        right_to_represent_signed: false,
        rtr_generated_at: new Date().toISOString(),
        rtr_status: 'pending_signature',
        agency_notes: `RTR generated via AI on ${new Date().toISOString()}`
      })
      .eq('id', interestId)
      .select()
      .single()

    if (updateError || !updatedInterest) {
      console.error('❌ Interest update failed:', updateError?.message || 'Unknown error')
      return NextResponse.json(
        { error: 'Failed to update interest with RTR' },
        { status: 500 }
      )
    }

    console.log('✅ Interest updated with RTR URL')

    // Send notifications
    console.log('📬 Sending notifications...')
    const notificationPromises = []

    // Candidate notification
    if (candidate.user_id) {
      notificationPromises.push(
        supabaseAdmin.from('notifications').insert({
          user_id: candidate.user_id,
          type: 'rtr_ready_to_sign',
          title: `✍️ RTR Ready - ${job.title}`,
          message: `Your Right-to-Represent agreement for "${job.title}" is ready. Please review and sign it to proceed.`,
          link: `/dashboard/candidate/interests/${interestId}/sign-rtr`,
          ai_priority: 'high',
          read_at: null,
          metadata: {
            interest_id: interestId,
            job_title: job.title,
            agency_name: agency.full_name,
            rtr_url: publicUrl,
            ai_match_score: interest.ai_match_score
          }
        })
      )
    }

    // Agency notification
    notificationPromises.push(
      supabaseAdmin.from('notifications').insert({
        user_id: interest.agency_id,
        type: 'rtr_generated_and_sent',
        title: `📄 RTR Generated - ${candidate.name}`,
        message: `Right-to-Represent agreement for ${candidate.name} (${job.title}) has been generated and sent to candidate. Awaiting signature.`,
        link: `/dashboard/agency/interests/${interestId}`,
        ai_priority: 'normal',
        read_at: null,
        metadata: {
          interest_id: interestId,
          candidate_id: interest.candidate_id,
          candidate_name: candidate.name,
          job_title: job.title,
          rtr_url: publicUrl
        }
      })
    )

    // Execute all notification inserts
    const notificationResults = await Promise.allSettled(notificationPromises)

    notificationResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        console.log(`✅ Notification ${index + 1} sent successfully`)
      } else {
        console.warn(`⚠️ Notification ${index + 1} failed:`, result.reason)
      }
    })

    console.log('✅ [generate-rtr-auto] SUCCESS - RTR generated and notifications sent')

    return NextResponse.json({
      success: true,
      rtr_url: publicUrl,
      message: 'RTR generated successfully and sent to candidate',
      interest: {
        id: interestId,
        rtr_status: 'pending_signature',
        candidate: candidate.name,
        job: job.title,
        ai_match_score: interest.ai_match_score
      }
    })
  } catch (error: any) {
    console.error('❌ [generate-rtr-auto] FATAL ERROR:', error)
    return NextResponse.json(
      { error: error?.message || 'RTR generation failed' },
      { status: 500 }
    )
  }
}
