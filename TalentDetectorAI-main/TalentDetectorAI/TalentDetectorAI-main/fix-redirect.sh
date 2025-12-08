#!/bin/bash
# TalentDetector AI - Fixed Redirect Issue
# Run: bash fix-redirect.sh

set -e

echo "🚀 Fixing redirect issue..."

cat > app/auth/signin/page.tsx << 'ENDFILE'
'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import Image from 'next/image'
import { Brain } from 'lucide-react'

export default function SignIn() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    
    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      
      if (error) {
        console.error('Auth error:', error)
        throw error
      }

      if (!data.user) {
        throw new Error('No user data returned')
      }
      
      const role = data.user.user_metadata?.role || 'manager'
      console.log('User role:', role)
      
      toast.success('Welcome back!')
      
      // Direct navigation based on role
      let targetPath = '/dashboard/manager'
      
      if (role === 'agency') targetPath = '/dashboard/agency'
      else if (role === 'candidate') targetPath = '/dashboard/candidate'
      else if (role === 'admin') targetPath = '/dashboard/admin'
      
      console.log('Redirecting to:', targetPath)
      
      // Use window.location for guaranteed redirect
      setTimeout(() => {
        window.location.href = targetPath
      }, 1000)
      
    } catch (error: any) {
      console.error('Sign in error:', error)
      toast.error(error.message || 'Sign in failed')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-2 mb-8">
            <Brain className="w-10 h-10 text-primary-600" />
            <span className="text-2xl font-bold text-primary-600">TalentDetector AI</span>
          </div>
          <h1 className="text-4xl font-bold mb-2">Welcome Back</h1>
          <p className="text-gray-600 mb-8">Sign in to continue</p>

          <form onSubmit={handleSignIn} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold mb-2">Email</label>
              <input 
                type="email" 
                value={email} 
                onChange={e => setEmail(e.target.value)}
                className="input" 
                placeholder="you@company.com" 
                required 
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Password</label>
              <input 
                type="password" 
                value={password} 
                onChange={e => setPassword(e.target.value)}
                className="input" 
                placeholder="••••••••" 
                required 
                disabled={loading}
              />
            </div>
            <button type="submit" disabled={loading} className="w-full btn-primary">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                  Signing in...
                </span>
              ) : 'Sign In'}
            </button>
          </form>

          <p className="text-center mt-6 text-gray-600">
            Don't have an account?{' '}
            <Link href="/auth/signup" className="text-primary-600 font-semibold hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>

      <div className="hidden lg:block lg:w-1/2 relative">
        <Image 
          src="https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=2850&q=80" 
          alt="Office" 
          fill 
          className="object-cover" 
        />
        <div className="absolute inset-0 bg-gradient-to-br from-primary-600/90 to-emerald-600/90" />
      </div>
    </div>
  )
}
ENDFILE

cat > app/auth/signup/page.tsx << 'ENDFILE'
'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import Image from 'next/image'
import { Brain } from 'lucide-react'

export default function SignUp() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState('manager')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    
    try {
      const supabase = createClient()
      const { data, error } = await supabase.auth.signUp({
        email, 
        password, 
        options: { 
          data: { name, role },
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      })
      
      if (error) throw error
      
      toast.success('Account created! Please check your email to verify.')
      
      setTimeout(() => {
        router.push('/auth/signin')
      }, 2000)
      
    } catch (error: any) {
      console.error('Sign up error:', error)
      toast.error(error.message || 'Sign up failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-2 mb-8">
            <Brain className="w-10 h-10 text-primary-600" />
            <span className="text-2xl font-bold text-primary-600">TalentDetector AI</span>
          </div>
          <h1 className="text-4xl font-bold mb-2">Create Account</h1>
          <p className="text-gray-600 mb-8">Get started today</p>

          <form onSubmit={handleSignUp} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold mb-2">Full Name</label>
              <input 
                type="text" 
                value={name} 
                onChange={e => setName(e.target.value)}
                className="input" 
                placeholder="John Doe"
                required 
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Email</label>
              <input 
                type="email" 
                value={email} 
                onChange={e => setEmail(e.target.value)}
                className="input" 
                placeholder="you@company.com"
                required 
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Password</label>
              <input 
                type="password" 
                value={password} 
                onChange={e => setPassword(e.target.value)}
                className="input" 
                placeholder="••••••••"
                required 
                minLength={6}
                disabled={loading}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">I am a</label>
              <select 
                value={role} 
                onChange={e => setRole(e.target.value)} 
                className="input"
                disabled={loading}>
                <option value="manager">Hiring Manager</option>
                <option value="agency">Recruitment Agency</option>
                <option value="candidate">Job Candidate</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <button type="submit" disabled={loading} className="w-full btn-primary">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                  Creating Account...
                </span>
              ) : 'Create Account'}
            </button>
          </form>

          <p className="text-center mt-6 text-gray-600">
            Already have an account?{' '}
            <Link href="/auth/signin" className="text-primary-600 font-semibold hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>

      <div className="hidden lg:block lg:w-1/2 relative">
        <Image 
          src="https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=2850&q=80" 
          alt="Team" 
          fill 
          className="object-cover" 
        />
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/90 to-primary-600/90" />
      </div>
    </div>
  )
}
ENDFILE

echo "✅ Redirect fix applied!"
echo ""
echo "Changes made:"
echo "1. Added console.log for debugging"
echo "2. Changed to window.location.href for guaranteed redirect"
echo "3. Increased timeout to 1 second"
echo "4. Added better error handling"
echo ""
echo "Test it now and check browser console for any errors"
