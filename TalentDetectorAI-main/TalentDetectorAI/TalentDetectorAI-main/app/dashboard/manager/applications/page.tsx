'use client'
import { useState } from 'react'
import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'
import { 
  Users, Award, Download, CheckCircle, XCircle, 
  Clock, Eye, ArrowLeft, Sparkles, TrendingUp, Brain
} from 'lucide-react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import DynamicBackground from '@/components/ui/DynamicBackground'
import toast from 'react-hot-toast'

const fetcher = async () => {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Get all jobs for this manager
  const { data: jobs } = await supabase
    .from('jobs')
    .select('id')
    .eq('manager_id', user?.id)

  if (!jobs || jobs.length === 0) return []

  const jobIds = jobs.map(j => j.id)

  // Get all applications
  const { data: applications } = await supabase
    .from('candidate_interests')
    .select(`
      *,
      candidates(name, email, phone, location, skills),
      jobs(title, location, salary_min, salary_max),
      profiles!candidate_interests_agency_id_fkey(full_name, company)
    `)
    .in('job_id', jobIds)
    .not('cv_url', 'is', null)
    .order('ai_match_score', { ascending: false })

  return applications || []
}

export default function ManagerApplicationsPage() {
  const { data: applications, mutate } = useSWR('manager-applications', fetcher, { refreshInterval: 5000 })
  const [filter, setFilter] = useState('all')

  const filteredApps = (applications || []).filter((app: any) => {
    if (filter === 'all') return true
    if (filter === 'high_match') return app.ai_match_score >= 85
    if (filter === 'ready') return app.right_to_represent_signed
    if (filter === 'interested') return app.status === 'interested'
    return true
  })

  const stats = {
    total: applications?.length || 0,
    high_match: applications?.filter((a: any) => a.ai_match_score >= 85).length || 0,
    ready: applications?.filter((a: any) => a.right_to_represent_signed).length || 0,
    interested: applications?.filter((a: any) => a.status === 'interested').length || 0
  }

  return (
    <div className="relative min-h-screen p-8">
      <DynamicBackground page="manager-applications" />

      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-3 flex items-center gap-3">
              <Brain className="w-12 h-12 text-blue-600" />
              AI-Powered Applications
            </h1>
            <p className="text-xl text-gray-600">Review candidates with AI insights</p>
          </div>
          <Link href="/dashboard/manager">
            <button className="px-6 py-3 bg-gray-200 rounded-xl font-bold flex items-center gap-2">
              <ArrowLeft className="w-5 h-5" />
              Back
            </button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <motion.div
            whileHover={{ scale: 1.05 }}
            onClick={() => setFilter('all')}
            className={`rounded-2xl p-6 shadow-lg cursor-pointer transition ${
              filter === 'all' ? 'bg-blue-600 text-white' : 'bg-white border-2 border-gray-200'
            }`}>
            <Users className={`w-8 h-8 mb-3 ${filter === 'all' ? 'text-white' : 'text-blue-600'}`} />
            <p className="text-4xl font-bold mb-1">{stats.total}</p>
            <p className={`font-bold ${filter === 'all' ? 'text-blue-100' : 'text-gray-600'}`}>
              Total Applications
            </p>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.05 }}
            onClick={() => setFilter('high_match')}
            className={`rounded-2xl p-6 shadow-lg cursor-pointer transition ${
              filter === 'high_match' ? 'bg-emerald-600 text-white' : 'bg-white border-2 border-gray-200'
            }`}>
            <Award className={`w-8 h-8 mb-3 ${filter === 'high_match' ? 'text-white' : 'text-emerald-600'}`} />
            <p className="text-4xl font-bold mb-1">{stats.high_match}</p>
            <p className={`font-bold ${filter === 'high_match' ? 'text-emerald-100' : 'text-gray-600'}`}>
              85%+ Match
            </p>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.05 }}
            onClick={() => setFilter('ready')}
            className={`rounded-2xl p-6 shadow-lg cursor-pointer transition ${
              filter === 'ready' ? 'bg-purple-600 text-white' : 'bg-white border-2 border-gray-200'
            }`}>
            <CheckCircle className={`w-8 h-8 mb-3 ${filter === 'ready' ? 'text-white' : 'text-purple-600'}`} />
            <p className="text-4xl font-bold mb-1">{stats.ready}</p>
            <p className={`font-bold ${filter === 'ready' ? 'text-purple-100' : 'text-gray-600'}`}>
              Ready to Review
            </p>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.05 }}
            onClick={() => setFilter('interested')}
            className={`rounded-2xl p-6 shadow-lg cursor-pointer transition ${
              filter === 'interested' ? 'bg-green-600 text-white' : 'bg-white border-2 border-gray-200'
            }`}>
            <TrendingUp className={`w-8 h-8 mb-3 ${filter === 'interested' ? 'text-white' : 'text-green-600'}`} />
            <p className="text-4xl font-bold mb-1">{stats.interested}</p>
            <p className={`font-bold ${filter === 'interested' ? 'text-green-100' : 'text-gray-600'}`}>
              Interested
            </p>
          </motion.div>
        </div>

        {/* Applications List */}
        <div className="space-y-6">
          {filteredApps.map((app: any, index: number) => {
            const candidate = app.candidates
            const job = app.jobs
            const agency = app.profiles

            return (
              <motion.div
                key={app.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white rounded-2xl p-8 shadow-xl border-2 border-gray-200 hover:border-blue-400 hover:shadow-2xl transition">
                
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-2xl">
                        {candidate.name[0]}
                      </div>
                      <div>
                        <h3 className="text-3xl font-bold text-gray-900">{candidate.name}</h3>
                        <p className="text-lg text-gray-600">{job.title}</p>
                      </div>
                    </div>

                    {/* AI Analysis */}
                    {app.ai_cv_analysis && (
                      <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 mb-4 border-2 border-purple-200">
                        <h4 className="font-bold text-purple-900 mb-3 flex items-center gap-2">
                          <Sparkles className="w-5 h-5" />
                          AI Analysis Summary
                        </h4>
                        <p className="text-gray-700 mb-3">{app.ai_cv_analysis.summary}</p>
                        
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm font-bold text-emerald-700 mb-2">Strengths:</p>
                            <ul className="text-sm space-y-1">
                              {app.ai_cv_analysis.strengths?.slice(0, 3).map((s: string, i: number) => (
                                <li key={i} className="text-gray-700">✓ {s}</li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-700 mb-2">Skills Matched:</p>
                            <div className="flex flex-wrap gap-2">
                              {app.ai_cv_analysis.keywords_matched?.slice(0, 5).map((k: string, i: number) => (
                                <span key={i} className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-xs font-bold">
                                  {k}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Contact Info */}
                    <div className="flex gap-6 text-sm text-gray-600 mb-4">
                      <span>{candidate.email}</span>
                      {candidate.phone && <span>{candidate.phone}</span>}
                      {candidate.location && <span>{candidate.location}</span>}
                    </div>

                    {/* Agency Info */}
                    <p className="text-sm text-gray-600">
                      Submitted by <strong>{agency.full_name}</strong>
                      {agency.company && ` (${agency.company})`}
                    </p>

                    {/* Status Badges */}
                    <div className="flex gap-2 mt-4">
                      {app.right_to_represent_signed && (
                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-bold">
                          ✓ RTR Signed
                        </span>
                      )}
                      {app.status === 'interested' && (
                        <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-bold">
                          Interested
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Match Score & Actions */}
                  <div className="ml-8 flex flex-col items-center gap-4">
                    <div className={`w-32 h-32 rounded-full flex flex-col items-center justify-center font-bold border-4 shadow-xl ${
                      app.ai_match_score >= 85 ? 'bg-emerald-500 border-emerald-300 text-white' :
                      app.ai_match_score >= 75 ? 'bg-blue-500 border-blue-300 text-white' :
                      app.ai_match_score >= 60 ? 'bg-cyan-500 border-cyan-300 text-white' :
                      'bg-amber-500 border-amber-300 text-white'
                    }`}>
                      <span className="text-4xl">{app.ai_match_score}</span>
                      <span className="text-xs">MATCH</span>
                    </div>

                    {app.cv_url && (
                      <a
                        href={app.cv_url}
                        target="_blank"
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition flex items-center gap-2">
                        <Download className="w-5 h-5" />
                        Download CV
                      </a>
                    )}

                    {app.ai_match_score >= 85 && (
                      <div className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-xl text-sm font-bold text-center">
                        🌟 Top Candidate<br/>Schedule Interview
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )
          })}

          {filteredApps.length === 0 && (
            <div className="bg-white rounded-2xl p-20 text-center shadow-lg">
              <Clock className="w-32 h-32 text-gray-300 mx-auto mb-8" />
              <h3 className="text-3xl font-bold mb-4">No Applications Yet</h3>
              <p className="text-xl text-gray-600">
                Applications will appear here when agencies submit candidates
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
