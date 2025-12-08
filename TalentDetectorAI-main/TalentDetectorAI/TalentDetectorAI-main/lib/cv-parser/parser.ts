export interface ParsedCV {
  name: string
  email: string
  phone?: string
  summary?: string
  skills: string[]
  experience: {
    title: string
    company: string
    duration: string
    description: string
  }[]
  education: {
    degree: string
    institution: string
    year: string
  }[]
  certifications?: string[]
}

export async function parseCV(fileContent: string): Promise<ParsedCV> {
  // Simulate CV parsing (in production, use actual NLP/ML service)
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  return {
    name: 'John Candidate',
    email: 'john@example.com',
    phone: '+44 7700 900000',
    summary: 'Experienced software engineer with 8+ years in full-stack development',
    skills: ['JavaScript', 'React', 'Node.js', 'Python', 'AWS', 'Docker'],
    experience: [
      {
        title: 'Senior Software Engineer',
        company: 'Tech Corp Ltd',
        duration: '2020 - Present',
        description: 'Led development of microservices architecture'
      },
      {
        title: 'Software Engineer',
        company: 'StartUp Inc',
        duration: '2017 - 2020',
        description: 'Built scalable web applications'
      }
    ],
    education: [
      {
        degree: 'BSc Computer Science',
        institution: 'University of London',
        year: '2017'
      }
    ],
    certifications: ['AWS Certified Developer', 'Google Cloud Professional']
  }
}
