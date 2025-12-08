'use client'
import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'
import { Briefcase, Users, TrendingUp, MapPin, DollarSign, Calendar, Loader2, Building2, CheckCircle } from 'lucide-react'
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
  
  // Get agency assignments for each job
  const { data: proposals } = await supabase
    .from('commission_proposals')
    .select(`
      *,
      profiles!commission_proposals_agency_id_fkey(*)
    `)
    .eq('manager_id', user?.id || '')
  
  // Map agencies to jobs
  const jobsWithAgencies = jobs?.map(job => ({
    ...job,
    agencies: proposals?.filter(p => p.job_id === job.id) || []
  })) || []
  
  return jobsWithAgencies
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
            const assignedAgencies = job.agencies || []
            const acceptedAgencies = assignedAgencies.filter((a: any) => a.status === 'accepted')
            const pendingAgencies = assignedAgencies.filter((a: any) => a.status === 'pending')
            
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

                {/* Assigned Agencies Section */}
                {assignedAgencies.length > 0 && (
                  <div className="mb-4 p-4 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl border-2 border-indigo-200">
                    <div className="flex items-center gap-2 mb-3">
                      <Building2 className="w-5 h-5 text-indigo-600" />
                      <h4 className="font-bold text-indigo-900">
                        Assigned Agencies ({assignedAgencies.length})
                      </h4>
                    </div>
                    <div className="space-y-2">
                      {assignedAgencies.map((assignment: any) => (
                        <div key={assignment.id} className="flex items-center justify-between bg-white rounded-lg p-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-full flex items-center justify-center">
                              <Building2 className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900 text-sm">
                                {assignment.profiles?.full_name}
                              </p>
                              <p className="text-xs text-gray-600">
                                {assignment.profiles?.company}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-emerald-600">
                              {assignment.agreed_percentage || assignment.manager_percentage}%
                            </span>
                            <div className={'px-3 py-1 rounded-full text-xs font-bold ' +
                              (assignment.status === 'accepted' ? 'bg-emerald-100 text-emerald-700' :
                               assignment.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                               'bg-blue-100 text-blue-700')}>
                              {assignment.status === 'accepted' && <CheckCircle className="w-3 h-3 inline mr-1" />}
                              {assignment.status}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {pendingAgencies.length > 0 && (
                      <p className="text-xs text-amber-700 mt-2 font-semibold">
                        ⏳ {pendingAgencies.length} pending response
                      </p>
                    )}
                  </div>
                )}

                {assignedAgencies.length === 0 && (
                  <div className="mb-4 p-4 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 text-center">
                    <Building2 className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600 font-semibold">No agencies assigned yet</p>
                    <Link href="/dashboard/manager/agencies" onClick={(e) => e.stopPropagation()}>
                      <button className="text-xs text-blue-600 hover:underline mt-1">
                        Assign an agency →
                      </button>
                    </Link>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center p-3 bg-blue-50 rounded-xl">
                    <Users className="w-6 h-6 text-blue-600 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-blue-600">{applicationCount}</p>
                    <p className="text-xs text-gray-600">Applications</p>
                  </div>
                  <div className="text-center p-3 bg-indigo-50 rounded-xl">
                    <Building2 className="w-6 h-6 text-indigo-600 mx-auto mb-1" />
                    <p className="text-2xl font-bold text-indigo-600">{acceptedAgencies.length}</p>
                    <p className="text-xs text-gray-600">Active Agencies</p>
                  </div>
                  <div className="text-center p-3 bg-amber-50 rounded-xl">
                    <Calendar className="w-6 h-6 text-amber-600 mx-auto mb-1" />
                    <p className="text-sm font-bold text-amber-600">
                      {new Date(job.created_at).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-gray-600">Posted</p>
                  </div>
                </div>

                <button className="w-full btn-primary text-sm">
                  View Applications & Details →
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
