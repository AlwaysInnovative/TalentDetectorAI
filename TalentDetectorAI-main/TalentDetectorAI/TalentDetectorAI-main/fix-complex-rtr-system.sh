#!/bin/bash
# Fix Complex Real-Time RTR System with Debugging
# Run: bash fix-complex-rtr-system.sh

set -e

echo "🔧 Fixing Complex Real-Time RTR System..."

mkdir -p app/dashboard/agency/interests/[id]
mkdir -p app/api/generate-rtr-auto

# ==================== 1. FIXED COMPLEX INTERESTS PAGE WITH DEBUGGING ====================

cat > app/dashboard/agency/interests/page.tsx << 'ENDFILE'
'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  Sparkles, Award, Loader2, Send, ArrowLeft, RefreshCw,
  ArrowRight, Eye, FileText, CheckCircle, Mail, Calendar, Zap,
  Users
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
    
    // Real-time subscription
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

    // Polling fallback every 5 seconds
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
        setDebugInfo(`Loaded ${data.length} interests successfully`)
        console.log('✅ First interest:', data[0])
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
        {/* Header */}
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

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="bg-white rounded-2xl p-4 shadow-lg text-center">
            <Send className="w-8 h-8 text-blue-600 mx-auto mb-2" />
            <p className="text-4xl font-bold">{stats.total}</p>
            <p className="text-xs text-gray-600 font-bold">Total</p>
          </motion.div>
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="bg-white rounded-2xl p-4 shadow-lg text-center">
            <Eye className="w-8 h-8 text-blue-600 mx-auto mb-2" />
            <p className="text-4xl font-bold text-blue-600">{stats.viewed}</p>
            <p className="text-xs text-gray-600 font-bold">Viewed</p>
          </motion.div>
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="bg-white rounded-2xl p-4 shadow-lg text-center">
            <FileText className="w-8 h-8 text-purple-600 mx-auto mb-2" />
            <p className="text-4xl font-bold text-purple-600">{stats.cvs}</p>
            <p className="text-xs text-gray-600 font-bold">CVs</p>
          </motion.div>
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="bg-white rounded-2xl p-4 shadow-lg text-center">
            <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <p className="text-4xl font-bold text-green-600">{stats.interested}</p>
            <p className="text-xs text-gray-600 font-bold">Interested</p>
          </motion.div>
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-2xl p-4 shadow-lg text-center">
            <Zap className="w-8 h-8 mx-auto mb-2" />
            <p className="text-4xl font-bold">{stats.needsRTR}</p>
            <p className="text-xs font-bold">Need RTR</p>
          </motion.div>
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className="bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-2xl p-4 shadow-lg text-center">
            <Award className="w-8 h-8 mx-auto mb-2" />
            <p className="text-4xl font-bold">{stats.completed}</p>
            <p className="text-xs font-bold">Signed</p>
          </motion.div>
        </div>

        {/* Action Banner */}
        {stats.needsRTR > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-8 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center gap-4">
              <Zap className="w-12 h-12 animate-pulse" />
              <div className="flex-1">
                <h3 className="text-2xl font-bold mb-2">
                  ⚡ {stats.needsRTR} Candidate{stats.needsRTR > 1 ? 's' : ''} Ready for RTR!
                </h3>
                <p className="text-amber-100">
                  Click on candidates below to generate and send RTR agreements
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Clickable Interests List */}
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {interests.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-white rounded-2xl p-20 text-center shadow-lg">
                <Users className="w-32 h-32 text-gray-300 mx-auto mb-8" />
                <h3 className="text-3xl font-bold mb-4">No Interests Yet</h3>
                <p className="text-xl text-gray-600 mb-4">
                  Candidates you invite will appear here
                </p>
                <p className="text-sm text-gray-500">
                  Debug info: {debugInfo}
                </p>
              </motion.div>
            ) : (
              interests.map((interest: any, index: number) => {
                const candidate = interest.candidates
                const job = interest.jobs
                const needsRTR = interest.cv_url && interest.status === 'interested' && !interest.right_to_represent_url

                console.log(`Card ${index}:`, {
                  id: interest.id,
                  candidate: candidate?.name,
                  job: job?.title,
                  needsRTR
                })

                return (
                  <motion.div
                    key={interest.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ scale: 1.02, y: -4 }}
                    className="relative">
                    <Link href={`/dashboard/agency/interests/${interest.id}`}>
                      <div
                        className={`bg-white rounded-2xl p-6 shadow-lg border-2 cursor-pointer transition-all ${
                          needsRTR 
                            ? 'border-amber-400 shadow-amber-200 hover:shadow-2xl' 
                            : 'border-gray-200 hover:border-blue-400 hover:shadow-xl'
                        }`}>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 flex-1">
                            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-full flex items-center justify-center text-white font-bold text-2xl shadow-lg">
                              {candidate?.name?.[0] || '?'}
                            </div>
                            
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h3 className="text-2xl font-bold text-gray-900">
                                  {candidate?.name || 'Unknown'}
                                </h3>
                                {needsRTR && (
                                  <span className="px-3 py-1 bg-amber-500 text-white rounded-full text-xs font-bold animate-pulse">
                                    ⚡ CLICK TO GENERATE RTR
                                  </span>
                                )}
                              </div>
                              <p className="text-gray-600 mb-3 text-lg">{job?.title || 'No title'}</p>
                              
                              <div className="flex flex-wrap gap-2 mb-2">
                                {interest.status === 'interested' && (
                                  <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-bold">
                                    <CheckCircle className="w-4 h-4 inline mr-1" />
                                    Interested
                                  </span>
                                )}
                                {interest.cv_url && (
                                  <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-bold">
                                    <FileText className="w-4 h-4 inline mr-1" />
                                    CV Uploaded
                                  </span>
                                )}
                                {interest.ai_match_score && (
                                  <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-bold">
                                    <Award className="w-4 h-4 inline mr-1" />
                                    {interest.ai_match_score}% Match
                                  </span>
                                )}
                                {interest.right_to_represent_signed && (
                                  <span className="px-3 py-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-full text-sm font-bold">
                                    ✓ RTR Signed
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
ENDFILE

echo "✅ Fixed complex interests page with debugging"

# ==================== 2. FIXED COMPLEX DETAIL PAGE ====================

cat > app/dashboard/agency/interests/[id]/page.tsx << 'ENDFILE'
'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { 
  Loader2, Download, FileText, CheckCircle, Zap, ArrowLeft,
  Mail, Phone, MapPin, Calendar, Award, Sparkles, AlertCircle
} from 'lucide-react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import Link from 'next/link'
import DynamicBackground from '@/components/ui/DynamicBackground'

export default function InterestDetailPage({ params }: { params: { id: string } }) {
  const [interest, setInterest] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [generatingRTR, setGeneratingRTR] = useState(false)
  const router = useRouter()

  useEffect(() => {
    console.log('📄 Detail page loaded for ID:', params.id)
    loadInterest()
    
    // Real-time updates
    const supabase = createClient()
    const channel = supabase
      .channel(`interest-${params.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'candidate_interests',
          filter: `id=eq.${params.id}`
        },
        (payload) => {
          console.log('🔔 Interest updated:', payload)
          loadInterest()
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [params.id])

  async function loadInterest() {
    try {
      console.log('📥 Loading interest details...')
      const supabase = createClient()
      
      const { data, error } = await supabase
        .from('candidate_interests')
        .select(`
          *,
          candidates(id, name, email, phone, location, user_id, skills),
          jobs(id, title, location, salary_min, salary_max, employment_type),
          candidate_interest_responses(*)
        `)
        .eq('id', params.id)
        .single()

      if (error) {
        console.error('❌ Load error:', error)
        throw error
      }

      console.log('✅ Interest loaded:', data)
      setInterest(data)
    } catch (error: any) {
      console.error('❌ Failed to load:', error)
      toast.error('Failed to load interest')
    } finally {
      setLoading(false)
    }
  }

  async function handleGenerateRTR() {
    console.log('🚀 === GENERATING RTR ===')
    console.log('Interest ID:', params.id)
    console.log('Interest data:', interest)
    
    setGeneratingRTR(true)
    
    try {
      console.log('📡 Calling API...')
      const response = await fetch('/api/generate-rtr-auto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interestId: params.id })
      })

      const result = await response.json()
      console.log('📥 API Response:', result)

      if (!response.ok) {
        console.error('❌ API Error:', result)
        throw new Error(result.error || 'Failed to generate RTR')
      }

      console.log('✅ RTR generated successfully')
      toast.success(`✅ RTR sent to ${interest.candidates.name}!`, {
        duration: 5000,
        icon: '📄'
      })
      
      await loadInterest()
      
    } catch (error: any) {
      console.error('❌ RTR Generation Error:', error)
      toast.error(`Failed: ${error.message}`, { duration: 6000 })
    } finally {
      setGeneratingRTR(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-16 h-16 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!interest) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-4">Interest Not Found</h2>
          <Link href="/dashboard/agency/interests">
            <button className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold">
              Back to Interests
            </button>
          </Link>
        </div>
      </div>
    )
  }

  const candidate = interest.candidates
  const job = interest.jobs
  const canGenerateRTR = interest.status === 'interested' && 
                         interest.cv_url && 
                         !interest.right_to_represent_url

  console.log('🎯 Can generate RTR:', canGenerateRTR)
  console.log('Status:', interest.status)
  console.log('Has CV:', !!interest.cv_url)
  console.log('Has RTR:', !!interest.right_to_represent_url)

  return (
    <div className="relative min-h-screen p-8">
      <DynamicBackground page="interest-detail" />
      
      <div className="max-w-6xl mx-auto relative z-10">
        <Link href="/dashboard/agency/interests">
          <button className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-8 font-bold transition">
            <ArrowLeft className="w-5 h-5" />
            Back to Interests
          </button>
        </Link>

        {/* Action Banner */}
        {canGenerateRTR && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-2xl p-8 shadow-2xl">
            <div className="flex items-center gap-4">
              <Zap className="w-16 h-16 animate-pulse" />
              <div className="flex-1">
                <h3 className="text-3xl font-bold mb-2">⚡ Ready to Generate RTR!</h3>
                <p className="text-amber-100 text-lg">
                  {candidate.name} is interested and uploaded their CV. Click below to generate RTR.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        <div className="grid md:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="md:col-span-2">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl p-8 shadow-xl border-2 border-gray-200">
              <div className="flex items-center gap-6 mb-6">
                <div className="w-24 h-24 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-full flex items-center justify-center text-white font-bold text-4xl shadow-lg">
                  {candidate.name[0]}
                </div>
                <div className="flex-1">
                  <h1 className="text-4xl font-bold text-gray-900 mb-2">{candidate.name}</h1>
                  <p className="text-xl text-gray-600 mb-3">{job.title}</p>
                  <div className="flex gap-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                      interest.status === 'interested' ? 'bg-green-100 text-green-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {interest.status === 'interested' ? '✓ Interested' : interest.status}
                    </span>
                    {interest.ai_match_score && (
                      <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-bold">
                        <Award className="w-4 h-4 inline mr-1" />
                        {interest.ai_match_score}%
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4 mb-6">
                <div className="flex items-center gap-2 text-gray-700">
                  <Mail className="w-5 h-5 text-blue-600" />
                  {candidate.email}
                </div>
                {candidate.phone && (
                  <div className="flex items-center gap-2 text-gray-700">
                    <Phone className="w-5 h-5 text-blue-600" />
                    {candidate.phone}
                  </div>
                )}
                {candidate.location && (
                  <div className="flex items-center gap-2 text-gray-700">
                    <MapPin className="w-5 h-5 text-blue-600" />
                    {candidate.location}
                  </div>
                )}
                <div className="flex items-center gap-2 text-gray-700">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  {new Date(interest.created_at).toLocaleDateString()}
                </div>
              </div>

              {candidate.skills && candidate.skills.length > 0 && (
                <div>
                  <h3 className="font-bold text-gray-900 mb-3">Skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {candidate.skills.map((skill: string, i: number) => (
                      <span key={i} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </div>

          {/* Sidebar with Actions */}
          <div className="space-y-6">
            {/* Download CV */}
            {interest.cv_url && (
              <motion.a
                whileHover={{ scale: 1.05 }}
                href={interest.cv_url}
                target="_blank"
                download
                className="block bg-blue-600 hover:bg-blue-700 text-white rounded-2xl p-6 shadow-xl transition text-center">
                <Download className="w-12 h-12 mx-auto mb-3" />
                <p className="font-bold text-lg">Download CV</p>
              </motion.a>
            )}

            {/* Generate RTR Button - BIG AND CLICKABLE */}
            {canGenerateRTR && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleGenerateRTR}
                disabled={generatingRTR}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-2xl p-8 shadow-2xl transition disabled:opacity-50">
                {generatingRTR ? (
                  <div className="text-center">
                    <Loader2 className="w-12 h-12 animate-spin mx-auto mb-3" />
                    <p className="font-bold text-xl">Generating RTR...</p>
                    <p className="text-sm text-amber-100 mt-2">Please wait</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <Zap className="w-16 h-16 mx-auto mb-3 animate-pulse" />
                    <p className="font-bold text-2xl mb-2">Generate RTR</p>
                    <p className="text-sm text-amber-100">Click to send agreement</p>
                  </div>
                )}
              </motion.button>
            )}

            {/* RTR Status */}
            {interest.right_to_represent_url && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-purple-50 rounded-2xl p-6 border-2 border-purple-200">
                <FileText className="w-12 h-12 text-purple-600 mx-auto mb-3" />
                <a
                  href={interest.right_to_represent_url}
                  target="_blank"
                  className="block text-center px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold transition mb-3">
                  View RTR
                </a>
                {interest.right_to_represent_signed ? (
                  <div className="flex items-center justify-center gap-2 text-green-600 font-bold">
                    <CheckCircle className="w-6 h-6" />
                    Signed ✓
                  </div>
                ) : (
                  <div className="text-center text-orange-600 font-bold">
                    <AlertCircle className="w-6 h-6 inline mr-2" />
                    Awaiting Signature
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
ENDFILE

echo "✅ Fixed complex detail page"

echo ""
echo "=========================================="
echo "✅ COMPLEX VERSION FIXED WITH DEBUGGING"
echo "=========================================="
echo ""
echo "Changes made:"
echo "  ✅ Added extensive console.log debugging"
echo "  ✅ Added debug info display on page"
echo "  ✅ Fixed AnimatePresence with mode='popLayout'"
echo "  ✅ Added whileHover and whileTap animations"
echo "  ✅ Improved error handling"
echo "  ✅ Added user ID verification"
echo "  ✅ Added detailed logging for each card"
echo ""
echo "NOW DO THIS:"
echo "  1. Stop dev server (Ctrl+C)"
echo "  2. Run: rm -rf .next"
echo "  3. Run: npm run dev"
echo "  4. Open browser console (F12)"
echo "  5. Go to /dashboard/agency/interests"
echo "  6. Check console logs"
echo "  7. Try clicking a card"
echo ""
echo "The console will show exactly what's happening!"
echo ""
ENDFILE

chmod +x fix-complex-rtr-system.sh
bash fix-complex-rtr-system.sh
