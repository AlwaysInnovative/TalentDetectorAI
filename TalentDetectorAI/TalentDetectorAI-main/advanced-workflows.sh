#!/bin/bash
# Complete Advanced Workflow System
# Agency commission, chat, AI recommendations, advanced UI
# Run: bash advanced-workflows.sh

set -e

echo "🚀 Building Advanced Workflow System..."

mkdir -p app/dashboard/manager/{agencies,chat}
mkdir -p app/dashboard/agency/jobs
mkdir -p components/{chat,timeline,resume-viewer}

# ==================== DATABASE SCHEMA ====================

cat > supabase/migrations/$(date +%Y%m%d%H%M%S)_advanced_workflows.sql << 'ENDFILE'
-- Agency commission proposals
CREATE TABLE IF NOT EXISTS commission_proposals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  agency_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  manager_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  proposed_percentage DECIMAL(5,2),
  manager_percentage DECIMAL(5,2),
  status TEXT DEFAULT 'pending',
  agency_message TEXT,
  manager_message TEXT,
  agreed_percentage DECIMAL(5,2),
  created_at TIMESTAMP DEFAULT NOW(),
  agreed_at TIMESTAMP
);

-- Chat messages for job discussions
CREATE TABLE IF NOT EXISTS job_chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES auth.users(id),
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- AI recommendations cache
CREATE TABLE IF NOT EXISTS ai_recommendations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  recommendation_type TEXT NOT NULL,
  content JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP
);

-- Interview scheduling
CREATE TABLE IF NOT EXISTS interview_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  proposed_times JSONB,
  confirmed_time TIMESTAMP,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_commission_proposals_job ON commission_proposals(job_id);
CREATE INDEX IF NOT EXISTS idx_commission_proposals_agency ON commission_proposals(agency_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_job ON job_chat_messages(job_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON job_chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_user ON ai_recommendations(user_id);
ENDFILE

# ==================== MANAGER - AGENCIES PAGE WITH COMMISSION ====================

cat > app/dashboard/manager/agencies/page.tsx << 'ENDFILE'
'use client'
import { useState } from 'react'
import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'
import { Building2, UserCheck, Percent, MessageSquare, TrendingUp, Loader2 } from 'lucide-react'
import DynamicBackground from '@/components/ui/DynamicBackground'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'

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

      // Notify agency
      await supabase.from('notifications').insert({
        user_id: selectedAgency.id,
        type: 'commission_proposal',
        title: 'New Job Opportunity',
        message: `Commission proposal: ${percentage}%`
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
      const { error } = await supabase
        .from('commission_proposals')
        .update({ 
          status: 'accepted',
          agreed_percentage: data?.proposals.find((p: any) => p.id === proposalId)?.proposed_percentage,
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
      
      <h1 className="text-4xl font-bold text-gray-900 mb-8">Agency Management</h1>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Available Agencies */}
        <div>
          <h2 className="text-2xl font-bold mb-4">Available Agencies</h2>
          
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
                        <p className="text-sm text-indigo-600 mt-1">{agency.company}</p>
                      )}
                    </div>
                    <UserCheck className="w-6 h-6 text-emerald-600" />
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl p-12 text-center shadow-lg">
              <Building2 className="w-20 h-20 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">No agencies registered yet</p>
            </div>
          )}
        </div>

        {/* Invite Agency to Job */}
        <div className="sticky top-4">
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <h2 className="text-2xl font-bold mb-6">Invite Agency</h2>

            {selectedAgency ? (
              <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-900 font-semibold mb-1">Selected Agency:</p>
                <p className="font-bold text-blue-600">{selectedAgency.full_name}</p>
              </div>
            ) : (
              <p className="text-gray-500 mb-4">← Select an agency</p>
            )}

            <div className="mb-4">
              <label className="block text-sm font-semibold mb-2">Select Job</label>
              <select value={selectedJob} onChange={(e) => setSelectedJob(e.target.value)} className="input">
                <option value="">Choose a job...</option>
                {data?.jobs?.map((job: any) => (
                  <option key={job.id} value={job.id}>{job.title}</option>
                ))}
              </select>
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
          {data?.proposals && data.proposals.filter((p: any) => p.status === 'pending').length > 0 && (
            <div className="bg-white rounded-xl p-6 shadow-lg mt-6">
              <h3 className="text-xl font-bold mb-4">Pending Proposals</h3>
              <div className="space-y-3">
                {data.proposals.filter((p: any) => p.status === 'pending').map((proposal: any) => (
                  <div key={proposal.id} className="p-4 border border-amber-200 bg-amber-50 rounded-lg">
                    <p className="font-bold text-gray-900">{proposal.jobs?.title}</p>
                    <p className="text-sm text-gray-600">{proposal.profiles?.full_name}</p>
                    {proposal.proposed_percentage && (
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-sm">Agency counter: <strong>{proposal.proposed_percentage}%</strong></span>
                        <button
                          onClick={() => handleProposalResponse(proposal.id, 'accept')}
                          className="px-3 py-1 bg-emerald-600 text-white rounded text-sm font-semibold">
                          Accept
                        </button>
                      </div>
                    )}
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

# ==================== AGENCY - VIEW JOBS & ACCEPT COMMISSION ====================

cat > app/dashboard/agency/jobs/page.tsx << 'ENDFILE'
'use client'
import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'
import { Briefcase, Percent, MessageSquare, CheckCircle, Loader2 } from 'lucide-react'
import DynamicBackground from '@/components/ui/DynamicBackground'
import { motion } from 'framer-motion'
import { useState } from 'react'
import toast from 'react-hot-toast'

const fetcher = async () => {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  const { data: proposals } = await supabase
    .from('commission_proposals')
    .select('*, jobs(*), profiles!commission_proposals_manager_id_fkey(*)')
    .eq('agency_id', user?.id || '')
    .order('created_at', { ascending: false })
  
  return proposals || []
}

export default function AgencyJobsPage() {
  const { data: proposals, mutate } = useSWR('agency-jobs', fetcher, { refreshInterval: 5000 })
  const [counterPercentage, setCounterPercentage] = useState<{[key: string]: number}>({})

  async function handleAccept(proposalId: string, percentage: number) {
    const supabase = createClient()
    
    const { error } = await supabase
      .from('commission_proposals')
      .update({ 
        status: 'accepted',
        agreed_percentage: percentage,
        agreed_at: new Date().toISOString()
      })
      .eq('id', proposalId)
    
    if (error) {
      toast.error('Failed to accept')
    } else {
      toast.success('✅ Commission accepted!')
      mutate()
    }
  }

  async function handleCounter(proposalId: string) {
    const percentage = counterPercentage[proposalId]
    if (!percentage) return

    const supabase = createClient()
    
    const { error } = await supabase
      .from('commission_proposals')
      .update({ 
        proposed_percentage: percentage,
        status: 'counter_proposed'
      })
      .eq('id', proposalId)
    
    if (error) {
      toast.error('Failed to send counter')
    } else {
      toast.success('📤 Counter proposal sent!')
      mutate()
    }
  }

  return (
    <div className="relative">
      <DynamicBackground page="jobs" />
      
      <h1 className="text-4xl font-bold text-gray-900 mb-8">Job Opportunities</h1>

      {proposals && proposals.length > 0 ? (
        <div className="grid md:grid-cols-2 gap-6">
          {proposals.map((proposal: any) => (
            <motion.div
              key={proposal.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl p-6 shadow-lg">
              
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{proposal.jobs.title}</h3>
                  <p className="text-sm text-gray-600">{proposal.jobs.location}</p>
                  <p className="text-xs text-gray-500 mt-1">From: {proposal.profiles?.full_name}</p>
                </div>
                <div className={'px-4 py-2 rounded-full text-sm font-bold ' +
                  (proposal.status === 'accepted' ? 'bg-emerald-100 text-emerald-700' :
                   proposal.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                   'bg-blue-100 text-blue-700')}>
                  {proposal.status}
                </div>
              </div>

              <div className="p-4 bg-emerald-50 rounded-xl mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Percent className="w-5 h-5 text-emerald-600" />
                    <span className="text-sm font-semibold">Proposed Commission:</span>
                  </div>
                  <span className="text-3xl font-bold text-emerald-600">{proposal.manager_percentage}%</span>
                </div>
                {proposal.jobs.salary_max && (
                  <p className="text-xs text-emerald-700 mt-2">
                    Potential: £{Math.round(proposal.jobs.salary_max * (proposal.manager_percentage / 100)).toLocaleString()}
                  </p>
                )}
              </div>

              {proposal.status === 'pending' && (
                <div className="space-y-3">
                  <button
                    onClick={() => handleAccept(proposal.id, proposal.manager_percentage)}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2">
                    <CheckCircle className="w-5 h-5" /> Accept {proposal.manager_percentage}%
                  </button>
                  
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="5"
                      max="25"
                      value={counterPercentage[proposal.id] || ''}
                      onChange={(e) => setCounterPercentage({...counterPercentage, [proposal.id]: parseInt(e.target.value)})}
                      className="input flex-1"
                      placeholder="Counter %"
                    />
                    <button
                      onClick={() => handleCounter(proposal.id)}
                      className="btn-secondary">
                      Counter Proposal
                    </button>
                  </div>
                </div>
              )}

              {proposal.status === 'accepted' && (
                <div className="p-4 bg-emerald-100 rounded-xl border-2 border-emerald-300">
                  <p className="text-emerald-900 font-bold text-center">
                    ✅ Agreed: {proposal.agreed_percentage}% Commission
                  </p>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl p-12 text-center shadow-lg">
          <Briefcase className="w-20 h-20 text-gray-300 mx-auto mb-4" />
          <p className="text-xl text-gray-600">No job opportunities yet</p>
          <p className="text-sm text-gray-500 mt-2">You'll receive notifications when hiring managers invite you</p>
        </div>
      )}
    </div>
  )
}
ENDFILE

echo ""
echo "✅ Part 1 Complete - Commission Workflow"
echo ""
echo "Created:"
echo "✓ Manager can invite agencies with commission %"
echo "✓ Agencies can accept or counter-propose"
echo "✓ Real-time proposal tracking"
echo ""
echo "Run: npx supabase db push"
echo "Then: npm run dev"
echo ""
echo "Type 'continue' for Part 2:"
echo "- Job chat system"
echo "- AI recommendations"
echo "- Advanced UI components"
echo "- Real-time interactions"
