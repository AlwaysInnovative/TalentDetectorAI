#!/bin/bash
# Complete Working Sign-in Fix
# Run: bash complete-signin-fix.sh

set -e

echo "🔧 Creating complete working sign-in solution..."

# ==================== WORKING SIGN-IN PAGE ====================

cat > app/auth/signin/page.tsx << 'ENDFILE'
'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import toast from 'react-hot-toast'
import Image from 'next/image'
import { Brain, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const backgroundImages = [
  'photo-1557804506-669a67965ba0',
  'photo-1522071820081-009f0129c71c',
  'photo-1600880292203-757bb62b4baf'
]

export default function SignIn() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [currentBg, setCurrentBg] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBg((prev) => (prev + 1) % backgroundImages.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const supabase = createClient()
      
      // Sign in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      })

      if (signInError) throw signInError

      // Get session to verify
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('No session created')

      toast.success('Welcome back!', { duration: 2000 })

      // Get user role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, full_name')
        .eq('id', session.user.id)
        .single()

      // Determine redirect
      let path = '/dashboard'
      if (profile?.role === 'manager') path = '/dashboard/manager'
      else if (profile?.role === 'agency') path = '/dashboard/agency'
      else if (profile?.role === 'candidate') path = '/dashboard/candidate'

      toast.success(`Welcome back, ${profile?.full_name || 'User'}!`)

      // Hard redirect
      window.location.href = path

    } catch (error: any) {
      console.error('Sign in error:', error)
      toast.error(error.message || 'Sign in failed')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-md">
          <div className="flex items-center gap-2 mb-8">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}>
              <Brain className="w-10 h-10 text-primary-600" />
            </motion.div>
            <span className="text-2xl font-bold text-primary-600">TalentDetector AI</span>
          </div>

          <h1 className="text-4xl font-bold mb-2">Welcome Back</h1>
          <p className="text-gray-600 mb-8">Sign in to continue your journey</p>

          <form onSubmit={handleSignIn} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold mb-2">Email</label>
              <input 
                type="email" 
                value={email} 
                onChange={e => setEmail(e.target.value)}
                className="input" 
                placeholder="you@example.com"
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
                placeholder="Enter your password"
                required 
                minLength={6}
                disabled={loading}
              />
            </div>

            <button 
              type="submit" 
              disabled={loading} 
              className="w-full btn-primary flex items-center justify-center gap-2">
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <p className="text-center mt-6 text-gray-600">
            Don't have an account?{' '}
            <Link href="/auth/signup" className="text-primary-600 font-semibold hover:text-primary-700">
              Create Account
            </Link>
          </p>
        </motion.div>
      </div>

      <div className="hidden lg:block lg:w-1/2 relative overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentBg}
            initial={{ opacity: 0, scale: 1.1, rotate: -5 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.9, rotate: 5 }}
            transition={{ duration: 1 }}
            className="absolute inset-0">
            <Image 
              src={`https://images.unsplash.com/${backgroundImages[currentBg]}?auto=format&fit=crop&w=2850&q=80`}
              alt="Team" 
              fill 
              className="object-cover" 
              priority 
            />
          </motion.div>
        </AnimatePresence>
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/90 to-primary-600/90" />
      </div>
    </div>
  )
}
ENDFILE

# ==================== MINIMAL WORKING MIDDLEWARE ====================

cat > middleware.ts << 'ENDFILE'
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  await supabase.auth.getUser()

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
ENDFILE

# ==================== CREATE DASHBOARD REDIRECT WRAPPER ====================

mkdir -p app/dashboard/agency
cat > app/dashboard/agency/layout.tsx << 'ENDFILE'
'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

export default function AgencyLayout({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    checkAuth()
  }, [])

  async function checkAuth() {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/auth/signin')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile?.role !== 'agency') {
        router.push('/dashboard')
        return
      }

      setLoading(false)
    } catch (error) {
      console.error('Auth check failed:', error)
      router.push('/auth/signin')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return <>{children}</>
}
ENDFILE

# ==================== TEST PAGE TO VERIFY ====================

cat > app/test-auth/page.tsx << 'ENDFILE'
'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle, XCircle, Loader2 } from 'lucide-react'

export default function TestAuth() {
  const [status, setStatus] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    testAuth()
  }, [])

  async function testAuth() {
    try {
      const supabase = createClient()
      
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      let profile = null
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        profile = data
      }

      setStatus({
        user,
        session,
        profile,
        userError,
        sessionError,
        hasUser: !!user,
        hasSession: !!session,
        hasProfile: !!profile
      })
    } catch (error) {
      setStatus({ error: String(error) })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Authentication Test</h1>

        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <div className="flex items-center gap-3">
            {status.hasUser ? <CheckCircle className="text-green-600" /> : <XCircle className="text-red-600" />}
            <span className="font-bold">User: {status.hasUser ? 'Authenticated' : 'Not authenticated'}</span>
          </div>

          <div className="flex items-center gap-3">
            {status.hasSession ? <CheckCircle className="text-green-600" /> : <XCircle className="text-red-600" />}
            <span className="font-bold">Session: {status.hasSession ? 'Active' : 'No session'}</span>
          </div>

          <div className="flex items-center gap-3">
            {status.hasProfile ? <CheckCircle className="text-green-600" /> : <XCircle className="text-red-600" />}
            <span className="font-bold">Profile: {status.hasProfile ? 'Loaded' : 'Not found'}</span>
          </div>

          {status.profile && (
            <div className="mt-6 p-4 bg-blue-50 rounded">
              <h3 className="font-bold mb-2">Profile Data:</h3>
              <pre className="text-sm">{JSON.stringify(status.profile, null, 2)}</pre>
            </div>
          )}

          {status.user && (
            <div className="mt-6 p-4 bg-green-50 rounded">
              <h3 className="font-bold mb-2">User Data:</h3>
              <pre className="text-sm overflow-auto">{JSON.stringify(status.user, null, 2)}</pre>
            </div>
          )}

          {status.error && (
            <div className="mt-6 p-4 bg-red-50 rounded">
              <h3 className="font-bold mb-2 text-red-900">Error:</h3>
              <pre className="text-sm text-red-700">{status.error}</pre>
            </div>
          )}
        </div>

        <div className="mt-6 flex gap-4">
          <button
            onClick={() => window.location.href = '/auth/signin'}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-bold">
            Go to Sign In
          </button>
          <button
            onClick={() => window.location.href = '/dashboard/agency'}
            className="px-6 py-3 bg-green-600 text-white rounded-lg font-bold">
            Go to Agency Dashboard
          </button>
          <button
            onClick={testAuth}
            className="px-6 py-3 bg-gray-600 text-white rounded-lg font-bold">
            Refresh Test
          </button>
        </div>
      </div>
    </div>
  )
}
ENDFILE

echo ""
echo "✅✅✅ COMPLETE WORKING SOLUTION CREATED! ✅✅✅"
echo ""
echo "📁 Files created/updated:"
echo "  1. app/auth/signin/page.tsx - Working sign-in with hard redirect"
echo "  2. middleware.ts - Minimal middleware (just handles cookies)"
echo "  3. app/dashboard/agency/layout.tsx - Auth check wrapper"
echo "  4. app/test-auth/page.tsx - Test page to verify auth"
echo ""
echo "🧪 TESTING STEPS:"
echo ""
echo "1. Run: npm run dev"
echo ""
echo "2. Visit: http://localhost:3000/test-auth"
echo "   This will show you if auth is working"
echo ""
echo "3. Then visit: http://localhost:3000/auth/signin"
echo "   Sign in with your agency credentials"
echo ""
echo "4. After sign in, you should be redirected to /dashboard/agency"
echo ""
echo "📊 What to check on test page:"
echo "   ✓ User: Authenticated"
echo "   ✓ Session: Active"
echo "   ✓ Profile: Loaded"
echo "   Should show your profile with role: 'agency'"
echo ""
echo "If test page shows problems, share the output!"
