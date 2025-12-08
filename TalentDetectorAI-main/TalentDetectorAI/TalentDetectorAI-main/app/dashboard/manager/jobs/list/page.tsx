'use client'
import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Plus, ExternalLink, Sparkles, MapPin, DollarSign, Calendar } from 'lucide-react'
import DynamicBackground from '@/components/ui/DynamicBackground'
import { motion } from 'framer-motion'

const fetcher = async () => {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data } = await supabase
    .from('jobs')
    .select('*, applications(count)')
    .eq('manager_id', user?.id || '')
    .order('created_at', { ascending: false })
  return data || []
}

export default function JobsList() {
  const { data: jobs, isLoading } = useSWR('manager-jobs-list', fetcher, { refreshInterval: 3000 })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 border-4 border-primary-600 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="relative">
      <DynamicBackground page="jobs" />
      
      <div className="flex justify-between items-center mb-8">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-600 to-emerald-600 bg-clip-text text-transparent mb-2">
            All Job Postings
          </h1>
          <p className="text-gray-600">{jobs?.length || 0} total jobs • Updated in real-time</p>
        </motion.div>
        <Link href="/dashboard/manager/jobs/new">
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="btn-primary flex items-center gap-2 shadow-lg">
            <Plus className="w-5 h-5" /> Post New Job
          </motion.button>
        </Link>
      </div>

      {jobs && jobs.length > 0 ? (
        <div className="grid gap-6">
          {jobs.map((job: any, index: number) => (
            <motion.div
              key={job.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="card hover:shadow-2xl transition-all duration-300">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-2xl font-bold">{job.title}</h3>
                    {job.ai_keywords && job.ai_keywords.length > 0 && (
                      <motion.span 
                        whileHover={{ scale: 1.1 }}
                        className="px-3 py-1 bg-purple-100 text-purple-700 text-xs rounded-full flex items-center gap-1 font-semibold">
                        <Sparkles className="w-3 h-3" /> AI Enhanced
                      </motion.span>
                    )}
                    <span className={'px-3 py-1 rounded-full text-xs font-semibold ' + 
                      (job.status === 'open' ? 'bg-emerald-100 text-emerald-700' : 
                       job.status === 'closed' ? 'bg-gray-100 text-gray-700' : 
                       'bg-blue-100 text-blue-700')}>
                      {job.status}
                    </span>
                  </div>
                  
                  <p className="text-gray-600 mb-4 line-clamp-2">{job.description?.substring(0, 200)}...</p>
                  
                  <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" /> {job.location || 'Remote'}
                    </span>
                    <span className="flex items-center gap-1">
                      <DollarSign className="w-4 h-4" /> 
                      £{job.salary_min?.toLocaleString()} - £{job.salary_max?.toLocaleString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" /> 
                      Posted {new Date(job.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  
                  {job.ai_keywords && job.ai_keywords.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {job.ai_keywords.slice(0, 5).map((keyword: string, i: number) => (
                        <span key={i} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded border border-blue-200">
                          {keyword}
                        </span>
                      ))}
                    </div>
                  )}

                  {job.interview_stages && job.interview_stages.length > 0 && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs font-semibold text-gray-700 mb-1">Interview Process ({job.interview_stages.length} stages):</p>
                      <div className="flex gap-2 flex-wrap">
                        {job.interview_stages.slice(0, 4).map((stage: any, i: number) => (
                          <span key={i} className="text-xs text-gray-600">
                            {i + 1}. {stage.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                <Link href={'/dashboard/manager/jobs/' + job.id}>
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="btn-primary flex items-center gap-2 ml-6">
                    View Details <ExternalLink className="w-4 h-4" />
                  </motion.button>
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="card text-center py-20">
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-20 h-20 bg-gradient-to-br from-primary-500 to-emerald-500 rounded-full flex items-center justify-center text-white mx-auto mb-4">
            <Plus className="w-10 h-10" />
          </motion.div>
          <p className="text-gray-500 text-lg mb-4">No jobs posted yet</p>
          <p className="text-gray-400 text-sm mb-6">Create your first job posting to start hiring</p>
          <Link href="/dashboard/manager/jobs/new">
            <button className="btn-primary">Post Your First Job</button>
          </Link>
        </motion.div>
      )}
    </div>
  )
}
