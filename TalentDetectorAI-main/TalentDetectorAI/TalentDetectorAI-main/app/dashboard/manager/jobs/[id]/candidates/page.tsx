'use client'
import { useParams } from 'next/navigation'
import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { ArrowLeft, User, Mail, Sparkles, ArrowRight, Calendar, CheckCircle, XCircle } from 'lucide-react'
import DynamicBackground from '@/components/ui/DynamicBackground'
import { useState } from 'react'
import { matchCandidateToJob } from '@/lib/ai/complete-engine'
import CandidateScorecard from '@/components/manager/CandidateScorecard'
import toast from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'

const fetcher = async (jobId: string) => {
  const supabase = createClient()
  
  const [jobRes, applicationsRes] = await Promise.all([
    supabase.from('jobs').select('*').eq('id', jobId).single(),
    supabase.from('applications').select('*, candidates(*)').eq('job_id', jobId).order('created_at', { ascending: false })
  ])
  
  return { 
    job: jobRes.data, 
    applications: applicationsRes.data || []
  }
}

const STAGES = ['pending', 'screening', 'interview', 'offer', 'hired', 'rejected']

export default function JobCandidates() {
  const params = useParams()
  const id = params.id as string
  const { data, mutate } = useSWR('job-candidates-' + id, () => fetcher(id), { refreshInterval: 2000 })
  const [selectedApp, setSelectedApp] = useState<any>(null)
  const [matchResult, setMatchResult] = useState<any>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [filterStage, setFilterStage] = useState('all')

  async function analyzeCandidate(app: any) {
    setAnalyzing(true)
    setSelectedApp(app)
    try {
      const result = await matchCandidateToJob(app.candidates, data?.job)
      setMatchResult(result)
      
      // Update match score in database
      const supabase = createClient()
      await supabase.from('applications')
        .update({ ai_match_score: result.matchScore })
        .eq('id', app.id)
      
      toast.success('AI analysis complete!')
      mutate()
    } catch (error) {
      toast.error('Analysis failed')
    } finally {
      setAnalyzing(false)
    }
  }

  async function moveToStage(appId: string, newStage: string) {
    const supabase = createClient()
    const { error } = await supabase.from('applications').update({ status: newStage }).eq('id', appId)
    
    if (error) {
      toast.error('Failed to update')
    } else {
      toast.success(`Moved to ${newStage}!`)
      mutate()
      
      if (newStage === 'interview') {
        toast('Schedule interview in Interviews tab', { icon: '📅' })
      }
    }
  }

  if (!data) return <div className="flex items-center justify-center h-screen">
    <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      className="w-16 h-16 border-4 border-primary-600 border-t-transparent rounded-full" />
  </div>

  const filteredApps = data.applications.filter(app => 
    filterStage === 'all' || app.status === filterStage
  )

  return (
    <div className="relative">
      <DynamicBackground page="candidates" />
      
      <Link href={'/dashboard/manager/jobs/' + id}>
        <button className="flex items-center gap-2 mb-6 hover:text-primary-600 transition">
          <ArrowLeft className="w-5 h-5" /> Back to Job
        </button>
      </Link>

      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-600 to-emerald-600 bg-clip-text text-transparent mb-2">
            Candidate Pipeline
          </h1>
          <p className="text-gray-600">{data.job?.title} • {data.applications.length} applications</p>
        </div>
      </div>

      {/* Stage Filter */}
      <div className="card mb-6">
        <div className="flex gap-2 flex-wrap">
          {['all', ...STAGES].map(stage => {
            const count = stage === 'all' ? data.applications.length : 
              data.applications.filter(a => a.status === stage).length
            return (
              <button key={stage} onClick={() => setFilterStage(stage)}
                className={'px-4 py-2 rounded-xl font-semibold transition ' + 
                  (filterStage === stage ? 
                    'bg-primary-600 text-white shadow-lg' : 
                    'bg-gray-100 hover:bg-gray-200')}>
                {stage.charAt(0).toUpperCase() + stage.slice(1)} ({count || 0})
              </button>
            )
          })}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <h2 className="text-2xl font-bold mb-4">Candidates ({filteredApps.length})</h2>
          
          <AnimatePresence mode="popLayout">
            {filteredApps.length > 0 ? (
              <div className="space-y-4">
                {filteredApps.map((app: any) => (
                  <motion.div 
                    key={app.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className={'card transition ' + (selectedApp?.id === app.id ? 'ring-2 ring-primary-600' : '')}>
                    <div className="flex items-start gap-4 mb-4">
                      <motion.div 
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white">
                        <User className="w-6 h-6" />
                      </motion.div>
                      <div className="flex-1">
                        <p className="font-bold">{app.candidates?.name || 'Candidate'}</p>
                        <p className="text-sm text-gray-600 flex items-center gap-1">
                          <Mail className="w-3 h-3" /> {app.candidates?.email}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">Applied {new Date(app.created_at).toLocaleDateString()}</p>
                        
                        <div className="flex items-center gap-2 mt-2">
                          <span className={'px-3 py-1 rounded-full text-xs font-semibold ' +
                            (app.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                             app.status === 'screening' ? 'bg-blue-100 text-blue-700' :
                             app.status === 'interview' ? 'bg-purple-100 text-purple-700' :
                             app.status === 'offer' ? 'bg-emerald-100 text-emerald-700' :
                             app.status === 'hired' ? 'bg-green-100 text-green-700' :
                             'bg-red-100 text-red-700')}>
                            {app.status}
                          </span>
                          {app.ai_match_score && (
                            <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded">
                              {app.ai_match_score}% Match
                            </span>
                          )}
                          {app.agency_id && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded">
                              Via Agency
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <button onClick={() => analyzeCandidate(app)} 
                        className="btn-primary flex-1 flex items-center justify-center gap-2 text-sm">
                        <Sparkles className="w-4 h-4" /> Analyze
                      </button>
                    </div>

                    {selectedApp?.id === app.id && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mt-4 pt-4 border-t">
                        <p className="text-sm font-semibold mb-2">Move to:</p>
                        <div className="flex flex-wrap gap-2">
                          {STAGES.filter(s => s !== app.status).map(stage => (
                            <button key={stage} onClick={() => moveToStage(app.id, stage)}
                              className="px-3 py-1 bg-gray-100 hover:bg-primary-600 hover:text-white rounded-lg text-sm font-semibold transition flex items-center gap-1">
                              {stage} <ArrowRight className="w-3 h-3" />
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="card text-center py-20">
                <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No candidates in this stage</p>
              </div>
            )}
          </AnimatePresence>
        </div>

        <div>
          {analyzing ? (
            <div className="card text-center py-20">
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-16 h-16 border-4 border-primary-600 border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-gray-600">AI analyzing candidate...</p>
            </div>
          ) : matchResult && selectedApp ? (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <h2 className="text-2xl font-bold mb-4">{selectedApp?.candidates?.name}</h2>
              <CandidateScorecard match={matchResult} />
            </motion.div>
          ) : (
            <div className="card text-center py-20">
              <Sparkles className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Select a candidate to view AI analysis</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
