'use client'

import { useState, useEffect } from 'react'
import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'
import {
  Building2,
  UserCheck,
  Percent,
  Plus,
  Users,
  Loader2,
  UserPlus,
  RefreshCw,
  AlertCircle,
  CheckCircle,
} from 'lucide-react'
import DynamicBackground from '@/components/ui/DynamicBackground'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import Link from 'next/link'

const fetcher = async () => {
  const supabase = createClient()
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()

  if (sessionError || !session?.user?.id) {
    return { agencies: [], jobs: [], proposals: [] }
  }

  const managerId = session.user.id

  const [agenciesRes, jobsRes, proposalsRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('*')
      .eq('role', 'manager')
      .order('created_at', { ascending: false }),

    supabase
      .from('jobs')
      .select('*')
      .eq('manager_id', managerId)
      .eq('status', 'open'),

    supabase
      .from('commissionproposals')
      .select(
        `
        *,
        profiles!commissionproposals_agencyid_fkey ( id, full_name, company, email ),
        jobs ( id, title, location )
      `,
      )
      .eq('managerid', managerId),
  ])

  return {
    agencies: agenciesRes.data || [],
    jobs: jobsRes.data || [],
    proposals: proposalsRes.data || [],
  }
}

export default function AgenciesPage() {
  const { data, mutate, isLoading } = useSWR('manager-agencies', fetcher, {
    refreshInterval: 5000,
    revalidateOnFocus: true,
  })

  const [selectedAgency, setSelectedAgency] = useState<any>(null)
  const [selectedJob, setSelectedJob] = useState('')
  const [percentage, setPercentage] = useState(15)
  const [inviting, setInviting] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel('profiles-agencies')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: 'role=eq.agency',
        },
        () => {
          mutate()
        },
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [mutate])

  async function handleRefresh() {
    setRefreshing(true)
    await mutate()
    setRefreshing(false)
  }

  async function handleInviteAgency() {
    if (!selectedAgency || !selectedJob) {
      toast.error('Select both agency and job')
      return
    }

    setInviting(true)
    try {
      const supabase = createClient()
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError || !session?.user?.id) {
        toast.error('Session expired. Please sign in again.')
        return
      }

      const managerId = session.user.id

      // Prevent duplicate pending proposals (aligns with idxcommissionproposalsunique)
      const { data: existing, error: existingError } = await supabase
        .from('commissionproposals')
        .select('id,status')
        .eq('managerid', managerId)
        .eq('agencyid', selectedAgency.id)
        .eq('jobid', selectedJob)
        .maybeSingle()

      if (existingError && existingError.code !== 'PGRST116') {
        throw existingError
      }

      if (existing && existing.status === 'pending') {
        toast.success('A pending proposal already exists for this agency and job.')
        return
      }

      const { error: insertError } = await supabase.from('commissionproposals').insert({
        jobid: selectedJob,
        agencyid: selectedAgency.id,
        managerid: managerId,
        managerpercentage: percentage,
        status: 'pending',
      })

      if (insertError) {
        throw insertError
      }

      await supabase.from('notifications').insert({
        userid: selectedAgency.id,
        type: 'commission_proposal',
        title: 'New Job Proposal',
        message: `You’ve received a ${percentage}% commission proposal.`,
        data: { jobid: selectedJob, managerid: managerId },
      })

      toast.success('Invitation sent to agency.')
      setSelectedAgency(null)
      setSelectedJob('')
      setPercentage(15)
      await mutate()
    } catch (error: any) {
      toast.error(error.message || 'Failed to send invite')
    } finally {
      setInviting(false)
    }
  }

  async function handleProposalResponse(proposalId: string, action: 'accept') {
    try {
      const supabase = createClient()
      const proposal = data?.proposals.find((p: any) => p.id === proposalId)

      const { error } = await supabase
        .from('commissionproposals')
        .update({
          status: 'accepted',
          agreedpercentage: proposal?.managerpercentage,
          agreedat: new Date().toISOString(),
        })
        .eq('id', proposalId)

      if (error) {
        toast.error('Failed to accept proposal')
      } else {
        toast.success('Proposal accepted.')
        await mutate()
      }
    } catch {
      toast.error('Error updating proposal')
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
    <div className="relative min-h-screen p-8">
      <DynamicBackground page="agencies" />

      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Agency Management</h1>
          <p className="text-gray-600">
            {data?.agencies?.length || 0} agencies • {data?.jobs?.length || 0} open jobs
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-4 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-xl font-bold shadow flex items-center gap-2"
          >
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <Link href="/auth/register/agency" target="_blank">
            <button className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-bold shadow-lg flex items-center gap-2">
              <UserPlus className="w-5 h-5" /> Register New Agency
            </button>
          </Link>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Agencies list */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Users className="w-6 h-6 text-blue-600" />
              Agencies
            </h2>
            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-bold">
              {data?.agencies?.length || 0}
            </span>
          </div>

          {data?.agencies?.length ? (
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              {data.agencies.map((agency: any) => (
                <motion.div
                  key={agency.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ scale: 1.02 }}
                  onClick={() => setSelectedAgency(agency)}
                  className={`bg-white rounded-xl p-6 shadow cursor-pointer border-2 transition ${
                    selectedAgency?.id === agency.id
                      ? 'border-blue-600 ring-2 ring-blue-600/20'
                      : 'border-transparent hover:border-blue-200'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center">
                      <Building2 className="w-8 h-8 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900">{agency.full_name}</h3>
                      <p className="text-sm text-gray-600">{agency.email}</p>
                      {agency.company && (
                        <p className="text-sm text-blue-600 mt-1 flex items-center gap-1">
                          <Building2 className="w-4 h-4" />
                          {agency.company}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        Registered: {new Date(agency.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    {selectedAgency?.id === agency.id && (
                      <div className="flex flex-col items-center gap-1">
                        <UserCheck className="w-6 h-6 text-emerald-600" />
                        <span className="text-xs font-bold text-emerald-600">Selected</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl p-10 text-center border-2 border-dashed border-gray-300">
              <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-lg text-gray-600 mb-2">No agencies yet</p>
              <p className="text-sm text-gray-500 mb-4">
                Share the registration link with your partner agencies.
              </p>
              <Link href="/auth/register/agency" target="_blank">
                <button className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-bold shadow flex items-center gap-2 mx-auto">
                  <Plus className="w-5 h-5" /> Register First Agency
                </button>
              </Link>
            </div>
          )}
        </div>

        {/* Invite panel */}
        <div className="lg:sticky lg:top-6">
          <div className="bg-white rounded-xl p-6 shadow border border-gray-200">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <Percent className="w-6 h-6 text-emerald-600" />
              Invite Agency to Job
            </h2>

            {selectedAgency ? (
              <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border border-blue-200">
                <p className="text-sm text-blue-900 font-semibold mb-2">Selected agency:</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-blue-700">{selectedAgency.full_name}</p>
                    <p className="text-xs text-blue-700">{selectedAgency.company}</p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 mb-4 p-4 bg-gray-50 rounded-lg text-center">
                Select an agency from the left list.
              </p>
            )}

            <div className="mb-4">
              <label className="block text-sm font-semibold mb-2">Job *</label>
              <select
                value={selectedJob}
                onChange={(e) => setSelectedJob(e.target.value)}
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg"
              >
                <option value="">Choose a job...</option>
                {data?.jobs?.map((job: any) => (
                  <option key={job.id} value={job.id}>
                    {job.title} — {job.location}
                  </option>
                ))}
              </select>
              {(!data?.jobs || data.jobs.length === 0) && (
                <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  No open jobs. <Link href="/dashboard/manager/jobs/create" className="underline">Create one first.</Link>
                </p>
              )}
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold mb-2">Commission (%)</label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min={5}
                  max={30}
                  value={percentage}
                  onChange={(e) => setPercentage(parseInt(e.target.value))}
                  className="flex-1"
                />
                <div className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-lg font-bold text-xl">
                  {percentage}%
                </div>
              </div>
            </div>

            <button
              onClick={handleInviteAgency}
              disabled={inviting || !selectedAgency || !selectedJob}
              className="w-full bg-gradient-to-r from-emerald-500 to-green-600 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {inviting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Send Invite ({percentage}%)
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
