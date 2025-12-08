#!/bin/bash
# Fix: Real-time Agency Interests Page with Auto-RTR
# Run: bash fix-realtime-agency-interests.sh

set -e

echo "🔄 Fixing real-time agency interests page..."

# ==================== COMPLETE REAL-TIME AGENCY INTERESTS PAGE ====================

cat > app/dashboard/agency/interests/page.tsx << 'ENDFILE'
'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  Users, Eye, CheckCircle, FileText, ArrowLeft, Download,
  Sparkles, Award, Loader2, Send, AlertCircle, RefreshCw,
  Clock, Zap
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import toast from 'react-hot-toast'
import DynamicBackground from '@/components/ui/DynamicBackground'

export default function AgencyInterestsPage() {
  const [interests, setInterests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [generatingRTR, setGeneratingRTR] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  useEffect(() => {
    loadInterests()
    
    // Set up real-time subscription
    const supabase = createClient()
    
    const channel = supabase
      .channel('agency-interests-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'candidate_interests'
        },
        (payload) => {
          console.log('Real-time update:', payload)
          loadInterests()
        }
      )
      .subscribe()

    // Auto-refresh every 5 seconds
    const interval = setInterval(() => {
      loadInterests()
    }, 5000)

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
          candidates(id, name, email, phone, location, user_id),
          jobs(id, title, location, salary_min, salary_max, employment_type)
        `)
        .eq('agency_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Fetch error:', error)
        return
      }

      console.log('Loaded interests:', data?.length || 0)
      setInterests(data || [])
      setLastUpdate(new Date())
    } catch (error) {
      console.error('Load interests error:', error)
    } finally {
      setLoading(false)
    }
  }

  async function generateRTR(interest: any) {
    console.log('=== GENERATING RTR ===')
    console.log('Interest ID:', interest.id)
    console.log('Candidate:', interest.candidates?.name)
    console.log('Has CV:', !!interest.cv_url)
    
    if (!interest.cv_url) {
      toast.error('⚠️ Candidate must upload CV first')
      return
    }

    if (!interest.candidates?.user_id) {
      toast.error('⚠️ Candidate has no login account')
      return
    }

    setGeneratingRTR(interest.id)
    
    try {
      console.log('Calling RTR API...')
      
      const response = await fetch('/api/generate-rtr-auto', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ interestId: interest.id })
      })

      console.log('Response status:', response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Error response:', errorText)
        
        let errorData
        try {
          errorData = JSON.parse(errorText)
        } catch {
          throw new Error(`Server error: ${response.status}`)
        }
        
        throw new Error(errorData.error || 'Failed to generate RTR')
      }

      const result = await response.json()
      console.log('Success:', result)
      
      toast.success(
        `✅ RTR generated and sent to ${interest.candidates.name}!`,
        { duration: 5000 }
      )
      
      // Immediate reload
      await loadInterests()
      
    } catch (error: any) {
      console.error('RTR generation error:', error)
      toast.error(`Failed: ${error.message}`, { duration: 6000 })
    } finally {
      setGeneratingRTR(null)
    }
  }

  const stats = {
    total: interests.length,
    viewed: interests.filter(i => i.viewed_by_candidate).length,
    cvs: interests.filter(i => i.cv_url).length,
    responded: interests.filter(i => i.candidate_responded_at).length,
    rtr_sent: interests.filter(i => i.right_to_represent_url).length,
    rtr_signed: interests.filter(i => i.right_to_represent_signed).length,
    interested: interests.filter(i => i.status === 'interested').length
  }

  // Group interests by status
  const needsAction = interests.filter(i => 
    i.cv_url && 
    i.status === 'interested' && 
    !i.right_to_represent_url
  )

  const awaitingSignature = interests.filter(i => 
    i.right_to_represent_url && 
    !i.right_to_represent_signed
  )

  const ready = interests.filter(i => 
    i.right_to_represent_signed
  )

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-16 h-16 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 font-bold">Loading interests...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen p-8">
      <DynamicBackground page="agency-interests" />
      
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent mb-3 flex items-center gap-3">
              <Sparkles className="w-12 h-12 text-blue-600" />
              Candidate Interests
            </h1>
            <p className="text-xl text-gray-600">
              Real-time updates • Last updated: {lastUpdate.toLocaleTimeString()}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => loadInterests()}
              className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center gap-2 transition shadow-lg">
              <RefreshCw className="w-5 h-5" />
              Refresh Now
            </button>
            <Link href="/dashboard/agency">
              <button className="px-6 py-3 bg-gray-200 rounded-xl font-bold flex items-center gap-2 hover:bg-gray-300 transition">
                <ArrowLeft className="w-5 h-5" />
                Back
              </button>
            </Link>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-7 gap-4 mb-8">
          <div className="bg-white rounded-2xl p-4 shadow-lg border-2 border-gray-200">
            <Send className="w-6 h-6 text-blue-600 mb-2" />
            <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
            <p className="text-gray-600 font-bold text-xs">Total</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-lg border-2 border-blue-200">
            <Eye className="w-6 h-6 text-blue-600 mb-2" />
            <p className="text-3xl font-bold text-blue-600">{stats.viewed}</p>
            <p className="text-gray-600 font-bold text-xs">Viewed</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-lg border-2 border-purple-200">
            <FileText className="w-6 h-6 text-purple-600 mb-2" />
            <p className="text-3xl font-bold text-purple-600">{stats.cvs}</p>
            <p className="text-gray-600 font-bold text-xs">CVs</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-lg border-2 border-green-200">
            <CheckCircle className="w-6 h-6 text-green-600 mb-2" />
            <p className="text-3xl font-bold text-green-600">{stats.interested}</p>
            <p className="text-gray-600 font-bold text-xs">Interested</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-lg border-2 border-emerald-200">
            <CheckCircle className="w-6 h-6 text-emerald-600 mb-2" />
            <p className="text-3xl font-bold text-emerald-600">{stats.responded}</p>
            <p className="text-gray-600 font-bold text-xs">Responded</p>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-lg border-2 border-orange-200">
            <Send className="w-6 h-6 text-orange-600 mb-2" />
            <p className="text-3xl font-bold text-orange-600">{stats.rtr_sent}</p>
            <p className="text-gray-600 font-bold text-xs">RTR Sent</p>
          </div>
          <div className="bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl p-4 shadow-lg text-white">
            <Award className="w-6 h-6 mb-2" />
            <p className="text-3xl font-bold">{stats.rtr_signed}</p>
            <p className="text-xs font-bold text-emerald-100">Signed</p>
          </div>
        </div>

        {/* Action Required Section */}
        {needsAction.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-2xl p-6 shadow-2xl">
            <div className="flex items-start gap-4">
              <Zap className="w-12 h-12 flex-shrink-0 animate-pulse" />
              <div className="flex-1">
                <h3 className="text-2xl font-bold mb-2">⚡ Action Required: {needsAction.length} Candidate{needsAction.length > 1 ? 's' : ''} Need RTR!</h3>
                <p className="text-amber-100 mb-4">
                  These candidates uploaded their CV and are interested. Click "Generate RTR" to proceed.
                </p>
                <div className="flex flex-wrap gap-2">
                  {needsAction.slice(0, 3).map((interest: any) => (
                    <span key={interest.id} className="px-3 py-1 bg-white/20 backdrop-blur rounded-full text-sm font-bold">
                      {interest.candidates.name}
                    </span>
                  ))}
                  {needsAction.length > 3 && (
                    <span className="px-3 py-1 bg-white/20 backdrop-blur rounded-full text-sm font-bold">
                      +{needsAction.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Interests List */}
        <div className="space-y-4">
          <AnimatePresence>
            {interests.map((interest: any, index: number) => {
              const candidate = interest.candidates
              const job = interest.jobs
              const canGenerateRTR = interest.cv_url && 
                                    interest.status === 'interested' && 
                                    !interest.right_to_represent_url

              return (
                <motion.div
                  key={interest.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ scale: 1.01 }}
                  className={`bg-white rounded-2xl p-6 shadow-lg border-2 transition-all ${
                    canGenerateRTR 
                      ? 'border-amber-400 shadow-amber-200' 
                      : 'border-gray-200 hover:border-blue-400'
                  }`}>
                  
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      {/* Header */}
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg">
                          {candidate?.name?.[0] || '?'}
                        </div>
                        <div>
                          <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                            {candidate?.name || 'Unknown'}
                            {canGenerateRTR && (
                              <span className="px-3 py-1 bg-amber-500 text-white rounded-full text-xs font-bold animate-pulse">
                                ACTION NEEDED
                              </span>
                            )}
                          </h3>
                          <p className="text-gray-600">{job?.title || 'Position'}</p>
                        </div>
                      </div>

                      {/* Status Badges */}
                      <div className="flex flex-wrap gap-2 mb-4">
                        {!interest.viewed_by_candidate && (
                          <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm font-bold">
                            <Clock className="w-4 h-4 inline mr-1" />
                            Not Viewed
                          </span>
                        )}
                        {interest.viewed_by_candidate && !interest.cv_url && (
                          <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-bold">
                            <Eye className="w-4 h-4 inline mr-1" />
                            Viewed - Awaiting CV
                          </span>
                        )}
                        {interest.cv_url && (
                          <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-bold">
                            <FileText className="w-4 h-4 inline mr-1" />
                            CV Received
                          </span>
                        )}
                        {interest.status === 'interested' && (
                          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-bold">
                            <CheckCircle className="w-4 h-4 inline mr-1" />
                            Interested ✓
                          </span>
                        )}
                        {interest.status === 'not_interested' && (
                          <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-bold">
                            Not Interested
                          </span>
                        )}
                        {interest.ai_match_score && (
                          <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-bold">
                            <Award className="w-4 h-4 inline mr-1" />
                            {interest.ai_match_score}% Match
                          </span>
                        )}
                        {interest.right_to_represent_url && !interest.right_to_represent_signed && (
                          <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-bold animate-pulse">
                            📄 RTR Sent - Awaiting Signature
                          </span>
                        )}
                        {interest.right_to_represent_signed && (
                          <span className="px-3 py-1 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-full text-sm font-bold shadow-lg">
                            <CheckCircle className="w-4 h-4 inline mr-1" />
                            RTR Signed ✓
                          </span>
                        )}
                      </div>

                      {/* Info */}
                      <div className="text-sm text-gray-600">
                        <p className="mb-1">📧 {candidate?.email || 'No email'}</p>
                        <p>📅 Sent {new Date(interest.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>

                    {/* Actions Column */}
                    <div className="ml-6 space-y-3 flex flex-col items-end">
                      {/* Download CV */}
                      {interest.cv_url && (
                        <a
                          href={interest.cv_url}
                          target="_blank"
                          download
                          className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition font-bold text-sm shadow-lg whitespace-nowrap">
                          <Download className="w-5 h-5" />
                          Download CV
                        </a>
                      )}

                      {/* Generate RTR Button - CLICKABLE */}
                      {canGenerateRTR && (
                        <button
                          onClick={() => generateRTR(interest)}
                          disabled={generatingRTR === interest.id}
                          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-xl transition font-bold text-sm shadow-2xl disabled:opacity-50 whitespace-nowrap animate-pulse disabled:animate-none">
                          {generatingRTR === interest.id ? (
                            <>
                              <Loader2 className="w-5 h-5 animate-spin" />
                              Generating RTR...
                            </>
                          ) : (
                            <>
                              <Zap className="w-5 h-5" />
                              Generate RTR Now
                            </>
                          )}
                        </button>
                      )}

                      {/* View RTR */}
                      {interest.right_to_represent_url && (
                        <div className="space-y-2 w-full">
                          <a
                            href={interest.right_to_represent_url}
                            target="_blank"
                            className="flex items-center justify-center gap-2 px-6 py-3 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-xl transition font-bold text-sm whitespace-nowrap">
                            <FileText className="w-5 h-5" />
                            View RTR
                          </a>
                          {interest.right_to_represent_signed ? (
                            <div className="flex items-center justify-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-xl text-xs font-bold">
                              <CheckCircle className="w-4 h-4" />
                              Signed ✓
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-2 px-4 py-2 bg-orange-100 text-orange-700 rounded-xl text-xs font-bold">
                              <AlertCircle className="w-4 h-4" />
                              Awaiting Signature
                            </div>
                          )}
                        </div>
                      )}

                      {/* No Action Needed */}
                      {!interest.cv_url && (
                        <div className="text-center text-sm text-gray-500 italic">
                          Awaiting CV from candidate
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>

          {/* Empty State */}
          {interests.length === 0 && (
            <div className="bg-white rounded-2xl p-20 text-center shadow-lg border-2 border-gray-200">
              <Users className="w-32 h-32 text-gray-300 mx-auto mb-8" />
              <h3 className="text-3xl font-bold text-gray-900 mb-4">No Interests Yet</h3>
              <p className="text-xl text-gray-600 mb-6">
                Send opportunities to candidates to see them here
              </p>
              <Link href="/dashboard/agency/candidates">
                <button className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-lg transition shadow-lg">
                  Browse Candidates
                </button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
ENDFILE

echo "✅ Real-time agency interests page created"

echo ""
echo "✅✅✅ REAL-TIME UPDATES COMPLETE! ✅✅✅"
echo ""
echo "🔄 FEATURES ADDED:"
echo ""
echo "1. REAL-TIME UPDATES:"
echo "   ✓ Supabase realtime subscription"
echo "   ✓ Auto-refresh every 5 seconds"
echo "   ✓ Shows last update time"
echo "   ✓ Manual refresh button"
echo ""
echo "2. CLICKABLE RTR GENERATION:"
echo "   ✓ 'Generate RTR Now' button fully clickable"
echo "   ✓ Only shows for interested candidates with CV"
echo "   ✓ Animated amber glow for visibility"
echo "   ✓ Loading state while generating"
echo "   ✓ Immediate page refresh after generation"
echo ""
echo "3. ACTION REQUIRED BANNER:"
echo "   ✓ Shows count of candidates needing RTR"
echo "   ✓ Lists candidate names"
echo "   ✓ Animated for attention"
echo ""
echo "4. VISUAL STATUS INDICATORS:"
echo "   ✓ 'ACTION NEEDED' badge"
echo "   ✓ Amber border for candidates needing RTR"
echo "   ✓ Status-based badge colors"
echo "   ✓ RTR signature status"
echo ""
echo "5. COMPLETE WORKFLOW:"
echo "   📥 Candidate uploads CV"
echo "   ✅ Candidate clicks 'Interested'"
echo "   🔔 Agency gets real-time notification"
echo "   👁️  Agency sees updated page automatically"
echo "   ⚡ Agency clicks 'Generate RTR Now'"
echo "   📄 RTR generated and sent to candidate"
echo "   🔔 Candidate gets notification"
echo "   ✍️  Candidate signs RTR"
echo "   ✅ Agency sees 'Signed' status in real-time"
echo ""
echo "The page now updates automatically every 5 seconds! 🚀"
