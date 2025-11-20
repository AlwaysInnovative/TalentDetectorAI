'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2, AlertCircle, ArrowLeft, FileText, ThumbsUp, ThumbsDown, Upload, Download, CheckCircle } from 'lucide-react'
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
    // eslint-disable-next-line
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
          candidates(id, name, email, phone),
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
      setError('')
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
          cv_uploaded_at: new Date().toISOString(),
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
    if (responding) return
    
    setResponding(true)
    try {
      const res = await fetch('/api/candidate/respond-to-interest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interest_id: interest.id,
          accepted,
          comment: responseComment,
        }),
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
      return { text: 'You accepted this opportunity! The agency will contact you with next steps.', color: 'green' }
    }
    if (interest.status === 'not_interested') {
      return { text: 'You declined this opportunity.', color: 'red' }
    }
    if (interest.status === 'rtr_ready') {
      return { text: 'Your Right to Represent agreement is ready for signature.', color: 'purple' }
    }
    return null
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-indigo-50">
        <Loader2 className="w-14 h-14 text-blue-600 animate-spin"/>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-gradient-to-br from-slate-50 to-indigo-50">
        <div className="bg-white rounded-2xl p-10 text-center shadow-lg max-w-lg">
          <AlertCircle className="mx-auto mb-4 w-14 h-14 text-red-500"/>
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
            <div className={`mb-6 p-4 rounded-lg border-2 ${
              statusInfo.color === 'yellow' ? 'bg-yellow-50 border-yellow-300 text-yellow-800' :
              statusInfo.color === 'green' ? 'bg-green-50 border-green-300 text-green-800' :
              statusInfo.color === 'red' ? 'bg-red-50 border-red-300 text-red-800' :
              'bg-purple-50 border-purple-300 text-purple-800'
            }`}>
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
              <p><strong>Agency:</strong> {agency.full_name}</p>
              {agency.company && <p><strong>Company:</strong> {agency.company}</p>}
              <p><strong>Contact:</strong> {agency.email}</p>
            </div>
          </div>

          <div className="mb-6 p-6 bg-purple-50 rounded-xl border border-purple-200">
            <h2 className="text-xl font-bold text-gray-900 mb-3">Your Details</h2>
            <div className="space-y-2 text-gray-700">
              <p><strong>Name:</strong> {candidate.name}</p>
              <p><strong>Email:</strong> {candidate.email}</p>
              {candidate.phone && <p><strong>Phone:</strong> {candidate.phone}</p>}
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
                onChange={e => setCvFile(e.target.files?.[0] || null)}
                className="block w-full border-2 border-gray-300 rounded-lg px-4 py-2 mb-4"
              />
              <button
