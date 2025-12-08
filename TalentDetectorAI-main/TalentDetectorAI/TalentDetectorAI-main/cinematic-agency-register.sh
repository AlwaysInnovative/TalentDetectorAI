#!/bin/bash
# Cinematic Agency Registration with Human Imagery
# Run: bash cinematic-agency-register.sh

set -e

echo "🎬 Building Cinematic Agency Registration..."

cat > app/auth/register/agency/page.tsx << 'ENDFILE'
'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Building2, Mail, Lock, User, Loader2, ArrowRight, CheckCircle, Sparkles } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'

export default function AgencyRegister() {
  const [formData, setFormData] = useState({
    fullName: '',
    company: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [loading, setLoading] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [backgroundIndex, setBackgroundIndex] = useState(0)
  const router = useRouter()

  // Simulated professional images - in production, use Unsplash API or stock photos
  const backgrounds = [
    'linear-gradient(135deg, rgba(99, 102, 241, 0.9), rgba(168, 85, 247, 0.9))',
    'linear-gradient(135deg, rgba(59, 130, 246, 0.9), rgba(147, 51, 234, 0.9))',
    'linear-gradient(135deg, rgba(79, 70, 229, 0.9), rgba(124, 58, 237, 0.9))'
  ]

  useEffect(() => {
    const interval = setInterval(() => {
      setBackgroundIndex((prev) => (prev + 1) % backgrounds.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()
      
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            role: 'agency'
          }
        }
      })

      if (authError) throw authError
      if (!authData.user) throw new Error('Registration failed')

      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          email: formData.email,
          full_name: formData.fullName,
          company: formData.company,
          role: 'agency'
        })

      if (profileError) throw profileError

      toast.success('✅ Registration successful!')
      
      setTimeout(() => {
        router.push('/dashboard/agency')
      }, 1000)
    } catch (error: any) {
      toast.error(error.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const steps = [
    { number: 1, title: 'Personal Details', icon: User },
    { number: 2, title: 'Company Info', icon: Building2 },
    { number: 3, title: 'Account Setup', icon: Lock }
  ]

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated Background with Gradient */}
      <div className="absolute inset-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={backgroundIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2 }}
            className="absolute inset-0"
            style={{ background: backgrounds[backgroundIndex] }}
          />
        </AnimatePresence>

        {/* Floating Particles */}
        {[...Array(30)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-white/20 rounded-full"
            initial={{
              x: Math.random() * window.innerWidth,
              y: Math.random() * window.innerHeight,
            }}
            animate={{
              y: [0, -100, 0],
              opacity: [0.2, 0.6, 0.2],
              scale: [1, 1.5, 1],
            }}
            transition={{
              duration: Math.random() * 5 + 5,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}

        {/* Animated Waves */}
        <div className="absolute inset-0 opacity-30">
          <svg className="absolute bottom-0 w-full" viewBox="0 0 1440 320">
            <motion.path
              fill="rgba(255,255,255,0.1)"
              animate={{
                d: [
                  "M0,128L48,138.7C96,149,192,171,288,165.3C384,160,480,128,576,133.3C672,139,768,181,864,197.3C960,213,1056,203,1152,181.3C1248,160,1344,128,1392,112L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z",
                  "M0,192L48,181.3C96,171,192,149,288,154.7C384,160,480,192,576,186.7C672,181,768,139,864,133.3C960,128,1056,160,1152,181.3C1248,203,1344,213,1392,218.7L1440,224L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
                ]
              }}
              transition={{ duration: 8, repeat: Infinity, repeatType: "reverse" }}
            />
          </svg>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="grid md:grid-cols-2 gap-8 max-w-6xl w-full">
          {/* Left Side - Benefits */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            className="hidden md:flex flex-col justify-center text-white space-y-8">
            
            <div>
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-5xl font-bold mb-4">
                Welcome to
                <br />
                <span className="bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
                  TalentDetector AI
                </span>
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-xl text-blue-100">
                Join the future of recruitment
              </motion.p>
            </div>

            {[
              { icon: Sparkles, text: 'AI-Powered Candidate Matching', delay: 0.4 },
              { icon: Building2, text: 'Work with Top Companies', delay: 0.5 },
              { icon: CheckCircle, text: 'Competitive Commission Rates', delay: 0.6 },
              { icon: ArrowRight, text: 'Real-Time Job Opportunities', delay: 0.7 }
            ].map((benefit, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: benefit.delay }}
                className="flex items-center gap-4 bg-white/10 backdrop-blur-sm rounded-2xl p-4 hover:bg-white/20 transition">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <benefit.icon className="w-6 h-6 text-white" />
                </div>
                <p className="text-lg font-semibold">{benefit.text}</p>
              </motion.div>
            ))}

            {/* Animated Stats */}
            <div className="grid grid-cols-3 gap-4 mt-8">
              {[
                { value: '500+', label: 'Companies' },
                { value: '10k+', label: 'Jobs' },
                { value: '95%', label: 'Success Rate' }
              ].map((stat, i) => (
                <motion.div
                  key={i}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.8 + i * 0.1 }}
                  className="text-center bg-white/10 backdrop-blur-sm rounded-xl p-4">
                  <p className="text-3xl font-bold">{stat.value}</p>
                  <p className="text-sm text-blue-200">{stat.label}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Right Side - Form */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 md:p-10">
            
            <div className="text-center mb-8">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', duration: 0.8 }}
                className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Building2 className="w-10 h-10 text-white" />
              </motion.div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">
                Join as Agency
              </h2>
              <p className="text-gray-600">Start recruiting top talent today</p>
            </div>

            {/* Progress Steps */}
            <div className="flex justify-between mb-8">
              {steps.map((step) => (
                <div key={step.number} className="flex items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition ${
                    currentStep >= step.number 
                      ? 'bg-gradient-to-br from-indigo-600 to-blue-600 text-white' 
                      : 'bg-gray-200 text-gray-500'
                  }`}>
                    {currentStep > step.number ? <CheckCircle className="w-5 h-5" /> : step.number}
                  </div>
                  {step.number < 3 && (
                    <div className={`w-16 h-1 mx-2 transition ${
                      currentStep > step.number ? 'bg-indigo-600' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              ))}
            </div>

            <form onSubmit={handleRegister} className="space-y-5">
              <AnimatePresence mode="wait">
                {/* Step 1 */}
                {currentStep === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold mb-2 text-gray-700">Full Name *</label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="text"
                          value={formData.fullName}
                          onChange={e => setFormData({...formData, fullName: e.target.value})}
                          className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 outline-none transition"
                          placeholder="John Smith"
                          required
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => formData.fullName && setCurrentStep(2)}
                      className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 text-white py-3 rounded-xl font-bold hover:opacity-90 transition flex items-center justify-center gap-2">
                      Next <ArrowRight className="w-5 h-5" />
                    </button>
                  </motion.div>
                )}

                {/* Step 2 */}
                {currentStep === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold mb-2 text-gray-700">Company Name *</label>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="text"
                          value={formData.company}
                          onChange={e => setFormData({...formData, company: e.target.value})}
                          className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 outline-none transition"
                          placeholder="ABC Recruitment Ltd"
                          required
                        />
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setCurrentStep(1)}
                        className="flex-1 border-2 border-gray-300 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-50 transition">
                        Back
                      </button>
                      <button
                        type="button"
                        onClick={() => formData.company && setCurrentStep(3)}
                        className="flex-1 bg-gradient-to-r from-indigo-600 to-blue-600 text-white py-3 rounded-xl font-bold hover:opacity-90 transition flex items-center justify-center gap-2">
                        Next <ArrowRight className="w-5 h-5" />
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* Step 3 */}
                {currentStep === 3 && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold mb-2 text-gray-700">Email *</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="email"
                          value={formData.email}
                          onChange={e => setFormData({...formData, email: e.target.value})}
                          className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 outline-none transition"
                          placeholder="john@company.com"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold mb-2 text-gray-700">Password *</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="password"
                          value={formData.password}
                          onChange={e => setFormData({...formData, password: e.target.value})}
                          className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 outline-none transition"
                          placeholder="••••••••"
                          required
                          minLength={6}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold mb-2 text-gray-700">Confirm Password *</label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                          type="password"
                          value={formData.confirmPassword}
                          onChange={e => setFormData({...formData, confirmPassword: e.target.value})}
                          className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20 outline-none transition"
                          placeholder="••••••••"
                          required
                          minLength={6}
                        />
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setCurrentStep(2)}
                        className="flex-1 border-2 border-gray-300 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-50 transition">
                        Back
                      </button>
                      <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 bg-gradient-to-r from-indigo-600 to-blue-600 text-white py-3 rounded-xl font-bold hover:opacity-90 transition flex items-center justify-center gap-2">
                        {loading ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Creating...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-5 h-5" />
                            Create Account
                          </>
                        )}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Already have an account?{' '}
                <Link href="/auth/login" className="text-indigo-600 font-semibold hover:underline">
                  Sign In
                </Link>
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
ENDFILE

echo ""
echo "✅ Cinematic Agency Registration Created!"
echo ""
echo "Features:"
echo "✓ Animated gradient backgrounds"
echo "✓ Floating particles effect"
echo "✓ Smooth wave animations"
echo "✓ Multi-step form with progress"
echo "✓ Benefits showcase"
echo "✓ Statistics display"
echo "✓ Smooth transitions"
echo "✓ Mobile responsive"
echo ""
echo "Run: npm run dev"
echo ""
echo "Visit: /auth/register/agency"
