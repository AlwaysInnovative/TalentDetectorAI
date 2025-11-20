export async function generateJobDescription(title: string, skills: string[]) {
  await new Promise(resolve => setTimeout(resolve, 1000))
  return {
    description: `We are seeking an exceptional ${title} to join our team.

🎯 Key Responsibilities:
• Lead strategic initiatives in ${skills[0] || 'your domain'}
• Collaborate with cross-functional teams
• Drive innovation and best practices
• Mentor junior team members

✨ Required Skills:
${skills.map(s => `• Expert-level ${s}`).join('\n')}
• Strong problem-solving abilities
• Excellent communication skills

💼 What We Offer:
• Competitive salary package
• Remote/hybrid flexibility
• Professional development
• Inclusive culture`,
    skills,
    estimatedFillTime: '21 days',
    competitivenessScore: 85,
    suggestedStages: [
      { name: 'Application Review', duration: '2 days' },
      { name: 'Phone Screening', duration: '1 day' },
      { name: 'Technical Interview', duration: '3 days' },
      { name: 'Final Interview', duration: '2 days' },
      { name: 'Offer', duration: '1 day' }
    ]
  }
}

export async function matchCandidateToJob(candidate: any, job: any) {
  await new Promise(resolve => setTimeout(resolve, 1000))
  const baseScore = Math.floor(Math.random() * 30) + 60
  
  return {
    matchScore: baseScore,
    technicalFit: Math.min(baseScore + 8, 98),
    experienceFit: Math.max(baseScore - 5, 45),
    culturalFit: Math.min(baseScore + 3, 95),
    strengths: [
      'Strong technical alignment with job requirements',
      'Proven track record in similar roles',
      'Excellent communication skills demonstrated'
    ],
    weaknesses: [
      'Limited exposure to specific framework mentioned',
      'Could benefit from leadership training'
    ],
    recommendedQuestions: [
      `Describe your experience with ${job.ai_keywords?.[0] || 'this technology'}`,
      'Tell me about a challenging project you led',
      'How do you handle tight deadlines?',
      'What interests you most about this role?',
      'Where do you see yourself in 3 years?'
    ],
    hiringRecommendation: baseScore > 80 ? 'Strongly Recommend - Fast Track' : 
                          baseScore > 65 ? 'Recommend for Interview' : 
                          'Consider with Reservations',
    nextSteps: baseScore > 75 ? 
      'Schedule technical interview immediately' : 
      'Conduct phone screening first'
  }
}

export async function generateStageInsights(stage: string, candidateCount: number) {
  await new Promise(resolve => setTimeout(resolve, 500))
  
  const insights: Record<string, string[]> = {
    'pending': [
      `${candidateCount} candidates awaiting initial review`,
      'Average time to review: 2 days',
      'Recommended: Review top 5 candidates first'
    ],
    'screening': [
      'Phone screening typically takes 30-45 minutes',
      'Focus on culture fit and communication skills',
      'Conversion rate to interview: 65%'
    ],
    'interview': [
      'Technical interviews average 90 minutes',
      'Include live coding or case studies',
      'Success rate to offer: 40%'
    ],
    'offer': [
      'Average time to accept: 5 days',
      'Consider expediting for top candidates',
      'Acceptance rate: 85%'
    ]
  }
  
  return insights[stage] || ['Process candidates efficiently']
}
