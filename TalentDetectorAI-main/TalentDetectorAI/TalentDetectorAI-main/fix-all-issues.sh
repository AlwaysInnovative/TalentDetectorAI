#!/bin/bash
# Fix All Broken Links & Interview Scheduling
# Run: bash fix-all-issues.sh

set -e

echo "🔧 Fixing all issues..."

# Fix Job Details Page (Next.js 14 compatible)
cat > 'app/dashboard/manager/jobs/[id]/page.tsx' << 'ENDFILE'
'use client'
import { useParams } from 'next/navigation'
import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { ArrowLeft, Users, Download, Edit, Sparkles } from 'lucide-react'
import DynamicBackground from '@/components/ui/DynamicBackground'
import { exportJobReport } from '@/lib/exports/pdf-generator'

const fetcher = async (jobId: string) => {
  const supabase = createClient()
  
  const [jobRes, applicationsRes] = await Promise.all([
    supabase.from('jobs').select('*').eq('id', jobId).single(),
    supabase.from('applications').select('*, candidates(*)').eq('job_id', jobId)
  ])
  
  return { job: jobRes.data, applications: applicationsRes.data || [] }
}

export default function JobDetails() {
  const params = useParams()
  const id = params.id as string
  const { data, isLoading } = useSWR('job-' + id, () => fetcher(id), { refreshInterval: 3000 })

  if (isLoading) return <div className="p-8">Loading...</div>
  if (!data?.job) return <div className="p-8">Job not found</div>

  return (
    <div className="relative">
      <DynamicBackground page="jobs" />
      
      <Link href="/dashboard/manager/jobs/list">
        <button className="flex items-center gap-2 mb-6 hover:text-primary-600">
          <ArrowLeft className="w-5 h-5" /> Back to Jobs
        </button>
      </Link>

      <div className="card mb-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold">{data.job.title}</h1>
              {data.job.ai_keywords && (
                <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> AI Enhanced
                </span>
              )}
              <span className={'px-3 py-1 rounded-full text-xs font-semibold ' + 
                (data.job.status === 'open' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-700')}>
                {data.job.status}
              </span>
            </div>
            <p className="text-gray-600">Posted {new Date(data.job.created_at).toLocaleDateString()}</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => exportJobReport(data.job, data.applications)} className="btn-primary flex items-center gap-2">
              <Download className="w-4 h-4" /> Export
            </button>
            <Link href={'/dashboard/manager/jobs/' + id + '/edit'}>
              <button className="btn-secondary flex items-center gap-2">
                <Edit className="w-4 h-4" /> Edit
              </button>
            </Link>
          </div>
        </div>

        <div className="grid md:grid-cols-4 gap-6 mb-6">
          <div className="p-4 bg-blue-50 rounded-xl">
            <p className="text-sm text-blue-700 mb-1">Location</p>
            <p className="font-bold text-blue-900">{data.job.location}</p>
          </div>
          <div className="p-4 bg-emerald-50 rounded-xl">
            <p className="text-sm text-emerald-700 mb-1">Salary Range</p>
            <p className="font-bold text-emerald-900">
              £{data.job.salary_min?.toLocaleString()} - £{data.job.salary_max?.toLocaleString()}
            </p>
          </div>
          <div className="p-4 bg-purple-50 rounded-xl">
            <p className="text-sm text-purple-700 mb-1">Applications</p>
            <p className="font-bold text-purple-900">{data.applications.length}</p>
          </div>
          <div className="p-4 bg-yellow-50 rounded-xl">
            <p className="text-sm text-yellow-700 mb-1">Urgency</p>
            <p className="font-bold text-yellow-900 capitalize">{data.job.urgency || 'Medium'}</p>
          </div>
        </div>

        <div className="mb-6">
          <h3 className="font-bold mb-2">Job Description</h3>
          <p className="text-gray-700 whitespace-pre-line">{data.job.description}</p>
        </div>

        {data.job.ai_keywords && data.job.ai_keywords.length > 0 && (
          <div>
            <h3 className="font-bold mb-2">Required Skills</h3>
            <div className="flex flex-wrap gap-2">
              {data.job.ai_keywords.map((keyword: string, i: number) => (
                <span key={i} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                  {keyword}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6" /> Candidates ({data.applications.length})
          </h2>
          <Link href={'/dashboard/manager/jobs/' + id + '/candidates'}>
            <button className="btn-primary">View All Candidates</button>
          </Link>
        </div>

        {data.applications.length > 0 ? (
          <div className="grid gap-4">
            {data.applications.slice(0, 5).map((app: any) => (
              <Link key={app.id} href={'/dashboard/manager/jobs/' + id + '/candidates'}>
                <div className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition cursor-pointer flex justify-between items-center">
                  <div>
                    <p className="font-bold">{app.candidates?.name || 'Candidate'}</p>
                    <p className="text-sm text-gray-600">{app.candidates?.email}</p>
                    <p className="text-xs text-gray-500 mt-1">Applied {new Date(app.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    {app.ai_match_score && (
                      <div className="text-center">
                        <p className="text-2xl font-bold text-emerald-600">{app.ai_match_score}%</p>
                        <p className="text-xs text-gray-500">Match</p>
                      </div>
                    )}
                    <span className={'px-3 py-1 rounded-full text-xs font-semibold ' +
                      (app.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                       app.status === 'interview' ? 'bg-blue-100 text-blue-700' :
                       'bg-gray-100 text-gray-700')}>
                      {app.status}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No applications yet</p>
          </div>
        )}
      </div>
    </div>
  )
}
ENDFILE

# Fix Job Candidates Page with Interview Scheduling
cat > 'app/dashboard/manager/jobs/[id]/candidates/page.tsx' << 'ENDFILE'
'use client'
import { useParams } from 'next/navigation'
import { useState } from 'react'
import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { ArrowLeft, Sparkles, User, Calendar, Video, MapPin, CheckCircle } from 'lucide-react'
import DynamicBackground from '@/components/ui/DynamicBackground'
import CandidateScorecard from '@/components/manager/CandidateScorecard'
import { matchCandidateToJob } from '@/lib/ai/complete-engine'
import toast from 'react-hot-toast'

const fetcher = async (jobId: string) => {
  const supabase = createClient()
  
  const [jobRes, applicationsRes] = await Promise.all([
    supabase.from('jobs').select('*').eq('id', jobId).single(),
    supabase.from('applications').select('*, candidates(*)').eq('job_id', jobId)
  ])
  
  return { job: jobRes.data, applications: applicationsRes.data || [] }
}

export default function JobCandidates() {
  const params = useParams()
  const id = params.id as string
  const { data, mutate } = useSWR('job-candidates-' + id, () => fetcher(id), { refreshInterval: 3000 })
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null)
  const [matchResult, setMatchResult] = useState<any>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [showSchedule, setShowSchedule] = useState(false)
  const [scheduleData, setScheduleData] = useState({
    date: '',
    time: '',
    type: 'video',
    location: ''
  })

  async function analyzeCandidate(application: any) {
    setAnalyzing(true)
    setSelectedCandidate(application)
    try {
      const result = await matchCandidateToJob(application.candidates, data?.job)
      setMatchResult(result)
      toast.success('AI analysis complete!')
    } catch (error) {
      toast.error('Analysis failed')
    } finally {
      setAnalyzing(false)
    }
  }

  async function moveToInterview(applicationId: string) {
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('applications')
        .update({ status: 'interview' })
        .eq('id', applicationId)
      
      if (error) throw error
      
      toast.success('Moved to interview stage!')
      setShowSchedule(true)
      mutate()
    } catch (error) {
      toast.error('Failed to update status')
    }
  }

  async function scheduleInterview() {
    if (!scheduleData.date || !scheduleData.time) {
      toast.error('Select date and time')
      return
    }
    
    const scheduledAt = new Date(scheduleData.date + 'T' + scheduleData.time)
    
    try {
      const supabase = createClient()
      const { error } = await supabase.from('interviews').insert({
        application_id: selectedCandidate.id,
        scheduled_at: scheduledAt.toISOString(),
        status: 'scheduled',
        type: scheduleData.type,
        location: scheduleData.type === 'in-person' ? scheduleData.location : 'Video Call',
        ai_questions: matchResult?.recommendedQuestions || []
      })
      
      if (error) throw error
      
      toast.success('Interview scheduled successfully!')
      setShowSchedule(false)
      setScheduleData({ date: '', time: '', type: 'video', location: '' })
    } catch (error) {
      toast.error('Failed to schedule interview')
    }
  }

  if (!data) return <div className="p-8">Loading...</div>

  return (
    <div className="relative">
      <DynamicBackground page="candidates" />
      
      <Link href={'/dashboard/manager/jobs/' + id}>
        <button className="flex items-center gap-2 mb-6 hover:text-primary-600">
          <ArrowLeft className="w-5 h-5" /> Back to Job
        </button>
      </Link>

      <h1 className="text-4xl font-bold text-primary-600 mb-2">Candidate Evaluation</h1>
      <p className="text-gray-600 mb-8">{data.job?.title} • {data.applications.length} candidates</p>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <h2 className="text-2xl font-bold mb-4">All Candidates</h2>
          <div className="space-y-4">
            {data.applications.map((app: any) => (
              <div key={app.id} className={'card transition ' + 
                (selectedCandidate?.id === app.id ? 'ring-2 ring-primary-600' : '')}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white">
                      <User className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-bold">{app.candidates?.name || 'Candidate'}</p>
                      <p className="text-sm text-gray-600">{app.candidates?.email}</p>
                      <span className={'inline-block mt-1 px-2 py-1 rounded-full text-xs font-semibold ' +
                        (app.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                         app.status === 'interview' ? 'bg-blue-100 text-blue-700' :
                         'bg-emerald-100 text-emerald-700')}>
                        {app.status}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <button onClick={() => analyzeCandidate(app)} className="btn-primary flex-1 flex items-center justify-center gap-2">
                    <Sparkles className="w-4 h-4" /> Analyze
                  </button>
                  {app.status === 'pending' && (
                    <button onClick={() => moveToInterview(app.id)} className="btn-secondary flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" /> Move to Interview
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          {analyzing ? (
            <div className="card text-center py-20">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary-600 mx-auto mb-4" />
              <p className="text-gray-600">AI is analyzing candidate...</p>
            </div>
          ) : matchResult && selectedCandidate ? (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">{selectedCandidate?.candidates?.name}</h2>
                {selectedCandidate.status === 'interview' && (
                  <button onClick={() => setShowSchedule(true)} className="btn-primary flex items-center gap-2">
                    <Calendar className="w-4 h-4" /> Schedule Interview
                  </button>
                )}
              </div>
              
              {showSchedule && (
                <div className="card mb-6 border-2 border-blue-200 bg-blue-50">
                  <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <Calendar className="w-5 h-5" /> Schedule Interview
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-semibold mb-2">Date</label>
                      <input type="date" value={scheduleData.date} 
                        onChange={e => setScheduleData({...scheduleData, date: e.target.value})}
                        className="input" min={new Date().toISOString().split('T')[0]} />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2">Time</label>
                      <input type="time" value={scheduleData.time}
                        onChange={e => setScheduleData({...scheduleData, time: e.target.value})}
                        className="input" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2">Type</label>
                      <select value={scheduleData.type} 
                        onChange={e => setScheduleData({...scheduleData, type: e.target.value})}
                        className="input">
                        <option value="video">Video Call</option>
                        <option value="phone">Phone Call</option>
                        <option value="in-person">In-Person</option>
                      </select>
                    </div>
                    {scheduleData.type === 'in-person' && (
                      <div>
                        <label className="block text-sm font-semibold mb-2">Location</label>
                        <input type="text" value={scheduleData.location}
                          onChange={e => setScheduleData({...scheduleData, location: e.target.value})}
                          className="input" placeholder="Office address" />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-3">
                    <button onClick={() => setShowSchedule(false)} className="btn-secondary">
                      Cancel
                    </button>
                    <button onClick={scheduleInterview} className="btn-primary flex-1 flex items-center justify-center gap-2">
                      <Calendar className="w-4 h-4" /> Confirm Schedule
                    </button>
                  </div>
                </div>
              )}
              
              <CandidateScorecard match={matchResult} />
            </div>
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
ENDFILE

# Fix Job List Page
cat > app/dashboard/manager/jobs/list/page.tsx << 'ENDFILE'
'use client'
import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Plus, ExternalLink, Sparkles } from 'lucide-react'
import DynamicBackground from '@/components/ui/DynamicBackground'

const fetcher = async () => {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data } = await supabase.from('jobs').select('*').eq('manager_id', user?.id || '').order('created_at', { ascending: false })
  return data || []
}

export default function JobsList() {
  const { data: jobs, isLoading } = useSWR('manager-jobs-list', fetcher, { refreshInterval: 3000 })

  if (isLoading) return <div className="p-8">Loading...</div>

  return (
    <div className="relative">
      <DynamicBackground page="jobs" />
      
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold text-primary-600 mb-2">All Job Postings</h1>
          <p className="text-gray-600">{jobs?.length || 0} jobs posted</p>
        </div>
        <Link href="/dashboard/manager/jobs/new">
          <button className="btn-primary flex items-center gap-2">
            <Plus className="w-5 h-5" /> Post New Job
          </button>
        </Link>
      </div>

      {jobs && jobs.length > 0 ? (
        <div className="grid gap-6">
          {jobs.map((job: any) => (
            <div key={job.id} className="card hover:shadow-xl transition">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-2xl font-bold">{job.title}</h3>
                    {job.ai_keywords && job.ai_keywords.length > 0 && (
                      <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> AI Enhanced
                      </span>
                    )}
                    <span className={'px-3 py-1 rounded-full text-xs font-semibold ' + 
                      (job.status === 'open' ? 'bg-emerald-100 text-emerald-700' : 
                       job.status === 'closed' ? 'bg-gray-100 text-gray-700' : 
                       'bg-blue-100 text-blue-700')}>
                      {job.status}
                    </span>
                  </div>
                  
                  <p className="text-gray-600 mb-4">{job.description?.substring(0, 200)}...</p>
                  
                  <div className="flex gap-6 text-sm text-gray-500">
                    <span>📍 {job.location || 'Not specified'}</span>
                    <span>💰 £{job.salary_min?.toLocaleString()} - £{job.salary_max?.toLocaleString()}</span>
                    <span>📅 Posted {new Date(job.created_at).toLocaleDateString()}</span>
                  </div>
                  
                  {job.ai_keywords && job.ai_keywords.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {job.ai_keywords.slice(0, 5).map((keyword: string, i: number) => (
                        <span key={i} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded">
                          {keyword}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                
                <Link href={'/dashboard/manager/jobs/' + job.id}>
                  <button className="btn-primary flex items-center gap-2 ml-6">
                    View Details <ExternalLink className="w-4 h-4" />
                  </button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card text-center py-20">
          <p className="text-gray-500 text-lg mb-4">No jobs posted yet</p>
          <Link href="/dashboard/manager/jobs/new">
            <button className="btn-primary">Post Your First Job</button>
          </Link>
        </div>
      )}
    </div>
  )
}
ENDFILE

echo ""
echo "✅ ALL ISSUES FIXED!"
echo ""
echo "Fixed:"
echo "✓ Job details page (Next.js 14 compatible)"
echo "✓ Job list page working"
echo "✓ Candidate evaluation page"
echo "✓ Interview scheduling for interview-stage candidates"
echo "✓ Move candidate to interview stage"
echo "✓ AI-generated interview questions included"
echo ""
echo "RESTART SERVER:"
echo "npm run dev"
