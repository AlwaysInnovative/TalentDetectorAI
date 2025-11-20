export async function generateCandidateScorecard(candidate: any, job: any) {
  await new Promise(resolve => setTimeout(resolve, 1500))
  
  const baseScore = Math.floor(Math.random() * 30) + 60
  
  // Generate detailed evaluation
  const strengths = [
    'Strong technical alignment with required stack',
    'Proven track record in similar roles',
    'Excellent communication skills demonstrated',
    'Leadership experience with cross-functional teams',
    'Quick learner with adaptable mindset'
  ]
  
  const weaknesses = [
    'Limited exposure to specific framework mentioned in JD',
    'Could benefit from advanced certification',
    'Geographic relocation may be required',
    'Salary expectations slightly above budget'
  ]
  
  const skillGaps = job.ai_keywords?.map((skill: string) => {
    const hasSkill = Math.random() > 0.3
    const proficiency = hasSkill ? Math.floor(Math.random() * 40) + 60 : Math.floor(Math.random() * 40) + 20
    return {
      skill,
      hasSkill,
      proficiency,
      required: true,
      gap: 100 - proficiency
    }
  }) || []
  
  return {
    matchScore: baseScore,
    technicalFit: Math.min(baseScore + 8, 98),
    experienceFit: Math.max(baseScore - 5, 45),
    culturalFit: Math.min(baseScore + 3, 95),
    salaryFit: Math.floor(Math.random() * 30) + 70,
    
    strengths: strengths.slice(0, 3 + Math.floor(Math.random() * 3)),
    weaknesses: weaknesses.slice(0, 2 + Math.floor(Math.random() * 2)),
    
    skillGaps,
    
    recommendedQuestions: [
      `Describe your experience with ${job.ai_keywords?.[0] || 'this technology'}`,
      'Tell me about a challenging project you led and how you overcame obstacles',
      'How do you approach learning new technologies?',
      'Describe your ideal team environment and collaboration style',
      'What interests you most about this role and our company?',
      'Where do you see yourself in 3-5 years?'
    ],
    
    hiringRecommendation: baseScore > 80 ? 'Strongly Recommend - Fast Track' : 
                          baseScore > 65 ? 'Recommend for Interview' : 
                          'Consider with Reservations',
    
    nextSteps: baseScore > 75 ? 
      'Schedule technical interview immediately' : 
      'Conduct phone screening first',
    
    riskFactors: [
      baseScore < 70 ? 'Below average match score' : null,
      candidate.salary_expectations > job.salary_max ? 'Salary expectations exceed budget' : null
    ].filter(Boolean),
    
    opportunities: [
      'Strong potential for leadership role',
      'Could mentor junior team members',
      'Brings diverse industry experience'
    ]
  }
}

export async function compareCandidates(candidates: any[], job: any) {
  const evaluations = await Promise.all(
    candidates.map(c => generateCandidateScorecard(c, job))
  )
  
  return candidates.map((candidate, i) => ({
    ...candidate,
    evaluation: evaluations[i],
    rank: 0 // Will be calculated
  })).sort((a, b) => b.evaluation.matchScore - a.evaluation.matchScore)
    .map((c, i) => ({ ...c, rank: i + 1 }))
}
