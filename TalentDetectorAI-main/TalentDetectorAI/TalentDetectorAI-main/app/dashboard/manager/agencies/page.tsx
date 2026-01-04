'use client'
import { useState, useEffect } from 'react'
import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'
import { Building2, UserCheck, Percent, Plus, Users, Loader2, UserPlus, RefreshCw, AlertCircle } from 'lucide-react'
import DynamicBackground from '@/components/ui/DynamicBackground'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import Link from 'next/link'

const fetcher = async () => {
  const supabase = createClient()
  
  // ✅ FIXED: Use getSession instead of getUser
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  
  if (sessionError) {
    console.error('❌ Session error:', sessionError)
    return { agencies: [], jobs: [], proposals: [] }
  }
  
  const userId = session?.user?.id
  if (!userId) {
    console.warn('⚠️ No user session found')
    return { agencies: [], jobs: [], proposals: [] }
  }
  
  console.log('✅ Fetching data for user:', userId)
  
  const [agenciesRes, jobsRes, proposalsRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('*')
      .eq('role', 'agency')
      .order('created_at', { ascending: false }),
    supabase
      .from('jobs')
      .select('*')
      .eq('manager_id', userId)  // ✅ Use userId from session
      .eq('status', 'open'),
    supabase
      .from('commission_proposals')
      .select('*, profiles!commission_proposals_agency_id_fkey(*), jobs(*)')
      .eq('manager_id', userId)  // ✅ Use userId from session
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

  useEffect(() => {
    const supabase = createClient()
    
    const channel = supabase
      .channel('profiles-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'profiles',
        filter: 'role=eq.agency'
      }, (payload) => {
        console.log('🔔 Real-time profile change:', payload)
        toast.success('🔔 New agency registered!')
        mutate()
      })
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [mutate])

  async function handleRefresh() {
    setRefreshing(true)
    await mutate()
    toast.success('✅ List refreshed!')
    setRefreshing(false)
  }

  // ✅ FIXED: Complete handleInviteAgency function
  async function handleInviteAgency() {
    if (!selectedAgency || !selectedJob) {
      toast.error('Please select both agency and job')
      return
    }

    setInviting(true)
    try {
      const supabase = createClient()
      
      // ✅ FIXED: Get session first
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError) {
        console.error('❌ Session error:', sessionError)
        throw new Error('Session expired. Please log in again.')
      }
      
      if (!session?.user?.id) {
        toast.error('Please log in to send invitations')
        return
      }

      console.log('✅ Sending invite from user:', session.user.id)
      console.log('📋 To agency:', selectedAgency.id)
      console.log('💼 Job:', selectedJob)
      console.log('📊 Percentage:', percentage)

      // ✅ FIXED: Use session.user.id (guaranteed to exist)
      const { error: insertError } = await supabase.from('commission_proposals').insert({
        job_id: selectedJob,
        agency_id: selectedAgency.id,
        manager_id: session.user.id,  // ✅ This will NOT be null
        manager_percentage: percentage,
        status: 'pending'
      })

      if (insertError) {
        console.error('❌ Insert error:', insertError)
        throw new Error(`Failed to create proposal: ${insertError.message}`)
      }

      // Send notification
      const { error: notifyError } = await supabase.from('notifications').insert({
        user_id: selectedAgency.id,
        type: 'commission_proposal',
        title: 'New Job Opportunity',
        message: `You've received a commission proposal: ${percentage}%`,
        data: { 
          job_id: selectedJob,
          manager_id: session.user.id,
          percentage 
        }
      })

      if (notifyError) {
        console.warn('⚠️ Notification failed but proposal created:', notifyError)
      }

      toast.success(`✅ Invitation sent to ${selectedAgency.full_name}! (${percentage}%)`)
      
      // Reset form
      setSelectedAgency(null)
      setSelectedJob('')
      setPercentage(15)
      
      // Refresh data
      await mutate()
      
    } catch (error: any) {
      console.error('💥 Send invite error:', error)
      toast.error(error.message || 'Failed to send invitation')
    } finally {
      setInviting(false)
    }
  }

  async function handleProposalResponse(proposalId: string, action: 'accept') {
    try {
      const supabase = createClient()
      
      const proposal = data?.proposals.find((p: any) => p.id === proposalId)
      const { error } = await supabase
        .from('commission_proposals')
        .update({ 
          status: 'accepted',
          agreed_percentage: proposal?.manager_percentage,
          agreed_at: new Date().toISOString()
        })
        .eq('id', proposalId)
      
      if (error) {
        console.error('❌ Proposal update error:', error)
        toast.error('Failed to update proposal')
      } else {
        toast.success('✅ Proposal accepted!')
        await mutate()
      }
    } catch (error: any) {
      toast.error('Error updating proposal')
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-lg text-gray-600">Loading agencies...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen">
      <DynamicBackground page="agencies" />
      
      {/* Debug Panel */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-4 mb-6 shadow-sm">
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <span className="font-mono bg-blue-100 px-3 py-1 rounded-full">
            Agencies: {data?.agencies?.length || 0}
          </span>
          <span className="font-mono bg-emerald-100 px-3 py-1 rounded-full">
            Jobs: {data?.jobs?.length || 0}
          </span>
          <span className="font-mono bg-orange-100 px-3 py-1 rounded-full">
            Proposals: {data?.proposals?.length || 0}
          </span>
          {data?.agencies && data.agencies.length > 0 && (
            <span className="text-xs text-gray-600 truncate max-w-[200px]">
              Latest: {data.agencies[0]?.full_name}
            </span>
          )}
        </div>
      </div>

      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-2">
            Agency Management
          </h1>
          <p className="text-xl text-gray-600">
            {data?.agencies?.length || 0} registered {data?.agencies?.length === 1 ? 'agency' : 'agencies'}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-xl font-bold shadow hover:bg-gray-50 transition-all flex items-center gap-2 disabled:opacity-50">
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <Link href="/auth/register/agency" target="_blank" className="group">
            <button className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white rounded-xl font-bold shadow-lg flex items-center gap-2 transition-all group-hover:shadow-xl">
              <UserPlus className="w-5 h-5 group-hover:scale-110 transition-transform" /> 
              Register New Agency
            </button>
          </Link>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Agencies List */}
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Users className="w-8 h-8 text-blue-600" />
              Available Agencies
            </h2>
            <span className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-full text-sm font-bold">
              {data?.agencies?.length || 0} total
            </span>
          </div>
          
          {data?.agencies && data.agencies.length > 0 ? (
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
              {data.agencies.map((agency: any) => (
                <motion.div
                  key={agency.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ scale: 1.02 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => setSelectedAgency(agency)}
                  className={`bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg cursor-pointer transition-all border-2 hover:shadow-2xl hover:-translate-y-1 ${
                    selectedAgency?.id === agency.id 
                      ? 'border-blue-500 ring-4 ring-blue-500/20 bg-blue-50' 
                      : 'border-transparent hover:border-blue-200'
                  }`}>
                  
                  <div className="flex items-start gap-4">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg ring-2 ring-white/50 ${
                      selectedAgency?.id === agency.id 
                        ? 'bg-gradient-to-br from-blue-500 to-cyan-500' 
                        : 'bg-gradient-to-br from-gray-100 to-gray-200'
                    }`}>
                      <Building2 className={`w-8 h-8 ${
                        selectedAgency?.id === agency.id ? 'text-white' : 'text-gray-600'
                      }`} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xl font-bold text-gray-900 truncate">{agency.full_name}</h3>
                      <p className="text-sm text-gray-600 truncate max-w-[200px]">{agency.email}</p>
                      {agency.company && (
                        <p className="text-sm font-semibold text-blue-600 mt-1 flex items-center gap-2">
                          <Building2 className="w-4 h-4" />
                          {agency.company}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 mt-2">
                        Registered: {new Date(agency.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    
                    {selectedAgency?.id === agency.id && (
                      <div className="flex flex-col items-center gap-1 ml-auto">
                        <UserCheck className="w-8 h-8 text-emerald-500 bg-emerald-100 p-2 rounded-full" />
                        <span className="text-xs font-bold text-emerald-700">Selected</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white/50 backdrop-blur-sm rounded-2xl p-12 text-center shadow-2xl border-2 border-dashed border-gray-300">
              <Building2 className="w-20 h-20 text-gray-400 mx-auto mb-6" />
              <h3 className="text-2xl font-bold text-gray-700 mb-3">No agencies yet</h3>
              <p className="text-gray-600 mb-8">Share the registration link to grow your network</p>
              <Link href="/auth/register/agency" target="_blank">
                <button className="btn-primary px-8 py-3 flex items-center gap-2 mx-auto shadow-lg hover:shadow-xl">
                  <Plus className="w-5 h-5" /> Get First Agency
                </button>
              </Link>
            </motion.div>
          )}
        </div>

        {/* Invite Panel */}
        <div className="lg:sticky lg:top-20 lg:self-start">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 shadow-2xl border border-gray-200">
            <div className="flex items-center gap-3 mb-6">
              <Percent className="w-8 h-8 text-emerald-600 bg-emerald-100 p-2 rounded-xl" />
              <h2 className="text-2xl font-bold text-gray-900">Invite to Job</h2>
            </div>

            {selectedAgency ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mb-8 p-6 bg-gradient-to-r from-emerald-50 to-green-50 rounded-2xl border-2 border-emerald-200">
                <p className="text-sm font-semibold text-emerald-900 mb-3">✅ Selected:</p>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-green-600 rounded-full flex items-center justify-center shadow-lg">
                    <Building2 className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-lg text-emerald-900">{selectedAgency.full_name}</p>
                    <p className="text-sm text-emerald-700">{selectedAgency.company}</p>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="mb-8 p-8 bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl border-2 border-dashed border-gray-300 text-center">
                <Building2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-lg font-semibold text-gray-700 mb-2">Select an agency</p>
                <p className="text-sm text-gray-600">Click any agency above to invite them</p>
              </div>
            )}

            {/* Job Selection */}
            <div className="mb-6">
              <label className="block text-sm font-bold text-gray-900 mb-3">Select Job *</label>
              <select 
                value={selectedJob} 
                onChange={(e) => setSelectedJob(e.target.value)}
                disabled={!selectedAgency}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all bg-white shadow-sm">
                <option value="">Choose a job...</option>
                {data?.jobs?.map((job: any) => (
                  <option key={job.id} value={job.id}>
                    {job.title} • {job.location} • {job.salary_range}
                  </option>
                ))}
              </select>
              {(!data?.jobs || data.jobs.length === 0) && (
                <p className="mt-2 text-sm text-amber-600 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  No open jobs. <Link href="/dashboard/manager/jobs/create" className="font-semibold underline">Create one first</Link>
                </p>
              )}
            </div>

            {/* Commission Slider */}
            <div className="mb-8">
              <label className="block text-sm font-bold text-gray-900 mb-3">Commission (%)</label>
              <div className="relative">
                <input
                  type="range"
                  min="5"
                  max="25"
                  step="1"
                  value={percentage}
                  onChange={(e) => setPercentage(parseInt(e.target.value))}
                  disabled={!selectedAgency || !selectedJob}
                  className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-500 hover:accent-emerald-600"
                />
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-center">
                  <div className="px-4 py-2 bg-gradient-to-br from-emerald-500 to-green-600 text-white text-xl font-bold rounded-xl shadow-lg min-w-[4rem]">
                    {percentage}%
                  </div>
                </div>
              </div>
              <div className="text-xs text-gray-500 mt-2 text-center">
                5% {'→'} {percentage}% {'→'} 25%
              </div>
            </div>

            {/* Send Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleInviteAgency}
              disabled={inviting || !selectedAgency || !selectedJob || data?.jobs?.length === 0}
              className="w-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 disabled:from-gray-400 disabled:to-gray-500 text-white py-4 px-8 rounded-2xl font-bold text-lg shadow-xl hover:shadow-2xl transition-all flex items-center justify-center gap-3 disabled:cursor-not-allowed disabled:shadow-none">
              {inviting ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  Sending Invitation...
                </>
              ) : (
                <>
                  <UserCheck className="w-6 h-6" />
                  Send Invitation ({percentage}%)
                </>
              )}
            </motion.button>

            {inviting && (
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center text-sm text-emerald-700 mt-3 font-medium">
                Creating proposal and sending notification...
              </motion.p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
