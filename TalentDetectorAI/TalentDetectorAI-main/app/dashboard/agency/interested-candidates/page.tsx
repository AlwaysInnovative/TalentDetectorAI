'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Award,
  Download,
  Loader2,
  ArrowLeft,
  Sparkles,
  CheckCircle,
  FileText,
  Zap,
  Mail,
  MapPin,
  Calendar,
  Phone
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import toast from 'react-hot-toast'
import DynamicBackground from '@/components/ui/DynamicBackground'

interface InterestWithJoins {
  id: string
  status: string
  cv_url: string | null
  right_to_represent_url: string | null
  right_to_represent_signed: boolean | null
  ai_match_score: number | null
  created_at: string
  jobs: {
    id: string
    title: string
    location: string
    salary_min: number | null
    salary_max: number | null
  }
  candidates: {
    id: string
    name: string
    email: string
    phone: string | null
    location: string | null
    user_id: string | null
    skills: string[] | null
  }
}

export default function InterestedCandidatesPage() {
  const [interests, setInterests] = useState<InterestWithJoins[]>([])
  const [loading, setLoading] = useState(true)
  const [generatingRTR, setGeneratingRTR] = useState<string | null>(null)

  useEffect(() => {
    loadData()

    const supabase = createClient()
    const channel = supabase
      .channel('agency-interests-multi')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'candidate_interests' },
        () => loadData()
      )
      .subscribe()

    const interval = setInterval(loadData, 5000)

    return () => {
      channel.unsubscribe()
      clearInterval(interval)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('candidate_interests')
        .select(`
          *,
          candidates(id, name, email, phone, location, user_id, skills),
          jobs(id, title, location, salary_min, salary_max)
        `)
        .eq('agency_id', user.id)
        .in('status', ['sent', 'interested', 'not_interested', 'rtr_ready'])
        .order('created_at', { ascending: false })

      if (error) throw error

      setInterests((data || []) as any)
    } catch (err) {
      console.error('Load interests error:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleGenerateRTR(interest: InterestWithJoins) {
    setGeneratingRTR(interest.id)
    try {
      const res = await fetch('/api/generate-rtr-auto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interestId: interest.id })
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate RTR')
      }

      toast.success(
        `RTR generated and sent to ${interest.candidates.name} for ${interest.jobs.title}`
      )
      await loadData()
    } catch (err: any) {
      console.error('RTR generation error:', err)
      toast.error(err?.message || 'Failed to generate RTR')
    } finally {
      setGeneratingRTR(null)
    }
  }

  const groupedByCandidate = interests.reduce<Record<string, InterestWithJoins[]>>(
    (acc, curr) => {
      const cid = curr.candidates.id
      if (!acc[cid]) acc[cid] = []
      acc[cid].push(curr)
      return acc
    },
    {}
  )

  const allCandidates = Object.values(
    interests.reduce<Record<string, InterestWithJoins>>((acc, curr) => {
      acc[curr.candidates.id] = curr
      return acc
    }, {})
  )

  const totalInterests = interests.length
  const acceptedCount = interests.filter((i) => i.status === 'interested').length
  const rejectedCount = interests.filter((i) => i.status === 'not_interested').length
  const pendingCount = interests.filter(
    (i) => i.status === 'sent' && (i as any).candidate_acceptance_status === 'pending_response'
  ).length

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50">
        <Loader2 className="w-16 h-16 animate-spin text-green-600" />
      </div>
    )
  }

  return (
    <div className="relative min-h-screen p-8">
      <DynamicBackground page="interested-candidates" />

      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-3 flex items-center gap-3">
              <CheckCircle className="w-12 h-12 text-green-600" />
              Candidate Job Activity
            </h1>
            <p className="text-xl text-gray-600">
              {allCandidates.length} candidate{allCandidates.length !== 1 ? 's' : ''} with{' '}
              {totalInterests} total job interaction{totalInterests !== 1 ? 's' : ''}
            </p>
          </div>
          <Link href="/dashboard/agency">
            <button className="px-6 py-3 bg-gray-200 rounded-xl font-bold flex items-center gap-2 hover:bg-gray-300 transition">
              <ArrowLeft className="w-5 h-5" />
              Back
            </button>
          </Link>
        </div>

        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl p-6 shadow-2xl border border-gray-200">
            <p className="text-sm text-gray-500 mb-1">Total Candidates</p>
            <p className="text-4xl font-bold text-gray-900">{allCandidates.length}</p>
          </div>
          <div className="bg-green-50 rounded-2xl p-6 shadow-2xl border border-green-200">
            <p className="text-sm text-gray-600 mb-1">Accepted Interests</p>
            <p className="text-4xl font-bold text-green-700">{acceptedCount}</p>
          </div>
          <div className="bg-red-50 rounded-2xl p-6 shadow-2xl border border-red-200">
            <p className="text-sm text-gray-600 mb-1">Rejected Interests</p>
            <p className="text-4xl font-bold text-red-700">{rejectedCount}</p>
          </div>
          <div className="bg-amber-50 rounded-2xl p-6 shadow-2xl border border-amber-200">
            <p className="text-sm text-gray-600 mb-1">Pending Response</p>
            <p className="text-4xl font-bold text-amber-700">{pendingCount}</p>
          </div>
        </div>

        <div className="space-y-8">
          <AnimatePresence>
            {Object.entries(groupedByCandidate).map(([candidateId, items], idx) => {
              const example = items[0]
              const cand = example.candidates

              return (
                <motion.div
                  key={candidateId}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="bg-white rounded-2xl p-8 shadow-xl border-2 border-gray-200"
                >
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-gradient-to-br from-green-600 to-emerald-600 rounded-full flex items-center justify-center text-white font-bold text-2xl shadow-lg">
                        {cand.name?.[0] || '?'}
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-1">
                          {cand.name}
                        </h2>
                        <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                          <span className="flex items-center gap-2">
                            <Mail className="w-4 h-4" />
                            {cand.email}
                          </span>
                          {cand.phone && (
                            <span className="flex items-center gap-2">
                              <Phone className="w-4 h-4" />
                              {cand.phone}
                            </span>
                          )}
                          {cand.location && (
                            <span className="flex items-center gap-2">
                              <MapPin className="w-4 h-4" />
                              {cand.location}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right text-sm text-gray-600">
                      <p>
                        Total jobs: <span className="font-bold">{items.length}</span>
                      </p>
                      <p>
                        Accepted:{' '}
                        <span className="font-bold text-green-600">
                          {items.filter((i) => i.status === 'interested').length}
                        </span>
                      </p>
                      <p>
                        Declined:{' '}
                        <span className="font-bold text-red-600">
                          {items.filter((i) => i.status === 'not_interested').length}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="overflow-x-auto -mx-4 md:mx-0">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="text-left text-gray-500 border-b">
                          <th className="px-4 py-2">Job</th>
                          <th className="px-4 py-2">Location</th>
                          <th className="px-4 py-2">Status</th>
                          <th className="px-4 py-2">Match</th>
                          <th className="px-4 py-2">CV</th>
                          <th className="px-4 py-2">RTR</th>
                          <th className="px-4 py-2">Created</th>
                          <th className="px-4 py-2 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((interest) => (
                          <tr key={interest.id} className="border-b last:border-none">
                            <td className="px-4 py-3 font-semibold text-gray-900">
                              {interest.jobs.title}
                            </td>
                            <td className="px-4 py-3 text-gray-700">
                              {interest.jobs.location}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                                  interest.status === 'interested'
                                    ? 'bg-green-100 text-green-700'
                                    : interest.status === 'not_interested'
                                    ? 'bg-red-100 text-red-700'
                                    : interest.status === 'rtr_ready'
                                    ? 'bg-purple-100 text-purple-700'
                                    : 'bg-amber-100 text-amber-700'
                                }`}
                              >
                                {interest.status === 'interested'
                                  ? 'Accepted'
                                  : interest.status === 'not_interested'
                                  ? 'Rejected'
                                  : interest.status === 'rtr_ready'
                                  ? 'RTR Ready'
                                  : 'Pending'}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              {interest.ai_match_score && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold">
                                  <Award className="w-3 h-3" />
                                  {interest.ai_match_score}%
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {interest.cv_url ? (
                                <a
                                  href={interest.cv_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                                >
                                  <Download className="w-4 h-4" />
                                  CV
                                </a>
                              ) : (
                                <span className="text-xs text-gray-400">
                                  Not uploaded
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {interest.right_to_represent_url ? (
                                <a
                                  href={interest.right_to_represent_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-purple-600 hover:underline"
                                >
                                  <FileText className="w-4 h-4" />
                                  View RTR
                                </a>
                              ) : interest.status === 'interested' &&
                                interest.cv_url &&
                                !interest.right_to_represent_url ? (
                                <button
                                  onClick={() => handleGenerateRTR(interest)}
                                  disabled={generatingRTR === interest.id}
                                  className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-600 text-white text-xs font-bold shadow disabled:opacity-50"
                                >
                                  {generatingRTR === interest.id ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <Zap className="w-3 h-3" />
                                  )}
                                  {generatingRTR === interest.id ? 'Generating' : 'Generate RTR'}
                                </button>
                              ) : (
                                <span className="text-xs text-gray-400">
                                  Not ready
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-gray-700">
                              {new Date(interest.created_at).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <Link href={`/dashboard/agency/interests/${interest.id}`}>
                                <button className="inline-flex items-center gap-1 px-3 py-1 border border-gray-300 rounded-full text-xs font-bold text-gray-700 hover:bg-gray-50">
                                  View Interest
                                </button>
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>

          {allCandidates.length === 0 && (
            <div className="bg-white rounded-2xl p-20 text-center shadow-lg">
              <CheckCircle className="w-32 h-32 text-gray-300 mx-auto mb-8" />
              <h3 className="text-3xl font-bold text-gray-900 mb-4">
                No Candidate Activity Yet
              </h3>
              <p className="text-xl text-gray-600">
                Once candidates start responding to opportunities, you will see
                their full job activity here.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
