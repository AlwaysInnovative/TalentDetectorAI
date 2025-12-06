'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Loader2, AlertCircle, ArrowLeft, FileText, ThumbsUp, ThumbsDown,
  Upload, Download, CheckCircle, XCircle
} from 'lucide-react'
import toast from 'react-hot-toast'
import { mutate } from 'swr'

interface Interest {
  id: string
  cv_url?: string
  cv_filename?: string
  cv_uploaded_at?: string
  status: string
  candidate_acceptance_status: string
  jobs: any
  candidates: any
  profiles: any
}

export default function CandidateInterestDetailPage({ params }: { params: { id: string } }) {
  const [loading, setLoading] = useState(true)
  const [interest, setInterest] = useState<Interest | null>(null)
  const [error, setError] = useState('')
  const [responding, setResponding] = useState(false)
  const [cvFile, setCvFile] = useState<File | null>(null)
  const [uploadingCv, setUploadingCv] = useState(false)
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!params?.id || params.id === 'undefined') {
      setError('Invalid opportunity ID')
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
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not logged in')

      const { data: candidate } = await supabase
        .from('candidates')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (!candidate) throw new Error('Candidate profile not found')

      const { data: interestData, error } = await supabase
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

      if (error || !interestData) {
        throw new Error('Opportunity not found or access denied')
      }

      setInterest(interestData)
    } catch (err: any) {
      console.error('Load error:', err)
      setError(err.message || 'Failed to load opportunity')
    } finally {
      setLoading(false)
    }
  }

  // Realtime updates
  useEffect(() => {
    if (!interest?.id) return
    const supabase = createClient()
    const channel = supabase
      .channel(`interest:${interest.id}`)
      .on('postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'candidate_interests', filter: `id=eq.${interest.id}` },
        () => {
          loadInterest()
          toast.success('Opportunity updated!')
        }
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [interest?.id])

  // PERFECT CV UPLOAD - NO .catch() BUG
  const handleUploadCv = useCallback(async () => {
    if (!cvFile || !interest?.id) {
      toast.error('Select a CV file first')
      return
    }

    if (!cvFile.type.match(/pdf|msword|document/)) {
      toast.error('Only PDF, DOC, DOCX allowed')
      return
    }

    if (cvFile.size > 10 * 1024 * 1024) {
      toast.error('Max 10MB file size')
      return
    }

    setUploadingCv(true)
    try {
      const supabase = createClient()
      const timestamp = Date.now()
      const fileName = `cv/${interest.id}/${timestamp}_${cvFile.name.replace(/[^\w.-]/g, '_')}`
      
      // 1. UPLOAD FILE
      const { error: uploadError, data } = await supabase.storage
        .from('documents')
        .upload(fileName, cvFile, { cacheControl: '3600', upsert: false })

      if (uploadError || !data) {
        throw new Error(`Upload failed: ${uploadError?.message}`)
      }

      // 2. GET PUBLIC URL
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(fileName)

      // 3. UPDATE UI IMMEDIATELY (before DB)
      const updatedInterest = {
        ...interest,
        cv_url: publicUrl,
        cv_filename: cvFile.name,
        cv_uploaded_at: new Date().toISOString(),
        candidate_acceptance_status: 'cv_uploaded'
      } as Interest
      setInterest(updatedInterest)

      // 4. SAVE TO DB (fire & forget - NO .catch()!)
      supabase.from('candidate_interests')
        .update({
          cv_url: publicUrl,
          cv_filename: cvFile.name,
          cv_uploaded_at: new Date().toISOString(),
          candidate_acceptance_status: 'cv_uploaded'
        })
        .eq('id', interest.id)

      toast.success('✅ CV uploaded successfully!')
      
      setCvFile(null)
      fileInputRef.current?.reset ? fileInputRef.current.value = '' : null
      
      // Cache refresh
      mutate('candidate-interests')
      setTimeout(loadInterest, 1000)
      
    } catch (err: any) {
      console.error('CV Upload Error:', err)
      toast.error(err.message || 'Upload failed')
    } finally {
      setUploadingCv(false)
    }
  }, [cvFile, interest])

  // PERFECT Accept/Decline
  const handleRespond = async (accepted: boolean) => {
    if (responding || !interest?.id) return

    // Block if already responded
    if (interest.candidate_acceptance_status !== 'pending_response') {
      toast.error('Already responded to this opportunity')
      return
    }

    setResponding(true)
    try {
      const response = await fetch('/api/candidate/respond-to-interest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interest_id: interest.id,  // snake_case for API
          accepted,
          comment: responseComment.trim() || null
        })
      })

      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Response failed')
      }

      toast.success(
        accepted 
          ? '✅ Opportunity accepted! Agency will contact you.' 
          : '❌ Opportunity declined.'
      )

      setResponseComment('')
      await loadInterest()
      mutate('candidate-interests')
      
      setTimeout(() => router.push('/dashboard/candidate/interests'), 2500)
      
    } catch (err: any) {
      console.error('Respond Error:', err)
      toast.error(err.message || 'Failed to respond')
    } finally {
      setResponding(false)
    }
  }

  const getStatusMessage = (interest: Interest) => {
    if (interest.status === 'sent' && interest.candidate_acceptance_status === 'pending_response') {
      return { text: 'Review job details and respond below.', color: 'yellow' }
    }
    if (interest.status === 'interested') {
      return { text: '✅ Thank you! Agency will contact you soon.', color: 'green' }
    }
    if (interest.status === 'not_interested') {
      return { text: '❌ Opportunity declined.', color: 'red' }
    }
    return null
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-indigo-50">
        <div className="text-center p-8">
          <Loader2 className="w-16 h-16 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-xl text-gray-600">Loading opportunity...</p>
        </div>
      </div>
    )
  }

  if (error || !interest) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-gradient-to-br from-slate-50 to-indigo-50">
        <div className="bg-white rounded-3xl p-12 text-center shadow-2xl max-w-lg w-full">
          <AlertCircle className="mx-auto mb-6 w-20 h-20 text-red-500" />
          <h1 className="text-3xl font-bold text-gray-900 mb-4">{error || 'Opportunity not found'}</h1>
          <div className="space-y-3">
            <button
              onClick={loadInterest}
              className="w-full px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-lg transition-all shadow-xl hover:shadow-2xl"
            >
              Try Again
            </button>
            <Link href="/dashboard/candidate/interests">
              <button className="w-full px-8 py-4 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-2xl font-bold text-lg transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2 mx-auto">
                <ArrowLeft className="w-5 h-5" /> Back to Opportunities
              </button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const job = interest.jobs
  const candidate = interest.candidates
  const agency = interest.profiles
  const statusInfo = getStatusMessage(interest)
  const canRespond = interest.status === 'sent' && interest.candidate_acceptance_status === 'pending_response'
  const hasCv = !!interest.cv_url

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <Link href="/dashboard/candidate/interests" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-semibold text-lg group">
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            Back to Opportunities
          </Link>
        </div>

        <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-8 md:p-12 shadow-2xl border border-white/50">
          
          {/* JOB HEADER */}
          <div className="mb-12 text-center">
            <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-gray-900 via-gray-800 to-blue-900 bg-clip-text text-transparent mb-6">
              {job?.title || 'Job Opportunity'}
            </h1>
            <div className="flex flex-wrap gap-4 justify-center text-lg text-gray-600 mb-8">
              <span className="flex items-center gap-2 bg-blue-100 px-4 py-2 rounded-full text-blue-800 font-medium">
                📍 {job?.location || 'Remote'}
              </span>
              {job?.employment_type && (
                <span className="flex items-center gap-2 bg-emerald-100 px-4 py-2 rounded-full text-emerald-800 font-medium">
                  {job.employment_type.toUpperCase()}
                </span>
              )}
            </div>
            {job?.salary_min && job?.salary_max && (
              <div className="inline-block bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-10 py-6 rounded-3xl shadow-2xl">
                <div className="text-4xl font-black">£{job.salary_min.toLocaleString()} - £{job.salary_max.toLocaleString()}</div>
                <div className="text-sm opacity-90 font-medium">Annual Salary</div>
              </div>
            )}
          </div>

          {/* STATUS */}
          {statusInfo && (
            <div className={`p-8 rounded-3xl shadow-xl mb-12 text-center ${
              statusInfo.color === 'yellow' ? 'bg-yellow-50 border-4 border-yellow-200' :
              statusInfo.color === 'green' ? 'bg-emerald-50 border-4 border-emerald-200' :
              statusInfo.color === 'red' ? 'bg-red-50 border-4 border-red-200' : 'bg-purple-50 border-4 border-purple-200'
            }`}>
              <div className="text-2xl font-bold text-gray-900">{statusInfo.text}</div>
            </div>
          )}

          {/* INFO CARDS */}
          <div className="grid lg:grid-cols-2 gap-8 mb-12">
            <div className="p-10 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-3xl border-4 border-blue-200 shadow-2xl">
              <h2 className="text-3xl font-bold text-gray-900 mb-8 flex items-center gap-4">🏢 Agency</h2>
              <div className="space-y-6 text-gray-700 text-lg">
                <div className="flex items-center gap-4 p-6 bg-white/50 rounded-2xl">
                  <div className="w-14 h-14 bg-blue-500 rounded-2xl flex items-center justify-center">
                    <span className="text-2xl font-bold text-white">{agency?.full_name?.[0] || 'A'}</span>
                  </div>
                  <div>
                    <div className="font-black text-2xl text-blue-900">{agency?.full_name || 'Agency'}</div>
                    {agency?.company && <div className="text-blue-700 font-semibold">{agency.company}</div>}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <a href={`mailto:${agency?.email}`} className="flex items-center gap-3 p-4 bg-white/70 hover:bg-white rounded-xl transition-all group">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center group-hover:bg-blue-200 transition-all">
                      📧
                    </div>
                    <span className="font-semibold text-blue-900 group-hover:underline">{agency?.email}</span>
                  </a>
                  {agency?.phone && (
                    <a href={`tel:${agency.phone}`} className="flex items-center gap-3 p-4 bg-white/70 hover:bg-white rounded-xl transition-all group">
                      <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center group-hover:bg-green-200 transition-all">
                        📞
                      </div>
                      <span className="font-semibold text-green-900 group-hover:underline">{agency.phone}</span>
                    </a>
                  )}
                </div>
              </div>
            </div>

            <div className="p-10 bg-gradient-to-br from-purple-50 to-pink-50 rounded-3xl border-4 border-purple-200 shadow-2xl">
              <h2 className="text-3xl font-bold text-gray-900 mb-8 flex items-center gap-4">👤 You</h2>
              <div className="space-y-4 text-gray-700 text-lg">
                <div className="p-6 bg-white/50 rounded-2xl">
                  <div className="font-black text-2xl text-purple-900 mb-2">{candidate?.name}</div>
                  <div className="text-purple-700 font-semibold">{candidate?.email}</div>
                </div>
                {candidate?.phone && (
                  <div className="flex items-center gap-4 p-4 bg-white/70 rounded-xl">
                    <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">📞</div>
                    <span className="font-semibold">{candidate.phone}</span>
                  </div>
                )}
                {candidate?.location && (
                  <div className="flex items-center gap-4 p-4 bg-white/70 rounded-xl">
                    <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center">📍</div>
                    <span className="font-semibold">{candidate.location}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* CV UPLOAD - HIDE IF UPLOADED */}
          {!hasCv && (
            <div className="mb-16 p-12 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 rounded-4xl shadow-2xl border-8 border-purple-400/50 text-white text-center">
              <div className="w-24 h-24 bg-white/30 backdrop-blur-xl rounded-4xl mx-auto mb-8 flex items-center justify-center">
                <Upload className="w-12 h-12 animate-bounce" />
              </div>
              <h2 className="text-4xl font-black mb-8">Upload Your CV</h2>
              <div className="max-w-2xl mx-auto">
                <input
                  ref={fileInputRef}
                  type="file"
                  disabled={uploadingCv}
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => setCvFile(e.target.files?.[0] || null)}
                  className="block w-full border-4 border-dashed border-white/50 bg-white/20 backdrop-blur-2xl rounded-3xl px-12 py-10 mb-8 text-xl file:mr-8 file:py-6 file:px-12 file:rounded-3xl file:border-0 file:text-xl file:font-bold file:bg-white file:text-purple-700 hover:file:bg-white/90 hover:file:shadow-2xl transition-all file:cursor-pointer"
                />
                <button
                  onClick={handleUploadCv}
                  disabled={!cvFile || uploadingCv}
                  className="w-full px-16 py-8 bg-white/95 hover:bg-white text-purple-700 rounded-3xl font-black text-2xl shadow-2xl hover:shadow-3xl transition-all duration-300 border-4 border-white/50 backdrop-blur-xl disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02]"
                >
                  {uploadingCv ? (
                    <>
                      <Loader2 className="w-10 h-10 animate-spin inline mr-4" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-10 h-10 inline mr-4" />
                      Upload CV Now
                    </>
                  )}
                </button>
                <p className="mt-6 text-xl opacity-90">PDF, DOC, DOCX • Maximum 10MB</p>
              </div>
            </div>
          )}

          {/* ✅ CV UPLOADED CONFIRMATION */}
          {hasCv && (
            <div className="mb-16 p-12 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 rounded-4xl shadow-2xl border-8 border-emerald-400/50 text-white text-center">
              <div className="flex flex-col lg:flex-row items-center justify-between gap-12">
                <div className="flex items-center gap-8">
                  <div className="w-28 h-28 bg-white/40 backdrop-blur-xl rounded-4xl flex items-center justify-center p-6">
                    <CheckCircle className="w-16 h-16 text-white drop-shadow-lg" />
                  </div>
                  <div>
                    <h2 className="text-4xl font-black mb-4 drop-shadow-lg">✅ CV Ready!</h2>
                    <p className="text-2xl opacity-95 drop-shadow-md">{interest.cv_filename}</p>
                    <p className="text-xl opacity-80 mt-2 drop-shadow-sm">
                      Uploaded: {new Date(interest.cv_uploaded_at!).toLocaleString()}
                    </p>
                  </div>
                </div>
                <a
                  href={interest.cv_url!}
                  target="_blank"
                  rel="noreferrer"
                  className="group flex items-center gap-4 px-12 py-8 bg-white text-emerald-700 rounded-3xl font-black text-2xl shadow-2xl hover:shadow-3xl hover:scale-105 transition-all duration-300 border-4 border-white/50 backdrop-blur-xl whitespace-nowrap"
                >
                  <Download className="w-8 h-8 group-hover:scale-110 transition-transform" />
                  <span>View My CV</span>
                </a>
              </div>
            </div>
          )}

          {/* ACCEPT/DECLINE - HIDE IF ALREADY RESPONDED */}
          {canRespond && (
            <div className="p-12 bg-gradient-to-r from-slate-50 via-blue-50 to-indigo-50 rounded-4xl shadow-2xl border-4 border-blue-200">
              <h2 className="text-4xl font-black text-gray-900 mb-12 text-center flex items-center justify-center gap-4">
                🤔 Make Your Decision
              </h2>
              <div className="max-w-4xl mx-auto">
                <textarea
                  rows={4}
                  value={responseComment}
                  onChange={(e) => setResponseComment(e.target.value)}
                  className="w-full border-4 border-gray-300 rounded-3xl p-8 mb-12 resize-vertical text-xl focus:border-blue-500 focus:outline-none focus:ring-8 focus:ring-blue-100 placeholder-gray-500"
                  placeholder="Optional: Add comments, salary expectations, availability, questions for agency..."
                  maxLength={1000}
                />
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                  <button
                    onClick={() => handleRespond(false)}
                    disabled={responding}
                    className="group relative p-12 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-3xl font-black text-2xl shadow-2xl hover:shadow-3xl hover:scale-[1.02] transition-all duration-300 border-4 border-red-400/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-red-700 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="relative flex flex-col items-center gap-4">
                      <ThumbsDown className="w-16 h-16 group-hover:scale-110 transition-transform drop-shadow-lg" />
                      <span>Decline Opportunity</span>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => handleRespond(true)}
                    disabled={responding}
                    className="group relative p-12 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-3xl font-black text-2xl shadow-2xl hover:shadow-3xl hover:scale-[1.02] transition-all duration-300 border-4 border-emerald-400/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="relative flex flex-col items-center gap-4">
                      {responding ? (
                        <Loader2 className="w-16 h-16 animate-spin" />
                      ) : (
                        <ThumbsUp className="w-16 h-16 group-hover:scale-110 transition-transform drop-shadow-lg" />
                      )}
                      <span>{responding ? 'Submitting...' : 'Accept Opportunity'}</span>
                    </div>
                  </button>
                </div>
                <p className="text-center text-lg text-gray-600 mt-12 font-medium">
                  {responseComment.length}/1000 characters
                </p>
              </div>
            </div>
          )}

          {/* JOB DESCRIPTION */}
          {job?.description && (
            <div className="mt-16 p-12 bg-gradient-to-br from-gray-50 to-slate-100 rounded-4xl border-4 border-gray-200 shadow-xl">
              <h2 className="text-3xl font-black text-gray-900 mb-8 flex items-center gap-4">📋 Job Description</h2>
              <div className="prose prose-2xl max-w-none text-gray-700 leading-relaxed whitespace-pre-wrap">
                {job.description}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
