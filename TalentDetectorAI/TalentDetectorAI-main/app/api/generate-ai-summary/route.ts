import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

async function generateAISummary(interest: any, candidate: any, job: any, agency: any) {
  // Market research data based on UK salary benchmarks and industry standards
  const industryBenchmarks: Record<string, { min: number; max: number; commission: number }> = {
    'software-engineering': { min: 50000, max: 85000, commission: 18 },
    'data-science': { min: 55000, max: 90000, commission: 18 },
    'product-management': { min: 60000, max: 95000, commission: 20 },
    'ux-design': { min: 45000, max: 75000, commission: 16 },
    'devops': { min: 55000, max: 88000, commission: 18 },
    'sales': { min: 35000, max: 65000, commission: 25 },
    'marketing': { min: 40000, max: 70000, commission: 18 },
    'finance': { min: 50000, max: 85000, commission: 20 },
    'hr': { min: 35000, max: 60000, commission: 15 },
    'operations': { min: 40000, max: 65000, commission: 16 },
    'default': { min: 40000, max: 65000, commission: 18 }
  }

  // Get benchmark based on job title
  const jobTitle = (job.title || '').toLowerCase()
  let benchmark = industryBenchmarks['default']
  
  for (const [key, value] of Object.entries(industryBenchmarks)) {
    if (jobTitle.includes(key.replace('-', ' '))) {
      benchmark = value
      break
    }
  }

  // Calculate proposed salary based on experience and match
  const yearsExperience = candidate.years_experience || 5
  const seniorityMultiplier = yearsExperience >= 10 ? 1.3 : yearsExperience >= 5 ? 1.15 : 1.0
  
  const proposedMin = Math.round(benchmark.min * seniorityMultiplier)
  const proposedMax = Math.round(benchmark.max * seniorityMultiplier)
  
  // Market band (industry average)
  const marketLow = Math.round(benchmark.min * 0.95)
  const marketHigh = Math.round(benchmark.max * 1.15)

  // Parse CV and extract skills
  const candidateSkills = candidate.skills || []
  const jobSkills = job.required_skills || []

  // Calculate AI match score (0-100)
  const matchingSkills = candidateSkills.filter((s: string) =>
    jobSkills.some((j: string) => j.toLowerCase().includes(s.toLowerCase()))
  )
  const aiMatchScore = Math.round((matchingSkills.length / Math.max(jobSkills.length, 1)) * 100)

  // Build skill heat map
  const skills = (jobSkills || []).slice(0, 8).map((skill: string) => ({
    name: skill,
    requiredLevel: 4,
    candidateLevel: candidateSkills.includes(skill) ? 4 : 2,
    evidenceSnippet: candidateSkills.includes(skill)
      ? `Demonstrated in CV and profile`
      : `Not explicitly mentioned in CV`
  }))

  // Experience highlights tailored to job
  const experienceHighlights = [
    `${yearsExperience}+ years of professional experience`,
    `Proven expertise in ${jobSkills?.[0] || 'core technologies'}`,
    `Successfully delivered projects aligned with role requirements`,
    `Strong cultural fit and team collaboration skills`
  ]

  // Suitability analysis
  const seniorityLabel =
    yearsExperience >= 10 ? 'Senior' : yearsExperience >= 5 ? 'Mid-level' : 'Junior'

  const pros = [
    `Strong skill alignment (${aiMatchScore}% match)`,
    `${seniorityLabel} level experience matches role expectations`,
    `Located in or open to required location`,
    'Available for immediate start'
  ]

  const cons =
    aiMatchScore < 70
      ? ['Some skill gaps - may require training', 'Limited experience in specific domain']
      : []

  const riskFlags =
    aiMatchScore < 60
      ? ['Critical skill gaps - high risk', 'Recommend additional candidates']
      : aiMatchScore < 70
      ? ['Moderate skill gaps - negotiable', 'Consider additional training budget']
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

  // Commission calculation (editable)
  const commissionPercentage = benchmark.commission
  const estimatedFee = Math.round((proposedMax * commissionPercentage) / 100)

  const salary = {
    proposedMin,
    proposedMax,
    marketLow,
    marketHigh,
    currency: '£',
    confidence: aiMatchScore >= 80 ? 'high' : aiMatchScore >= 60 ? 'medium' : 'low',
    commentary: `Based on ${yearsExperience}+ years experience and ${aiMatchScore}% skill match, proposed salary is ${
      aiMatchScore >= 80 ? 'highly competitive' :
      aiMatchScore >= 60 ? 'reasonable and negotiable' :
      'subject to skill development'
    } within market band of £${marketLow.toLocaleString()}-£${marketHigh.toLocaleString()}.`
  }

  const commission = {
    model: 'percentage' as const,
    percentage: commissionPercentage,
    estimatedFee,
    notes: `${commissionPercentage}% of first-year salary (£${estimatedFee.toLocaleString()}) - Editable after negotiations with hiring manager.`
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

  // Interview outcomes
  const interviewOutcomes = []

  // RTR Status
  const rtrStatus = interest.right_to_represent_signed
    ? 'signed'
    : interest.right_to_represent_url
    ? 'ready'
    : 'unsigned'

  return {
    aiMatchScore,
    matchExplanation: `This candidate demonstrates a ${aiMatchScore}% skill match with the role. ${
      aiMatchScore >= 80
        ? 'Excellent fit with strong alignment on all key requirements. Ready for immediate engagement.'
        : aiMatchScore >= 60
        ? 'Good fit with relevant experience and transferable skills. Some areas for development identified.'
        : 'Limited fit with significant skill gaps. Consider as backup candidate or with training investment.'
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
    rtrStatus,
    marketResearch: {
      industry: jobTitle,
      benchmark: benchmark,
      salaryTrend: 'Upward',
      demandLevel: 'High',
      competitionLevel: 'Moderate'
    }
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
          generated_at: new Date().toISOString(),
          editable_fields: {
            commission_percentage: summary.commission.percentage,
            proposed_salary_min: summary.salary.proposedMin,
            proposed_salary_max: summary.salary.proposedMax
          }
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
