'use client'
import { useState, useEffect } from 'react'
import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'
import { Building2, UserCheck, Percent, Plus, Users, Loader2, UserPlus, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react'
import DynamicBackground from '@/components/ui/DynamicBackground'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import Link from 'next/link'

const fetcher = async () => {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const userId = session?.user?.id
  
  if (!userId) throw new Error('No user session')
  
  console.log('✅ Fetching data for user:', userId)
  
  const [agenciesRes, jobsRes, proposalsRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('*, user:auth.users(id)')
      .eq('role', 'agency')
      .order('created_at', { ascending: false }),
    supabase
      .from('jobs')
      .select('*')
      .eq('manager_id', userId)
      .eq('status', 'open'),
    supabase
      .from('commission_proposals')
      .select(`
        *,
        profiles!commission_proposals_agency_id_fkey(full_name, company, email),
        jobs(title, location, salary_min, salary_max)
      `)
      .eq('manager_id', userId)
  ])
  
  console.log('✅ Agencies:', agenciesRes.data?.length || 0)
  console.log('✅ Jobs:', jobsRes.data?.length || 0)
  console.log('✅ Proposals:', proposalsRes.data?.length || 0)
  
  return {
    agencies: agenciesRes.data || [],
    jobs: jobsRes.data || [],
    proposals: proposalsRes.data || []
  }
}

export default function ManagerAgenciesPage() {
  const { data, mutate, error, isLoading } = useSWR('manager-agencies', fetcher, {
    refreshInterval: 10000,
    revalidateOnFocus: true
  })
  
  const [selectedAgency, setSelectedAgency] = useState<any>(null)
  const [selectedJob, setSelectedJob] = useState('')
  const [percentage, setPercentage] = useState(15)
  const [inviting, setInviting] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const handleInviteAgency = async () => {
    if (!selectedAgency?.id || !selectedJob) {
      toast.error('Please select both agency and job')
      return
    }

    setInviting(true)
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const userId = session?.user?.id

      if (!userId) {
        toast.error('Session expired. Please refresh.')
        return
      }

      // ✅ FIXED: UPSERT prevents 409 conflicts & FK violations
      const { data: existing, error: checkError } = await supabase
        .from('commission_proposals')
        .select('id')
        .eq('job_id', selectedJob)
        .eq('agency_id', selectedAgency.id)
        .eq('manager_id', userId)
        .maybeSingle()

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError
      }

      if (existing) {
        toast.success('✅ Proposal already exists!')
        await mutate()
        return
      }

      const { error } = await supabase
        .from('commission_proposals')
        .upsert({
          job_id: selectedJob,
          agency_id: selectedAgency.id,
          manager_id: userId,
          manager_percentage: percentage,
          status: 'pending',
          created_at: new Date().toISOString()
        }, { 
          onConflict: 'job_id,agency_id,manager_id',
          ignoreDuplicates: true 
        })

      if (error) {
        console.error('❌ Insert error:', error)
        if (error.code === '23503') {
          toast.error('User not found in auth.users. Contact support.')
        } else if (error.code === '23505') {
          toast.success('✅ Proposal already sent!')
        } else {
          toast.error(`Database error: ${error.message}`)
        }
        return
      }

      // Send notification
      await supabase.from('notifications').upsert({
        user_id: selectedAgency.id,
        type: 'commission_proposal',
        title: 'New Job Invitation',
        message: `${percentage}% commission proposal from manager`,
        data: { job_id: selectedJob, percentage }
      })

      toast.success(`✅ Sent ${percentage}% invite to ${selectedAgency.full_name}!`)
      setSelectedAgency(null)
      setSelectedJob('')
      setPercentage(15)
      await mutate()

    } catch (error: any) {
      console.error('💥 Send invite error:', error)
      toast.error(error.message || 'Failed to send invite')
    } finally {
      setInviting(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await mutate()
    toast.success('✅ Data refreshed!')
    setRefreshing(false)
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center p-12">
          <AlertCircle className="w-24 h-24 text-red-500 mx-auto mb-8" />
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Failed to load data</h2>
          <p className="text-xl text-gray-600 mb-8">{error.message}</p>
          <button 
            onClick={handleRefresh}
            className="px-8 py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-16 h-16 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <DynamicBackground page="manager-agencies" />
      
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-12"
        >
          <div>
            <h1 className="text-5xl md:text-6xl font-black bg-gradient-to-r from-gray-900 via-gray-800 to-black bg-clip-text text-transparent mb-4">
              Agency Network
            </h1>
            <p className="text-2xl text-gray-600 font-semibold">
              {data?.agencies.length || 0} agencies • {data?.jobs.length || 0} open jobs • {data?.proposals.length || 0} proposals
            </p>
          </div>
          
          <div className="flex flex-wrap gap-4">
            <motion.button
              whileHover={{ scale: 1.05 }}
              onClick={handleRefresh}
              disabled={refreshing || isLoading}
              className="px-8 py-4 bg-white/80 backdrop-blur border border-gray-200 shadow-xl rounded-3xl font-bold text-lg hover:shadow-2xl transition-all flex items-center gap-3 disabled:opacity-50"
            >
              <RefreshCw className={`w-6 h-6 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </motion.button>
            
            <Link href="/auth/register/agency" target="_blank" rel="noopener noreferrer">
              <motion.button
                whileHover={{ scale: 1.05 }}
                className="px-8 py-4 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white rounded-3xl font-bold text-lg shadow-2xl hover:shadow-3xl transition-all flex items-center gap-3"
              >
                <UserPlus className="w-6 h-6" />
                New Agency
              </motion.button>
            </Link>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white/70 backdrop-blur-xl p-10 rounded-3xl shadow-2xl border border-white/50 hover:shadow-3xl transition-all"
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-2xl">
                <Users className="w-10 h-10 text-white" />
              </div>
              <div>
                <p className="text-4xl font-black text-gray-900">{data?.agencies.length || 0}</p>
                <p className="text-xl text-gray-600 font-semibold">Agencies</p>
              </div>
            </div>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white/70 backdrop-blur-xl p-10 rounded-3xl shadow-2xl border border-white/50 hover:shadow-3xl transition-all"
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center shadow-2xl">
                <Percent className="w-10 h-10 text-white" />
              </div>
              <div>
                <p className="text-4xl font-black text-gray-900">
                  {data?.proposals?.filter((p: any) => p.status === 'pending').length || 0}
                </p>
                <p className="text-xl text-gray-600 font-semibold">Pending</p>
              </div>
            </div>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white/70 backdrop-blur-xl p-10 rounded-3xl shadow-2xl border border-white/50 hover:shadow-3xl
