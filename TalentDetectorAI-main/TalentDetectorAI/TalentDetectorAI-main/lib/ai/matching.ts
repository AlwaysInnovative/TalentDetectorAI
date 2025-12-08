export async function matchCandidateToJob(candidateCV: string, jobDescription: string, jobKeywords: string[]) {
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  const cvLower = candidateCV.toLowerCase()
  const jobLower = jobDescription.toLowerCase()
  
  let matchScore = 50
  
  jobKeywords.forEach(keyword => {
    if (cvLower.includes(keyword.toLowerCase())) {
      matchScore += 10
    }
  })
  
  matchScore = Math.min(matchScore, 98)
  
  const strengths = []
  const gaps = []
  const insights = []
  
  if (matchScore >= 80) {
    strengths.push('Excellent technical skill alignment')
    strengths.push('Strong experience match')
    insights.push('Highly recommended for interview')
  } else if (matchScore >= 60) {
    strengths.push('Good foundational skills')
    gaps.push('Some skills could be developed')
    insights.push('Consider for initial screening')
  } else {
    gaps.push('Significant skill gaps identified')
    insights.push('May require additional training')
  }
  
  return {
    matchScore,
    strengths,
    gaps,
    insights,
    heatmap: {
      technical: Math.min(matchScore + 5, 100),
      experience: Math.min(matchScore - 5, 100),
      cultural: Math.min(matchScore + 2, 100)
    }
  }
}
