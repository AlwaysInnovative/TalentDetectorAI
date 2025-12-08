// Mock AI client (replace with real OpenAI when ready)

export async function generateJobDescription(keywords: string) {
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  return {
    description: `We are seeking a talented professional with expertise in ${keywords}. 

Key Responsibilities:
• Lead technical projects and mentor junior team members
• Collaborate with cross-functional teams to deliver high-quality solutions
• Drive innovation and implement best practices
• Contribute to architectural decisions and technical strategy

Required Skills:
• Strong experience with ${keywords}
• Excellent problem-solving and communication skills
• Proven track record of delivering complex projects
• Bachelor's degree in Computer Science or related field

Benefits:
• Competitive salary and equity package
• Flexible remote work options
• Professional development opportunities
• Health insurance and wellness programs`,
    
    keywords: keywords.split(',').map(k => k.trim()),
    
    insights: [
      'This role requires strong technical leadership skills',
      'Remote-friendly position with competitive compensation',
      'Focus on collaboration and innovation',
      'Good career growth opportunities'
    ]
  }
}

export async function analyzeCandidate(jobDescription: string, candidateCV: string) {
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  return {
    matchScore: Math.floor(Math.random() * 30) + 70,
    strengths: [
      'Strong technical background matching job requirements',
      'Relevant industry experience',
      'Good communication skills demonstrated in CV'
    ],
    gaps: [
      'Limited experience with specific framework mentioned',
      'Could benefit from leadership training'
    ],
    insights: [
      'Candidate shows high potential for this role',
      'Consider for technical interview round',
      'Skills align well with team needs'
    ]
  }
}

export async function generateAIInsights(context: string) {
  await new Promise(resolve => setTimeout(resolve, 500))
  
  return {
    recommendations: [
      'Consider posting this role on LinkedIn and Indeed for maximum reach',
      'Salary range is competitive for this market',
      'Remote option will attract 40% more candidates'
    ],
    predictions: {
      expectedApplications: Math.floor(Math.random() * 50) + 50,
      timeToHire: Math.floor(Math.random() * 10) + 15,
      qualityCandidates: Math.floor(Math.random() * 20) + 30
    }
  }
}
