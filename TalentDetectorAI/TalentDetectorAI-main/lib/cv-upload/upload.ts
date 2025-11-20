import { createClient } from '@/lib/supabase/client'

export async function uploadCV(file: File, userId: string) {
  const supabase = createClient()
  
  // Validate file
  const maxSize = 5 * 1024 * 1024 // 5MB
  if (file.size > maxSize) {
    throw new Error('File size must be less than 5MB')
  }
  
  const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Only PDF, DOC, and DOCX files are allowed')
  }
  
  // Create unique filename
  const timestamp = Date.now()
  const extension = file.name.split('.').pop()
  const filename = `${userId}/${timestamp}.${extension}`
  
  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from('cvs')
    .upload(filename, file, {
      cacheControl: '3600',
      upsert: false
    })
  
  if (error) throw error
  
  // Get public URL
  const { data: urlData } = supabase.storage
    .from('cvs')
    .getPublicUrl(filename)
  
  return {
    path: data.path,
    url: urlData.publicUrl,
    filename: file.name,
    size: file.size,
    type: file.type
  }
}

export async function parseCV(file: File) {
  // Simulate AI CV parsing
  await new Promise(resolve => setTimeout(resolve, 2000))
  
  // In production, this would use an AI service or PDF parser
  const extractedData = {
    name: 'Extracted Name',
    email: 'extracted@email.com',
    phone: '+44 7700 900000',
    skills: ['JavaScript', 'React', 'Node.js', 'Python', 'AWS', 'Docker', 'TypeScript'],
    experience: [
      {
        position: 'Senior Software Engineer',
        company: 'Tech Company Ltd',
        duration: '2020 - Present',
        description: 'Led development of scalable microservices architecture'
      },
      {
        position: 'Software Engineer',
        company: 'StartUp Inc',
        duration: '2018 - 2020',
        description: 'Developed full-stack web applications'
      }
    ],
    education: [
      {
        degree: 'BSc Computer Science',
        institution: 'University of Technology',
        year: '2018'
      }
    ],
    summary: 'Experienced software engineer with 5+ years of expertise in building scalable applications. Proven track record in leading technical teams and delivering high-quality solutions.',
    experienceYears: 5
  }
  
  return extractedData
}

export async function deleteCV(path: string) {
  const supabase = createClient()
  
  const { error } = await supabase.storage
    .from('cvs')
    .remove([path])
  
  if (error) throw error
}
