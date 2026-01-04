'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'
import {
  TrendingUp,
  Users,
  Briefcase,
  DollarSign,
  Award,
  Clock,
  Target,
  Zap,
  Brain,
  Sparkles,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  Eye,
  FileText,
} from 'lucide-react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import DynamicBackground from '@/components/ui/DynamicBackground'

const fetcher = async () => {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const agencyId = session?.user?.id

  if (!agencyId) return { proposals: [], interests: [] }

  const [proposalsRes, interestsRes] = await Promise.all([
    supabase
      .from('commissionproposals')
      .select(
        `
        *,
        jobs ( id, title, location, salarymin, salarymax, description )
      `,
      )
      .eq('agencyid', agencyId)
      .order('createdat', { ascending: false }),

    supabase
      .from('candidateinterests')
      .select('*, candidates(*), jobs(*)')
      .eq('agencyid', agencyId)
      .order('createdat', { ascending: false }),
  ])

  return {
    proposals: proposalsRes.data || [],
    interests: interestsRes.data || [],
  }
}

export default function AgencyDashboard() {
  const { data } = useSWR('agency-dashboard', fetcher, {
    refreshInterval: 5000,
  })

  const stats = {
    activeJobs: data?.proposals?.filter((p: any) => p.status === 'accepted').length || 0,
    totalCandidates: data?.interests?.length || 0,
    cvsReceived: data?.interests?.filter((i: any) => i.cvurl).length || 0,
    signedRtrs: data?.interests?.filter((i: any) => i.righttorepresentsigned).length || 0,
    pendingResponses: data?.interests?.filter((i: any) => !i.candidaterespondedat).length || 0,
    interested: data?.interests?.filter((i: any) => i.status === 'interested').length || 0,
    avgMatchScore:
      data?.interests?.length
        ? Math.round(
            data.interests.reduce(
              (acc: number, i: any) => acc + (i.aimatchscore || 0),
              0,
            ) / data.interests.length,
          )
        : 0,
  }

  const aiInsights = generateAIInsights(data?.interests || [])
  const urgentActions = getUrgentActions(data?.interests || [])
  const topCandidates = (data?.interests || [])
    .filter((i: any) => i.aimatchscore)
    .sort((a: any, b: any) => (b.aimatchscore || 0) - (a.aimatchscore || 0))
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

        {/* AI insights banner */}
        {aiInsights.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 text-white rounded-2xl p-6 shadow-2xl"
          >
            <div className="flex items-start gap-4">
              <Sparkles className="w-12 h-12 flex-shrink-0 animate-pulse" />
              <div className="flex-1">
                <h3 className="text-2xl font-bold mb-3">AI Insights & Recommendations</h3>
                <div className="space-y-2">
                  {aiInsights.map((insight, i) => (
                    <motion.p
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="text-purple-100"
                    >
                      {insight}
                    </motion.p>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Urgent actions */}
        {urgentActions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-8 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-2xl p-6 shadow-2xl"
          >
            <div className="flex items-start gap-4">
              <AlertCircle className="w-12 h-12 flex-shrink-0 animate-bounce" />
              <div className="flex-1">
                <h3 className="text-2xl font-bold mb-3">Urgent Actions Required</h3>
                <div className="space-y-3">
                  {urgentActions.map((action, i) => (
                    <Link key={i} href={action.link}>
                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        className="bg-white/20 backdrop-blur rounded-xl p-4 cursor-pointer hover:bg-white/30 transition"
                      >
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

        {/* Stats grid */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Link href="/dashboard/agency/jobs">
            <motion.div
              whileHover={{ scale: 1.05, y: -5 }}
              className="bg-white rounded-2xl p-6 shadow-lg border-2 border-blue-200 hover:border-blue-400 cursor-pointer"
            >
              <div className="flex items-center justify-between mb-3">
                <Briefcase className="w-8 h-8 text-blue-600" />
                <span className="text-4xl font-bold text-blue-600">{stats.activeJobs}</span>
              </div>
              <p className="text-gray-600 font-bold">Active Jobs</p>
              <p className="text-xs text-gray-500 mt-1">Click to manage</p>
            </motion.div>
          </Link>

          <Link href="/dashboard/agency/candidates">
            <motion.div
              whileHover={{ scale: 1.05, y: -5 }}
              className="bg-white rounded-2xl p-6 shadow-lg border-2 border-green-200 hover:border-green-400 cursor-pointer"
            >
              <div className="flex items-center justify-between mb-3">
                <Users className="w-8 h-8 text-green-600" />
                <span className="text-4xl font-bold text-green-600">{stats.totalCandidates}</span>
              </div>
              <p className="text-gray-600 font-bold">Total Candidates</p>
              <p className="text-xs text-gray-500 mt-1">Click to view</p>
            </motion.div>
          </Link>

          <Link href="/dashboard/agency/interests">
            <motion.div
              whileHover={{ scale: 1.05, y: -5 }}
              className="bg-white rounded-2xl p-6 shadow-lg border-2 border-purple-200 hover:border-purple-400 cursor-pointer"
            >
              <div className="flex items-center justify-between mb-3">
                <FileText className="w-8 h-8 text-purple-600" />
                <span className="text-4xl font-bold text-purple-600">{stats.cvsReceived}</span>
              </div>
              <p className="text-gray-600 font-bold">CVs Received</p>
              <p className="text-xs text-gray-500 mt-1">Click to review</p>
            </motion.div>
          </Link>

          <motion.div
            whileHover={{ scale: 1.05, y: -5 }}
            className="bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl p-6 shadow-lg text-white"
          >
            <div className="flex items-center justify-between mb-3">
              <Award className="w-8 h-8" />
              <span className="text-4xl font-bold">{stats.avgMatchScore}</span>
            </div>
            <p className="font-bold">Avg AI Match</p>
            <p className="text-xs text-emerald-100 mt-1">Quality indicator</p>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

function generateAIInsights(interests: any[]): string[] {
  const insights: string[] = []
  if (!interests.length) {
    insights.push('Start sending opportunities to candidates to get AI insights.')
    return insights
  }

  const highMatchCount = interests.filter((i) => (i.aimatchscore || 0) >= 85).length
  const pendingResponses = interests.filter((i) => !i.candidaterespondedat && i.cvurl).length
  const signedRtrsRaw = interests.filter((i) => i.righttorepresentsigned).length
  const avgMatchScore = interests.length
    ? Math.round(interests.reduce((acc, i) => acc + (i.aimatchscore || 0), 0) / interests.length)
    : 0

  const signedRtrs = signedRtrsRaw || 0

  if (highMatchCount > 0) {
    insights.push(
      `You have ${highMatchCount} candidates with ≥85 match scores. Prioritize them for quick placements.`,
    )
  }
  if (pendingResponses > 0) {
    insights.push(
      `${pendingResponses} candidates uploaded CVs but have not responded yet. Follow up within 24 hours.`,
    )
  }

  if (avgMatchScore >= 80) {
    insights.push(`Average match score is ${avgMatchScore}. Excellent candidate quality.`)
  } else if (avgMatchScore >= 60) {
    insights.push(`Average match score is ${avgMatchScore}. Consider refining targeting.`)
  }

  if (signedRtrs > 0) {
    insights.push(
      `${signedRtrs} RTRs signed. Remind remaining candidates to complete RTRs to avoid delays.`,
    )
  }

  return insights
}

function getUrgentActions(interests: any[]) {
  const actions: { title: string; description: string; link: string }[] = []

  const needRtr = interests.filter(
    (i) => (i.aimatchscore || 0) >= 85 && i.cvurl && !i.righttorepresenturl,
  )
  if (needRtr.length > 0) {
    actions.push({
      title: `${needRtr.length} high‑match candidates need RTR`,
      description: 'Generate RTR documents and send for signature.',
      link: '/dashboard/agency/interests',
    })
  }

  const readyToSubmit = interests.filter(
    (i) => i.righttorepresentsigned && i.status === 'interested' && (i.aimatchscore || 0) >= 75,
  )
  if (readyToSubmit.length > 0) {
    actions.push({
      title: `${readyToSubmit.length} candidates ready for submission`,
      description: 'Submit them to hiring managers now.',
      link: '/dashboard/agency/interests',
    })
  }

  const staleResponses = interests.filter((i) => {
    if (!i.createdat || i.candidaterespondedat) return false
    const daysSince =
      (Date.now() - new Date(i.createdat).getTime()) / (1000 * 60 * 60 * 24)
    return daysSince >= 3
  })
  if (staleResponses.length > 0) {
    actions.push({
      title: `${staleResponses.length} opportunities need follow‑up`,
      description: 'Candidates have not responded in 3+ days.',
      link: '/dashboard/agency/interests',
    })
  }

  return actions
}
