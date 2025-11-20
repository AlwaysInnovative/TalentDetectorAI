'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { 
  Loader2, Download, FileText, CheckCircle, Zap, ArrowLeft,
  Mail, Phone, MapPin, Calendar, Award, Sparkles, AlertCircle
} from 'lucide-react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import Link from 'next/link'
import DynamicBackground from '@/components/ui/DynamicBackground'

export default function InterestDetailPage({ params }: { params: { id: string } }) {
  const [interest, setInterest] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [generatingRTR, setGeneratingRTR] = useState(false)
  const router = useRouter()

  useEffect(() => {
    console.log('📄 Detail page loaded for ID:', params.id)
    loadInterest()
    
    // Real-time updates
    const supabase = createClient()
    const channel = supabase
      .channel(`interest-${params.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'candidate_interests',
          filter: `id=eq.${params.id}`
        },
        (payload) => {
          console.log('🔔 Interest updated:', payload)
          loadInterest()
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [params.id])

  async function loadInterest() {
    try {
      console.log('📥 Loading interest details...')
      const supabase = createClient()
      
      const { data, error } = await supabase
        .from('candidate_interests')
        .select(`
          *,
          candidates(id, name, email, phone, location, user_id, skills),
          jobs(id, title, location, salary_min, salary_max, employment_type),
          candidate_interest_responses(*)
        `)
        .eq('id', params.id)
        .single()

      if (error) {
        console.error('❌ Load error:', error)
        throw error
      }

      console.log('✅ Interest loaded:', data)
      setInterest(data)
    } catch (error: any) {
      console.error('❌ Failed to load:', error)
      toast.error('Failed to load interest')
    } finally {
      setLoading(false)
    }
  }

  async function handleGenerateRTR() {
    console.log('🚀 === GENERATING RTR ===')
    console.log('Interest ID:', params.id)
    console.log('Interest data:', interest)
    
    setGeneratingRTR(true)
    
    try {
      console.log('📡 Calling API...')
      const response = await fetch('/api/generate-rtr-auto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interestId: params.id })
      })

      const result = await response.json()
      console.log('📥 API Response:', result)

      if (!response.ok) {
        console.error('❌ API Error:', result)
        throw new Error(result.error || 'Failed to generate RTR')
      }

      console.log('✅ RTR generated successfully')
      toast.success(`✅ RTR sent to ${interest.candidates.name}!`, {
        duration: 5000,
        icon: '📄'
      })
      
      await loadInterest()
      
    } catch (error: any) {
      console.error('❌ RTR Generation Error:', error)
      toast.error(`Failed: ${error.message}`, { duration: 6000 })
    } finally {
      setGeneratingRTR(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-16 h-16 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!interest) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-4">Interest Not Found</h2>
          <Link href="/dashboard/agency/interests">
            <button className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold">
              Back to Interests
            </button>
          </Link>
        </div>
      </div>
    )
  }

  const candidate = interest.candidates
  const job = interest.jobs
  const canGenerateRTR = interest.status === 'interested' && 
                         interest.cv_url && 
                         !interest.right_to_represent_url

  console.log('🎯 Can generate RTR:', canGenerateRTR)
  console.log('Status:', interest.status)
  console.log('Has CV:', !!interest.cv_url)
  console.log('Has RTR:', !!interest.right_to_represent_url)

  return (
    <div className="relative min-h-screen p-8">
      <DynamicBackground page="interest-detail" />
      
      <div className="max-w-6xl mx-auto relative z-10">
        <Link href="/dashboard/agency/interests">
          <button className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-8 font-bold transition">
            <ArrowLeft className="w-5 h-5" />
            Back to Interests
          </button>
        </Link>

        {/* Action Banner */}
        {canGenerateRTR && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-2xl p-8 shadow-2xl">
            <div className="flex items-center gap-4">
              <Zap className="w-16 h-16 animate-pulse" />
              <div className="flex-1">
                <h3 className="text-3xl font-bold mb-2">⚡ Ready to Generate RTR!</h3>
                <p className="text-amber-100 text-lg">
                  {candidate.name} is interested and uploaded their CV. Click below to generate RTR.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        <div className="grid md:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="md:col-span-2">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl p-8 shadow-xl border-2 border-gray-200">
              <div className="flex items-center gap-6 mb-6">
                <div className="w-24 h-24 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-full flex items-center justify-center text-white font-bold text-4xl shadow-lg">
                  {candidate.name[0]}
                </div>
                <div className="flex-1">
                  <h1 className="text-4xl font-bold text-gray-900 mb-2">{candidate.name}</h1>
                  <p className="text-xl text-gray-600 mb-3">{job.title}</p>
                  <div className="flex gap-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                      interest.status === 'interested' ? 'bg-green-100 text-green-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {interest.status === 'interested' ? '✓ Interested' : interest.status}
                    </span>
                    {interest.ai_match_score && (
                      <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-bold">
                        <Award className="w-4 h-4 inline mr-1" />
                        {interest.ai_match_score}%
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4 mb-6">
                <div className="flex items-center gap-2 text-gray-700">
                  <Mail className="w-5 h-5 text-blue-600" />
                  {candidate.email}
                </div>
                {candidate.phone && (
                  <div className="flex items-center gap-2 text-gray-700">
                    <Phone className="w-5 h-5 text-blue-600" />
                    {candidate.phone}
                  </div>
                )}
                {candidate.location && (
                  <div className="flex items-center gap-2 text-gray-700">
                    <MapPin className="w-5 h-5 text-blue-600" />
                    {candidate.location}
                  </div>
                )}
                <div className="flex items-center gap-2 text-gray-700">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  {new Date(interest.created_at).toLocaleDateString()}
                </div>
              </div>

              {candidate.skills && candidate.skills.length > 0 && (
                <div>
                  <h3 className="font-bold text-gray-900 mb-3">Skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {candidate.skills.map((skill: string, i: number) => (
                      <span key={i} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </div>

          {/* Sidebar with Actions */}
          <div className="space-y-6">
            {/* Download CV */}
            {interest.cv_url && (
              <motion.a
                whileHover={{ scale: 1.05 }}
                href={interest.cv_url}
                target="_blank"
                download
                className="block bg-blue-600 hover:bg-blue-700 text-white rounded-2xl p-6 shadow-xl transition text-center">
                <Download className="w-12 h-12 mx-auto mb-3" />
                <p className="font-bold text-lg">Download CV</p>
              </motion.a>
            )}

            {/* Generate RTR Button - BIG AND CLICKABLE */}
            {canGenerateRTR && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleGenerateRTR}
                disabled={generatingRTR}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-2xl p-8 shadow-2xl transition disabled:opacity-50">
                {generatingRTR ? (
                  <div className="text-center">
                    <Loader2 className="w-12 h-12 animate-spin mx-auto mb-3" />
                    <p className="font-bold text-xl">Generating RTR...</p>
                    <p className="text-sm text-amber-100 mt-2">Please wait</p>
                  </div>
                ) : (
                  <div className="text-center">
                    <Zap className="w-16 h-16 mx-auto mb-3 animate-pulse" />
                    <p className="font-bold text-2xl mb-2">Generate RTR</p>
                    <p className="text-sm text-amber-100">Click to send agreement</p>
                  </div>
                )}
              </motion.button>
            )}

            {/* RTR Status */}
            {interest.right_to_represent_url && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-purple-50 rounded-2xl p-6 border-2 border-purple-200">
                <FileText className="w-12 h-12 text-purple-600 mx-auto mb-3" />
                <a
                  href={interest.right_to_represent_url}
                  target="_blank"
                  className="block text-center px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold transition mb-3">
                  View RTR
                </a>
                {interest.right_to_represent_signed ? (
                  <div className="flex items-center justify-center gap-2 text-green-600 font-bold">
                    <CheckCircle className="w-6 h-6" />
                    Signed ✓
                  </div>
                ) : (
                  <div className="text-center text-orange-600 font-bold">
                    <AlertCircle className="w-6 h-6 inline mr-2" />
                    Awaiting Signature
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
