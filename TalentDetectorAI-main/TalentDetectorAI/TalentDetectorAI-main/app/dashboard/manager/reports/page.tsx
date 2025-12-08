'use client'
import { useState } from 'react'
import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'
import { Download, FileText, Calendar, Briefcase } from 'lucide-react'
import { exportAnalytics, exportJobReport } from '@/lib/exports/pdf-generator'
import DynamicBackground from '@/components/ui/DynamicBackground'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'

const fetcher = async () => {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  const [jobs, applications] = await Promise.all([
    supabase.from('jobs').select('*').eq('manager_id', user?.id || ''),
    supabase.from('applications').select('*, jobs!inner(manager_id)').eq('jobs.manager_id', user?.id || '')
  ])
  
  return {
    jobs: jobs.data || [],
    applications: applications.data || []
  }
}

export default function Reports() {
  const { data } = useSWR('manager-reports', fetcher)
  const [selectedJob, setSelectedJob] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  function handleJobReport() {
    if (!selectedJob) {
      toast.error('Select a job first')
      return
    }
    
    const job = data?.jobs.find(j => j.id === selectedJob)
    const jobApps = data?.applications.filter(a => a.job_id === selectedJob) || []
    
    if (job) {
      exportJobReport(job, jobApps)
      toast.success('Report downloaded!')
    }
  }

  function handleAnalyticsReport() {
    if (data) {
      exportAnalytics(data)
      toast.success('Analytics report downloaded!')
    }
  }

  return (
    <div className="relative">
      <DynamicBackground page="analytics" />
      
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-600 to-emerald-600 bg-clip-text text-transparent mb-2">
          Reports & Exports
        </h1>
        <p className="text-gray-600 mb-8">Generate and download comprehensive hiring reports</p>
      </motion.div>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="card">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-white">
              <Briefcase className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Job Performance Report</h2>
              <p className="text-sm text-gray-600">Detailed metrics for a specific job</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2">Select Job</label>
              <select value={selectedJob} onChange={e => setSelectedJob(e.target.value)} className="input">
                <option value="">Choose a job...</option>
                {data?.jobs.map(job => (
                  <option key={job.id} value={job.id}>{job.title}</option>
                ))}
              </select>
            </div>

            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleJobReport} 
              className="w-full btn-primary flex items-center justify-center gap-2">
              <Download className="w-5 h-5" /> Generate Job Report
            </motion.button>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="card">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center text-white">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Analytics Report</h2>
              <p className="text-sm text-gray-600">Overall hiring metrics and trends</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2">From Date</label>
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                  className="input" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">To Date</label>
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                  className="input" />
              </div>
            </div>

            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleAnalyticsReport} 
              className="w-full btn-primary flex items-center justify-center gap-2">
              <Download className="w-5 h-5" /> Generate Analytics Report
            </motion.button>
          </div>
        </motion.div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card">
        <h2 className="text-2xl font-bold mb-4">Recent Exports</h2>
        <div className="space-y-3">
          {[
            { name: 'Hiring Analytics - ' + new Date().toLocaleDateString(), type: 'Analytics', date: new Date().toISOString() },
            { name: 'Q4 2024 Performance Report', type: 'Analytics', date: '2024-12-01' },
            { name: 'Senior Developer - Job Report', type: 'Job Report', date: '2024-11-15' }
          ].map((report, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="p-4 bg-gray-50 rounded-lg flex justify-between items-center hover:bg-gray-100 transition">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-gray-600" />
                <div>
                  <p className="font-semibold">{report.name}</p>
                  <p className="text-sm text-gray-500">{report.type} • {new Date(report.date).toLocaleDateString()}</p>
                </div>
              </div>
              <button className="text-primary-600 font-semibold hover:underline flex items-center gap-1">
                <Download className="w-4 h-4" /> Download
              </button>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
