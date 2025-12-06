'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  Sparkles, Award, Loader2, Send, ArrowLeft, RefreshCw,
  ArrowRight, Eye, FileText, CheckCircle, Mail, Calendar, Zap,
  Users, AlertCircle
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import toast from 'react-hot-toast'
import DynamicBackground from '@/components/ui/DynamicBackground'

export default function AgencyInterestsPage() {
  const [interests, setInterests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [debugInfo, setDebugInfo] = useState<string>('')

  useEffect(() => {
    console.log('🚀 Component mounted')
    loadInterests()
    
    const supabase = createClient()
    
    console.log('📡 Setting up real-time subscription...')
    const channel = supabase
      .channel('realtime-interests')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'candidate_interests' },
        (payload) => {
          console.log('🔔 Real-time update received:', payload)
          loadInterests()
        }
      )
      .subscribe((status) => {
        console.log('📡 Subscription status:', status)
      })

    const interval = setInterval(() => {
      console.log('🔄 Auto-refresh triggered')
      loadInterests()
    }, 5000)

    return () => {
      console.log('🔌 Cleaning up subscriptions')
      channel.unsubscribe()
      clearInterval(interval)
    }
  }, [])

  async function loadInterests() {
    try {
      console.log('📥 Loading interests...')
      setDebugInfo('Loading...')
      
      const supabase = createClient()
      
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError) {
        console.error('❌ User error:', userError)
        setDebugInfo(`User error: ${userError.message}`)
        throw userError
      }
      
      if (!user) {
        console.error('❌ No user logged in')
        setDebugInfo('No user logged in')
        toast.error('Please log in')
        return
      }

      console.log('✅ User ID:', user.id)
      setDebugInfo(`Loading for user: ${user.id}`)

      const { data, error } = await supabase
        .from('candidate_interests')
        .select(`
          *,
          candidates(id, name, email, phone, location, user_id, skills),
          jobs(id, title, location, salary_min, salary_max, employment_type)
        `)
        .eq('agency_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('❌ Fetch error:', error)
        setDebugInfo(`Fetch error: ${error.message}`)
        throw error
      }

      console.log('✅ Loaded interests:', data?.length || 0)
      console.log('📊 Data:', data)
      
      if (!data || data.length === 0) {
        setDebugInfo('No interests found for this user')
        console.warn('⚠️ No interests found')
      } else {
        setDebugInfo(`✅ Loaded ${data.length} interests successfully`)
        console.log('📊 Sample interest:', data[0])
        const cvCount = data.filter(i => i.cv_url).length
        console.log(`📄 ${cvCount}/${data.length} candidates uploaded CVs`)
      }

      setInterests(data || [])
      setLastUpdate(new Date())
    } catch (error: any) {
      console.error('❌ Load error:', error)
      setDebugInfo(`Error: ${error.message}`)
      toast.error(`Failed to load: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const stats = {
    total: interests.length,
    viewed: interests.filter(i => i.viewed_by_candidate).length,
    cvs: interests.filter(i => i.cv_url).length,
    interested: interests.filter(i => i.status === 'interested').length,
    needsRTR: interests.filter(i => i.cv_url && i.status === 'interested' && !i.right_to_represent_url).length,
    completed: interests.filter(i => i.right_to_represent_signed).length
  }

  console.log('📊 Stats:', stats)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="text-center">
          <Loader2 className="w-16 h-16 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 font-bold text-xl">Loading interests...</p>
          <p className="text-gray-500 text-sm mt-2">{debugInfo}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen p-8">
      <DynamicBackground page="agency-interests" />
      
      <div className="max-w-7xl mx-auto relative z-10">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent mb-3 flex items-center gap-3">
              <Sparkles className="w-12 h-12 text-blue-600" />
              Candidate Interests
            </h1>
            <p className="text-xl text-gray-600">
              🔄 Real-time updates • Last: {lastUpdate.toLocaleTimeString()}
            </p>
            <p className="text-sm text-gray-500 mt-1">Debug: {debugInfo}</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={loadInterests}
              className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center gap-2 transition shadow-lg">
              <RefreshCw className="w-5 h-5" />
              Refresh
            </button>
            <Link href="/dashboard/agency">
              <button className="px-6 py-3 bg-gray-200 rounded-xl font-bold flex items-center gap-2 hover:bg-gray-300 transition">
                <ArrowLeft className="w-5 h-5" />
                Back
              </button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
          <motion.div whileHover={{ scale: 1.05 }} className="bg-white rounded-2xl p-4 shadow-lg text-center">
            <Send className="w-8 h-8 text-blue-600 mx-auto mb-2" />
            <p className="text-4xl font-bold">{stats.total}</p>
            <p className="text-xs text-gray-600 font-bold">Total</p>
          </motion.div>
          <motion.div whileHover={{ scale: 1.05 }} className="bg-white rounded-2xl p-4 shadow-lg text-center">
            <Eye className="w-8 h-8 text-blue-600 mx-auto mb-2" />
            <p className="text-4xl font-bold text-blue-600">{stats.viewed}</p>
            <p className="text-xs text-gray-600 font-bold">Viewed</p>
          </motion.div>
          <motion.div whileHover={{ scale: 1.05 }} className="bg-white rounded-2xl p-4 shadow-lg text-center">
            <FileText className="w-8 h-8 text-purple-600 mx-auto mb-2" />
            <p className="text-4xl font-bold text-purple-600">{stats.cvs}</p>
            <p className="text-xs text-gray-600 font-bold">CVs</p>
          </motion.div>
          <motion.div whileHover={{ scale: 1.05 }} className="bg-white rounded-2xl p-4 shadow-lg text-center">
            <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <p className="text-4xl font-bold text-green-600">{stats.interested}</p>
            <p className="text-xs text-gray-600 font-bold">Interested</p>
          </motion.div>
          <motion.div whileHover={{ scale: 1.05 }} className="bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-2xl p-4 shadow-lg text-center">
            <Zap className="w-8 h-8 mx-auto mb-2" />
            <p className="text-4xl font-bold">{stats.needsRTR}</p>
            <p className="text-xs font-bold">Need RTR</p>
          </motion.div>
          <motion.div whileHover={{ scale: 1.05 }} className="bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-2xl p-4 shadow-lg text-center">
            <Award className="w-8 h-8 mx-auto mb-2" />
            <p className="text-4xl font-bold">{stats.completed}</p>
            <p className="text-xs font-bold">Signed</p>
          </motion.div>
        </div>

        {stats.needsRTR > 0 && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mb-8 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-white rounded-3xl p-8 shadow-2xl border-4 border-amber-300">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-xl">
                <Zap className="w-10 h-10 animate-pulse" />
              </div>
              <div className="flex-1">
                <h3 className="text-3xl font-black mb-3">⚡ {stats.needsRTR} CANDIDATE{stats.needsRTR > 1 ? 'S' : ''} READY FOR RTR!</h3>
                <p className="text-xl text-amber-100 font-semibold">Click on candidates below to generate and send RTR agreements for signing</p>
              </div>
            </div>
          </motion.div>
        )}

        {interests.filter(i => i.candidate_acceptance_status === 'pending_response').length > 0 && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mb-8 bg-gradient-to-r from-yellow-400 to-yellow-500 text-yellow-900 rounded-3xl p-8 shadow-2xl border-4 border-yellow-300">
            <div className="flex items-center gap-6">
              <AlertCircle className="w-12 h-12" />
              <div>
                <h3 className="text-2xl font-black">⏳ {interests.filter(i => i.candidate_acceptance_status === 'pending_response').length} Candidate{interests.filter(i => i.candidate_acceptance_status === 'pending_response').length > 1 ? 's' : ''} Awaiting Response</h3>
                <p className="text-lg font-semibold mt-1">Candidates have been invited but haven't responded yet</p>
              </div>
            </div>
          </motion.div>
        )}

        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {interests.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white rounded-2xl p-20 text-center shadow-lg">
                <Users className="w-32 h-32 text-gray-300 mx-auto mb-8" />
                <h3 className="text-3xl font-bold mb-4">No Interests Yet</h3>
                <p className="text-xl text-gray-600 mb-4">Candidates you invite will appear here</p>
                <p className="text-sm text-gray-500">Debug info: {debugInfo}</p>
              </motion.div>
            ) : (
              interests.map((interest: any, index: number) => {
                const candidate = interest.candidates
                const job = interest.jobs
                const needsRTR = interest.cv_url && interest.status === 'interested' && !interest.right_to_represent_url

                return (
                  <motion.div key={interest.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ delay: index * 0.05 }} whileHover={{ scale: 1.02, y: -4 }} className="relative">
                    <Link href={`/dashboard/agency/interests/${interest.id}`}>
                      <div className={`bg-white rounded-2xl p-6 shadow-lg border-2 cursor-pointer transition-all ${needsRTR ? 'border-amber-400 shadow-amber-200 hover:shadow-2xl' : 'border-gray-200 hover:border-blue-400 hover:shadow-xl'}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 flex-1">
                            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-full flex items-center justify-center text-white font-bold text-2xl shadow-lg">
                              {candidate?.name?.[0] || '?'}
                            </div>
                            
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="text-2xl font-bold text-gray-900">{candidate?.name || 'Unknown'}</h3>
                                {needsRTR && (
                                  <span className="px-3 py-1 bg-amber-500 text-white rounded-full text-xs font-bold animate-pulse">⚡ CLICK TO GENERATE RTR</span>
                                )}
                              </div>
                              <p className="text-gray-600 mb-3 text-lg">{job?.title || 'No title'}</p>
                              
                              <div className="flex flex-wrap gap-3 mb-3">
                                {interest.status === 'interested' && (
                                  <span className="px-4 py-2 bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 rounded-full text-xs font-bold shadow-sm border border-green-200 flex items-center gap-2">
                                    <CheckCircle className="w-4 h-4" />
                                    Interested
                                  </span>
                                )}
                                {interest.candidate_acceptance_status === 'pending_response' && (
                                  <span className="px-4 py-2 bg-yellow-100 text-yellow-800 rounded-full text-xs font-bold shadow-sm border border-yellow-200 flex items-center gap-2 animate-pulse">
                                    <AlertCircle className="w-4 h-4" />
                                    Awaiting Response
                                  </span>
                                )}
                                {interest.cv_url && (
                                  <span className="px-4 py-2 bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-800 rounded-full text-xs font-bold shadow-sm border border-purple-200 flex items-center gap-2">
                                    <FileText className="w-4 h-4" />
                                    CV Uploaded
                                  </span>
                                )}
                                {interest.ai_match_score && (
                                  <span className="px-4 py-2 bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-800 rounded-full text-xs font-bold shadow-sm border border-emerald-200 flex items-center gap-2">
                                    <Award className="w-4 h-4" />
                                    {interest.ai_match_score}% Match
                                  </span>
                                )}
                                {interest.right_to_represent_url && !interest.right_to_represent_signed && (
                                  <span className="px-4 py-2 bg-gradient-to-r from-orange-100 to-amber-100 text-orange-800 rounded-full text-xs font-bold shadow-sm border border-orange-200 flex items-center gap-2 animate-pulse">
                                    <Zap className="w-4 h-4" />
                                    RTR Pending
                                  </span>
                                )}
                                {interest.right_to_represent_signed && (
                                  <span className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-full text-xs font-bold shadow-sm flex items-center gap-2">
                                    <CheckCircle className="w-4 h-4" />
                                    RTR Signed ✓
                                  </span>
                                )}
                              </div>
                              
                              <div className="flex items-center gap-4 text-sm text-gray-600">
                                <span className="flex items-center gap-1">
                                  <Mail className="w-4 h-4" />
                                  {candidate?.email || 'No email'}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-4 h-4" />
                                  {new Date(interest.created_at).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          </div>

                          <ArrowRight className="w-10 h-10 text-blue-600 flex-shrink-0 ml-4" />
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                )
              })
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
