export async function parseCV(file: File) {
  await new Promise(resolve => setTimeout(resolve, 1500))
  
  return {
    name: 'John Smith',
    email: 'john.smith@email.com',
    phone: '+44 7700 900123',
    summary: 'Experienced software engineer with 5+ years developing scalable applications',
    skills: ['JavaScript', 'React', 'Node.js', 'Python', 'AWS', 'Docker'],
    experience: [
      {
        title: 'Senior Software Engineer',
        company: 'Tech Corp',
        duration: '2020 - Present',
        description: 'Led development of microservices architecture'
      }
    ],
    education: [
      {
        degree: 'BSc Computer Science',
        institution: 'University of London',
        year: '2018'
      }
    ],
    experienceYears: 5
  }
}

export function calculateProfileCompleteness(candidate: any) {
  let score = 0
  
  if (candidate.name) score += 15
  if (candidate.email) score += 15
  if (candidate.phone) score += 10
  if (candidate.summary && candidate.summary.length > 50) score += 20
  if (candidate.skills && candidate.skills.length >= 5) score += 20
  if (candidate.experience_years) score += 10
  if (candidate.cv_url) score += 10
  
  return Math.min(score, 100)
}
