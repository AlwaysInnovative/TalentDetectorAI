'use client'
import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'
import { Users, Briefcase, Building2, ArrowRight, TrendingUp, Loader2 } from 'lucide-react'
import DynamicBackground from '@/components/ui/DynamicBackground'
import { motion } from 'framer-motion'
import { useState } from 'react'

const fetcher = async () => {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  // Get all jobs by this manager
  const { data: jobs } = await supabase
    .from('jobs')
    .select('*')
    .eq('manager_id', user?.id || '')
  
  // Get all commission proposals (agencies assigned to jobs)
  const { data: proposals } = await supabase
    .from('commission_proposals')
    .select(`
      *,
      jobs(*),
      profiles!commission_proposals_agency_id_fkey(*)
    `)
    .eq('manager_id', user?.id || '')
    .eq('status', 'accepted')
  
  // Get all applications for these jobs
  const jobIds = jobs?.map(j => j.id) || []
  const { data: applications } = await supabase
    .from('applications')
    .select(`
      *,
      jobs(*),
      candidates(*)
    `)
    .in('job_id', jobIds)
  
  // Build the relationship map
  const relationshipMap = jobs?.map(job => {
    const assignedAgencies = proposals?.filter(p => p.job_id === job.id) || []
    const jobApplications = applications?.filter(a => a.job_id === job.id) || []
    
    return {
      job,
      agencies: assignedAgencies.map(p => ({
        ...p.profiles,
        commission: p.agreed_percentage,
        candidates: jobApplications.filter(app => 
          // Assuming agency submitted the candidate (you may need to add agency_id to applications table)
          app.candidates
        )
      })),
      totalCandidates: jobApplications.length,
      applications: jobApplications
    }
  }) || []
  
  return {
    relationshipMap,
    totalJobs: jobs?.length || 0,
    totalAgencies: new Set(proposals?.map(p => p.agency_id)).size,
    totalCandidates: applications?.length || 0
  }
}

export default function RelationshipMapPage() {
  const { data, isLoading } = useSWR('relationship-map', fetcher, { refreshInterval: 5000 })
  const [selectedJob, setSelectedJob] = useState<any>(null)

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="relative">
      <DynamicBackground page="map" />
      
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Recruitment Relationship Map</h1>
        <p className="text-gray-600">Visualize your complete hiring network</p>
      </div>

      {/* Overview Stats */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 shadow-lg border-l-4 border-blue-600">
          <Briefcase className="w-10 h-10 text-blue-600 mb-3" />
          <p className="text-sm text-gray-600 mb-1">Active Jobs</p>
          <p className="text-4xl font-bold text-gray-900">{data?.totalJobs || 0}</p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-lg border-l-4 border-indigo-600">
          <Building2 className="w-10 h-10 text-indigo-600 mb-3" />
          <p className="text-sm text-gray-600 mb-1">Partner Agencies</p>
          <p className="text-4xl font-bold text-gray-900">{data?.totalAgencies || 0}</p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-lg border-l-4 border-emerald-600">
          <Users className="w-10 h-10 text-emerald-600 mb-3" />
          <p className="text-sm text-gray-600 mb-1">Total Candidates</p>
          <p className="text-4xl font-bold text-gray-900">{data?.totalCandidates || 0}</p>
        </div>
      </div>

      {/* Relationship Map */}
      <div className="space-y-8">
        {data?.relationshipMap.map((relation: any, i: number) => (
          <motion.div
            key={relation.job.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white rounded-2xl shadow-xl overflow-hidden">
            
            {/* Job Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold mb-2">{relation.job.title}</h2>
                  <p className="text-blue-100">{relation.job.location}</p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold">{relation.totalCandidates}</p>
                  <p className="text-sm text-blue-100">Candidates</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              {relation.agencies.length > 0 ? (
                <div className="space-y-6">
                  {relation.agencies.map((agency: any) => (
                    <div key={agency.id} className="border-l-4 border-indigo-600 pl-6">
                      {/* Agency Info */}
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                          <Building2 className="w-6 h-6 text-indigo-600" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-gray-900">{agency.full_name}</h3>
                          <p className="text-sm text-gray-600">{agency.email}</p>
                        </div>
                        <div className="text-right">
                          <div className="px-4 py-2 bg-emerald-100 rounded-lg">
                            <p className="text-2xl font-bold text-emerald-600">{agency.commission}%</p>
                            <p className="text-xs text-emerald-700">Commission</p>
                          </div>
                        </div>
                      </div>

                      {/* Arrow */}
                      <div className="flex items-center gap-2 mb-4 ml-6">
                        <ArrowRight className="w-5 h-5 text-gray-400" />
                        <span className="text-sm text-gray-600 font-semibold">
                          Submitted Candidates
                        </span>
                      </div>

                      {/* Candidates from this agency */}
                      <div className="grid md:grid-cols-2 gap-4 ml-6">
                        {agency.candidates.map((app: any) => (
                          <div key={app.id} className="p-4 bg-gradient-to-r from-emerald-50 to-blue-50 rounded-xl border border-emerald-200">
                            <div className="flex items-start gap-3">
                              <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                                <Users className="w-5 h-5 text-emerald-600" />
                              </div>
                              <div className="flex-1">
                                <h4 className="font-bold text-gray-900">{app.candidates?.name || 'Candidate'}</h4>
                                <p className="text-xs text-gray-600 mb-2">{app.candidates?.email}</p>
                                
                                <div className="flex items-center gap-2 mb-2">
                                  <div className={'px-3 py-1 rounded-full text-xs font-bold ' +
                                    (app.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                                     app.status === 'screening' ? 'bg-blue-100 text-blue-700' :
                                     app.status === 'interview' ? 'bg-indigo-100 text-indigo-700' :
                                     app.status === 'offer' ? 'bg-violet-100 text-violet-700' :
                                     app.status === 'hired' ? 'bg-green-100 text-green-700' :
                                     'bg-red-100 text-red-700')}>
                                    {app.status}
                                  </div>
                                  {app.ai_match_score && (
                                    <div className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold">
                                      {app.ai_match_score}% match
                                    </div>
                                  )}
                                </div>

                                {app.candidates?.skills && (
                                  <div className="flex flex-wrap gap-1 mt-2">
                                    {app.candidates.skills.slice(0, 3).map((skill: string, i: number) => (
                                      <span key={i} className="px-2 py-0.5 bg-white text-gray-700 text-xs rounded">
                                        {skill}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {agency.candidates.length === 0 && (
                        <div className="ml-6 p-4 bg-gray-50 rounded-lg text-center text-gray-500">
                          No candidates submitted yet
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600">No agencies assigned to this job yet</p>
                  <button className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700">
                    Assign Agency
                  </button>
                </div>
              )}
            </div>

            {/* Job Summary Footer */}
            <div className="bg-gray-50 px-6 py-4 border-t flex justify-between items-center">
              <div className="flex gap-6 text-sm">
                <span className="text-gray-600">
                  <strong className="text-gray-900">{relation.agencies.length}</strong> Agencies
                </span>
                <span className="text-gray-600">
                  <strong className="text-gray-900">{relation.totalCandidates}</strong> Candidates
                </span>
                <span className="text-gray-600">
                  <strong className="text-gray-900">
                    {relation.applications.filter((a: any) => a.status === 'hired').length}
                  </strong> Hired
                </span>
              </div>
              <button
                onClick={() => window.location.href = `/dashboard/manager/jobs/${relation.job.id}`}
                className="text-blue-600 hover:text-blue-700 font-semibold text-sm">
                View Details →
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      {data?.relationshipMap.length === 0 && (
        <div className="bg-white rounded-xl p-12 text-center shadow-lg">
          <TrendingUp className="w-20 h-20 text-gray-300 mx-auto mb-4" />
          <p className="text-xl text-gray-600 mb-4">No relationships to map yet</p>
          <p className="text-sm text-gray-500">Post jobs and assign agencies to see the network visualization</p>
        </div>
      )}
    </div>
  )
}
