#!/bin/bash
# TalentDetector AI - Complete Production Final
# Repository: https://github.com/talentdetectorai/TalentDetectorAI
# Run: bash final-setup.sh

set -e

echo "🚀 TalentDetector AI - Final Production Setup"
echo "📁 Working in: $(pwd)"

# Structure
mkdir -p app/api/{stats,jobs,candidates}
mkdir -p app/{auth/{signin,signup},dashboard/manager/{jobs,candidates,analytics,interviews,pipeline,offers}}
mkdir -p components/{landing,dashboard,ui}
mkdir -p lib/{supabase,hooks}
mkdir -p migrations public

cat > .gitignore << 'ENDFILE'
node_modules
.next
.env*.local
*.log
.DS_Store
ENDFILE

cat > package.json << 'ENDFILE'
{
  "name": "talentdetectorai",
  "version": "4.0.0",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.39.3",
    "@supabase/ssr": "^0.1.0",
    "next": "^14.2.3",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "framer-motion": "^11.0.8",
    "recharts": "^2.12.2",
    "react-hot-toast": "^2.4.1",
    "lucide-react": "^0.344.0",
    "swr": "^2.2.5"
  },
  "devDependencies": {
    "@types/node": "^20.11.19",
    "@types/react": "^18.2.57",
    "typescript": "^5.3.3",
    "tailwindcss": "^3.4.1",
    "autoprefixer": "^10.4.17",
    "@tailwindcss/forms": "^0.5.7",
    "eslint-config-next": "14.2.3"
  }
}
ENDFILE

cat > tsconfig.json << 'ENDFILE'
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": false,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{"name": "next"}],
    "paths": {"@/*": ["./*"]}
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
ENDFILE

cat > next.config.js << 'ENDFILE'
module.exports = {
  reactStrictMode: true,
  images: { domains: ['images.unsplash.com'] }
}
ENDFILE

cat > tailwind.config.js << 'ENDFILE'
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: { 500: '#0ea5e9', 600: '#0284c7', 700: '#0369a1' },
        orange: { 500: '#f97316', 600: '#ea580c' },
        green: { 500: '#22c55e', 600: '#16a34a' },
      },
      animation: {
        'float': 'float 3s ease-in-out infinite',
        'slide-up': 'slideUp 0.5s ease-out',
        'fade-in': 'fadeIn 0.6s ease-out',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(100px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    }
  },
  plugins: [require('@tailwindcss/forms')]
}
ENDFILE

cat > postcss.config.js << 'ENDFILE'
module.exports = { plugins: { tailwindcss: {}, autoprefixer: {} } }
ENDFILE

cat > .env.example << 'ENDFILE'
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ENDFILE

cat > app/globals.css << 'ENDFILE'
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body { @apply bg-gray-50 text-gray-900; }
}

@layer components {
  .btn-primary {
    @apply bg-gradient-to-r from-brand-600 to-brand-700 text-white px-8 py-4 rounded-xl font-bold hover:shadow-2xl transition-all transform hover:scale-105;
  }
  .card {
    @apply bg-white rounded-2xl shadow-lg p-6 border border-gray-100 hover:shadow-2xl transition-all;
  }
  .stat-card {
    @apply p-6 rounded-2xl text-white shadow-xl hover:shadow-2xl transition-all transform hover:scale-105;
  }
}
ENDFILE

cat > app/layout.tsx << 'ENDFILE'
import './globals.css'
import { Inter } from 'next/font/google'
import { Toaster } from 'react-hot-toast'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'TalentDetector AI - Smart Hiring',
  description: 'AI-powered recruitment platform'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
        <Toaster position="top-right" />
      </body>
    </html>
  )
}
ENDFILE

cat > app/page.tsx << 'ENDFILE'
'use client'
import { motion, useScroll, useTransform } from 'framer-motion'
import Link from 'next/link'
import { ArrowRight, Zap, Brain, Target, BarChart3, Users, Sparkles, CheckCircle, TrendingUp } from 'lucide-react'
import { useEffect, useState } from 'react'

export default function Landing() {
  const { scrollY } = useScroll()
  const y1 = useTransform(scrollY, [0, 300], [0, 100])
  const y2 = useTransform(scrollY, [0, 300], [0, -100])
  const [stats, setStats] = useState({ companies: 500, placements: 12000, accuracy: 95 })

  useEffect(() => {
    const interval = setInterval(() => {
      setStats(prev => ({
        companies: Math.min(prev.companies + 10, 1000),
        placements: Math.min(prev.placements + 100, 25000),
        accuracy: 95
      }))
    }, 50)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen overflow-hidden">
      {/* Animated Nav */}
      <motion.nav 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="fixed w-full z-50 bg-white/90 backdrop-blur-xl border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <motion.div whileHover={{ scale: 1.05 }} className="flex items-center gap-2">
            <Sparkles className="w-8 h-8 text-brand-600" />
            <span className="text-2xl font-bold bg-gradient-to-r from-brand-600 to-orange-600 bg-clip-text text-transparent">
              TalentDetector AI
            </span>
          </motion.div>
          <div className="flex gap-4">
            <Link href="/auth/signin">
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                className="px-6 py-2 font-semibold text-brand-700">
                Sign In
              </motion.button>
            </Link>
            <Link href="/auth/signup">
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="btn-primary">
                Start Free Trial
              </motion.button>
            </Link>
          </div>
        </div>
      </motion.nav>

      {/* Hero with Parallax */}
      <section className="min-h-screen flex items-center justify-center relative pt-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-500 via-blue-600 to-orange-500 opacity-10" />
        
        {/* Floating Elements */}
        <motion.div style={{ y: y1 }} className="absolute top-20 left-10 w-72 h-72 bg-brand-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-float" />
        <motion.div style={{ y: y2 }} className="absolute bottom-20 right-10 w-72 h-72 bg-orange-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-float" />

        <div className="relative z-10 max-w-6xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}>
            
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="inline-block mb-8">
              <div className="w-20 h-20 bg-gradient-to-r from-brand-500 to-orange-500 rounded-2xl flex items-center justify-center mx-auto">
                <Brain className="w-10 h-10 text-white" />
              </div>
            </motion.div>

            <h1 className="text-7xl font-bold mb-6 leading-tight">
              <span className="bg-gradient-to-r from-brand-600 to-orange-600 bg-clip-text text-transparent">
                AI-Powered Hiring
              </span>
              <br />
              <span className="text-gray-900">That Actually Works</span>
            </h1>

            <p className="text-2xl text-gray-600 mb-12 max-w-3xl mx-auto">
              95% match accuracy • 10x faster hiring • Real-time insights
            </p>

            <div className="flex gap-6 justify-center mb-16">
              <Link href="/auth/signup">
                <motion.button
                  whileHover={{ scale: 1.05, boxShadow: "0 20px 60px rgba(14, 165, 233, 0.3)" }}
                  whileTap={{ scale: 0.95 }}
                  className="btn-primary text-xl">
                  Get Started Free <ArrowRight className="inline ml-2" />
                </motion.button>
              </Link>
              <Link href="/auth/signin">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-8 py-4 border-2 border-brand-600 text-brand-700 rounded-xl font-bold hover:bg-brand-50 transition-all">
                  Watch Demo
                </motion.button>
              </Link>
            </div>

            {/* Live Stats */}
            <div className="grid grid-cols-3 gap-8 max-w-3xl mx-auto">
              {[
                { label: 'Companies', value: stats.companies, suffix: '+' },
                { label: 'Placements', value: stats.placements.toLocaleString(), suffix: '+' },
                { label: 'Match Accuracy', value: stats.accuracy, suffix: '%' }
              ].map((stat, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.2 }}
                  className="bg-white/80 backdrop-blur rounded-xl p-6 shadow-lg">
                  <p className="text-4xl font-bold text-brand-600">{stat.value}{stat.suffix}</p>
                  <p className="text-sm text-gray-600 mt-1">{stat.label}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* AI Features Section */}
      <section className="py-24 bg-gradient-to-b from-white to-blue-50">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-16">
            <h2 className="text-5xl font-bold mb-4">
              <span className="bg-gradient-to-r from-brand-600 to-orange-600 bg-clip-text text-transparent">
                AI That Understands Talent
              </span>
            </h2>
            <p className="text-xl text-gray-600">Powered by advanced machine learning algorithms</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <Brain className="w-12 h-12" />,
                title: 'Intelligent Matching',
                desc: 'Our AI analyzes 200+ data points to find perfect candidates with 95%+ accuracy',
                color: 'from-brand-500 to-blue-600'
              },
              {
                icon: <Zap className="w-12 h-12" />,
                title: 'Instant Screening',
                desc: 'AI screens thousands of candidates in seconds, not days. 10x faster than manual review',
                color: 'from-orange-500 to-red-500'
              },
              {
                icon: <Target className="w-12 h-12" />,
                title: 'Predictive Analytics',
                desc: 'Predict candidate success with ML models trained on 100K+ hiring outcomes',
                color: 'from-green-500 to-teal-500'
              }
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.2 }}
                whileHover={{ y: -10, transition: { duration: 0.3 } }}
                className="card group cursor-pointer">
                <div className={`w-20 h-20 bg-gradient-to-br ${feature.color} rounded-2xl flex items-center justify-center text-white mb-6 group-hover:scale-110 transition-transform`}>
                  {feature.icon}
                </div>
                <h3 className="text-2xl font-bold mb-3">{feature.title}</h3>
                <p className="text-gray-600">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Advanced Features */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}>
              <h2 className="text-4xl font-bold mb-6">
                Real-Time Pipeline<br />
                <span className="bg-gradient-to-r from-brand-600 to-orange-600 bg-clip-text text-transparent">
                  With Live Updates
                </span>
              </h2>
              <ul className="space-y-4">
                {[
                  'Drag-and-drop candidate management',
                  'Automated interview scheduling',
                  'Team collaboration & voting',
                  'AI-powered recommendations',
                  'Real-time analytics dashboard'
                ].map((item, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-center gap-3">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                    <span className="text-lg">{item}</span>
                  </motion.li>
                ))}
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative">
              <div className="bg-gradient-to-br from-brand-500 to-orange-500 rounded-3xl p-8 shadow-2xl transform rotate-3 hover:rotate-0 transition-transform">
                <BarChart3 className="w-full h-64 text-white" />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-24 bg-gradient-to-br from-brand-600 to-orange-600 text-white">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}>
            <h2 className="text-5xl font-bold mb-6">Ready to Transform Hiring?</h2>
            <p className="text-2xl mb-12 opacity-90">Join 1000+ companies hiring smarter with AI</p>
            <Link href="/auth/signup">
              <motion.button
                whileHover={{ scale: 1.1, boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}
                whileTap={{ scale: 0.95 }}
                className="bg-white text-brand-700 px-12 py-5 rounded-xl font-bold text-xl shadow-2xl">
                Start Free Trial <ArrowRight className="inline ml-2" />
              </motion.button>
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
ENDFILE

cat > lib/supabase/client.ts << 'ENDFILE'
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) throw new Error('Add Supabase credentials to .env.local')
  return createBrowserClient(url, key)
}
ENDFILE

cat > lib/hooks/useRealTimeData.ts << 'ENDFILE'
import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'

export function useRealTimeData() {
  const fetcher = async () => {
    const supabase = createClient()
    
    const [jobs, candidates, analytics] = await Promise.all([
      supabase.from('jobs').select('*', { count: 'exact' }),
      supabase.from('candidates').select('*', { count: 'exact' }),
      supabase.from('analytics').select('*').order('created_at', { ascending: false }).limit(1).single()
    ])

    return {
      jobsCount: jobs.count || 0,
      candidatesCount: candidates.count || 0,
      avgTimeToHire: analytics.data?.avg_time_to_hire || 0,
      conversionRate: analytics.data?.conversion_rate || 0,
      recentJobs: jobs.data || [],
      recentCandidates: candidates.data || []
    }
  }

  return useSWR('realtime-dashboard', fetcher, {
    refreshInterval: 3000,
    revalidateOnFocus: true,
    revalidateOnReconnect: true
  })
}
ENDFILE

cat > app/auth/signin/page.tsx << 'ENDFILE'
'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'

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
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      toast.success('Welcome!')
      router.push('/dashboard/manager')
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-md">
          <Link href="/" className="text-3xl font-bold bg-gradient-to-r from-brand-600 to-orange-600 bg-clip-text text-transparent">
            TalentDetector AI
          </Link>
          <h1 className="text-3xl font-bold mt-8 mb-2">Welcome back</h1>
          <p className="text-gray-600 mb-8">Sign in to continue</p>

          <form onSubmit={handleSignIn} className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-brand-500" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-brand-500" required />
            </div>
            <button type="submit" disabled={loading} className="w-full btn-primary">
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="text-center mt-6 text-sm">
            No account? <Link href="/auth/signup" className="text-brand-600 font-semibold">Sign up</Link>
          </p>
        </motion.div>
      </div>
      <div className="hidden lg:block lg:w-1/2 relative bg-gradient-to-br from-brand-500 to-orange-500" />
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
import { motion } from 'framer-motion'

export default function SignUp() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signUp({
        email, password, options: { data: { name } }
      })
      if (error) throw error
      toast.success('Account created!')
      router.push('/auth/signin')
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-md">
          <Link href="/" className="text-3xl font-bold bg-gradient-to-r from-brand-600 to-orange-600 bg-clip-text text-transparent">
            TalentDetector AI
          </Link>
          <h1 className="text-3xl font-bold mt-8 mb-2">Create account</h1>
          <p className="text-gray-600 mb-8">Start hiring smarter</p>

          <form onSubmit={handleSignUp} className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">Full Name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)}
                className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-brand-500" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-brand-500" required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-brand-500" required minLength={6} />
            </div>
            <button type="submit" disabled={loading} className="w-full btn-primary">
              {loading ? 'Creating...' : 'Create Account'}
            </button>
          </form>

          <p className="text-center mt-6 text-sm">
            Have account? <Link href="/auth/signin" className="text-brand-600 font-semibold">Sign in</Link>
          </p>
        </motion.div>
      </div>
      <div className="hidden lg:block lg:w-1/2 relative bg-gradient-to-br from-green-500 to-brand-500" />
    </div>
  )
}
ENDFILE

cat > app/dashboard/manager/layout.tsx << 'ENDFILE'
'use client'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Briefcase, Users, BarChart3, Calendar, LogOut } from 'lucide-react'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    checkUser()
  }, [])

  async function checkUser() {
    try {
      const supabase = createClient()
      const { data: { user: authUser }, error } = await supabase.auth.getUser()
      if (error || !authUser) {
        router.push('/auth/signin')
        return
      }
      setUser({
        id: authUser.id,
        name: authUser.user_metadata?.name || authUser.email?.split('@')[0],
        email: authUser.email
      })
      setLoading(false)
    } catch {
      router.push('/auth/signin')
    }
  }

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600" />
      </div>
    )
  }

  const navItems = [
    { label: 'Dashboard', href: '/dashboard/manager', icon: <BarChart3 className="w-5 h-5" /> },
    { label: 'Jobs', href: '/dashboard/manager/jobs', icon: <Briefcase className="w-5 h-5" /> },
    { label: 'Candidates', href: '/dashboard/manager/candidates', icon: <Users className="w-5 h-5" /> },
    { label: 'Interviews', href: '/dashboard/manager/interviews', icon: <Calendar className="w-5 h-5" /> },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b fixed w-full z-30">
        <div className="px-6 flex justify-between h-16 items-center">
          <Link href="/dashboard/manager" className="text-2xl font-bold bg-gradient-to-r from-brand-600 to-orange-600 bg-clip-text text-transparent">
            TalentDetector AI
          </Link>
          <div className="flex items-center gap-4">
            <div className="text-right mr-2">
              <p className="font-semibold text-sm">{user?.name}</p>
              <p className="text-xs text-gray-500">{user?.email}</p>
            </div>
            <button onClick={handleSignOut} className="p-2 hover:bg-gray-100 rounded-lg">
              <LogOut className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>
      </nav>

      <div className="flex pt-16">
        <aside className="w-64 bg-white border-r fixed h-full">
          <div className="p-4 space-y-1">
            {navItems.map(item => (
              <Link key={item.href} href={item.href}>
                <motion.div whileHover={{ x: 4 }} 
                  className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-brand-50 text-gray-700 hover:text-brand-700">
                  {item.icon}
                  <span className="font-medium">{item.label}</span>
                </motion.div>
              </Link>
            ))}
          </div>
        </aside>

        <main className="ml-64 flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
ENDFILE

cat > app/dashboard/manager/page.tsx << 'ENDFILE'
'use client'
import { motion } from 'framer-motion'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Briefcase, Users, Clock, TrendingUp, RefreshCw } from 'lucide-react'
import { useRealTimeData } from '@/lib/hooks/useRealTimeData'

export default function ManagerDashboard() {
  const { data, error, mutate, isLoading } = useRealTimeData()

  if (isLoading) return <div className="flex items-center justify-center h-96"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600" /></div>
  if (error) return <div className="text-red-600">Error loading data. Check Supabase connection.</div>

  const stats = [
    { label: 'Active Jobs', value: data?.jobsCount || 0, change: '+3', icon: <Briefcase />, color: 'from-blue-500 to-blue-600' },
    { label: 'Candidates', value: data?.candidatesCount || 0, change: '+24', icon: <Users />, color: 'from-orange-500 to-orange-600' },
    { label: 'Avg Time', value: `${data?.avgTimeToHire || 0}d`, change: '-3d', icon: <Clock />, color: 'from-green-500 to-green-600' },
    { label: 'Conversion', value: `${data?.conversionRate || 0}%`, change: '+5%', icon: <TrendingUp />, color: 'from-teal-500 to-teal-600' },
  ]

  const timeData = [
    { month: 'Jan', days: 25 }, { month: 'Feb', days: 22 }, { month: 'Mar', days: 20 },
    { month: 'Apr', days: 18 }, { month: 'May', days: 19 }, { month: 'Jun', days: 16 }
  ]

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-brand-600 to-orange-600 bg-clip-text text-transparent mb-2">
            Dashboard
          </h1>
          <p className="text-gray-600">Real-time data • Updates every 3 seconds</p>
        </div>
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          onClick={() => mutate()}
          className="flex items-center gap-2 px-4 py-2 bg-white border rounded-lg hover:shadow-lg">
          <RefreshCw className="w-4 h-4" /> Refresh
        </motion.button>
      </div>

      <div className="grid md:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: i * 0.1 }} className={`stat-card bg-gradient-to-br ${stat.color}`}>
            <div className="flex justify-between mb-4">
              <div className="text-3xl">{stat.icon}</div>
              <span className="text-xs bg-white/20 px-2 py-1 rounded">{stat.change}</span>
            </div>
            <p className="text-sm opacity-90 mb-1">{stat.label}</p>
            <p className="text-4xl font-bold">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card">
          <h3 className="text-xl font-bold mb-4">Time-to-Hire Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={timeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Area type="monotone" dataKey="days" stroke="#22c55e" fill="#86efac" />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="card">
          <h3 className="text-xl font-bold mb-4">Recent Jobs</h3>
          <div className="space-y-3">
            {data?.recentJobs?.slice(0, 5).map((job: any, i: number) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <div className="flex-1">
                  <p className="font-semibold">{job.title}</p>
                  <p className="text-xs text-gray-500">{job.location || 'Remote'}</p>
                </div>
              </div>
            ))}
            {(!data?.recentJobs || data.recentJobs.length === 0) && (
              <p className="text-gray-500 text-center py-8">No jobs yet. Create your first job!</p>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
ENDFILE

cat > app/dashboard/manager/jobs/page.tsx << 'ENDFILE'
'use client'
import { motion } from 'framer-motion'

export default function JobsPage() {
  return (
    <div>
      <h1 className="text-4xl font-bold mb-8 bg-gradient-to-r from-brand-600 to-orange-600 bg-clip-text text-transparent">
        Jobs
      </h1>
      <div className="card">
        <p className="text-gray-600">Jobs list coming soon...</p>
      </div>
    </div>
  )
}
ENDFILE

cat > app/dashboard/manager/candidates/page.tsx << 'ENDFILE'
'use client'
import { motion } from 'framer-motion'

export default function CandidatesPage() {
  return (
    <div>
      <h1 className="text-4xl font-bold mb-8 bg-gradient-to-r from-brand-600 to-orange-600 bg-clip-text text-transparent">
        Candidates
      </h1>
      <div className="card">
        <p className="text-gray-600">Candidates list coming soon...</p>
      </div>
    </div>
  )
}
ENDFILE

cat > app/dashboard/manager/interviews/page.tsx << 'ENDFILE'
'use client'
import { motion } from 'framer-motion'

export default function InterviewsPage() {
  return (
    <div>
      <h1 className="text-4xl font-bold mb-8 bg-gradient-to-r from-brand-600 to-orange-600 bg-clip-text text-transparent">
        Interviews
      </h1>
      <div className="card">
        <p className="text-gray-600">Interview schedule coming soon...</p>
      </div>
    </div>
  )
}
ENDFILE

cat > migrations/schema.sql << 'ENDFILE'
CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  status TEXT DEFAULT 'open',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  avg_time_to_hire INT DEFAULT 18,
  conversion_rate INT DEFAULT 34,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert sample analytics
INSERT INTO analytics (avg_time_to_hire, conversion_rate) VALUES (18, 34);
ENDFILE

cat > README.md << 'ENDFILE'
# TalentDetector AI - Production Final

## Setup

1. **Supabase Setup**
   - Create project at supabase.com
   - Run SQL from `migrations/schema.sql`
   - Copy credentials to `.env.local`

2. **Install**
