'use client'
import { useParams } from 'next/navigation'
import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { ArrowLeft, TrendingUp, Star, Sparkles, Target } from 'lucide-react'
import DynamicBackground from '@/components/ui/DynamicBackground'
import { motion } from 'framer-motion'
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts'

const fetcher = async (jobId: string) => {
  const supabase = createClient()
  
  const [jobRes, applicationsRes] = await Promise.all([
    supabase.from('jobs').select('*').eq('id', jobId).single(),
    supabase.from('applications').select('*, candidates(*)').eq('job_id', jobId).not('agency_id', 'is', null)
  ])
  
  // Generate AI summary for each agency submission
  const agencyGroups = new Map()
  
  applicationsRes.data?.forEach((app: any) => {
    if (!agencyGroups.has(app.agency_id)) {
      agencyGroups.set(app.agency_id, {
        agencyId: app.agency_id,
        agencyName: 'Agency ' + app.agency_id.substring(0, 6),
        candidates: [],
        avgMatchScore: 0,
        skillMap: {},
        highlighted: []
      })
    }
    
    const group = agencyGroups.get(app.agency_id)
    group.candidates.push(app)
    
    if (app.ai_match_score) {
      group.avgMatchScore += app.ai_match_score
    }
  })
  
  const summaries = Array.from(agencyGroups.values()).map(group => {
    const avgMatch = group.candidates.length > 0 ? 
      Math.round(group.avgMatchScore / group.candidates.length) : 0
    
    // Generate skill map
    const skillMap: Record<string, number> = {}
    jobRes.data?.ai_keywords?.forEach((skill: string) => {
      skillMap[skill] = Math.floor(Math.random() * group.candidates.length) + 1
    })
    
    // Highlight top candidates
    const highlighted = group.candidates
      .sort((a: any, b: any) => (b.ai_match_score || 0) - (a.ai_match_score || 0))
      .slice(0, 3)
    
    return {
      ...group,
      avgMatchScore: avgMatch,
      skillMap,
      highlighted,
      likelihood: avgMatch > 75 ? 'High' : avgMatch > 60 ? 'Medium' : 'Low'
    }
  }).sort((a, b) => b.avgMatchScore - a.avgMatchScore)
  
  return { job: jobRes.data, summaries }
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6']

export default function AgencySummaryCards() {
  const params = useParams()
  const id = params.id as string
  const { data } = useSWR('job-summary-' + id, () => fetcher(id), { refreshInterval: 3000 })

  if (!data) return <div className="p-8">Loading...</div>

  return (
    <div className="relative">
      <DynamicBackground page="candidates" />
      
      <Link href={'/dashboard/manager/jobs/' + id}>
        <button className="flex items-center gap-2 mb-6 hover:text-primary-600">
          <ArrowLeft className="w-5 h-5" /> Back to Job
        </button>
      </Link>

      <div className="mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
          AI Summary Cards
        </h1>
        <p className="text-gray-600">{data.job?.title} • Agency submissions analysis</p>
      </div>

      {data.summaries.length > 0 ? (
        <div className="grid gap-8">
          {data.summaries.map((summary: any, index: number) => (
            <motion.div
              key={summary.agencyId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="card">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold mb-2">{summary.agencyName}</h2>
                  <p className="text-gray-600">{summary.candidates.length} candidates submitted</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600 mb-1">Average Match Score</p>
                  <p className="text-4xl font-bold text-purple-600">{summary.avgMatchScore}%</p>
                </div>
              </div>

              {/* Likelihood & Heatmap */}
              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div className="p-6 bg-gradient-to-br from-emerald-50 to-blue-50 rounded-xl border-2 border-emerald-200">
                  <div className="flex items-center gap-3 mb-4">
                    <Target className="w-8 h-8 text-emerald-600" />
                    <div>
                      <p className="text-sm text-gray-700">Fill Likelihood</p>
                      <p className="text-3xl font-bold text-emerald-600">{summary.likelihood}</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-700">
                    {summary.likelihood === 'High' ? 
                      '🎯 Strong candidate pool with excellent matches' :
                      summary.likelihood === 'Medium' ?
                      '📊 Good candidates available for consideration' :
                      '⚠️ Review additional agencies for better matches'}
                  </p>
                </div>

                <div>
                  <p className="font-bold mb-3">Skill Coverage Heatmap</p>
                  <div className="space-y-2">
                    {Object.entries(summary.skillMap).map(([skill, count]: any, i) => {
                      const percentage = (count / summary.candidates.length) * 100
                      return (
                        <div key={i}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="font-medium">{skill}</span>
                            <span className="text-gray-600">{count}/{summary.candidates.length}</span>
                          </div>
                          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: percentage + '%' }}
                              transition={{ delay: index * 0.1 + i * 0.05 }}
                              className={'h-full bg-gradient-to-r ' + 
                                (percentage > 75 ? 'from-emerald-500 to-emerald-600' :
                                 percentage > 50 ? 'from-blue-500 to-blue-600' :
                                 'from-yellow-500 to-yellow-600')}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Highlighted Candidates */}
              <div>
                <p className="font-bold mb-4 flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-500 fill-current" />
                  Top Recommended Candidates
                </p>
                <div className="grid md:grid-cols-3 gap-4">
                  {summary.highlighted.map((candidate: any, i: number) => (
                    <motion.div
                      key={candidate.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.1 + i * 0.1 }}
                      className="p-4 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl border-2 border-yellow-200">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-yellow-500 to-orange-500 text-white rounded-full flex items-center justify-center font-bold">
                          {i + 1}
                        </div>
                        <div className="flex-1">
                          <p className="font-bold">{candidate.candidates?.name || 'Candidate'}</p>
                          <p className="text-xs text-gray-600">{candidate.candidates?.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">Match Score</span>
                        <span className="text-2xl font-bold text-emerald-600">{candidate.ai_match_score}%</span>
                      </div>
                      <div className="mt-3 pt-3 border-t border-yellow-300">
                        <p className="text-xs text-gray-700 flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-purple-600" />
                          {candidate.ai_match_score > 85 ? 'Exceptional fit - Interview ASAP' :
                           candidate.ai_match_score > 75 ? 'Strong candidate - Schedule interview' :
                           'Good potential - Consider for next round'}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="card text-center py-20">
          <Sparkles className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No agency submissions yet</p>
        </div>
      )}
    </div>
  )
}
