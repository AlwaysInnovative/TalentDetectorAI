'use client'
import { useState } from 'react'
import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'
import { Sparkles, MapPin, DollarSign, TrendingUp, Send, Bookmark, Search } from 'lucide-react'
import DynamicBackground from '@/components/ui/DynamicBackground'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'

const fetcher = async () => {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  const [jobsRes, candidateRes, applicationsRes] = await Promise.all([
    supabase.from('jobs').select('*').eq('status', 'open'),
    supabase.from('candidates').select('*').eq('user_id', user?.id || '').single(),
    supabase.from('applications').select('job_id').eq('candidate_id', user?.id || '')
  ])
  
  const appliedJobIds = new Set(applicationsRes.data?.map(a => a.job_id) || [])
  
  // Calculate match scores
  const jobsWithScores = (jobsRes.data || []).map(job => {
    const candidateSkills = candidateRes.data?.skills || []
    const jobSkills = job.ai_keywords || []
    
    const matchingSkills = candidateSkills.filter((s: string) => 
      jobSkills.some((js: string) => js.toLowerCase() === s.toLowerCase())
    )
    
    const matchScore = jobSkills.length > 0 ? 
      Math.round((matchingSkills.length / jobSkills.length) * 100) : 50
    
    const missingSkills = jobSkills.filter((s: string) => 
      !candidateSkills.some((cs: string) => cs.toLowerCase() === s.toLowerCase())
    )
    
    return {
      ...job,
      matchScore,
      matchingSkills,
      missingSkills,
      hasApplied: appliedJobIds.has(job.id)
    }
  }).sort((a, b) => b.matchScore - a.matchScore)
  
  return { jobs: jobsWithScores, candidate: candidateRes.data }
}

export default function JobDiscovery() {
  const { data, mutate } = useSWR('job-discovery', fetcher, { refreshInterval: 5000 })
  const [selectedJob, setSelectedJob] = useState<any>(null)
  const [applying, setApplying] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  async function handleApply(job: any) {
    setApplying(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      const { error } = await supabase.from('applications').insert({
        job_id: job.id,
        candidate_id: user?.id,
        status: 'pending',
        ai_match_score: job.matchScore
      })
      
      if (error) throw error
      
      toast.success('✅ Application submitted!')
      mutate()
    } catch (error: any) {
      toast.error(error.message || 'Application failed')
    } finally {
      setApplying(false)
    }
  }

  const filteredJobs = data?.jobs.filter(j => 
    searchTerm === '' || 
    j.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    j.location?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="relative">
      <DynamicBackground page="jobs" />
      
      <div className="mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-emerald-600 bg-clip-text text-transparent mb-2">
          Job Discovery
        </h1>
        <p className="text-gray-600">AI-powered job matching based on your profile</p>
      </div>

      {/* Search */}
      <div className="card mb-6">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="input pl-10"
              placeholder="Search jobs..." />
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Jobs List */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Available Jobs ({filteredJobs?.length || 0})</h2>
          
          {filteredJobs && filteredJobs.length > 0 ? (
            filteredJobs.map((job: any, i: number) => (
              <motion.div
                key={job.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => setSelectedJob(job)}
                className={'card cursor-pointer transition ' +
                  (selectedJob?.id === job.id ? 'ring-2 ring-primary-600 bg-blue-50' : 'hover:shadow-lg')}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-bold text-lg">{job.title}</h3>
                    <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                      <MapPin className="w-4 h-4" />
                      <span>{job.location}</span>
                      <DollarSign className="w-4 h-4 ml-2" />
                      <span>£{job.salary_min?.toLocaleString()} - £{job.salary_max?.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className={'w-16 h-16 rounded-full flex flex-col items-center justify-center text-white font-bold shadow-lg ' +
                    (job.matchScore >= 80 ? 'bg-emerald-600' :
                     job.matchScore >= 60 ? 'bg-blue-600' :
                     'bg-yellow-600')}>
                    <span className="text-2xl">{job.matchScore}</span>
                    <span className="text-xs">%</span>
                  </div>
                </div>

                {job.hasApplied && (
                  <div className="mb-3">
                    <span className="px-3 py-1 bg-green-100 text-green-700 text-xs rounded-full font-semibold">
                      ✓ Applied
                    </span>
                  </div>
                )}

                {job.matchingSkills.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {job.matchingSkills.slice(0, 3).map((skill: string, si: number) => (
                      <span key={si} className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs rounded">
                        ✓ {skill}
                      </span>
                    ))}
                  </div>
                )}

                {job.missingSkills.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {job.missingSkills.slice(0, 2).map((skill: string, si: number) => (
                      <span key={si} className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded">
                        Learn: {skill}
                      </span>
                    ))}
                  </div>
                )}
              </motion.div>
            ))
          ) : (
            <div className="card text-center py-20">
              <p className="text-gray-500">No jobs available</p>
            </div>
          )}
        </div>

        {/* Job Details */}
        <div>
          {selectedJob ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="sticky top-4 space-y-6">
              <div className="card">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-2xl font-bold mb-2">{selectedJob.title}</h2>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" /> {selectedJob.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <DollarSign className="w-4 h-4" /> 
                        £{selectedJob.salary_min?.toLocaleString()} - £{selectedJob.salary_max?.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mb-6">
                  <h3 className="font-bold mb-2 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-600" />
                    AI Match Analysis
                  </h3>
                  <div className={'p-4 rounded-xl ' +
                    (selectedJob.matchScore >= 80 ? 'bg-emerald-50 border-2 border-emerald-200' :
                     selectedJob.matchScore >= 60 ? 'bg-blue-50 border-2 border-blue-200' :
                     'bg-yellow-50 border-2 border-yellow-200')}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className={'text-4xl font-bold ' +
                        (selectedJob.matchScore >= 80 ? 'text-emerald-600' :
                         selectedJob.matchScore >= 60 ? 'text-blue-600' :
                         'text-yellow-600')}>
                        {selectedJob.matchScore}%
                      </div>
                      <div>
                        <p className="font-bold">
                          {selectedJob.matchScore >= 80 ? 'Excellent Match!' :
                           selectedJob.matchScore >= 60 ? 'Good Match' :
                           'Moderate Match'}
                        </p>
                        <p className="text-sm text-gray-600">
                          {selectedJob.matchingSkills.length} of {selectedJob.ai_keywords?.length || 0} skills match
                        </p>
                      </div>
                    </div>

                    {selectedJob.matchingSkills.length > 0 && (
                      <div className="mb-3">
                        <p className="text-sm font-semibold mb-2 text-emerald-700">✓ Your Matching Skills:</p>
                        <div className="flex flex-wrap gap-2">
                          {selectedJob.matchingSkills.map((skill: string, i: number) => (
                            <span key={i} className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs rounded">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedJob.missingSkills.length > 0 && (
                      <div>
                        <p className="text-sm font-semibold mb-2 text-yellow-700">📚 Skills to Improve:</p>
                        <div className="flex flex-wrap gap-2">
                          {selectedJob.missingSkills.map((skill: string, i: number) => (
                            <span key={i} className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mb-6">
                  <h3 className="font-bold mb-2">Description</h3>
                  <p className="text-gray-700 whitespace-pre-line">{selectedJob.description}</p>
                </div>

                {!selectedJob.hasApplied ? (
                  <button
                    onClick={() => handleApply(selectedJob)}
                    disabled={applying}
                    className="w-full btn-primary flex items-center justify-center gap-2 text-lg py-4">
                    <Send className="w-5 h-5" />
                    {applying ? 'Applying...' : 'Apply Now'}
                  </button>
                ) : (
                  <div className="p-4 bg-green-50 border-2 border-green-200 rounded-xl text-center">
                    <p className="font-bold text-green-700">✓ Already Applied</p>
                    <p className="text-sm text-green-600 mt-1">Check your applications for status updates</p>
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <div className="card text-center py-20">
              <TrendingUp className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Select a job to see details and match analysis</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
