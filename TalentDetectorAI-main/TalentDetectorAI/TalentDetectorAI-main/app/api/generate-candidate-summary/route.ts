import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

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
      .from('candidate_interests')
      .select('*')
      .eq('id', interestId)
      .single()

    if (interestError || !interest) {
      throw new Error('Interest not found')
    }

    // Check if RTR is signed
    if (!interest.right_to_represent_signed) {
      return NextResponse.json(
        { error: 'RTR must be signed before generating summary' },
        { status: 400 }
      )
    }

    // Fetch related data
    const [candidateRes, jobRes] = await Promise.all([
      supabaseAdmin.from('candidates').select('*').eq('id', interest.candidate_id).single(),
      supabaseAdmin.from('jobs').select('*').eq('id', interest.job_id).single()
    ])

    const candidate = candidateRes.data
    const job = jobRes.data

    if (!candidate || !job) {
      throw new Error('Missing candidate or job data')
    }

    // Generate AI summary using Claude
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!
    })

    const prompt = `You are an expert recruitment analyst. Generate a comprehensive candidate summary for hiring manager review.

**Candidate Information:**
- Name: ${candidate.name}
- Location: ${candidate.location || 'Not specified'}
- Experience: ${candidate.experience_years || 0} years
- Skills: ${candidate.skills?.join(', ') || 'Not specified'}
- Email: ${candidate.email}

**Position Details:**
- Title: ${job.title}
- Company: ${job.company}
- Location: ${job.location}
- Type: ${job.employment_type || 'Not specified'}
- Salary Range: £${job.salary_min?.toLocaleString()} - £${job.salary_max?.toLocaleString()}
- Description: ${job.description || 'Not provided'}

**Requirements:**
${job.required_skills?.join(', ') || 'Not specified'}

**Your Task:**
Generate a JSON response with these exact keys:

1. **executive_summary**: 2-3 sentences highlighting why this candidate stands out
2. **skills_match**: Object with:
   - matched_skills: array of skills that match job requirements
   - missing_skills: array of skills from job that candidate lacks
   - additional_skills: array of valuable skills candidate has beyond requirements
   - match_percentage: number 0-100
3. **key_strengths**: Array of 4-5 bullet points (each 15-20 words)
4. **recommendations**: 2-3 sentences on next steps
5. **heat_map**: Object with scores 1-10 for:
   - technical_skills
   - cultural_fit
   - experience_level
   - communication
   - leadership_potential

Be honest and analytical. Focus on fit for THIS specific role.

Return ONLY valid JSON, no markdown formatting.`

    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }]
    })

    let aiSummary
    try {
      const responseText = message.content[0].type === 'text' ? message.content[0].text : '{}'
      aiSummary = JSON.parse(responseText)
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError)
      throw new Error('Invalid AI response format')
    }

    // Store summary
    const { data: summary, error: insertError } = await supabaseAdmin
      .from('candidate_summaries')
      .insert({
        interest_id: interestId,
        candidate_id: candidate.id,
        job_id: job.id,
        agency_id: interest.agency_id,
        executive_summary: aiSummary.executive_summary,
        skills_match: aiSummary.skills_match,
        key_strengths: aiSummary.key_strengths,
        recommendations: aiSummary.recommendations,
        heat_map: aiSummary.heat_map,
        ai_match_score: interest.ai_match_score || aiSummary.skills_match?.match_percentage,
        status: 'draft'
      })
      .select()
      .single()

    if (insertError) {
      console.error('Insert error:', insertError)
      throw new Error(`Failed to save summary: ${insertError.message}`)
    }

    return NextResponse.json({ 
      success: true, 
      summary 
    })
  } catch (err: any) {
    console.error('Summary generation error:', err)
    return NextResponse.json({ 
      error: err.message || 'Failed to generate summary' 
    }, { status: 500 })
  }
}
