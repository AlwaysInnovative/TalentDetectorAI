#!/bin/bash
# fix_rtr_full_pipeline.sh
# Run from repo root. This OVERWRITES the listed files.

set -e

echo "=== Applying FULL RTR workflow (multi-interest, regenerate, notifications) ==="

########################################
# 1) API: Candidate respond to interest
#    FILE: app/api/candidate/respond-to-interest/route.ts
########################################
mkdir -p app/api/candidate/respond-to-interest

cat > app/api/candidate/respond-to-interest/route.ts << 'EOF'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const { interest_id, accepted, comment } = await request.json()

    if (!interest_id || typeof accepted !== 'boolean') {
      return NextResponse.json(
        { error: 'Missing or invalid fields: interest_id, accepted' },
        { status: 400 }
      )
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const { data: interest, error: fetchError } = await supabaseAdmin
      .from('candidate_interests')
      .select(`
        *,
        candidates(id, name, email, user_id),
        jobs(id, title),
        profiles!candidate_interests_agency_id_fkey(id, full_name, email)
      `)
      .eq('id', interest_id)
      .single()

    if (fetchError || !interest) {
      return NextResponse.json({ error: 'Interest not found' }, { status: 404 })
    }

    const newStatus = accepted ? 'interested' : 'not_interested'
    const acceptance = accepted ? 'accepted' : 'rejected'

    const { error: updateError } = await supabaseAdmin
      .from('candidate_interests')
      .update({
        candidate_acceptance_status: acceptance,
        candidate_response: acceptance,
        candidate_response_comment: comment || null,
        candidate_responded_at: new Date().toISOString(),
        status: newStatus
      })
      .eq('id', interest_id)

    if (updateError) {
      console.error('Update error:', updateError)
      return NextResponse.json({ error: 'Failed to save response' }, { status: 500 })
    }

    await supabaseAdmin.from('notifications').insert({
      user_id: interest.agency_id,
      type: 'candidate_responded',
      title: accepted ? 'Candidate accepted opportunity' : 'Candidate declined opportunity',
      message: `${interest.candidates.name} has ${accepted ? 'accepted' : 'declined'} the ${interest.jobs.title} opportunity${comment ? ': ' + comment : ''}`,
      link: `/dashboard/agency/interests/${interest_id}`,
      ai_priority: 'high',
      metadata: {
        interest_id,
        candidate_id: interest.candidate_id,
        accepted,
        comment
      }
    })

    return NextResponse.json({
      success: true,
      status: newStatus,
      acceptance
    })
  } catch (error: any) {
    console.error('Respond-to-interest error:', error)
    return NextResponse.json(
      { error: error?.message || 'Unexpected error' },
      { status: 500 }
    )
  }
}
EOF

echo "✅ app/api/candidate/respond-to-interest/route.ts"

########################################
# 2) Candidate interest detail page
#    FILE: app/dashboard/candidate/interests/[id]/page.tsx
########################################
mkdir -p app/dashboard/candidate/interests/[id]

cat > app/dashboard/candidate/interests/[id]/page.tsx << 'EOF'
'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Loader2,
  AlertCircle,
  ArrowLeft,
  FileText,
  ThumbsUp,
  ThumbsDown,
  Upload,
  Download,
  CheckCircle
} from 'lucide-react'
import toast from 'react-hot-toast'
import { mutate } from 'swr'

export default function CandidateInterestDetailPage({ params }: { params: { id: string } }) {
  const [loading, setLoading] = useState(true)
  const [interest, setInterest] = useState<any>(null)
  const [error, setError] = useState('')
  const [responding, setResponding] = useState(false)
  const [responseComment, setResponseComment] = useState('')
  const [cvFile, setCvFile] = useState<File | null>(null)
  const [uploadingCv, setUploadingCv] = useState(false)
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadInterest()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadInterest() {
    try {
      setLoading(true)
      setError('')
      const supabase = createClient()

      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        setError('Not logged in')
        return
      }

      const { data: candidate, error: candErr } = await supabase
        .from('candidates')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (candErr || !candidate) {
        setError('Candidate profile not found')
        return
      }

      const { data, error: interestErr } = await supabase
        .from('candidate_interests')
        .select(`
          *,
          jobs(id, title, description, location, salary_min, salary_max, department, employment_type),
          candidates(id, name, email, phone, location),
          profiles!candidate_interests_agency_id_fkey(full_name, company, email)
        `)
        .eq('id', params.id)
        .eq('candidate_id', candidate.id)
        .single()

      if (interestErr || !data) {
        setError('Opportunity not found or not assigned to you')
        return
      }

      setInterest(data)
    } catch (err: any) {
      setError(err?.message || 'Failed to load opportunity')
    } finally {
      setLoading(false)
    }
  }

  async function handleUploadCv() {
    if (!cvFile) {
      toast.error('Please select a CV file first')
      return
    }

    setUploadingCv(true)
    try {
      const supabase = createClient()
      const filePath = `cv_${Date.now()}_${cvFile.name}`

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, cvFile)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath)

      const { error: updateError } = await supabase
        .from('candidate_interests')
        .update({
          cv_url: publicUrl,
          cv_filename: cvFile.name,
          cv_uploaded_at: new Date().toISOString()
        })
        .eq('id', interest.id)

      if (updateError) throw updateError

      toast.success('CV uploaded successfully!')
      setCvFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      await loadInterest()
      await mutate('candidate-interests')
    } catch (err: any) {
      toast.error('Failed to upload CV: ' + (err?.message || 'Unknown error'))
    } finally {
      setUploadingCv(false)
    }
  }

  async function handleRespond(accepted: boolean) {
    if (responding || !interest) return

    setResponding(true)
    try {
      const res = await fetch('/api/candidate/respond-to-interest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interest_id: interest.id,
          accepted,
          comment: responseComment
        })
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Failed to submit response')
        return
      }

      toast.success(
        accepted
          ? 'You accepted this opportunity! The agency will contact you soon.'
          : 'You declined this opportunity.'
      )

      setResponseComment('')
      await loadInterest()
      await mutate('candidate-interests')

      setTimeout(() => {
        router.push('/dashboard/candidate/interests')
      }, 1500)
    } catch (err: any) {
      toast.error('Could not submit response')
    } finally {
      setResponding(false)
    }
  }

  function getStatusMessage(interest: any) {
    if (interest.status === 'sent' && interest.candidate_acceptance_status === 'pending_response') {
      return { text: 'Please review the job details below and respond with your decision.', color: 'yellow' }
    }
    if (interest.status === 'interested') {
      return { text: 'Thank you for your interest! The agency will follow up with the next steps.', color: 'green' }
    }
    if (interest.status === 'not_interested') {
      return { text: 'You have declined this opportunity.', color: 'red' }
    }
    if (interest.status === 'rtr_ready') {
      return { text: 'Your Right to Represent agreement is ready for signature.', color: 'purple' }
    }
    return null
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-indigo-50">
        <Loader2 className="w-14 h-14 text-blue-600 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-gradient-to-br from-slate-50 to-indigo-50">
        <div className="bg-white rounded-2xl p-10 text-center shadow-lg max-w-lg">
          <AlertCircle className="mx-auto mb-4 w-14 h-14 text-red-500" />
          <h1 className="font-bold text-2xl text-red-700 mb-4">Error</h1>
          <p className="mb-6 text-gray-700">{error}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={loadInterest}
              className="px-5 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700"
            >
              Try Again
            </button>
            <Link href="/dashboard/candidate/interests">
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
  const statusInfo = getStatusMessage(interest)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-4">
          <Link href="/dashboard/candidate/interests">
            <button className="flex items-center text-blue-600 hover:text-blue-800 font-semibold transition">
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to My Opportunities
            </button>
          </Link>
        </div>

        <div className="bg-white rounded-2xl p-8 shadow-xl">
          <div className="mb-6">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">{job.title}</h1>
            <div className="flex flex-wrap gap-4 text-lg text-gray-600 mb-3">
              <span>📍 {job.location}</span>
              {job.department && <span>• {job.department}</span>}
              {job.employment_type && <span>• {job.employment_type}</span>}
            </div>
            <p className="text-2xl font-bold text-green-600">
              £{job.salary_min?.toLocaleString()} - £{job.salary_max?.toLocaleString()}
            </p>
          </div>

          {statusInfo && (
            <div
              className={`mb-6 p-4 rounded-lg border-2 ${
                statusInfo.color === 'yellow'
                  ? 'bg-yellow-50 border-yellow-300 text-yellow-800'
                  : statusInfo.color === 'green'
                  ? 'bg-green-50 border-green-300 text-green-800'
                  : statusInfo.color === 'red'
                  ? 'bg-red-50 border-red-300 text-red-800'
                  : 'bg-purple-50 border-purple-300 text-purple-800'
              }`}
            >
              <p className="font-semibold">{statusInfo.text}</p>
            </div>
          )}

          {job.description && (
            <div className="mb-6 p-6 bg-gray-50 rounded-xl border border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 mb-3">Job Description</h2>
              <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">{job.description}</div>
            </div>
          )}

          <div className="mb-6 p-6 bg-blue-50 rounded-xl border border-blue-200">
            <h2 className="text-xl font-bold text-gray-900 mb-3">Agency Information</h2>
            <div className="space-y-2 text-gray-700">
              <p>
                <strong>Agency:</strong> {agency.full_name}
              </p>
              {agency.company && (
                <p>
                  <strong>Company:</strong> {agency.company}
                </p>
              )}
              <p>
                <strong>Contact:</strong> {agency.email}
              </p>
            </div>
          </div>

          <div className="mb-6 p-6 bg-purple-50 rounded-xl border border-purple-200">
            <h2 className="text-xl font-bold text-gray-900 mb-3">Your Details</h2>
            <div className="space-y-2 text-gray-700">
              <p>
                <strong>Name:</strong> {candidate.name}
              </p>
              <p>
                <strong>Email:</strong> {candidate.email}
              </p>
              {candidate.phone && (
                <p>
                  <strong>Phone:</strong> {candidate.phone}
                </p>
              )}
              {candidate.location && (
                <p>
                  <strong>Location:</strong> {candidate.location}
                </p>
              )}
            </div>
          </div>

          {!interest.cv_url && (
            <div className="mb-8 p-6 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border-2 border-purple-300">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Upload className="w-6 h-6 text-purple-600" />
                Upload Your CV
              </h2>
              <input
                type="file"
                ref={fileInputRef}
                disabled={uploadingCv}
                accept=".pdf,.doc,.docx"
                onChange={(e) => setCvFile(e.target.files?.[0] || null)}
                className="block w-full border-2 border-gray-300 rounded-lg px-4 py-2 mb-4"
              />
              <button
                onClick={handleUploadCv}
                disabled={!cvFile || uploadingCv}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {uploadingCv ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5" />
                    Upload CV
                  </>
                )}
              </button>
            </div>
          )}

          {interest.cv_url && (
            <div className="mb-8 p-6 bg-green-50 rounded-xl border-2 border-green-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                  <div>
                    <h3 className="font-bold text-gray-900">CV Uploaded</h3>
                    <p className="text-sm text-gray-600">{interest.cv_filename}</p>
                  </div>
                </div>
                <a
                  href={interest.cv_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold transition"
                >
                  <Download className="w-5 h-5" />
                  Download
                </a>
              </div>
            </div>
          )}

          {interest.status === 'sent' &&
            interest.candidate_acceptance_status === 'pending_response' && (
              <div className="mb-8">
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  Your Response
                </h2>
                <textarea
                  rows={3}
                  value={responseComment}
                  onChange={(e) => setResponseComment(e.target.value)}
                  className="w-full border-2 border-gray-300 rounded-lg p-4 mb-4 focus:border-blue-500 focus:outline-none"
                  placeholder="Add any comments or questions (optional)..."
                />
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => handleRespond(false)}
                    disabled={responding}
                    className="px-6 py-4 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-lg disabled:opacity-50 flex items-center justify-center gap-2 transition"
                  >
                    {responding ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      <ThumbsDown className="w-6 h-6" />
                    )}
                    Decline
                  </button>
                  <button
                    onClick={() => handleRespond(true)}
                    disabled={responding}
                    className="px-6 py-4 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-lg disabled:opacity-50 flex items-center justify-center gap-2 transition"
                  >
                    {responding ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                      <ThumbsUp className="w-6 h-6" />
                    )}
                    Accept
                  </button>
                </div>
              </div>
            )}

          {interest.right_to_represent_url && interest.status === 'rtr_ready' && (
            <div className="p-6 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-2xl text-center shadow-2xl">
              <h2 className="text-2xl font-bold mb-4">
                Right to Represent Agreement Ready
              </h2>
              <p className="mb-6">
                Your RTR document is ready for review and signature
              </p>
              <Link href={`/dashboard/candidate/interests/${interest.id}/sign-rtr`}>
                <button className="inline-flex items-center gap-2 px-8 py-4 bg-white text-purple-600 rounded-xl font-bold text-lg hover:shadow-xl transition">
                  <FileText className="w-6 h-6" />
                  Review & Sign RTR
                </button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
EOF

echo "✅ app/dashboard/candidate/interests/[id]/page.tsx"

########################################
# 3) Candidate interests list (multi-job)
#    FILE: app/dashboard/candidate/interests/page.tsx
########################################
mkdir -p app/dashboard/candidate/interests

cat > app/dashboard/candidate/interests/page.tsx << 'EOF'
'use client'
import useSWR from 'swr'
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
  DollarSign
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import DynamicBackground from '@/components/ui/DynamicBackground'

const fetcher = async () => {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: candidateData } = await supabase
    .from('candidates')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (!candidateData) return []

  const { data } = await supabase
    .from('candidate_interests')
    .select(`
      *,
      jobs(*),
      profiles!candidate_interests_agency_id_fkey(full_name, company)
    `)
    .eq('candidate_id', candidateData.id)
    .order('created_at', { ascending: false })

  return data || []
}

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
  const { data: interests } = useSWR('candidate-interests', fetcher, { refreshInterval: 5000 })

  const unreadCount =
    interests?.filter(
      (i: any) => !i.viewed_by_candidate && !i.candidate_responded_at
    ).length || 0

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
            {interests?.map((interest: any, index: number) => {
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
                              {job.title}
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
                              {job.location}
                            </span>
                            <span className="flex items-center gap-2 text-gray-600">
                              <DollarSign className="w-5 h-5" />
                              {interest.salary_range}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-sm text-gray-600 mb-4">
                            <span className="font-bold">
                              From: {agency.full_name}
                            </span>
                            {agency.company && <span>• {agency.company}</span>}
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

          {(!interests || interests.length === 0) && (
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
EOF

echo "✅ app/dashboard/candidate/interests/page.tsx"

########################################
# 4) Agency multi-job dashboard + regenerate RTR
#    FILE: app/dashboard/agency/interested-candidates/page.tsx
########################################
mkdir -p app/dashboard/agency/interested-candidates

cat > app/dashboard/agency/interested-candidates/page.tsx << 'EOF'
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
  candidate_acceptance_status?: string | null
  cv_filename?: string | null
  agency_notes?: string | null
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
        `RTR (re)generated and sent to ${interest.candidates.name} for ${interest.jobs.title}`
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
                        {items.map((interest) => {
                          const canGenerateRTR =
                            interest.status === 'interested' &&
                            !!interest.cv_url

                          return (
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
                                  <div className="flex flex-col gap-1">
                                    <a
                                      href={interest.right_to_represent_url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center gap-1 text-purple-600 hover:underline"
                                    >
                                      <FileText className="w-4 h-4" />
                                      View RTR
                                    </a>
                                    <button
                                      onClick={() => handleGenerateRTR(interest)}
                                      disabled={generatingRTR === interest.id}
                                      className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500 text-white text-[11px] font-bold shadow hover:bg-amber-600 disabled:opacity-50"
                                    >
                                      {generatingRTR === interest.id ? (
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                      ) : (
                                        <Zap className="w-3 h-3" />
                                      )}
                                      Regenerate
                                    </button>
                                  </div>
                                ) : canGenerateRTR ? (
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
                                    Generate RTR
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
                          )
                        })}
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
EOF

echo "✅ app/dashboard/agency/interested-candidates/page.tsx"

########################################
# 5) Agency interest detail page (view + regenerate RTR)
#    FILE: app/dashboard/agency/interests/[id]/page.tsx
########################################
mkdir -p app/dashboard/agency/interests/[id]

cat > app/dashboard/agency/interests/[id]/page.tsx << 'EOF'
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
EOF

echo "✅ app/dashboard/agency/interests/[id]/page.tsx"

########################################
# 6) RTR generation API – PDF-like (text) + regenerate
#    FILE: app/api/generate-rtr-auto/route.ts
########################################
mkdir -p app/api/generate-rtr-auto

cat > app/api/generate-rtr-auto/route.ts << 'EOF'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

function generateRTRContent(interest: any, candidate: any, job: any, agency: any): string {
  return `
==============================================================
                 RIGHT TO REPRESENT AGREEMENT
                 Powered by TalentDetector AI
==============================================================

Document ID: ${interest.id}
Generated: ${new Date().toLocaleString('en-GB', { timeZone: 'UTC' })}
AI Match Score: ${interest.ai_match_score ?? 'N/A'}%

==============================================================
PARTIES

Recruitment Agency
  Name      : ${agency.full_name}
  Company   : ${agency.company || 'Not specified'}
  Email     : ${agency.email}
  Phone     : ${agency.phone || 'Not specified'}

Candidate
  Name      : ${candidate.name}
  Email     : ${candidate.email}
  Phone     : ${candidate.phone || 'Not specified'}
  Location  : ${candidate.location || 'Not specified'}

Position
  Title     : ${job.title}
  Company   : ${job.company || 'Not specified'}
  Location  : ${job.location}
  Type      : ${job.employment_type || 'Not specified'}
  Salary    : £${job.salary_min?.toLocaleString()} - £${job.salary_max?.toLocaleString()}

==============================================================
1. EXCLUSIVE REPRESENTATION

1.1 The Candidate grants the Agency the exclusive right to represent
    them for the Position defined above for a period of 90 days from
    the date of Candidate signature ("Representation Period").

1.2 During the Representation Period, the Candidate will not apply
    directly or via any other agency for the same role or client.

1.3 The Agency will act as the primary point of contact between the
    Candidate and the Client (hiring company).

==============================================================
2. SCOPE OF AGENCY SERVICES

2.1 The Agency may:
    • Present the Candidate's CV and profile to the Client.
    • Arrange and coordinate interviews.
    • Provide feedback and guidance to the Candidate.
    • Negotiate offers in consultation with the Candidate.

2.2 The Agency will:
    • Use reasonable care and skill in representing the Candidate.
    • Keep the Candidate informed of material updates.
    • Maintain confidentiality of Candidate's personal data.

==============================================================
3. CANDIDATE OBLIGATIONS

3.1 The Candidate agrees to:
    • Provide accurate and complete information.
    • Inform the Agency promptly of any direct contact from the Client.
    • Attend interviews arranged by the Agency or provide reasonable notice.
    • Notify the Agency of any other applications to the same Client.

3.2 The Candidate confirms they have not been introduced to the Client
    for this Position by any other party within the last 12 months.

==============================================================
4. FEES AND COMPENSATION

4.1 No fee is payable by the Candidate to the Agency.

4.2 The Agency's fee, if applicable, will be paid by the Client and
    will not reduce the Candidate's agreed compensation.

==============================================================
5. TERMINATION

5.1 Either party may terminate this Agreement by providing written
    notice. Termination does not affect any introductions or
    interviews already arranged.

5.2 If the Candidate accepts an offer for the Position during the
    Representation Period (or as a result of the Agency's introduction),
    this Agreement may be relied upon to establish the Agency's role.

==============================================================
6. DATA PROTECTION

Both parties agree to comply with applicable data protection laws,
including UK GDPR and the Data Protection Act 2018 (where relevant).

==============================================================
7. ELECTRONIC SIGNATURE

By signing electronically, the Candidate acknowledges that:
    • They have read and understood this Agreement.
    • They consent to electronic delivery and storage.
    • Their electronic signature has the same legal effect as a
      handwritten signature under relevant e-signature laws.

--------------------------------------------------------------
Candidate Signature: ________________________________

Full Name          : ${candidate.name}
Date (to be filled at signing)
IP Address (captured at signing)
User Agent (captured at signing)
--------------------------------------------------------------

Generated by TalentDetector AI
© ${new Date().getFullYear()} TalentDetector. All rights reserved.
`.trim()
}

export async function POST(request: Request) {
  const start = Date.now()
  try {
    const { interestId } = await request.json()

    if (!interestId) {
      return NextResponse.json({ error: 'Interest ID required' }, { status: 400 })
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: { autoRefreshToken: false, persistSession: false }
      }
    )

    const { data: interest, error: fetchError } = await supabaseAdmin
      .from('candidate_interests')
      .select(`
        *,
        candidates(id, name, email, phone, location, user_id),
        jobs(id, title, company, location, salary_min, salary_max, employment_type),
        profiles!candidate_interests_agency_id_fkey(id, full_name, company, email, phone)
      `)
      .eq('id', interestId)
      .single()

    if (fetchError || !interest) {
      throw new Error(`Interest not found: ${fetchError?.message || ''}`)
    }

    const candidate = interest.candidates
    const job = interest.jobs
    const agency = interest.profiles

    const rtrContent = generateRTRContent(interest, candidate, job, agency)

    // Single stable path per interest so regeneration overwrites
    const fileName = `rtr/${interestId}.txt`
    const { error: uploadError } = await supabaseAdmin.storage
      .from('documents')
      .upload(fileName, rtrContent, {
        contentType: 'text/plain',
        upsert: true,
        cacheControl: '0'
      })

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`)
    }

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('documents')
      .getPublicUrl(fileName)

    const { error: updateError } = await supabaseAdmin
      .from('candidate_interests')
      .update({
        right_to_represent_url: publicUrl,
        status: 'rtr_ready',
        agency_notes: `RTR (re)generated on ${new Date().toISOString()}`
      })
      .eq('id', interestId)

    if (updateError) {
      throw new Error(`Update failed: ${updateError.message}`)
    }

    await Promise.all([
      candidate?.user_id &&
        supabaseAdmin.from('notifications').insert({
          user_id: candidate.user_id,
          type: 'rtr_ready',
          title: '✍️ RTR ready to sign',
          message: `Your Right-to-Represent agreement for "${job.title}" is ready (or has been updated) and awaits your signature.`,
          link: `/dashboard/candidate/interests/${interestId}/sign-rtr`,
          ai_priority: 'high',
          metadata: { interest_id: interestId, job_title: job.title, regenerated: true }
        }),
      supabaseAdmin.from('notifications').insert({
        user_id: interest.agency_id,
        type: 'rtr_generated',
        title: '📄 RTR (re)generated',
        message: `RTR for ${candidate.name} on "${job.title}" has been (re)generated and sent to the candidate.`,
        link: `/dashboard/agency/interests/${interestId}`,
        ai_priority: 'normal',
        metadata: { interest_id: interestId, candidate_name: candidate.name, regenerated: true }
      })
    ])

    const duration = Date.now() - start

    return NextResponse.json({
      success: true,
      rtr_url: publicUrl,
      duration_ms: duration
    })
  } catch (err: any) {
    console.error('RTR generation error:', err)
    return NextResponse.json(
      { error: err?.message || 'RTR generation failed' },
      { status: 500 }
    )
  }
}
EOF

echo "✅ app/api/generate-rtr-auto/route.ts"

########################################
# 7) Candidate sign-RTR page (re-uses generated RTR)
#    FILE: app/dashboard/candidate/interests/[id]/sign-rtr/page.tsx
########################################
mkdir -p app/dashboard/candidate/interests/[id]/sign-rtr

cat > app/dashboard/candidate/interests/[id]/sign-rtr/page.tsx << 'EOF'
'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import {
  FileText,
  CheckCircle,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Shield,
  Award,
  Clock,
  Download
} from 'lucide-react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import Link from 'next/link'

export default function SignRTRPage({ params }: { params: { id: string } }) {
  const [interest, setInterest] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [signing, setSigning] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [signature, setSignature] = useState('')
  const [ipAddress, setIpAddress] = useState('')
  const [showSuccess, setShowSuccess] = useState(false)
  const documentRef = useRef<HTMLIFrameElement>(null)
  const router = useRouter()

  useEffect(() => {
    loadInterest()
    fetchIP()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadInterest() {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('candidate_interests')
        .select(`
          *,
          jobs(title, company, location),
          profiles!candidate_interests_agency_id_fkey(full_name, company, email),
          candidates(name)
        `)
        .eq('id', params.id)
        .single()

      if (error) throw error

      setInterest(data)

      if (data.right_to_represent_signed) {
        setShowSuccess(true)
      }

      if (!data.right_to_represent_url) {
        toast.error('RTR document is not available yet')
      }
    } catch (error: any) {
      console.error('Load error:', error)
      toast.error('Failed to load document')
    } finally {
      setLoading(false)
    }
  }

  async function fetchIP() {
    try {
      const response = await fetch('https://api.ipify.org?format=json')
      const data = await response.json()
      setIpAddress(data.ip)
    } catch {
      setIpAddress('Unknown')
    }
  }

  function generateSignatureHash(signature: string, timestamp: string): string {
    const combined = signature + timestamp + params.id
    let hash = 0
    for (let i = 0; i < combined.length; i++) {
      hash = (hash << 5) - hash + combined.charCodeAt(i)
      hash = hash & hash
    }
    return Math.abs(hash).toString(16).toUpperCase()
  }

  async function handleSign() {
    if (!agreed) {
      toast.error('Please agree to the terms')
      return
    }

    if (!signature || signature.trim().length < 3) {
      toast.error('Please enter your full name as signature')
      return
    }

    setSigning(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const timestamp = new Date().toISOString()

      const signatureData = {
        signed_by: user?.id,
        signed_by_name: signature,
        signed_at: timestamp,
        ip_address: ipAddress,
        user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        signature_hash: generateSignatureHash(signature, timestamp)
      }

      const { error: updateError } = await supabase
        .from('candidate_interests')
        .update({
          right_to_represent_signed: true,
          right_to_represent_signed_at: timestamp
        })
        .eq('id', params.id)

      if (updateError) throw updateError

      await supabase.from('interest_documents').insert({
        interest_id: params.id,
        document_type: 'rtr_signature',
        file_url: interest.right_to_represent_url,
        filename: `signature_${params.id}.json`,
        metadata: signatureData
      })

      await supabase.from('notifications').insert({
        user_id: interest.agency_id,
        type: 'rtr_signed',
        title: '✅ RTR Signed!',
        message: `${signature} has signed the Right-to-Represent agreement`,
        link: `/dashboard/agency/interests/${params.id}`,
        action_type: 'proceed_with_application',
        ai_priority: 'high',
        metadata: {
          interest_id: params.id,
          signed_at: timestamp
        }
      })

      setShowSuccess(true)
      toast.success('Document signed successfully!')

      setTimeout(() => {
        router.push(`/dashboard/candidate/interests/${params.id}`)
      }, 3000)
    } catch (error: any) {
      console.error('Signing error:', error)
      toast.error('Failed to sign document')
    } finally {
      setSigning(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-16 h-16 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!interest?.right_to_represent_url && !showSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Document Not Found</h2>
          <p className="text-gray-600 mb-6">
            The RTR document is not available yet. Please check again later.
          </p>
          <Link href={`/dashboard/candidate/interests/${params.id}`}>
            <button className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold">
              Back to Opportunity
            </button>
          </Link>
        </div>
      </div>
    )
  }

  const job = interest.jobs
  const agency = interest.profiles

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 flex items-center justify-center p-8">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-2xl w-full bg-white rounded-3xl p-12 shadow-2xl text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="w-32 h-32 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-8"
          >
            <CheckCircle className="w-20 h-20 text-white" />
          </motion.div>

          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Document Signed Successfully!
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Your Right-to-Represent agreement has been electronically signed and verified.
          </p>

          <div className="bg-green-50 rounded-2xl p-6 mb-8 border-2 border-green-200">
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div className="text-left">
                <p className="text-gray-600 font-bold mb-1">Position</p>
                <p className="text-gray-900">{job.title}</p>
              </div>
              <div className="text-left">
                <p className="text-gray-600 font-bold mb-1">Agency</p>
                <p className="text-gray-900">{agency.full_name}</p>
              </div>
              <div className="text-left">
                <p className="text-gray-600 font-bold mb-1">Signed At</p>
                <p className="text-gray-900">
                  {new Date().toLocaleString()}
                </p>
              </div>
              <div className="text-left">
                <p className="text-gray-600 font-bold mb-1">IP Address</p>
                <p className="text-gray-900">{ipAddress}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <Link href={`/dashboard/candidate/interests/${params.id}`}>
              <button className="w-full px-8 py-4 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-bold text-lg hover:shadow-xl transition">
                View Application Status
              </button>
            </Link>
            <Link href="/dashboard/candidate/interests">
              <button className="w-full px-8 py-4 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl font-bold transition">
                Back to Opportunities
              </button>
            </Link>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-8">
      <div className="max-w-6xl mx-auto">
        <Link href={`/dashboard/candidate/interests/${params.id}`}>
          <button className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-8 transition">
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
        </Link>

        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-2xl p-6 shadow-2xl"
        >
          <div className="flex items-center gap-4">
            <Shield className="w-12 h-12 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-2xl font-bold mb-2">
                Legal Document - Read Carefully
              </h3>
              <p className="text-amber-100">
                This is a legally binding agreement. Please read all terms before signing.
                Your electronic signature will have the same legal effect as a handwritten signature.
              </p>
            </div>
          </div>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2">
            <div className="bg-white rounded-2xl shadow-2xl border-2 border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="w-8 h-8" />
                    <div>
                      <h2 className="text-2xl font-bold">
                        Right-to-Represent Agreement
                      </h2>
                      <p className="text-blue-100">Position: {job.title}</p>
                    </div>
                  </div>
                  <a
                    href={interest.right_to_represent_url}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition flex items-center gap-2"
                  >
                    <Download className="w-5 h-5" />
                    Download
                  </a>
                </div>
              </div>

              <div className="p-6 max-h-96 overflow-y-auto bg-gray-50">
                <iframe
                  ref={documentRef}
                  src={interest.right_to_represent_url}
                  className="w-full h-96 border-2 border-gray-300 rounded-xl bg-white"
                  title="RTR Document"
                />
              </div>

              <div className="p-6 border-t-2 border-gray-200 bg-white">
                <h3 className="text-xl font-bold text-gray-900 mb-6">
                  Electronic Signature
                </h3>

                <div className="space-y-6">
                  <label className="flex items-start gap-4 cursor-pointer p-5 bg-blue-50 rounded-xl border-2 border-blue-200 hover:border-blue-400 transition">
                    <input
                      type="checkbox"
                      checked={agreed}
                      onChange={(e) => setAgreed(e.target.checked)}
                      className="w-6 h-6 mt-1 cursor-pointer"
                    />
                    <div className="flex-1">
                      <p className="font-bold text-gray-900 mb-2 text-lg">
                        ✓ I have read and agree to all terms
                      </p>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        By checking this box, you confirm you have carefully read,
                        understood, and agree to be legally bound by all terms and
                        conditions outlined in this Right-to-Represent Agreement.
                        Your electronic signature has the same legal effect as a
                        handwritten signature.
                      </p>
                    </div>
                  </label>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-3">
                      Your Full Legal Name (Electronic Signature) *
                    </label>
                    <input
                      type="text"
                      value={signature}
                      onChange={(e) => setSignature(e.target.value)}
                      placeholder="Type your full name exactly as it appears on official documents"
                      className="w-full px-6 py-4 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:outline-none font-serif text-xl"
                      disabled={!agreed}
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      This will serve as your legally binding electronic signature
                    </p>
                  </div>

                  {signature && (
                    <div className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border-2 border-purple-200">
                      <p className="text-xs font-bold text-purple-700 mb-3">
                        SIGNATURE PREVIEW
                      </p>
                      <p className="text-4xl font-serif text-gray-900 mb-4">
                        {signature}
                      </p>
                      <div className="grid grid-cols-2 gap-4 text-xs text-gray-600">
                        <div>
                          <span className="font-bold">Date:</span>{' '}
                          {new Date().toLocaleString()}
                        </div>
                        <div>
                          <span className="font-bold">IP:</span> {ipAddress}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-xl border border-amber-300">
                    <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-1" />
                    <div className="text-sm text-amber-900">
                      <p className="font-bold mb-1">Legal Notice</p>
                      <p>
                        Your electronic signature is legally binding. By signing, you
                        agree that this typed name constitutes a legal signature with
                        the same force and effect as a handwritten signature under
                        applicable electronic signature laws.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleSign}
                    disabled={!agreed || !signature || signing}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-5 rounded-xl font-bold text-xl hover:shadow-2xl transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                  >
                    {signing ? (
                      <>
                        <Loader2 className="w-7 h-7 animate-spin" />
                        Processing Signature...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-7 h-7" />
                        Sign Document
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-gray-200 sticky top-4">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-purple-600" />
                Document Information
              </h3>

              <div className="space-y-4 text-sm">
                <div>
                  <p className="text-gray-600 font-bold mb-1">Position</p>
                  <p className="text-gray-900">{job.title}</p>
                </div>

                <div>
                  <p className="text-gray-600 font-bold mb-1">Agency</p>
                  <p className="text-gray-900">{agency.full_name}</p>
                  {agency.company && (
                    <p className="text-gray-600 text-xs">{agency.company}</p>
                  )}
                </div>

                <div>
                  <p className="text-gray-600 font-bold mb-1">Location</p>
                  <p className="text-gray-900">{job.location}</p>
                </div>

                {interest.ai_match_score && (
                  <div className="pt-4 border-top border-gray-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Award className="w-5 h-5 text-emerald-600" />
                      <p className="text-gray-600 font-bold">AI Match Score</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-green-600 rounded-full"
                          style={{ width: `${interest.ai_match_score}%` }}
                        />
                      </div>
                      <span className="text-2xl font-bold text-emerald-600">
                        {interest.ai_match_score}%
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 shadow-lg border-2 border-green-200">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Shield className="w-6 h-6 text-green-600" />
                Security & Verification
              </h3>

              <div className="space-y-3 text-sm text-gray-700">
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <p>Secure transport and storage</p>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <p>Signature hash for tamper detection</p>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <p>Timestamp and IP address recorded</p>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <p>Legally compliant electronic signature</p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 rounded-2xl p-6 border-2 border-blue-200">
              <h3 className="text-lg font-bold text-gray-900 mb-3">
                Need Help?
              </h3>
              <p className="text-sm text-gray-700 mb-4">
                If you have questions about this agreement, contact the agency or
                our support team.
              </p>
              <div className="space-y-2 text-sm">
                <p className="text-gray-600">
                  <span className="font-bold">Agency:</span> {agency.email}
                </p>
                <p className="text-gray-600">
                  <span className="font-bold">Support:</span> support@talentdetector.ai
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
EOF

echo "✅ app/dashboard/candidate/interests/[id]/sign-rtr/page.tsx"

echo "=== Done. Next steps ==="
echo "1) Review git diff to ensure only expected files changed."
echo "2) Restart dev server:  npm run dev"
echo "3) Test flows:"
echo "   - Candidate accepts multiple jobs and sees each interest."
echo "   - Agency sees per-candidate multi-job view and detail pages."
echo "   - For each accepted+CV job, click Generate/Regenerate RTR."
echo "   - Candidate receives notification and can sign per-interest RTR."
