import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { matchSkills, assessExperience, calculateRoleFit, identifyConcerns, identifyStrengths } from '@/lib/algorithms/candidateMatching'
import { calculateSalaryBand, calculateCommission, getSalaryRecommendation } from '@/lib/algorithms/marketSalaryBenchmark'

export const dynamic = 'force-dynamic'
export const maxDuration = 45

interface RequestBody {
  interestId: string
}

export async function POST(request: Request) {
  try {
    const { interestId } = (await request.json()) as RequestBody

    if (!interestId) {
      return NextResponse.json({ error: 'Interest ID required' }, { status: 400 })
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Fetch interest with all related data
    const { data: interest, error: interestError } = await supabaseAdmin
      .from('job_interests')
      .select('*')
      .eq('id', interestId)
      .single()

    if (interestError || !interest) {
      throw new Error(`Interest not found: ${interestError?.message}`)
    }

    // Verify RTR is signed
    if (!interest.right_to_represent_signed) {
      return NextResponse.json(
        { error: 'RTR must be signed before generating summary' },
        { status: 400 }
      )
    }

    // Fetch candidate data
    const { data: candidate, error: candidateError } = await supabaseAdmin
      .from('candidates')
      .select('*')
      .eq('id', interest.candidate_id)
      .single()

    if (candidateError || !candidate) {
      throw new Error(`Candidate not found: ${candidateError?.message}`)
    }

    // Fetch job data
    const { data: job, error: jobError } = await supabaseAdmin
      .from('job_postings')
      .select('*')
      .eq('id', interest.job_id)
      .single()

    if (jobError || !job) {
      throw new Error(`Job not found: ${jobError?.message}`)
    }

    // ==================== ALGORITHM PHASE ====================
    // Run skill matching algorithm
    const skillMatchResult = matchSkills(
      candidate.skills || [],
      job.required_skills || [],
      job.nice_to_have_skills || []
    )

    // Assess experience
    const experienceAssessment = assessExperience(
      candidate.experience_years || 0,
      job.required_experience_years || 3
    )

    // Calculate role fit
    const candidateProfile = {
      name: candidate.name,
      experience_years: candidate.experience_years || 0,
      skills: candidate.skills || [],
      location: candidate.location,
      current_company_size: candidate.current_company_size as 'startup' | 'mid' | 'large',
      employment_type: candidate.employment_type
    }

    const jobProfile = {
      title: job.title,
      required_skills: job.required_skills || [],
      nice_to_have_skills: job.nice_to_have_skills || [],
      experience_years: job.required_experience_years || 3,
      location: job.location,
      company_size: job.company_size as 'startup' | 'mid' | 'large'
    }

    const roleFit = calculateRoleFit(candidateProfile, jobProfile, skillMatchResult)

    // Identify concerns and strengths
    const concerns = identifyConcerns(candidateProfile, jobProfile, skillMatchResult, roleFit)
    const strengths = identifyStrengths(candidateProfile, jobProfile, skillMatchResult, roleFit)

    // Calculate AI match score (0-100)
    const aiMatchScore = Math.round(
      (skillMatchResult.matchPercentage * 0.4 +
        experienceAssessment.score * 10 * 0.3 +
        roleFit.overallFit * 10 * 0.3)
    )

    // ==================== MARKET ANALYSIS PHASE ====================
    // Calculate market salary
    const salaryBand = calculateSalaryBand(
      job.title,
      job.location || 'Bangalore',
      candidate.experience_years || 0,
      job.required_experience_years || 3,
      aiMatchScore,
      'INR'
    )

    const commission = calculateCommission(salaryBand, 20) // 20% default rate

    const salaryRecommendation = getSalaryRecommendation(salaryBand, commission)

    // ==================== AI ENRICHMENT PHASE ====================
    // Use Claude to generate professional executive summary and recommendations
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY!
    })

    const aiPrompt = `You are an expert recruitment analyst. Generate professional, concise insights for a hiring manager.

**Candidate:** ${candidate.name} (${candidate.experience_years || 0} years experience)
**Position:** ${job.title} at ${job.company || 'Company'} (${job.required_experience_years || 3} years required)
**Location:** ${job.location || 'Remote'}

**Algorithmic Analysis:**
- Skill Match: ${skillMatchResult.matchPercentage}% (${skillMatchResult.matchedSkills.length}/${job.required_skills?.length || 0} matched)
- Technical Fit Score: ${roleFit.technicalFit}/10
- Experience Fit: ${experienceAssessment.level} (${candidate.experience_years || 0} vs ${job.required_experience_years || 3} years)
- Overall Fit: ${(roleFit.overallFit * 10).toFixed(1)}/100

**Matched Skills:** ${skillMatchResult.matchedSkills.join(', ') || 'None'}
**Missing Skills:** ${skillMatchResult.missingSkills.join(', ') || 'None'}
**Additional Skills:** ${skillMatchResult.additionalSkills.slice(0, 3).join(', ') || 'None'}

**Market Data:**
${salaryRecommendation}

**Your Task:**
Generate a JSON response with ONLY these fields (no other keys):
{
  "executive_summary": "2-3 sentence summary highlighting why this candidate stands out for THIS role",
  "key_concerns": "2-3 sentences on potential concerns or gaps",
  "recommended_questions": "3-4 specific interview questions based on their profile",
  "timeline_estimate": "Expected time-to-productivity estimate"
}

Be honest and analytical. Focus on THIS specific role. Return ONLY valid JSON.`

    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [{ role: 'user', content: aiPrompt }]
    })

    let aiInsights = {
      executive_summary: '',
      key_concerns: '',
      recommended_questions: '',
      timeline_estimate: ''
    }

    try {
      const responseText = message.content[0].type === 'text' ? message.content[0].text : '{}'
      aiInsights = JSON.parse(responseText)
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError)
      aiInsights = {
        executive_summary: `${candidate.name} is a ${experienceAssessment.level} candidate with ${skillMatchResult.matchPercentage}% skill match for the ${job.title} position.`,
        key_concerns: concerns.join('. '),
        recommended_questions: 'Review algorithmic analysis above.',
        timeline_estimate: 'Standard 2-4 week onboarding'
      }
    }

    // ==================== STORAGE PHASE ====================
    // Create comprehensive summary object
    const summaryData = {
      interest_id: interestId,
      candidate_id: interest.candidate_id,
      job_id: interest.job_id,
      agency_id: interest.agency_id,
      summary: {
        executive_summary: aiInsights.executive_summary,
        key_concerns: aiInsights.key_concerns,
        recommended_questions: aiInsights.recommended_questions,
        timeline_estimate: aiInsights.timeline_estimate,
        skills_match: {
          matched_skills: skillMatchResult.matchedSkills,
          missing_skills: skillMatchResult.missingSkills,
          additional_skills: skillMatchResult.additionalSkills,
          match_percentage: skillMatchResult.matchPercentage
        },
        key_strengths: strengths,
        concerns,
        heat_map: {
          technical_skills: Math.round(roleFit.technicalFit),
          cultural_fit: Math.round(roleFit.culturalFit),
          experience_level: Math.round(experienceAssessment.score),
          communication: 7, // Default, can be enhanced with more data
          leadership_potential: candidate.experience_years && candidate.experience_years > 5 ? 8 : 6
        }
      },
      salary_band: salaryBand,
      commission,
      matched_skills: skillMatchResult.matchedSkills,
      missing_skills: skillMatchResult.missingSkills,
      additional_skills: skillMatchResult.additionalSkills,
      ai_match_score: aiMatchScore,
      technical_fit_score: roleFit.technicalFit,
      experience_fit_score: experienceAssessment.score,
      cultural_fit_score: roleFit.culturalFit,
      overall_fit_score: roleFit.overallFit,
      match_confidence: roleFit.fitConfidence,
      summary_status: 'ready',
      summary_generated_at: new Date().toISOString()
    }

    // Try to insert into interest_analytics (new table)
    const { data: analytics, error: analyticsError } = await supabaseAdmin
      .from('interest_analytics')
      .insert(summaryData)
      .select()
      .single()

    if (analyticsError) {
      console.error('Analytics insert error:', analyticsError)
      // Fallback: try candidate_summaries table
      const { data: summary, error: summaryError } = await supabaseAdmin
        .from('candidate_summaries')
        .insert({
          interest_id: interestId,
          candidate_id: interest.candidate_id,
          job_id: interest.job_id,
          agency_id: interest.agency_id,
          executive_summary: aiInsights.executive_summary,
          skills_match: summaryData.summary.skills_match,
          key_strengths: strengths,
          recommendations: aiInsights.key_concerns,
          heat_map: summaryData.summary.heat_map,
          status: 'ready'
        })
        .select()
        .single()

      if (summaryError) {
        throw new Error(`Failed to save summary: ${summaryError.message}`)
      }

      return NextResponse.json({
        success: true,
        summary: {
          ...summaryData,
          id: summary?.id
        }
      })
    }

    // Send notification to agency
    const { error: notificationError } = await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: interest.agency_id,
        type: 'summary_ready',
        title: '✨ Candidate Summary Ready',
        message: `AI summary for ${candidate.name} on "${job.title}" is ready for review. Match: ${aiMatchScore}%`,
        link: `/dashboard/agency/interests/${interestId}`,
        ai_priority: 'high',
        metadata: {
          interest_id: interestId,
          candidate_name: candidate.name,
          job_title: job.title,
          match_score: aiMatchScore
        }
      })
      .select()
      .single()

    if (notificationError) {
      console.warn('Notification insert failed (non-critical):', notificationError)
    }

    return NextResponse.json({
      success: true,
      summary: summaryData,
      analytics_id: analytics?.id
    })
  } catch (err: any) {
    console.error('Summary generation error:', err)
    return NextResponse.json(
      { error: err?.message || 'Failed to generate summary' },
      { status: 500 }
    )
  }
}
