export class AIAgentEngine {
  
  async optimizeJobDescription(jd: string, market_data?: any) {
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    return {
      optimized_jd: `${jd}\n\n✨ AI-Enhanced:\n\nKey Responsibilities:\n• Lead technical initiatives\n• Mentor team members\n• Drive innovation\n\nWhat We Offer:\n• Competitive salary\n• Flexible working\n• Career growth`,
      improvements: [
        'Added inclusive language',
        'Clarified responsibilities',
        'Optimized for ATS',
        'Added salary transparency'
      ],
      likelihood_to_fill: Math.floor(Math.random() * 30) + 70,
      market_insights: {
        avg_time_to_fill: '21 days',
        competition_level: 'High',
        recommended_salary_range: '£50,000 - £70,000'
      }
    }
  }

  async screenCandidate(candidate: any, job: any) {
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    const candidateSkills = candidate.skills || []
    const jobSkills = job.ai_keywords || []
    
    const matchingSkills = candidateSkills.filter((s: string) => 
      jobSkills.some((js: string) => js.toLowerCase() === s.toLowerCase())
    )
    
    const score = jobSkills.length > 0 ? 
      Math.round((matchingSkills.length / jobSkills.length) * 100) : 50
    
    return {
      screening_score: score,
      recommendation: score >= 75 ? 'Strong Match - Interview' : 
                     score >= 50 ? 'Moderate Match - Consider' : 
                     'Weak Match - Review',
      strengths: matchingSkills.slice(0, 3),
      gaps: jobSkills.filter((s: string) => 
        !candidateSkills.some((cs: string) => cs.toLowerCase() === s.toLowerCase())
      ).slice(0, 3),
      interview_scorecard: this.generateInterviewScorecard(job),
      risk_factors: score < 50 ? ['Limited experience', 'Missing skills'] : []
    }
  }

  generateInterviewScorecard(job: any) {
    return {
      criteria: [
        { name: 'Technical Skills', weight: 40, questions: ['Demonstrate experience'] },
        { name: 'Cultural Fit', weight: 30, questions: ['Ideal work environment?'] },
        { name: 'Communication', weight: 20, questions: ['Explain complex concept'] },
        { name: 'Leadership', weight: 10, questions: ['Example of leading project'] }
      ],
      rating_scale: '1-5',
      total_possible: 100
    }
  }
}

export const aiAgent = new AIAgentEngine()
