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
    console.warn('⚠️ No session found')
    return { agencies: [], jobs: [], proposals: [] }
  }

  const managerId = session.user.id
  console.log('✅ Fetching for manager:', managerId)

  const [agenciesRes, jobsRes, proposalsRes] = await Promise.all([
    // ✅ Fetch AGENCIES (role='agency')
    supabase
      .from('profiles')
      .select('*')
      .eq('role', 'agency')
      .order('created_at', { ascending: false }),

    // ✅ Fetch OPEN JOBS
    supabase
      .from('jobs')
      .select('*')
      .eq('manager_id', managerId)
      .eq('status', 'open'),

    // ✅ FIXED: commission_proposals (with underscore)
    supabase
      .from('commission_proposals')
      .select(
        `
        *,
        profiles!commission_proposals_agency_id_fkey ( id, full_name, company, email ),
        jobs ( id, title, location )
      `,
      )
      .eq('manager_id', managerId),
  ])

  const agencies = agenciesRes.data || []
  const jobs = jobsRes.data || []
  const proposals = proposalsRes.data || []

  console.log('✅ Data fetched:', {
    agencies: agencies.length,
    jobs: jobs.length,
    proposals: proposals.length,
  })

  return {
    agencies,
    jobs,
    proposals,
  }
}

export default function AgenciesPage() {
  const { data, mutate, isLoading } = useSWR('manager-agencies', fetcher, {
    refreshInterval: 5000,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
  })

  const [selectedAgency, setSelectedAgency] = useState<any>(null)
  const [selectedJob, setSelectedJob] = useState('')
  const [percentage, setPercentage] = useState(15)
  const [inviting, setInviting] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  // ✅ Real-time updates
  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel('profiles-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: 'role=eq.agency',
        },
        () => {
          console.log('🔔 Agencies updated via realtime')
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
    console.log('🔄 Manual refresh triggered')
    await mutate()
    toast.success('Refreshed!')
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
        setInviting(false)
        return
      }

      const managerId = session.user.id

      console.log('📤 Sending invite:', {
        jobId: selectedJob,
        agencyId: selectedAgency.id,
        managerId,
        percentage,
      })

      // ✅ Check for existing proposal
      const { data: existing, error: existingError } = await supabase
        .from('commission_proposals')
        .select('id, status')
        .eq('manager_id', managerId)
        .eq('agency_id', selectedAgency.id)
        .eq('job_id', selectedJob)
        .maybeSingle()

      if (existingError && existingError.code !== 'PGRST116') {
        console.error('❌ Error checking existing:', existingError)
        throw existingError
      }

      if (existing) {
        if (existing.status === 'pending') {
          toast.info('Proposal already pending for this agency & job')
          setInviting(false)
          return
        }
        if (existing.status === 'rejected') {
          console.log('♻️ Re-proposing after rejection')
        }
      }

      // ✅ FIXED: commission_proposals with underscore columns
      const { error: insertError } = await supabase.from('commission_proposals').insert({
        job_id: selectedJob,
        agency_id: selectedAgency.id,
        manager_id: managerId,
        manager_percentage: percentage,
        status: 'pending',
      })

      if (insertError) {
        console.error('❌ Insert error:', insertError)
        throw insertError
      }

      // ✅ Send notification
      const jobTitle = data?.jobs?.find((j: any) => j.id === selectedJob)?.title || 'Job'
      const { error: notifyError } = await supabase.from('notifications').insert({
        user_id: selectedAgency.id,
        type: 'commission_proposal',
        title: 'New Job Proposal',
        message: `You've received a ${percentage}% commission proposal for ${jobTitle}`,
        data: { job_id: selectedJob, manager_id: managerId, percentage },
      })

      if (notifyError) {
        console.error('⚠️ Notification error (non-critical):', notifyError)
      }

      toast.success(`✅ Invited ${selectedAgency.full_name} with ${percentage}% commission`)
      setSelectedAgency(null)
      setSelectedJob('')
      setPercentage(15)
      await mutate()
    } catch (error: any) {
      console.error('💥 Error:', error)
      toast.error(error.message || 'Failed to send invite')
    } finally {
      setInviting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="relative min-h-screen flex items-center justify-center">
        <DynamicBackground page="agencies" />
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="relative min-h-screen p-8">
      <DynamicBackground page="agencies" />

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Agency Management</h1>
            <p className="text-gray-600">
              {data?.agencies?.length || 0} agencies • {data?.jobs?.length || 0} open jobs •{' '}
              {data?.proposals?.length || 0} proposals
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="px-4 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-xl font-bold shadow hover:shadow-lg flex items-center gap-2 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <Link href="/auth/register/agency" target="_blank">
              <button className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-bold shadow-lg flex items-center gap-2 hover:shadow-xl transition-all">
                <UserPlus className="w-5 h-5" /> Register New Agency
              </button>
            </Link>
          </div>
        </div>

        {/* ✅ No Agencies Alert */}
        {!data?.agencies?.length && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-2xl p-6 mb-8 shadow-xl border-l-4 border-white"
          >
            <div className="flex items-center gap-4">
              <Building2 className="w-12 h-12 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-xl font-bold mb-1">No agencies registered yet</h3>
                <p className="mb-2">
                  Partner agencies can register using this link:
                </p>
                <code className="bg-white/20 px-3 py-1 rounded-lg font-mono text-sm block w-fit">
                  yourdomain.com/auth/register/agency
                </code>
              </div>
            </div>
          </motion.div>
        )}

        {/* Main Grid */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Agencies List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Users className="w-6 h-6 text-blue-600" />
                Partner Agencies ({data?.agencies?.length || 0})
              </h2>

              {data?.agencies?.length ? (
                <div className="space-y-4 max-h-[70vh] overflow-y-auto">
                  {data.agencies.map((agency: any, index: number) => (
                    <motion.div
                      key={agency.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      whileHover={{ scale: 1.01 }}
                      onClick={() => setSelectedAgency(agency)}
                      className={`p-6 rounded-xl border-2 cursor-pointer transition-all ${
                        selectedAgency?.id === agency.id
                          ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-300'
                          : 'border-gray-200 bg-white hover:border-blue-200'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-14 h-14 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                          <Building2 className="w-8 h-8 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-bold text-gray-900 truncate">
                            {agency.full_name}
                          </h3>
                          <p className="text-sm text-gray-600 truncate">{agency.email}</p>
                          {agency.company && (
                            <p className="text-sm text-blue-600 mt-1 font-semibold">
                              {agency.company}
                            </p>
                          )}
                          <p className="text-xs text-gray-500 mt-2">
                            Registered {new Date(agency.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        {selectedAgency?.id === agency.id && (
                          <div className="flex flex-col items-center gap-1 flex-shrink-0">
                            <CheckCircle className="w-6 h-6 text-emerald-600" />
                            <span className="text-xs font-bold text-emerald-600">Selected</span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-lg text-gray-600 mb-2">No agencies registered</p>
                  <p className="text-sm text-gray-500 mb-6">
                    Share the registration link to get started
                  </p>
                  <Link href="/auth/register/agency" target="_blank">
                    <button className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-bold shadow-lg flex items-center gap-2 mx-auto hover:shadow-xl transition-all">
                      <Plus className="w-5 h-5" /> Register First Agency
                    </button>
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* ✅ Invite Panel */}
          <div className="lg:sticky lg:top-8 h-fit">
            <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <Percent className="w-6 h-6 text-emerald-600" />
                Send Invitation
              </h2>

              {selectedAgency ? (
                <>
                  {/* Selected Agency Preview */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border-2 border-blue-200"
                  >
                    <p className="text-xs text-blue-600 font-semibold mb-3 uppercase">
                      Selected Agency
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-6 h-6 text-white" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-blue-900 truncate">
                          {selectedAgency.full_name}
                        </p>
                        <p className="text-xs text-blue-600 truncate">
                          {selectedAgency.company}
                        </p>
                      </div>
                    </div>
                  </motion.div>

                  {/* Job Selector */}
                  <div className="mb-6">
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Select Job *
                    </label>
                    <select
                      value={selectedJob}
                      onChange={(e) => setSelectedJob(e.target.value)}
                      className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg font-semibold focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                    >
                      <option value="">Choose a job...</option>
                      {data?.jobs?.map((job: any) => (
                        <option key={job.id} value={job.id}>
                          {job.title} • {job.location}
                        </option>
                      ))}
                    </select>
                    {!data?.jobs?.length && (
                      <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        No open jobs.{' '}
                        <Link
                          href="/dashboard/manager/jobs/create"
                          className="underline font-bold"
                        >
                          Create one
                        </Link>
                      </p>
                    )}
                  </div>

                  {/* Commission Slider */}
                  <div className="mb-8">
                    <label className="block text-sm font-semibold text-gray-900 mb-3">
                      Commission Rate
                    </label>
                    <div className="flex items-center gap-4">
                      <input
                        type="range"
                        min={5}
                        max={30}
                        step={1}
                        value={percentage}
                        onChange={(e) => setPercentage(parseInt(e.target.value))}
                        className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                      />
                      <div className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-lg font-bold text-lg min-w-[60px] text-center">
                        {percentage}%
                      </div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-2">
                      <span>5%</span>
                      <span>30%</span>
                    </div>
                  </div>

                  {/* Send Button */}
                  <button
                    onClick={handleInviteAgency}
                    disabled={inviting || !selectedJob}
                    className="w-full bg-gradient-to-r from-emerald-500 to-green-600 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 hover:shadow-lg hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {inviting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-5 h-5" />
                        Send {percentage}% Invite
                      </>
                    )}
                  </button>
                </>
              ) : (
                <div className="text-center py-12">
                  <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600 font-semibold mb-2">No agency selected</p>
                  <p className="text-sm text-gray-500">
                    Click any agency from the left to send an invitation
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
