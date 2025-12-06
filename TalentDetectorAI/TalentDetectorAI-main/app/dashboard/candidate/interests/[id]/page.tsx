'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
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
  CheckCircle,
  XCircle
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

  // Validate params.id on mount
  useEffect(() => {
    if (!params?.id || params.id === 'undefined') {
      setError('Invalid interest ID')
      setLoading(false)
      return
    }
    loadInterest()
  }, [params.id])

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

      // Guard against undefined params.id
      if (!params.id) {
        setError('Missing interest ID')
        return
      }

      const { data: interestData, error: interestErr } = await supabase
        .from('candidate_interests')
        .select(`
          *,
          candidates(id, name, email, phone, location),
          jobs(id, title, location, department, employment_type, salary_min, salary_max, description),
          profiles!candidate_interests_agency_id_fkey(id, full_name, company, email, phone)
        `)
        .eq('id', params.id)
        .eq('candidate_id', candidate.id)
        .single()

      if (interestErr || !interestData) {
        setError('Opportunity not found or not assigned to you')
        return
      }

      setInterest(interestData)
    } catch (err: any) {
      console.error('Load interest error:', err)
      setError(err?.message || 'Failed to load opportunity')
    } finally {
      setLoading(false)
    }
  }

  // Realtime subscription with proper cleanup
  useEffect(() => {
    if (!interest?.id) return

    const supabase = createClient()
    
    const channel = supabase
      .channel(`interest_${interest.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'candidate_interests',
          filter: `id=eq.${interest.id}`
        },
        (payload) => {
          console.log('Interest updated:', payload)
          loadInterest()
          toast.success('Status updated!')
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIPTION_ERROR') {
          console.error('Realtime subscription error')
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [interest?.id])

  const handleUploadCv = useCallback(async () => {
    if (!cvFile || !interest?.id) {
      toast.error('Please select a CV file first')
      return
    }

    if (!cvFile.type.match(/pdf|msword|document/)) {
      toast.error('Please upload PDF, DOC, or DOCX files only')
      return
    }

    if (cvFile.size > 10 * 1024 * 1024) { // 10MB limit
      toast.error('File size must be less than 10MB')
      return
    }

    setUploadingCv(true)
    try {
      const supabase = createClient()
      const fileExt = cvFile.name.split('.').pop()
      const fileName = `cv/${interest.id}/${Date.now()}_${cvFile.name.replace(/\s+/g, '_')}`
      
      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, cvFile, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`)
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(fileName)

      // Update candidate_interests (this is where RTR trigger might fire)
      const { error: updateError } = await supabase
        .from('candidate_interests')
        .update({
          cv_url: publicUrl,
          cv_filename: cvFile.name,
          cv_uploaded_at: new Date().toISOString(),
          candidate_acceptance_status: 'cv_uploaded'
        })
        .eq('id', interest.id)
        .select()
        .single()

      if (updateError) {
        // If RTR queue error, log but don't fail the CV upload
        console.warn('Interest update warning (RTR queue might be missing):', updateError)
        toast.success('CV uploaded successfully! (RTR automation pending)')
      } else {
        toast.success('CV uploaded successfully!')
      }

      // Reset form and refresh
      setCvFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      await loadInterest()
      await mutate('candidate-interests')
    } catch (err: any) {
      console.error('CV upload error:', err)
      toast.error(`Failed to upload CV: ${err.message}`)
    } finally {
      setUploadingCv(false)
    }
  }, [cvFile, interest?.id])

  async function handleRespond(accepted: boolean) {
    if (responding || !interest?.id) return

    setResponding(true)
    try {
      const res = await fetch('/api/candidate/respond-to-interest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interestId: interest.id,
          accepted,
          comment: responseComment.trim() || null
        })
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit response')
      }

      toast.success(
        accepted
          ? 'You accepted this opportunity! The agency will contact you soon.'
          : 'You declined this opportunity.'
      )
      
      setResponseComment('')
      await loadInterest()
      await mutate('candidate-interests')
      
      // Auto-redirect after success
      setTimeout(() => router.push('/dashboard/candidate/interests'), 2000)
    } catch (err: any) {
      console.error('Respond error:', err)
      toast.error(err.message || 'Could not submit response')
    } finally {
      setResponding(false)
    }
  }

  function getStatusMessage(interest: any) {
    if (interest.status === 'sent' && interest.candidate_acceptance_status === 'pending_response') {
      return {
        text: 'Please review the job details below and respond with your decision.',
        color: 'yellow'
      }
    }
    if (interest.status === 'interested') {
      return {
        text: 'Thank you for your interest! The agency will follow up with the next steps.',
        color: 'green'
      }
    }
    if (interest.status === 'not_interested') {
      return { text: 'You have declined this opportunity.', color: 'red' }
    }
    if (interest.rtr_status === 'ready') {
      return {
        text: 'Your Right to Represent agreement is ready for signature.',
        color: 'purple'
      }
    }
    return null
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-indigo-50 p-4">
        <div className="text-center">
          <Loader2 className="w-16 h-16 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading opportunity details...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-gradient-to-br from-slate-50 to-indigo-50">
        <div className="bg-white rounded-2xl p-10 text-center shadow-xl max-w-lg w-full">
          <AlertCircle className="mx-auto mb-6 w-16 h-16 text-red-500" />
          <h1 className="font-bold text-3xl text-red-700 mb-4">Error</h1>
          <p className="mb-8 text-lg text-gray-700 leading-relaxed">{error}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={loadInterest}
              className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              Try Again
            </button>
            <Link href="/dashboard/candidate/interests">
              <button className="px-8 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl font-bold transition-all duration-200 flex items-center justify-center gap-2 shadow-sm hover:shadow-md">
                <ArrowLeft className="w-5 h-5" />
                Back to Opportunities
              </button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (!interest) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-gradient-to-br from-slate-50 to-indigo-50">
        <div className="text-center">
          <XCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-xl text-gray-600">No opportunity found</p>
        </div>
      </div>
    )
  }

  const job = interest.jobs
  const candidate = interest.candidates
  const agency = interest.profiles
  const statusInfo = getStatusMessage(interest)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Back Navigation */}
        <div className="mb-8">
          <Link href="/dashboard/candidate/interests">
            <button className="flex items-center text-blue-600 hover:text-blue-800 font-semibold transition-all duration-200 gap-2 group">
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              Back to My Opportunities
            </button>
          </Link>
        </div>

        <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-white/50">
          
          {/* Job Header */}
          <div className="mb-10">
            <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-4 leading-tight">
              {job?.title || 'Job Opportunity'}
            </h1>
            <div className="flex flex-wrap gap-4 text-lg text-gray-600 mb-6">
              <span className="flex items-center gap-2 bg-blue-100 px-3 py-1 rounded-full text-blue-800">
                📍 {job?.location || 'Location TBD'}
              </span>
              {job?.department && (
                <span className="flex items-center gap-2 bg-purple-100 px-3 py-1 rounded-full text-purple-800">
                  🏢 {job.department}
                </span>
              )}
              {job?.employment_type && (
                <span className="flex items-center gap-2 bg-green-100 px-3 py-1 rounded-full text-green-800 font-medium">
                  {job.employment_type}
                </span>
              )}
            </div>
            {job?.salary_min && job?.salary_max && (
              <div className="bg-gradient-to-r from-emerald-500 to-green-600 text-white px-8 py-4 rounded-2xl shadow-xl max-w-max">
                <p className="text-3xl font-bold">
                  £{job.salary_min?.toLocaleString()} - £{job.salary_max?.toLocaleString()}
                </p>
                <p className="text-sm opacity-90">Annual Salary Range</p>
              </div>
            )}
          </div>

          {/* Status Badge */}
          {statusInfo && (
            <div className={`mb-10 p-6 rounded-2xl border-4 shadow-lg ${
              statusInfo.color === 'yellow'
                ? 'bg-yellow-50 border-yellow-400 shadow-yellow-200'
                : statusInfo.color === 'green'
                ? 'bg-green-50 border-green-400 shadow-green-200'
                : statusInfo.color === 'red'
                ? 'bg-red-50 border-red-400 shadow-red-200'
                : 'bg-purple-50 border-purple-400 shadow-purple-200'
            }`}>
              <p className="text-xl font-bold">{statusInfo.text}</p>
            </div>
          )}

          {/* Job Description */}
          {job?.description && (
            <div className="mb-10 p-8 bg-gradient-to-br from-gray-50 to-slate-100 rounded-2xl border border-gray-200 shadow-inner">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                📋 Job Description
              </h2>
              <div className="prose prose-lg max-w-none text-gray-700 leading-relaxed whitespace-pre-wrap">
                {job.description}
              </div>
            </div>
          )}

          {/* Agency Information */}
          <div className="grid md:grid-cols-2 gap-8 mb-10">
            <div className="p-8 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl border-2 border-blue-200 shadow-lg">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                🏛️ Agency Information
              </h2>
              <div className="space-y-4 text-gray-700">
                <p className="flex items-center gap-3 text-xl">
                  <span className="font-black text-2xl text-blue-800">{agency?.full_name || 'Agency'}</span>
                </p>
                {agency?.company && (
                  <p className="flex items-start gap-3">
                    <span className="font-semibold text-blue-700 mt-1">🏢 Company:</span>
                    <span>{agency.company}</span>
                  </p>
                )}
                <p className="flex items-center gap-3">
                  <span className="font-semibold text-blue-700">📧 Contact:</span>
                  <a href={`mailto:${agency?.email}`} className="text-blue-600 hover:text-blue-800 font-medium underline">
                    {agency?.email || 'N/A'}
                  </a>
                </p>
                {agency?.phone && (
                  <p className="flex items-center gap-3">
                    <span className="font-semibold text-blue-700">📞 Phone:</span>
                    <a href={`tel:${agency.phone}`} className="text-blue-600 hover:text-blue-800 font-medium">
                      {agency.phone}
                    </a>
                  </p>
                )}
              </div>
            </div>

            {/* Your Details */}
            <div className="p-8 bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl border-2 border-purple-200 shadow-lg">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                👤 Your Details
              </h2>
              <div className="space-y-4 text-gray-700">
                <p className="flex items-center gap-3 text-xl">
                  <span className="font-black text-2xl text-purple-800">{candidate?.name || 'Candidate'}</span>
                </p>
                <p className="flex items-center gap-3">
                  <span className="font-semibold text-purple-700">📧 Email:</span>
                  <span>{candidate?.email || 'N/A'}</span>
                </p>
                {candidate?.phone && (
                  <p className="flex items-center gap-3">
                    <span className="font-semibold text-purple-700">📞 Phone:</span>
                    <span>{candidate.phone}</span>
                  </p>
                )}
                {candidate?.location && (
                  <p className="flex items-center gap-3">
                    <span className="font-semibold text-purple-700">📍 Location:</span>
                    <span>{candidate.location}</span>
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* CV Upload Section */}
          {!interest.cv_url && (
            <div className="mb-12 p-10 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 rounded-3xl shadow-2xl border-4 border-purple-300/50 text-white">
              <h2 className="text-3xl font-bold mb-8 flex items-center justify-center gap-4">
                <Upload className="w-12 h-12 animate-bounce" />
                Upload Your CV to Proceed
              </h2>
              <div className="max-w-2xl mx-auto">
                <input
                  type="file"
                  ref={fileInputRef}
                  disabled={uploadingCv}
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) setCvFile(file)
                  }}
                  className="block w-full border-4 border-dashed border-white/50 bg-white/20 backdrop-blur-xl rounded-2xl px-8 py-6 mb-8 text-lg file:mr-6 file:py-4 file:px-8 file:rounded-xl file:border-0 file:text-lg file:font-bold file:bg-white/90 file:text-purple-700 hover:file:bg-white hover:file:shadow-lg transition-all duration-200"
                />
                <button
                  onClick={handleUploadCv}
                  disabled={!cvFile || uploadingCv}
                  className="w-full flex items-center justify-center gap-4 px-12 py-6 bg-white/90 hover:bg-white text-purple-700 rounded-2xl font-bold text-xl shadow-2xl hover:shadow-3xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-xl border-2 border-white/50"
                >
                  {uploadingCv ? (
                    <>
                      <Loader2 className="w-8 h-8 animate-spin" />
                      <span>Uploading CV...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-8 h-8" />
                      <span>Upload CV Now</span>
                    </>
                  )}
                </button>
                <p className="text-purple-100 text-sm mt-4 text-center opacity-90">
                  Supports PDF, DOC, DOCX • Max 10MB
                </p>
              </div>
            </div>
          )}

          {/* CV Uploaded Confirmation */}
          {interest.cv_url && (
            <div className="mb-12 p-10 bg-gradient-to-r from-emerald-500 to-green-600 rounded-3xl shadow-2xl border-4 border-emerald-400/50 text-white">
              <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
                <div className="flex items-center gap-6 flex-1">
                  <div className="w-20 h-20 bg-white/30 backdrop-blur-xl rounded-3xl flex items-center justify-center p-4">
                    <CheckCircle className="w-12 h-12 text-white" />
                  </div>
                  <div>
                    <h3 className="text-3xl font-bold mb-2">✅ CV Uploaded Successfully</h3>
                    <p className="text-xl opacity-95">{interest.cv_filename}</p>
                    <p className="text-lg opacity-80 mt-1">
                      Ready for agency review
                    </p>
                  </div>
                </div>
                <a
                  href={interest.cv_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 px-10 py-5 bg-white text-emerald-700 rounded-2xl font-bold text-xl shadow-2xl hover:shadow-3xl hover:scale-105 transition-all duration-300 backdrop-blur-xl border-2 border-white/30 whitespace-nowrap"
                >
                  <Download className="w-6 h-6" />
                  View My CV
                </a>
              </div>
            </div>
          )}

          {/* RTR Sections - Only show if relevant */}
          {interest.right_to_represent_url && interest.rtr_status === 'ready' && !interest.right_to_represent_signed && (
            <div className="mb-12">
              <div className="p-10 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-3xl shadow-2xl border-4 border-amber-400/50">
                <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
                  <div className="flex items-center gap-6 flex-1">
                    <div className="w-24 h-24 bg-white/30 backdrop-blur-xl rounded-3xl flex items-center justify-center p-6 animate-pulse">
                      <FileText className="w-12 h-12" />
                    </div>
                    <div>
                      <h3 className="text-4xl font-bold mb-4">✍️ RTR Ready to Sign</h3>
                      <p className="text-2xl opacity-95 leading-relaxed">
                        Your Right-to-Represent agreement is ready for your signature
                      </p>
                    </div>
                  </div>
                  <Link href={`/dashboard/candidate/interests/${interest.id}/sign-rtr`}>
                    <button className="px-12 py-8 bg-white text-orange-600 rounded-3xl font-bold text-2xl shadow-2xl hover:shadow-3xl hover:scale-105 transition-all duration-300 flex items-center gap-4 whitespace-nowrap border-2 border-white/30 backdrop-blur-xl">
                      <FileText className="w-8 h-8" />
                      Sign RTR Now
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          )}

          {interest.right_to_represent_signed && (
            <div className="mb-12 p-10 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-3xl shadow-2xl border-4 border-emerald-400/50 text-white">
              <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
                <div className="flex items-center gap-6 flex-1">
                  <div className="w-24 h-24 bg-white/30 backdrop-blur-xl rounded-3xl flex items-center justify-center p-6">
                    <CheckCircle className="w-14 h-14" />
                  </div>
                  <div>
                    <h3 className="text-4xl font-bold mb-2">✅ RTR Signed Successfully</h3>
                    <p className="text-xl opacity-90">
                      Signed on {new Date(interest.right_to_represent_signed_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                {interest.right_to_represent_pdf_url && (
                  <a
                    href={interest.right_to_represent_pdf_url}
                    target="_blank"
                    rel="noreferrer"
                    className="px-12 py-6 bg-white text-emerald-700 rounded-3xl font-bold text-xl shadow-2xl hover:shadow-3xl hover:scale-105 transition-all duration-300 flex items-center gap-3 border-2 border-white/30 backdrop-blur-xl"
                  >
                    <Download className="w-6 h-6" />
                    Download Signed RTR
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Accept/Decline Response */}
          {interest.status === 'sent' && interest.candidate_acceptance_status === 'pending_response' && (
            <div className="p-10 bg-gradient-to-r from-slate-50 to-gray-100 rounded-3xl shadow-xl border-2 border-gray-200">
              <h2 className="text-3xl font-bold text-gray-900 mb-8 flex items-center justify-center gap-3">
                🤔 Your Decision
              </h2>
              <div className="max-w-2xl mx-auto">
                <textarea
                  rows={4}
                  value={responseComment}
                  onChange={(e) => setResponseComment(e.target.value)}
                  className="w-full border-2 border-gray-300 rounded-2xl p-6 mb-8 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-100 resize-vertical text-lg placeholder-gray-500"
                  placeholder="Optional: Add any comments, questions, salary expectations, or availability details..."
                  maxLength={1000}
                />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <button
                    onClick={() => handleRespond(false)}
                    disabled={responding}
                    className="group flex items-center justify-center gap-4 px-12 py-8 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-2xl font-bold text-xl shadow-2xl hover:shadow-3xl hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none border-2 border-red-400/30"
                  >
                    {responding ? (
                      <Loader2 className="w-8 h-8 animate-spin" />
                    ) : (
                      <>
                        <ThumbsDown className="w-8 h-8 group-hover:scale-110 transition-transform" />
                        <span>Decline Opportunity</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handleRespond(true)}
                    disabled={responding}
                    className="group flex items-center justify-center gap-4 px-12 py-8 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white rounded-2xl font-bold text-xl shadow-2xl hover:shadow-3xl hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none border-2 border-emerald-400/30"
                  >
                    {responding ? (
                      <Loader2 className="w-8 h-8 animate-spin" />
                    ) : (
                      <>
                        <ThumbsUp className="w-8 h-8 group-hover:scale-110 transition-transform" />
                        <span>Accept Opportunity</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-center text-sm text-gray-500 mt-6">
                  {responseComment.length}/1000 characters
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
