'use client'

import { useState, useEffect } from 'react'
import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'
import {
  Briefcase,
  Users,
  TrendingUp,
  Clock,
  Plus,
  Building2,
  UserCheck,
  CheckCircle,
  AlertCircle,
} from 'lucide-react'
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
  
  // ✅ FIXED: Use getSession() - more reliable than getUser()
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  
  if (sessionError || !session?.user?.id) {
    console.error('❌ No session:', sessionError)
    return {
      jobs: [],
      openJobs: 0,
      totalJobs: 0,
      totalApplications: 0,
      pendingReview: 0,
      upcomingInterviews: 0,
      recentJobs: [],
      recentApplications: [],
      pendingProposals: [],
      acceptedAssignments: [],
      agencies: [],
      agencyCount: 0,
    }
  }

  const managerId = session.user.id
  console.log('✅ Dashboard fetching for manager:', managerId)

  const [jobsRes, applicationsRes, interviewsRes, proposalsRes, agenciesRes] = await Promise.all([
    // ✅ Jobs by manager_id
    supabase
      .from('jobs')
      .select('*')
      .eq('manager_id', managerId)
      .order('created_at', { ascending: false }),

    // ✅ Applications
    supabase
      .from('applications')
      .select('*, jobs!inner(manager_id)')
      .eq('jobs.manager_id', managerId),

    // ✅ Interviews
    supabase
      .from('interviews')
      .select('*, applications!inner(*, jobs!inner(manager_id))')
      .eq('applications.jobs.manager_id', managerId),

    // ✅ FIXED: commissionproposals table + managerid column
    supabase
      .from('commissionproposals')
      .select(`
        *,
        jobs(*),
        profiles!commissionproposals_agencyid_fkey(id, full_name, company, email)
      `)
      .eq('managerid', managerId),

    // ✅ FIXED: AGENCIES = profiles.role='agency' (NOT manager)
    supabase
      .from('profiles')
      .select('id, full_name, company, email, created_at')
      .eq('role', 'agency')
      .order('created_at', { ascending: false }),
  ])

  const jobs = jobsRes.data || []
  const openJobs = jobs.filter((j: any) => j.status === 'open').length
  const totalApplications = applicationsRes.data || []
  const pendingReview = totalApplications.filter((a: any) => a.status === 'pending')
  const upcomingInterviews = interviewsRes.data?.filter((i: any) => {
    const interviewDate = new Date(i.scheduled_at)
    const now = new Date()
    return interviewDate > now
  }) || []

  const proposals = proposalsRes.data || []
  const pendingProposals = proposals.filter((p: any) => p.status === 'pending') || []
  const acceptedAssignments = proposals.filter((p: any) => p.status === 'accepted') || []
  const agencies = agenciesRes.data || []

  console.log('✅ Dashboard stats:', {
    jobs: jobs.length,
    agencies: agencies.length,
    proposals: proposals.length,
    pendingProposals: pendingProposals.length,
  })

  return {
    jobs,
    openJobs,
    totalJobs: jobs.length,
    totalApplications: totalApplications.length,
    pendingReview: pendingReview.length,
    upcomingInterviews: upcomingInterviews.length,
    recentJobs: jobs.slice(0, 5),
    recentApplications: totalApplications.slice(0, 5),
    pendingProposals,
    acceptedAssignments,
    agencies,
    agencyCount: agencies.length,
  }
}

export default function ManagerDashboard() {
  const { data, mutate } = useSWR('manager-dashboard', fetcher, { 
    refreshInterval: 5000,
    revalidateOnFocus: true,
  })
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
      
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Hiring Dashboard</h1>
          <p className="text-gray-600">Real-time recruitment analytics and management</p>
        </div>
        <div className="flex gap-3 items-center">
          <RealtimeNotifications />
          <Link href="/dashboard/manager/jobs/create">
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg flex items-center gap-2 transition-all">
              <Plus className="w-5 h-5" /> Post New Job
            </button>
          </Link>
        </div>
      </div>

      {/* ✅ NEW: No Agencies Alert */}
      {data?.agencyCount === 0 && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-2xl p-6 mb-8 shadow-xl border-l-4 border-white"
        >
          <div className="flex items-center gap-4">
            <Building2 className="w-12 h-12 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-xl font-bold mb-1">No Partner Agencies Yet</h3>
              <p className="mb-2">
                Register agencies to assign job postings. Share this link with partners:
              </p>
              <code className="bg-white/20 px-3 py-1 rounded-lg font-mono text-sm">
                yourdomain.com/auth/register/agency
              </code>
            </div>
            <Link href="/dashboard/manager/agencies">
              <button className="bg-white text-indigo-600 px-6 py-3 rounded-xl font-bold hover:bg-indigo-50 transition-all shadow-lg">
                Manage Agencies →
              </button>
            </Link>
          </div>
        </motion.div>
      )}

      {/* Pending Proposals Alert */}
      {data?.pendingProposals?.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-2xl p-6 mb-8 shadow-xl border-l-4 border-white"
        >
          <div className="flex items-center gap-4">
            <AlertCircle className="w-12 h-12 flex-shrink-0 animate-pulse" />
            <div className="flex-1">
              <h3 className="text-xl font-bold mb-1">
                Action Required: {data.pendingProposals.length} Agency Response
                {data.pendingProposals.length !== 1 ? 's' : ''}
              </h3>
              <p className="text-amber-100">Agencies have responded to your job assignments</p>
            </div>
            <Link href="/dashboard/manager/agencies">
              <button className="bg-white text-amber-600 px-6 py-3 rounded-xl font-bold hover:bg-amber-50 transition-all shadow-lg">
                Review Now →
              </button>
            </Link>
          </div>
        </motion.div>
      )}

      {/* Key Metrics */}
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        {/* Open Jobs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => router.push('/dashboard/manager/jobs')}
          className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all cursor-pointer border-l-4 border-blue-600 group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition">
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

        {/* Applications */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          onClick={() => router.push('/dashboard/manager/applications')}
          className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all cursor-pointer border-l-4 border-emerald-600 group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition">
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

        {/* Interviews */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          onClick={() => router.push('/dashboard/manager/interviews')}
          className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all cursor-pointer border-l-4 border-amber-600 group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition">
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

        {/* ✅ FIXED: AGENCIES metric */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          onClick={() => router.push('/dashboard/manager/agencies')}
          className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all cursor-pointer border-l-4 border-indigo-600 group"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center group-hover:scale-110 transition">
              <Building2 className="w-6 h-6 text-indigo-600" />
            </div>
            <span className="text-xs text-indigo-600 font-semibold bg-indigo-50 px-3 py-1 rounded-full">
              Manage →
            </span>
          </div>
          <p className="text-sm text-gray-600 mb-1">Partner Agencies</p>
          <p className="text-4xl font-bold text-gray-900 mb-2">{data?.agencyCount || 0}</p>
          <p className="text-xs text-gray-500">
            {data?.pendingProposals?.length || 0} proposals pending
          </p>
        </motion.div>
      </div>

      {/* ✅ NEW: Active Agency Assignments */}
      {data?.acceptedAssignments?.length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-gray-200">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Building2 className="w-7 h-7 text-indigo-600" />
            Active Agency Assignments ({data.acceptedAssignments.length})
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.acceptedAssignments.slice(0, 6).map((assignment: any) => (
              <motion.div
                key={assignment.id}
                whileHover={{ scale: 1.02 }}
                className="p-4 border-2 border-indigo-200 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl group hover:shadow-md transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-5 h-5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-gray-900 truncate">{assignment.profiles?.full_name || 'Agency'}</p>
                      <p className="text-sm text-gray-600 truncate">{assignment.jobs?.title || 'Job'}</p>
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                      <span className="text-lg font-bold text-emerald-600">
                        {assignment.managerpercentage || 0}%
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">Commission</p>
                  </div>
                </div>
              </motion.div>
            ))}
            {data.acceptedAssignments.length > 6 && (
              <div className="col-span-full text-center py-8 text-gray-500">
                <Link href="/dashboard/manager/agencies" className="text-indigo-600 hover:text-indigo-700 font-semibold">
                  +{data.acceptedAssignments.length - 6} more assignments →
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Recent Jobs */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-blue-600" />
            Recent Jobs
          </h2>
          <div className="space-y-3">
            {data?.recentJobs?.length ? (
              data.recentJobs.map((job: any) => (
                <Link
                  key={job.id}
                  href={`/dashboard/manager/jobs/${job.id}`}
                  className="block p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900 truncate group-hover:text-blue-600">
                        {job.title}
                      </h3>
                      <p className="text-sm text-gray-600 truncate">{job.location}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {job.status} • {new Date(job.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="ml-3 flex-shrink-0">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                          job.status === 'open'
                            ? 'bg-emerald-100 text-emerald-800'
                            : job.status === 'filled'
                            ? 'bg-gray-100 text-gray-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {job.status}
                      </span>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="text-center py-12 text-gray-500">
                <Briefcase className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p>No jobs posted yet</p>
                <Link href="/dashboard/manager/jobs/create" className="text-blue-600 hover:underline mt-2 block">
                  Create your first job →
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Recent Applications */}
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Users className="w-6 h-6 text-emerald-600" />
            Recent Applications
          </h2>
          <div className="space-y-3">
            {data?.recentApplications?.length ? (
              data.recentApplications.map((app: any) => (
                <Link
                  key={app.id}
                  href={`/dashboard/manager/applications/${app.id}`}
                  className="block p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-all group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900 truncate">{app.candidate_name}</h3>
                      <p className="text-sm text-gray-600 truncate">{app.jobs?.title}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {app.status} • {new Date(app.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="ml-3 flex-shrink-0">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                          app.status === 'pending'
                            ? 'bg-amber-100 text-amber-800'
                            : app.status === 'shortlisted'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {app.status}
                      </span>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="text-center py-12 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p>No applications yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
