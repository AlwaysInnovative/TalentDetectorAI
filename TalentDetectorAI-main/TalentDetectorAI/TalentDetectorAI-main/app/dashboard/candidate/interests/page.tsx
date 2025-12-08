'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Sparkles,
  Eye,
  FileText,
  CheckCircle,
  Award,
  ArrowRight,
  Clock,
  AlertCircle,
  MapPin,
  DollarSign,
  Loader2
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import DynamicBackground from '@/components/ui/DynamicBackground'

function getStatusMessage(interest: any) {
  if (interest.status === 'sent' && interest.candidate_acceptance_status === 'pending_response') {
    return 'Please review the job and respond with your acceptance or decline.'
  }
  if (interest.status === 'interested') {
    return 'Thank you for your interest! The agency will follow up with the next steps.'
  }
  if (interest.status === 'not_interested') {
    return 'You have declined this opportunity.'
  }
  if (interest.status === 'rtr_ready') {
    return 'Your Right to Represent agreement is ready to sign.'
  }
  if (interest.status === 'pending_agency_action') {
    return 'Waiting for the agency to provide required documents. Please check back soon.'
  }
  return ''
}

export default function CandidateInterestsPage() {
  const [candidateId, setCandidateId] = useState<string>('')
  const [interests, setInterests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchCandidateId() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase
          .from('candidates')
          .select('id')
          .eq('user_id', user.id)
          .single()
        if (data) setCandidateId(data.id)
      }
    }
    fetchCandidateId()
  }, [])

  useEffect(() => {
    if (!candidateId) return

    const supabase = createClient()

    async function loadInterests() {
      console.log('📊 Loading interests for candidate:', candidateId)
      
      // Fetch interests without joins
      const { data, error } = await supabase
        .from('candidate_interests')
        .select('*')
        .eq('candidate_id', candidateId)
        .order('created_at', { ascending: false })

      console.log('✅ Interests data:', data)
      console.log('❌ Error:', error)

      if (data) {
        setInterests(data)
      }
      setLoading(false)
    }

    loadInterests()

    // Realtime subscription
    const channel = supabase
      .channel(`candidate_interests_${candidateId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'candidate_interests',
          filter: `candidate_id=eq.${candidateId}`
        },
        () => {
          console.log('🔄 Interest updated, reloading...')
          loadInterests()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [candidateId])

  // Enrich interests with related jobs and agencies
  const [enrichedInterests, setEnrichedInterests] = useState<any[]>([])

  useEffect(() => {
    async function enrichData() {
      if (!interests.length) {
        setEnrichedInterests([])
        return
      }
      
      const supabase = createClient()
      console.log('🔧 Enriching interests with jobs and agencies...')
      
      const enriched = await Promise.all(
        interests.map(async (interest) => {
          const [jobRes, agencyRes] = await Promise.all([
            supabase.from('jobs').select('*').eq('id', interest.job_id).single(),
            supabase.from('profiles').select('*').eq('id', interest.agency_id).single()
          ])
          
          return {
            ...interest,
            jobs: jobRes.data,
            profiles: agencyRes.data
          }
        })
      )
      
      console.log('✅ Enriched interests:', enriched)
      setEnrichedInterests(enriched)
    }
    enrichData()
  }, [interests])

  const unreadCount =
    enrichedInterests.filter(
      (i: any) => !i.viewed_by_candidate && !i.candidate_responded_at
    ).length || 0

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-16 h-16 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="relative min-h-screen p-8">
      <DynamicBackground page="candidate-interests" />

      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-3 flex items-center gap-3">
            <Sparkles className="w-12 h-12 text-blue-600" />
            Your Opportunities
          </h1>
          <p className="text-xl text-gray-600">
            {unreadCount > 0
              ? `${unreadCount} new ${unreadCount === 1 ? 'opportunity' : 'opportunities'} waiting`
              : 'All caught up!'}
          </p>
        </div>

        {unreadCount > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-8 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-2xl p-8 shadow-2xl"
          >
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
                <AlertCircle className="w-10 h-10 animate-pulse" />
              </div>
              <div className="flex-1">
                <h3 className="text-3xl font-bold mb-2">
                  Action Required: {unreadCount} New{' '}
                  {unreadCount === 1 ? 'Opportunity' : 'Opportunities'}!
                </h3>
                <p className="text-amber-100 text-lg">
                  Click on any opportunity below to review details, upload your CV, and respond
                </p>
              </div>
            </div>
          </motion.div>
        )}

        <div className="space-y-6">
          <AnimatePresence>
            {enrichedInterests.map((interest: any, index: number) => {
              const job = interest.jobs
              const agency = interest.profiles
              const statusMsg = getStatusMessage(interest)

              return (
                <motion.div
                  key={interest.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Link href={`/dashboard/candidate/interests/${interest.id}`}>
                    <motion.div
                      whileHover={{ scale: 1.01, y: -4 }}
                      className="bg-white rounded-2xl p-8 shadow-xl border-2 border-gray-200 hover:border-blue-400 hover:shadow-2xl transition cursor-pointer"
                    >
                      {statusMsg && (
                        <div className="mb-4 p-4 rounded-md bg-yellow-50 border border-yellow-300 text-yellow-800 text-base font-medium">
                          {statusMsg}
                        </div>
                      )}

                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-4">
                            <h2 className="text-3xl font-bold text-gray-900">
                              {job?.title || 'Loading...'}
                            </h2>
                            {!interest.viewed_by_candidate &&
                              !interest.candidate_responded_at && (
                                <motion.span
                                  animate={{ scale: [1, 1.1, 1] }}
                                  transition={{ repeat: Infinity, duration: 2 }}
                                  className="px-4 py-2 bg-red-500 text-white rounded-full text-sm font-bold"
                                >
                                  NEW - CLICK TO VIEW
                                </motion.span>
                              )}
                            {interest.ai_match_score && (
                              <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-bold flex items-center gap-1">
                                <Award className="w-4 h-4" />
                                {interest.ai_match_score}% Match
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap gap-4 mb-4">
                            <span className="flex items-center gap-2 text-gray-600">
                              <MapPin className="w-5 h-5" />
                              {job?.location || 'Location pending'}
                            </span>
                            <span className="flex items-center gap-2 text-gray-600">
                              <DollarSign className="w-5 h-5" />
                              {interest.salary_range || 'Salary pending'}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-sm text-gray-600 mb-4">
                            <span className="font-bold">
                              From: {agency?.full_name || 'Agency'}
                            </span>
                            {agency?.company && <span>• {agency.company}</span>}
                            <span>
                              •{' '}
                              {new Date(
                                interest.created_at
                              ).toLocaleDateString()}
                            </span>
                          </div>

                          <div className="flex gap-2 flex-wrap">
                            {interest.viewed_by_candidate && (
                              <span className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-bold">
                                <Eye className="w-4 h-4" />
                                Viewed
                              </span>
                            )}
                            {interest.cv_url && (
                              <span className="flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-bold">
                                <FileText className="w-4 h-4" />
                                CV Uploaded
                              </span>
                            )}
                            {interest.candidate_responded_at && (
                              <span
                                className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-bold ${
                                  interest.status === 'interested'
                                    ? 'bg-green-100 text-green-700'
                                    : interest.status === 'not_interested'
                                    ? 'bg-red-100 text-red-700'
                                    : 'bg-blue-100 text-blue-700'
                                }`}
                              >
                                <CheckCircle className="w-4 h-4" />
                                {interest.status === 'interested'
                                  ? 'Accepted - Pending Agency'
                                  : interest.status === 'not_interested'
                                  ? 'Declined'
                                  : 'Responded'}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="ml-6 flex flex-col items-center gap-3">
                          <motion.div
                            whileHover={{ scale: 1.05 }}
                            className="px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-bold text-lg shadow-lg flex items-center gap-2"
                          >
                            {!interest.viewed_by_candidate
                              ? 'View Now'
                              : !interest.cv_url
                              ? 'Upload CV'
                              : !interest.candidate_responded_at
                              ? 'Respond'
                              : 'View Details'}
                            <ArrowRight className="w-6 h-6" />
                          </motion.div>
                          {!interest.candidate_responded_at && (
                            <p className="text-sm text-gray-600 text-center">
                              {!interest.viewed_by_candidate
                                ? 'Click to review'
                                : !interest.cv_url
                                ? 'Upload your CV next'
                                : 'Complete your response'}
                            </p>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  </Link>
                </motion.div>
              )
            })}
          </AnimatePresence>

          {(!enrichedInterests || enrichedInterests.length === 0) && (
            <div className="bg-white rounded-2xl p-20 text-center shadow-lg">
              <Clock className="w-32 h-32 text-gray-300 mx-auto mb-8" />
              <h3 className="text-3xl font-bold text-gray-900 mb-4">
                No Opportunities Yet
              </h3>
              <p className="text-xl text-gray-600">
                Recruitment agencies will send you opportunities that match your
                profile
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
