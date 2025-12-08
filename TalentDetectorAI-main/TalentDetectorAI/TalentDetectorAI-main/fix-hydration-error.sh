#!/bin/bash
# fix-hydration-error.sh
# Fix React hydration error for time display
set -e

echo "🔧 Fixing hydration error in candidate dashboard..."

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
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
    loadInterests()
    
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
          <p className="text-xl text-gray-600" suppressHydrationWarning>
            🔄 Real-time {isClient && lastUpdate && `• Last update: ${lastUpdate.toLocaleTimeString()}`}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl p-6 shadow-lg text-center">
            <Briefcase className="w-10 h-10 text-blue-600 mx-auto mb-3" />
            <p className="text-4xl font-bold">{stats.total}</p>
            <p className="text-sm text-gray-600 font-bold">Total</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-2xl p-6 shadow-lg text-center">
            <Clock className="w-10 h-10 mx-auto mb-3" />
            <p className="text-4xl font-bold">{stats.needsAction}</p>
            <p className="text-sm font-bold">Needs Action</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-purple-500 to-pink-600 text-white rounded-2xl p-6 shadow-lg text-center">
            <FileText className="w-10 h-10 mx-auto mb-3" />
            <p className="text-4xl font-bold">{stats.needsRTR}</p>
            <p className="text-sm font-bold">Awaiting Signature</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-2xl p-6 shadow-lg text-center">
            <CheckCircle className="w-10 h-10 mx-auto mb-3" />
            <p className="text-4xl font-bold">{stats.completed}</p>
            <p className="text-sm font-bold">Completed</p>
          </motion.div>
        </div>

        {/* Interests List */}
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-20">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600 font-bold">Loading opportunities...</p>
            </div>
          ) : interests.length === 0 ? (
            <div className="bg-white rounded-2xl p-20 text-center shadow-lg">
              <Briefcase className="w-32 h-32 text-gray-300 mx-auto mb-8" />
              <h3 className="text-3xl font-bold mb-4">No Opportunities Yet</h3>
              <p className="text-xl text-gray-600">
                Opportunities from agencies will appear here
              </p>
            </div>
          ) : (
            interests.map((interest, idx) => {
              const job = interest.jobs
              const needsSignature = interest.right_to_represent_url && !interest.right_to_represent_signed

              return (
                <Link key={interest.id} href={`/dashboard/candidate/interests/${interest.id}`}>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    whileHover={{ scale: 1.02, y: -4 }}
                    className={`bg-white rounded-2xl p-6 shadow-lg cursor-pointer transition border-2 ${
                      needsSignature ? 'border-purple-400 shadow-purple-200' : 'border-gray-200 hover:border-blue-400'
                    }`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-2xl font-bold text-gray-900">{job?.title || 'Position'}</h3>
                          {needsSignature && (
                            <span className="px-3 py-1 bg-purple-500 text-white rounded-full text-xs font-bold animate-pulse">
                              ✍️ SIGN RTR
                            </span>
                          )}
                        </div>
                        <p className="text-gray-600 mb-3">{job?.location || 'Location not specified'}</p>
                        <div className="flex flex-wrap gap-2">
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
                          {interest.cv_url && (
                            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-bold">
                              <FileText className="w-4 h-4 inline mr-1" />
                              CV Uploaded
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </Link>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
ENDFILE

echo "✅ Hydration error fixed"

echo ""
echo "================================================"
echo "✅ HYDRATION ERROR FIXED!"
echo "================================================"
echo ""
echo "Changes made:"
echo "  ✅ Added isClient state with useEffect"
echo "  ✅ Added suppressHydrationWarning to time display"
echo "  ✅ Time only shows after client mount"
echo "  ✅ Prevents server/client mismatch"
echo ""
echo "Restart: npm run dev"
echo ""
ENDFILE

chmod +x fix-hydration-error.sh
bash fix-hydration-error.sh
