#!/bin/bash
# Professional Hiring Manager Dashboard - Real-time, DB-driven
# Run: bash professional-manager-dashboard.sh

set -e

echo "🚀 Building Professional Manager Dashboard..."

# ==================== ENHANCED MANAGER DASHBOARD ====================

cat > app/dashboard/manager/page.tsx << 'ENDFILE'
'use client'
import { useState, useEffect } from 'react'
import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'
import { Briefcase, Users, TrendingUp, Clock, Plus, Building2, UserCheck } from 'lucide-react'
import DynamicBackground from '@/components/ui/DynamicBackground'
import CommandPalette from '@/components/command-palette/CommandPalette'
import RealtimeNotifications from '@/components/ui/advanced/RealtimeNotifications'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { realtimeEngine } from '@/lib/realtime/engine'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'

const fetcher = async () => {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  const [jobsRes, applicationsRes, interviewsRes, agenciesRes] = await Promise.all([
    supabase.from('jobs').select('*').eq('manager_id', user?.id || '').order('created_at', { ascending: false }),
    supabase.from('applications').select('*, jobs!inner(manager_id)').eq('jobs.manager_id', user?.id || ''),
    supabase.from('interviews').select('*, applications!inner(*, jobs!inner(manager_id))').eq('applications.jobs.manager_id', user?.id || ''),
    supabase.from('profiles').select('id, full_name, email, company').eq('role', 'agency')
  ])
  
  const openJobs = jobsRes.data?.filter(j => j.status === 'open') || []
  const totalApplications = applicationsRes.data || []
  const pendingReview = totalApplications.filter(a => a.status === 'pending')
  const upcomingInterviews = interviewsRes.data?.filter(i => {
    const interviewDate = new Date(i.scheduled_at)
    const now = new Date()
    return interviewDate > now
  }) || []
  
  return {
    jobs: jobsRes.data || [],
    openJobs: openJobs.length,
    totalJobs: jobsRes.data?.length || 0,
    totalApplications: totalApplications.length,
    pendingReview: pendingReview.length,
    upcomingInterviews: upcomingInterviews.length,
    agencies: agenciesRes.data || [],
    recentJobs: jobsRes.data?.slice(0, 5) || [],
    recentApplications: totalApplications.slice(0, 5)
  }
}

export default function ManagerDashboard() {
  const { data, mutate } = useSWR('manager-dashboard', fetcher, { refreshInterval: 5000 })
  const router = useRouter()

  useEffect(() => {
    if (data?.jobs?.[0]) {
      const channel = realtimeEngine.subscribeToSubmissions(data.jobs[0].id, () => {
        toast.success('🔔 New application received!')
        mutate()
      })
      return () => channel.unsubscribe()
    }
  }, [data?.jobs, mutate])

  return (
    <div className="relative">
      <DynamicBackground page="dashboard" />
      <CommandPalette />
      
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Hiring Dashboard</h1>
          <p className="text-gray-600">Real-time recruitment analytics and management</p>
        </div>
        <div className="flex gap-3 items-center">
          <RealtimeNotifications />
          <Link href="/dashboard/manager/jobs/create">
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg flex items-center gap-2 transition">
              <Plus className="w-5 h-5" /> Post New Job
            </button>
          </Link>
        </div>
      </div>

      {/* Key Metrics - Clickable Cards */}
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => router.push('/dashboard/manager/jobs')}
          className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition cursor-pointer border-l-4 border-blue-600">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Briefcase className="w-6 h-6 text-blue-600" />
            </div>
            <span className="text-xs text-blue-600 font-semibold bg-blue-50 px-3 py-1 rounded-full">
              View All →
            </span>
          </div>
          <p className="text-sm text-gray-600 mb-1">Open Positions</p>
          <p className="text-4xl font-bold text-gray-900 mb-2">{data?.openJobs || 0}</p>
          <p className="text-xs text-gray-500">of {data?.totalJobs || 0} total jobs</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          onClick={() => router.push('/dashboard/manager/applications')}
          className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition cursor-pointer border-l-4 border-emerald-600">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-emerald-600" />
            </div>
            <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 px-3 py-1 rounded-full">
              Review →
            </span>
          </div>
          <p className="text-sm text-gray-600 mb-1">Total Applications</p>
          <p className="text-4xl font-bold text-gray-900 mb-2">{data?.totalApplications || 0}</p>
          <p className="text-xs text-gray-500">{data?.pendingReview || 0} pending review</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          onClick={() => router.push('/dashboard/manager/interviews')}
          className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition cursor-pointer border-l-4 border-amber-600">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
              <Clock className="w-6 h-6 text-amber-600" />
            </div>
            <span className="text-xs text-amber-600 font-semibold bg-amber-50 px-3 py-1 rounded-full">
              Schedule →
            </span>
          </div>
          <p className="text-sm text-gray-600 mb-1">Upcoming Interviews</p>
          <p className="text-4xl font-bold text-gray-900 mb-2">{data?.upcomingInterviews || 0}</p>
          <p className="text-xs text-gray-500">this week</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          onClick={() => router.push('/dashboard/manager/agencies')}
          className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition cursor-pointer border-l-4 border-indigo-600">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
              <Building2 className="w-6 h-6 text-indigo-600" />
            </div>
            <span className="text-xs text-indigo-600 font-semibold bg-indigo-50 px-3 py-1 rounded-full">
              Manage →
            </span>
          </div>
          <p className="text-sm text-gray-600 mb-1">Active Agencies</p>
          <p className="text-4xl font-bold text-gray-900 mb-2">{data?.agencies?.length || 0}</p>
          <p className="text-xs text-gray-500">recruiting partners</p>
        </motion.div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Recent Jobs with Agency Assignment */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Recent Jobs</h2>
            <Link href="/dashboard/manager/jobs">
              <button className="text-blue-600 hover:text-blue-700 text-sm font-semibold">
                View All →
              </button>
            </Link>
          </div>

          {data?.recentJobs && data.recentJobs.length > 0 ? (
            <div className="space-y-4">
              {data.recentJobs.map((job: any, i: number) => (
                <JobCard key={job.id} job={job} agencies={data.agencies} mutate={mutate} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Briefcase className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="mb-4">No jobs posted yet</p>
              <Link href="/dashboard/manager/jobs/create">
                <button className="btn-primary">Post Your First Job</button>
              </Link>
            </div>
          )}
        </div>

        {/* Recent Applications */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Recent Applications</h2>
            <Link href="/dashboard/manager/applications">
              <button className="text-emerald-600 hover:text-emerald-700 text-sm font-semibold">
                View All →
              </button>
            </Link>
          </div>

          {data?.recentApplications && data.recentApplications.length > 0 ? (
            <div className="space-y-3">
              {data.recentApplications.map((app: any) => (
                <div key={app.id} 
                  onClick={() => router.push(`/dashboard/manager/applications/${app.id}`)}
                  className="p-4 border border-gray-200 rounded-xl hover:border-emerald-400 hover:shadow-md transition cursor-pointer">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-bold text-gray-900">Candidate #{app.id.slice(0, 8)}</p>
                      <p className="text-sm text-gray-600">{app.jobs?.title || 'Position'}</p>
                    </div>
                    <span className={'px-3 py-1 rounded-full text-xs font-semibold ' +
                      (app.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                       app.status === 'screening' ? 'bg-blue-100 text-blue-700' :
                       app.status === 'interview' ? 'bg-indigo-100 text-indigo-700' :
                       'bg-gray-100 text-gray-700')}>
                      {app.status}
                    </span>
                  </div>
                  {app.ai_match_score && (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500" style={{ width: `${app.ai_match_score}%` }} />
                      </div>
                      <span className="text-xs font-semibold text-emerald-600">{app.ai_match_score}%</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p>No applications yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Active Agencies */}
      <div className="mt-8 bg-white rounded-2xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Active Recruitment Agencies</h2>
        
        {data?.agencies && data.agencies.length > 0 ? (
          <div className="grid md:grid-cols-3 gap-4">
            {data.agencies.map((agency: any) => (
              <div key={agency.id} className="p-4 border border-gray-200 rounded-xl hover:border-indigo-400 hover:shadow-md transition">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <UserCheck className="w-6 h-6 text-indigo-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-gray-900">{agency.full_name}</p>
                    <p className="text-sm text-gray-600">{agency.email}</p>
                    {agency.company && (
                      <p className="text-xs text-gray-500 mt-1">{agency.company}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <Building2 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p>No agencies registered yet</p>
          </div>
        )}
      </div>
    </div>
  )
}

// Job Card Component with Agency Assignment
function JobCard({ job, agencies, mutate }: any) {
  const [showAssign, setShowAssign] = useState(false)
  const [selectedAgency, setSelectedAgency] = useState(job.assigned_recruiter_id || '')
  const [assigning, setAssigning] = useState(false)
  const router = useRouter()

  async function handleAssignAgency() {
    if (!selectedAgency) return
    
    setAssigning(true)
    try {
      const supabase = createClient()
      
      const { error } = await supabase
        .from('jobs')
        .update({ assigned_recruiter_id: selectedAgency })
        .eq('id', job.id)
      
      if (error) throw error
      
      // Send notification to agency
      await supabase.from('notifications').insert({
        user_id: selectedAgency,
        type: 'job_assigned',
        title: 'New Job Assignment',
        message: `You've been assigned to recruit for ${job.title}`
      })
      
      toast.success('✅ Agency assigned and notified!')
      setShowAssign(false)
      mutate()
    } catch (error) {
      toast.error('Failed to assign agency')
    } finally {
      setAssigning(false)
    }
  }

  return (
    <div className="p-4 border border-gray-200 rounded-xl hover:border-blue-400 hover:shadow-md transition">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1 cursor-pointer" onClick={() => router.push(`/dashboard/manager/jobs/${job.id}`)}>
          <p className="font-bold text-gray-900 text-lg">{job.title}</p>
          <p className="text-sm text-gray-600">{job.location}</p>
        </div>
        <span className={'px-3 py-1 rounded-full text-xs font-semibold ' +
          (job.status === 'open' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-700')}>
          {job.status}
        </span>
      </div>

      {job.assigned_recruiter_id ? (
        <div className="flex items-center gap-2 text-sm text-indigo-700 bg-indigo-50 px-3 py-2 rounded-lg">
          <UserCheck className="w-4 h-4" />
          <span>Agency assigned</span>
        </div>
      ) : showAssign ? (
        <div className="space-y-2">
          <select
            value={selectedAgency}
            onChange={(e) => setSelectedAgency(e.target.value)}
            className="input text-sm">
            <option value="">Select agency...</option>
            {agencies?.map((agency: any) => (
              <option key={agency.id} value={agency.id}>
                {agency.full_name} - {agency.email}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <button onClick={handleAssignAgency} disabled={assigning} className="btn-primary text-sm flex-1">
              {assigning ? 'Assigning...' : 'Assign'}
            </button>
            <button onClick={() => setShowAssign(false)} className="btn-secondary text-sm">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowAssign(true)} className="text-sm text-blue-600 hover:text-blue-700 font-semibold">
          + Assign Agency
        </button>
      )}
    </div>
  )
}
ENDFILE

echo ""
echo "✅ Professional Manager Dashboard Created!"
echo ""
echo "Features:"
echo "✓ Real-time data refresh every 5 seconds"
echo "✓ All cards clickable with drill-down"
echo "✓ Professional blue/emerald/amber/indigo color scheme"
echo "✓ Live agency list from database"
echo "✓ Inline agency assignment per job"
echo "✓ Real-time notifications"
echo "✓ Command Palette (⌘K)"
echo ""
echo "Run: npm run dev"
