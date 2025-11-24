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

... (rest of document omitted for brevity)

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

    // Fetch interest and related entities separately (avoid joins)
    const { data: interest, error: fetchError } = await supabaseAdmin
      .from('candidate_interests')
      .select('*')
      .eq('id', interestId)
      .single()
    if (fetchError || !interest) throw new Error(`Interest not found: ${fetchError?.message || ''}`)

    const [candidateRes, jobRes, agencyRes] = await Promise.all([
      supabaseAdmin.from('candidates').select('*').eq('id', interest.candidate_id).single(),
      supabaseAdmin.from('jobs').select('*').eq('id', interest.job_id).single(),
      supabaseAdmin.from('profiles').select('*').eq('id', interest.agency_id).single()
    ])

    const candidate = candidateRes.data
    const job = jobRes.data
    const agency = agencyRes.data

    if (!candidate || !job || !agency) throw new Error('Missing required data: candidate, job, or agency')

    const rtrContent = generateRTRContent(interest, candidate, job, agency)
    const fileName = `rtr/${interestId}.txt`
    // Upload RTR document as text
    const { error: uploadError } = await supabaseAdmin.storage
      .from('documents')
      .upload(fileName, rtrContent, {
        contentType: 'text/plain',
        upsert: true,
        cacheControl: '3600'
      })
    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`)

    const { data: { publicUrl } } = supabaseAdmin.storage.from('documents').getPublicUrl(fileName)

    // Update interest with RTR url and status
    const { error: updateError } = await supabaseAdmin
      .from('candidate_interests')
      .update({
        right_to_represent_url: publicUrl,
        right_to_represent_signed: false,
        rtr_status: 'ready',
        agency_notes: `RTR (re)generated on ${new Date().toISOString()}`
      })
      .eq('id', interestId)
    if (updateError) throw new Error(`Update failed: ${updateError.message}`)

    // Send notifications
    await Promise.all([
      candidate?.user_id &&
        supabaseAdmin.from('notifications').insert({
          user_id: candidate.user_id,
          type: 'rtr_ready',
          title: '✍️ RTR ready to sign',
          message: `Your Right-to-Represent agreement for "${job.title}" is ready and awaits your signature.`,
          link: `/dashboard/candidate/interests/${interestId}/sign-rtr`,
          ai_priority: 'high',
          metadata: { interest_id: interestId, job_title: job.title, rtr_url: publicUrl }
        }),
      supabaseAdmin.from('notifications').insert({
        user_id: interest.agency_id,
        type: 'rtr_generated',
        title: '📄 RTR generated',
        message: `RTR for ${candidate.name} on "${job.title}" has been generated and sent to the candidate.`,
        link: `/dashboard/agency/interests/${interestId}`,
        ai_priority: 'normal',
        metadata: { interest_id: interestId, candidate_name: candidate.name }
      })
    ])

    return NextResponse.json({ success: true, rtr_url: publicUrl, message: 'RTR generated and sent to candidate' })
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'RTR generation failed' }, { status: 500 })
  }
}
