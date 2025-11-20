#!/bin/bash
# Add Email Verification & Better Success Messages
# Run: bash add-email-verification.sh

set -e

echo "🔧 Adding Email Verification & Success Messages..."

cat > app/auth/register/agency/page.tsx << 'ENDFILE'
'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Building2, Mail, Lock, User, Loader2, ArrowRight, CheckCircle, Briefcase, Users, TrendingUp, AlertCircle } from 'lucide-react'
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
  const [showSuccess, setShowSuccess] = useState(false)
  const router = useRouter()

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
          },
          emailRedirectTo: `${window.location.origin}/auth/signin`
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

      if (profileError) {
        console.error('Profile creation error:', profileError)
        throw profileError
      }

      // Show success screen
      setShowSuccess(true)
      
    } catch (error: any) {
      console.error('Registration error:', error)
      toast.error(error.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const steps = [
    { number: 1, title: 'Personal Info', icon: User },
    { number: 2, title: 'Company', icon: Building2 },
    { number: 3, title: 'Security', icon: Lock }
  ]

  // Success Screen
  if (showSuccess) {
    return (
      <div className="min-h-screen relative overflow-hidden bg-gray-900 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=1920&q=80)', filter: 'brightness(0.3) blur(2px)' }} />
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/80 via-teal-900/80 to-cyan-900/80" />
        
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="relative z-10 bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-12 max-w-2xl w-full border border-white/20 text-center">
          
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="w-24 h-24 bg-gradient-to-br from-emerald-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl">
            <CheckCircle className="w-14 h-14 text-white" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-4xl font-bold text-gray-900 mb-4">
            Registration Successful! 🎉
          </motion.h1>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mb-8">
            <p className="text-xl text-gray-700 mb-4">
              Welcome to <strong className="text-blue-600">{formData.company}</strong>!
            </p>
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6 text-left">
              <div className="flex items-start gap-3">
                <Mail className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-bold text-blue-900 mb-2">📧 Verify Your Email</h3>
                  <p className="text-sm text-blue-800 mb-3">
                    We've sent a verification email to:
                  </p>
                  <p className="font-bold text-blue-600 mb-3">{formData.email}</p>
                  <p className="text-sm text-blue-800">
                    Please check your inbox and click the verification link to activate your account.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-amber-50 border-2 border-amber-200 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-2 justify-center text-amber-800">
              <AlertCircle className="w-5 h-5" />
              <p className="text-sm font-semibold">
                Don't forget to check your spam folder if you don't see the email!
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="space-y-3">
            <h3 className="font-bold text-gray-900 mb-3">What happens next?</h3>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-4 rounded-xl">
                <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold mb-2 mx-auto">1</div>
                <p className="font-semibold text-gray-900 mb-1">Verify Email</p>
                <p className="text-gray-600 text-xs">Click the link in your email</p>
              </div>
              <div className="bg-gradient-to-br from-emerald-50 to-green-50 p-4 rounded-xl">
                <div className="w-10 h-10 bg-emerald-600 rounded-full flex items-center justify-center text-white font-bold mb-2 mx-auto">2</div>
                <p className="font-semibold text-gray-900 mb-1">Sign In</p>
                <p className="text-gray-600 text-xs">Access your account</p>
              </div>
              <div className="bg-gradient-to-br from-amber-50 to-yellow-50 p-4 rounded-xl">
                <div className="w-10 h-10 bg-amber-600 rounded-full flex items-center justify-center text-white font-bold mb-2 mx-auto">3</div>
                <p className="font-semibold text-gray-900 mb-1">Start Recruiting</p>
                <p className="text-gray-600 text-xs">Access job opportunities</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="mt-8 pt-6 border-t">
            <Link href="/auth/signin">
              <button className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white px-8 py-4 rounded-xl font-bold hover:shadow-xl transition-all flex items-center gap-2 mx-auto">
                Go to Sign In <ArrowRight className="w-5 h-5" />
              </button>
            </Link>
            <p className="text-xs text-gray-500 mt-4">
              Already verified? You can sign in immediately!
            </p>
          </motion.div>
        </motion.div>
      </div>
    )
  }

  // Registration Form (same as before but cleaner)
  return (
    <div className="min-h-screen relative overflow-hidden bg-gray-900">
      <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: 'url(https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=1920&q=80)', filter: 'brightness(0.3) blur(2px)' }} />
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/80 via-teal-900/80 to-cyan-900/80" />
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(0deg, transparent 24%, rgba(255, 255, 255, .05) 25%, rgba(255, 255, 255, .05) 26%, transparent 27%, transparent 74%, rgba(255, 255, 255, .05) 75%, rgba(255, 255, 255, .05) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, rgba(255, 255, 255, .05) 25%, rgba(255, 255, 255, .05) 26%, transparent 27%, transparent 74%, rgba(255, 255, 255, .05) 75%, rgba(255, 255, 255, .05) 76%, transparent 77%, transparent)', backgroundSize: '50px 50px' }} />
      </div>

      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="grid md:grid-cols-2 gap-12 max-w-6xl w-full">
          <motion.div initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} className="hidden md:flex flex-col justify-center text-white space-y-8">
            <div>
              <h1 className="text-5xl font-bold mb-4">Join Leading<br /><span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">Recruitment Network</span></h1>
              <p className="text-xl text-cyan-100">Connect with top employers</p>
            </div>
            {[ { icon: Briefcase, text: 'Access 500+ Jobs' }, { icon: TrendingUp, text: 'Earn 25% Commission' }, { icon: Users, text: 'AI Matching' }, { icon: CheckCircle, text: 'Premium Support' } ].map((benefit, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 + i * 0.1 }} className="flex items-center gap-4 bg-white/5 backdrop-blur-md rounded-2xl p-5 border border-white/10">
                <div className="w-14 h-14 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                  <benefit.icon className="w-7 h-7 text-white" />
                </div>
                <p className="text-lg font-semibold">{benefit.text}</p>
              </motion.div>
            ))}
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 md:p-10 border border-white/20">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Building2 className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-2">Create Agency Account</h2>
              <p className="text-gray-600">Start recruiting in minutes</p>
            </div>

            <div className="flex justify-between mb-8">
              {steps.map((step, idx) => (
                <div key={step.number} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${currentStep >= step.number ? 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-lg' : 'bg-gray-200 text-gray-500'}`}>
                      {currentStep > step.number ? <CheckCircle className="w-5 h-5" /> : step.number}
                    </div>
                    <span className={`text-xs mt-2 font-semibold ${currentStep >= step.number ? 'text-blue-600' : 'text-gray-400'}`}>{step.title}</span>
                  </div>
                  {idx < steps.length - 1 && <div className={`h-1 flex-1 mx-2 rounded transition-all ${currentStep > step.number ? 'bg-gradient-to-r from-cyan-500 to-blue-600' : 'bg-gray-200'}`} />}
                </div>
              ))}
            </div>

            <form onSubmit={handleRegister} className="space-y-5">
              <AnimatePresence mode="wait">
                {currentStep === 1 && (
                  <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                    <div><label className="block text-sm font-bold mb-2 text-gray-700">Full Name *</label>
                      <div className="relative"><User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input type="text" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition" placeholder="John Smith" required />
                      </div>
                    </div>
                    <button type="button" onClick={() => formData.fullName && setCurrentStep(2)} className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white py-3.5 rounded-xl font-bold hover:shadow-xl transition-all flex items-center justify-center gap-2">Continue <ArrowRight className="w-5 h-5" /></button>
                  </motion.div>
                )}
                {currentStep === 2 && (
                  <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                    <div><label className="block text-sm font-bold mb-2 text-gray-700">Company Name *</label>
                      <div className="relative"><Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input type="text" value={formData.company} onChange={e => setFormData({...formData, company: e.target.value})} className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition" placeholder="ABC Recruitment Ltd" required />
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button type="button" onClick={() => setCurrentStep(1)} className="flex-1 border-2 border-gray-300 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-50 transition">Back</button>
                      <button type="button" onClick={() => formData.company && setCurrentStep(3)} className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 text-white py-3 rounded-xl font-bold hover:shadow-xl transition-all flex items-center justify-center gap-2">Continue <ArrowRight className="w-5 h-5" /></button>
                    </div>
                  </motion.div>
                )}
                {currentStep === 3 && (
                  <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
                    <div><label className="block text-sm font-bold mb-2 text-gray-700">Email *</label>
                      <div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition" placeholder="john@company.com" required />
                      </div>
                    </div>
                    <div><label className="block text-sm font-bold mb-2 text-gray-700">Password *</label>
                      <div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition" placeholder="••••••••" required minLength={6} />
                      </div>
                    </div>
                    <div><label className="block text-sm font-bold mb-2 text-gray-700">Confirm Password *</label>
                      <div className="relative"><Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input type="password" value={formData.confirmPassword} onChange={e => setFormData({...formData, confirmPassword: e.target.value})} className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 outline-none transition" placeholder="••••••••" required minLength={6} />
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button type="button" onClick={() => setCurrentStep(2)} className="flex-1 border-2 border-gray-300 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-50 transition">Back</button>
                      <button type="submit" disabled={loading} className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 text-white py-3 rounded-xl font-bold hover:shadow-xl transition-all flex items-center justify-center gap-2">
                        {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Creating...</> : <><CheckCircle className="w-5 h-5" /> Create Account</>}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">Already registered? <Link href="/auth/signin" className="text-blue-600 font-bold hover:underline">Sign In</Link></p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
ENDFILE

echo ""
echo "✅ Email Verification Added!"
echo ""
echo "Features:"
echo "✓ Beautiful success screen after registration"
echo "✓ Email verification instructions"
echo "✓ 3-step onboarding explanation"
echo "✓ Spam folder reminder"
echo "✓ Direct sign-in link"
echo ""
echo "Run: npm run dev"
