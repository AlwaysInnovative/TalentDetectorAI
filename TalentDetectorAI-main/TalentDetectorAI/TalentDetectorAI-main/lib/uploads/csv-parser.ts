export interface JobCSVRow {
  title: string
  description: string
  location: string
  salary_min: number
  salary_max: number
  skills: string
  department?: string
}

export function parseJobsCSV(csvContent: string): JobCSVRow[] {
  const lines = csvContent.split('\n').filter(line => line.trim())
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
  
  const jobs: JobCSVRow[] = []
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim())
    const job: any = {}
    
    headers.forEach((header, index) => {
      if (header === 'salary_min' || header === 'salary_max') {
        job[header] = parseInt(values[index]) || 0
      } else {
        job[header] = values[index]
      }
    })
    
    if (job.title && job.description) {
      jobs.push(job as JobCSVRow)
    }
  }
  
  return jobs
}

export function generateSampleCSV(): string {
  return `title,description,location,salary_min,salary_max,skills,department
Senior Developer,Lead development team,Remote,90000,120000,"JavaScript,React,Node.js",Engineering
Product Manager,Manage product roadmap,London,80000,110000,"Product Management,Strategy",Product
Data Scientist,Build ML models,Hybrid,85000,115000,"Python,ML,SQL",Data`
}
