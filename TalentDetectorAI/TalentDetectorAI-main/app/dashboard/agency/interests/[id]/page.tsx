'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import {
  Loader2,
  AlertCircle,
  ArrowLeft,
  FileText,
  Download,
  CheckCircle,
  Mail,
  Phone,
  MapPin,
  Award,
  Zap,
  Clock,
  Send,
  DollarSign,
  TrendingUp
} from 'lucide-react'
import toast from 'react-hot-toast'
import CandidateSummaryCard from '@/components/agency/CandidateSummaryCard'

export default function AgencyInterestDetailPage({ params }: { params: { id: string } }) {
  const [loading, setLoading] = useState(true)
  const [interest, setInterest] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [generatingRTR, setGeneratingRTR] = useState(false)
  const [generatingSummary, setGeneratingSummary] = useState(false)
  const [sendingToHM, setSendingToHM] = useState(false)
  const [candidateSummary, setCandidateSummary] = useState<any>(null)
  const [editedCommission, setEditedCommission] = useState<number>(0)
  const [editedSalaryMin, setEditedSalaryMin] = useState<number>(0)
  const [editedSalaryMax, setEditedSalaryMax] = useState<number>(0)
  const [summaryCardSent, setSummaryCardSent] = useState(false)

  useEffect(() => {
    loadInterest()
  }, [])

  async function loadInterest() {
    try {
      setLoading(true)
      setError(null)
      const supabase = createClient()

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('Not logged in as agency user')
        return
      }

      const { data: interestData, error: interestError } = await supabase
        .from('candidate_interests')
        .select('*')
        .eq('id', params.id)
        .eq('agency_id', user.id)
        .single()

      if (interestError || !interestData) {
        setError('Interest not found or not assigned to you')
        return
      }

      const [candidateRes, jobRes, agencyRes] = await Promise.all([
        supabase.from('candidates').select('*').eq('id', interestData.candidate_id).single(),
        supabase.from('jobs').select('*').eq('id', interestData.job_id).single(),
        supabase.from('profiles').select('*').eq('id', interestData.agency_id).single()
      ])

      const completeInterest = {
        ...interestData,
        candidates: candidateRes.data,
        jobs: jobRes.data,
        profiles: agencyRes.error ? {
          id: interestData.agency_id,
          full_name: 'Agency User',
          company: null,
          email: user.email || '',
          phone: null
        } : agencyRes.data
      }

      setInterest(completeInterest)
      await loadCandidateSummary(params.id)

      // Check if summary already sent
      const { data: analytics } = await supabase
        .from('interest_analytics')
        .select('sent_to_hiring_manager_at')
        .eq('interest_id', params.id)
        .single()

      if (analytics?.sent_to_hiring_manager_at) {
        setSummaryCardSent(true)
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load interest detail')
    } finally {
      setLoading(false)
    }
  }

  async function loadCandidateSummary(interestId: string) {
    try {
      const supabase = createClient()
      const { data } = await supabase
        .from('interest_analytics')
        .select('summary')
        .eq('interest_id', interestId)
        .single()

      if (data?.summary) {
        setCandidateSummary(data.summary)
        setEditedCommission(data.summary.commission.percentage)
        setEditedSalaryMin(data.summary.salary.proposedMin)
        setEditedSalaryMax(data.summary.salary.proposedMax)
      }
    } catch {
      setCandidateSummary(null)
    }
  }

  async function handleGenerateRTR() {
    if (!interest) return
    setGeneratingRTR(true)
    try {
      const res = await fetch('/api/generate-rtr-auto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interestId: interest.id })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to generate RTR')

      toast.success('RTR generated and sent to candidate')
      await loadInterest()
    } catch (err: any) {
      toast.error(err?.message || 'RTR generation failed')
    } finally {
      setGeneratingRTR(false)
    }
  }

  async function handleGenerateSummary() {
    if (!interest) return
    setGeneratingSummary(true)
    try {
      const res = await fetch('/api/generate-ai-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interestId: interest.id })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      toast.success('AI summary generated successfully')
      await loadCandidateSummary(interest.id)
    } catch (err: any) {
      toast.error(err?.message || 'AI summary generation failed')
    } finally {
      setGeneratingSummary(false)
    }
  }

  async function handleSendToHiringManager() {
    if (!interest || !candidateSummary) return
    setSendingToHM(true)
    try {
      const res = await fetch('/api/send-summary-to-hiring-manager', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interestId: interest.id,
          editedCommissionPercentage: editedCommission,
          editedSalaryMin,
          editedSalaryMax
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      toast.success('Summary sent to hiring manager with notifications!')
      setSummaryCardSent(true)
      await loadInterest()
    } catch (err: any) {
      toast.error(err?.message || 'Failed to send summary')
    } finally {
      setSendingToHM(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-emerald-50">
        <Loader2 className="w-16 h-16 text-emerald-600 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-gradient-to-br from-slate-50 to-emerald-50">
        <div className="bg-white rounded-2xl p-10 text-center shadow-lg max-w-lg">
          <AlertCircle className="mx-auto mb-4 w-14 h-14 text-red-500" />
          <h1 className="font-bold text-2xl text-red-700 mb-4">Error</h1>
          <p className="mb-6 text-gray-700">{error}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={loadInterest}
              className="px-5 py-2 bg-emerald-600 text-white rounded font-bold hover:bg-emerald-700"
            >
              Try Again
            </button>
            <Link href="/dashboard/agency/interested-candidates">
              <button className="px-5 py-2 bg-gray-200 text-gray-800 rounded font-bold hover:bg-gray-300 flex items-center gap-2">
                <ArrowLeft className="w-5 h-5" /> Back
              </button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (!interest) return null

  const { jobs: job, candidates: candidate, profiles: agency } = interest
  const canGenerateRTR = interest.status === 'interested' && !!interest.cv_url

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <Link href="/dashboard/agency/interested-candidates">
            <button className="flex items-center text-gray-700 hover:text-gray-900 font-semibold transition">
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to Candidates
            </button>
          </Link>
        </div>

        {/* Job Details Section */}
        <section className="bg-white rounded-2xl p-8 shadow-xl border border-gray-200 mb-6">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">{job.title}</h1>
          <div className="flex flex-wrap gap-3 text-gray-600 mb-4">
            <span className="flex items-center gap-2"><MapPin className="w-4 h-4" />{job.location}</span>
            {job.employment_type && <span className="px-3 py-1 rounded-full bg-gray-100 text-xs font-bold">{job.employment_type}</span>}
          </div>
          <p className="text-lg font-semibold text-emerald-700 mb-4">
            £{job.salary_min?.toLocaleString()} - £{job.salary_max?.toLocaleString()}
          </p>
          {job.description && (
            <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 whitespace-pre-wrap">
              {job.description}
            </div>
          )}
        </section>

        {/* Candidate & Agency Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
            <h2 className="text-lg font-bold text-gray-900 mb-3">Candidate Information</h2>
            <div className="space-y-2 text-sm text-gray-700">
              <p className="flex items-center gap-2"><strong>Name:</strong> {candidate.name}</p>
              <p className="flex items-center gap-2"><Mail className="w-4 h-4" />{candidate.email}</p>
              {candidate.phone && <p className="flex items-center gap-2"><Phone className="w-4 h-4" />{candidate.phone}</p>}
              {candidate.location && <p className="flex items-center gap-2"><MapPin className="w-4 h-4" />{candidate.location}</p>}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
            <h2 className="text-lg font-bold text-gray-900 mb-3">Agency Information</h2>
            <div className="space-y-2 text-sm text-gray-700">
              <p><strong>Agency:</strong> {agency.full_name}</p>
              {agency.company && <p><strong>Company:</strong> {agency.company}</p>}
              <p className="flex items-center gap-2"><Mail className="w-4 h-4" />{agency.email}</p>
              {agency.phone && <p className="flex items-center gap-2"><Phone className="w-4 h-4" />{agency.phone}</p>}
            </div>
            {interest.ai_match_score && (
              <div className="mt-4">
                <div className="flex items-center gap-2 mb-1">
                  <Award className="w-4 h-4 text-emerald-600" />
                  <p className="text-xs font-bold text-gray-700">AI Match Score</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-emerald-500 to-green-600" style={{ width: `${interest.ai_match_score}%` }} />
                  </div>
                  <span className="text-lg font-bold text-emerald-700">{interest.ai_match_score}%</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Signed RTR Section */}
        {interest.right_to_represent_signed && (
          <section className="mb-6 p-6 bg-green-50 rounded-xl border border-green-300 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-10 w-10 text-green-600" />
              <div>
                <p className="font-semibold text-lg">Signed RTR Document Received</p>
                <p className="text-sm text-gray-700">
                  Candidate signed on {interest.right_to_represent_signed_at ? new Date(interest.right_to_represent_signed_at).toLocaleString() : 'N/A'}
                </p>
              </div>
            </div>
            {(interest.right_to_represent_pdf_url || interest.right_to_represent_url) && (
              <a
                href={interest.right_to_represent_pdf_url || interest.right_to_represent_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex gap-2 items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold"
              >
                <Download className="w-5 h-5" />
                Download Signed RTR
              </a>
            )}
          </section>
        )}

        {/* Generate AI Summary Button & Send to HM */}
        {interest.right_to_represent_signed && (
          <div className="mb-6 flex gap-3">
            <button
              onClick={handleGenerateSummary}
              disabled={generatingSummary}
              className="px-6 py-3 bg-blue-600 text-white font-bold rounded hover:bg-blue-700 transition disabled:opacity-50 flex items-center gap-2"
            >
              {generatingSummary ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating AI Summary...
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5" />
                  Generate / Refresh AI Summary Card
                </>
              )}
            </button>
            {candidateSummary && !summaryCardSent && (
              <button
                onClick={handleSendToHiringManager}
                disabled={sendingToHM}
                className="px-6 py-3 bg-emerald-600 text-white font-bold rounded hover:bg-emerald-700 transition disabled:opacity-50 flex items-center gap-2"
              >
                {sendingToHM ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Send to Hiring Manager
                  </>
                )}
              </button>
            )}
            {summaryCardSent && (
              <div className="px-6 py-3 bg-emerald-100 text-emerald-700 rounded font-semibold flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                Sent to Hiring Manager
              </div>
            )}
          </div>
        )}

        {/* AI Summary Card with Editable Fields */}
        {candidateSummary ? (
          <div className="mb-6 space-y-4">
            {/* Editable Commission & Salary Card */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-amber-200 bg-amber-50">
              <h3 className="font-bold text-lg text-gray-900 mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-amber-600" />
                Commission & Salary (Editable for Negotiations)
              </h3>
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-semibold text-gray-700 block mb-2">Commission %</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={editedCommission}
                      onChange={(e) => setEditedCommission(parseFloat(e.target.value))}
                      className="flex-1 border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
                      step="0.5"
                      min="0"
                      max="100"
                    />
                    <span className="text-sm font-bold text-gray-700">%</span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700 block mb-2">Salary Min (£)</label>
                  <input
                    type="number"
                    value={editedSalaryMin}
                    onChange={(e) => setEditedSalaryMin(parseInt(e.target.value))}
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700 block mb-2">Salary Max (£)</label>
                  <input
                    type="number"
                    value={editedSalaryMax}
                    onChange={(e) => setEditedSalaryMax(parseInt(e.target.value))}
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4 mt-4 p-3 bg-white rounded border border-amber-100">
                <p className="text-sm text-gray-700">
                  <strong>Estimated Commission Fee:</strong><br />
                  <span className="text-lg font-bold text-amber-700">£{Math.round((editedSalaryMax * editedCommission) / 100).toLocaleString()}</span>
                </p>
                <p className="text-sm text-gray-700">
                  <strong>Salary Range:</strong><br />
                  <span className="text-lg font-bold text-emerald-700">£{editedSalaryMin.toLocaleString()} - £{editedSalaryMax.toLocaleString()}</span>
                </p>
              </div>
            </div>

            {/* Market Research Card */}
            {candidateSummary.marketResearch && (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-blue-200 bg-blue-50">
                <h3 className="font-bold text-lg text-gray-900 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  Market Research Insights
                </h3>
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs font-semibold text-gray-600 mb-1">Industry</p>
                    <p className="font-bold text-gray-900">{candidateSummary.marketResearch.industry || 'Technology'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-600 mb-1">Salary Trend</p>
                    <p className="font-bold text-emerald-600">{candidateSummary.marketResearch.salaryTrend || 'Upward'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-600 mb-1">Market Demand</p>
                    <p className="font-bold text-gray-900">{candidateSummary.marketResearch.demandLevel || 'High'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-600 mb-1">Competition Level</p>
                    <p className="font-bold text-gray-900">{candidateSummary.marketResearch.competitionLevel || 'Moderate'}</p>
                  </div>
                </div>
              </div>
            )}

            {/* AI Summary Card Component */}
            <CandidateSummaryCard
              candidateName={candidate.name}
              jobTitle={job.title}
              summary={candidateSummary}
              onOpenFullReport={() => toast('Full report feature coming soon')}
            />
          </div>
        ) : interest.right_to_represent_signed ? (
          <p className="text-gray-600 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            AI summary not yet generated. Click the "Generate / Refresh AI Summary Card" button above to create it.
          </p>
        ) : null}
      </div>
    </div>
  )
}
