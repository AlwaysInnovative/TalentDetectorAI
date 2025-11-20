#!/bin/bash
# Complete Agency Assignment Fix
# Run: bash complete-agency-fix.sh

set -e

echo "🔧 Fixing Agency Assignment System..."

# ==================== FIX MANAGER AGENCIES PAGE (Ensure assignments are created) ====================

cat > app/dashboard/manager/agencies/page.tsx << 'ENDFILE'
'use client'
import { useState, useEffect } from 'react'
import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'
import { Building2, UserCheck, Percent, Plus, Users, Loader2, UserPlus, RefreshCw } from 'lucide-react'
import DynamicBackground from '@/components/ui/DynamicBackground'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import Link from 'next/link'

const fetcher = async () => {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  console.log('🔍 Manager fetching data, user ID:', user?.id)
  
  const [agenciesRes, jobsRes, proposalsRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('role', 'agency').order('created_at', { ascending: false }),
    supabase.from('jobs').select('*').eq('manager_id', user?.id || '').eq('status', 'open'),
    supabase.from('commission_proposals').select('*, profiles!commission_proposals_agency_id_fkey(*), jobs(*)').eq('manager_id', user?.id || '')
  ])
  
  console.log('✅ Agencies:', agenciesRes.data?.length)
  console.log('✅ Jobs:', jobsRes.data?.length)
  console.log('✅ Proposals:', proposalsRes.data?.length)
  
  return {
    agencies: agenciesRes.data || [],
    jobs: jobsRes.data || [],
    proposals: proposalsRes.data || []
  }
}

export default function AgenciesPage() {
  const { data, mutate, isLoading } = useSWR('manager-agencies', fetcher, { 
    refreshInterval: 3000,
    revalidateOnFocus: true,
    revalidateOnReconnect: true
  })
  const [selectedAgency, setSelectedAgency] = useState<any>(null)
  const [selectedJob, setSelectedJob] = useState('')
  const [percentage, setPercentage] = useState(15)
  const [inviting, setInviting] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  async function handleRefresh() {
    setRefreshing(true)
    await mutate()
    toast.success('✅ List refreshed!')
    setTimeout(() => setRefreshing(false), 500)
  }

  async function handleInviteAgency() {
    if (!selectedAgency || !selectedJob) {
      toast.error('Select both agency and job')
      return
    }

    setInviting(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      console.log('🎯 Creating proposal:', {
        job_id: selectedJob,
        agency_id: selectedAgency.id,
        manager_id: user?.id,
        manager_percentage: percentage,
        status: 'pending'
      })

      const { data: proposalData, error: proposalError } = await supabase.from('commission_proposals').insert({
        job_id: selectedJob,
        agency_id: selectedAgency.id,
        manager_id: user?.id,
        manager_percentage: percentage,
        status: 'pending'
      }).select().single()

      if (proposalError) {
        console.error('❌ Proposal error:', proposalError)
        throw proposalError
      }

      console.log('✅ Proposal created:', proposalData)

      // Create notification
      const { error: notifError } = await supabase.from('notifications').insert({
        user_id: selectedAgency.id,
        type: 'commission_proposal',
        title: 'New Job Opportunity',
        message: `Commission proposal: ${percentage}%`,
        data: { job_id: selectedJob }
      })

      if (notifError) {
        console.error('⚠️ Notification error (non-critical):', notifError)
      }

      toast.success('✅ Invitation sent to agency!', { duration: 5000 })
      
      // Show success details
      toast(`Agency: ${selectedAgency.full_name}\nJob assigned successfully!`, {
        icon: '🎉',
        duration: 5000
      })

      setSelectedAgency(null)
      setSelectedJob('')
      mutate()
    } catch (error: any) {
      console.error('❌ Error:', error)
      toast.error(`Failed: ${error.message}`)
    } finally {
      setInviting(false)
    }
  }

  async function handleProposalResponse(proposalId: string, action: 'accept') {
    const supabase = createClient()
    
    const proposal = data?.proposals.find((p: any) => p.id === proposalId)
    const { error } = await supabase
      .from('commission_proposals')
      .update({ 
        status: 'accepted',
        agreed_percentage: proposal?.proposed_percentage || proposal?.manager_percentage,
        agreed_at: new Date().toISOString()
      })
      .eq('id', proposalId)
    
    if (error) {
      toast.error('Failed to accept')
    } else {
      toast.success('✅ Proposal accepted!')
      mutate()
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="relative">
      <DynamicBackground page="agencies" />
      
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Agency Management</h1>
          <p className="text-gray-600">
            {data?.agencies?.length || 0} registered agencies | {data?.proposals?.length || 0} assignments
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-4 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-xl font-bold shadow hover:bg-gray-50 transition flex items-center gap-2">
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <Link href="/dashboard/manager/agencies/debug">
            <button className="px-4 py-3 bg-purple-600 text-white rounded-xl font-bold shadow hover:bg-purple-700 transition">
              🔍 Debug
            </button>
          </Link>
          <Link href="/auth/register/agency" target="_blank">
            <button className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-bold shadow-lg flex items-center gap-2 hover:opacity-90">
              <UserPlus className="w-5 h-5" /> Register New Agency
            </button>
          </Link>
        </div>
      </div>

      {/* Debug Info */}
      <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 mb-6">
        <p className="text-sm font-mono text-blue-900">
          📊 Debug: {data?.agencies?.length || 0} agencies | {data?.jobs?.length || 0} open jobs | {data?.proposals?.length || 0} total assignments
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Available Agencies</h2>
            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-bold">
              {data?.agencies?.length || 0} total
            </span>
          </div>
          
          {data?.agencies && data.agencies.length > 0 ? (
            <div className="space-y-4">
              {data.agencies.map((agency: any) => (
                <motion.div
                  key={agency.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ scale: 1.02 }}
                  onClick={() => setSelectedAgency(agency)}
                  className={'bg-white rounded-xl p-6 shadow-lg cursor-pointer transition border-2 ' +
                    (selectedAgency?.id === agency.id ? 'border-blue-600 ring-2 ring-blue-600/20' : 'border-transparent hover:border-blue-200')}>
                  
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg">
                      <Building2 className="w-8 h-8 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900">{agency.full_name}</h3>
                      <p className="text-sm text-gray-600 mt-1">{agency.email}</p>
                      {agency.company && (
                        <p className="text-sm text-blue-600 mt-2 font-semibold flex items-center gap-1">
                          <Building2 className="w-4 h-4" />
                          {agency.company}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 mt-2 font-mono">
                        ID: {agency.id.substring(0, 8)}...
                      </p>
                    </div>
                    {selectedAgency?.id === agency.id && (
                      <div className="flex flex-col items-center gap-2">
                        <UserCheck className="w-8 h-8 text-emerald-600" />
                        <span className="text-xs font-bold text-emerald-600">Selected</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl p-12 text-center shadow-lg border-2 border-dashed border-gray-300">
              <Building2 className="w-20 h-20 text-gray-300 mx-auto mb-4" />
              <p className="text-xl text-gray-600 mb-4 font-semibold">No agencies registered yet</p>
              <Link href="/auth/register/agency" target="_blank">
                <button className="btn-primary flex items-center gap-2 mx-auto">
                  <Plus className="w-5 h-5" /> Register First Agency
                </button>
              </Link>
            </div>
          )}
        </div>

        <div className="sticky top-4">
          <div className="bg-white rounded-xl p-6 shadow-lg border-2 border-gray-200">
            <h2 className="text-2xl font-bold mb-6">Assign Job to Agency</h2>

            {selectedAgency ? (
              <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border-2 border-blue-200">
                <p className="text-sm text-blue-900 font-semibold mb-2">✅ Selected Agency:</p>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-blue-600">{selectedAgency.full_name}</p>
                    <p className="text-xs text-blue-700">{selectedAgency.company}</p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 mb-4 p-4 bg-gray-50 rounded-lg text-center">
                ← Select an agency from the list
              </p>
            )}

            <div className="mb-4">
              <label className="block text-sm font-semibold mb-2">Select Job *</label>
              <select value={selectedJob} onChange={(e) => setSelectedJob(e.target.value)} className="input">
                <option value="">Choose a job...</option>
                {data?.jobs?.map((job: any) => (
                  <option key={job.id} value={job.id}>{job.title} - {job.location}</option>
                ))}
              </select>
              {(!data?.jobs || data.jobs.length === 0) && (
                <p className="text-xs text-amber-600 mt-2">
                  No open jobs. <Link href="/dashboard/manager/jobs/create" className="underline font-semibold">Post a job first</Link>
                </p>
              )}
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold mb-2">Commission Percentage</label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="5"
                  max="25"
                  value={percentage}
                  onChange={(e) => setPercentage(parseInt(e.target.value))}
                  className="flex-1"
                />
                <div className="px-5 py-3 bg-gradient-to-br from-emerald-100 to-green-100 text-emerald-700 rounded-xl font-bold text-2xl min-w-[90px] text-center border-2 border-emerald-300 shadow">
                  {percentage}%
                </div>
              </div>
            </div>

            <button
              onClick={handleInviteAgency}
              disabled={inviting || !selectedAgency || !selectedJob}
              className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
              {inviting ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Sending Invitation...</>
              ) : (
                <><Percent className="w-5 h-5" /> Assign Job ({percentage}%)</>
              )}
            </button>

            {selectedAgency && selectedJob && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded text-xs text-green-800">
                <strong>Will assign:</strong> {selectedAgency.full_name} to {data?.jobs?.find((j: any) => j.id === selectedJob)?.title} at {percentage}% commission
              </div>
            )}
          </div>

          {/* Recent Assignments */}
          {data?.proposals && data.proposals.length > 0 && (
            <div className="bg-white rounded-xl p-6 shadow-lg mt-6 border-2 border-green-200">
              <h3 className="text-xl font-bold mb-4 text-green-900">✅ Recent Assignments ({data.proposals.length})</h3>
              <div className="space-y-3">
                {data.proposals.slice(0, 5).map((proposal: any) => (
                  <div key={proposal.id} className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <p className="font-bold text-sm text-gray-900">{proposal.jobs?.title}</p>
                    <p className="text-xs text-gray-600">{proposal.profiles?.full_name} - {proposal.manager_percentage}%</p>
                    <span className={'text-xs font-bold ' + (proposal.status === 'accepted' ? 'text-green-600' : 'text-amber-600')}>
                      {proposal.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
ENDFILE

# ==================== CREATE MANAGER DEBUG PAGE ====================

mkdir -p app/dashboard/manager/agencies/debug

cat > app/dashboard/manager/agencies/debug/page.tsx << 'ENDFILE'
'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { RefreshCw } from 'lucide-react'

export default function ManagerDebugPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  async function fetchDebugInfo() {
    setLoading(true)
    const supabase = createClient()
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      const { data: allProposals } = await supabase
        .from('commission_proposals')
        .select('*')
        .order('created_at', { ascending: false })
      
      const { data: myProposals } = await supabase
        .from('commission_proposals')
        .select('*')
        .eq('manager_id', user?.id || '')
      
      setData({
        currentUser: user,
        allProposals,
        myProposals,
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      console.error('Debug error:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDebugInfo()
  }, [])

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold">Manager Debug</h1>
        <button onClick={fetchDebugInfo} disabled={loading} className="btn-primary flex items-center gap-2">
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {data && (
        <div className="space-y-6">
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
            <h2 className="text-2xl font-bold mb-4">Manager ID</h2>
            <p className="font-mono">{data.currentUser?.id}</p>
          </div>

          <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6">
            <h2 className="text-2xl font-bold mb-4">All Proposals in System ({data.allProposals?.length || 0})</h2>
            {data.allProposals?.map((p: any) => (
              <div key={p.id} className="bg-white p-3 rounded mb-2 text-sm">
                <p><strong>Agency ID:</strong> {p.agency_id}</p>
                <p><strong>Status:</strong> {p.status}</p>
              </div>
            ))}
          </div>

          <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-6">
            <h2 className="text-2xl font-bold mb-4">My Proposals ({data.myProposals?.length || 0})</h2>
            {data.myProposals?.map((p: any) => (
              <div key={p.id} className="bg-white p-3 rounded mb-2">
                <p><strong>Agency ID:</strong> {p.agency_id}</p>
                <p><strong>Job ID:</strong> {p.job_id}</p>
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
echo "✅ Complete Fix Created!"
echo ""
echo "Now do this:"
echo "1. Run: npm run dev"
echo "2. As MANAGER: Go to /dashboard/manager/agencies"
echo "3. Select an agency"
echo "4. Select a job"  
echo "5. Click 'Assign Job'"
echo "6. Watch the console logs for success"
echo "7. Then as AGENCY: Visit /dashboard/agency/debug"
echo "8. Refresh and see if proposal appears!"
