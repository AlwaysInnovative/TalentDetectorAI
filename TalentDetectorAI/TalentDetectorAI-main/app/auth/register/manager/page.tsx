'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Briefcase, Mail, Lock, User, Loader2, ArrowRight, CheckCircle, Building2, TrendingUp, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'

export default function ManagerRegister() {
  const [formData, setFormData] = useState({ fullName: '', company: '', email: '', password: '', confirmPassword: '' })
  const [loading, setLoading] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [showSuccess, setShowSuccess] = useState(false)

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: { full_name: formData.fullName, role: 'hiring_manager' },
          emailRedirectTo: `${window.location.origin}/auth/signin`
        }
      })
      if (authError) throw authError
      await supabase.from('profiles').insert({
        id: authData.user!.id,
        email: formData.email,
        full_name: formData.fullName,
        company: formData.company,
        role: 'hiring_manager'
      })
      setShowSuccess(true)
    } catch (error: any) {
      toast.error(error.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const steps = [ { number: 1, title: 'Personal Info', icon: User }, { number: 2, title: 'Company', icon: Building2 }, { number: 3, title: 'Security', icon: Lock } ]

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-900 to-green-900 flex items-center justify-center p-4">
        <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="bg-white rounded-3xl p-12 max-w-2xl text-center">
          <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6"><CheckCircle className="w-14 h-14 text-white" /></div>
          <h1 className="text-4xl font-bold mb-4">Welcome! 🎉</h1>
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6 mb-6">
            <p className="text-sm text-blue-800 mb-2">Verification email sent to:</p>
            <p className="font-bold text-blue-600">{formData.email}</p>
          </div>
          <Link href="/auth/signin"><button className="btn-primary">Go to Sign In <ArrowRight className="w-5 h-5 inline" /></button></Link>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-900 to-green-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-10 max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4"><Briefcase className="w-10 h-10 text-white" /></div>
          <h2 className="text-3xl font-bold mb-2">Create Manager Account</h2>
          <p className="text-gray-600">Start posting jobs</p>
        </div>
        <form onSubmit={handleRegister} className="space-y-4">
          <AnimatePresence mode="wait">
            {currentStep === 1 && (
              <motion.div key="1" initial={{ x: 20 }} animate={{ x: 0 }} exit={{ x: -20 }}>
                <input type="text" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} className="input" placeholder="Full Name" required />
                <button type="button" onClick={() => formData.fullName && setCurrentStep(2)} className="w-full btn-primary mt-4">Continue</button>
              </motion.div>
            )}
            {currentStep === 2 && (
              <motion.div key="2" initial={{ x: 20 }} animate={{ x: 0 }} exit={{ x: -20 }}>
                <input type="text" value={formData.company} onChange={e => setFormData({...formData, company: e.target.value})} className="input" placeholder="Company Name" required />
                <div className="flex gap-2 mt-4">
                  <button type="button" onClick={() => setCurrentStep(1)} className="flex-1 btn-secondary">Back</button>
                  <button type="button" onClick={() => formData.company && setCurrentStep(3)} className="flex-1 btn-primary">Continue</button>
                </div>
              </motion.div>
            )}
            {currentStep === 3 && (
              <motion.div key="3" initial={{ x: 20 }} animate={{ x: 0 }} exit={{ x: -20 }} className="space-y-4">
                <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="input" placeholder="Email" required />
                <input type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="input" placeholder="Password" required minLength={6} />
                <input type="password" value={formData.confirmPassword} onChange={e => setFormData({...formData, confirmPassword: e.target.value})} className="input" placeholder="Confirm Password" required minLength={6} />
                <div className="flex gap-2">
                  <button type="button" onClick={() => setCurrentStep(2)} className="flex-1 btn-secondary">Back</button>
                  <button type="submit" disabled={loading} className="flex-1 btn-primary">{loading ? 'Creating...' : 'Create Account'}</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </form>
        <p className="text-center text-sm text-gray-600 mt-6">Already registered? <Link href="/auth/signin" className="text-emerald-600 font-bold hover:underline">Sign In</Link></p>
      </div>
    </div>
  )
}
