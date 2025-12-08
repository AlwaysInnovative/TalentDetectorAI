'use client'
import { useState, useEffect } from 'react'
import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'
import { 
  TrendingUp, Users, Briefcase, DollarSign, Award, 
  Clock, Target, Zap, Brain, Sparkles, ArrowRight,
  CheckCircle, AlertCircle, Eye, FileText
} from 'lucide-react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import DynamicBackground from '@/components/ui/DynamicBackground'

const fetcher = async () => {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: proposals } = await supabase
    .from('commission_proposals')
    .select('*, jobs(*)')
    .eq('agency_id', user?.id)
    .order('created_at', { ascending: false })

  const { data: interests } = await supabase
    .from('candidate_interests')
    .select('*, candidates(*), jobs(*)')
    .eq('agency_id', user?.id)
    .order('created_at', { ascending: false })

  return {
    proposals: proposals || [],
    interests: interests || []
  }
}

export default function AgencyDashboard() {
  const { data } = useSWR('agency-dashboard', fetcher, { refreshInterval: 5000 })
  
  const stats = {
    active_jobs: data?.proposals?.filter((p: any) => p.status === 'accepted').length || 0,
    total_candidates: data?.interests?.length || 0,
    cvs_received: data?.interests?.filter((i: any) => i.cv_url).length || 0,
    signed_rtrs: data?.interests?.filter((i: any) => i.right_to_represent_signed).length || 0,
    pending_responses: data?.interests?.filter((i: any) => !i.candidate_responded_at).length || 0,
    interested: data?.interests?.filter((i: any) => i.status === 'interested').length || 0,
    avg_match_score: data?.interests?.length > 0 
      ? Math.round(data.interests.reduce((acc: number, i: any) => acc + (i.ai_match_score || 0), 0) / data.interests.length)
      : 0
  }

  const aiInsights = generateAIInsights(data?.interests || [])
  const urgentActions = getUrgentActions(data?.interests || [])
  const topCandidates = (data?.interests || [])
    .filter((i: any) => i.ai_match_score)
    .sort((a: any, b: any) => b.ai_match_score - a.ai_match_score)
    .slice(0, 5)

  return (
    <div className="relative min-h-screen p-8">
      <DynamicBackground page="agency-dashboard" />

      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-3 flex items-center gap-3">
            <Brain className="w-12 h-12 text-blue-600" />
            AI Agency Dashboard
          </h1>
          <p className="text-xl text-gray-600">Powered by intelligent automation</p>
        </div>

        {/* AI Insights Banner */}
        {aiInsights.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 text-white rounded-2xl p-6 shadow-2xl">
            <div className="flex items-start gap-4">
              <Sparkles className="w-12 h-12 flex-shrink-0 animate-pulse" />
              <div className="flex-1">
                <h3 className="text-2xl font-bold mb-3">🤖 AI Insights & Recommendations</h3>
                <div className="space-y-2">
                  {aiInsights.map((insight: any, i: number) => (
                    <motion.p
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className="text-purple-100">
                      • {insight}
                    </motion.p>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Urgent Actions */}
        {urgentActions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-8 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-2xl p-6 shadow-2xl">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-12 h-12 flex-shrink-0 animate-bounce" />
              <div className="flex-1">
                <h3 className="text-2xl font-bold mb-3">⚡ Urgent Actions Required</h3>
                <div className="space-y-3">
                  {urgentActions.map((action: any, i: number) => (
                    <Link key={i} href={action.link}>
                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        className="bg-white/20 backdrop-blur rounded-xl p-4 cursor-pointer hover:bg-white/30 transition">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-bold text-lg">{action.title}</p>
                            <p className="text-amber-100 text-sm">{action.description}</p>
                          </div>
                          <ArrowRight className="w-6 h-6" />
                        </div>
                      </motion.div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Stats Grid */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Link href="/dashboard/agency/jobs">
            <motion.div
              whileHover={{ scale: 1.05, y: -5 }}
              className="bg-white rounded-2xl p-6 shadow-lg border-2 border-blue-200 hover:border-blue-400 transition cursor-pointer">
              <div className="flex items-center justify-between mb-3">
                <Briefcase className="w-8 h-8 text-blue-600" />
                <span className="text-4xl font-bold text-blue-600">{stats.active_jobs}</span>
              </div>
              <p className="text-gray-600 font-bold">Active Jobs</p>
              <p className="text-xs text-gray-500 mt-1">Click to manage</p>
            </motion.div>
          </Link>

          <Link href="/dashboard/agency/candidates">
            <motion.div
              whileHover={{ scale: 1.05, y: -5 }}
              className="bg-white rounded-2xl p-6 shadow-lg border-2 border-green-200 hover:border-green-400 transition cursor-pointer">
              <div className="flex items-center justify-between mb-3">
                <Users className="w-8 h-8 text-green-600" />
                <span className="text-4xl font-bold text-green-600">{stats.total_candidates}</span>
              </div>
              <p className="text-gray-600 font-bold">Total Candidates</p>
              <p className="text-xs text-gray-500 mt-1">Click to view</p>
            </motion.div>
          </Link>

          <Link href="/dashboard/agency/interests">
            <motion.div
              whileHover={{ scale: 1.05, y: -5 }}
              className="bg-white rounded-2xl p-6 shadow-lg border-2 border-purple-200 hover:border-purple-400 transition cursor-pointer">
              <div className="flex items-center justify-between mb-3">
                <FileText className="w-8 h-8 text-purple-600" />
                <span className="text-4xl font-bold text-purple-600">{stats.cvs_received}</span>
              </div>
              <p className="text-gray-600 font-bold">CVs Received</p>
              <p className="text-xs text-gray-500 mt-1">Click to review</p>
            </motion.div>
          </Link>

          <motion.div
            whileHover={{ scale: 1.05, y: -5 }}
            className="bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl p-6 shadow-lg text-white">
            <div className="flex items-center justify-between mb-3">
              <Award className="w-8 h-8" />
              <span className="text-4xl font-bold">{stats.avg_match_score}%</span>
            </div>
            <p className="font-bold">Avg AI Match</p>
            <p className="text-xs text-emerald-100 mt-1">Quality indicator</p>
          </motion.div>
        </div>

        {/* Secondary Stats */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <Clock className="w-6 h-6 text-amber-600" />
              <span className="text-3xl font-bold text-amber-600">{stats.pending_responses}</span>
            </div>
            <p className="text-gray-600 font-bold">Pending Responses</p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <CheckCircle className="w-6 h-6 text-green-600" />
              <span className="text-3xl font-bold text-green-600">{stats.interested}</span>
            </div>
            <p className="text-gray-600 font-bold">Interested Candidates</p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-gray-200">
            <div className="flex items-center justify-between mb-3">
              <FileText className="w-6 h-6 text-purple-600" />
              <span className="text-3xl font-bold text-purple-600">{stats.signed_rtrs}</span>
            </div>
            <p className="text-gray-600 font-bold">Signed RTRs</p>
          </div>
        </div>

        {/* Top Candidates */}
        {topCandidates.length > 0 && (
          <div className="bg-white rounded-2xl p-8 shadow-lg border-2 border-gray-200 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                <Target className="w-8 h-8 text-blue-600" />
                🏆 Top AI-Matched Candidates
              </h2>
              <Link href="/dashboard/agency/interests">
                <button className="px-4 py-2 text-blue-600 font-bold hover:bg-blue-50 rounded-lg transition">
                  View All →
                </button>
              </Link>
            </div>

            <div className="space-y-4">
              {topCandidates.map((interest: any, index: number) => (
                <Link key={interest.id} href={`/dashboard/agency/interests`}>
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ scale: 1.02, x: 5 }}
                    className="flex items-center justify-between p-5 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border-2 border-gray-200 hover:border-blue-400 hover:shadow-lg transition cursor-pointer">
                    
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                        {index + 1}
                      </div>
                      
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-900">{interest.candidates.name}</h3>
                        <p className="text-sm text-gray-600">{interest.jobs.title}</p>
                      </div>

                      <div className="flex items-center gap-4">
                        {interest.cv_url && (
                          <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-bold">
                            CV Ready
                          </span>
                        )}
                        {interest.right_to_represent_signed && (
                          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-bold">
                            RTR Signed
                          </span>
                        )}
                        {interest.status === 'interested' && (
                          <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-bold">
                            Interested
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-3xl font-bold text-emerald-600">{interest.ai_match_score}%</p>
                          <p className="text-xs text-gray-600">Match Score</p>
                        </div>
                        <ArrowRight className="w-6 h-6 text-blue-600" />
                      </div>
                    </div>
                  </motion.div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 gap-6">
          <Link href="/dashboard/agency/candidates">
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="bg-gradient-to-br from-blue-600 to-cyan-600 text-white rounded-2xl p-8 shadow-2xl cursor-pointer">
              <Users className="w-12 h-12 mb-4" />
              <h3 className="text-2xl font-bold mb-2">Find & Match Candidates</h3>
              <p className="text-blue-100 mb-4">Use AI to match candidates with open positions</p>
              <div className="flex items-center gap-2 text-lg font-bold">
                Get Started <ArrowRight className="w-6 h-6" />
              </div>
            </motion.div>
          </Link>

          <Link href="/dashboard/agency/interests">
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="bg-gradient-to-br from-purple-600 to-pink-600 text-white rounded-2xl p-8 shadow-2xl cursor-pointer">
              <TrendingUp className="w-12 h-12 mb-4" />
              <h3 className="text-2xl font-bold mb-2">Track Applications</h3>
              <p className="text-purple-100 mb-4">Monitor candidate responses and progress</p>
              <div className="flex items-center gap-2 text-lg font-bold">
                View Pipeline <ArrowRight className="w-6 h-6" />
              </div>
            </motion.div>
          </Link>
        </div>
      </div>
    </div>
  )
}

function generateAIInsights(interests: any[]): string[] {
  const insights: string[] = []

  if (interests.length === 0) {
    return ['Start sending opportunities to candidates to get AI insights']
  }

  const highMatchCount = interests.filter(i => i.ai_match_score >= 85).length
  const pendingResponses = interests.filter(i => !i.candidate_responded_at && i.cv_url).length
  const signedRTRs = interests.filter(i => i.right_to_represent_signed).length
  const avgMatchScore = interests.length > 0
    ? Math.round(interests.reduce((acc, i) => acc + (i.ai_match_score || 0), 0) / interests.length)
    : 0

  if (highMatchCount > 0) {
    insights.push(`You have ${highMatchCount} candidates with 85%+ match scores - prioritize these for quick placement`)
  }

  if (pendingResponses > 0) {
    insights.push(`${pendingResponses} candidates uploaded CVs but haven't responded yet - follow up within 24 hours`)
  }

  if (avgMatchScore >= 80) {
    insights.push(`Your average match score is ${avgMatchScore}% - excellent candidate quality! Keep up the great work`)
  } else if (avgMatchScore < 60) {
    insights.push(`Average match score is ${avgMatchScore}% - consider refining your candidate targeting`)
  }

  if (signedRTRs > 0 && signedRTRs < interests.filter(i => i.cv_url).length) {
    insights.push(`${signedRTRs} RTRs signed - remind remaining candidates to complete their signatures`)
  }

  return insights
}

function getUrgentActions(interests: any[]): any[] {
  const actions: any[] = []

  // High match candidates who uploaded CV but no RTR
  const needRTR = interests.filter(i => 
    i.ai_match_score >= 85 && 
    i.cv_url && 
    !i.right_to_represent_url
  ).length

  if (needRTR > 0) {
    actions.push({
      title: `${needRTR} High-Match Candidates Need RTR`,
      description: 'Generate RTR documents for top candidates immediately',
      link: '/dashboard/agency/interests'
    })
  }

  // Candidates who signed RTR but you haven't submitted
  const readyToSubmit = interests.filter(i => 
    i.right_to_represent_signed && 
    i.status === 'interested' &&
    i.ai_match_score >= 75
  ).length

  if (readyToSubmit > 0) {
    actions.push({
      title: `${readyToSubmit} Candidates Ready for Submission`,
      description: 'Submit applications to hiring managers now',
      link: '/dashboard/agency/interests'
    })
  }

  // Pending responses older than 3 days
  const staleResponses = interests.filter(i => {
    if (!i.created_at || i.candidate_responded_at) return false
    const daysSince = (Date.now() - new Date(i.created_at).getTime()) / (1000 * 60 * 60 * 24)
    return daysSince > 3
  }).length

  if (staleResponses > 0) {
    actions.push({
      title: `${staleResponses} Opportunities Need Follow-up`,
      description: 'Candidates haven\'t responded in 3+ days - send reminder',
      link: '/dashboard/agency/interests'
    })
  }

  return actions
}
