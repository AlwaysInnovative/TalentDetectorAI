'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { Mail, CheckCircle, AlertCircle, Send, Clock, RefreshCw } from 'lucide-react'
import { motion } from 'framer-motion'

export default function VerifyEmailPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const email = searchParams.get('email') || ''
  const role = searchParams.get('role') || 'manager'
  
  const [loading, setLoading] = useState(false)
  const [timeLeft, setTimeLeft] = useState(600) // 10 minutes
  const [resendCooldown, setResendCooldown] = useState(0)
  const [verified, setVerified] = useState(false)

  // Email verification countdown
  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1)
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [timeLeft])

  // Check verification status
  useEffect(() => {
    const checkVerification = async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (user?.email_confirmed_at) {
          setVerified(true)
          setTimeout(() => {
            if (role === 'manager') {
              router.push('/dashboard/manager/onboarding')
            } else if (role === 'agency') {
              router.push('/dashboard/agency/onboarding')
            } else {
              router.push('/dashboard/candidate/onboarding')
            }
          }, 2000)
        }
      } catch (err) {
        console.error('Verification check error:', err)
      }
    }

    const interval = setInterval(checkVerification, 3000)
    return () => clearInterval(interval)
  }, [role, router])

  async function handleResendEmail() {
    setLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.resendSessionEmail({ email })

      if (error) throw error

      toast.success('Verification email resent!')
      setResendCooldown(60)
    } catch (err: any) {
      toast.error(err.message || 'Failed to resend email')
    } finally {
      setLoading(false)
    }
  }

  // Resend cooldown
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setInterval(() => {
        setResendCooldown((prev) => prev - 1)
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [resendCooldown])

  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60

  if (verified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mb-6"
          >
            <CheckCircle className="w-20 h-20 text-emerald-600 mx-auto" />
          </motion.div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Email Verified!</h1>
          <p className="text-gray-600 mb-6">Welcome to TalentDetector AI</p>
          <p className="text-sm text-gray-500">Redirecting to your dashboard...</p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-teal-50 to-blue-50 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          {/* Icon Animation */}
          <motion.div
            animate={{ bounce: [0, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity, delay: 0.2 }}
            className="mb-6"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 rounded-full">
              <Mail className="w-8 h-8 text-emerald-600" />
            </div>
          </motion.div>

          {/* Heading */}
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Check your inbox</h1>
          <p className="text-gray-600 mb-6">
            We've sent a verification email to
          </p>

          {/* Email Display */}
          <div className="inline-block bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-2 mb-6">
            <p className="font-semibold text-emerald-700 text-sm">{email}</p>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
            <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
              <Send className="w-4 h-4" />
              What to do next:
            </h3>
            <ol className="space-y-2 text-sm text-blue-800">
              <li>1. Check your email inbox</li>
              <li>2. Look for our verification email (check spam folder if needed)</li>
              <li>3. Click the verification link in the email</li>
              <li>4. You'll be automatically redirected to your dashboard</li>
            </ol>
          </div>

          {/* Timer */}
          <div className="flex items-center justify-center gap-2 mb-6 text-gray-600">
            <Clock className="w-4 h-4" />
            <span className="text-sm">
              Link expires in {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
            </span>
          </div>

          {/* Resend Button */}
          <motion.button
            onClick={handleResendEmail}
            disabled={loading || resendCooldown > 0}
            className="w-full px-4 py-3 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2 mb-4"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Sending...
              </>
            ) : resendCooldown > 0 ? (
              <>
                <Clock className="w-4 h-4" />
                Resend in {resendCooldown}s
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                Resend Email
              </>
            )}
          </motion.button>

          {/* Help Text */}
          <div className="space-y-3 text-sm text-gray-600">
            <p>Didn't receive the email? Check your spam folder</p>
            <p>
              Already verified?{' '}
              <Link href="/auth/signin" className="text-emerald-600 font-semibold hover:underline">
                Sign in here
              </Link>
            </p>
          </div>

          {/* Tips Section */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h4 className="font-semibold text-gray-900 mb-3 text-xs uppercase text-gray-500">
              Pro Tips
            </h4>
            <ul className="space-y-2 text-xs text-gray-600">
              <li className="flex gap-2">
                <span className="text-emerald-600">✓</span>
                <span>Check your <strong>Promotions</strong> tab in Gmail</span>
              </li>
              <li className="flex gap-2">
                <span className="text-emerald-600">✓</span>
                <span>Add us to your contacts to prevent future emails from going to spam</span>
              </li>
              <li className="flex gap-2">
                <span className="text-emerald-600">✓</span>
                <span>Verification links are valid for 10 minutes</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Security Badge */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center mt-6 text-xs text-gray-500 flex items-center justify-center gap-1"
        >
          <AlertCircle className="w-4 h-4" />
          <span>Your account is secure. We never share your data.</span>
        </motion.div>
      </motion.div>
    </div>
  )
}
