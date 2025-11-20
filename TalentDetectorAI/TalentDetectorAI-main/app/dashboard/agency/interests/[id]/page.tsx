'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
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
  Calendar,
  Award,
  Zap,
  Clock
} from 'lucide-react'
import toast from 'react-hot-toast'

export default function AgencyInterestDetailPage({ params }: { params: { id: string } }) {
  const [loading, setLoading] = useState(true)
  const [interest, setInterest] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [generatingRTR, setGeneratingRTR] = useState(false)
  const router = useRouter()

  useEffect(() => {
    loadInterest()
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

      const { data, error: fetchError } = await supabase
        .from('candidate_interests')
        .select(`
          *,
          candidates(id, name, email, phone, location, skills),
          jobs(id, title, description, location, salary_min, salary_max, employment_type, company),
          profiles!candidate_interests_agency_id_fkey(id, full_name, company, email, phone)
        `)
        .eq('id', params.id)
        .eq('agency_id', user.id)
        .single()

      if (fetchError || !data) {
        setError('Interest not found or not assigned to you')
        return
      }

      setInterest(data)
    } catch (err: any) {
      setError(err?.message || 'Failed to load interest detail')
    } finally {
      setLoading(false)
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

      toast.success('RTR (re)generated and sent to candidate for signature')
      await loadInterest()
    } catch (err: any) {
      toast.error(err?.message || 'RTR generation failed')
    } finally {
      setGeneratingRTR(false)
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

  const job = interest.jobs
  const candidate = interest.candidates
  const agency = interest.profiles

  const canGenerateRTR =
    interest.status === 'interested' && !!interest.cv_url

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/dashboard/agency/interested-candidates">
            <button className="flex items-center text-gray-700 hover:text-gray-900 font-semibold transition">
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to Candidate Activity
            </button>
          </Link>
        </div>

        <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-200">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                {job.title}
              </h1>
              <div className="flex flex-wrap gap-3 text-gray-600 mb-2">
                <span className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  {job.location}
                </span>
                {job.employment_type && (
                  <span className="px-3 py-1 rounded-full bg-gray-100 text-xs font-bold">
                    {job.employment_type}
                  </span>
                )}
              </div>
              <p className="text-lg font-semibold text-emerald-700">
                £{job.salary_min?.toLocaleString()} - £{job.salary_max?.toLocaleString()}
              </p>
            </div>
            <div className="text-right">
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
              <p className="text-xs text-gray-500 mt-2">
                Created:{' '}
                {new Date(interest.created_at).toLocaleString()}
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="bg-emerald-50 rounded-xl p-5 border border-emerald-200">
              <h2 className="text-lg font-bold text-gray-900 mb-3">
                Candidate
              </h2>
              <div className="space-y-2 text-sm text-gray-700">
                <p>
                  <span className="font-bold">Name:</span> {candidate.name}
                </p>
                <p className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  {candidate.email}
                </p>
                {candidate.phone && (
                  <p className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    {candidate.phone}
                  </p>
                )}
                {candidate.location && (
                  <p className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    {candidate.location}
                  </p>
                )}
                <p className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Responded:{' '}
                  {interest.candidate_responded_at
                    ? new Date(
                        interest.candidate_responded_at
                      ).toLocaleString()
                    : 'No response yet'}
                </p>
              </div>
              {candidate.skills && candidate.skills.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-bold text-gray-700 mb-1">
                    Skills
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {candidate.skills.slice(0, 8).map((skill: string, i: number) => (
                      <span
                        key={i}
                        className="px-2 py-1 rounded-full bg-white border border-gray-200 text-xs text-gray-700"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
              <h2 className="text-lg font-bold text-gray-900 mb-3">
                Agency
              </h2>
              <div className="space-y-2 text-sm text-gray-700">
                <p>
                  <span className="font-bold">Account:</span>{' '}
                  {agency.full_name}
                </p>
                {agency.company && (
                  <p>
                    <span className="font-bold">Company:</span>{' '}
                    {agency.company}
                  </p>
                )}
                <p className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  {agency.email}
                </p>
                {agency.phone && (
                  <p className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    {agency.phone}
                  </p>
                )}
              </div>
              {interest.ai_match_score && (
                <div className="mt-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Award className="w-4 h-4 text-emerald-600" />
                    <p className="text-xs font-bold text-gray-700">
                      AI Match Score
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-green-600 rounded-full"
                        style={{ width: `${interest.ai_match_score}%` }}
                      />
                    </div>
                    <span className="text-lg font-bold text-emerald-700">
                      {interest.ai_match_score}%
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {job.description && (
            <div className="mb-8 bg-gray-50 rounded-xl p-6 border border-gray-200">
              <h2 className="text-lg font-bold text-gray-900 mb-3">
                Job Description
              </h2>
              <div className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed">
                {job.description}
              </div>
            </div>
          )}

          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
              <h3 className="text-md font-bold text-gray-900 mb-3 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Candidate CV
              </h3>
              {interest.cv_url ? (
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    <p className="font-semibold">CV Uploaded</p>
                    {interest.cv_filename && (
                      <p className="text-xs text-gray-500">
                        {interest.cv_filename}
                      </p>
                    )}
                  </div>
                  <a
                    href={interest.cv_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </a>
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  Candidate has not uploaded a CV yet.
                </p>
              )}
            </div>

            <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
              <h3 className="text-md font-bold text-gray-900 mb-3 flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-600" />
                Right-to-Represent
              </h3>
              {interest.right_to_represent_url ? (
                <div className="space-y-3 text-sm text-gray-700">
                  <div className="flex items-center justify-between">
                    <a
                      href={interest.right_to_represent_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-purple-600 text-white text-xs font-bold hover:bg-purple-700"
                    >
                      <FileText className="w-4 h-4" />
                      View RTR
                    </a>
                    <button
                      onClick={handleGenerateRTR}
                      disabled={generatingRTR}
                      className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 text-white text-xs font-bold shadow hover:from-amber-600 hover:to-orange-700 disabled:opacity-50"
                    >
                      {generatingRTR ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Regenerating...
                        </>
                      ) : (
                        <>
                          <Zap className="w-4 h-4" />
                          Regenerate RTR
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500">
                    Status:{' '}
                    {interest.right_to_represent_signed
                      ? 'Signed by candidate'
                      : 'Awaiting candidate signature'}
                  </p>
                  <p className="text-xs text-gray-500">
                    Use “Regenerate RTR” if terms changed or you need to resend a corrected
                    version. The candidate will receive a fresh notification and link.
                  </p>
                </div>
              ) : canGenerateRTR ? (
                <button
                  onClick={handleGenerateRTR}
                  disabled={generatingRTR}
                  className="inline-flex items-center gap-2 px-4 py-3 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 text-white text-sm font-bold shadow hover:from-amber-600 hover:to-orange-700 disabled:opacity-50"
                >
                  {generatingRTR ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating RTR...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      Generate RTR
                    </>
                  )}
                </button>
              ) : (
                <p className="text-sm text-gray-500">
                  RTR can be generated after the candidate accepts and uploads a CV.
                </p>
              )}
            </div>

            <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
              <h3 className="text-md font-bold text-gray-900 mb-3 flex items-center gap-2">
                <Clock className="w-5 h-5 text-gray-600" />
                Activity Summary
              </h3>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>
                  • Status: <span className="font-semibold">{interest.status}</span>
                </li>
                <li>
                  • Candidate acceptance:{' '}
                  <span className="font-semibold">
                    {interest.candidate_acceptance_status || 'pending_response'}
                  </span>
                </li>
                <li>
                  • Responded at:{' '}
                  {interest.candidate_responded_at
                    ? new Date(
                        interest.candidate_responded_at
                      ).toLocaleString()
                    : 'N/A'}
                </li>
                <li>
                  • RTR signed:{' '}
                  <span className="font-semibold">
                    {interest.right_to_represent_signed ? 'Yes' : 'No'}
                  </span>
                </li>
                {interest.agency_notes && (
                  <li>
                    • Notes:{' '}
                    <span className="font-semibold">{interest.agency_notes}</span>
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
