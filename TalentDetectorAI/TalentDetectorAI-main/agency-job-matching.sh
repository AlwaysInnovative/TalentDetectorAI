#!/bin/bash
# Complete Agency Job Assignment & AI Candidate Matching
# Run: bash agency-job-matching.sh

set -e

echo "🚀 Building Agency Job Assignment & AI Matching System..."

# ==================== AGENCY DASHBOARD WITH JOB NOTIFICATIONS ====================

cat > app/dashboard/agency/page.tsx << 'ENDFILE'
'use client'
import { useEffect } from 'react'
import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'
import { Briefcase, Users, TrendingUp, Bell, Sparkles, Loader2 } from 'lucide-react'
import DynamicBackground from '@/components/ui/DynamicBackground'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import Link from 'next/link'

const fetcher = async () => {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  // Get job assignments (commission proposals)
  const { data: proposals } = await supabase
    .from('commission_proposals')
    .select(`
      *,
      jobs(*),
      profiles!commission_proposals_manager_id_fkey(*)
    `)
    .eq('agency_id', user?.id || '')
    .order('created_at', { ascending: false })
  
  // Get total candidates submitted
  const { data: submissions } = await supabase
    .from('applications')
    .select('id')
    .eq('submitted_by_agency_id', user?.id || '')
  
  const pendingProposals = proposals?.filter(p => p.status === 'pending') || []
  const acceptedJobs = proposals?.filter(p => p.status === 'accepted') || []
  
  return {
    proposals: proposals || [],
    pendingProposals,
    acceptedJobs,
    totalSubmissions: submissions?.length || 0
  }
}

export default function AgencyDashboard() {
  const { data, mutate } = useSWR('agency-dashboard', fetcher, { refreshInterval: 5000 })
  const router = useRouter()

  // Real-time notifications for new job assignments
  useEffect(() => {
    const supabase = createClient()
    
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      
      const channel = supabase
        .channel('job-assignments')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'commission_proposals',
          filter: `agency_id=eq.${user.id}`
        }, (payload) => {
          console.log('🔔 New job assignment:', payload)
          toast.success('🎉 New job opportunity received!')
          mutate()
        })
        .subscribe()

      return () => {
        channel.unsubscribe()
      }
    })
  }, [mutate])

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="relative">
      <DynamicBackground page="agency-dashboard" />
      
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Agency Dashboard</h1>
        <p className="text-gray-600">Manage job opportunities and submit candidates</p>
      </div>

      {/* Notifications Banner */}
      {data.pendingProposals.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-2xl p-6 mb-8 shadow-xl">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center animate-pulse">
              <Bell className="w-8 h-8" />
            </div>
            <div className="flex-1">
              <h3 className="text-2xl font-bold mb-1">
                🎉 {data.pendingProposals.length} New Job {data.pendingProposals.length === 1 ? 'Opportunity' : 'Opportunities'}!
              </h3>
              <p className="text-amber-100">Review and accept commission proposals</p>
            </div>
            <Link href="/dashboard/agency/jobs">
              <button className="bg-white text-amber-600 px-6 py-3 rounded-xl font-bold hover:bg-amber-50 transition">
                View Jobs →
              </button>
            </Link>
          </div>
        </motion.div>
      )}

      {/* Stats */}
      <div className="grid md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-2xl p-6 shadow-lg border-l-4 border-amber-500">
          <Bell className="w-10 h-10 text-amber-600 mb-3" />
          <p className="text-sm text-gray-600 mb-1">Pending Proposals</p>
          <p className="text-4xl font-bold text-gray-900">{data.pendingProposals.length}</p>
        </div>
        
        <div className="bg-white rounded-2xl p-6 shadow-lg border-l-4 border-emerald-500">
          <Briefcase className="w-10 h-10 text-emerald-600 mb-3" />
          <p className="text-sm text-gray-600 mb-1">Active Jobs</p>
          <p className="text-4xl font-bold text-gray-900">{data.acceptedJobs.length}</p>
        </div>
        
        <div className="bg-white rounded-2xl p-6 shadow-lg border-l-4 border-blue-500">
          <Users className="w-10 h-10 text-blue-600 mb-3" />
          <p className="text-sm text-gray-600 mb-1">Candidates Submitted</p>
          <p className="text-4xl font-bold text-gray-900">{data.totalSubmissions}</p>
        </div>
        
        <div className="bg-white rounded-2xl p-6 shadow-lg border-l-4 border-indigo-500">
          <TrendingUp className="w-10 h-10 text-indigo-600 mb-3" />
          <p className="text-sm text-gray-600 mb-1">Potential Earnings</p>
          <p className="text-4xl font-bold text-gray-900">
            £{data.acceptedJobs.reduce((acc: number, job: any) => 
              acc + (job.jobs?.salary_max || 0) * ((job.agreed_percentage || 0) / 100), 0
            ).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 gap-6">
        <Link href="/dashboard/agency/jobs">
          <div className="bg-gradient-to-br from-blue-500 to-cyan-600 text-white rounded-2xl p-8 hover:shadow-2xl transition cursor-pointer">
            <Briefcase className="w-12 h-12 mb-4" />
            <h3 className="text-2xl font-bold mb-2">View Job Opportunities</h3>
            <p className="text-blue-100">Accept proposals and find candidates</p>
          </div>
        </Link>
        
        <Link href="/dashboard/agency/candidates">
          <div className="bg-gradient-to-br from-emerald-500 to-green-600 text-white rounded-2xl p-8 hover:shadow-2xl transition cursor-pointer">
            <Sparkles className="w-12 h-12 mb-4" />
            <h3 className="text-2xl font-bold mb-2">AI Candidate Matching</h3>
            <p className="text-emerald-100">Find perfect matches for your jobs</p>
          </div>
        </Link>
      </div>

      {/* Recent Job Assignments */}
      {data.proposals.length > 0 && (
        <div className="mt-8 bg-white rounded-2xl shadow-lg p-6">
          <h2 className="text-2xl font-bold mb-6">Recent Job Assignments</h2>
          <div className="space-y-4">
            {data.proposals.slice(0, 5).map((proposal: any) => (
              <div key={proposal.id} className="p-4 border border-gray-200 rounded-xl hover:border-blue-400 transition">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-lg text-gray-900">{proposal.jobs?.title}</h4>
                    <p className="text-sm text-gray-600">{proposal.jobs?.location}</p>
                    <p className="text-xs text-gray-500 mt-1">From: {proposal.profiles?.full_name}</p>
                  </div>
                  <div className="text-right">
                    <div className={'px-4 py-2 rounded-full text-sm font-bold ' +
                      (proposal.status === 'accepted' ? 'bg-emerald-100 text-emerald-700' :
                       proposal.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                       'bg-blue-100 text-blue-700')}>
                      {proposal.status}
                    </div>
                    <p className="text-2xl font-bold text-emerald-600 mt-2">
                      {proposal.agreed_percentage || proposal.manager_percentage}%
                    </p>
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
ENDFILE

# ==================== AI CANDIDATE MATCHING PAGE ====================

cat > app/dashboard/agency/candidates/page.tsx << 'ENDFILE'
'use client'
import { useState } from 'react'
import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'
import { Users, Sparkles, Loader2, TrendingUp, Mail, Phone, MapPin, Briefcase } from 'lucide-react'
import DynamicBackground from '@/components/ui/DynamicBackground'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { aiAgent } from '@/lib/ai-agents/engine'

const fetcher = async () => {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  // Get accepted jobs
  const { data: proposals } = await supabase
    .from('commission_proposals')
    .select('*, jobs(*)')
    .eq('agency_id', user?.id || '')
    .eq('status', 'accepted')
  
  // Get all candidates
  const { data: candidates } = await supabase
    .from('candidates')
    .select('*')
    .order('created_at', { ascending: false })
  
  return {
    jobs: proposals?.map(p => p.jobs) || [],
    candidates: candidates || []
  }
}

export default function CandidatesPage() {
  const { data } = useSWR('agency-candidates', fetcher, { refreshInterval: 5000 })
  const [selectedJob, setSelectedJob] = useState<any>(null)
  const [matches, setMatches] = useState<any[]>([])
  const [matching, setMatching] = useState(false)

  async function handleAIMatch() {
    if (!selectedJob) {
      toast.error('Select a job first')
      return
    }

    setMatching(true)
    try {
      // AI match candidates to job
      const matchedCandidates = await Promise.all(
        (data?.candidates || []).map(async (candidate: any) => {
          const analysis = await aiAgent.screenCandidate(candidate, selectedJob)
          return {
            ...candidate,
            matchScore: analysis.screening_score,
            recommendation: analysis.recommendation,
            strengths: analysis.strengths,
            gaps: analysis.gaps
          }
        })
      )

      // Sort by match score
      const sorted = matchedCandidates.sort((a, b) => b.matchScore - a.matchScore)
      setMatches(sorted)
      toast.success('✨ AI matching complete!')
    } catch (error) {
      toast.error('Matching failed')
    } finally {
      setMatching(false)
    }
  }

  async function handleSubmitCandidate(candidate: any) {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    try {
      const { error } = await supabase.from('applications').insert({
        job_id: selectedJob.id,
        candidate_id: candidate.id,
        submitted_by_agency_id: user?.id,
        status: 'pending',
        ai_match_score: candidate.matchScore
      })

      if (error) throw error
      toast.success('✅ Candidate submitted!')
    } catch (error) {
      toast.error('Submission failed')
    }
  }

  return (
    <div className="relative">
      <DynamicBackground page="candidates" />
      
      <h1 className="text-4xl font-bold text-gray-900 mb-8">AI Candidate Matching</h1>

      <div className="grid md:grid-cols-3 gap-8">
        {/* Job Selection */}
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <h2 className="text-2xl font-bold mb-4">Select Job</h2>
          {data?.jobs && data.jobs.length > 0 ? (
            <div className="space-y-3">
              {data.jobs.map((job: any) => (
                <div
                  key={job.id}
                  onClick={() => setSelectedJob(job)}
                  className={'p-4 border-2 rounded-xl cursor-pointer transition ' +
                    (selectedJob?.id === job.id ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-blue-300')}>
                  <p className="font-bold text-gray-900">{job.title}</p>
                  <p className="text-sm text-gray-600">{job.location}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No accepted jobs yet</p>
          )}

          {selectedJob && (
            <button
              onClick={handleAIMatch}
              disabled={matching}
              className="w-full mt-6 bg-gradient-to-r from-violet-600 to-indigo-600 text-white py-3 rounded-xl font-bold hover:opacity-90 transition flex items-center justify-center gap-2">
              {matching ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Matching...</>
              ) : (
                <><Sparkles className="w-5 h-5" /> AI Match Candidates</>
              )}
            </button>
          )}
        </div>

        {/* Candidate Matches */}
        <div className="md:col-span-2">
          <h2 className="text-2xl font-bold mb-4">
            {matches.length > 0 ? `Top Matches (${matches.length})` : 'Available Candidates'}
          </h2>

          <div className="space-y-4">
            {(matches.length > 0 ? matches : data?.candidates || []).map((candidate: any) => (
              <motion.div
                key={candidate.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-xl p-6 shadow-lg border-l-4 border-blue-600">
                
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900">{candidate.name}</h3>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <Mail className="w-4 h-4" /> {candidate.email}
                      </span>
                      {candidate.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-4 h-4" /> {candidate.phone}
                        </span>
                      )}
                    </div>
                    {candidate.location && (
                      <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                        <MapPin className="w-4 h-4" /> {candidate.location}
                      </p>
                    )}
                  </div>

                  {candidate.matchScore && (
                    <div className="text-center">
                      <div className={'w-20 h-20 rounded-full flex items-center justify-center font-bold text-2xl border-4 ' +
                        (candidate.matchScore >= 80 ? 'bg-emerald-100 border-emerald-500 text-emerald-700' :
                         candidate.matchScore >= 60 ? 'bg-blue-100 border-blue-500 text-blue-700' :
                         'bg-amber-100 border-amber-500 text-amber-700')}>
                        {candidate.matchScore}%
                      </div>
                      <p className="text-xs text-gray-600 mt-1">AI Match</p>
                    </div>
                  )}
                </div>

                {candidate.skills && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {candidate.skills.slice(0, 6).map((skill: string, i: number) => (
                      <span key={i} className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full font-semibold">
                        {skill}
                      </span>
                    ))}
                  </div>
                )}

                {candidate.recommendation && (
                  <div className={'p-3 rounded-lg mb-4 ' +
                    (candidate.recommendation.includes('Strong') ? 'bg-emerald-100 border-2 border-emerald-300' :
                     candidate.recommendation.includes('Moderate') ? 'bg-blue-100 border-2 border-blue-300' :
                     'bg-amber-100 border-2 border-amber-300')}>
                    <p className="font-bold text-sm">{candidate.recommendation}</p>
                  </div>
                )}

                {selectedJob && (
                  <button
                    onClick={() => handleSubmitCandidate(candidate)}
                    className="w-full bg-gradient-to-r from-emerald-500 to-green-600 text-white py-3 rounded-xl font-bold hover:opacity-90 transition flex items-center justify-center gap-2">
                    <Users className="w-5 h-5" /> Submit to {selectedJob.title}
                  </button>
                )}
              </motion.div>
            ))}

            {data?.candidates?.length === 0 && (
              <div className="bg-white rounded-xl p-12 text-center shadow-lg">
                <Users className="w-20 h-20 text-gray-300 mx-auto mb-4" />
                <p className="text-xl text-gray-600">No candidates available yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
ENDFILE

echo ""
echo "✅ Agency Job Assignment & AI Matching System Created!"
echo ""
echo "Features:"
echo "✓ Real-time job assignment notifications"
echo "✓ Dashboard shows pending proposals"
echo "✓ AI-powered candidate matching"
echo "✓ Match candidates to specific jobs"
echo "✓ View match scores and recommendations"
echo "✓ Submit candidates directly to jobs"
echo ""
echo "Run: npm run dev"
echo ""
echo "Agency workflow:"
echo "1. Agency receives job assignment notification (real-time)"
echo "2. Dashboard shows pending proposals"
echo "3. Go to Jobs to accept/reject"
echo "4. Go to Candidates to AI match and submit"
