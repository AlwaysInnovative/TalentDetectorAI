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

      const { data: interestData, error: interestErr } = await supabase
        .from('candidate_interests')
        .select('*')
        .eq('id', params.id)
        .eq('candidate_id', candidate.id)
        .single()

      if (interestErr || !interestData) {
        setError('Opportunity not found or not assigned to you')
        return
      }

      const [jobRes, agencyRes, candidateRes] = await Promise.all([
        supabase.from('jobs').select('*').eq('id', interestData.job_id).single(),
        supabase.from('profiles').select('*').eq('id', interestData.agency_id).single(),
        supabase.from('candidates').select('*').eq('id', interestData.candidate_id).single()
      ])

      const completeInterest = {
        ...interestData,
        jobs: jobRes.data,
        profiles: agencyRes.data,
        candidates: candidateRes.data
      }

      setInterest(completeInterest)
    } catch (err: any) {
      setError(err?.message || 'Failed to load opportunity')
    } finally {
      setLoading(false)
    }
  }

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
        () => {
          loadInterest()
          toast.success('Status updated!')
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [interest?.id])

  async function handleUploadCv() {
    if (!cvFile) {
      toast.error('Please select a CV file first')
      return
    }

    setUploadingCv(true)
    try {
      const supabase = createClient()
      const filePath = `cv/${Date.now()}_${cvFile.name}`
      
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
      toast.error(`Failed to upload CV: ${err?.message || 'Unknown error'}`)
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
          interestId: interest.id,
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
      setTimeout(() => router.push('/dashboard/candidate/interests'), 1500)
    } catch (err: any) {
      toast.error('Could not submit response')
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
                <ArrowLeft className="w-5 h-5" />
                Back
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

          {/* Details omitted for brevity but same as previously provided */}

          {/* RTR Status Section */}
          {interest.right_to_represent_url && interest.rtr_status === 'ready' && (
            <div className="mb-8">
              <div className="p-6 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-2xl shadow-2xl">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center flex-shrink-0">
                      <FileText className="w-8 h-8 animate-pulse" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold mb-2">
                        ✍️ RTR Agreement Ready to Sign
                      </h3>
                      <p className="text-amber-100 text-lg">
                        Your Right-to-Represent agreement has been generated and is waiting for your signature
                      </p>
                    </div>
                  </div>
                  <Link href={`/dashboard/candidate/interests/${interest.id}/sign-rtr`}>
                    <button className="px-8 py-4 bg-white text-orange-600 rounded-xl font-bold text-lg hover:shadow-2xl transition flex items-center gap-2 whitespace-nowrap">
                      <FileText className="w-6 h-6" />
                      Sign RTR Now
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          )}

          {interest.right_to_represent_signed && (
            <div className="mb-8 p-6 bg-green-50 rounded-2xl border-2 border-green-300">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4 flex-1">
                  <CheckCircle className="w-12 h-12 text-green-600 flex-shrink-0" />
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">RTR Agreement Signed ✅</h3>
                    <p className="text-sm text-gray-600">
                      Signed on {new Date(interest.right_to_represent_signed_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                {interest.right_to_represent_pdf_url && (
                  <a
                    href={interest.right_to_represent_pdf_url}
                    target="_blank"
                    rel="noreferrer"
                    className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition flex items-center gap-2"
                  >
                    <Download className="w-5 h-5" />
                    Download Signed RTR
                  </a>
                )}
              </div>
            </div>
          )}
          
        </div>
      </div>
    </div>
  )
}
