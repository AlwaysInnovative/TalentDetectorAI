'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import Image from 'next/image'
import { Brain, Mail, Lock, User, ChevronRight, Check, AlertCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const backgroundImages = [
  'photo-1557804506-669a67965ba0',
  'photo-1522071820081-009f0129c71c',
  'photo-1600880292203-757bb62b4baf'
]

const roleFeatures = {
  manager: {
    title: 'Hiring Manager',
    features: ['Post jobs instantly', 'AI-powered candidate screening', 'Real-time collaboration']
  },
  agency: {
    title: 'Recruitment Agency',
    features: ['Submit candidates', 'Manage proposals', 'Track placements']
  },
  candidate: {
    title: 'Job Candidate',
    features: ['Find opportunities', 'Build your CV', 'AI-guided interviews']
  }
}

export default function SignUp() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState('manager')
  const [loading, setLoading] = useState(false)
  const [currentBg, setCurrentBg] = useState(0)
  const [passwordStrength, setPasswordStrength] = useState(0)
  const [step, setStep] = useState(1)
  const router = useRouter()

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBg((prev) => (prev + 1) % backgroundImages.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  // Calculate password strength
  useEffect(() => {
    let strength = 0
    if (password.length >= 8) strength++
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++
    if (/[0-9]/.test(password)) strength++
    if (/[^a-zA-Z0-9]/.test(password)) strength++
    setPasswordStrength(strength)
  }, [password])

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const supabase = createClient()
      
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            role
          },
          emailRedirectTo: `${window.location.origin}/auth/verify-email?role=${role}`
        }
      })

      if (authError) throw authError

      // Create profile record
      if (authData.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: authData.user.id,
            full_name: name,
            email,
            role,
            email_confirmed_at: null
          })

        if (profileError && profileError.code !== 'PGRST116') {
          // Ignore duplicate error
          console.error('Profile creation error:', profileError)
        }
      }

      // Navigate to verification screen
      router.push(`/auth/verify-email?email=${encodeURIComponent(email)}&role=${role}`)
    } catch (error: any) {
      toast.error(error.message || 'Failed to create account')
    } finally {
      setLoading(false)
    }
  }

  const handleNextStep = () => {
    if (step === 1) {
      if (!name.trim()) {
        toast.error('Please enter your name')
        return
      }
      setStep(2)
    } else if (step === 2) {
      if (!email.trim() || !password.trim()) {
        toast.error('Please fill in all fields')
        return
      }
      if (passwordStrength < 2) {
        toast.error('Password is too weak')
        return
      }
      setStep(3)
    }
  }

  const getPasswordStrengthColor = () => {
    if (passwordStrength === 0) return 'bg-gray-300'
    if (passwordStrength === 1) return 'bg-red-500'
    if (passwordStrength === 2) return 'bg-yellow-500'
    if (passwordStrength === 3) return 'bg-blue-500'
    return 'bg-green-500'
  }

  const getPasswordStrengthLabel = () => {
    if (passwordStrength === 0) return 'Very Weak'
    if (passwordStrength === 1) return 'Weak'
    if (passwordStrength === 2) return 'Fair'
    if (passwordStrength === 3) return 'Good'
    return 'Strong'
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Signup Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 bg-white">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          {/* Header */}
          <div className="flex items-center gap-2 mb-8">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
            >
              <Brain className="w-8 h-8 text-emerald-600" />
            </motion.div>
            <span className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              TalentDetector AI
            </span>
          </div>

          {/* Progress Indicator */}
          <div className="flex gap-2 mb-8">
            {[1, 2, 3].map((num) => (
              <motion.div
                key={num}
                className={`h-1.5 flex-1 rounded-full transition-all ${
                  num <= step ? 'bg-emerald-600' : 'bg-gray-200'
                }`}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.3 }}
              />
            ))}
          </div>

          {/* Step 1: Full Name */}
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome!</h1>
                <p className="text-gray-600 mb-6">Let's start by getting your name</p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="John Doe"
                        className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition"
                        onKeyPress={(e) => e.key === 'Enter' && handleNextStep()}
                      />
                    </div>
                  </div>

                  <motion.button
                    onClick={handleNextStep}
                    className="w-full px-4 py-3 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 transition flex items-center justify-center gap-2 mt-6"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Continue <ChevronRight className="w-5 h-5" />
                  </motion.button>
                </div>
              </motion.div>
            )}

            {/* Step 2: Email & Password */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Secure your account</h1>
                <p className="text-gray-600 mb-6">Create a strong password</p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your@email.com"
                        className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Min. 6 characters"
                        className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition"
                        minLength={6}
                      />
                    </div>

                    {/* Password Strength Indicator */}
                    {password && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="mt-3"
                      >
                        <div className="flex gap-1 mb-1">
                          {[0, 1, 2, 3].map((i) => (
                            <div
                              key={i}
                              className={`h-1.5 flex-1 rounded-full transition-all ${
                                i < passwordStrength
                                  ? getPasswordStrengthColor()
                                  : 'bg-gray-200'
                              }`}
                            />
                          ))}
                        </div>
                        <p className="text-xs text-gray-600">
                          Strength: <span className="font-semibold">{getPasswordStrengthLabel()}</span>
                        </p>
                      </motion.div>
                    )}
                  </div>

                  <div className="flex gap-3 mt-6">
                    <motion.button
                      onClick={() => setStep(1)}
                      className="flex-1 px-4 py-3 bg-gray-100 text-gray-900 font-semibold rounded-lg hover:bg-gray-200 transition"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Back
                    </motion.button>
                    <motion.button
                      onClick={handleNextStep}
                      className="flex-1 px-4 py-3 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 transition flex items-center justify-center gap-2"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Continue <ChevronRight className="w-5 h-5" />
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 3: Role Selection */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <h1 className="text-3xl font-bold text-gray-900 mb-2">What brings you here?</h1>
                <p className="text-gray-600 mb-6">Choose your role to get started</p>

                <div className="space-y-3">
                  {Object.entries(roleFeatures).map(([key, { title, features }]) => (
                    <motion.button
                      key={key}
                      onClick={() => setRole(key)}
                      className={`w-full p-4 rounded-lg border-2 text-left transition ${
                        role === key
                          ? 'border-emerald-600 bg-emerald-50'
                          : 'border-gray-200 bg-white hover:border-emerald-300'
                      }`}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center transition ${
                            role === key
                              ? 'border-emerald-600 bg-emerald-600'
                              : 'border-gray-300'
                          }`}
                        >
                          {role === key && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{title}</p>
                          <ul className="text-xs text-gray-600 mt-1 space-y-0.5">
                            {features.map((feature, idx) => (
                              <li key={idx}>• {feature}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>

                <div className="flex gap-3 mt-6">
                  <motion.button
                    onClick={() => setStep(2)}
                    className="flex-1 px-4 py-3 bg-gray-100 text-gray-900 font-semibold rounded-lg hover:bg-gray-200 transition"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Back
                  </motion.button>
                  <motion.button
                    onClick={handleSignUp}
                    disabled={loading}
                    className="flex-1 px-4 py-3 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition flex items-center justify-center gap-2"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {loading ? 'Creating account...' : 'Create Account'}
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <p className="text-center mt-6 text-sm text-gray-600">
            Already have an account?{' '}
            <Link href="/auth/signin" className="text-emerald-600 font-semibold hover:underline">
              Sign in
            </Link>
          </p>
        </motion.div>
      </div>

      {/* Right Panel - Background */}
      <div className="hidden lg:block lg:w-1/2 relative overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentBg}
            initial={{ opacity: 0, scale: 1.1, rotate: -5 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.9, rotate: 5 }}
            transition={{ duration: 1 }}
            className="absolute inset-0"
          >
            <Image
              src={`https://images.unsplash.com/${backgroundImages[currentBg]}?auto=format&fit=crop&w=2850&q=80`}
              alt="Background"
              fill
              className="object-cover"
              priority
            />
          </motion.div>
        </AnimatePresence>
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/90 to-teal-600/90" />

        {/* Floating Cards */}
        <motion.div
          initial={{ y: 0 }}
          animate={{ y: -20 }}
          transition={{ duration: 3, repeat: Infinity, repeatType: 'reverse' }}
          className="absolute top-20 right-10 bg-white/95 rounded-2xl p-6 shadow-2xl max-w-xs"
        >
          <p className="text-sm font-semibold text-gray-900">✨ Lightning-fast hiring</p>
          <p className="text-xs text-gray-600 mt-1">Recruit top talent in days, not weeks</p>
        </motion.div>

        <motion.div
          initial={{ y: 0 }}
          animate={{ y: 20 }}
          transition={{ duration: 3, repeat: Infinity, repeatType: 'reverse' }}
          className="absolute bottom-20 left-10 bg-white/95 rounded-2xl p-6 shadow-2xl max-w-xs"
        >
          <p className="text-sm font-semibold text-gray-900">🚀 AI-powered matching</p>
          <p className="text-xs text-gray-600 mt-1">Perfect candidates, automatically screened</p>
        </motion.div>
      </div>
    </div>
  )
}
