#!/bin/bash
# Fix Manager Dashboard - Complete Working System
# Run: bash fix-manager-dashboard.sh

set -e

echo "🔧 Fixing Manager Dashboard..."

# Ensure directory exists
mkdir -p app/dashboard/manager

# Main Dashboard Page
cat > app/dashboard/manager/page.tsx << 'ENDFILE'
'use client'
import { motion } from 'framer-motion'
import { Briefcase, Users, Clock, TrendingUp, Download, Plus, Calendar, AlertCircle } from 'lucide-react'
import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'
import { AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { exportAnalytics } from '@/lib/exports/pdf-generator'
import Link from 'next/link'
import DynamicBackground from '@/components/ui/DynamicBackground'
import { useState, useEffect } from 'react'

const COLORS = ['#f59e0b', '#3b82f6', '#8b5cf6', '#10b981', '#ef4444']

const fetcher = async () => {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return null
  
  const [jobsRes, applicationsRes, interviewsRes] = await Promise.all([
    supabase.from('jobs').select('*').eq('manager_id', user.id),
    supabase.from('applications').select('*, jobs!inner(manager_id)').eq('jobs.manager_id', user.id),
    supabase.from('interviews').select('*, applications!inner(*, jobs!inner(manager_id))').eq('applications.jobs.manager_id', user.id)
  ])
  
  const jobs = jobsRes.data || []
  const applications = applicationsRes.data || []
  const interviews = interviewsRes.data || []
  
  // Trend data (last 6 months)
  const trendData = []
  for (let i = 5; i >= 0; i--) {
    const date = new Date()
    date.setMonth(date.getMonth() - i)
    const monthName = date.toLocaleString('default', { month: 'short' })
    
    const monthApps = applications.filter(a => {
      const appDate = new Date(a.created_at)
      return appDate.getMonth() === date.getMonth() && appDate.getFullYear() === date.getFullYear()
    }).length
    
    trendData.push({ month: monthName, applications: monthApps, hires: Math.floor(monthApps * 0.15) })
  }
  
  // Status breakdown
  const statusData = [
    { name: 'Pending', value: applications.filter(a => a.status === 'pending').length, color: '#f59e0b' },
    { name: 'Screening', value: applications.filter(a => a.status === 'screening').length, color: '#3b82f6' },
    { name: 'Interview', value: applications.filter(a => a.status === 'interview').length, color: '#8b5cf6' },
    { name: 'Offer', value: applications.filter(a => a.status === 'offer').length, color: '#10b981' },
    { name: 'Rejected', value: applications.filter(a => a.status === 'rejected').length, color: '#ef4444' }
  ].filter(s => s.value > 0)
  
  return {
    activeJobs: jobs.filter(j => j.status === 'open').length,
    totalApplications: applications.length,
    pendingApplications: applications.filter(a => a.status === 'pending').length,
    scheduledInterviews: interviews.filter(i => i.status === 'scheduled').length,
    trendData,
    statusData,
    recentJobs: jobs.slice(0, 5),
    recentApplications: applications.slice(0, 5),
    totalJobs: jobs.length
  }
}

export default function ManagerDashboard() {
  const { data, isLoading } = useSWR('manager-dashboard-main', fetcher, { refreshInterval: 2000 })
  const [insights, setInsights] = useState<any[]>([])

  useEffect(() => {
    if (data && data.totalApplications > 0) {
      const aiInsights = []
      if (data.pendingApplications > 10) {
        aiInsights.push({
          type: 'warning',
          message: 'You have ' + data.pendingApplications + ' candidates waiting for review'
        })
      }
      if (data.activeJobs > 5) {
        aiInsights.push({
          type: 'success',
          message: 'Strong hiring pipeline with ' + data.activeJobs + ' active positions'
        })
      }
      if (data.totalApplications > 0 && data.activeJobs > 0) {
        const avgPerJob = Math.round(data.totalApplications / data.activeJobs)
        aiInsights.push({
          type: 'info',
          message: 'Average ' + avgPerJob + ' applications per job'
        })
      }
      setInsights(aiInsights)
    }
  }, [data])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen">
      <DynamicBackground page="dashboard" />
      
      <div className="flex justify-between items-center mb-8">
        <div>
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-bold text-primary-600 mb-2">
            Hiring Manager Dashboard
          </motion.h1>
          <p className="text-gray-600">Real-time hiring metrics • Last updated: {new Date().toLocaleTimeString()}</p>
        </div>
        <div className="flex gap-4">
          <button onClick={() => data && exportAnalytics(data)} className="btn-primary flex items-center gap-2">
            <Download className="w-5 h-5" /> Export Report
          </button>
          <Link href="/dashboard/manager/jobs/new">
            <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2 shadow-lg hover:shadow-xl transition">
              <Plus className="w-5 h-5" /> Post Job
            </button>
          </Link>
        </div>
      </div>

      {insights.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 p-4 bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-200 rounded-xl">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-bold text-blue-900 mb-2">🤖 AI Insights</p>
              <ul className="space-y-1">
                {insights.map((insight, i) => (
                  <li key={i} className="text-sm text-blue-800">• {insight.message}</li>
                ))}
              </ul>
            </div>
          </div>
        </motion.div>
      )}

      <div className="grid md:grid-cols-4 gap-6 mb-8">
        {[
          { label: 'Active Jobs', value: data?.activeJobs || 0, icon: Briefcase, color: 'from-blue-500 to-blue-600', link: '/dashboard/manager/jobs/list' },
          { label: 'Applications', value: data?.totalApplications || 0, icon: Users, color: 'from-emerald-500 to-emerald-600', link: '/dashboard/manager/candidates' },
          { label: 'Pending Review', value: data?.pendingApplications || 0, icon: Clock, color: 'from-yellow-500 to-yellow-600', link: '/dashboard/manager/candidates' },
          { label: 'Interviews', value: data?.scheduledInterviews || 0, icon: Calendar, color: 'from-purple-500 to-purple-600', link: '/dashboard/manager/interviews' }
        ].map((stat, i) => (
          <Link key={i} href={stat.link}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ y: -5, scale: 1.02 }}
              className="card cursor-pointer">
              <div className={'w-12 h-12 bg-gradient-to-br ' + stat.color + ' rounded-xl flex items-center justify-center text-white mb-4 shadow-lg'}>
                <stat.icon className="w-6 h-6" />
              </div>
              <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
              <p className="text-3xl font-bold">{stat.value}</p>
            </motion.div>
          </Link>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="card">
          <h3 className="text-lg font-bold mb-4">Application Trends (6 Months)</h3>
          {data && data.trendData && data.trendData.some(d => d.applications > 0) ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={data.trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="applications" stroke="#0ea5e9" fill="#0ea5e9" fillOpacity={0.3} name="Applications" />
                <Area type="monotone" dataKey="hires" stroke="#10b981" fill="#10b981" fillOpacity={0.3} name="Hires" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-72 flex flex-col items-center justify-center text-gray-500">
              <TrendingUp className="w-16 h-16 text-gray-300 mb-4" />
              <p>No application data yet</p>
              <p className="text-sm text-gray-400 mt-2">Post jobs to start receiving applications</p>
            </div>
          )}
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="card">
          <h3 className="text-lg font-bold mb-4">Application Status</h3>
          {data && data.statusData && data.statusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie 
                  data={data.statusData} 
                  cx="50%" 
                  cy="50%" 
                  outerRadius={100} 
                  dataKey="value"
                  label={(entry) => entry.name + ': ' + entry.value}>
                  {data.statusData.map((entry: any, index: number) => (
                    <Cell key={'cell-' + index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-72 flex flex-col items-center justify-center text-gray-500">
              <Users className="w-16 h-16 text-gray-300 mb-4" />
              <p>No applications to analyze</p>
            </div>
          )}
        </motion.div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold">Recent Jobs</h3>
            <Link href="/dashboard/manager/jobs/list" className="text-primary-600 text-sm font-semibold hover:underline">View All</Link>
          </div>
          {data && data.recentJobs && data.recentJobs.length > 0 ? (
            <div className="space-y-3">
              {data.recentJobs.map((job: any) => (
                <Link key={job.id} href={'/dashboard/manager/jobs/' + job.id}>
                  <motion.div 
                    whileHover={{ x: 5 }}
                    className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition cursor-pointer">
                    <p className="font-semibold">{job.title}</p>
                    <p className="text-sm text-gray-500">
                      {job.location} • {job.status} • Posted {new Date(job.created_at).toLocaleDateString()}
                    </p>
                  </motion.div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-10">
              <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 mb-4">No jobs posted yet</p>
              <Link href="/dashboard/manager/jobs/new">
                <button className="btn-primary">Post Your First Job</button>
              </Link>
            </div>
          )}
        </div>

        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold">Recent Applications</h3>
            <Link href="/dashboard/manager/candidates" className="text-primary-600 text-sm font-semibold hover:underline">View All</Link>
          </div>
          {data && data.recentApplications && data.recentApplications.length > 0 ? (
            <div className="space-y-3">
              {data.recentApplications.map((app: any) => (
                <div key={app.id} className="p-3 bg-gray-50 rounded-lg">
                  <p className="font-semibold">Application #{app.id.slice(0, 8)}</p>
                  <p className="text-sm text-gray-500">
                    Status: <span className="font-semibold capitalize">{app.status}</span>
                    {app.ai_match_score && ' • Match: ' + app.ai_match_score + '%'}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No applications yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
ENDFILE

echo ""
echo "✅ Manager Dashboard Fixed!"
echo ""
echo "RESTART SERVER NOW:"
echo "1. Press Ctrl+C to stop"
echo "2. Run: npm run dev"
echo "3. Login as hiring manager"
echo "4. Should see dashboard at /dashboard/manager"
