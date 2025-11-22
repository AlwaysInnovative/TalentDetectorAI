import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

function generateRTRContent(interest: any, candidate: any, job: any, agency: any): string {
  return `
==============================================================
                 RIGHT TO REPRESENT AGREEMENT
                 Powered by TalentDetector AI
==============================================================

Document ID: ${interest.id}
Generated: ${new Date().toLocaleString('en-GB', { timeZone: 'UTC' })}
AI Match Score: ${interest.ai_match_score ?? 'N/A'}%

==============================================================
PARTIES

Recruitment Agency
  Name      : ${agency.full_name}
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
  Location  : ${job.location}
  Type      : ${job.employment_type || 'Not specified'}
  Salary    : £${job.salary_min?.toLocaleString()} - £${job.salary_max?.toLocaleString()}

==============================================================
...
# (Rest is unchanged)
`.trim()
}

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
    // Only select existing job fields:
    const { data: interest, error: fetchError } = await supabaseAdmin
      .from('candidate_interests')
      .select(`
        *,
        candidates(id, name, email, phone, location, user_id),
        jobs(id, title, location, salary_min, salary_max, employment_type),
        profiles!candidate_interests_agency_id_fkey(id, full_name, company, email, phone)
      `)
      .eq('id', interestId)
      .single()

    if (fetchError || !interest) {
      throw new Error(`Interest not found: ${fetchError?.message || ''}`)
    }

    const candidate = interest.candidates
    const job = interest.jobs
    const agency = interest.profiles

    const rtrContent = generateRTRContent(interest, candidate, job, agency)

    const fileName = `rtr/${interestId}.txt`
    const { error: uploadError } = await supabaseAdmin.storage
      .from('documents')
      .upload(fileName, rtrContent, { contentType: 'text/plain', upsert: true, cacheControl: '0' })
    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`)

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('documents')
      .getPublicUrl(fileName)

    const { error: updateError } = await supabaseAdmin
      .from('candidate_interests')
      .update({
        right_to_represent_url: publicUrl,
        status: 'rtr_ready',
        agency_notes: `RTR (re)generated on ${new Date().toISOString()}`
      })
      .eq('id', interestId)
    if (updateError) throw new Error(`Update failed: ${updateError.message}`)

    await Promise.all([
      candidate?.user_id &&
        supabaseAdmin.from('notifications').insert({
          user_id: candidate.user_id,
          type: 'rtr_ready',
          title: '✍️ RTR ready to sign',
          message: `Your Right-to-Represent agreement for "${job.title}" is ready (or has been updated) and awaits your signature.`,
          link: `/dashboard/candidate/interests/${interestId}/sign-rtr`,
          ai_priority: 'high',
          metadata: { interest_id: interestId, job_title: job.title, regenerated: true }
        }),
      supabaseAdmin.from('notifications').insert({
        user_id: interest.agency_id,
        type: 'rtr_generated',
        title: '📄 RTR (re)generated',
        message: `RTR for ${candidate.name} on "${job.title}" has been (re)generated and sent to the candidate.`,
        link: `/dashboard/agency/interests/${interestId}`,
        ai_priority: 'normal',
        metadata: { interest_id: interestId, candidate_name: candidate.name, regenerated: true }
      })
    ])

    return NextResponse.json({ success: true, rtr_url: publicUrl })
  } catch (err: any) {
    console.error('RTR generation error:', err)
    return NextResponse.json({ error: err?.message || 'RTR generation failed' }, { status: 500 })
  }
}
