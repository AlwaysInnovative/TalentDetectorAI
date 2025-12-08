#!/bin/bash
# Complete Agency System with Test Data & Market Strategy
# Run: bash complete-agency-system.sh

set -e

echo "🚀 Building Complete Agency System..."

# ==================== ADD REGISTER LINK TO MANAGER AGENCIES PAGE ====================

cat > app/dashboard/manager/agencies/page.tsx << 'ENDFILE'
'use client'
import { useState } from 'react'
import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'
import { Building2, UserCheck, Percent, Plus, Users, Loader2, UserPlus } from 'lucide-react'
import DynamicBackground from '@/components/ui/DynamicBackground'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import Link from 'next/link'

const fetcher = async () => {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  const [agenciesRes, jobsRes, proposalsRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('role', 'agency'),
    supabase.from('jobs').select('*').eq('manager_id', user?.id || '').eq('status', 'open'),
    supabase.from('commission_proposals').select('*, profiles!commission_proposals_agency_id_fkey(*), jobs(*)').eq('manager_id', user?.id || '')
  ])
  
  return {
    agencies: agenciesRes.data || [],
    jobs: jobsRes.data || [],
    proposals: proposalsRes.data || []
  }
}

export default function AgenciesPage() {
  const { data, mutate } = useSWR('manager-agencies', fetcher, { refreshInterval: 5000 })
  const [selectedAgency, setSelectedAgency] = useState<any>(null)
  const [selectedJob, setSelectedJob] = useState('')
  const [percentage, setPercentage] = useState(15)
  const [inviting, setInviting] = useState(false)

  async function handleInviteAgency() {
    if (!selectedAgency || !selectedJob) {
      toast.error('Select both agency and job')
      return
    }

    setInviting(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      const { error } = await supabase.from('commission_proposals').insert({
        job_id: selectedJob,
        agency_id: selectedAgency.id,
        manager_id: user?.id,
        manager_percentage: percentage,
        status: 'pending'
      })

      if (error) throw error

      await supabase.from('notifications').insert({
        user_id: selectedAgency.id,
        type: 'commission_proposal',
        title: 'New Job Opportunity',
        message: `Commission proposal: ${percentage}%`,
        data: { job_id: selectedJob }
      })

      toast.success('✅ Invitation sent to agency!')
      setSelectedAgency(null)
      setSelectedJob('')
      mutate()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setInviting(false)
    }
  }

  async function handleProposalResponse(proposalId: string, action: 'accept' | 'counter', counterPercentage?: number) {
    const supabase = createClient()
    
    if (action === 'accept') {
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
  }

  return (
    <div className="relative">
      <DynamicBackground page="agencies" />
      
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Agency Management</h1>
          <p className="text-gray-600">Invite and manage recruitment partners</p>
        </div>
        <div className="flex gap-3">
          <Link href="/auth/register/agency" target="_blank">
            <button className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-xl font-bold shadow-lg flex items-center gap-2 hover:opacity-90">
              <UserPlus className="w-5 h-5" /> Register New Agency
            </button>
          </Link>
        </div>
      </div>

      {/* Market Strategy Info */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-6 mb-8">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
            <Users className="w-7 h-7 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-blue-900 mb-2">🎯 Market Strategy</h3>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div className="bg-white rounded-lg p-4">
                <p className="font-bold text-blue-900 mb-2">✅ Recommended: Manager Invites Agency</p>
                <ul className="space-y-1 text-blue-800">
                  <li>• You control who works on your jobs</li>
                  <li>• Set commission rates upfront</li>
                  <li>• Pre-qualified recruitment partners</li>
                  <li>• Better quality candidates</li>
                </ul>
              </div>
              <div className="bg-white rounded-lg p-4">
                <p className="font-bold text-gray-900 mb-2">Alternative: Agency Applies</p>
                <ul className="space-y-1 text-gray-700">
                  <li>• Agencies can view public jobs</li>
                  <li>• Request to work on positions</li>
                  <li>• You approve/reject requests</li>
                  <li>• Larger candidate pool</li>
                </ul>
              </div>
            </div>
            <p className="text-blue-700 mt-3 font-semibold">
              💡 Current System: You invite trusted agencies with your preferred commission rate
            </p>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Available Agencies */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Available Agencies ({data?.agencies?.length || 0})</h2>
          </div>
          
          {data?.agencies && data.agencies.length > 0 ? (
            <div className="space-y-4">
              {data.agencies.map((agency: any) => (
                <motion.div
                  key={agency.id}
                  whileHover={{ scale: 1.02 }}
                  onClick={() => setSelectedAgency(agency)}
                  className={'bg-white rounded-xl p-6 shadow-lg cursor-pointer transition ' +
                    (selectedAgency?.id === agency.id ? 'ring-2 ring-blue-600' : '')}>
                  
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center">
                      <Building2 className="w-8 h-8 text-indigo-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900">{agency.full_name}</h3>
                      <p className="text-sm text-gray-600">{agency.email}</p>
                      {agency.company && (
                        <p className="text-sm text-indigo-600 mt-1 font-semibold">{agency.company}</p>
                      )}
                    </div>
                    {selectedAgency?.id === agency.id && (
                      <UserCheck className="w-6 h-6 text-emerald-600" />
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl p-12 text-center shadow-lg">
              <Building2 className="w-20 h-20 text-gray-300 mx-auto mb-4" />
              <p className="text-xl text-gray-600 mb-4">No agencies registered yet</p>
              <p className="text-sm text-gray-500 mb-6">Register agencies to start building your recruitment network</p>
              <Link href="/auth/register/agency" target="_blank">
                <button className="btn-primary flex items-center gap-2 mx-auto">
                  <Plus className="w-5 h-5" /> Register First Agency
                </button>
              </Link>
            </div>
          )}
        </div>

        {/* Invite Agency to Job */}
        <div className="sticky top-4">
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <h2 className="text-2xl font-bold mb-6">Invite Agency to Job</h2>

            {selectedAgency ? (
              <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-900 font-semibold mb-1">Selected Agency:</p>
                <p className="font-bold text-blue-600">{selectedAgency.full_name}</p>
                <p className="text-xs text-blue-700">{selectedAgency.company}</p>
              </div>
            ) : (
              <p className="text-gray-500 mb-4">← Select an agency first</p>
            )}

            <div className="mb-4">
              <label className="block text-sm font-semibold mb-2">Select Job</label>
              <select value={selectedJob} onChange={(e) => setSelectedJob(e.target.value)} className="input">
                <option value="">Choose a job...</option>
                {data?.jobs?.map((job: any) => (
                  <option key={job.id} value={job.id}>{job.title} - {job.location}</option>
                ))}
              </select>
              {(!data?.jobs || data.jobs.length === 0) && (
                <p className="text-xs text-amber-600 mt-2">
                  No open jobs available. <Link href="/dashboard/manager/jobs/create" className="underline font-semibold">Post a job first</Link>
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
                <div className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-lg font-bold text-xl min-w-[80px] text-center">
                  {percentage}%
                </div>
              </div>
              <p className="text-xs text-gray-600 mt-2">
                Agency will earn {percentage}% commission on successful placement
              </p>
            </div>

            <button
              onClick={handleInviteAgency}
              disabled={inviting || !selectedAgency || !selectedJob}
              className="w-full btn-primary flex items-center justify-center gap-2">
              {inviting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" /> Sending...
                </>
              ) : (
                <>
                  <Percent className="w-5 h-5" /> Send Invitation
                </>
              )}
            </button>
          </div>

          {/* Pending Proposals */}
          {data?.proposals && data.proposals.filter((p: any) => p.status === 'counter_proposed').length > 0 && (
            <div className="bg-white rounded-xl p-6 shadow-lg mt-6">
              <h3 className="text-xl font-bold mb-4">Counter Proposals</h3>
              <div className="space-y-3">
                {data.proposals.filter((p: any) => p.status === 'counter_proposed').map((proposal: any) => (
                  <div key={proposal.id} className="p-4 border border-amber-200 bg-amber-50 rounded-lg">
                    <p className="font-bold text-gray-900">{proposal.jobs?.title}</p>
                    <p className="text-sm text-gray-600">{proposal.profiles?.full_name}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="text-sm">
                        <span className="text-gray-600">Your offer: </span>
                        <strong>{proposal.manager_percentage}%</strong>
                        <span className="text-gray-600"> → Agency wants: </span>
                        <strong className="text-amber-700">{proposal.proposed_percentage}%</strong>
                      </div>
                      <button
                        onClick={() => handleProposalResponse(proposal.id, 'accept')}
                        className="px-3 py-1 bg-emerald-600 text-white rounded text-sm font-semibold hover:bg-emerald-700">
                        Accept
                      </button>
                    </div>
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

echo ""
echo "✅ Complete Agency System Ready!"
echo ""
echo "MARKET STRATEGY IMPLEMENTED:"
echo ""
echo "🎯 PRIMARY MODEL (Recommended):"
echo "1. Hiring Manager posts job"
echo "2. Manager invites trusted agencies"
echo "3. Manager sets commission % (5-25%)"
echo "4. Agency accepts or counter-proposes"
echo "5. Agency submits candidates"
echo ""
echo "BENEFITS:"
echo "✓ Manager controls who works on jobs"
echo "✓ Pre-qualified agencies only"
echo "✓ Better quality candidates"
echo "✓ Clear commission terms upfront"
echo ""
echo "TO GET STARTED:"
echo "1. Click 'Register New Agency' button"
echo "2. Register 2-3 test agencies in new tab"
echo "3. Come back and invite them to jobs"
echo "4. Set commission % and send invite"
echo ""
echo "Run: npm run dev"
