'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { ArrowLeft, Upload, Download, CheckCircle, AlertCircle, FileSpreadsheet } from 'lucide-react'
import { parseJobsCSV, generateSampleCSV } from '@/lib/uploads/csv-parser'
import DynamicBackground from '@/components/ui/DynamicBackground'
import { motion } from 'framer-motion'

export default function BulkUpload() {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<any[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadResults, setUploadResults] = useState<any>(null)
  const router = useRouter()

  function handleDownloadSample() {
    const csv = generateSampleCSV()
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'job-upload-template.csv'
    a.click()
    toast.success('Sample template downloaded!')
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    if (!selectedFile.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file')
      return
    }

    setFile(selectedFile)

    // Read and parse CSV
    const text = await selectedFile.text()
    try {
      const jobs = parseJobsCSV(text)
      setPreview(jobs)
      toast.success(`Parsed ${jobs.length} jobs from CSV`)
    } catch (error) {
      toast.error('Failed to parse CSV')
    }
  }

  async function handleUpload() {
    if (preview.length === 0) {
      toast.error('No jobs to upload')
      return
    }

    setUploading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      const jobsToInsert = preview.map(job => ({
        manager_id: user?.id,
        title: job.title,
        description: job.description,
        location: job.location,
        salary_min: job.salary_min,
        salary_max: job.salary_max,
        department: job.department,
        ai_keywords: job.skills?.split(',').map((s: string) => s.trim()) || [],
        status: 'open',
        interview_stages: [
          { name: 'Application Review', duration: 2 },
          { name: 'Interview', duration: 3 },
          { name: 'Offer', duration: 1 }
        ]
      }))

      const { data, error } = await supabase.from('jobs').insert(jobsToInsert).select()

      if (error) throw error

      setUploadResults({
        success: data?.length || 0,
        failed: preview.length - (data?.length || 0)
      })

      toast.success(`✅ Successfully uploaded ${data?.length} jobs!`)
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="relative">
      <DynamicBackground page="jobs" />
      
      <Link href="/dashboard/manager/jobs/new">
        <button className="flex items-center gap-2 mb-6 hover:text-primary-600">
          <ArrowLeft className="w-5 h-5" /> Back
        </button>
      </Link>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
            <Upload className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">
              Bulk Job Upload
            </h1>
            <p className="text-gray-600">Upload multiple jobs at once via CSV/Excel</p>
          </div>
        </div>

        {!uploadResults ? (
          <>
            <div className="card mb-6">
              <h2 className="text-2xl font-bold mb-4">Step 1: Download Template</h2>
              <p className="text-gray-600 mb-4">Start by downloading our CSV template with the correct format</p>
              <button onClick={handleDownloadSample} className="btn-primary flex items-center gap-2">
                <Download className="w-5 h-5" /> Download Sample Template
              </button>
            </div>

            <div className="card mb-6">
              <h2 className="text-2xl font-bold mb-4">Step 2: Upload CSV</h2>
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-primary-500 transition">
                <input type="file" accept=".csv" onChange={handleFileSelect} className="hidden" id="csv-upload" />
                <label htmlFor="csv-upload" className="cursor-pointer">
                  <FileSpreadsheet className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-lg font-semibold mb-2">
                    {file ? file.name : 'Click to upload CSV file'}
                  </p>
                  <p className="text-sm text-gray-500">Supports CSV files with job data</p>
                </label>
              </div>
            </div>

            {preview.length > 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold">Preview ({preview.length} jobs)</h2>
                  <button onClick={handleUpload} disabled={uploading} className="btn-primary flex items-center gap-2">
                    <Upload className="w-5 h-5" />
                    {uploading ? 'Uploading...' : 'Upload All Jobs'}
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b-2">
                        <th className="text-left p-3">Title</th>
                        <th className="text-left p-3">Location</th>
                        <th className="text-left p-3">Salary Range</th>
                        <th className="text-left p-3">Skills</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map((job, i) => (
                        <tr key={i} className="border-b hover:bg-gray-50">
                          <td className="p-3 font-semibold">{job.title}</td>
                          <td className="p-3">{job.location}</td>
                          <td className="p-3">£{job.salary_min?.toLocaleString()} - £{job.salary_max?.toLocaleString()}</td>
                          <td className="p-3">
                            <div className="flex flex-wrap gap-1">
                              {job.skills?.split(',').slice(0, 3).map((skill: string, si: number) => (
                                <span key={si} className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                                  {skill.trim()}
                                </span>
                              ))}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </motion.div>
            )}
          </>
        ) : (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="card text-center py-20">
            <CheckCircle className="w-20 h-20 text-emerald-600 mx-auto mb-6" />
            <h2 className="text-3xl font-bold text-emerald-600 mb-4">Upload Complete!</h2>
            <div className="grid grid-cols-2 gap-6 max-w-md mx-auto mb-8">
              <div className="p-4 bg-emerald-50 rounded-xl">
                <p className="text-sm text-emerald-700 mb-1">Successful</p>
                <p className="text-4xl font-bold text-emerald-600">{uploadResults.success}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="text-sm text-gray-700 mb-1">Failed</p>
                <p className="text-4xl font-bold text-gray-600">{uploadResults.failed}</p>
              </div>
            </div>
            <div className="flex gap-4 justify-center">
              <button onClick={() => router.push('/dashboard/manager/jobs/list')} className="btn-primary">
                View All Jobs
              </button>
              <button onClick={() => {setUploadResults(null); setPreview([]); setFile(null)}} className="btn-secondary">
                Upload More
              </button>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}
