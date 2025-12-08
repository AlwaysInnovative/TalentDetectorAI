#!/bin/bash
# Complete Job Management System with Applications & AI Suggestions
# Run: bash complete-job-management.sh

set -e

echo "🚀 Building Complete Job Management System..."

mkdir -p app/dashboard/manager/jobs/{[id],create}
mkdir -p app/dashboard/manager/applications

# ==================== JOBS LIST PAGE ====================

cat > app/dashboard/manager/jobs/page.tsx << 'ENDFILE'
'use client'
import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'
import { Briefcase, Users, TrendingUp, MapPin, DollarSign, Calendar, Loader2 } from 'lucide-react'
import DynamicBackground from '@/components/ui/DynamicBackground'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const fetcher = async () => {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  const { data: jobs } = await supabase
    .from('jobs')
    .select(`
      *,
      applications(count)
    `)
    .eq('manager_id', user?.id || '')
    .order('created_at', { ascending: false })
  
  return jobs || []
}

export default function JobsPage() {
  const { data: jobs, isLoading } = useSWR('manager-jobs', fetcher, { refreshInterval: 5000 })
  const router = useRouter()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="relative">
      <DynamicBackground page="jobs" />
      
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">All Jobs</h1>
          <p className="text-gray-600">{jobs?.length || 0} total positions</p>
        </div>
        <Link href="/dashboard/manager/jobs/create">
          <button className="btn-primary">+ Post New Job</button>
        </Link>
      </div>

      {jobs && jobs.length > 0 ? (
        <div className="grid md:grid-cols-2 gap-6">
          {jobs.map((job: any, i: number) => {
            const applicationCount = job.applications?.[0]?.count || 0
            
            return (
              <motion.div
                key={job.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => router.push(`/dashboard/manager/jobs/${job.id}`)}
                className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition cursor-pointer border-l-4 border-blue-600">
                
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">{job.title}</h3>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" /> {job.location}
                      </span>
                      {job.salary_min && (
                        <span className="flex items-center gap-1">
                          <DollarSign className="w-4 h-4" />
                          £{job.salary_min?.toLocaleString()} - £{job.salary_max?.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className={'px-4 py-2 rounded-full text-sm font-bold ' +
                    (job.status === 'open' ? 'bg-emerald-100 text-emerald-700' : 
                     'bg-gray-100 text-gray-700')}>
                    {job.status}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center p-3 bg-blue-50 rounded-xl">
                    <Users className="w-6 h-6 text-blue-600 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-blue-600">{applicationCount}</p>
                    <p className="text-xs text-gray-600">Applications</p>
                  </div>
                  {job.likelihood_to_fill && (
                    <div className="text-center p-3 bg-emerald-50 rounded-xl">
                      <TrendingUp className="w-6 h-6 text-emerald-600 mx-auto mb-1" />
                      <p className="text-2xl font-bold text-emerald-600">{job.likelihood_to_fill}%</p>
                      <p className="text-xs text-gray-600">Fill Rate</p>
                    </div>
                  )}
                  <div className="text-center p-3 bg-amber-50 rounded-xl">
                    <Calendar className="w-6 h-6 text-amber-600 mx-auto mb-1" />
                    <p className="text-sm font-bold text-amber-600">
                      {new Date(job.created_at).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-gray-600">Posted</p>
                  </div>
                </div>

                <button className="w-full btn-primary text-sm">
                  View Applications & AI Insights →
                </button>
              </motion.div>
            )
          })}
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-12 text-center shadow-lg">
          <Briefcase className="w-20 h-20 text-gray-300 mx-auto mb-4" />
          <p className="text-xl text-gray-600 mb-4">No jobs posted yet</p>
          <Link href="/dashboard/manager/jobs/create">
            <button className="btn-primary">Post Your First Job</button>
          </Link>
        </div>
      )}
    </div>
  )
}
ENDFILE

# ==================== JOB DETAIL PAGE WITH APPLICATIONS & AI ====================

cat > app/dashboard/manager/jobs/[id]/page.tsx << 'ENDFILE'
'use client'
import { useState } from 'use'
import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Users, TrendingUp, Sparkles, CheckCircle, XCircle, Clock, MessageSquare, Loader2 } from 'lucide-react'
import DynamicBackground from '@/components/ui/DynamicBackground'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { aiAgent } from '@/lib/ai-agents/engine'

const fetcher = async (jobId: string) => {
  const supabase = createClient()
  
  const [jobRes, applicationsRes] = await Promise.all([
    supabase.from('jobs').select('*').eq('id', jobId).single(),
    supabase.from('applications').select(`
      *,
      candidates(*)
    `).eq('job_id', jobId).order('created_at', { ascending: false })
  ])
  
  return {
    job: jobRes.data,
    applications: applicationsRes.data || []
  }
}

export default function JobDetailPage({ params }: { params: { id: string } }) {
  const { data, mutate, isLoading } = useSWR(`job-${params.id}`, () => fetcher(params.id), { refreshInterval: 5000 })
  const [selectedApp, setSelectedApp] = useState<any>(null)
  const [aiInsights, setAiInsights] = useState<any>(null)
  const [generatingAI, setGeneratingAI] = useState(false)
  const router = useRouter()

  async function handleStatusChange(appId: string, newStatus: string) {
    const supabase = createClient()
    const { error } = await supabase
      .from('applications')
      .update({ status: newStatus })
      .eq('id', appId)
    
    if (error) {
      toast.error('Failed to update status')
    } else {
      toast.success('Status updated!')
      mutate()
    }
  }

  async function generateAIRecommendation(application: any) {
    setGeneratingAI(true)
    setSelectedApp(application)
    
    try {
      const result = await aiAgent.screenCandidate(application.candidates, data?.job)
      setAiInsights(result)
      toast.success('✨ AI analysis complete!')
    } catch (error) {
      toast.error('AI analysis failed')
    } finally {
      setGeneratingAI(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!data?.job) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-gray-600 mb-4">Job not found</p>
          <Link href="/dashboard/manager/jobs">
            <button className="btn-primary">Back to Jobs</button>
          </Link>
        </div>
      </div>
    )
  }

  const { job, applications } = data

  const stats = {
    total: applications.length,
    pending: applications.filter((a: any) => a.status === 'pending').length,
    screening: applications.filter((a: any) => a.status === 'screening').length,
    interview: applications.filter((a: any) => a.status === 'interview').length,
    offer: applications.filter((a: any) => a.status === 'offer').length,
    accepted: applications.filter((a: any) => a.status === 'hired').length,
    rejected: applications.filter((a: any) => a.status === 'rejected').length
  }

  return (
    <div className="relative">
      <DynamicBackground page="job-detail" />
      
      <div className="mb-8">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-4">
          <ArrowLeft className="w-5 h-5" /> Back to Jobs
        </button>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">{job.title}</h1>
        <p className="text-gray-600">{job.location} • {applications.length} applications</p>
      </div>

      {/* Application Stats */}
      <div className="grid md:grid-cols-7 gap-4 mb-8">
        {[
          { label: 'Total', value: stats.total, color: 'blue' },
          { label: 'Pending', value: stats.pending, color: 'amber' },
          { label: 'Screening', value: stats.screening, color: 'indigo' },
          { label: 'Interview', value: stats.interview, color: 'violet' },
          { label: 'Offer', value: stats.offer, color: 'emerald' },
          { label: 'Accepted', value: stats.accepted, color: 'green' },
          { label: 'Rejected', value: stats.rejected, color: 'red' }
        ].map((stat, i) => (
          <div key={i} className={'bg-white rounded-xl p-4 shadow text-center border-t-4 border-' + stat.color + '-600'}>
            <p className={'text-3xl font-bold text-' + stat.color + '-600'}>{stat.value}</p>
            <p className="text-xs text-gray-600 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {/* Applications List */}
        <div className="md:col-span-2 space-y-4">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Applications ({applications.length})</h2>
          
          {applications.map((app: any) => (
            <motion.div
              key={app.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => setSelectedApp(app)}
              className={'bg-white rounded-xl p-6 shadow-lg transition cursor-pointer ' +
                (selectedApp?.id === app.id ? 'ring-2 ring-blue-600' : 'hover:shadow-xl')}>
              
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900">{app.candidates?.name || 'Candidate'}</h3>
                  <p className="text-sm text-gray-600">{app.candidates?.email}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Applied {new Date(app.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <div className={'px-4 py-2 rounded-full text-sm font-bold mb-2 ' +
                    (app.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                     app.status === 'screening' ? 'bg-indigo-100 text-indigo-700' :
                     app.status === 'interview' ? 'bg-violet-100 text-violet-700' :
                     app.status === 'offer' ? 'bg-emerald-100 text-emerald-700' :
                     app.status === 'hired' ? 'bg-green-100 text-green-700' :
                     'bg-red-100 text-red-700')}>
                    {app.status}
                  </div>
                  {app.ai_match_score && (
                    <div className={'px-3 py-1 rounded-full text-xs font-bold ' +
                      (app.ai_match_score >= 80 ? 'bg-emerald-100 text-emerald-700' :
                       app.ai_match_score >= 60 ? 'bg-blue-100 text-blue-700' :
                       'bg-yellow-100 text-yellow-700')}>
                      AI Match: {app.ai_match_score}%
                    </div>
                  )}
                </div>
              </div>

              {app.candidates?.skills && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {app.candidates.skills.slice(0, 5).map((skill: string, i: number) => (
                    <span key={i} className="px-3 py-1 bg-blue-50 text-blue-700 text-xs rounded-full">
                      {skill}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <button onClick={() => generateAIRecommendation(app)} 
                  className="px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-lg text-sm font-semibold flex items-center gap-2 hover:opacity-90">
                  <Sparkles className="w-4 h-4" /> AI Analyze
                </button>
                
                <select
                  value={app.status}
                  onChange={(e) => {
                    e.stopPropagation()
                    handleStatusChange(app.id, e.target.value)
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="input text-sm flex-1">
                  <option value="pending">Pending</option>
                  <option value="screening">Screening</option>
                  <option value="interview">Interview</option>
                  <option value="offer">Offer</option>
                  <option value="hired">Hired</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>

              {app.feedback && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg border-l-4 border-blue-600">
                  <div className="flex items-center gap-2 mb-1">
                    <MessageSquare className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-semibold text-blue-900">Interview Feedback:</span>
                  </div>
                  <p className="text-sm text-blue-800">{app.feedback}</p>
                </div>
              )}
            </motion.div>
          ))}

          {applications.length === 0 && (
            <div className="bg-white rounded-xl p-12 text-center shadow-lg">
              <Users className="w-20 h-20 text-gray-300 mx-auto mb-4" />
              <p className="text-xl text-gray-600">No applications yet</p>
              <p className="text-sm text-gray-500 mt-2">Applications will appear here once candidates apply</p>
            </div>
          )}
        </div>

        {/* AI Insights Panel */}
        <div className="sticky top-4">
          {generatingAI ? (
            <div className="bg-white rounded-xl p-8 shadow-lg text-center">
              <Loader2 className="w-12 h-12 animate-spin text-violet-600 mx-auto mb-4" />
              <p className="text-gray-600">Analyzing candidate...</p>
            </div>
          ) : aiInsights && selectedApp ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-gradient-to-br from-violet-50 to-indigo-50 rounded-xl p-6 shadow-xl border-2 border-violet-200">
              
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-6 h-6 text-violet-600" />
                <h3 className="text-xl font-bold text-violet-900">AI Recommendation</h3>
              </div>

              <div className="bg-white rounded-xl p-4 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold">Screening Score</span>
                  <span className={'text-3xl font-bold ' +
                    (aiInsights.screening_score >= 75 ? 'text-emerald-600' :
                     aiInsights.screening_score >= 50 ? 'text-blue-600' :
                     'text-amber-600')}>
                    {aiInsights.screening_score}%
                  </span>
                </div>
                <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div className={'h-full transition-all ' +
                    (aiInsights.screening_score >= 75 ? 'bg-emerald-600' :
                     aiInsights.screening_score >= 50 ? 'bg-blue-600' :
                     'bg-amber-600')}
                    style={{ width: `${aiInsights.screening_score}%` }} />
                </div>
              </div>

              <div className={'p-4 rounded-xl mb-4 ' +
                (aiInsights.recommendation.includes('Strong') ? 'bg-emerald-100 border-2 border-emerald-300' :
                 aiInsights.recommendation.includes('Moderate') ? 'bg-blue-100 border-2 border-blue-300' :
                 'bg-amber-100 border-2 border-amber-300')}>
                <p className="font-bold text-lg mb-1">
                  {aiInsights.recommendation.includes('Strong') ? '✅ ' :
                   aiInsights.recommendation.includes('Moderate') ? '💡 ' : '⚠️ '}
                  {aiInsights.recommendation}
                </p>
              </div>

              {aiInsights.strengths.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-semibold text-emerald-900 mb-2 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-emerald-600" /> Strengths
                  </h4>
                  <ul className="space-y-1">
                    {aiInsights.strengths.map((strength: string, i: number) => (
                      <li key={i} className="text-sm text-emerald-800 flex items-start gap-2">
                        <span className="text-emerald-600">•</span>
                        <span>{strength}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {aiInsights.gaps.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-semibold text-amber-900 mb-2 flex items-center gap-2">
                    <XCircle className="w-5 h-5 text-amber-600" /> Skill Gaps
                  </h4>
                  <ul className="space-y-1">
                    {aiInsights.gaps.map((gap: string, i: number) => (
                      <li key={i} className="text-sm text-amber-800 flex items-start gap-2">
                        <span className="text-amber-600">•</span>
                        <span>{gap}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {aiInsights.risk_factors.length > 0 && (
                <div className="p-3 bg-red-50 rounded-lg border-l-4 border-red-500">
                  <h4 className="font-semibold text-red-900 mb-2">⚠️ Risk Factors</h4>
                  <ul className="space-y-1">
                    {aiInsights.risk_factors.map((risk: string, i: number) => (
                      <li key={i} className="text-sm text-red-800">{risk}</li>
                    ))}
                  </ul>
                </div>
              )}
            </motion.div>
          ) : (
            <div className="bg-white rounded-xl p-8 shadow-lg text-center">
              <Sparkles className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">Select a candidate and click "AI Analyze" for insights</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
ENDFILE

echo ""
echo "✅ Complete Job Management System Created!"
echo ""
echo "Features:"
echo "✓ /dashboard/manager/jobs - All jobs list"
echo "✓ /dashboard/manager/jobs/[id] - Job details with applications"
echo "✓ Real-time application status tracking"
echo "✓ AI match scores for each candidate"
echo "✓ Interview status (pending/screening/interview/offer/hired/rejected)"
echo "✓ AI-powered candidate analysis with recommendations"
echo "✓ Strengths, gaps, and risk factors analysis"
echo "✓ Interview feedback display"
echo "✓ Quick status change dropdown"
echo ""
echo "Run: npm run dev"
