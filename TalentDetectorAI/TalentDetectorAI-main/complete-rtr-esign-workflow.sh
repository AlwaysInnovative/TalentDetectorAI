#!/bin/bash
# complete-rtr-esign-workflow.sh
# Complete RTR E-Signature Workflow with Real-Time Updates
set -e

echo "🚀 Creating Complete RTR E-Signature Workflow..."

mkdir -p app/dashboard/candidate/interests/[id]/sign-rtr
mkdir -p app/api/sign-rtr

# ==================== 1. CANDIDATE DASHBOARD - REAL-TIME ====================

cat > app/dashboard/candidate/page.tsx << 'ENDFILE'
'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Briefcase, Eye, CheckCircle, FileText, Clock, Sparkles, Award } from 'lucide-react'
import { motion } from 'framer-motion'
import DynamicBackground from '@/components/ui/DynamicBackground'

export default function CandidateDashboard() {
  const [interests, setInterests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState(new Date())

  useEffect(() => {
    loadInterests()
    
    // Real-time subscription
    const supabase = createClient()
    const channel = supabase
      .channel('candidate-interests-realtime')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'candidate_interests' },
        () => {
          console.log('🔔 Real-time update received')
          loadInterests()
        }
      )
      .subscribe()

    // Polling every 5 seconds
    const interval = setInterval(loadInterests, 5000)

    return () => {
      channel.unsubscribe()
      clearInterval(interval)
    }
  }, [])

  async function loadInterests() {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: candidate } = await supabase
        .from('candidates')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (!candidate) return

      const { data, error } = await supabase
        .from('candidate_interests')
        .select('*, jobs(id, title, location, salary_min, salary_max)')
        .eq('candidate_id', candidate.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setInterests(data || [])
      setLastUpdate(new Date())
    } catch (error) {
      console.error('Load error:', error)
    } finally {
      setLoading(false)
    }
  }

  const stats = {
    total: interests.length,
    needsAction: interests.filter(i => !i.viewed_by_candidate).length,
    needsRTR: interests.filter(i => i.right_to_represent_url && !i.right_to_represent_signed).length,
    completed: interests.filter(i => i.right_to_represent_signed).length
  }

  return (
    <div className="relative min-h-screen p-8">
      <DynamicBackground page="candidate-dashboard" />
      
      <div className="max-w-6xl mx-auto relative z-10">
        <div className="mb-8">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent mb-3 flex items-center gap-3">
            <Sparkles className="w-12 h-12 text-blue-600" />
            My Opportunities
          </h1>
          <p className="text-xl text-gray-600">
            🔄 Real-time • Last update: {lastUpdate.toLocaleTimeString()}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-2xl p-6 shadow-lg text-center">
            <Briefcase className="w-10 h-10 text-blue-600 mx-auto mb-3" />
            <p className="text-4xl font-bold">{stats.total}</p>
            <p className="text-sm text-gray-600 font-bold">Total</p>
          </div>
          <div className="bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-2xl p-6 shadow-lg text-center">
            <Clock className="w-10 h-10 mx-auto mb-3" />
            <p className="text-4xl font-bold">{stats.needsAction}</p>
            <p className="text-sm font-bold">Needs Action</p>
          </div>
          <div className="bg-gradient-to-br from-purple-500 to-pink-600 text-white rounded-2xl p-6 shadow-lg text-center">
            <FileText className="w-10 h-10 mx-auto mb-3" />
            <p className="text-4xl font-bold">{stats.needsRTR}</p>
            <p className="text-sm font-bold">Awaiting Signature</p>
          </div>
          <div className="bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-2xl p-6 shadow-lg text-center">
            <CheckCircle className="w-10 h-10 mx-auto mb-3" />
            <p className="text-4xl font-bold">{stats.completed}</p>
            <p className="text-sm font-bold">Completed</p>
          </div>
        </div>

        {/* Interests List */}
        <div className="space-y-4">
          {interests.map((interest, idx) => {
            const job = interest.jobs
            const needsSignature = interest.right_to_represent_url && !interest.right_to_represent_signed

            return (
              <Link key={interest.id} href={`/dashboard/candidate/interests/${interest.id}`}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  whileHover={{ scale: 1.02 }}
                  className={`bg-white rounded-2xl p-6 shadow-lg cursor-pointer transition border-2 ${
                    needsSignature ? 'border-purple-400' : 'border-gray-200 hover:border-blue-400'
                  }`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-2xl font-bold text-gray-900">{job?.title}</h3>
                        {needsSignature && (
                          <span className="px-3 py-1 bg-purple-500 text-white rounded-full text-xs font-bold animate-pulse">
                            ✍️ SIGN RTR
                          </span>
                        )}
                      </div>
                      <p className="text-gray-600 mb-3">{job?.location}</p>
                      <div className="flex gap-2">
                        {interest.ai_match_score && (
                          <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-bold">
                            <Award className="w-4 h-4 inline mr-1" />
                            {interest.ai_match_score}% Match
                          </span>
                        )}
                        {interest.right_to_represent_signed && (
                          <span className="px-3 py-1 bg-green-500 text-white rounded-full text-sm font-bold">
                            ✓ RTR Signed
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
ENDFILE

echo "✅ Real-time candidate dashboard created"

# ==================== 2. RTR SIGN PAGE WITH E-SIGNATURE ====================

cat > app/dashboard/candidate/interests/[id]/sign-rtr/page.tsx << 'ENDFILE'
'use client'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, ArrowLeft, CheckCircle, Edit3 } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'

export default function SignRTRPage({ params }: { params: { id: string } }) {
  const [loading, setLoading] = useState(true)
  const [signing, setSigning] = useState(false)
  const [interest, setInterest] = useState<any>(null)
  const [error, setError] = useState('')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasSignature, setHasSignature] = useState(false)
  const router = useRouter()

  useEffect(() => {
    loadInterest()
  }, [])

  async function loadInterest() {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not logged in')

      const { data: candidate } = await supabase
        .from('candidates')
        .select('id, name')
        .eq('user_id', user.id)
        .single()

      if (!candidate) throw new Error('Candidate not found')

      const { data, error } = await supabase
        .from('candidate_interests')
        .select('*, jobs(id, title)')
        .eq('id', params.id)
        .eq('candidate_id', candidate.id)
        .single()

      if (error || !data) throw new Error('Interest not found')

      setInterest(data)
      setError('')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = canvas.offsetWidth
    canvas.height = 200

    ctx.strokeStyle = '#000'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
  }, [loading])

  function startDrawing(e: React.MouseEvent | React.TouchEvent) {
    setIsDrawing(true)
    setHasSignature(true)
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top

    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  function draw(e: React.MouseEvent | React.TouchEvent) {
    if (!isDrawing) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top

    ctx.lineTo(x, y)
    ctx.stroke()
  }

  function stopDrawing() {
    setIsDrawing(false)
  }

  function clearSignature() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasSignature(false)
  }

  async function handleSign() {
    if (!hasSignature) {
      toast.error('Please provide your signature')
      return
    }

    setSigning(true)
    try {
      const canvas = canvasRef.current
      if (!canvas) throw new Error('Canvas not found')

      const signatureDataURL = canvas.toDataURL('image/png')

      const response = await fetch('/api/sign-rtr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interestId: params.id,
          signature: signatureDataURL
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to sign')
      }

      toast.success('✅ RTR signed successfully!', { duration: 5000 })
      router.push(`/dashboard/candidate/interests/${params.id}`)
    } catch (error: any) {
      console.error('Sign error:', error)
      toast.error(error.message)
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

  if (error || !interest) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4 text-red-600">Error</h2>
          <p className="mb-4">{error || 'Interest not found'}</p>
          <Link href="/dashboard/candidate">
            <button className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold">
              Back to Dashboard
            </button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-8">
      <div className="max-w-4xl mx-auto">
        <Link href={`/dashboard/candidate/interests/${params.id}`}>
          <button className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-8 font-bold">
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
        </Link>

        <div className="bg-white rounded-2xl p-8 shadow-2xl">
          <h1 className="text-3xl font-bold mb-6 text-center">Sign Right to Represent Agreement</h1>
          
          {/* RTR Document Display */}
          <div className="mb-8 border-2 border-gray-200 rounded-xl overflow-hidden">
            <iframe
              src={interest.right_to_represent_url}
              className="w-full"
              style={{ height: '500px' }}
              title="RTR Document"
            />
          </div>

          {/* Signature Section */}
          {!interest.right_to_represent_signed && (
            <div className="bg-purple-50 rounded-xl p-6 border-2 border-purple-200">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Edit3 className="w-6 h-6 text-purple-600" />
                Your Electronic Signature
              </h3>
              
              <div className="bg-white rounded-lg border-2 border-purple-300 mb-4">
                <canvas
                  ref={canvasRef}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full cursor-crosshair"
                  style={{ touchAction: 'none' }}
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={clearSignature}
                  className="flex-1 px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-bold transition">
                  Clear Signature
                </button>
                <button
                  onClick={handleSign}
                  disabled={signing || !hasSignature}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl font-bold transition disabled:opacity-50 flex items-center justify-center gap-2">
                  {signing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Signing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      Sign & Submit
                    </>
                  )}
                </button>
              </div>

              <p className="text-sm text-gray-600 mt-4 text-center">
                By signing, you agree to all terms in the Right to Represent Agreement above
              </p>
            </div>
          )}

          {interest.right_to_represent_signed && (
            <div className="bg-green-50 rounded-xl p-6 border-2 border-green-200 text-center">
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-green-900 mb-2">✓ Already Signed</h3>
              <p className="text-green-700">
                You signed this agreement on {new Date(interest.right_to_represent_signed_at || '').toLocaleDateString()}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
ENDFILE

echo "✅ E-signature page created"

# ==================== 3. API TO SAVE SIGNED RTR ====================

cat > app/api/sign-rtr/route.ts << 'ENDFILE'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { interestId, signature } = body

    if (!interestId || !signature) {
      return NextResponse.json({ error: 'Missing data' }, { status: 400 })
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Get interest details
    const { data: interest, error: fetchError } = await supabaseAdmin
      .from('candidate_interests')
      .select('*, candidates(name, user_id), jobs(title)')
      .eq('id', interestId)
      .single()

    if (fetchError || !interest) {
      return NextResponse.json({ error: 'Interest not found' }, { status: 404 })
    }

    // Convert base64 signature to blob and upload
    const base64Data = signature.replace(/^data:image\/\w+;base64,/, '')
    const buffer = Buffer.from(base64Data, 'base64')
    
    const signatureFileName = `signature_${interestId}_${Date.now()}.png`
    const { error: uploadError } = await supabaseAdmin.storage
      .from('documents')
      .upload(signatureFileName, buffer, {
        contentType: 'image/png',
        upsert: false
      })

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('documents')
      .getPublicUrl(signatureFileName)

    // Update interest with signature
    const { error: updateError } = await supabaseAdmin
      .from('candidate_interests')
      .update({
        right_to_represent_signed: true,
        right_to_represent_signed_at: new Date().toISOString(),
        candidate_signature_url: publicUrl
      })
      .eq('id', interestId)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Notify agency
    await supabaseAdmin.from('notifications').insert({
      user_id: interest.agency_id,
      type: 'rtr_signed',
      title: '✅ RTR Signed!',
      message: `${interest.candidates.name} has signed the RTR for "${interest.jobs.title}"`,
      link: `/dashboard/agency/interests/${interestId}`,
      ai_priority: 'high',
      metadata: {
        interest_id: interestId,
        candidate_name: interest.candidates.name,
        signature_url: publicUrl
      }
    })

    return NextResponse.json({
      success: true,
      message: 'RTR signed successfully'
    })
  } catch (error: any) {
    console.error('Sign RTR error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
ENDFILE

echo "✅ Sign RTR API created"

echo ""
echo "=========================================="
echo "✅ COMPLETE RTR E-SIGNATURE WORKFLOW CREATED!"
echo ""
echo "Features:"
echo "  ✅ Real-time candidate dashboard"
echo "  ✅ Beautiful RTR document viewer"
echo "  ✅ Canvas-based E-signature pad"
echo "  ✅ Save signature as image"
echo "  ✅ Update database with signed status"
echo "  ✅ Real-time notification to agency"
echo "  ✅ Agency can view and download signed RTR"
echo ""
echo "Now:"
echo "  1. Restart: npm run dev"
echo "  2. Candidate logs in"
echo "  3. Sees opportunities with 'SIGN RTR' badge"
echo "  4. Clicks to view RTR"
echo "  5. Signs on canvas"
echo "  6. Submits signature"
echo "  7. Agency gets notified instantly"
echo "  8. Agency can download signed RTR"
echo ""
echo "🎉 Complete workflow ready!"
ENDFILE

chmod +x complete-rtr-esign-workflow.sh
bash complete-rtr-esign-workflow.sh
