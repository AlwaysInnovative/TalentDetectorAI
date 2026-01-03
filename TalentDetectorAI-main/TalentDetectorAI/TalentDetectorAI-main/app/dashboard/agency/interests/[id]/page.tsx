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
  Clock,
  Sparkles
} from 'lucide-react'
import toast from 'react-hot-toast'
import { SummaryCard } from '@/components/summary-card'

export default function AgencyInterestDetailPage({ params }: { params: { id: string } }) {
  const [loading, setLoading] = useState(true)
  const [interest, setInterest] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [generatingRTR, setGeneratingRTR] = useState(false)
  const router = useRouter()

  useEffect(() => {
    loadInterest()
  }, [])

  async function loadInterest() {
    try {
      setLoading(true)
      setError(null)
      const supabase = createClient()
      
      console.log('🔍 Step 1: Getting user...')
      const { data: { user } } = await supabase.auth.getUser()
      console.log('👤 User:', user?.id)
      
      if (!user) {
        setError('Not logged in as agency user')
        return
      }

      console.log('🔍 Step 2: Fetching interest with ID:', params.id)
      console.log('🔍 Agency ID:', user.id)
      
      const { data: interestData, error: interestError } = await supabase
        .from('candidate_interests')
        .select('*')
        .eq('id', params.id)
        .eq('agency_id', user.id)
        .single()

      console.log('📊 Interest data:', interestData)
      console.log('❌ Interest error:', interestError)

      if (interestError || !interestData) {
        console.error('❌ FAILED at interest fetch:', interestError)
        setError('Interest not found or not assigned to you')
        return
      }

      console.log('✅ Interest found! candidate_id:', interestData.candidate_id)
      console.log('✅ Interest found! job_id:', interestData.job_id)

      console.log('🔍 Step 3: Fetching candidate...')
      const { data: candidateData, error: candidateError } = await supabase
        .from('candidates')
        .select('*')
        .eq('id', interestData.candidate_id)
        .single()
      
      console.log('📊 Candidate data:', candidateData)
      console.log('❌ Candidate error:', candidateError)

      if (candidateError || !candidateData) {
        console.error('❌ FAILED at candidate fetch')
        setError('Could not load candidate information')
        return
      }

      console.log('🔍 Step 4: Fetching job...')
      const { data: jobData, error: jobError } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', interestData.job_id)
        .single()
      
      console.log('📊 Job data:', jobData)
      console.log('❌ Job error:', jobError)

      if (jobError || !jobData) {
        console.error('❌ FAILED at job fetch:', jobError)
        setError('Could not load job information')
        return
      }

      console.log('🔍 Step 5: Fetching agency profile...')
      const { data: agencyData, error: agencyError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', interestData.agency_id)
        .single()
      
      console.log('📊 Agency data:', agencyData)
      console.log('❌ Agency error:', agencyError)

      const completeInterest = {
        ...interestData,
        candidates: candidateData,
        jobs: jobData,
        profiles: agencyError
          ? {
              id: interestData.agency_id,
              full_name: 'Agency User',
              company: null,
              email: user.email || '',
              phone: null
            }
          : agencyData
      }

      console.log('✅ COMPLETE INTEREST:', completeInterest)
      setInterest(completeInterest)
    } catch (err: any) {
      console.error('💥 CAUGHT ERROR:', err)
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
  
  const rtrSigned = interest.right_to_represent_signed

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <Link href="/dashboard/agency/interested-candidates">
            <button className="flex items-center text-gray-700 hover:text-gray-900 font-semibold transition">
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to Candidates
            </button>
          </Link>
        </div>

        <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-200">
          {/* Header Section */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                {job?.title || 'No Job Title'}
              </h1>
              <div className="flex flex-wrap gap-3 text-gray-600 mb-2">
                {job?.location && (
                  <span className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    {job.location}
                  </span>
                )}
                {job?.employment_type && (
                  <span className="px-3 py-1 rounded-full bg-gray-100 text-xs font-bold">
                    {job.employment_type}
                  </span>
                )}
              </div>
              {job?.salary_min && job?.salary_max && (
                <p className="text-lg font-semibold text-emerald-700">
                  £{job.salary_min.toLocaleString()} - £{job.salary_max.toLocaleString()}
                </p>
              )}
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
                Created: {new Date(interest.created_at).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Candidate & Agency Info Grid */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="bg-emerald-50 rounded-xl p-5 border border-emerald-200">
              <h2 className="text-lg font-bold text-gray-900 mb-3">
                Candidate
              </h2>
              <div className="space-y-2 text-sm text-gray-700">
                <p>
                  <span className="font-bold">Name:</span> {candidate?.name || 'N/A'}
                </p>
                <p className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  {candidate?.email || 'N/A'}
                </p>
                {candidate?.phone && (
                  <p className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    {candidate.phone}
                  </p>
                )}
                {candidate?.location && (
                  <p className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    {candidate.location}
                  </p>
                )}
                <p className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Responded:{' '}
                  {interest.candidate_responded_at
                    ? new Date(interest.candidate_responded_at).toLocaleString()
                    : 'No response yet'}
                </p>
              </div>
              {candidate?.skills && candidate.skills.length > 0 && (
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
                  {agency?.full_name || 'N/A'}
                </p>
                {agency?.company && (
                  <p>
                    <span className="font-bold">Company:</span>{' '}
                    {agency.company}
                  </p>
                )}
                <p className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  {agency?.email || 'N/A'}
                </p>
                {agency?.phone && (
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

          {/* Job Description */}
          {job?.description && (
            <div className="mb-8 bg-gray-50 rounded-xl p-6 border border-gray-200">
              <h2 className="text-lg font-bold text-gray-900 mb-3">
                Job Description
              </h2>
              <div className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed">
                {job.description}
              </div>
            </div>
          )}

          {/* Documents & Activity Section */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {/* CV Section */}
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

            {/* RTR Section */}
            <div className="bg-white rounded-xl p-5 border border-gray-200 shadow-sm">
              <h3 className="text-md font-bold text-gray-900 mb-3 flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-600" />
                Right-to-Represent
              </h3>
              {interest.right_to_represent_url ? (
                <div className="space-y-3 text-sm text-gray-700">
                  <div className="flex items-center justify-between gap-2">
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
                          Regenerate
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500">
                    Status:{' '}
                    <span className={rtrSigned ? 'text-green-700 font-bold' : 'text-amber-700 font-bold'}>
                      {rtrSigned ? '✓ Signed by candidate' : '⏳ Awaiting signature'}
                    </span>
                  </p>
                </div>
              ) : canGenerateRTR ? (
                <button
                  onClick={handleGenerateRTR}
                  disabled={generatingRTR}
                  className="inline-flex items-center gap-2 px-4 py-3 rounded-lg bg-gradient-to-r from-amber-500 to-orange-600 text-white text-sm font-bold shadow hover:from-amber-600 hover:to-orange-700 disabled:opacity-50 w-full justify-center"
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
                  RTR can be generated after candidate accepts and uploads CV.
                </p>
              )}
            </div>

            {/* Activity Summary */}
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
                  • Acceptance:{' '}
                  <span className="font-semibold">
                    {interest.candidate_acceptance_status || 'pending'}
                  </span>
                </li>
                <li>
                  • Responded:{' '}
                  {interest.candidate_responded_at
                    ? new Date(interest.candidate_responded_at).toLocaleString()
                    : 'N/A'}
                </li>
                <li>
                  • RTR Signed:{' '}
                  <span className={`font-semibold ${rtrSigned ? 'text-green-700' : 'text-amber-700'}`}>
                    {rtrSigned ? 'Yes ✓' : 'No ⏳'}
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

          {/* 🎯 AI SUMMARY CARD SECTION - NEW */}
          {rtrSigned && (
            <div className="mt-8 p-6 bg-gradient-to-r from-emerald-50 via-cyan-50 to-blue-50 rounded-2xl border-2 border-emerald-300 shadow-lg">
              <div className="flex items-center gap-3 mb-6">
                <Sparkles className="w-8 h-8 text-emerald-600 animate-pulse" />
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">AI Candidate Summary</h2>
                  <p className="text-sm text-gray-600">Generate and send AI-powered candidate analysis to hiring manager</p>
                </div>
              </div>
              
              <SummaryCard
                interestId={params.id}
                candidateId={interest.candidate_id}
                jobId={interest.job_id}
                agencyId={interest.agency_id}
                onSent={(summaryId) => {
                  console.log('✅ Summary sent to HM:', summaryId)
                  toast.success('✅ Summary sent to hiring manager!')
                  loadInterest()
                }}
                onError={(error) => {
                  console.error('❌ Summary error:', error)
                  toast.error(`❌ ${error}`)
                }}
              />
            </div>
          )}

          {/* Show message if RTR not signed */}
          {!rtrSigned && (
            <div className="mt-8 p-6 bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl border-2 border-amber-300 shadow-lg">
              <div className="flex items-center gap-3">
                <Zap className="w-8 h-8 text-amber-600" />
                <div>
                  <h3 className="text-lg font-bold text-amber-900">⏳ Summary Generation Locked</h3>
                  <p className="text-sm text-amber-800 mt-1">
                    Summary generation will be available once the candidate signs the Right-to-Represent agreement.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
