'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { User, Mail, Lock, Loader2, ArrowRight, CheckCircle, Briefcase, Award, TrendingUp, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'

export default function CandidateRegister() {
  const [formData, setFormData] = useState({ fullName: '', email: '', password: '', confirmPassword: '' })
  const [loading, setLoading] = useState(false)
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
        options: { data: { full_name: formData.fullName, role: 'candidate' }, emailRedirectTo: `${window.location.origin}/auth/signin` }
      })
      if (authError) throw authError
      await supabase.from('profiles').insert({ id: authData.user!.id, email: formData.email, full_name: formData.fullName, role: 'candidate' })
      setShowSuccess(true)
    } catch (error: any) {
      toast.error(error.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 to-cyan-900 flex items-center justify-center p-4">
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
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-cyan-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-10 max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4"><User className="w-10 h-10 text-white" /></div>
          <h2 className="text-3xl font-bold mb-2">Join as Candidate</h2>
          <p className="text-gray-600">Find your dream job</p>
        </div>
        <form onSubmit={handleRegister} className="space-y-4">
          <div><label className="block text-sm font-bold mb-2">Full Name *</label>
            <input type="text" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} className="input" placeholder="John Doe" required /></div>
          <div><label className="block text-sm font-bold mb-2">Email *</label>
            <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="input" placeholder="john@email.com" required /></div>
          <div><label className="block text-sm font-bold mb-2">Password *</label>
            <input type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="input" placeholder="••••••••" required minLength={6} /></div>
          <div><label className="block text-sm font-bold mb-2">Confirm Password *</label>
            <input type="password" value={formData.confirmPassword} onChange={e => setFormData({...formData, confirmPassword: e.target.value})} className="input" placeholder="••••••••" required minLength={6} /></div>
          <button type="submit" disabled={loading} className="w-full btn-primary">{loading ? 'Creating...' : 'Create Account'}</button>
        </form>
        <p className="text-center text-sm text-gray-600 mt-6">Already registered? <Link href="/auth/signin" className="text-blue-600 font-bold hover:underline">Sign In</Link></p>
      </div>
    </div>
  )
}
