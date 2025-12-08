#!/bin/bash
# Fix Sign-in Redirect
# Run: bash fix-signin-redirect.sh

set -e

echo "🔧 Fixing sign-in redirect..."

cat > app/auth/signin/page.tsx << 'ENDFILE'
'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Mail, Lock, Loader2, Sparkles, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'

export default function SignInPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const supabase = createClient()
      
      // Sign in
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) throw authError

      if (!authData.user) {
        throw new Error('No user returned')
      }

      toast.success('✅ Welcome back!', { duration: 3000 })

      // Get user profile to determine role
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, full_name')
        .eq('id', authData.user.id)
        .single()

      if (profileError) {
        console.error('Profile fetch error:', profileError)
        // Default redirect if no profile
        router.push('/dashboard')
        router.refresh()
        return
      }

      // Redirect based on role
      if (profile.role === 'manager') {
        toast.success(`Welcome back, ${profile.full_name}!`, { duration: 3000 })
        router.push('/dashboard/manager')
        router.refresh()
      } else if (profile.role === 'agency') {
        toast.success(`Welcome back, ${profile.full_name}!`, { duration: 3000 })
        router.push('/dashboard/agency')
        router.refresh()
      } else if (profile.role === 'candidate') {
        toast.success(`Welcome back, ${profile.full_name}!`, { duration: 3000 })
        router.push('/dashboard/candidate')
        router.refresh()
      } else {
        // Fallback
        router.push('/dashboard')
        router.refresh()
      }

    } catch (error: any) {
      console.error('Sign in error:', error)
      toast.error(error.message || 'Failed to sign in')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Sparkles className="w-12 h-12 text-blue-600" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              TalentDetector
            </h1>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome Back</h2>
          <p className="text-gray-600">Sign in to your account</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <form onSubmit={handleSignIn} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-xl font-bold text-lg hover:shadow-xl transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {loading ? (
                <>
                  <Loader2 className="w-6 h-6 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Don't have an account?{' '}
              <Link href="/auth/signup" className="text-blue-600 font-bold hover:text-blue-700">
                Sign Up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
ENDFILE

echo "✅ Sign-in page updated!"

# Also fix the middleware to not interfere with redirects

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

  // Protect dashboard routes
  if (request.nextUrl.pathname.startsWith('/dashboard') && !user) {
    const redirectUrl = new URL('/auth/signin', request.url)
    return NextResponse.redirect(redirectUrl)
  }

  // Don't redirect if already on correct dashboard
  if (user && request.nextUrl.pathname.startsWith('/dashboard')) {
    return supabaseResponse
  }

  // Redirect authenticated users away from auth pages
  if (user && request.nextUrl.pathname.startsWith('/auth')) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role === 'manager') {
      return NextResponse.redirect(new URL('/dashboard/manager', request.url))
    } else if (profile?.role === 'agency') {
      return NextResponse.redirect(new URL('/dashboard/agency', request.url))
    } else if (profile?.role === 'candidate') {
      return NextResponse.redirect(new URL('/dashboard/candidate', request.url))
    }
    
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
ENDFILE

echo "✅ Middleware updated!"

echo ""
echo "✅✅✅ SIGN-IN REDIRECT FIXED! ✅✅✅"
echo ""
echo "Changes:"
echo "✓ Added router.push() after successful auth"
echo "✓ Added router.refresh() to reload page"
echo "✓ Role-based redirect (manager/agency/candidate)"
echo "✓ Fixed middleware to allow redirects"
echo "✓ Better error handling"
echo ""
echo "Flow:"
echo "1. User signs in"
echo "2. Auth successful ✅"
echo "3. Fetch user profile & role"
echo "4. Redirect to correct dashboard"
echo "5. Page refreshes with new session"
echo ""
echo "Run: npm run dev"
echo ""
echo "Now sign in will redirect you to the right dashboard! 🎯"
