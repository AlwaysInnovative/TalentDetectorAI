export async function generateJobDescription(title: string, skills: string[]) {
  await new Promise(resolve => setTimeout(resolve, 1500))
  
  const skillsList = skills.join(', ')
  
  return {
    description: `We are seeking a talented ${title} to join our dynamic team.

Key Responsibilities:
• Lead strategic initiatives aligned with ${skills[0] || 'core'} objectives
• Collaborate with teams to deliver high-quality solutions
• Mentor junior members and contribute to knowledge sharing
• Drive innovation and implement best practices

Required Skills:
${skills.map(s => '• Strong proficiency in ' + s).join('\n')}
• Excellent problem-solving abilities
• Strong communication skills

What We Offer:
• Competitive salary and benefits
• Flexible remote/hybrid work
• Professional development opportunities
• Career growth and advancement`,
    
    extractedSkills: skills,
    recommendedKeywords: [...skills, 'teamwork', 'communication'],
    estimatedTimeToFill: '21 days'
  }
}

export async function extractSkillsFromJD(description: string) {
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  const commonSkills = ['JavaScript', 'React', 'Node.js', 'Python', 'SQL', 'AWS']
  const found = commonSkills.filter(skill => description.toLowerCase().includes(skill.toLowerCase()))
  
  return found.length > 0 ? found : ['Communication', 'Teamwork']
}
