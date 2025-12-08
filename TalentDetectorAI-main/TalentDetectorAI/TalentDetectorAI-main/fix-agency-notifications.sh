#!/bin/bash
# Fix Agency Job Notifications & Dashboard
# Run: bash fix-agency-notifications.sh

set -e

echo "🔧 Fixing Agency Job Notifications..."

# ==================== COMPLETE AGENCY DASHBOARD WITH JOB ASSIGNMENTS ====================

cat > app/dashboard/agency/page.tsx << 'ENDFILE'
'use client'
import { useEffect } from 'react'
import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'
import { Briefcase, Users, TrendingUp, Bell, Sparkles, Loader2, CheckCircle, XCircle, Clock } from 'lucide-react'
import DynamicBackground from '@/components/ui/DynamicBackground'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import Link from 'next/link'

const fetcher = async () => {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  console.log('🔍 Fetching agency data for user:', user?.id)
  
  // Get job assignments (commission proposals)
  const { data: proposals, error: proposalsError } = await supabase
    .from('commission_proposals')
    .select(`
      *,
      jobs(*),
      profiles!commission_proposals_manager_id_fkey(full_name, company)
    `)
    .eq('agency_id', user?.id || '')
    .order('created_at', { ascending: false })
  
  console.log('✅ Proposals fetched:', proposals?.length, proposals)
  console.log('❌ Proposals error:', proposalsError)
  
  // Get total candidates submitted
  const { data: submissions } = await supabase
    .from('applications')
    .select('id')
    .eq('submitted_by_agency_id', user?.id || '')
  
  const pendingProposals = proposals?.filter(p => p.status === 'pending') || []
  const counterProposed = proposals?.filter(p => p.status === 'counter_proposed') || []
  const acceptedJobs = proposals?.filter(p => p.status === 'accepted') || []
  
  return {
    proposals: proposals || [],
    pendingProposals,
    counterProposed,
    acceptedJobs,
    totalSubmissions: submissions?.length || 0
  }
}

export default function AgencyDashboard() {
  const { data, mutate, isLoading } = useSWR('agency-dashboard', fetcher, { 
    refreshInterval: 3000,
    revalidateOnFocus: true 
  })
  const router = useRouter()

  // Real-time notifications for new job assignments
  useEffect(() => {
    const supabase = createClient()
    
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      
      console.log('📡 Setting up real-time subscription for user:', user.id)
      
      const channel = supabase
        .channel('job-assignments')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'commission_proposals',
          filter: `agency_id=eq.${user.id}`
        }, (payload) => {
          console.log('🔔 NEW JOB ASSIGNMENT:', payload)
          toast.success('🎉 New job opportunity received!', { duration: 5000 })
          mutate()
        })
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'commission_proposals',
          filter: `agency_id=eq.${user.id}`
        }, (payload) => {
          console.log('🔄 JOB ASSIGNMENT UPDATE:', payload)
          mutate()
        })
        .subscribe((status) => {
          console.log('📡 Subscription status:', status)
        })

      return () => {
        console.log('📴 Unsubscribing from real-time')
        channel.unsubscribe()
      }
    })
  }, [mutate])

  if (isLoading) {
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

      {/* Debug Info */}
      <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-6">
        <p className="text-sm font-mono text-blue-900">
          📊 Debug: {data?.proposals?.length || 0} total proposals | 
          {data?.pendingProposals?.length || 0} pending | 
          {data?.acceptedJobs?.length || 0} accepted
        </p>
      </div>

      {/* Pending Notifications Banner */}
      {data && data.pendingProposals.length > 0 && (
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
                Review Now →
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
          <p className="text-4xl font-bold text-gray-900">{data?.pendingProposals?.length || 0}</p>
        </div>
        
        <div className="bg-white rounded-2xl p-6 shadow-lg border-l-4 border-emerald-500">
          <Briefcase className="w-10 h-10 text-emerald-600 mb-3" />
          <p className="text-sm text-gray-600 mb-1">Active Jobs</p>
          <p className="text-4xl font-bold text-gray-900">{data?.acceptedJobs?.length || 0}</p>
        </div>
        
        <div className="bg-white rounded-2xl p-6 shadow-lg border-l-4 border-blue-500">
          <Users className="w-10 h-10 text-blue-600 mb-3" />
          <p className="text-sm text-gray-600 mb-1">Candidates Submitted</p>
          <p className="text-4xl font-bold text-gray-900">{data?.totalSubmissions || 0}</p>
        </div>
        
        <div className="bg-white rounded-2xl p-6 shadow-lg border-l-4 border-indigo-500">
          <TrendingUp className="w-10 h-10 text-indigo-600 mb-3" />
          <p className="text-sm text-gray-600 mb-1">Potential Earnings</p>
          <p className="text-4xl font-bold text-gray-900">
            £{data?.acceptedJobs?.reduce((acc: number, job: any) => 
              acc + (job.jobs?.salary_max || 0) * ((job.agreed_percentage || 0) / 100), 0
            ).toLocaleString() || '0'}
          </p>
        </div>
      </div>

      {/* All Job Proposals */}
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
        <h2 className="text-2xl font-bold mb-6">All Job Opportunities ({data?.proposals?.length || 0})</h2>
        
        {data?.proposals && data.proposals.length > 0 ? (
          <div className="space-y-4">
            {data.proposals.map((proposal: any) => (
              <motion.div
                key={proposal.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6 border-2 rounded-xl hover:shadow-lg transition"
                style={{
                  borderColor: proposal.status === 'pending' ? '#f59e0b' :
                               proposal.status === 'accepted' ? '#10b981' :
                               proposal.status === 'counter_proposed' ? '#3b82f6' : '#d1d5db'
                }}>
                
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-2xl font-bold text-gray-900">{proposal.jobs?.title}</h3>
                      {proposal.status === 'pending' && (
                        <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-bold animate-pulse">
                          NEW!
                        </span>
                      )}
                    </div>
                    <p className="text-gray-600">{proposal.jobs?.location}</p>
                    <p className="text-sm text-gray-500 mt-1">From: {proposal.profiles?.full_name} ({proposal.profiles?.company})</p>
                    {proposal.jobs?.salary_min && (
                      <p className="text-sm text-gray-600 mt-2">
                        Salary: £{proposal.jobs.salary_min.toLocaleString()} - £{proposal.jobs.salary_max.toLocaleString()}
                      </p>
                    )}
                  </div>
                  
                  <div className="text-right">
                    <div className={'px-6 py-3 rounded-xl text-lg font-bold mb-2 ' +
                      (proposal.status === 'accepted' ? 'bg-emerald-100 text-emerald-700' :
                       proposal.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                       proposal.status === 'counter_proposed' ? 'bg-blue-100 text-blue-700' :
                       'bg-red-100 text-red-700')}>
                      {proposal.status === 'accepted' && <CheckCircle className="w-5 h-5 inline mr-2" />}
                      {proposal.status === 'pending' && <Clock className="w-5 h-5 inline mr-2" />}
                      {proposal.status.toUpperCase()}
                    </div>
                    <div className="bg-gradient-to-br from-emerald-100 to-green-100 px-6 py-3 rounded-xl border-2 border-emerald-300">
                      <p className="text-3xl font-bold text-emerald-700">
                        {proposal.agreed_percentage || proposal.manager_percentage}%
                      </p>
                      <p className="text-xs text-emerald-600">Commission</p>
                    </div>
                    {proposal.jobs?.salary_max && (
                      <p className="text-sm text-gray-600 mt-2">
                        Earn up to: £{Math.round((proposal.jobs.salary_max * (proposal.agreed_percentage || proposal.manager_percentage)) / 100).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex gap-3 mt-4">
                  {proposal.status === 'accepted' && (
                    <Link href="/dashboard/agency/candidates" className="flex-1">
                      <button className="w-full bg-gradient-to-r from-emerald-500 to-green-600 text-white py-3 rounded-xl font-bold hover:opacity-90 transition">
                        Find Candidates →
                      </button>
                    </Link>
                  )}
                  {proposal.status === 'pending' && (
                    <Link href="/dashboard/agency/jobs" className="flex-1">
                      <button className="w-full bg-gradient-to-r from-amber-500 to-orange-600 text-white py-3 rounded-xl font-bold hover:opacity-90 transition">
                        Review Proposal →
                      </button>
                    </Link>
                  )}
                  <Link href={`/dashboard/agency/jobs/${proposal.job_id}`} className="flex-1">
                    <button className="w-full border-2 border-blue-600 text-blue-600 py-3 rounded-xl font-bold hover:bg-blue-50 transition">
                      View Details
                    </button>
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Briefcase className="w-20 h-20 text-gray-300 mx-auto mb-4" />
            <p className="text-xl text-gray-600 mb-2">No job opportunities yet</p>
            <p className="text-sm text-gray-500">You'll receive notifications when hiring managers invite you to jobs</p>
          </div>
        )}
      </div>
    </div>
  )
}
ENDFILE

echo ""
echo "✅ Agency Dashboard Fixed!"
echo ""
echo "Features:"
echo "✓ Shows ALL commission proposals (pending/accepted/rejected)"
echo "✓ Real-time notifications when manager assigns job"
echo "✓ Visual status indicators (NEW! badge for pending)"
echo "✓ Shows job details, salary, commission"
echo "✓ Potential earnings calculation"
echo "✓ Quick actions (Review/Find Candidates/View Details)"
echo "✓ Debug info showing total proposals"
echo "✓ Auto-refresh every 3 seconds"
echo ""
echo "Run: npm run dev"
echo ""
echo "Now when manager assigns job to agency:"
echo "1. Agency gets real-time notification (toast)"
echo "2. Dashboard shows proposal with NEW! badge"
echo "3. Stats update automatically"
echo "4. Agency can review and accept"
