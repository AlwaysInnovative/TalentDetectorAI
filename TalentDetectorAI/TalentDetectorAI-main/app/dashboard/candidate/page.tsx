'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  Bell, Briefcase, FileText, TrendingUp, Clock, Eye, 
  CheckCircle, ArrowRight, Sparkles, Award, Mail
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import DynamicBackground from '@/components/ui/DynamicBackground'

export default function CandidateDashboard() {
  const [stats, setStats] = useState({
    total_interests: 0,
    unread: 0,
    cv_uploaded: 0,
    responded: 0
  })
  const [notifications, setNotifications] = useState<any[]>([])
  const [interests, setInterests] = useState<any[]>([])
  const router = useRouter()

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    // Get candidate record
    const { data: candidateData } = await supabase
      .from('candidates')
      .select('id')
      .eq('user_id', user?.id)
      .single()

    if (!candidateData) return

    // Get interests
    const { data: interestsData } = await supabase
      .from('candidate_interests')
      .select(`
        *,
        jobs(title, location, company),
        profiles!candidate_interests_agency_id_fkey(full_name, company)
      `)
      .eq('candidate_id', candidateData.id)
      .order('created_at', { ascending: false })

    setInterests(interestsData || [])

    // Calculate stats
    setStats({
      total_interests: interestsData?.length || 0,
      unread: interestsData?.filter((i: any) => !i.viewed_by_candidate).length || 0,
      cv_uploaded: interestsData?.filter((i: any) => i.cv_url).length || 0,
      responded: interestsData?.filter((i: any) => i.candidate_responded_at).length || 0
    })

    // Get notifications
    const { data: notifData } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user?.id)
      .eq('read', false)
      .order('created_at', { ascending: false })
      .limit(5)

    setNotifications(notifData || [])
  }

  async function markNotificationRead(notifId: string) {
    const supabase = createClient()
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notifId)
    loadData()
  }

  return (
    <div className="relative min-h-screen p-8">
      <DynamicBackground page="candidate-dashboard" />

      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-3">
            Welcome Back! 👋
          </h1>
          <p className="text-xl text-gray-600">Here's your opportunity dashboard</p>
        </div>

        {/* Action Banner for Unread Interests */}
        {stats.unread > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-white rounded-2xl p-6 shadow-2xl cursor-pointer hover:shadow-3xl transition"
            onClick={() => router.push('/dashboard/candidate/interests')}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
                  <Bell className="w-8 h-8 animate-bounce" />
                </div>
                <div>
                  <h3 className="text-3xl font-bold mb-1">
                    {stats.unread} New Opportunity{stats.unread > 1 ? 's' : ''} Waiting!
                  </h3>
                  <p className="text-amber-100 text-lg">
                    Click here to review and respond to job opportunities
                  </p>
                </div>
              </div>
              <ArrowRight className="w-12 h-12" />
            </div>
          </motion.div>
        )}

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Link href="/dashboard/candidate/interests">
            <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-gray-200 hover:border-blue-400 hover:shadow-xl transition cursor-pointer">
              <div className="flex items-center justify-between mb-3">
                <Briefcase className="w-8 h-8 text-blue-600" />
                <span className="text-4xl font-bold text-gray-900">{stats.total_interests}</span>
              </div>
              <p className="text-gray-600 font-bold">Total Opportunities</p>
            </div>
          </Link>

          <Link href="/dashboard/candidate/interests">
            <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-amber-200 hover:border-amber-400 hover:shadow-xl transition cursor-pointer">
              <div className="flex items-center justify-between mb-3">
                <Eye className="w-8 h-8 text-amber-600" />
                <span className="text-4xl font-bold text-amber-600">{stats.unread}</span>
              </div>
              <p className="text-gray-600 font-bold">Unread</p>
            </div>
          </Link>

          <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-purple-200">
            <div className="flex items-center justify-between mb-3">
              <FileText className="w-8 h-8 text-purple-600" />
              <span className="text-4xl font-bold text-purple-600">{stats.cv_uploaded}</span>
            </div>
            <p className="text-gray-600 font-bold">CVs Uploaded</p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-green-200">
            <div className="flex items-center justify-between mb-3">
              <CheckCircle className="w-8 h-8 text-green-600" />
              <span className="text-4xl font-bold text-green-600">{stats.responded}</span>
            </div>
            <p className="text-gray-600 font-bold">Responded</p>
          </div>
        </div>

        {/* Clickable Notifications */}
        {notifications.length > 0 && (
          <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-gray-200 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Bell className="w-6 h-6 text-blue-600" />
              Notifications
            </h2>
            <div className="space-y-3">
              {notifications.map((notif: any) => (
                <motion.div
                  key={notif.id}
                  whileHover={{ scale: 1.02 }}
                  className="p-4 bg-blue-50 border-2 border-blue-200 rounded-xl hover:border-blue-400 hover:shadow-lg transition cursor-pointer"
                  onClick={() => {
                    markNotificationRead(notif.id)
                    if (notif.link) router.push(notif.link)
                  }}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900 mb-1">{notif.title}</h3>
                      <p className="text-sm text-gray-600">{notif.message}</p>
                      <p className="text-xs text-gray-500 mt-2">
                        {new Date(notif.created_at).toLocaleString()}
                      </p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-blue-600 flex-shrink-0 ml-4" />
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Interests */}
        <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Recent Opportunities</h2>
            <Link href="/dashboard/candidate/interests">
              <button className="px-4 py-2 text-blue-600 font-bold hover:bg-blue-50 rounded-lg transition">
                View All →
              </button>
            </Link>
          </div>

          <div className="space-y-4">
            {interests.slice(0, 5).map((interest: any) => (
              <Link key={interest.id} href={`/dashboard/candidate/interests/${interest.id}`}>
                <motion.div
                  whileHover={{ scale: 1.01 }}
                  className="p-4 bg-gradient-to-r from-gray-50 to-blue-50 border-2 border-gray-200 rounded-xl hover:border-blue-400 hover:shadow-lg transition cursor-pointer">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-bold text-gray-900">{interest.jobs.title}</h3>
                        {!interest.viewed_by_candidate && (
                          <span className="px-3 py-1 bg-red-500 text-white rounded-full text-xs font-bold animate-pulse">
                            NEW
                          </span>
                        )}
                        {interest.ai_match_score && (
                          <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold flex items-center gap-1">
                            <Award className="w-3 h-3" />
                            {interest.ai_match_score}%
                          </span>
                        )}
                      </div>
                      <p className="text-gray-600 mb-2">{interest.jobs.location}</p>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span>From {interest.profiles.full_name}</span>
                        <span>•</span>
                        <span>{new Date(interest.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <ArrowRight className="w-6 h-6 text-blue-600 flex-shrink-0 ml-4" />
                  </div>
                </motion.div>
              </Link>
            ))}

            {interests.length === 0 && (
              <div className="text-center py-12">
                <Clock className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">No opportunities yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
