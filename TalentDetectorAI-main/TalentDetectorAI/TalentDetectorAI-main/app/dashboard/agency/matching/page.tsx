'use client'
import { useState } from 'react'
import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'
import { Sparkles, TrendingUp, Send, CheckCircle, Users } from 'lucide-react'
import DynamicBackground from '@/components/ui/DynamicBackground'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { calculateMatchScore, generateBestCandidates } from '@/lib/agency/ai-matching/matcher'

const fetcher = async () => {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  const [jobsRes, candidatesRes] = await Promise.all([
    supabase.from('jobs').select('*').eq('status', 'open'),
    supabase.from('agency_candidates').select('*').eq('agency_id', user?.id || '')
  ])
  
  return { 
    jobs: jobsRes.data || [], 
    candidates: candidatesRes.data || []
  }
}

export default function AIMatching() {
  const { data, mutate } = useSWR('ai-matching', fetcher)
  const [selectedJob, setSelectedJob] = useState<any>(null)
  const [matches, setMatches] = useState<any[]>([])
  const [calculating, setCalculating] = useState(false)
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [showBestCandidates, setShowBestCandidates] = useState(false)
  const [bestMatches, setBestMatches] = useState<any[]>([])

  async function handleCalculateMatches(job: any) {
    setSelectedJob(job)
    setCalculating(true)
    setMatches([])
    
    try {
      const results = []
      for (const candidate of data?.candidates || []) {
        const match = await calculateMatchScore(candidate, job)
        results.push({
          candidate,
          ...match
        })
      }
      
      setMatches(results.sort((a, b) => b.score - a.score))
      toast.success('✨ AI matching complete!')
    } catch (error) {
      toast.error('Matching failed')
    } finally {
      setCalculating(false)
    }
  }

  async function handleBulkSubmission() {
    if (selectedCandidates.length === 0) {
      toast.error('Select candidates to submit')
      return
    }
    
    setSubmitting(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      const submissions = selectedCandidates.map(candidateId => {
        const match = matches.find(m => m.candidate.id === candidateId)
        return {
          agency_id: user?.id,
          job_id: selectedJob.id,
          candidate_id: candidateId,
          ai_match_score: match?.score || 0,
          match_reasoning: match?.reasoning.join('; ') || '',
          status: 'submitted'
        }
      })
      
      const { error } = await supabase.from('agency_submissions').insert(submissions)
      
      if (error) throw error
      
      toast.success(`✅ ${selectedCandidates.length} candidates submitted!`)
      setSelectedCandidates([])
      mutate()
    } catch (error: any) {
      toast.error(error.message || 'Submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleGetBestCandidates() {
    if (!data?.candidates || !data?.jobs) return
    
    setCalculating(true)
    try {
      const best = await generateBestCandidates(data.candidates, data.jobs, 5)
      setBestMatches(best)
      setShowBestCandidates(true)
      toast.success('✨ Top 5 recommendations ready!')
    } catch (error) {
      toast.error('Failed to generate recommendations')
    } finally {
      setCalculating(false)
    }
  }

  return (
    <div className="relative">
      <DynamicBackground page="matching" />
      
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
            AI Job Matching
          </h1>
          <p className="text-gray-600">Smart candidate-job matching powered by AI</p>
        </div>
        <button onClick={handleGetBestCandidates} disabled={calculating} 
          className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg flex items-center gap-2">
          <Sparkles className="w-5 h-5" />
          {calculating ? 'Analyzing...' : 'Best 5 to Submit Today'}
        </button>
      </div>

      {/* Best Candidates Modal */}
      {showBestCandidates && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            className="bg-white rounded-2xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold flex items-center gap-2">
                <TrendingUp className="w-6 h-6 text-purple-600" />
                Top 5 Candidates to Submit Today
              </h3>
              <button onClick={() => setShowBestCandidates(false)} className="text-gray-500 hover:text-gray-700 text-2xl">
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              {bestMatches.map((match: any, i: number) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border-2 border-purple-200">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center text-white font-bold">
                      #{i + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-lg">{match.candidate.name}</p>
                      <p className="text-sm text-gray-600 mb-2">{match.job.title}</p>
                      <div className="flex items-center gap-4 mb-2">
                        <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-bold">
                          {match.score}% Match
                        </span>
                        <span className="text-sm text-gray-600">
                          {match.matchingSkills.length} matching skills
                        </span>
                      </div>
                      <ul className="text-xs text-gray-700 space-y-1">
                        {match.reasoning.slice(0, 2).map((r: string, ri: number) => (
                          <li key={ri}>• {r}</li>
                        ))}
                      </ul>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedJob(match.job)
                        handleCalculateMatches(match.job)
                        setShowBestCandidates(false)
                      }}
                      className="btn-primary">
                      Submit
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Jobs List */}
        <div>
          <h2 className="text-2xl font-bold mb-4">Open Jobs ({data?.jobs.length || 0})</h2>
          {data?.jobs && data.jobs.length > 0 ? (
            <div className="space-y-3">
              {data.jobs.map((job: any) => (
                <motion.div
                  key={job.id}
                  whileHover={{ scale: 1.02 }}
                  onClick={() => handleCalculateMatches(job)}
                  className={'card cursor-pointer transition ' +
                    (selectedJob?.id === job.id ? 'ring-2 ring-purple-600 bg-purple-50' : 'hover:shadow-lg')}>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <p className="font-bold text-lg">{job.title}</p>
                      <p className="text-sm text-gray-600">{job.location}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        £{job.salary_min?.toLocaleString()} - £{job.salary_max?.toLocaleString()}
                      </p>
                      {job.ai_keywords && job.ai_keywords.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {job.ai_keywords.slice(0, 3).map((kw: string, i: number) => (
                            <span key={i} className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                              {kw}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <Sparkles className="w-5 h-5 text-purple-600" />
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="card text-center py-20">
              <p className="text-gray-500">No open jobs available</p>
            </div>
          )}
        </div>

        {/* Matching Results */}
        <div>
          {calculating ? (
            <div className="card text-center py-20">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-gray-600">AI analyzing candidates...</p>
            </div>
          ) : selectedJob && matches.length > 0 ? (
            <>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">Matches ({matches.length})</h2>
                {selectedCandidates.length > 0 && (
                  <button onClick={handleBulkSubmission} disabled={submitting}
                    className="btn-primary flex items-center gap-2">
                    <Send className="w-4 h-4" />
                    {submitting ? 'Submitting...' : `Submit ${selectedCandidates.length}`}
                  </button>
                )}
              </div>

              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {matches.map((match: any, i: number) => (
                  <motion.div
                    key={match.candidate.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => {
                      if (selectedCandidates.includes(match.candidate.id)) {
                        setSelectedCandidates(selectedCandidates.filter(id => id !== match.candidate.id))
                      } else {
                        setSelectedCandidates([...selectedCandidates, match.candidate.id])
                      }
                    }}
                    className={'card cursor-pointer transition ' +
                      (selectedCandidates.includes(match.candidate.id) ? 'ring-2 ring-emerald-600 bg-emerald-50' : 'hover:bg-gray-50')}>
                    <div className="flex items-start gap-3">
                      <div className={'w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ' +
                        (match.score >= 80 ? 'bg-emerald-600' :
                         match.score >= 60 ? 'bg-blue-600' :
                         'bg-yellow-600')}>
                        {match.score}
                      </div>
                      <div className="flex-1">
                        <p className="font-bold">{match.candidate.name}</p>
                        <p className="text-sm text-gray-600">{match.candidate.role_title || 'No role specified'}</p>
                        <div className="mt-2 space-y-1">
                          {match.reasoning.slice(0, 2).map((reason: string, ri: number) => (
                            <p key={ri} className="text-xs text-gray-600">• {reason}</p>
                          ))}
                        </div>
                        {match.matchingSkills.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {match.matchingSkills.map((skill: string, si: number) => (
                              <span key={si} className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs rounded">
                                {skill}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      {selectedCandidates.includes(match.candidate.id) && (
                        <CheckCircle className="w-6 h-6 text-emerald-600" />
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </>
          ) : (
            <div className="card text-center py-20">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Select a job to see AI-powered matches</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
