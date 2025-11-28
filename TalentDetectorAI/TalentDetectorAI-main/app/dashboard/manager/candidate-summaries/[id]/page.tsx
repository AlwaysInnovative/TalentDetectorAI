'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import {
  Loader2,
  AlertCircle,
  ArrowLeft,
  Download,
  CheckCircle,
  ThumbsUp,
  ThumbsDown,
  Mail,
  Phone,
  MapPin,
  Award,
  DollarSign,
  Briefcase,
  TrendingUp
} from 'lucide-react'
import toast from 'react-hot-toast'
import CandidateSummaryCard from '@/components/agency/CandidateSummaryCard'

export default function HiringManagerSummaryPage({ params }: { params: { id: string } }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [summaryCard, setSummaryCard] = useState<any>(null)
  const [candidate, setCandidate] = useState<any>(null)
  const [job, setJob] = useState<any>(null)
  const [agency, setAgency] = useState<any>(null)
  const [respondingCard, setRespondingCard] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [showRejectionForm, setShowRejectionForm] = useState(false)

  useEffect(() => {
    loadSummary()
  }, [])

  async function loadSummary() {
    try {
      setLoading(true)
      setError(null)
      const supabase = createClient()

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('Not logged in')
        return
      }

      // Fetch summary card
      const { data: card, error: cardError } = await supabase
        .from('candidate_summary_cards')
        .select('*')
        .eq('id', params.id)
        .eq('hiring_manager_id', user.id)
        .single()

      if (cardError || !card) {
        setError('Summary not found or access denied')
        return
      }

      // Fetch related data
      const [candRes, jobRes, agencyRes] = await Promise.all([
        supabase.from('candidates').select('*').eq('id', card.candidate_id).single(),
        supabase.from('jobs').select('*').eq('id', card.job_id).single(),
        supabase.from('profiles').select('*').eq('id', card.agency_id).single()
      ])

      setSummaryCard(card)
      setCandidate(candRes.data)
      setJob(jobRes.data)
      setAgency(agencyRes.data)

      // Mark as read
      await supabase
        .from('candidate_summary_cards')
        .update({ viewed_at: new Date().toISOString() })
        .eq('id', params.id)
    } catch (err: any) {
      setError(err.message || 'Failed to load summary')
    } finally {
      setLoading(false)
    }
  }

  async function handleApprove() {
    if (!summaryCard) return
    setRespondingCard(true)
    try {
      const supabase = createClient()

      await supabase
        .from('candidate_summary_cards')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString()
        })
        .eq('id', summaryCard.id)

      // Notify agency
      await supabase.from('notifications').insert({
        user_id: summaryCard.agency_id,
        type: 'candidate_summary_approved',
        title: `✅ Candidate Approved: ${candidate?.name}`,
        message: `Hiring manager approved the candidate summary for ${candidate?.name} for the ${job?.title} role. Proceeding to next stage.`,
        link: `/dashboard/agency/interests/${summaryCard.interest_id}`,
        action_type: 'view_approval',
        ai_priority: 'high',
        metadata: {
          candidate_name: candidate?.name,
          job_title: job?.title,
          interest_id: summaryCard.interest_id
        }
      })

      toast.success('Candidate approved! Agency has been notified.')
      await loadSummary()
    } catch (err: any) {
      toast.error(err.message || 'Failed to approve candidate')
    } finally {
      setRespondingCard(false)
    }
  }

  async function handleReject() {
    if (!summaryCard || !rejectionReason.trim()) {
      toast.error('Please provide a reason for rejection')
      return
    }
    setRespondingCard(true)
    try {
      const supabase = createClient()

      await supabase
        .from('candidate_summary_cards')
        .update({
          status: 'rejected',
          approved_at: new Date().toISOString(),
          rejection_reason: rejectionReason
        })
        .eq('id', summaryCard.id)

      // Notify agency with rejection reason
      await supabase.from('notifications').insert({
        user_id: summaryCard.agency_id,
        type: 'candidate_summary_rejected',
        title: `❌ Candidate Rejected: ${candidate?.name}`,
        message: `Hiring manager rejected the candidate summary for ${candidate?.name}. Reason: ${rejectionReason}`,
        link: `/dashboard/agency/interests/${summaryCard.interest_id}`,
        action_type: 'view_feedback',
        ai_priority: 'high',
        metadata: {
          candidate_name: candidate?.name,
          job_title: job?.title,
          rejection_reason: rejectionReason
        }
      })

      toast.success('Candidate rejected. Agency has been notified with feedback.')
      setShowRejectionForm(false)
      setRejectionReason('')
      await loadSummary()
    } catch (err: any) {
      toast.error(err.message || 'Failed to reject candidate')
    } finally {
      setRespondingCard(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <Loader2 className="w-16 h-16 text-blue-600 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="bg-white rounded-2xl p-10 text-center shadow-lg max-w-lg">
          <AlertCircle className="mx-auto mb-4 w-14 h-14 text-red-500" />
          <h1 className="font-bold text-2xl text-red-700 mb-4">Error</h1>
          <p className="mb-6 text-gray-700">{error}</p>
          <Link href="/dashboard/manager/candidate-summaries">
            <button className="px-5 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700">
              Back to Summaries
            </button>
          </Link>
        </div>
      </div>
    )
  }

  if (!summaryCard || !candidate || !job || !agency) return null

  const summary = summaryCard.summary

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Back Button */}
        <Link href="/dashboard/manager/candidate-summaries">
          <button className="flex items-center text-blue-600 hover:text-blue-800 font-semibold mb-6 transition">
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Candidate Summaries
          </button>
        </Link>

        {/* Header Section */}
        <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-200 mb-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{candidate.name}</h1>
              <p className="text-lg text-gray-600">{job.title}</p>
            </div>
            <div className="text-right">
              <p className="text-4xl font-extrabold text-emerald-600 mb-2">{summary.aiMatchScore}%</p>
              <p className="text-sm text-gray-600 flex items-center justify-end gap-1">
                <Award className="w-4 h-4" /> AI Match Score
              </p>
            </div>
          </div>

          {/* Candidate Details */}
          <div className="grid md:grid-cols-3 gap-4 text-sm text-gray-700 mb-6">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-gray-400" />
              <span>{candidate.email}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-gray-400" />
              <span>{candidate.phone || 'N/A'}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-gray-400" />
              <span>{candidate.location || 'N/A'}</span>
            </div>
          </div>

          {/* Agency & Commission Info */}
          <div className="grid md:grid-cols-2 gap-4 p-4 bg-amber-50 rounded-xl border border-amber-200">
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-1">Agency</p>
              <p className="font-bold text-gray-900">{agency.full_name}</p>
              {agency.company && <p className="text-xs text-gray-600">{agency.company}</p>}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-1">Commission</p>
              <p className="font-bold text-amber-700">{summary.commission.percentage}% (£{summary.commission.estimatedFee?.toLocaleString() || 'N/A'})</p>
              <p className="text-xs text-gray-600">Calculated on final agreed salary</p>
            </div>
          </div>
        </div>

        {/* Salary & Market Research */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-600" />
              Salary Analysis
            </h2>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-600">Proposed Range</p>
                <p className="text-xl font-bold text-gray-900">
                  £{summary.salary.proposedMin?.toLocaleString()} - £{summary.salary.proposedMax?.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Market Band</p>
                <p className="text-sm text-gray-800">
                  £{summary.salary.marketLow?.toLocaleString()} - £{summary.salary.marketHigh?.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">Confidence Level</p>
                <span className={`px-2 py-1 rounded text-xs font-bold ${
                  summary.salary.confidence === 'high' ? 'bg-green-100 text-green-700' :
                  summary.salary.confidence === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {summary.salary.confidence?.toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-gray-600 italic mt-2">{summary.salary.commentary}</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              Market Research
            </h2>
            {summary.marketResearch && (
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-600">Industry</p>
                  <p className="text-sm font-bold text-gray-900">{summary.marketResearch.industry || 'Technology'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Salary Trend</p>
                  <p className="text-sm font-bold text-emerald-600 flex items-center gap-1">
                    <TrendingUp className="w-4 h-4" /> {summary.marketResearch.salaryTrend || 'Upward'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Market Demand</p>
                  <p className="text-sm font-bold text-gray-900">{summary.marketResearch.demandLevel || 'High'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Competition Level</p>
                  <p className="text-sm font-bold text-gray-900">{summary.marketResearch.competitionLevel || 'Moderate'}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* AI Summary Card Component */}
        <CandidateSummaryCard
          candidateName={candidate.name}
          jobTitle={job.title}
          summary={summary}
          onOpenFullReport={() => toast('Full detailed report')}
        />

        {/* Approval/Rejection Section */}
        <div className="mt-8">
          {summaryCard.status === 'sent' && (
            <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Make Your Decision</h2>

              {!showRejectionForm ? (
                <div className="grid md:grid-cols-2 gap-4">
                  <button
                    onClick={() => setShowRejectionForm(true)}
                    disabled={respondingCard}
                    className="px-6 py-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-lg disabled:opacity-50 flex items-center justify-center gap-3 transition shadow-lg"
                  >
                    {respondingCard ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      <ThumbsDown className="w-6 h-6" />
                    )}
                    Not Suitable - Reject
                  </button>
                  <button
                    onClick={handleApprove}
                    disabled={respondingCard}
                    className="px-6 py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-lg disabled:opacity-50 flex items-center justify-center gap-3 transition shadow-lg"
                  >
                    {respondingCard ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      <CheckCircle className="w-6 h-6" />
                    )}
                    Suitable - Approve
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Reason for Rejection</label>
                    <textarea
                      rows={4}
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Provide constructive feedback for the agency..."
                      className="w-full border border-gray-300 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setShowRejectionForm(false)
                        setRejectionReason('')
                      }}
                      disabled={respondingCard}
                      className="flex-1 px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-lg font-bold transition"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleReject}
                      disabled={respondingCard || !rejectionReason.trim()}
                      className="flex-1 px-4 py-4 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold disabled:opacity-50 flex items-center justify-center gap-2 transition"
                    >
                      {respondingCard ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <ThumbsDown className="w-5 h-5" />
                      )}
                      Confirm Rejection
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {summaryCard.status === 'approved' && (
            <div className="p-6 bg-green-50 rounded-2xl border-2 border-green-300 text-center">
              <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
              <p className="text-lg font-bold text-green-700">
                ✅ You approved {candidate.name} on {new Date(summaryCard.approved_at).toLocaleString()}
              </p>
              <p className="text-sm text-green-600 mt-2">
                Agency has been notified. Next steps will proceed accordingly.
              </p>
            </div>
          )}

          {summaryCard.status === 'rejected' && (
            <div className="p-6 bg-red-50 rounded-2xl border-2 border-red-300">
              <div className="flex items-start gap-4">
                <ThumbsDown className="w-10 h-10 text-red-600 flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <p className="text-lg font-bold text-red-700 mb-1">
                    ❌ You rejected {candidate.name}
                  </p>
                  <p className="text-sm text-red-600 mb-3">
                    Rejected on {new Date(summaryCard.approved_at).toLocaleString()}
                  </p>
                  {summaryCard.rejection_reason && (
                    <div className="bg-white rounded p-3 border border-red-200">
                      <p className="text-xs font-bold text-gray-700 mb-1">Your Feedback:</p>
                      <p className="text-sm text-gray-800">{summaryCard.rejection_reason}</p>
                    </div>
                  )}
                  <p className="text-sm text-red-600 mt-3">
                    Agency has been notified with your feedback.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Download Signed RTR */}
        {summaryCard.interest_id && (
          <div className="mt-8 p-6 bg-blue-50 rounded-2xl border border-blue-200">
            <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Download className="w-5 h-5 text-blue-600" />
              Documentation
            </h3>
            <p className="text-sm text-gray-700 mb-3">
              View or download the signed Right-to-Represent document and candidate CV.
            </p>
            <Link href={`/dashboard/manager/interests/${summaryCard.interest_id}`}>
              <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm transition">
                View Full Interest Details
              </button>
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
