#!/bin/bash
# Match Sign-in Theme to Sign-up
# Run: bash match-signin-signup-theme.sh

set -e

echo "🎨 Updating sign-in theme to match sign-up..."

cat > app/auth/signin/page.tsx << 'ENDFILE'
'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Mail, Lock, Loader2, Sparkles, ArrowRight, Users, Briefcase, UserCheck } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'

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
      
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) throw authError
      if (!authData.user) throw new Error('No user returned')

      toast.success('✅ Welcome back!', { duration: 3000 })

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, full_name')
        .eq('id', authData.user.id)
        .single()

      if (profileError) {
        router.push('/dashboard')
        router.refresh()
        return
      }

      toast.success(`Welcome back, ${profile.full_name}!`, { duration: 3000 })

      if (profile.role === 'manager') {
        router.push('/dashboard/manager')
      } else if (profile.role === 'agency') {
        router.push('/dashboard/agency')
      } else if (profile.role === 'candidate') {
        router.push('/dashboard/candidate')
      } else {
        router.push('/dashboard')
      }
      
      router.refresh()

    } catch (error: any) {
      console.error('Sign in error:', error)
      toast.error(error.message || 'Failed to sign in')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated Background - Same as Sign-up */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-0 left-0 w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl animate-blob" />
          <div className="absolute top-0 right-0 w-96 h-96 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000" />
          <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-pink-400 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000" />
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-6xl grid md:grid-cols-2 gap-8 items-center">
          {/* Left Side - Branding */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="text-white hidden md:block">
            <div className="flex items-center gap-3 mb-8">
              <Sparkles className="w-16 h-16" />
              <h1 className="text-5xl font-bold">TalentDetector AI</h1>
            </div>
            
            <h2 className="text-4xl font-bold mb-6">Welcome Back!</h2>
            <p className="text-xl mb-8 text-blue-100">
              Sign in to continue your recruitment journey with AI-powered talent matching
            </p>

            <div className="space-y-4">
              <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <Briefcase className="w-8 h-8 flex-shrink-0" />
                <div>
                  <h3 className="font-bold text-lg">For Hiring Managers</h3>
                  <p className="text-sm text-blue-100">Post jobs, manage applications, track progress</p>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <Users className="w-8 h-8 flex-shrink-0" />
                <div>
                  <h3 className="font-bold text-lg">For Agencies</h3>
                  <p className="text-sm text-blue-100">Find candidates, earn commissions, grow business</p>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <UserCheck className="w-8 h-8 flex-shrink-0" />
                <div>
                  <h3 className="font-bold text-lg">For Candidates</h3>
                  <p className="text-sm text-blue-100">Discover opportunities, get matched with jobs</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right Side - Sign In Form */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="w-full">
            
            {/* Mobile Logo */}
            <div className="md:hidden text-center mb-8">
              <div className="flex items-center justify-center gap-3 mb-4">
                <Sparkles className="w-12 h-12 text-white" />
                <h1 className="text-3xl font-bold text-white">TalentDetector</h1>
              </div>
            </div>

            <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-10">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">Sign In</h2>
                <p className="text-gray-600">Access your account</p>
              </div>

              <form onSubmit={handleSignIn} className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition text-lg"
                      placeholder="you@example.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition text-lg"
                      placeholder="Enter your password"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white py-4 rounded-xl font-bold text-lg hover:shadow-2xl hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2">
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

              <div className="mt-8 pt-8 border-t border-gray-200">
                <p className="text-center text-gray-600">
                  Don't have an account?{' '}
                  <Link 
                    href="/auth/signup" 
                    className="text-blue-600 font-bold hover:text-purple-600 transition">
                    Create Account
                  </Link>
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <style jsx>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  )
}
ENDFILE

echo ""
echo "✅✅✅ SIGN-IN THEME UPDATED! ✅✅✅"
echo ""
echo "Matching features from sign-up:"
echo "✓ Animated gradient background (blue/purple/pink)"
echo "✓ Floating blob animations"
echo "✓ Two-column layout (branding + form)"
echo "✓ Feature cards on left side"
echo "✓ White card with rounded corners"
echo "✓ Gradient button"
echo "✓ Same color scheme"
echo "✓ Responsive mobile design"
echo "✓ Smooth animations"
echo ""
echo "Run: npm run dev"
echo ""
echo "Sign-in now matches sign-up perfectly! 🎨✨"
