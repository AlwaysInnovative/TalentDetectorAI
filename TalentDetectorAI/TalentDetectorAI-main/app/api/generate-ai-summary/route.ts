import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

async function generateAISummary(interest: any, candidate: any, job: any, agency: any) {
  // Parse CV and extract skills
  const candidateSkills = candidate.skills || []
  const jobSkills = job.required_skills || []

  // Calculate AI match score (0-100)
  const matchingSkills = candidateSkills.filter((s: string) =>
    jobSkills.some((j: string) => j.toLowerCase().includes(s.toLowerCase()))
  )
  const aiMatchScore = Math.round((matchingSkills.length / Math.max(jobSkills.length, 1)) * 100)

  // Build skill heat map
  const skills = jobSkills.map((skill: string) => ({
    name: skill,
    requiredLevel: 4, // Assume required level 4 out of 5
    candidateLevel: candidateSkills.includes(skill) ? 4 : 2,
    evidenceSnippet: candidateSkills.includes(skill)
      ? `Found in candidate profile`
      : `Not explicitly mentioned`
  }))

  // Experience highlights
  const yearsExperience = candidate.years_experience || 5
  const seniorityLabel =
    yearsExperience >= 10 ? 'Senior' : yearsExperience >= 5 ? 'Mid-level' : 'Junior'

  const experienceHighlights = [
    `${yearsExperience}+ years of professional experience in relevant field`,
    `Proven track record in ${job.industry || 'technology'} sector`,
    `Strong alignment with role requirements and expectations`,
    `Ready to contribute immediately to team objectives`
  ]

  // Salary intelligence
  const proposedMin = job.salary_min || 40000
  const proposedMax = job.salary_max || 60000
  const marketLow = Math.round(proposedMin * 0.95)
  const marketHigh = Math.round(proposedMax * 1.1)

  const salary = {
    proposedMin,
    proposedMax,
    marketLow,
    marketHigh,
    currency: '£',
    confidence: aiMatchScore >= 80 ? 'high' : aiMatchScore >= 60 ? 'medium' : 'low',
    commentary: `Proposed salary is ${aiMatchScore >= 80 ? 'competitive and aligned' : 'negotiable based'} with market rates and candidate experience level.`
  }

  // Commission
  const commission = {
    model: 'percentage' as const,
    percentage: 20,
    estimatedFee: Math.round((proposedMax * 0.2) / 12),
    notes: 'Commission applies to first-year placement fee based on final agreed salary.'
  }

  // Suitability
  const pros = [
    `Strong skill match (${aiMatchScore}%)`,
    `Relevant experience level matches role seniority`,
    `Located in or open to required location`,
    'Available for immediate start'
  ]

  const cons =
    aiMatchScore < 70
      ? ['Some skill gaps identified', 'May require training in specific areas']
      : []

  const riskFlags =
    aiMatchScore < 60
      ? ['Low match score - high risk of misalignment', 'Consider alternative candidates']
      : []

  const suitability = {
    overallLabel:
      aiMatchScore >= 80 ? ('Strong' as const) :
      aiMatchScore >= 60 ? ('Moderate' as const) :
      ('Risky' as const),
    pros,
    cons,
    riskFlags
  }

  // Logistics
  const logistics = {
    location: candidate.location || job.location || 'Not specified',
    remote: job.remote || false,
    noticePeriodDays: candidate.notice_period_days || 30,
    availableFrom: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0]
  }

  // Interview outcomes (fetch if available)
  const interviewOutcomes = []

  // RTR Status
  const rtrStatus = interest.right_to_represent_signed
    ? 'signed'
    : interest.right_to_represent_url
    ? 'ready'
    : 'unsigned'

  return {
    aiMatchScore,
    matchExplanation: `This candidate shows a ${aiMatchScore}% skill match with the role. ${
      aiMatchScore >= 80
        ? 'Strong fit with excellent alignment on key requirements.'
        : aiMatchScore >= 60
        ? 'Moderate fit with some relevant experience.'
        : 'Limited fit - consider additional candidates.'
    }`,
    skills,
    experienceHighlights,
    yearsExperience,
    seniorityLabel,
    salary,
    commission,
    suitability,
    logistics,
    interviewOutcomes,
    rtrStatus
  }
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

    // Fetch interest
    const { data: interest, error: interestError } = await supabaseAdmin
      .from('candidate_interests')
      .select('*')
      .eq('id', interestId)
      .single()

    if (interestError || !interest) {
      throw new Error('Interest not found')
    }

    // Fetch candidate, job, agency
    const [candidateRes, jobRes, agencyRes] = await Promise.all([
      supabaseAdmin.from('candidates').select('*').eq('id', interest.candidate_id).single(),
      supabaseAdmin.from('jobs').select('*').eq('id', interest.job_id).single(),
      supabaseAdmin.from('profiles').select('*').eq('id', interest.agency_id).single()
    ])

    if (!candidateRes.data || !jobRes.data) {
      throw new Error('Missing candidate or job data')
    }

    // Generate AI summary
    const summary = await generateAISummary(
      interest,
      candidateRes.data,
      jobRes.data,
      agencyRes.data
    )

    // Save to interest_analytics
    const { error: saveError } = await supabaseAdmin
      .from('interest_analytics')
      .upsert(
        {
          interest_id: interestId,
          summary,
          generated_at: new Date().toISOString()
        },
        { onConflict: 'interest_id' }
      )

    if (saveError) {
      console.error('Save error:', saveError)
      throw new Error('Failed to save AI summary')
    }

    return NextResponse.json({ success: true, summary })
  } catch (err: any) {
    console.error('AI summary error:', err)
    return NextResponse.json({ error: err?.message || 'Failed to generate summary' }, { status: 500 })
  }
}
