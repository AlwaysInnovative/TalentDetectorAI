'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Loader2, AlertCircle, ArrowLeft, FileText, ThumbsUp, ThumbsDown,
  Upload, Download, CheckCircle
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
  }, [params.id])

  async function loadInterest() {
    try {
      setLoading(true)
      setError('')
      const supabase = createClient()
      
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('Not logged in')
        return
      }

      // ✅ FIXED: Find candidate profile
      const { data: candidate, error: candErr } = await supabase
        .from('candidates')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (candErr || !candidate) {
        setError('Candidate profile not found')
        return
      }

      // ✅ FIXED: Query job_interests (NEW RTR TABLE)
      const { data: interestData, error: interestErr } = await supabase
        .from('job_interests')  // ← CHANGED FROM candidate_interests
        .select(`
          *,
          candidates(id, name, email, phone, location),
          job_postings!job_id(id, title, location, salary_range_min, salary_range_max, employment_type, description),
          recruitment_agencies!agency_id(id, name, email, phone)
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
      setError(err?.message || 'Failed to load opportunity')
    } finally {
      setLoading(false)
    }
  }

  // ✅ FIXED: Real-time subscription for job_interests
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
          table: 'job_interests',  // ← CHANGED
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

  // ✅ FIXED: CV upload to job_interests table
  async function handleUploadCv() {
    if (!cvFile || !interest) {
      toast.error('Please select a CV file first')
      return
    }

    setUploadingCv(true)
    try {
      const supabase = createClient()
      const filePath = `cv-resumes/${interest.candidate_id}/${Date.now()}_${cvFile.name}` // ← Match RTR storage bucket
      
      const { error: uploadError } = await supabase.storage
        .from('cv-resumes')  // ← Match RTR bucket
        .upload(filePath, cvFile)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('cv-resumes')
        .getPublicUrl(filePath)

      // ✅ FIXED: Update job_interests table
      const { error: updateError } = await supabase
        .from('job_interests')  // ← CHANGED
        .update({
          cv_url: publicUrl,  // ← Add this column if missing
          cv_filename: cvFile.name,
          cv_uploaded_at: new Date().toISOString()
        })
        .eq('id', interest.id)

      if (updateError) throw updateError

      toast.success('CV uploaded successfully!')
      setCvFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      await loadInterest()
      await mutate('candidate-interests')  // Keep for backward compatibility
    } catch (err: any) {
      toast.error(`Failed to upload CV: ${err?.message || 'Unknown error'}`)
    } finally {
      setUploadingCv(false)
    }
  }

  // ✅ FIXED: Response updates job_interests
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

  // ✅ RTR SIGNATURE BUTTON - NEW!
  const handleSignRTR = async () => {
    if (!interest?.right_to_represent_url) {
      toast.error('No RTR agreement available')
      return
    }

    // Redirect to RTR signing page
    window.open(interest.right_to_represent_url, '_blank')
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
              onClick={() => loadInterest()}
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

  const job = interest.job_postings  // ← FIXED table name
  const agency = interest.recruitment_agencies  // ← FIXED table name

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* RTR SIGNATURE BUTTON - NEW! */}
        {interest.right_to_represent_url && interest.rtr_status === 'pending_signature' && (
          <div className="mb-8 p-6 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-2xl shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold mb-2">✍️ Right-to-Represent Ready</h3>
                <p>Click below to review and sign the RTR agreement</p>
              </div>
              <button
                onClick={handleSignRTR}
                className="px-8 py-4 bg-white text-orange-600 rounded-xl font-bold text-lg hover:shadow-2xl transition"
              >
                Sign RTR Agreement
              </button>
            </div>
          </div>
        )}

        {/* RTR SIGNED CONFIRMATION */}
        {interest.right_to_represent_signed && (
          <div className="mb-8 p-6 bg-green-50 rounded-2xl border-2 border-green-300">
            <div className="flex items-center gap-4">
              <CheckCircle className="w-12 h-12 text-green-600" />
              <div>
                <h3 className="text-xl font-bold text-green-900">RTR Agreement Signed ✅</h3>
                <p>Agency has been notified and can now submit your application</p>
              </div>
            </div>
          </div>
        )}

        {/* Rest of your existing JSX remains the same */}
        <div className="bg-white rounded-2xl p-8 shadow-xl">
          {/* Your existing job details, CV upload, accept/decline UI */}
        </div>
      </div>
    </div>
  )
}
