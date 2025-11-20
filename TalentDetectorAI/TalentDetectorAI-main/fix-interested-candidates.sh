#!/bin/bash
# Fix: Create Dedicated Interested Candidates Page
# Run: bash fix-interested-candidates.sh

set -e

echo "🎯 Creating dedicated Interested Candidates page..."

# ==================== INTERESTED CANDIDATES PAGE ====================

cat > app/dashboard/agency/interested-candidates/page.tsx << 'ENDFILE'
'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  Award, Download, Loader2, ArrowLeft, Sparkles,
  CheckCircle, FileText, Zap, Mail, MapPin, Calendar, Phone
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import toast from 'react-hot-toast'
import DynamicBackground from '@/components/ui/DynamicBackground'

export default function InterestedCandidatesPage() {
  const [candidates, setCandidates] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [generatingRTR, setGeneratingRTR] = useState<string | null>(null)

  useEffect(() => {
    loadInterestedCandidates()
    
    // Real-time updates
    const supabase = createClient()
    const channel = supabase
      .channel('interested-candidates')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'candidate_interests' },
        () => loadInterestedCandidates()
      )
      .subscribe()

    // Auto-refresh
    const interval = setInterval(loadInterestedCandidates, 3000)

    return () => {
      channel.unsubscribe()
      clearInterval(interval)
    }
  }, [])

  async function loadInterestedCandidates() {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) return

      // Get only interested candidates with CV uploaded
      const { data, error } = await supabase
        .from('candidate_interests')
        .select(`
          *,
          candidates(id, name, email, phone, location, user_id, skills),
          jobs(id, title, location, salary_min, salary_max)
        `)
        .eq('agency_id', user.id)
        .eq('status', 'interested')
        .not('cv_url', 'is', null)
        .order('created_at', { ascending: false })

      if (error) throw error

      console.log('Loaded interested candidates:', data?.length || 0)
      setCandidates(data || [])
    } catch (error) {
      console.error('Load error:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleGenerateRTR(candidate: any) {
    console.log('=== GENERATING RTR FOR INTERESTED CANDIDATE ===')
    console.log('Interest ID:', candidate.id)
    console.log('Candidate:', candidate.candidates.name)
    
    setGeneratingRTR(candidate.id)
    
    try {
      const response = await fetch('/api/generate-rtr-auto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interestId: candidate.id })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to generate RTR')
      }

      const result = await response.json()
      console.log('RTR generated successfully:', result)
      
      toast.success(`✅ RTR sent to ${candidate.candidates.name} for signature!`, {
        duration: 5000,
        icon: '📄'
      })
      
      await loadInterestedCandidates()
      
    } catch (error: any) {
      console.error('RTR error:', error)
      toast.error(`Failed: ${error.message}`)
    } finally {
      setGeneratingRTR(null)
    }
  }

  const needsRTR = candidates.filter(c => !c.right_to_represent_url)
  const awaitingSignature = candidates.filter(c => c.right_to_represent_url && !c.right_to_represent_signed)
  const completed = candidates.filter(c => c.right_to_represent_signed)

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
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-3 flex items-center gap-3">
              <CheckCircle className="w-12 h-12 text-green-600" />
              Interested Candidates
            </h1>
            <p className="text-xl text-gray-600">
              {candidates.length} candidate{candidates.length !== 1 ? 's' : ''} expressed interest
            </p>
          </div>
          <Link href="/dashboard/agency">
            <button className="px-6 py-3 bg-gray-200 rounded-xl font-bold flex items-center gap-2 hover:bg-gray-300 transition">
              <ArrowLeft className="w-5 h-5" />
              Back
            </button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-2xl p-6 shadow-2xl">
            <Zap className="w-10 h-10 mb-3" />
            <p className="text-5xl font-bold mb-2">{needsRTR.length}</p>
            <p className="text-amber-100 font-bold">Need RTR Generation</p>
          </div>
          <div className="bg-gradient-to-br from-blue-500 to-cyan-600 text-white rounded-2xl p-6 shadow-2xl">
            <FileText className="w-10 h-10 mb-3" />
            <p className="text-5xl font-bold mb-2">{awaitingSignature.length}</p>
            <p className="text-blue-100 font-bold">Awaiting Signature</p>
          </div>
          <div className="bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-2xl p-6 shadow-2xl">
            <CheckCircle className="w-10 h-10 mb-3" />
            <p className="text-5xl font-bold mb-2">{completed.length}</p>
            <p className="text-green-100 font-bold">Completed (Signed)</p>
          </div>
        </div>

        {/* Action Banner */}
        {needsRTR.length > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-8 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-white rounded-2xl p-8 shadow-2xl">
            <div className="flex items-center gap-4">
              <Zap className="w-16 h-16 animate-pulse" />
              <div className="flex-1">
                <h3 className="text-3xl font-bold mb-2">
                  ⚡ {needsRTR.length} Candidate{needsRTR.length > 1 ? 's' : ''} Ready for RTR!
                </h3>
                <p className="text-amber-100 text-lg">
                  These candidates uploaded their CV and confirmed interest. Generate RTR to proceed.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Candidates List */}
        {needsRTR.length > 0 && (
          <div className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center gap-3">
              <Zap className="w-8 h-8 text-amber-600" />
              Action Required: Generate RTR
            </h2>
            <div className="space-y-4">
              <AnimatePresence>
                {needsRTR.map((candidate: any, index: number) => (
                  <CandidateCard
                    key={candidate.id}
                    candidate={candidate}
                    index={index}
                    generatingRTR={generatingRTR}
                    onGenerateRTR={handleGenerateRTR}
                  />
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Awaiting Signature */}
        {awaitingSignature.length > 0 && (
          <div className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center gap-3">
              <FileText className="w-8 h-8 text-blue-600" />
              Awaiting Signature
            </h2>
            <div className="space-y-4">
              {awaitingSignature.map((candidate: any, index: number) => (
                <CandidateCard
                  key={candidate.id}
                  candidate={candidate}
                  index={index}
                  generatingRTR={generatingRTR}
                  onGenerateRTR={handleGenerateRTR}
                />
              ))}
            </div>
          </div>
        )}

        {/* Completed */}
        {completed.length > 0 && (
          <div className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-green-600" />
              Completed (Ready to Submit)
            </h2>
            <div className="space-y-4">
              {completed.map((candidate: any, index: number) => (
                <CandidateCard
                  key={candidate.id}
                  candidate={candidate}
                  index={index}
                  generatingRTR={generatingRTR}
                  onGenerateRTR={handleGenerateRTR}
                />
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {candidates.length === 0 && (
          <div className="bg-white rounded-2xl p-20 text-center shadow-lg">
            <CheckCircle className="w-32 h-32 text-gray-300 mx-auto mb-8" />
            <h3 className="text-3xl font-bold text-gray-900 mb-4">No Interested Candidates Yet</h3>
            <p className="text-xl text-gray-600 mb-8">
              Candidates who express interest and upload their CV will appear here
            </p>
            <Link href="/dashboard/agency/interests">
              <button className="px-8 py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-lg transition shadow-lg">
                View All Interests
              </button>
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

function CandidateCard({ candidate, index, generatingRTR, onGenerateRTR }: any) {
  const cand = candidate.candidates
  const job = candidate.jobs

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className="bg-white rounded-2xl p-8 shadow-xl border-2 border-gray-200 hover:border-green-400 hover:shadow-2xl transition">
      
      <div className="flex items-start gap-6">
        {/* Avatar & Info */}
        <div className="flex-1">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-20 h-20 bg-gradient-to-br from-green-600 to-emerald-600 rounded-full flex items-center justify-center text-white font-bold text-3xl shadow-lg">
              {cand.name[0]}
            </div>
            <div className="flex-1">
              <h3 className="text-3xl font-bold text-gray-900 mb-1">{cand.name}</h3>
              <p className="text-xl text-gray-600 mb-2">{job.title}</p>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-bold">
                  ✓ Interested
                </span>
                <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-bold">
                  CV Uploaded
                </span>
                {candidate.ai_match_score && (
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-bold">
                    <Award className="w-4 h-4 inline mr-1" />
                    {candidate.ai_match_score}% Match
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Contact Info */}
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div className="flex items-center gap-2 text-gray-600">
              <Mail className="w-5 h-5" />
              <span>{cand.email}</span>
            </div>
            {cand.phone && (
              <div className="flex items-center gap-2 text-gray-600">
                <Phone className="w-5 h-5" />
                <span>{cand.phone}</span>
              </div>
            )}
            {cand.location && (
              <div className="flex items-center gap-2 text-gray-600">
                <MapPin className="w-5 h-5" />
                <span>{cand.location}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-gray-600">
              <Calendar className="w-5 h-5" />
              <span>Applied {new Date(candidate.created_at).toLocaleDateString()}</span>
            </div>
          </div>

          {/* Skills */}
          {cand.skills && cand.skills.length > 0 && (
            <div>
              <p className="text-sm font-bold text-gray-700 mb-2">Skills:</p>
              <div className="flex flex-wrap gap-2">
                {cand.skills.slice(0, 8).map((skill: string, i: number) => (
                  <span key={i} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          {/* Download CV */}
          <a
            href={candidate.cv_url}
            target="_blank"
            download
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition font-bold shadow-lg whitespace-nowrap">
            <Download className="w-5 h-5" />
            Download CV
          </a>

          {/* Generate RTR Button */}
          {!candidate.right_to_represent_url && (
            <button
              onClick={() => onGenerateRTR(candidate)}
              disabled={generatingRTR === candidate.id}
              className="flex items-center gap-2 px-6 py-4 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-xl transition font-bold shadow-2xl disabled:opacity-50 whitespace-nowrap text-lg">
              {generatingRTR === candidate.id ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Zap className="w-6 h-6" />
                  Generate RTR
                </>
              )}
            </button>
          )}

          {/* View RTR */}
          {candidate.right_to_represent_url && (
            <div className="space-y-2">
              <a
                href={candidate.right_to_represent_url}
                target="_blank"
                className="flex items-center gap-2 px-6 py-3 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-xl transition font-bold whitespace-nowrap">
                <FileText className="w-5 h-5" />
                View RTR
              </a>
              {candidate.right_to_represent_signed ? (
                <div className="px-4 py-2 bg-green-500 text-white rounded-xl text-center font-bold">
                  <CheckCircle className="w-5 h-5 inline mr-2" />
                  Signed ✓
                </div>
              ) : (
                <div className="px-4 py-2 bg-orange-100 text-orange-700 rounded-xl text-center font-bold text-sm">
                  Awaiting Signature
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
ENDFILE

echo "✅ Interested candidates page created"

# ==================== UPDATE AGENCY DASHBOARD WITH LINK ====================

cat > app/dashboard/agency/page_update.txt << 'ENDFILE'
Add this card to your agency dashboard:

<Link href="/dashboard/agency/interested-candidates">
  <motion.div
    whileHover={{ scale: 1.02 }}
    className="bg-gradient-to-br from-green-600 to-emerald-600 text-white rounded-2xl p-8 shadow-2xl cursor-pointer">
    <CheckCircle className="w-12 h-12 mb-4" />
    <h3 className="text-2xl font-bold mb-2">Interested Candidates</h3>
    <p className="text-green-100 mb-4">View candidates who expressed interest and generate RTR</p>
    <div className="flex items-center gap-2 text-lg font-bold">
      View Now <ArrowRight className="w-6 h-6" />
    </div>
  </motion.div>
</Link>
ENDFILE

echo "✅ Dashboard update instructions created"

echo ""
echo "✅✅✅ INTERESTED CANDIDATES PAGE CREATED! ✅✅✅"
echo ""
echo "🎯 NEW DEDICATED PAGE:"
echo "   URL: /dashboard/agency/interested-candidates"
echo ""
echo "📋 FEATURES:"
echo ""
echo "1. FILTERED VIEW:"
echo "   ✓ Shows ONLY interested candidates"
echo "   ✓ Only those who uploaded CV"
echo "   ✓ Grouped by status"
echo ""
echo "2. THREE SECTIONS:"
echo "   ⚡ Action Required (need RTR)"
echo "   📄 Awaiting Signature"
echo "   ✅ Completed (signed)"
echo ""
echo "3. FULLY CLICKABLE:"
echo "   ✓ Generate RTR button (large & prominent)"
echo "   ✓ Download CV button"
echo "   ✓ View RTR button"
echo "   ✓ Real-time updates"
echo ""
echo "4. CANDIDATE DETAILS:"
echo "   ✓ Name, email, phone, location"
echo "   ✓ Skills displayed"
echo "   ✓ Match score shown"
echo "   ✓ Application date"
echo ""
echo "5. ACTION BANNER:"
echo "   ✓ Shows count of candidates needing RTR"
echo "   ✓ Animated for visibility"
echo ""
echo "📍 TO ACCESS:"
echo "   Navigate to: /dashboard/agency/interested-candidates"
echo ""
echo "   Or add this link to your agency dashboard:"
echo "   (See app/dashboard/agency/page_update.txt)"
echo ""
echo "Everything is now fully clickable! 🚀"
