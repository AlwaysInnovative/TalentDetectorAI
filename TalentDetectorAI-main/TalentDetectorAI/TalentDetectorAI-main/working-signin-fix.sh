#!/bin/bash
# Final Working Sign-in Fix
# Run: bash working-signin-fix.sh

set -e

echo "🔧 Creating working sign-in solution..."

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
      
      console.log('🔐 Starting sign in for:', email)
      
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      })

      if (signInError) {
        console.error('❌ Auth error:', signInError)
        throw signInError
      }

      console.log('✅ Auth successful')

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        console.error('❌ No session')
        throw new Error('No session created')
      }

      console.log('✅ Session created for user:', session.user.id)
      toast.success('Welcome back!', { duration: 2000 })

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, full_name')
        .eq('id', session.user.id)
        .single()

      if (profileError) {
        console.error('⚠️ Profile error:', profileError)
      }

      console.log('👤 Profile:', profile)

      let path = '/dashboard'
      if (profile?.role === 'manager') path = '/dashboard/manager'
      else if (profile?.role === 'agency') path = '/dashboard/agency'
      else if (profile?.role === 'candidate') path = '/dashboard/candidate'

      console.log('🎯 Redirecting to:', path)

      toast.success(`Welcome, ${profile?.full_name || 'User'}!`)

      setTimeout(() => {
        console.log('🚀 Executing redirect...')
        window.location.href = path
      }, 500)

    } catch (error: any) {
      console.error('❌ Error:', error)
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

# ==================== MINIMAL MIDDLEWARE ====================

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

# ==================== AGENCY LAYOUT ====================

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

echo ""
echo "✅ SIGN-IN FIX COMPLETE!"
echo ""
echo "Files updated:"
echo "  ✓ app/auth/signin/page.tsx"
echo "  ✓ middleware.ts"  
echo "  ✓ app/dashboard/agency/layout.tsx"
echo ""
echo "Now:"
echo "  1. Run: npm run dev"
echo "  2. Go to /auth/signin"
echo "  3. Open console (F12)"
echo "  4. Sign in and watch logs"
echo ""
