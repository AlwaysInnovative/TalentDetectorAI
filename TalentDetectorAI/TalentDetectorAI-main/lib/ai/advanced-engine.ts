export async function generateJobDescription(title: string, skills: string[]) {
  await new Promise(resolve => setTimeout(resolve, 1500))
  
  return {
    description: `${title}\n\nWe are seeking an exceptional ${title} to join our innovative team.\n\n🎯 Key Responsibilities:\n• Lead strategic initiatives in ${skills[0] || 'your domain'}\n• Collaborate with cross-functional teams\n• Drive innovation and implement best practices\n• Mentor junior team members\n\n✨ Required Skills:\n${skills.map(s => `• Expert-level ${s}`).join('\n')}\n• Strong problem-solving abilities\n• Excellent communication skills\n\n💼 What We Offer:\n• Competitive salary package\n• Remote/hybrid flexibility\n• Professional development opportunities\n• Inclusive culture`,
    skills,
    recommendedKeywords: [...skills, 'teamwork', 'leadership', 'innovation', 'problem-solving'],
    estimatedFillTime: Math.floor(Math.random() * 15) + 14,
    competitivenessScore: Math.floor(Math.random() * 20) + 75,
    likelihoodToFill7Days: Math.random() > 0.5 ? 'High (85%)' : 'Medium (60%)',
    nextBestAction: skills.length > 3 ? 'Engage top 3 agencies immediately' : 'Refine skill requirements',
    suggestedStages: [
      { name: 'Application Review', duration: '2 days' },
      { name: 'Phone Screening', duration: '1 day' },
      { name: 'Technical Interview', duration: '3 days' },
      { name: 'Final Interview', duration: '2 days' },
      { name: 'Offer', duration: '1 day' }
    ]
  }
}

export async function checkDuplicateJob(title: string, description: string, existingJobs: any[]) {
  await new Promise(resolve => setTimeout(resolve, 800))
  
  const similarJobs = existingJobs.filter(job => {
    const titleSimilarity = job.title.toLowerCase() === title.toLowerCase()
    const descSimilarity = description && job.description && 
      job.description.substring(0, 100).toLowerCase() === description.substring(0, 100).toLowerCase()
    return titleSimilarity || descSimilarity
  })
  
  return {
    isDuplicate: similarJobs.length > 0,
    similarJobs: similarJobs.map(j => ({
      id: j.id,
      title: j.title,
      status: j.status,
      created: new Date(j.created_at).toLocaleDateString()
    })),
    recommendation: similarJobs.length > 0 ? 
      'Similar job exists. Consider updating existing job instead.' : 
      'No duplicates found. Safe to proceed.'
  }
}

export async function analyzePipelineHealth(applications: any[], jobs: any[]) {
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  const stages = {
    pending: applications.filter(a => a.status === 'pending').length,
    screening: applications.filter(a => a.status === 'screening').length,
    interview: applications.filter(a => a.status === 'interview').length,
    offer: applications.filter(a => a.status === 'offer').length,
    hired: applications.filter(a => a.status === 'hired').length
  }
  
  const avgTimeToFill = 21 // Calculate from actual data
  const conversionRate = applications.length > 0 ? 
    Math.round((stages.hired / applications.length) * 100) : 0
  
  const health = conversionRate > 15 ? 'Healthy' : conversionRate > 8 ? 'Fair' : 'Needs Attention'
  const healthColor = health === 'Healthy' ? 'emerald' : health === 'Fair' ? 'yellow' : 'red'
  
  return {
    stages,
    health,
    healthColor,
    avgTimeToFill,
    conversionRate,
    bottleneck: stages.pending > stages.interview * 3 ? 'Application Review' : 
                 stages.interview > stages.offer * 5 ? 'Interview Process' : 'None',
    recommendations: [
      stages.pending > 20 ? 'High pending applications - prioritize screening' : null,
      conversionRate < 10 ? 'Low conversion rate - review job requirements' : null,
      avgTimeToFill > 30 ? 'Slow time-to-fill - streamline interview process' : null
    ].filter(Boolean)
  }
}

export async function calculateSkillMatchDistribution(applications: any[]) {
  const distribution = {
    excellent: applications.filter(a => (a.ai_match_score || 0) >= 80).length,
    good: applications.filter(a => (a.ai_match_score || 0) >= 60 && (a.ai_match_score || 0) < 80).length,
    fair: applications.filter(a => (a.ai_match_score || 0) >= 40 && (a.ai_match_score || 0) < 60).length,
    poor: applications.filter(a => (a.ai_match_score || 0) < 40 && (a.ai_match_score || 0) > 0).length
  }
  
  return {
    distribution,
    chartData: [
      { name: 'Excellent (80-100%)', value: distribution.excellent, color: '#10b981' },
      { name: 'Good (60-79%)', value: distribution.good, color: '#3b82f6' },
      { name: 'Fair (40-59%)', value: distribution.fair, color: '#f59e0b' },
      { name: 'Poor (0-39%)', value: distribution.poor, color: '#ef4444' }
    ].filter(d => d.value > 0),
    avgMatchScore: applications.length > 0 ? 
      Math.round(applications.reduce((sum, a) => sum + (a.ai_match_score || 0), 0) / applications.length) : 0
  }
}
