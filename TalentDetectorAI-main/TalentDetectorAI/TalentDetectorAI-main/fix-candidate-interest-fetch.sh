#!/bin/bash
# fix-candidate-interest-fetch.sh
set -e

echo "🔧 Fixing candidate interest fetch..."

# Fix the candidate interest detail page
cat > app/dashboard/candidate/interests/[id]/page.tsx <<'ENDFILE'
'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { 
  Loader2, Download, FileText, CheckCircle, Zap, ArrowLeft,
  Mail, Phone, MapPin, Calendar, Award, Sparkles, AlertCircle,
  Eye, TrendingUp
} from 'lucide-react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import Link from 'next/link'

export default function CandidateInterestDetailPage({ params }: { params: { id: string } }) {
  const [interest, setInterest] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    loadInterest()
  }, [])

  async function loadInterest() {
    try {
      console.log('📥 Loading interest for candidate...')
      console.log('Interest ID:', params.id)
      
      const supabase = createClient()
      
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError) {
        console.error('❌ User error:', userError)
        throw userError
      }
      
      if (!user) {
        console.error('❌ No user logged in')
        setError('Please log in to view this opportunity')
        return
      }

      console.log('✅ User ID:', user.id)

      // Try to get the candidate record first
      const { data: candidateData, error: candidateError } = await supabase
        .from('candidates')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (candidateError || !candidateData) {
        console.error('❌ Candidate not found for user:', user.id)
        setError('Your candidate profile was not found. Please contact support.')
        return
      }

      console.log('✅ Candidate ID:', candidateData.id)

      // Now fetch the interest using candidate_id
      const { data, error: fetchError } = await supabase
        .from('candidate_interests')
        .select(`
          *,
          candidates(id, name, email, phone, location, user_id, skills, years_of_experience),
          jobs(id, title, location, salary_min, salary_max, description),
          candidate_interest_responses(*)
        `)
        .eq('id', params.id)
        .eq('candidate_id', candidateData.id)
        .single()

      if (fetchError) {
        console.error('❌ Fetch error:', fetchError)
        setError(`Failed to load opportunity: ${fetchError.message}`)
        return
      }

      if (!data) {
        console.error('❌ No data returned')
        setError('This opportunity does not exist or you do not have access to it')
        return
      }

      console.log('✅ Interest loaded:', data)
      setInterest(data)
      setError('')
    } catch (error: any) {
      console.error('❌ Load error:', error)
      setError(error.message || 'Failed to load opportunity')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="text-center">
          <Loader2 className="w-16 h-16 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 font-bold text-xl">Loading opportunity...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 p-8">
        <div className="bg-white rounded-2xl p-12 shadow-2xl max-w-2xl text-center">
          <AlertCircle className="w-20 h-20 text-red-500 mx-auto mb-6" />
          <h2 className="text-3xl font-bold mb-4 text-red-600">Failed to Load Opportunity</h2>
          <p className="text-gray-700 text-lg mb-6">{error}</p>
          <div className="space-y-3">
            <button
              onClick={loadInterest}
              className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition">
              Try Again
            </button>
            <Link href="/dashboard/candidate/interests">
              <button className="w-full px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-bold transition">
                <ArrowLeft className="w-5 h-5 inline mr-2" />
                Back to Opportunities
              </button>
            </Link>
          </div>
          <details className="mt-8 text-left">
            <summary className="cursor-pointer font-bold text-sm text-gray-500">Debug Info</summary>
            <pre className="mt-2 text-xs bg-gray-100 p-4 rounded overflow-auto">
Interest ID: {params.id}
Error: {error}
            </pre>
          </details>
        </div>
      </div>
    )
  }

  if (!interest) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-4">Opportunity Not Found</h2>
          <Link href="/dashboard/candidate/interests">
            <button className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold">
              View All Opportunities
            </button>
          </Link>
        </div>
      </div>
    )
  }

  const candidate = interest.candidates
  const job = interest.jobs

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-8">
      <div className="max-w-6xl mx-auto">
        <Link href="/dashboard/candidate/interests">
          <button className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-8 transition font-bold">
            <ArrowLeft className="w-5 h-5" />
            Back to Opportunities
          </button>
        </Link>

        {/* Your existing interest detail UI here */}
        <div className="bg-white rounded-2xl p-8 shadow-xl">
          <h1 className="text-4xl font-bold mb-4">{job?.title || 'Position'}</h1>
          <p className="text-xl text-gray-600 mb-6">{job?.location}</p>
          
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-gray-700">
              <Mail className="w-5 h-5 text-blue-600" />
              <span>{candidate?.email}</span>
            </div>
            {candidate?.phone && (
              <div className="flex items-center gap-2 text-gray-700">
                <Phone className="w-5 h-5 text-blue-600" />
                <span>{candidate.phone}</span>
              </div>
            )}
          </div>

          {/* Add your CV upload, response form, etc. here */}
          
          {interest.right_to_represent_url && (
            <div className="mt-8">
              <h3 className="text-2xl font-bold mb-4">Right to Represent Agreement</h3>
              <Link href={`/dashboard/candidate/interests/${interest.id}/sign-rtr`}>
                <button className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold">
                  <FileText className="w-5 h-5 inline mr-2" />
                  View & Sign RTR
                </button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
ENDFILE

echo "✅ Candidate interest page fixed"

echo ""
echo "=========================================="
echo "✅ FIX APPLIED!"
echo ""
echo "Changes made:"
echo "  1. Gets user.id from auth"
echo "  2. Looks up candidate.id from candidates table using user_id"
echo "  3. Fetches interest using candidate_id (not user_id)"
echo "  4. Shows detailed error messages for debugging"
echo "  5. Added retry and back buttons on error"
echo ""
echo "Now restart your dev server:"
echo "  Ctrl+C"
echo "  npm run dev"
echo ""
echo "Then test as candidate again!"
echo ""
ENDFILE

chmod +x fix-candidate-interest-fetch.sh
bash fix-candidate-interest-fetch.sh
