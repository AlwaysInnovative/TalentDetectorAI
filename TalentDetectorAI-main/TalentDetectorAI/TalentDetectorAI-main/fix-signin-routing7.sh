#!/bin/bash
# Fix Sign-in Redirect Issue
# Run: bash fix-signin-routing.sh

set -e

echo "🔧 Fixing sign-in redirect and routing..."

# ==================== FIX SIGN-IN PAGE WITH PROPER REDIRECT ====================

cat > app/auth/signin/page.tsx << 'ENDFILE'
'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
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
  const router = useRouter()

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
      
      // Sign in
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        console.error('❌ Auth error:', authError)
        throw authError
      }
      
      if (!authData.user) {
        console.error('❌ No user returned')
        throw new Error('No user returned')
      }

      console.log('✅ Auth successful, user ID:', authData.user.id)
      toast.success('✅ Signed in successfully!', { duration: 2000 })

      // Get user profile
      console.log('📋 Fetching user profile...')
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, full_name')
        .eq('id', authData.user.id)
        .single()

      if (profileError) {
        console.error('❌ Profile error:', profileError)
        console.log('⚠️  Redirecting to default dashboard')
        window.location.href = '/dashboard'
        return
      }

      console.log('✅ Profile loaded:', { role: profile.role, name: profile.full_name })
      toast.success(`Welcome back, ${profile.full_name}!`, { duration: 2000 })

      // Redirect based on role
      let redirectPath = '/dashboard'
      
      if (profile.role === 'manager') {
        redirectPath = '/dashboard/manager'
        console.log('🎯 Redirecting to manager dashboard')
      } else if (profile.role === 'agency') {
        redirectPath = '/dashboard/agency'
        console.log('🎯 Redirecting to agency dashboard')
      } else if (profile.role === 'candidate') {
        redirectPath = '/dashboard/candidate'
        console.log('🎯 Redirecting to candidate dashboard')
      }

      console.log('🚀 Performing redirect to:', redirectPath)
      
      // Use window.location for hard redirect
      setTimeout(() => {
        window.location.href = redirectPath
      }, 500)

    } catch (error: any) {
      console.error('❌ Sign in error:', error)
      toast.error(error.message || 'Failed to sign in')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Sign In Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          className="w-full max-w-md">
          
          {/* Logo */}
          <div className="flex items-center gap-2 mb-8">
            <motion.div 
              animate={{ rotate: 360 }} 
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}>
              <Brain className="w-10 h-10 text-primary-600" />
            </motion.div>
            <span className="text-2xl font-bold text-primary-600">TalentDetector AI</span>
          </div>

          {/* Header */}
          <h1 className="text-4xl font-bold mb-2">Welcome Back</h1>
          <p className="text-gray-600 mb-8">Sign in to continue your journey</p>

          {/* Form */}
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

          {/* Footer */}
          <p className="text-center mt-6 text-gray-600">
            Don't have an account?{' '}
            <Link href="/auth/signup" className="text-primary-600 font-semibold hover:text-primary-700">
              Create Account
            </Link>
          </p>
        </motion.div>
      </div>

      {/* Right Side - Animated Background Images */}
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

# ==================== SIMPLIFY MIDDLEWARE ====================

cat > middleware.ts << 'ENDFILE'
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
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
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Protect dashboard routes - redirect to signin if not authenticated
  if (request.nextUrl.pathname.startsWith('/dashboard') && !user) {
    const redirectUrl = new URL('/auth/signin', request.url)
    return NextResponse.redirect(redirectUrl)
  }

  // Allow all other requests
  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
ENDFILE

echo ""
echo "✅✅✅ SIGN-IN ROUTING FIXED! ✅✅✅"
echo ""
echo "Changes made:"
echo ""
echo "1. SIGN-IN PAGE:"
echo "   ✓ Added detailed console logging"
echo "   ✓ Changed to window.location.href (hard redirect)"
echo "   ✓ Added 500ms delay before redirect"
echo "   ✓ Better error handling"
echo "   ✓ Loading state on inputs"
echo ""
echo "2. MIDDLEWARE:"
echo "   ✓ Simplified - only protects dashboard routes"
echo "   ✓ Removed conflicting redirects"
echo "   ✓ Lets sign-in page handle routing"
echo ""
echo "3. DEBUGGING:"
echo "   ✓ Check browser console for logs"
echo "   ✓ Look for: 🔐 🎯 ✅ ❌ emojis"
echo "   ✓ Shows exact redirect path"
echo ""
echo "Run: npm run dev"
echo ""
echo "Then:"
echo "1. Sign in as agency"
echo "2. Check browser console"
echo "3. Look for: '🎯 Redirecting to agency dashboard'"
echo "4. Should redirect to /dashboard/agency"
echo ""
echo "If still not working, share console output!"
