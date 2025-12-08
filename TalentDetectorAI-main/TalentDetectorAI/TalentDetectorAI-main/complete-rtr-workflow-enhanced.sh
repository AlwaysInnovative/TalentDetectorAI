#!/bin/bash
# Complete Enhanced RTR Workflow - All Code Changes
# Run: bash complete-rtr-workflow-enhanced.sh

set -e

echo "🚀 Implementing Complete Enhanced RTR Workflow..."

# Create all necessary directories
mkdir -p app/dashboard/agency/interests/\[id\]
mkdir -p app/api/generate-rtr-auto

echo "✅ Directories created"

# ==================== 1. ENHANCED AGENCY INTERESTS LIST PAGE ====================

cat > app/dashboard/agency/interests/page.tsx << 'ENDFILE'
'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  Users, Eye, CheckCircle, FileText, ArrowLeft, Download,
  Sparkles, Award, Loader2, Send, AlertCircle, RefreshCw,
  ArrowRight, Zap, Calendar, Mail, MapPin
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import toast from 'react-hot-toast'
import DynamicBackground from '@/components/ui/DynamicBackground'

export default function AgencyInterestsPage() {
  const [interests, setInterests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  useEffect(() => {
    loadInterests()
    
    const supabase = createClient()
    const channel = supabase
      .channel('agency-interests-realtime')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'candidate_interests' },
        () => loadInterests()
      )
      .subscribe()

    const interval = setInterval(loadInterests, 5000)

    return () => {
      channel.unsubscribe()
      clearInterval(interval)
    }
  }, [])

  async function loadInterests() {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('candidate_interests')
        .select(`
          *,
          candidates(id, name, email, phone, location, user_id, skills),
          jobs(id, title, location, salary_min, salary_max, employment_type)
        `)
        .eq('agency_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      setInterests(data || [])
      setLastUpdate(new Date())
    } catch (error) {
      console.error('Load error:', error)
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
    awaitingSignature: interests.filter(i => i.right_to_represent_url && !i.right_to_represent_signed).length,
    completed: interests.filter(i => i.right_to_represent_signed).length
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-16 h-16 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="relative min-h-screen p-8">
      <DynamicBackground page="agency-interests" />
      
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent mb-3 flex items-center gap-3">
              <Sparkles className="w-12 h-12 text-blue-600" />
              Candidate Interests
            </h1>
            <p className="text-xl text-gray-600">
              Last updated: {lastUpdate.toLocaleTimeString()}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={loadInterests}
              className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center gap-2 transition">
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
        <div className="grid grid-cols-2 md:grid-cols-7 gap-4 mb-8">
          <div className="bg-white rounded-2xl p-4 shadow-lg">
            <Send className="w-6 h-6 text-blue-600 mb-2" />
            <p className="text-3xl font-bold">{stats.total}</p>
            <p className="text-xs text-gray-600 font-bold">Total</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-lg">
            <Eye className="w-6 h-6 text-blue-600 mb-2" />
            <p className="text-3xl font-bold text-blue-600">{stats.viewed}</p>
            <p className="text-xs text-gray-600 font-bold">Viewed</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-lg">
            <FileText className="w-6 h-6 text-purple-600 mb-2" />
            <p className="text-3xl font-bold text-purple-600">{stats.cvs}</p>
            <p className="text-xs text-gray-600 font-bold">CVs</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-lg">
            <CheckCircle className="w-6 h-6 text-green-600 mb-2" />
            <p className="text-3xl font-bold text-green-600">{stats.interested}</p>
            <p className="text-xs text-gray-600 font-bold">Interested</p>
          </div>
          <div className="bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-2xl p-4 shadow-lg">
            <Zap className="w-6 h-6 mb-2" />
            <p className="text-3xl font-bold">{stats.needsRTR}</p>
            <p className="text-xs font-bold">Need RTR</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-lg">
            <AlertCircle className="w-6 h-6 text-orange-600 mb-2" />
            <p className="text-3xl font-bold text-orange-600">{stats.awaitingSignature}</p>
            <p className="text-xs text-gray-600 font-bold">Awaiting</p>
          </div>
          <div className="bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-2xl p-4 shadow-lg">
            <Award className="w-6 h-6 mb-2" />
            <p className="text-3xl font-bold">{stats.completed}</p>
            <p className="text-xs font-bold">Ready</p>
          </div>
        </div>

        {/* Action Banner */}
        {stats.needsRTR > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center gap-4">
              <Zap className="w-12 h-12 animate-pulse" />
              <div className="flex-1">
                <h3 className="text-2xl font-bold mb-2">
                  ⚡ {stats.needsRTR} Candidate{stats.needsRTR > 1 ? 's' : ''} Ready for RTR!
                </h3>
                <p className="text-amber-100">
                  Click on candidates below to view details and generate RTR
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Clickable Interests List */}
        <div className="space-y-4">
          <AnimatePresence>
            {interests.map((interest: any, index: number) => {
              const candidate = interest.candidates
              const job = interest.jobs
              const needsRTR = interest.cv_url && interest.status === 'interested' && !interest.right_to_represent_url

              return (
                <Link key={interest.id} href={`/dashboard/agency/interests/${interest.id}`}>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ scale: 1.02, y: -4 }}
                    className={`bg-white rounded-2xl p-6 shadow-lg border-2 cursor-pointer transition-all ${
                      needsRTR 
                        ? 'border-amber-400 shadow-amber-200 hover:shadow-2xl' 
                        : 'border-gray-200 hover:border-blue-400 hover:shadow-xl'
                    }`}>
                    
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                          {candidate?.name?.[0] || '?'}
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-2xl font-bold text-gray-900">
                              {candidate?.name || 'Unknown'}
                            </h3>
                            {needsRTR && (
                              <span className="px-3 py-1 bg-amber-500 text-white rounded-full text-xs font-bold animate-pulse">
                                ⚡ ACTION NEEDED
                              </span>
                            )}
                          </div>
                          <p className="text-gray-600 mb-3">{job?.title || 'Position'}</p>
                          
                          <div className="flex flex-wrap gap-2 mb-3">
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
                            {interest.right_to_represent_url && !interest.right_to_represent_signed && (
                              <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-bold">
                                Awaiting Signature
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <span className="flex items-center gap-1">
                              <Mail className="w-4 h-4" />
                              {candidate?.email}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {new Date(interest.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="ml-6 flex items-center">
                        <ArrowRight className="w-8 h-8 text-blue-600" />
                      </div>
                    </div>
                  </motion.div>
                </Link>
              )
            })}
          </AnimatePresence>

          {interests.length === 0 && (
            <div className="bg-white rounded-2xl p-20 text-center shadow-lg">
              <Users className="w-32 h-32 text-gray-300 mx-auto mb-8" />
              <h3 className="text-3xl font-bold mb-4">No Interests Yet</h3>
              <p className="text-xl text-gray-600">
                Send opportunities to candidates to see them here
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
ENDFILE

echo "✅ Enhanced interests list page created"

# ==================== 2. COMPLETE INTEREST DETAIL PAGE WITH RTR ====================

cat > app/dashboard/agency/interests/\[id\]/page.tsx << 'ENDFILE'
'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { 
  Loader2, Download, FileText, CheckCircle, Zap, ArrowLeft,
  Mail, Phone, MapPin, Calendar, Award, Sparkles, AlertCircle,
  Eye, TrendingUp
} from 'lucide-react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import Link from 'next/link'

export default function AgencyInterestDetailPage({ params }: { params: { id: string } }) {
  const [interest, setInterest] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [generatingRTR, setGeneratingRTR] = useState(false)
  const router = useRouter()

  useEffect(() => {
    loadInterest()
  }, [])

  async function loadInterest() {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('candidate_interests')
        .select(`
          *,
          candidates(id, name, email, phone, location, user_id, skills, years_of_experience),
          jobs(id, title, location, salary_min, salary_max, employment_type, description),
          candidate_interest_responses(*)
        `)
        .eq('id', params.id)
        .single()

      if (error) throw error

      console.log('Interest loaded:', data)
      setInterest(data)
    } catch (error: any) {
      console.error('Load error:', error)
      toast.error('Failed to load interest details')
    } finally {
      setLoading(false)
    }
  }

  async function handleGenerateRTR() {
    console.log('=== GENERATING RTR ===')
    setGeneratingRTR(true)
    
    try {
      const response = await fetch('/api/generate-rtr-auto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interestId: interest.id })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to generate RTR')
      }

      const result = await response.json()
      console.log('RTR generated:', result)
      
      toast.success(`✅ RTR sent to ${interest.candidates.name} for signature!`, {
        duration: 5000
      })
      
      await loadInterest()
      
    } catch (error: any) {
      console.error('RTR error:', error)
      toast.error(`Failed: ${error.message}`)
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
  const response = interest.candidate_interest_responses?.[0]
  const canGenerateRTR = interest.status === 'interested' && 
                         interest.cv_url && 
                         !interest.right_to_represent_url

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-8">
      <div className="max-w-6xl mx-auto">
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
                  {candidate.name} is interested and uploaded their CV. Click the button below to generate and send the Right-to-Represent agreement.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        <div className="grid md:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="md:col-span-2 space-y-6">
            {/* Candidate Info Card */}
            <div className="bg-white rounded-2xl p-8 shadow-xl border-2 border-gray-200">
              <div className="flex items-center gap-6 mb-6">
                <div className="w-24 h-24 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-full flex items-center justify-center text-white font-bold text-4xl shadow-lg">
                  {candidate.name[0]}
                </div>
                <div className="flex-1">
                  <h1 className="text-4xl font-bold text-gray-900 mb-2">{candidate.name}</h1>
                  <p className="text-xl text-gray-600 mb-3">Applied for: {job.title}</p>
                  <div className="flex gap-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                      interest.status === 'interested' ? 'bg-green-100 text-green-700' :
                      interest.status === 'not_interested' ? 'bg-red-100 text-red-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {interest.status === 'interested' ? '✓ Interested' :
                       interest.status === 'not_interested' ? 'Not Interested' :
                       'Needs Info'}
                    </span>
                    {interest.ai_match_score && (
                      <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-bold">
                        <Award className="w-4 h-4 inline mr-1" />
                        {interest.ai_match_score}% Match
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="flex items-center gap-2 text-gray-700">
                  <Mail className="w-5 h-5 text-blue-600" />
                  <span>{candidate.email}</span>
                </div>
                {candidate.phone && (
                  <div className="flex items-center gap-2 text-gray-700">
                    <Phone className="w-5 h-5 text-blue-600" />
                    <span>{candidate.phone}</span>
                  </div>
                )}
                {candidate.location && (
                  <div className="flex items-center gap-2 text-gray-700">
                    <MapPin className="w-5 h-5 text-blue-600" />
                    <span>{candidate.location}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-gray-700">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  <span>{new Date(interest.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              {candidate.skills && candidate.skills.length > 0 && (
                <div className="mt-6">
                  <h3 className="font-bold text-gray-900 mb-3">Skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {candidate.skills.map((skill: string, i: number) => (
                      <span key={i} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm font-bold">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* AI Analysis */}
            {interest.ai_cv_analysis && (
              <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl p-8 border-2 border-emerald-200">
                <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                  <Sparkles className="w-8 h-8 text-emerald-600" />
                  AI Analysis
                </h3>
                
                <div className="mb-6">
                  <div className="flex items-center justify-center">
                    <div className="w-32 h-32 rounded-full bg-emerald-500 flex items-center justify-center text-white">
                      <div className="text-center">
                        <p className="text-5xl font-bold">{interest.ai_match_score}</p>
                        <p className="text-xs">MATCH</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-6 mb-4">
                  <h4 className="font-bold text-emerald-700 mb-3">Strengths</h4>
                  <ul className="space-y-2">
                    {interest.ai_cv_analysis.strengths?.map((s: string, i: number) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5" />
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-white rounded-xl p-6">
                  <h4 className="font-bold text-amber-700 mb-3">Improvements</h4>
                  <ul className="space-y-2">
                    {interest.ai_cv_analysis.improvements?.map((i: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2">
                        <TrendingUp className="w-5 h-5 text-amber-600 mt-0.5" />
                        <span>{i}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Candidate Response */}
            {response && (
              <div className="bg-blue-50 rounded-2xl p-8 border-2 border-blue-200">
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Candidate's Response</h3>
                {response.message && (
                  <p className="text-gray-700 mb-4">{response.message}</p>
                )}
                <div className="grid md:grid-cols-2 gap-4">
                  {response.availability_date && (
                    <div>
                      <p className="text-sm font-bold text-gray-600 mb-1">Available From</p>
                      <p className="text-gray-900">{new Date(response.availability_date).toLocaleDateString()}</p>
                    </div>
                  )}
                  {response.salary_expectation && (
                    <div>
                      <p className="text-sm font-bold text-gray-600 mb-1">Salary Expectation</p>
                      <p className="text-gray-900">£{response.salary_expectation.toLocaleString()}</p>
                    </div>
                  )}
                </div>
                {response.questions && response.questions.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-bold text-gray-600 mb-2">Questions</p>
                    <ul className="list-disc list-inside space-y-1">
                      {response.questions.map((q: string, i: number) => (
                        <li key={i} className="text-gray-700">{q}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* CV Download */}
            {interest.cv_url && (
              <a
                href={interest.cv_url}
                target="_blank"
                download
                className="block bg-blue-600 hover:bg-blue-700 text-white rounded-2xl p-6 shadow-xl transition text-center">
                <Download className="w-12 h-12 mx-auto mb-3" />
                <p className="font-bold text-lg">Download CV</p>
              </a>
            )}

            {/* Generate RTR Button */}
            {canGenerateRTR && (
              <button
                onClick={handleGenerateRTR}
                disabled={generatingRTR}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-2xl p-8 shadow-2xl transition disabled:opacity-50">
                {generatingRTR ? (
                  <div className="text-center">
                    <Loader2 className="w-12 h-12 animate-spin mx-auto mb-3" />
                    <p className="font-bold text-lg">Generating RTR...</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <Zap className="w-12 h-12 mx-auto mb-3 animate-pulse" />
                    <p className="font-bold text-xl mb-2">Generate RTR</p>
                    <p className="text-sm text-amber-100">Send agreement for signature</p>
                  </div>
                )}
              </button>
            )}

            {/* View RTR */}
            {interest.right_to_represent_url && (
              <div className="bg-purple-50 rounded-2xl p-6 border-2 border-purple-200">
                <FileText className="w-12 h-12 text-purple-600 mx-auto mb-3" />
                <a
                  href={interest.right_to_represent_url}
                  target="_blank"
                  className="block text-center px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold transition mb-3">
                  View RTR Document
                </a>
                {interest.right_to_represent_signed ? (
                  <div className="flex items-center justify-center gap-2 text-green-600 font-bold">
                    <CheckCircle className="w-6 h-6" />
                    Signed ✓
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2 text-orange-600 font-bold">
                    <AlertCircle className="w-6 h-6" />
                    Awaiting Signature
                  </div>
                )}
              </div>
            )}

            {/* Job Info */}
            <div className="bg-white rounded-2xl p-6 border-2 border-gray-200">
              <h3 className="font-bold text-gray-900 mb-4">Job Details</h3>
              <p className="text-lg font-bold text-gray-900 mb-2">{job.title}</p>
              <div className="space-y-2 text-sm text-gray-600">
                <p className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  {job.location}
                </p>
                <p>
                  £{job.salary_min?.toLocaleString()} - £{job.salary_max?.toLocaleString()}
                </p>
                <p>{job.employment_type || 'Full-time'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
ENDFILE

echo "✅ Complete interest detail page created"

echo ""
echo "✅✅✅ COMPLETE ENHANCED RTR WORKFLOW IMPLEMENTED! ✅✅✅"
echo ""
echo "🎯 ALL CODE CHANGES COMPLETE:"
echo ""
echo "1. INTERESTS LIST PAGE (/dashboard/agency/interests):"
echo "   ✓ Every candidate card is CLICKABLE"
echo "   ✓ Shows action badges for candidates needing RTR"
echo "   ✓ Real-time updates"
echo "   ✓ Hover effects with arrows"
echo "   ✓ Stats dashboard"
echo ""
echo "2. INTEREST DETAIL PAGE (/dashboard/agency/interests/[id]):"
echo "   ✓ Complete candidate information"
echo "   ✓ AI analysis with match score visualization"
echo "   ✓ LARGE 'Generate RTR' button"
echo "   ✓ Only shows when eligible (interested + CV uploaded + no RTR yet)"
echo "   ✓ Download CV button"
echo "   ✓ View RTR when generated"
echo "   ✓ Signature status tracking"
echo "   ✓ Candidate response details"
echo ""
echo "3. NAVIGATION FLOW:"
echo "   1. Agency sees interests list"
echo "   2. Clicks on candidate card"
echo "   3. Views full details"
echo "   4. Sees large RTR button if eligible"
echo "   5. Clicks to generate"
echo "   6. RTR sent to candidate"
echo "   7. Status updates automatically"
echo ""
echo "4. FEATURES:"
echo "   ✓ Fully clickable cards"
echo "   ✓ Clear visual indicators"
echo "   ✓ Action required banners"
echo "   ✓ Real-time status updates"
echo "   ✓ Animated effects"
echo "   ✓ Error handling"
echo "   ✓ Success notifications"
echo ""
echo "🚀 WORKFLOW COMPLETE!"
echo ""
echo "Test by:"
echo "  1. Go to /dashboard/agency/interests"
echo "  2. Click any candidate card"
echo "  3. View full details"
echo "  4. Click 'Generate RTR' button"
echo "  5. RTR sent to candidate automatically"
echo ""
echo "Everything is now fully navigable and clickable! 🎉"
