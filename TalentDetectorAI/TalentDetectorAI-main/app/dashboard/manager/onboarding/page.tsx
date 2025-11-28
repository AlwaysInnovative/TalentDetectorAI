'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Loader2,
  CheckCircle,
  FileText,
  Users,
  Briefcase,
  Settings,
  ArrowRight,
  Brain
} from 'lucide-react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'

export default function ManagerOnboardingPage() {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
    async function checkAuth() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
          router.push('/auth/signin')
          return
        }

        setUser(user)
      } catch (err) {
        console.error('Auth error:', err)
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-50">
        <Loader2 className="w-12 h-12 text-emerald-600 animate-spin" />
      </div>
    )
  }

  const nextActions = [
    {
      id: 1,
      title: 'Complete Your Profile',
      description: 'Add a profile picture and company details',
      icon: Settings,
      link: '/dashboard/manager/profile',
      color: 'bg-blue-100',
      iconColor: 'text-blue-600'
    },
    {
      id: 2,
      title: 'Post Your First Job',
      description: 'Create and publish a job opening',
      icon: Briefcase,
      link: '/dashboard/manager/post-job',
      color: 'bg-emerald-100',
      iconColor: 'text-emerald-600'
    },
    {
      id: 3,
      title: 'Connect with Agencies',
      description: 'Invite recruitment partners to your jobs',
      icon: Users,
      link: '/dashboard/manager/agencies',
      color: 'bg-purple-100',
      iconColor: 'text-purple-600'
    },
    {
      id: 4,
      title: 'Review AI Features',
      description: 'Learn about AI-powered candidate screening',
      icon: Brain,
      link: '/docs/ai-features',
      color: 'bg-orange-100',
      iconColor: 'text-orange-600'
    }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-blue-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
            className="inline-block mb-4"
          >
            <Brain className="w-12 h-12 text-emerald-600" />
          </motion.div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Welcome to TalentDetector AI!</h1>
          <p className="text-xl text-gray-600">
            Get started with these essential next steps
          </p>
        </motion.div>

        {/* Verification Success Banner */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-emerald-50 border-2 border-emerald-300 rounded-xl p-6 mb-12 flex items-center gap-4"
        >
          <CheckCircle className="w-8 h-8 text-emerald-600 flex-shrink-0" />
          <div>
            <p className="font-bold text-emerald-900">Email verified successfully!</p>
            <p className="text-sm text-emerald-700">Your account is now active and ready to use</p>
          </div>
        </motion.div>

        {/* Next Actions Grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {nextActions.map((action, index) => {
            const Icon = action.icon
            return (
              <motion.div
                key={action.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Link href={action.link}>
                  <div className="h-full bg-white rounded-2xl p-6 shadow-sm border border-gray-200 hover:shadow-lg hover:border-emerald-300 transition group cursor-pointer">
                    <div className={`w-12 h-12 ${action.color} rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition`}>
                      <Icon className={`w-6 h-6 ${action.iconColor}`} />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{action.title}</h3>
                    <p className="text-sm text-gray-600 mb-4">{action.description}</p>
                    <div className="flex items-center gap-2 text-emerald-600 font-semibold text-sm group-hover:gap-3 transition">
                      Get Started
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            )
          })}
        </div>

        {/* Quick Stats */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="grid md:grid-cols-3 gap-6 mb-12"
        >
          <div className="bg-white rounded-xl p-6 text-center shadow-sm border border-gray-200">
            <p className="text-3xl font-bold text-emerald-600">0</p>
            <p className="text-sm text-gray-600 mt-1">Jobs Posted</p>
          </div>
          <div className="bg-white rounded-xl p-6 text-center shadow-sm border border-gray-200">
            <p className="text-3xl font-bold text-emerald-600">0</p>
            <p className="text-sm text-gray-600 mt-1">Candidates Screened</p>
          </div>
          <div className="bg-white rounded-xl p-6 text-center shadow-sm border border-gray-200">
            <p className="text-3xl font-bold text-emerald-600">0</p>
            <p className="text-sm text-gray-600 mt-1">Hires Made</p>
          </div>
        </motion.div>

        {/* Help Section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="bg-blue-50 border border-blue-200 rounded-xl p-8 text-center"
        >
          <h3 className="text-lg font-bold text-blue-900 mb-2">Need Help?</h3>
          <p className="text-blue-700 mb-4">Check our documentation or contact our support team</p>
          <div className="flex gap-3 justify-center">
            <Link href="/docs" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold">
              View Docs
            </Link>
            <Link href="/support" className="px-4 py-2 bg-white text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 text-sm font-semibold">
              Contact Support
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
