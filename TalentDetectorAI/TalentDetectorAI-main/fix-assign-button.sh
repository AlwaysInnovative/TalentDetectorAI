#!/bin/bash
# Fix Assign Agencies Button Visibility
# Run: bash fix-assign-button.sh

set -e

echo "🔧 Making Assign Agencies Button Visible..."

# ==================== FIX JOB DETAILS PAGE WITH PROMINENT BUTTON ====================

cat > 'app/dashboard/manager/jobs/[id]/page.tsx' << 'ENDFILE'
'use client'
import { useParams } from 'next/navigation'
import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { ArrowLeft, Users, Download, Edit, Building, CheckCircle, Eye, FileText, Calendar } from 'lucide-react'
import DynamicBackground from '@/components/ui/DynamicBackground'
import { exportJobReport } from '@/lib/exports/pdf-generator'
import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import toast from 'react-hot-toast'

const fetcher = async (jobId: string) => {
  const supabase = createClient()
  
  const [jobRes, applicationsRes, agencyAssignmentsRes] = await Promise.all([
    supabase.from('jobs').select('*').eq('id', jobId).single(),
    supabase.from('applications').select('*, candidates(*), agencies:agency_id(*)').eq('job_id', jobId),
    supabase.from('agency_assignments').select('*').eq('job_id', jobId).eq('status', 'active')
  ])
  
  return { 
    job: jobRes.data, 
    applications: applicationsRes.data || [],
    agencyAssignments: agencyAssignmentsRes.data || []
  }
}

export default function JobDetails() {
  const params = useParams()
  const id = params.id as string
  const { data, mutate } = useSWR('job-' + id, () => fetcher(id), { refreshInterval: 2000 })
  const [updatingStatus, setUpdatingStatus] = useState(false)

  async function updateJobStatus(newStatus: string) {
    setUpdatingStatus(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from('jobs').update({ status: newStatus }).eq('id', id)
      
      if (error) throw error
      
      toast.success('Status updated to: ' + newStatus)
      mutate()
    } catch (error) {
      toast.error('Failed to update status')
    } finally {
      setUpdatingStatus(false)
    }
  }

  if (!data) return <div className="flex items-center justify-center h-screen">
    <motion.div 
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      className="w-16 h-16 border-4 border-primary-600 border-t-transparent rounded-full" />
  </div>

  if (!data.job) return <div className="p-8">Job not found</div>

  const statusColor = {
    draft: 'gray',
    open: 'emerald',
    closed: 'red',
    filled: 'blue',
    withdrawn: 'orange'
  }[data.job.status as string] || 'gray'

  return (
    <div className="relative">
      <DynamicBackground page="jobs" />
      
      <Link href="/dashboard/manager/jobs/list">
        <button className="flex items-center gap-2 mb-6 hover:text-primary-600 transition">
          <ArrowLeft className="w-5 h-5" /> Back to Jobs
        </button>
      </Link>

      {/* Header with Action Buttons */}
      <div className="card mb-6">
        <div className="flex justify-between items-start mb-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold">{data.job.title}</h1>
              <span className={'px-3 py-1 rounded-full text-xs font-semibold bg-' + statusColor + '-100 text-' + statusColor + '-700'}>
                {data.job.status}
              </span>
            </div>
            <p className="text-gray-600">Posted {new Date(data.job.created_at).toLocaleDateString()}</p>
          </div>
        </div>

        {/* PRIMARY ACTION BUTTONS - LARGE AND VISIBLE */}
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <Link href={'/dashboard/manager/jobs/' + id + '/agencies'}>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 rounded-xl font-bold text-lg shadow-2xl hover:shadow-blue-500/50 flex items-center justify-center gap-3 transition-all">
              <Building className="w-6 h-6" />
              Assign Agencies
              {data.agencyAssignments.length > 0 && (
                <span className="px-2 py-1 bg-white text-blue-600 rounded-full text-sm font-bold">
                  {data.agencyAssignments.length}
                </span>
              )}
            </motion.button>
          </Link>

          <Link href={'/dashboard/manager/jobs/' + id + '/candidates'}>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 text-white px-6 py-4 rounded-xl font-bold text-lg shadow-2xl hover:shadow-emerald-500/50 flex items-center justify-center gap-3 transition-all">
              <Users className="w-6 h-6" />
              View Candidates
              {data.applications.length > 0 && (
                <span className="px-2 py-1 bg-white text-emerald-600 rounded-full text-sm font-bold">
                  {data.applications.length}
                </span>
              )}
            </motion.button>
          </Link>

          <Link href={'/dashboard/manager/jobs/' + id + '/summary'}>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-full bg-gradient-to-r from-purple-600 to-purple-700 text-white px-6 py-4 rounded-xl font-bold text-lg shadow-2xl hover:shadow-purple-500/50 flex items-center justify-center gap-3 transition-all">
              <FileText className="w-6 h-6" />
              AI Summary
            </motion.button>
          </Link>
        </div>

        {/* Agency Status Banner */}
        {data.agencyAssignments.length > 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-gradient-to-r from-blue-50 to-emerald-50 rounded-xl border-2 border-blue-200">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-emerald-600" />
              <div className="flex-1">
                <p className="font-bold text-emerald-900">
                  {data.agencyAssignments.length} {data.agencyAssignments.length === 1 ? 'Agency' : 'Agencies'} Assigned
                </p>
                <p className="text-sm text-gray-700">
                  Recruitment partners are actively sourcing candidates for this position
                </p>
              </div>
              <Link href={'/dashboard/manager/jobs/' + id + '/agencies'}>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700">
                  Manage
                </button>
              </Link>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl border-2 border-yellow-300">
            <div className="flex items-center gap-3">
              <Building className="w-6 h-6 text-yellow-600" />
              <div className="flex-1">
                <p className="font-bold text-yellow-900">No Agencies Assigned Yet</p>
                <p className="text-sm text-gray-700">
                  Assign recruitment agencies to accelerate candidate sourcing
                </p>
              </div>
              <Link href={'/dashboard/manager/jobs/' + id + '/agencies'}>
                <button className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-bold hover:shadow-lg transition-all flex items-center gap-2">
                  <Building className="w-5 h-5" />
                  Assign Now
                </button>
              </Link>
            </div>
          </motion.div>
        )}

        {/* Secondary Actions */}
        <div className="flex gap-3 mt-4">
          <button onClick={() => exportJobReport(data.job, data.applications)} className="btn-secondary flex items-center gap-2">
            <Download className="w-4 h-4" /> Export Report
          </button>
          <Link href={'/dashboard/manager/jobs/' + id + '/edit'}>
            <button className="btn-secondary flex items-center gap-2">
              <Edit className="w-4 h-4" /> Edit Job
            </button>
          </Link>
          <Link href={'/dashboard/manager/jobs/' + id + '/history'}>
            <button className="btn-secondary flex items-center gap-2">
              <Calendar className="w-4 h-4" /> View History
            </button>
          </Link>
        </div>
      </div>

      {/* Job Details Grid */}
      <div className="grid md:grid-cols-3 gap-6 mb-6">
        <div className="md:col-span-2">
          <div className="card">
            <h2 className="text-2xl font-bold mb-4">Job Details</h2>
            
            <div className="grid md:grid-cols-3 gap-4 mb-6">
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
              {data.job.department && (
                <div className="p-4 bg-purple-50 rounded-xl">
                  <p className="text-sm text-purple-700 mb-1">Department</p>
                  <p className="font-bold text-purple-900">{data.job.department}</p>
                </div>
              )}
            </div>

            <div className="mb-6">
              <h3 className="font-bold mb-2">Description</h3>
              <p className="text-gray-700 whitespace-pre-line">{data.job.description}</p>
            </div>

            {data.job.ai_keywords && data.job.ai_keywords.length > 0 && (
              <div>
                <h3 className="font-bold mb-2">Required Skills</h3>
                <div className="flex flex-wrap gap-2">
                  {data.job.ai_keywords.map((keyword: string, i: number) => (
                    <span key={i} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {/* Interview Stages */}
          {data.job.interview_stages && data.job.interview_stages.length > 0 && (
            <div className="card">
              <h3 className="font-bold mb-4">Interview Process</h3>
              <div className="space-y-2">
                {data.job.interview_stages.map((stage: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                    <div className="w-6 h-6 bg-primary-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{stage.name}</p>
                      <p className="text-xs text-gray-600">{stage.duration} days</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Status Workflow */}
          <div className="card">
            <h3 className="font-bold mb-4">Change Status</h3>
            <div className="space-y-2">
              {['draft', 'open', 'closed', 'filled', 'withdrawn'].map(status => (
                <button
                  key={status}
                  onClick={() => updateJobStatus(status)}
                  disabled={updatingStatus || data.job.status === status}
                  className={'w-full px-4 py-2 rounded-lg font-semibold transition text-left ' +
                    (data.job.status === status ? 
                      'bg-gray-200 text-gray-600 cursor-not-allowed' : 
                      'bg-primary-100 text-primary-700 hover:bg-primary-200')}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Candidates Section */}
      {data.applications.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Users className="w-6 h-6" /> Recent Applications ({data.applications.length})
            </h2>
            <Link href={'/dashboard/manager/jobs/' + id + '/candidates'}>
              <button className="btn-primary">View All</button>
            </Link>
          </div>

          <div className="grid gap-4">
            {data.applications.slice(0, 5).map((app: any) => (
              <div key={app.id} className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition flex justify-between items-center">
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
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
ENDFILE

echo ""
echo "✅ Assign Agencies Button Now HIGHLY VISIBLE!"
echo ""
echo "Changes Made:"
echo "✓ Large prominent button at top of page"
echo "✓ Gradient blue background for visibility"
echo "✓ Shows count of assigned agencies"
echo "✓ Banner showing assignment status"
echo "✓ 'Assign Now' button if no agencies assigned"
echo "✓ Multiple ways to access agency assignment"
echo ""
echo "🚀 RESTART SERVER:"
echo "npm run dev"
echo ""
echo "Navigate to any job and you'll see the large"
echo "'Assign Agencies' button at the top!"
