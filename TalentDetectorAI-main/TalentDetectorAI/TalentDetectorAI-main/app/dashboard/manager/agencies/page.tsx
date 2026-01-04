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
  
  if (!userId) return { agencies: [], jobs: [], proposals: [] }
  
  const [agenciesRes, jobsRes, proposalsRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('role', 'agency').order('created_at', { ascending: false }),
    supabase.from('jobs').select('*').eq('manager_id', userId).eq('status', 'open'),
    supabase.from('commission_proposals').select(`
      *,
      profiles!commission_proposals_agency_id_fkey(full_name, company, email),
      jobs(title, location)
    `).eq('manager_id', userId)
  ])
  
  return {
    agencies: agenciesRes.data || [],
    jobs: jobsRes.data || [],
    proposals: proposalsRes.data || []
  }
}

export default function AgenciesPage() {
  const { data, mutate, isLoading } = useSWR('manager-agencies', fetcher)
  const [selectedAgency, setSelectedAgency] = useState<any>(null)
  const [selectedJob, setSelectedJob] = useState('')
  const [percentage, setPercentage] = useState(15)
  const [inviting, setInviting] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  // ✅ FIXED: Duplicate check + upsert
  async function handleInviteAgency() {
    if (!selectedAgency || !selectedJob) {
      toast.error('Please select both agency and job')
      return
    }

    setInviting(true)
    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const userId = session?.user?.id

      if (!userId) {
        toast.error('Session expired. Please refresh and try again.')
        return
      }

      console.log('🚀 Creating proposal:', {
        job_id: selectedJob,
        agency_id: selectedAgency.id,
        manager_id: userId,
        percentage
      })

      // ✅ FIXED: Use UPSERT to avoid 409 conflicts
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
          onConflict: 'job_id,agency_id,manager_id'  // ✅ Prevents duplicates
        })

      if (error) {
        console.error('❌ Database error:', error)
        if (error.code === '23503') {
          toast.error('Manager ID not found. Please refresh page.')
        } else if (error.code === '23505') {
          toast.success('✅ Proposal already exists!')
        } else {
          toast.error(`Error: ${error.message}`)
        }
        return
      }

      // Notification
      await supabase.from('notifications').upsert({
        user_id: selectedAgency.id,
        type: 'commission_proposal',
        title: 'New Job Invitation',
        message: `${percentage}% commission proposal from ${data?.agencies?.find((a: any) => a.id === userId)?.full_name}`,
        data: { job_id: selectedJob, percentage }
      })

      toast.success(`✅ Sent ${percentage}% invite to ${selectedAgency.full_name}!`)
      setSelectedAgency(null)
      setSelectedJob('')
      setPercentage(15)
      await mutate()

    } catch (error: any) {
      console.error('💥 Full error:', error)
      toast.error(error.message || 'Failed to send invite')
    } finally {
      setInviting(false)
    }
  }

  async function handleRefresh() {
    setRefreshing(true)
    await mutate()
    toast.success('✅ Refreshed!')
    setRefreshing(false)
  }

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-12 h-12 animate-spin" /></div>
  }

  return (
    <div className="min-h-screen">
      <DynamicBackground page="agencies" />
      
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-12">
          <div>
            <h1 className="text-5xl font-black bg-gradient-to-r from-gray-900 via-gray-800 to-black bg-clip-text text-transparent mb-4">
              Agency Network
            </h1>
            <p className="text-2xl text-gray-600 font-semibold">
              {data?.agencies.length || 0} agencies • {data?.jobs.length || 0} open jobs
            </p>
          </div>
          
          <div className="flex flex-wrap gap-4">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="px-8 py-4 bg-white/80 backdrop-blur border border-gray-200 shadow-xl rounded-3xl font-bold text-lg hover:shadow-2xl transition-all flex items-center gap-3">
              <RefreshCw className={`w-6 h-6 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <Link href="/auth/register/agency" target="_blank">
              <button className="px-8 py-4 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white rounded-3xl font-bold text-lg shadow-2xl hover:shadow-3xl flex items-center gap-3 transition-all">
                <UserPlus className="w-6 h-6" />
                New Agency
              </button>
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white/70 backdrop-blur p-8 rounded-3xl shadow-2xl border border-white/50">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-xl">
                <Users className="w-8 h-8 text-white" />
              </div>
              <div>
                <p className="text-3xl font-black text-gray-900">{data?.agencies.length || 0}</p>
                <p className="text-lg text-gray-600 font-semibold">Agencies</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white/70 backdrop-blur p-8 rounded-3xl shadow-2xl border border-white/50">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center shadow-xl">
                <Percent className="w-8 h-8 text-white" />
              </div>
              <div>
                <p className="text-3xl font-black text-gray-900">{data?.proposals?.filter((p: any) => p.status === 'pending').length || 0}</p>
                <p className="text-lg text-gray-600 font-semibold">Pending</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white/70 backdrop-blur p-8 rounded-3xl shadow-2xl border border-white/50">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl flex items-center justify-center shadow-xl">
                <Building2 className="w-8 h-8 text-white" />
              </div>
              <div>
                <p className="text-3xl font-black text-gray-900">{data?.jobs.length || 0}</p>
                <p className="text-lg text-gray-600 font-semibold">Open Jobs</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid xl:grid-cols-3 gap-8">
          {/* Agencies */}
          <div className="xl:col-span-2">
            <div className="bg-white/80 backdrop-blur p-8 rounded-3xl shadow-2xl border border-white/50 mb-8">
              <h2 className="text-3xl font-black mb-8 flex items-center gap-4">
                <Users className="w-10 h-10 text-blue-600" />
                Registered Agencies
              </h2>
              
              {data?.agencies.length ? (
                <div className="grid md:grid-cols-2 gap-6">
                  {data.agencies.map((agency: any) => (
                    <motion.div
                      key={agency.id}
                      whileHover={{ scale: 1.02 }}
                      onClick={() => setSelectedAgency(agency)}
                      className={`p-8 rounded-3xl cursor-pointer transition-all border-4 shadow-xl group ${
                        selectedAgency?.id === agency.id
                          ? 'border-blue-500 bg-blue-50 shadow-2xl'
                          : 'border-transparent hover:border-blue-200 hover:shadow-2xl'
                      }`}>
                      <div className="flex items-start gap-6">
                        <div className={`w-20 h-20 rounded-2xl flex items-center justify-center shadow-2xl flex-shrink-0 group-hover:scale-110 transition-transform ${
                          selectedAgency?.id === agency.id
                            ? 'bg-gradient-to-br from-blue-500 to-cyan-500'
                            : 'bg-gradient-to-br from-gray-100 to-gray-200'
                        }`}>
                          <Building2 className={`w-10 h-10 ${
                            selectedAgency?.id === agency.id ? 'text-white' : 'text-gray-600'
                          }`} />
                        </div>
                        
                        <div className="flex-1">
                          <h3 className="text-2xl font-black text-gray-900 mb-2">{agency.full_name}</h3>
                          <p className="text-lg text-gray-700 mb-3">{agency.email}</p>
                          {agency.company && (
                            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold mb-4">
                              <Building2 className="w-4 h-4" />
                              {agency.company}
                            </div>
                          )}
                          <p className="text-sm text-gray-500">
                            Joined {new Date(agency.created_at).toLocaleDateString()}
                          </p>
                          
                          {selectedAgency?.id === agency.id && (
                            <div className="mt-4 flex items-center gap-3 p-3 bg-emerald-100 rounded-2xl">
                              <CheckCircle className="w-6 h-6 text-emerald-600" />
                              <span className="font-bold text-emerald-800">Ready to invite</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-24">
                  <Building2 className="w-24 h-24 text-gray-300 mx-auto mb-8" />
                  <h3 className="text-2xl font-bold text-gray-600 mb-4">No agencies yet</h3>
                  <p className="text-lg text-gray-500 mb-8">Invite agencies to join your network</p>
                  <Link href="/auth/register/agency" target="_blank">
                    <button className="px-12 py-4 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-3xl font-bold text-xl shadow-2xl hover:shadow-3xl">
                      Invite First Agency
                    </button>
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Invite Panel */}
          <div>
            <div className="bg-white/80 backdrop-blur sticky top-24 p-8 rounded-3xl shadow-2xl border border-white/50">
              <h2 className="text-3xl font-black mb-8 flex items-center gap-3">
                <UserPlus className="w-10 h-10 text-emerald-600" />
                Send Invitation
              </h2>

              {selectedAgency ? (
                <>
                  {/* Selected Agency Preview */}
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8 p-6 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-3xl border-2 border-emerald-200 shadow-xl">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center shadow-2xl">
                        <Building2 className="w-8 h-8 text-white" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-emerald-900">{selectedAgency.full_name}</h3>
                        <p className="text-lg text-emerald-800">{selectedAgency.company}</p>
                      </div>
                    </div>
                  </motion.div>

                  {/* Job Selector */}
                  <div className="mb-8">
                    <label className="block text-xl font-bold mb-4">Select Job</label>
                    <select 
                      value={selectedJob} 
                      onChange={e => setSelectedJob(e.target.value)}
                      className="w-full p-4 border-2 border-gray-200 rounded-2xl text-lg font-semibold focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/20 shadow-inner">
                      <option value="">Choose job...</option>
                      {data?.jobs.map((job: any) => (
                        <option key={job.id} value={job.id}>
                          {job.title} • {job.location}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Percentage Slider */}
                  <div className="mb-10">
                    <label className="block text-xl font-bold mb-6 flex items-center gap-3">
                      Commission Rate
                      <span className="text-3xl font-black text-emerald-600">{percentage}%</span>
                    </label>
                    <input
                      type="range"
                      min="5" max="30" step="1"
                      value={percentage}
                      onChange={e => setPercentage(Number(e.target.value))}
                      className="w-full h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded-2xl appearance-none cursor-pointer accent-emerald-500 shadow-lg"
                    />
                    <div className="flex justify-between text-sm text-gray-500 mt-3">
                      <span>5%</span>
                      <span>15%</span>
                      <span>30%</span>
                    </div>
                  </div>

                  {/* Send Button */}
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleInviteAgency}
                    disabled={inviting || !selectedJob}
                    className="w-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 disabled:from-gray-400 disabled:to-gray-500 text-white py-6 px-8 rounded-3xl font-black text-xl shadow-2xl hover:shadow-3xl transition-all flex items-center justify-center gap-4 disabled:cursor-not-allowed">
                    {inviting ? (
                      <>
                        <Loader2 className="w-8 h-8 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <UserCheck className="w-8 h-8" />
                        Send {percentage}% Invite
                      </>
                    )}
                  </motion.button>
                </>
              ) : (
                <div className="text-center py-20">
                  <UserPlus className="w-24 h-24 text-gray-300 mx-auto mb-8 animate-pulse" />
                  <h3 className="text-2xl font-bold text-gray-600 mb-4">Select an agency</h3>
                  <p className="text-lg text-gray-500 mb-8">Click any agency above to send them a job invitation</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
