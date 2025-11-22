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
  Download,
  Sparkles
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
      
      // First, fetch the interest without joins
      const { data: interestData, error: interestError } = await supabase
        .from('candidate_interests')
        .select('*')
        .eq('id', params.id)
        .single()

      if (interestError) throw interestError

      // Fetch related data separately
      const [jobRes, agencyRes, candidateRes] = await Promise.all([
        supabase
          .from('jobs')
          .select('*')
          .eq('id', interestData.job_id)
          .single(),
        supabase
          .from('profiles')
          .select('*')
          .eq('id', interestData.agency_id)
          .single(),
        supabase
          .from('candidates')
          .select('*')
          .eq('id', interestData.candidate_id)
          .single()
      ])

      if (jobRes.error) throw new Error('Could not load job information')
      if (candidateRes.error) throw new Error('Could not load candidate information')

      // Combine the data
      const completeInterest = {
        ...interestData,
        jobs: jobRes.data,
        profiles: agencyRes.error ? null : agencyRes.data,
        candidates: candidateRes.data
      }

      setInterest(completeInterest)

      if (completeInterest.right_to_represent_signed) {
        setShowSuccess(true)
      }

      if (!completeInterest.right_to_represent_url) {
        toast.error('RTR document is not available yet')
      }
    } catch (error: any) {
      console.error('Load error:', error)
      toast.error(error.message || 'Failed to load document')
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
                <p className="text-gray-900">{agency?.full_name || 'Agency'}</p>
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
                  <p className="text-gray-900">{agency?.full_name || 'Agency'}</p>
                  {agency?.company && (
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
                {agency?.email && (
                  <p className="text-gray-600">
                    <span className="font-bold">Agency:</span> {agency.email}
                  </p>
                )}
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
