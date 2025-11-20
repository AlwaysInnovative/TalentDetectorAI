#!/bin/bash
# Match Sign-in to Sign-up Theme (No Purple)
# Run: bash match-signin-to-signup.sh

set -e

echo "🎨 Matching sign-in theme to sign-up..."

cat > app/auth/signin/page.tsx << 'ENDFILE'
'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import Image from 'next/image'
import { Brain } from 'lucide-react'
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
              />
            </div>

            <button 
              type="submit" 
              disabled={loading} 
              className="w-full btn-primary">
              {loading ? 'Signing in...' : 'Sign In'}
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

echo ""
echo "✅✅✅ SIGN-IN THEME MATCHED! ✅✅✅"
echo ""
echo "Exact matching features:"
echo "✓ Split layout (form left, images right)"
echo "✓ White background on left side"
echo "✓ Animated Brain logo (rotating)"
echo "✓ Same typography and spacing"
echo "✓ Same input styling (.input class)"
echo "✓ Same button styling (.btn-primary class)"
echo "✓ Rotating background images (3 photos)"
echo "✓ Emerald to primary gradient overlay"
echo "✓ Smooth fade/scale/rotate transitions"
echo "✓ 5-second rotation interval"
echo ""
echo "Colors used:"
echo "• Primary color (emerald/teal)"
echo "• White background"
echo "• Gray text"
echo "• NO purple or violet!"
echo ""
echo "Run: npm run dev"
echo ""
echo "Sign-in now perfectly matches sign-up! 🎨✨"
