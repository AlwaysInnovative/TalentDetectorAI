#!/bin/bash
# Fix Role-Based Routing for All User Types
# Run: bash fix-role-routing.sh

set -e

echo "🔧 Fixing role-based authentication routing..."

# ==================== UPDATE AUTH CALLBACK ====================

cat > app/auth/callback/route.ts << 'ENDFILE'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const origin = requestUrl.origin

  if (code) {
    const supabase = createClient()
    await supabase.auth.exchangeCodeForSession(code)
    
    // Get user and their profile
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      // Get user's role from profiles table
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, is_admin')
        .eq('id', user.id)
        .single()
      
      // Redirect based on role
      let redirectPath = '/dashboard'
      
      if (profile?.is_admin) {
        redirectPath = '/dashboard/admin'
      } else if (profile?.role === 'manager') {
        redirectPath = '/dashboard/manager'
      } else if (profile?.role === 'agency') {
        redirectPath = '/dashboard/agency'
      } else if (profile?.role === 'candidate') {
        redirectPath = '/dashboard/candidate'
      }
      
      return NextResponse.redirect(`${origin}${redirectPath}`)
    }
  }

  // Return to home if something went wrong
  return NextResponse.redirect(`${origin}/`)
}
ENDFILE

# ==================== CREATE MIDDLEWARE FOR ROLE PROTECTION ====================

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
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: any) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Protect dashboard routes
  if (request.nextUrl.pathname.startsWith('/dashboard')) {
    if (!user) {
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }

    // Get user role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_admin')
      .eq('id', user.id)
      .single()

    const path = request.nextUrl.pathname

    // Role-based access control
    if (path.startsWith('/dashboard/admin') && !profile?.is_admin) {
      return NextResponse.redirect(new URL(`/dashboard/${profile?.role || 'candidate'}`, request.url))
    }

    if (path.startsWith('/dashboard/manager') && profile?.role !== 'manager' && !profile?.is_admin) {
      return NextResponse.redirect(new URL(`/dashboard/${profile?.role || 'candidate'}`, request.url))
    }

    if (path.startsWith('/dashboard/agency') && profile?.role !== 'agency' && !profile?.is_admin) {
      return NextResponse.redirect(new URL(`/dashboard/${profile?.role || 'candidate'}`, request.url))
    }

    if (path.startsWith('/dashboard/candidate') && profile?.role !== 'candidate' && !profile?.is_admin) {
      return NextResponse.redirect(new URL(`/dashboard/${profile?.role || 'manager'}`, request.url))
    }

    // Redirect base /dashboard to role-specific dashboard
    if (path === '/dashboard') {
      if (profile?.is_admin) {
        return NextResponse.redirect(new URL('/dashboard/admin', request.url))
      }
      return NextResponse.redirect(new URL(`/dashboard/${profile?.role || 'candidate'}`, request.url))
    }
  }

  return response
}

export const config = {
  matcher: ['/dashboard/:path*']
}
ENDFILE

# ==================== UPDATE REGISTRATION TO SET ROLE ====================

cat > app/auth/register/candidate/page.tsx << 'ENDFILE'
'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { User, Mail, Lock, Loader2 } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'

export default function CandidateRegister() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [loading, setLoading] = useState(false)
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
      
      // Sign up the user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password
      })

      if (authError) throw authError
      if (!authData.user) throw new Error('Registration failed')

      // Create profile with candidate role
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          email: formData.email,
          full_name: formData.fullName,
          role: 'candidate'
        })

      if (profileError) throw profileError

      // Create candidate record
      const { error: candidateError } = await supabase
        .from('candidates')
        .insert({
          user_id: authData.user.id,
          name: formData.fullName,
          email: formData.email
        })

      if (candidateError) throw candidateError

      toast.success('✅ Registration successful!')
      router.push('/dashboard/candidate')
    } catch (error: any) {
      console.error('Registration error:', error)
      toast.error(error.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Join as Candidate
          </h1>
          <p className="text-gray-600">Start your career journey</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2">Full Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={formData.fullName}
                onChange={e => setFormData({...formData, fullName: e.target.value})}
                className="input pl-10"
                placeholder="John Doe"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
                className="input pl-10"
                placeholder="john@example.com"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="password"
                value={formData.password}
                onChange={e => setFormData({...formData, password: e.target.value})}
                className="input pl-10"
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Confirm Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="password"
                value={formData.confirmPassword}
                onChange={e => setFormData({...formData, confirmPassword: e.target.value})}
                className="input pl-10"
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-bold hover:opacity-90 transition flex items-center justify-center gap-2">
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Creating account...
              </>
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        <p className="text-center text-sm text-gray-600 mt-6">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-primary-600 font-semibold hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  )
}
ENDFILE

# ==================== UPDATE LOGIN TO REDIRECT BASED ON ROLE ====================

cat > app/auth/login/page.tsx << 'ENDFILE'
'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Mail, Lock, Loader2 } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const supabase = createClient()
      
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (authError) throw authError
      if (!authData.user) throw new Error('Login failed')

      // Get user role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, is_admin')
        .eq('id', authData.user.id)
        .single()

      toast.success('✅ Welcome back!')

      // Redirect based on role
      if (profile?.is_admin) {
        router.push('/dashboard/admin')
      } else if (profile?.role === 'manager') {
        router.push('/dashboard/manager')
      } else if (profile?.role === 'agency') {
        router.push('/dashboard/agency')
      } else if (profile?.role === 'candidate') {
        router.push('/dashboard/candidate')
      } else {
        router.push('/dashboard')
      }
    } catch (error: any) {
      console.error('Login error:', error)
      toast.error(error.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Welcome Back
          </h1>
          <p className="text-gray-600">Sign in to your account</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="input pl-10"
                placeholder="your@email.com"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="input pl-10"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-bold hover:opacity-90 transition flex items-center justify-center gap-2">
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

        <div className="mt-6 text-center space-y-2">
          <p className="text-sm text-gray-600">
            Don't have an account?{' '}
            <Link href="/auth/register/candidate" className="text-primary-600 font-semibold hover:underline">
              Sign Up as Candidate
            </Link>
          </p>
          <p className="text-sm text-gray-600">
            <Link href="/auth/register/manager" className="text-blue-600 font-semibold hover:underline">
              Register as Hiring Manager
            </Link>
            {' • '}
            <Link href="/auth/register/agency" className="text-emerald-600 font-semibold hover:underline">
              Register as Agency
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
ENDFILE

echo ""
echo "✅ Role-Based Routing Fixed!"
echo ""
echo "Changes made:"
echo "1. ✓ Fixed auth callback to redirect based on role"
echo "2. ✓ Added middleware for role protection"
echo "3. ✓ Updated registration to set correct role"
echo "4. ✓ Updated login to redirect to correct dashboard"
echo ""
echo "Role-to-Dashboard mapping:"
echo "- Admin → /dashboard/admin"
echo "- Manager → /dashboard/manager"
echo "- Agency → /dashboard/agency"
echo "- Candidate → /dashboard/candidate"
echo ""
echo "🚀 Restart server:"
echo "npm run dev"
echo ""
echo "Now candidates will correctly go to /dashboard/candidate!"
#!/bin/bash
# Fix Complete Signup Flow for All Roles
# Run: bash fix-signup.sh

set -e

echo "🔧 Fixing signup flow..."

# ==================== CANDIDATE REGISTRATION ====================

cat > app/auth/register/candidate/page.tsx << 'ENDFILE'
'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { User, Mail, Lock, Loader2 } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'

export default function CandidateRegister() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [loading, setLoading] = useState(false)
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
      
      console.log('Starting registration for:', formData.email)
      
      // 1. Sign up the user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            role: 'candidate'
          }
        }
      })

      if (authError) {
        console.error('Auth error:', authError)
        throw authError
      }
      
      if (!authData.user) {
        throw new Error('Registration failed - no user returned')
      }

      console.log('User created:', authData.user.id)

      // 2. Create profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          email: formData.email,
          full_name: formData.fullName,
          role: 'candidate'
        })

      if (profileError) {
        console.error('Profile error:', profileError)
        throw profileError
      }

      console.log('Profile created')

      // 3. Create candidate record
      const { error: candidateError } = await supabase
        .from('candidates')
        .insert({
          user_id: authData.user.id,
          name: formData.fullName,
          email: formData.email
        })

      if (candidateError) {
        console.error('Candidate error:', candidateError)
        throw candidateError
      }

      console.log('Candidate record created')

      toast.success('✅ Registration successful! Please check your email to verify.')
      
      // Wait a bit for everything to process
      setTimeout(() => {
        router.push('/dashboard/candidate')
      }, 1000)
    } catch (error: any) {
      console.error('Registration error:', error)
      toast.error(error.message || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Join as Candidate
          </h1>
          <p className="text-gray-600">Start your career journey</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2">Full Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={formData.fullName}
                onChange={e => setFormData({...formData, fullName: e.target.value})}
                className="input pl-10"
                placeholder="John Doe"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
                className="input pl-10"
                placeholder="john@example.com"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="password"
                value={formData.password}
                onChange={e => setFormData({...formData, password: e.target.value})}
                className="input pl-10"
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Confirm Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="password"
                value={formData.confirmPassword}
                onChange={e => setFormData({...formData, confirmPassword: e.target.value})}
                className="input pl-10"
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-bold hover:opacity-90 transition flex items-center justify-center gap-2">
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Creating account...
              </>
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        <p className="text-center text-sm text-gray-600 mt-6">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-primary-600 font-semibold hover:underline">
            Sign In
          </Link>
        </p>
        
        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500">Or register as:</p>
          <div className="flex gap-2 justify-center mt-2">
            <Link href="/auth/register/manager" className="text-xs text-blue-600 hover:underline">
              Hiring Manager
            </Link>
            <span className="text-gray-400">•</span>
            <Link href="/auth/register/agency" className="text-xs text-emerald-600 hover:underline">
              Agency
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
ENDFILE

# ==================== MANAGER REGISTRATION ====================

cat > app/auth/register/manager/page.tsx << 'ENDFILE'
'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { User, Mail, Lock, Loader2, Building } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'

export default function ManagerRegister() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    company: '',
    password: '',
    confirmPassword: ''
  })
  const [loading, setLoading] = useState(false)
  const router = useRouter()

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
          data: {
            full_name: formData.fullName,
            role: 'manager'
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
          role: 'manager',
          company: formData.company
        })

      if (profileError) throw profileError

      toast.success('✅ Registration successful!')
      router.push('/dashboard/manager')
    } catch (error: any) {
      toast.error(error.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-emerald-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-emerald-600 bg-clip-text text-transparent mb-2">
            Join as Hiring Manager
          </h1>
          <p className="text-gray-600">Post jobs and find talent</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2">Full Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={formData.fullName}
                onChange={e => setFormData({...formData, fullName: e.target.value})}
                className="input pl-10"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Company</label>
            <div className="relative">
              <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={formData.company}
                onChange={e => setFormData({...formData, company: e.target.value})}
                className="input pl-10"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
                className="input pl-10"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="password"
                value={formData.password}
                onChange={e => setFormData({...formData, password: e.target.value})}
                className="input pl-10"
                required
                minLength={6}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Confirm Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="password"
                value={formData.confirmPassword}
                onChange={e => setFormData({...formData, confirmPassword: e.target.value})}
                className="input pl-10"
                required
                minLength={6}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-emerald-600 text-white py-3 rounded-xl font-bold hover:opacity-90 transition flex items-center justify-center gap-2">
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Creating account...
              </>
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        <p className="text-center text-sm text-gray-600 mt-6">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-primary-600 font-semibold hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  )
}
ENDFILE

# ==================== ENSURE PROFILES TABLE HAS COMPANY COLUMN ====================

cat > supabase/migrations/$(date +%Y%m%d%H%M%S)_add_company_to_profiles.sql << 'ENDFILE'
-- Add company column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS company TEXT;
ENDFILE

echo ""
echo "✅ Signup flow fixed!"
echo ""
echo "Run these commands:"
echo "1. npx supabase db push"
echo "2. npm run dev"
echo ""
echo "Then try signing up at:"
echo "- Candidate: /auth/register/candidate"
echo "- Manager: /auth/register/manager"
echo "- Agency: /auth/register/agency"

