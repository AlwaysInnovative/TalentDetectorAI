export async function calculateMatchScore(candidate: any, job: any) {
  await new Promise(resolve => setTimeout(resolve, 500))
  
  let score = 50 // Base score
  
  // Skills matching
  const candidateSkills = candidate.skills || []
  const jobSkills = job.ai_keywords || []
  const matchingSkills = candidateSkills.filter((s: string) => 
    jobSkills.some((js: string) => js.toLowerCase() === s.toLowerCase())
  )
  const skillMatchRate = jobSkills.length > 0 ? (matchingSkills.length / jobSkills.length) * 40 : 0
  score += skillMatchRate
  
  // Experience matching
  const requiredYears = 3
  if (candidate.experience_years >= requiredYears) {
    score += 10
  }
  
  return {
    score: Math.min(Math.round(score), 99),
    reasoning: [
      `Skills match: ${matchingSkills.length}/${jobSkills.length} required skills`,
      `Experience: ${candidate.experience_years} years`,
      skillMatchRate > 30 ? 'Strong technical alignment' : 'Moderate technical fit',
      candidate.profile_completeness > 80 ? 'Complete profile' : 'Profile needs enhancement'
    ],
    matchingSkills
  }
}

export async function generateBestCandidates(candidates: any[], jobs: any[], limit = 5) {
  const matches = []
  
  for (const job of jobs) {
    for (const candidate of candidates) {
      const match = await calculateMatchScore(candidate, job)
      matches.push({
        candidate,
        job,
        ...match
      })
    }
  }
  
  return matches
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}

export async function enrichCandidateProfile(candidate: any) {
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  return {
    suggestedSummary: `Experienced ${candidate.role_title || 'professional'} with ${candidate.experience_years || 0}+ years in the industry. Proficient in ${(candidate.skills || []).slice(0, 3).join(', ')}.`,
    suggestedSkills: ['Communication', 'Problem Solving', 'Team Collaboration'],
    careerLevel: candidate.experience_years > 7 ? 'Senior' : candidate.experience_years > 3 ? 'Mid-level' : 'Junior',
    recommendedRoles: [
      candidate.role_title || 'Software Engineer',
      'Team Lead',
      'Technical Consultant'
    ]
  }
}
