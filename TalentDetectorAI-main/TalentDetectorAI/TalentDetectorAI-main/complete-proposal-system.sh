#!/bin/bash
# Complete Agency Proposal Review + Manager Real-time Notifications
# Run: bash complete-proposal-system.sh

set -e

echo "🚀 Building Complete Proposal Review System..."

# ==================== AGENCY JOBS PAGE (Review & Accept Proposals) ====================

cat > app/dashboard/agency/jobs/page.tsx << 'ENDFILE'
'use client'
import { useState } from 'react'
import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'
import { Briefcase, CheckCircle, XCircle, Loader2, DollarSign, MapPin, Clock, ArrowRight } from 'lucide-react'
import DynamicBackground from '@/components/ui/DynamicBackground'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'

const fetcher = async () => {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  const { data: proposals } = await supabase
    .from('commission_proposals')
    .select('*')
    .eq('agency_id', user?.id || '')
    .order('created_at', { ascending: false })
  
  const enriched = await Promise.all(
    (proposals || []).map(async (p: any) => {
      const [jobRes, managerRes] = await Promise.all([
        supabase.from('jobs').select('*').eq('id', p.job_id).maybeSingle(),
        supabase.from('profiles').select('full_name, company').eq('id', p.manager_id).maybeSingle()
      ])
      return { ...p, job: jobRes.data, manager: managerRes.data }
    })
  )
  
  return enriched
}

export default function AgencyJobsPage() {
  const { data: proposals, mutate } = useSWR('agency-jobs', fetcher, { refreshInterval: 5000 })
  const [processing, setProcessing] = useState<string | null>(null)

  async function handleResponse(proposalId: string, action: 'accept' | 'reject') {
    setProcessing(proposalId)
    try {
      const supabase = createClient()
      
      const { error } = await supabase
        .from('commission_proposals')
        .update({
          status: action === 'accept' ? 'accepted' : 'rejected',
          agreed_percentage: action === 'accept' ? 
            proposals?.find((p: any) => p.id === proposalId)?.manager_percentage : null,
          agreed_at: action === 'accept' ? new Date().toISOString() : null
        })
        .eq('id', proposalId)

      if (error) throw error

      toast.success(action === 'accept' ? '✅ Proposal accepted!' : '❌ Proposal rejected')
      mutate()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setProcessing(null)
    }
  }

  return (
    <div className="relative min-h-screen p-8">
      <DynamicBackground page="agency-jobs" />
      
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Review Job Proposals</h1>

        {proposals && proposals.length > 0 ? (
          <div className="space-y-6">
            {proposals.map((proposal: any) => (
              <motion.div
                key={proposal.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl p-8 shadow-xl border-2"
                style={{
                  borderColor: proposal.status === 'pending' ? '#f59e0b' :
                               proposal.status === 'accepted' ? '#10b981' :
                               proposal.status === 'rejected' ? '#ef4444' : '#d1d5db'
                }}>
                
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">
                      {proposal.job?.title || 'Job Title'}
                    </h2>
                    <div className="flex gap-4 text-gray-600">
                      {proposal.job?.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" /> {proposal.job.location}
                        </span>
                      )}
                      {proposal.job?.salary_min && (
                        <span className="flex items-center gap-1">
                          <DollarSign className="w-4 h-4" />
                          £{proposal.job.salary_min.toLocaleString()} - £{proposal.job.salary_max.toLocaleString()}
                        </span>
                      )}
                    </div>
                    {proposal.manager && (
                      <p className="text-sm text-gray-600 mt-2">
                        From: <strong>{proposal.manager.full_name}</strong>
                        {proposal.manager.company && ` (${proposal.manager.company})`}
                      </p>
                    )}
                  </div>

                  <div className="text-right">
                    <div className={'px-6 py-3 rounded-xl font-bold text-lg mb-3 ' +
                      (proposal.status === 'pending' ? 'bg-amber-500 text-white' :
                       proposal.status === 'accepted' ? 'bg-emerald-500 text-white' :
                       proposal.status === 'rejected' ? 'bg-red-500 text-white' :
                       'bg-gray-300 text-gray-700')}>
                      {proposal.status.toUpperCase()}
                    </div>
                    <div className="bg-emerald-100 border-2 border-emerald-300 rounded-xl p-4">
                      <p className="text-4xl font-bold text-emerald-700">
                        {proposal.manager_percentage}%
                      </p>
                      <p className="text-xs text-emerald-600">Commission</p>
                    </div>
                  </div>
                </div>

                {proposal.job?.description && (
                  <div className="mb-6">
                    <h3 className="font-bold text-lg mb-2">Description</h3>
                    <p className="text-gray-700 line-clamp-3">{proposal.job.description}</p>
                  </div>
                )}

                {proposal.status === 'pending' && (
                  <div className="flex gap-4">
                    <button
                      onClick={() => handleResponse(proposal.id, 'accept')}
                      disabled={processing === proposal.id}
                      className="flex-1 bg-gradient-to-r from-emerald-500 to-green-600 text-white py-4 rounded-xl font-bold text-lg hover:shadow-xl transition disabled:opacity-50 flex items-center justify-center gap-2">
                      {processing === proposal.id ? (
                        <><Loader2 className="w-6 h-6 animate-spin" /> Processing...</>
                      ) : (
                        <><CheckCircle className="w-6 h-6" /> Accept Proposal</>
                      )}
                    </button>
                    <button
                      onClick={() => handleResponse(proposal.id, 'reject')}
                      disabled={processing === proposal.id}
                      className="flex-1 border-2 border-red-500 text-red-600 py-4 rounded-xl font-bold text-lg hover:bg-red-50 transition disabled:opacity-50 flex items-center justify-center gap-2">
                      <XCircle className="w-6 h-6" /> Reject
                    </button>
                  </div>
                )}

                {proposal.status === 'accepted' && (
                  <button
                    onClick={() => window.location.href = '/dashboard/agency/candidates'}
                    className="w-full bg-gradient-to-r from-violet-500 to-purple-600 text-white py-4 rounded-xl font-bold text-lg hover:shadow-xl transition flex items-center justify-center gap-2">
                    Find Candidates <ArrowRight className="w-6 h-6" />
                  </button>
                )}
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-16 text-center shadow-xl">
            <Briefcase className="w-24 h-24 text-gray-300 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-gray-600 mb-3">No Proposals Yet</h2>
            <p className="text-gray-500">
              Hiring managers will send you job proposals. Check back soon!
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
ENDFILE

# ==================== FIX AGENCY DASHBOARD - Make Review Button Clickable ====================

cat > app/dashboard/agency/page.tsx << 'ENDFILE'
'use client'
import { useEffect } from 'react'
import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'
import { Briefcase, Users, TrendingUp, Bell, Sparkles, Loader2, CheckCircle, Clock, MapPin, DollarSign } from 'lucide-react'
import DynamicBackground from '@/components/ui/DynamicBackground'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const fetcher = async () => {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return { proposals: [], pendingProposals: [], acceptedJobs: [], totalSubmissions: 0 }
  
  const { data: proposals, error } = await supabase
    .from('commission_proposals')
    .select('*')
    .eq('agency_id', user.id)
    .order('created_at', { ascending: false })
  
  if (error || !proposals) return { proposals: [], pendingProposals: [], acceptedJobs: [], totalSubmissions: 0 }
  
  const enriched = await Promise.all(
    proposals.map(async (p: any) => {
      const [jobRes, managerRes] = await Promise.all([
        supabase.from('jobs').select('*').eq('id', p.job_id).maybeSingle(),
        supabase.from('profiles').select('full_name, company').eq('id', p.manager_id).maybeSingle()
      ])
      return { ...p, job: jobRes.data, manager: managerRes.data }
    })
  )
  
  const { data: submissions } = await supabase
    .from('applications')
    .select('id')
    .eq('submitted_by_agency_id', user.id)
  
  return {
    proposals: enriched,
    pendingProposals: enriched.filter(p => p.status === 'pending'),
    acceptedJobs: enriched.filter(p => p.status === 'accepted'),
    totalSubmissions: submissions?.length || 0
  }
}

export default function AgencyDashboard() {
  const { data, mutate, isLoading } = useSWR('agency-dashboard', fetcher, { refreshInterval: 5000 })
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      
      const channel = supabase
        .channel('agency-realtime')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'commission_proposals',
          filter: `agency_id=eq.${user.id}`
        }, () => {
          toast.success('🔔 Job assignment updated!')
          mutate()
        })
        .subscribe()

      return () => channel.unsubscribe()
    })
  }, [mutate])

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-16 h-16 animate-spin text-blue-600" />
    </div>
  )

  return (
    <div className="relative min-h-screen p-8">
      <DynamicBackground page="agency-dashboard" />
      
      <div className="max-w-7xl mx-auto">
        <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent mb-3">
          Agency Dashboard
        </h1>
        <p className="text-xl text-gray-600 mb-8">Manage opportunities and candidates</p>

        {data && data.proposals.length > 0 && (
          <div className="bg-emerald-50 border-2 border-emerald-200 rounded-xl p-6 mb-8">
            <p className="text-lg font-bold text-emerald-900">
              ✅ {data.proposals.length} job {data.proposals.length === 1 ? 'assignment' : 'assignments'} | 
              {data.pendingProposals.length} pending
            </p>
          </div>
        )}

        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-2xl p-6 shadow-xl">
            <Bell className="w-12 h-12 mb-4 opacity-80" />
            <p className="text-sm opacity-90 mb-1">Pending</p>
            <p className="text-5xl font-bold">{data?.pendingProposals?.length || 0}</p>
          </div>
          <div className="bg-gradient-to-br from-emerald-500 to-green-600 text-white rounded-2xl p-6 shadow-xl">
            <Briefcase className="w-12 h-12 mb-4 opacity-80" />
            <p className="text-sm opacity-90 mb-1">Active</p>
            <p className="text-5xl font-bold">{data?.acceptedJobs?.length || 0}</p>
          </div>
          <div className="bg-gradient-to-br from-blue-500 to-cyan-600 text-white rounded-2xl p-6 shadow-xl">
            <Users className="w-12 h-12 mb-4 opacity-80" />
            <p className="text-sm opacity-90 mb-1">Submitted</p>
            <p className="text-5xl font-bold">{data?.totalSubmissions || 0}</p>
          </div>
          <div className="bg-gradient-to-br from-violet-500 to-purple-600 text-white rounded-2xl p-6 shadow-xl">
            <TrendingUp className="w-12 h-12 mb-4 opacity-80" />
            <p className="text-sm opacity-90 mb-1">Potential</p>
            <p className="text-3xl font-bold">
              £{(data?.acceptedJobs?.reduce((acc: number, job: any) => 
                acc + ((job.job?.salary_max || 60000) * ((job.agreed_percentage || job.manager_percentage || 15) / 100)), 0
              ) || 0).toLocaleString()}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-3xl font-bold mb-6">Job Assignments</h2>

          {data?.proposals && data.proposals.length > 0 ? (
            <div className="space-y-6">
              {data.proposals.map((proposal: any, i: number) => (
                <motion.div
                  key={proposal.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-2xl p-6 border-2 hover:shadow-xl transition"
                  style={{
                    borderColor: proposal.status === 'pending' ? '#f59e0b' :
                                 proposal.status === 'accepted' ? '#10b981' : '#d1d5db'
                  }}>
                  
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold text-gray-900 mb-2">
                        {proposal.job?.title || 'Job Title'}
                      </h3>
                      <div className="flex gap-4 mb-3">
                        {proposal.job?.location && (
                          <span className="flex items-center gap-1 text-gray-600">
                            <MapPin className="w-4 h-4" /> {proposal.job.location}
                          </span>
                        )}
                        {proposal.job?.salary_min && (
                          <span className="flex items-center gap-1 text-gray-600">
                            <DollarSign className="w-4 h-4" />
                            £{proposal.job.salary_min.toLocaleString()} - £{proposal.job.salary_max.toLocaleString()}
                          </span>
                        )}
                      </div>
                      {proposal.manager && (
                        <p className="text-sm text-gray-600">
                          From: <strong>{proposal.manager.full_name}</strong>
                          {proposal.manager.company && ` (${proposal.manager.company})`}
                        </p>
                      )}
                    </div>

                    <div className="text-right ml-4">
                      <div className={'px-6 py-3 rounded-xl font-bold text-lg mb-3 ' +
                        (proposal.status === 'pending' ? 'bg-amber-500 text-white' :
                         proposal.status === 'accepted' ? 'bg-emerald-500 text-white' :
                         'bg-gray-300 text-gray-700')}>
                        {proposal.status === 'pending' && <><Clock className="w-5 h-5 inline mr-2" />PENDING</>}
                        {proposal.status === 'accepted' && <><CheckCircle className="w-5 h-5 inline mr-2" />ACTIVE</>}
                      </div>
                      <div className="bg-emerald-100 border-2 border-emerald-300 rounded-xl p-4">
                        <p className="text-4xl font-bold text-emerald-700">
                          {proposal.manager_percentage}%
                        </p>
                        <p className="text-xs text-emerald-600">Commission</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    {proposal.status === 'pending' && (
                      <button
                        onClick={() => router.push('/dashboard/agency/jobs')}
                        className="flex-1 bg-gradient-to-r from-amber-500 to-orange-600 text-white py-3 rounded-xl font-bold hover:shadow-lg transition">
                        Review Proposal →
                      </button>
                    )}
                    {proposal.status === 'accepted' && (
                      <button
                        onClick={() => router.push('/dashboard/agency/candidates')}
                        className="flex-1 bg-gradient-to-r from-emerald-500 to-green-600 text-white py-3 rounded-xl font-bold hover:shadow-lg transition flex items-center justify-center gap-2">
                        <Sparkles className="w-5 h-5" /> Find Candidates
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <Briefcase className="w-24 h-24 text-gray-300 mx-auto mb-6" />
              <h3 className="text-2xl font-bold text-gray-600 mb-3">No Assignments Yet</h3>
              <p className="text-gray-500">Waiting for hiring managers to send opportunities</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
ENDFILE

# ==================== MANAGER REAL-TIME NOTIFICATIONS ====================

cat > supabase/migrations/$(date +%Y%m%d%H%M%S)_manager_realtime_notifications.sql << 'ENDFILE'
-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    data JSONB,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, read, created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
ON notifications FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
ON notifications FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- Trigger to notify manager when agency responds
CREATE OR REPLACE FUNCTION notify_manager_on_proposal_response()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status = 'pending' AND NEW.status IN ('accepted', 'rejected') THEN
        INSERT INTO notifications (user_id, type, title, message, data)
        SELECT 
            NEW.manager_id,
            'proposal_' || NEW.status,
            'Agency ' || CASE WHEN NEW.status = 'accepted' THEN 'Accepted' ELSE 'Rejected' END || ' Proposal',
            (SELECT full_name FROM profiles WHERE id = NEW.agency_id) || 
            ' has ' || NEW.status || ' your job proposal for ' ||
            (SELECT title FROM jobs WHERE id = NEW.job_id),
            jsonb_build_object(
                'proposal_id', NEW.id,
                'job_id', NEW.job_id,
                'agency_id', NEW.agency_id,
                'status', NEW.status
            );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS notify_manager_trigger ON commission_proposals;
CREATE TRIGGER notify_manager_trigger
    AFTER UPDATE ON commission_proposals
    FOR EACH ROW
    EXECUTE FUNCTION notify_manager_on_proposal_response();
ENDFILE

echo ""
echo "✅✅✅ COMPLETE SYSTEM READY! ✅✅✅"
echo ""
echo "Features:"
echo "✓ Clickable 'Review Proposal' buttons"
echo "✓ Dedicated job proposals page"
echo "✓ Accept/Reject functionality"
echo "✓ Real-time notifications for managers"
echo "✓ Auto-refresh on status changes"
echo ""
echo "Run:"
echo "npx supabase db push"
echo "npm run dev"
echo ""
echo "Then:"
echo "1. As Agency: Click 'Review Proposal' → Accept/Reject"
echo "2. As Manager: Get instant notification"
echo "3. Manager can then publish the job! 🎉"
