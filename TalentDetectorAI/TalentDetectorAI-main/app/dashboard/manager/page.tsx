'use client'
import { useState, useEffect } from 'react'
import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'
import { Briefcase, Users, TrendingUp, Clock, Plus, Building2, UserCheck, CheckCircle, AlertCircle } from 'lucide-react'
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
  
  const [jobsRes, applicationsRes, interviewsRes, proposalsRes] = await Promise.all([
    supabase.from('jobs').select('*').eq('manager_id', user?.id || '').order('created_at', { ascending: false }),
    supabase.from('applications').select('*, jobs!inner(manager_id)').eq('jobs.manager_id', user?.id || ''),
    supabase.from('interviews').select('*, applications!inner(*, jobs!inner(manager_id))').eq('applications.jobs.manager_id', user?.id || ''),
    supabase.from('commission_proposals').select('*, jobs(*), profiles!commission_proposals_agency_id_fkey(*)').eq('manager_id', user?.id || '')
  ])
  
  const openJobs = jobsRes.data?.filter(j => j.status === 'open') || []
  const totalApplications = applicationsRes.data || []
  const pendingReview = totalApplications.filter(a => a.status === 'pending')
  const upcomingInterviews = interviewsRes.data?.filter(i => {
    const interviewDate = new Date(i.scheduled_at)
    const now = new Date()
    return interviewDate > now
  }) || []
  
  const pendingProposals = proposalsRes.data?.filter(p => p.status === 'pending' || p.status === 'counter_proposed') || []
  const acceptedAssignments = proposalsRes.data?.filter(p => p.status === 'accepted') || []
  
  return {
    jobs: jobsRes.data || [],
    openJobs: openJobs.length,
    totalJobs: jobsRes.data?.length || 0,
    totalApplications: totalApplications.length,
    pendingReview: pendingReview.length,
    upcomingInterviews: upcomingInterviews.length,
    recentJobs: jobsRes.data?.slice(0, 5) || [],
    recentApplications: totalApplications.slice(0, 5),
    pendingProposals,
    acceptedAssignments
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

      {/* Pending Actions Alert */}
      {data && data.pendingProposals.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-2xl p-6 mb-8 shadow-xl">
          <div className="flex items-center gap-4">
            <AlertCircle className="w-12 h-12" />
            <div className="flex-1">
              <h3 className="text-xl font-bold mb-1">
                Action Required: {data.pendingProposals.length} Agency Response{data.pendingProposals.length !== 1 ? 's' : ''}
              </h3>
              <p className="text-amber-100">Agencies have responded to your job assignments</p>
            </div>
            <Link href="/dashboard/manager/agencies">
              <button className="bg-white text-amber-600 px-6 py-3 rounded-xl font-bold hover:bg-amber-50 transition">
                Review Now →
              </button>
            </Link>
          </div>
        </motion.div>
      )}

      {/* Key Metrics */}
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          onClick={() => router.push('/dashboard/manager/jobs')}
          className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition cursor-pointer border-l-4 border-blue-600">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Briefcase className="w-6 h-6 text-blue-600" />
            </div>
            <span className="text-xs text-blue-600 font-semibold bg-blue-50 px-3 py-1 rounded-full">View All →</span>
          </div>
          <p className="text-sm text-gray-600 mb-1">Open Positions</p>
          <p className="text-4xl font-bold text-gray-900 mb-2">{data?.openJobs || 0}</p>
          <p className="text-xs text-gray-500">of {data?.totalJobs || 0} total jobs</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          onClick={() => router.push('/dashboard/manager/applications')}
          className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition cursor-pointer border-l-4 border-emerald-600">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-emerald-600" />
            </div>
            <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 px-3 py-1 rounded-full">Review →</span>
          </div>
          <p className="text-sm text-gray-600 mb-1">Total Applications</p>
          <p className="text-4xl font-bold text-gray-900 mb-2">{data?.totalApplications || 0}</p>
          <p className="text-xs text-gray-500">{data?.pendingReview || 0} pending review</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          onClick={() => router.push('/dashboard/manager/interviews')}
          className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition cursor-pointer border-l-4 border-amber-600">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
              <Clock className="w-6 h-6 text-amber-600" />
            </div>
            <span className="text-xs text-amber-600 font-semibold bg-amber-50 px-3 py-1 rounded-full">Schedule →</span>
          </div>
          <p className="text-sm text-gray-600 mb-1">Upcoming Interviews</p>
          <p className="text-4xl font-bold text-gray-900 mb-2">{data?.upcomingInterviews || 0}</p>
          <p className="text-xs text-gray-500">this week</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          onClick={() => router.push('/dashboard/manager/agencies')}
          className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition cursor-pointer border-l-4 border-indigo-600">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">
              <Building2 className="w-6 h-6 text-indigo-600" />
            </div>
            <span className="text-xs text-indigo-600 font-semibold bg-indigo-50 px-3 py-1 rounded-full">Manage →</span>
          </div>
          <p className="text-sm text-gray-600 mb-1">Active Assignments</p>
          <p className="text-4xl font-bold text-gray-900 mb-2">{data?.acceptedAssignments?.length || 0}</p>
          <p className="text-xs text-gray-500">{data?.pendingProposals?.length || 0} pending</p>
        </motion.div>
      </div>

      {/* Agency Assignments Summary */}
      {data?.acceptedAssignments && data.acceptedAssignments.length > 0 && (
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Building2 className="w-7 h-7 text-indigo-600" />
            Active Agency Assignments ({data.acceptedAssignments.length})
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {data.acceptedAssignments.map((assignment: any) => (
              <div key={assignment.id} className="p-4 border-2 border-indigo-200 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-full flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">{assignment.profiles?.full_name}</p>
                      <p className="text-sm text-gray-600">{assignment.jobs?.title}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                      <span className="text-xl font-bold text-emerald-600">
                        {assignment.agreed_percentage}%
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">Commission</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
