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

      const { data: candidateData, error: candidateError } = await supabase
        .from('candidates')
        .select('*')
        .eq('id', interestData.candidate_id)
        .single()

      if (candidateError || !candidateData) {
        setError('Could not load candidate information')
        return
      }

      const { data: jobData, error: jobError } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', interestData.job_id)
        .single()

      if (jobError || !jobData) {
        setError('Could not load job information')
        return
      }

      const { data: agencyData, error: agencyError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', interestData.agency_id)
        .single()

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

      setInterest(completeInterest)
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

          {/* Signed RTR Section */}
          {interest.right_to_represent_signed && (
            <section className="mb-6 p-6 bg-green-50 rounded-xl border border-green-300 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-10 w-10 text-green-600" />
                <div>
                  <p className="font-semibold text-lg">Signed RTR Document Received</p>
                  <p className="text-sm text-gray-700">Candidate signed on {interest.right_to_represent_signed_at ? new Date(interest.right_to_represent_signed_at).toLocaleString() : 'N/A'}</p>
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

          {/* AI Summary Generation Button */}
          {interest.right_to_represent_signed && (
            <div className="mb-6">
              <button
                onClick={() => toast('AI summary generation triggered (implement API call)')}
                className="px-6 py-3 bg-blue-600 text-white font-bold rounded hover:bg-blue-700 transition"
              >
                Generate / Refresh AI Summary Card
              </button>
            </div>
          )}

          {/* Additional UI for job, candidate, agency, CV, and other details here */}

        </div>
      </div>
    </div>
  )
}
