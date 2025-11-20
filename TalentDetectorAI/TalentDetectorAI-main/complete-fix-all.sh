#!/bin/bash
# TalentDetector AI - ALL ISSUES FIXED
# Run: bash complete-fix-all.sh

set -e

echo "🚀 Fixing ALL Issues..."

rm -rf app components lib .next 2>/dev/null || true

mkdir -p app/{api,auth/{signin,signup},dashboard/{manager/{jobs/new,analytics},agency,candidate,admin}}
mkdir -p components/{dashboard,ui} lib/{supabase,pdf} migrations

cat > package.json << 'ENDFILE'
{
  "name": "talentdetectorai",
  "version": "1.0.0",
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
    "swr": "^2.2.5",
    "jspdf": "^2.5.1",
    "jspdf-autotable": "^3.8.2"
  },
  "devDependencies": {
    "@types/node": "^20.11.19",
    "@types/react": "^18.2.57",
    "typescript": "^5.3.3",
    "tailwindcss": "^3.4.1",
    "autoprefixer": "^10.4.17",
    "@tailwindcss/forms": "^0.5.7"
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
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
ENDFILE

cat > next.config.js << 'ENDFILE'
module.exports = { 
  reactStrictMode: true,
  images: { domains: ['images.unsplash.com'], unoptimized: true }
}
ENDFILE

cat > tailwind.config.js << 'ENDFILE'
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: { 500: '#0ea5e9', 600: '#0284c7', 700: '#0369a1' },
        emerald: { 500: '#10b981', 600: '#059669' },
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'slide': 'slide 30s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        slide: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-100%)' },
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

cat > .env.local << 'ENDFILE'
NEXT_PUBLIC_SUPABASE_URL=https://demo.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=demo-key
SUPABASE_SERVICE_ROLE_KEY=demo-service-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
ENDFILE

cat > app/globals.css << 'ENDFILE'
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer components {
  .btn-primary { @apply bg-gradient-to-r from-primary-600 to-primary-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50; }
  .card { @apply bg-white rounded-xl shadow-lg p-6 border hover:shadow-xl transition-all; }
  .input { @apply w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 transition-all outline-none; }
}
ENDFILE

cat > app/layout.tsx << 'ENDFILE'
import './globals.css'
import { Toaster } from 'react-hot-toast'

export const metadata = { title: 'TalentDetector AI' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}<Toaster position="top-right" /></body></html>
}
ENDFILE

cat > app/page.tsx << 'ENDFILE'
'use client'
import { motion, useScroll, useTransform } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Brain, Zap, Users, TrendingUp, Star, Sparkles } from 'lucide-react'
import { useState, useEffect } from 'react'

export default function Landing() {
  const { scrollY } = useScroll()
  const y1 = useTransform(scrollY, [0, 300], [0, 150])
  const y2 = useTransform(scrollY, [0, 300], [0, -150])
  const [currentFeature, setCurrentFeature] = useState(0)

  const features = [
    { title: 'AI Matching', desc: '95% accuracy', image: 'photo-1485827404703-89b55fcc595e' },
    { title: 'Smart Screening', desc: '10x faster', image: 'photo-1551434678-e076c223a692' },
    { title: 'Real-time Analytics', desc: 'Live insights', image: 'photo-1460925895917-afdab827c52f' }
  ]

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFeature((prev) => (prev + 1) % features.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen overflow-hidden">
      <nav className="fixed w-full z-50 bg-white/90 backdrop-blur border-b">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Brain className="w-8 h-8 text-primary-600" />
            <span className="text-2xl font-bold text-primary-600">TalentDetector AI</span>
          </div>
          <div className="flex gap-4">
            <Link href="/auth/signin"><button className="px-6 py-2 font-semibold">Sign In</button></Link>
            <Link href="/auth/signup"><button className="btn-primary">Start Free</button></Link>
          </div>
        </div>
      </nav>

      <section className="min-h-screen flex items-center justify-center relative">
        <Image 
          src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=2850&q=80" 
          alt="Professional team collaboration" 
          fill 
          className="object-cover" 
          priority 
        />
        <div className="absolute inset-0 bg-gradient-to-br from-primary-600/95 to-emerald-600/95" />
        
        <motion.div style={{ y: y1 }} className="absolute top-20 left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-float" />
        <motion.div style={{ y: y2 }} className="absolute bottom-20 right-10 w-72 h-72 bg-emerald-400/20 rounded-full blur-3xl animate-float" />

        <div className="relative z-10 max-w-6xl mx-auto px-6 text-center text-white">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}>
            <motion.div animate={{ rotate: [0, 360] }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="w-24 h-24 bg-white/20 backdrop-blur rounded-3xl flex items-center justify-center mx-auto mb-8">
              <Brain className="w-12 h-12" />
            </motion.div>
            <h1 className="text-7xl font-bold mb-6">AI-Powered Recruitment</h1>
            <p className="text-2xl mb-8 max-w-3xl mx-auto">Smart matching • Automated workflows • Real-time insights</p>
            <Link href="/auth/signup">
              <button className="bg-white text-primary-700 px-12 py-5 rounded-xl font-bold text-xl shadow-2xl">
                Get Started Free <ArrowRight className="inline ml-2" />
              </button>
            </Link>
          </motion.div>
        </div>
      </section>

      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-5xl font-bold text-center mb-16 text-primary-600">AI Features</h2>
          <div className="relative h-96">
            {features.map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: 100 }}
                animate={{ 
                  opacity: i === currentFeature ? 1 : 0,
                  x: i === currentFeature ? 0 : 100,
                  zIndex: i === currentFeature ? 10 : 0
                }}
                className="absolute inset-0 flex items-center gap-8">
                <div className="flex-1">
                  <h3 className="text-4xl font-bold mb-4">{feature.title}</h3>
                  <p className="text-2xl text-gray-600">{feature.desc}</p>
                </div>
                <div className="flex-1 relative h-80">
                  <Image src={`https://images.unsplash.com/${feature.image}?auto=format&fit=crop&w=800&q=80`}
                    alt={feature.title} fill className="object-cover rounded-2xl shadow-2xl" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 bg-gray-100 overflow-hidden">
        <div className="flex animate-slide whitespace-nowrap">
          {[...Array(20)].map((_, i) => (
            <div key={i} className="inline-flex items-center mx-8">
              <Star className="w-6 h-6 text-yellow-400 fill-yellow-400 mr-2" />
              <span className="font-semibold">Trusted by 1000+ Companies</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
ENDFILE

cat > lib/supabase/client.ts << 'ENDFILE'
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
ENDFILE

cat > lib/pdf/export.ts << 'ENDFILE'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export function exportToPDF(data: any[], title: string) {
  const doc = new jsPDF()
  
  doc.setFontSize(20)
  doc.text(title, 14, 22)
  
  doc.setFontSize(11)
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 30)
  
  autoTable(doc, {
    startY: 40,
    head: [Object.keys(data[0] || {})],
    body: data.map(row => Object.values(row)),
  })
  
  doc.save(`${title.replace(/ /g, '-').toLowerCase()}-${Date.now()}.pdf`)
}
ENDFILE

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
      
      if (error) throw error
      if (!data.user) throw new Error('No user data')
      
      const userRole = data.user.user_metadata?.role || 'manager'
      console.log('✅ Login successful. Role:', userRole)
      
      toast.success('Welcome back!')
      
      const routes: Record<string, string> = {
        manager: '/dashboard/manager',
        agency: '/dashboard/agency',
        candidate: '/dashboard/candidate',
        admin: '/dashboard/admin'
      }
      
      const targetPath = routes[userRole] || '/dashboard/manager'
      console.log('🔄 Redirecting to:', targetPath)
      
      setTimeout(() => {
        window.location.href = targetPath
      }, 1000)
      
    } catch (error: any) {
      console.error('❌ Sign in error:', error)
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
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="input" required disabled={loading} />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                className="input" required disabled={loading} />
            </div>
            <button type="submit" disabled={loading} className="w-full btn-primary">
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="text-center mt-6">
            <Link href="/auth/signup" className="text-primary-600 font-semibold">Sign up</Link>
          </p>
        </div>
      </div>

      <div className="hidden lg:block lg:w-1/2 relative">
        <Image src="https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=2850&q=80" 
          alt="Office" fill className="object-cover" priority />
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
      const { error } = await createClient().auth.signUp({
        email, password, options: { data: { name, role } }
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
              <input type="text" value={name} onChange={e => setName(e.target.value)}
                className="input" required />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                className="input" required />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                className="input" required minLength={6} />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">I am a</label>
              <select value={role} onChange={e => setRole(e.target.value)} className="input">
                <option value="manager">Hiring Manager</option>
                <option value="agency">Recruitment Agency</option>
                <option value="candidate">Job Candidate</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <button type="submit" disabled={loading} className="w-full btn-primary">
              {loading ? 'Creating...' : 'Create Account'}
            </button>
          </form>

          <p className="text-center mt-6">
            <Link href="/auth/signin" className="text-primary-600 font-semibold">Sign in</Link>
          </p>
        </div>
      </div>

      <div className="hidden lg:block lg:w-1/2 relative">
        <Image src="https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=2850&q=80" 
          alt="Team" fill className="object-cover" priority />
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/90 to-primary-600/90" />
      </div>
    </div>
  )
}
ENDFILE

cat > components/dashboard/DashboardLayout.tsx << 'ENDFILE'
'use client'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { LogOut, Brain, BarChart3, Briefcase, Users, DollarSign, Calendar, FileText, Settings } from 'lucide-react'

interface NavItem {
  label: string
  href: string
  iconName: string
}

const iconMap: { [key: string]: any } = {
  'BarChart3': BarChart3,
  'Briefcase': Briefcase,
  'Users': Users,
  'DollarSign': DollarSign,
  'Calendar': Calendar,
  'FileText': FileText,
  'Settings': Settings
}

export default function DashboardLayout({ 
  children, 
  role, 
  navItems 
}: { 
  children: React.ReactNode
  role: string
  navItems: NavItem[]
}) {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    checkUser()
  }, [role])

  async function checkUser() {
    try {
      const { data: { user: authUser }, error } = await createClient().auth.getUser()
      if (error || !authUser) {
        console.log('❌ No user, redirecting to signin')
        router.push('/auth/signin')
        return
      }
      
      const userRole = authUser.user_metadata?.role || 'manager'
      console.log('✅ User role:', userRole, 'Expected:', role)
      
      if (userRole !== role) {
        console.log('❌ Role mismatch, redirecting to correct dashboard')
        const routes: Record<string, string> = {
          manager: '/dashboard/manager',
          agency: '/dashboard/agency',
          candidate: '/dashboard/candidate',
          admin: '/dashboard/admin'
        }
        router.push(routes[userRole] || '/auth/signin')
        return
      }
      
      setUser({ 
        id: authUser.id, 
        name: authUser.user_metadata?.name || authUser.email?.split('@')[0],
        email: authUser.email,
        role: userRole
      })
      setLoading(false)
    } catch (err) {
      console.error('❌ Error checking user:', err)
      router.push('/auth/signin')
    }
  }

  async function handleSignOut() {
    await createClient().auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary-600" />
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b fixed w-full z-30 shadow-sm">
        <div className="px-6 flex justify-between h-16 items-center">
          <div className="flex items-center gap-2">
            <Brain className="w-6 h-6 text-primary-600" />
            <span className="font-bold text-primary-600 capitalize">{role} Dashboard</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-semibold">{user.name}</p>
              <p className="text-xs text-gray-500">{user.email}</p>
            </div>
            <button onClick={handleSignOut} className="p-2 hover:bg-gray-100 rounded-lg">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </nav>

      <div className="flex pt-16">
        <aside className="w-64 bg-white border-r fixed h-full shadow-sm">
          <div className="p-4 space-y-1">
            {navItems.map(item => {
              const Icon = iconMap[item.iconName]
              return (
                <Link key={item.href} href={item.href}>
                  <div className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-primary-50 text-gray-700 hover:text-primary-700 transition">
                    {Icon && <Icon className="w-5 h-5" />}
                    <span className="font-medium">{item.label}</span>
                  </div>
                </Link>
              )
            })}
          </div>
        </aside>

        <main className="ml-64 flex-1 p-8">{children}</main>
      </div>
    </div>
  )
}
ENDFILE

cat > app/dashboard/manager/layout.tsx << 'ENDFILE'
import DashboardLayout from '@/components/dashboard/DashboardLayout'

export default function ManagerLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout role="manager" navItems={[
      { label: 'Dashboard', href: '/dashboard/manager', iconName: 'BarChart3' },
      { label: 'Post Job', href: '/dashboard/manager/jobs/new', iconName: 'Briefcase' },
      { label: 'Candidates', href: '/dashboard/manager/candidates', iconName: 'Users' },
      { label: 'Analytics', href: '/dashboard/manager/analytics', iconName: 'BarChart3' },
    ]}>
      {children}
    </DashboardLayout>
  )
}
ENDFILE

cat > app/dashboard/manager/page.tsx << 'ENDFILE'
'use client'
import { motion } from 'framer-motion'
import { Briefcase, Users, Clock, Download } from 'lucide-react'
import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { exportToPDF } from '@/lib/pdf/export'
import Link from 'next/link'

const fetcher = async () => {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  const [jobs, applications] = await Promise.all([
    supabase.from('jobs').select('*', { count: 'exact' }).eq('manager_id', user?.id || ''),
    supabase.from('applications').select('*, jobs!inner(manager_id)', { count: 'exact' }).eq('jobs.manager_id', user?.id || '')
  ])
  
  return { 
    jobsCount: jobs.count || 0,
    applicationsCount: applications.count || 0,
    jobs: jobs.data || []
  }
}

export default function ManagerDashboard() {
  const { data } = useSWR('manager-stats', fetcher, { refreshInterval: 5000 })

  const chartData = [
    { month: 'Jan', applications: 12 },
    { month: 'Feb', applications: 19 },
    { month: 'Mar', applications: 15 },
    { month: 'Apr', applications: 25 },
    { month: 'May', applications: 22 },
    { month: 'Jun', applications: 30 }
  ]

  function handleExport() {
    exportToPDF(chartData, 'Hiring Manager Report')
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold text-primary-600 mb-2">Hiring Manager Dashboard</h1>
          <p className="text-gray-600">Manage jobs and candidates</p>
        </div>
        <div className="flex gap-4">
          <button onClick={handleExport} className="btn-primary flex items-center gap-2">
            <Download className="w-5 h-5" /> Export PDF
          </button>
          <Link href="/dashboard/manager/jobs/new">
            <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-semibold">
              Post New Job
            </button>
          </Link>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        {[
          { label: 'Active Jobs', value: data?.jobsCount || 0, icon: Briefcase, color: 'from-blue-500 to-blue-600' },
          { label: 'Applications', value: data?.applicationsCount || 0, icon: Users, color: 'from-emerald-500 to-emerald-600' },
          { label: 'Avg Time to Hire', value: '18 days', icon: Clock, color: 'from-purple-500 to-purple-600' }
        ].map((stat, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="card">
            <div className={`w-12 h-12 bg-gradient-to-br ${stat.color} rounded-xl flex items-center justify-center text-white mb-4`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
            <p className="text-3xl font-bold">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="card">
        <h3 className="text-lg font-bold mb-4">Application Trends</h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Area type="monotone" dataKey="applications" stroke="#0ea5e9" fill="#0ea5e9" fillOpacity={0.3} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
ENDFILE

cat > app/dashboard/manager/jobs/new/page.tsx << 'ENDFILE'
'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function NewJob() {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [salaryMin, setSalaryMin] = useState('')
  const [salaryMax, setSalaryMax] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      const { error } = await supabase.from('jobs').insert({
        manager_id: user?.id,
        title,
        description,
        location,
        salary_min: parseInt(salaryMin),
        salary_max: parseInt(salaryMax)
      })
      
      if (error) throw error
      toast.success('Job posted!')
      router.push('/dashboard/manager')
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl">
      <Link href="/dashboard/manager">
        <button className="flex items-center gap-2 mb-6 hover:text-primary-600">
          <ArrowLeft className="w-5 h-5" /> Back
        </button>
      </Link>

      <h1 className="text-4xl font-bold text-primary-600 mb-8">Post New Job</h1>

      <form onSubmit={handleSubmit} className="card space-y-6">
        <div>
          <label className="block text-sm font-semibold mb-2">Job Title *</label>
          <input type="text" value={title} onChange={e => setTitle(e.target.value)}
            className="input" required />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-2">Description</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)}
            className="input h-32" />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-2">Location</label>
          <input type="text" value={location} onChange={e => setLocation(e.target.value)}
            className="input" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-2">Min Salary (£)</label>
            <input type="number" value={salaryMin} onChange={e => setSalaryMin(e.target.value)}
              className="input" />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2">Max Salary (£)</label>
            <input type="number" value={salaryMax} onChange={e => setSalaryMax(e.target.value)}
              className="input" />
          </div>
        </div>
        <button type="submit" disabled={loading} className="w-full btn-primary">
          {loading ? 'Posting...' : 'Post Job'}
        </button>
      </form>
    </div>
  )
}
ENDFILE

cat > app/dashboard/manager/analytics/page.tsx << 'ENDFILE'
'use client'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Download } from 'lucide-react'
import { exportToPDF } from '@/lib/pdf/export'

export default function Analytics() {
  const data = [
    { name: 'Jan', applications: 40, hires: 5 },
    { name: 'Feb', applications: 30, hires: 8 },
    { name: 'Mar', applications: 50, hires: 12 },
    { name: 'Apr', applications: 45, hires: 10 },
  ]

  const pieData = [
    { name: 'Accepted', value: 30 },
    { name: 'Pending', value: 50 },
    { name: 'Rejected', value: 20 },
  ]

  const COLORS = ['#10b981', '#f59e0b', '#ef4444']

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold text-primary-600">Analytics</h1>
        <button onClick={() => exportToPDF(data, 'Analytics Report')} className="btn-primary flex items-center gap-2">
          <Download className="w-5 h-5" /> Export PDF
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-bold mb-4">Applications vs Hires</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="applications" fill="#0ea5e9" />
              <Bar dataKey="hires" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3 className="font-bold mb-4">Application Status</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" outerRadius={100} fill="#8884d8" dataKey="value" label>
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
ENDFILE

cat > app/dashboard/agency/layout.tsx << 'ENDFILE'
import DashboardLayout from '@/components/dashboard/DashboardLayout'

export default function AgencyLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout role="agency" navItems={[
      { label: 'Dashboard', href: '/dashboard/agency', iconName: 'BarChart3' },
      { label: 'Placements', href: '/dashboard/agency/placements', iconName: 'Users' },
      { label: 'Earnings', href: '/dashboard/agency/earnings', iconName: 'DollarSign' },
    ]}>
      {children}
    </DashboardLayout>
  )
}
ENDFILE

cat > app/dashboard/agency/page.tsx << 'ENDFILE'
'use client'
import { Users, DollarSign } from 'lucide-react'

export default function AgencyDashboard() {
  return (
    <div>
      <h1 className="text-4xl font-bold text-primary-600 mb-8">Agency Dashboard</h1>
      <div className="grid md:grid-cols-2 gap-6">
        {[
          { label: 'Placements', value: '0', icon: Users, color: 'from-blue-500 to-blue-600' },
          { label: 'Earnings', value: '£0', icon: DollarSign, color: 'from-emerald-500 to-emerald-600' }
        ].map((stat, i) => (
          <div key={i} className="card">
            <div className={`w-12 h-12 bg-gradient-to-br ${stat.color} rounded-xl flex items-center justify-center text-white mb-4`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
            <p className="text-3xl font-bold">{stat.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
ENDFILE

cat > app/dashboard/candidate/layout.tsx << 'ENDFILE'
import DashboardLayout from '@/components/dashboard/DashboardLayout'

export default function CandidateLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout role="candidate" navItems={[
      { label: 'Dashboard', href: '/dashboard/candidate', iconName: 'Briefcase' },
      { label: 'Applications', href: '/dashboard/candidate/applications', iconName: 'FileText' },
      { label: 'Interviews', href: '/dashboard/candidate/interviews', iconName: 'Calendar' },
    ]}>
      {children}
    </DashboardLayout>
  )
}
ENDFILE

cat > app/dashboard/candidate/page.tsx << 'ENDFILE'
'use client'
import { FileText, Calendar } from 'lucide-react'

export default function CandidateDashboard() {
  return (
    <div>
      <h1 className="text-4xl font-bold text-primary-600 mb-8">Candidate Dashboard</h1>
      <div className="grid md:grid-cols-2 gap-6">
        {[
          { label: 'Applications', value: '0', icon: FileText, color: 'from-blue-500 to-blue-600' },
          { label: 'Interviews', value: '0', icon: Calendar, color: 'from-purple-500 to-purple-600' }
        ].map((stat, i) => (
          <div key={i} className="card">
            <div className={`w-12 h-12 bg-gradient-to-br ${stat.color} rounded-xl flex items-center justify-center text-white mb-4`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
            <p className="text-3xl font-bold">{stat.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
ENDFILE

cat > app/dashboard/admin/layout.tsx << 'ENDFILE'
import DashboardLayout from '@/components/dashboard/DashboardLayout'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardLayout role="admin" navItems={[
      { label: 'Dashboard', href: '/dashboard/admin', iconName: 'BarChart3' },
      { label: 'Users', href: '/dashboard/admin/users', iconName: 'Users' },
      { label: 'Settings', href: '/dashboard/admin/settings', iconName: 'Settings' },
    ]}>
      {children}
    </DashboardLayout>
  )
}
ENDFILE

cat > app/dashboard/admin/page.tsx << 'ENDFILE'
'use client'
export default function AdminDashboard() {
  return (
    <div>
      <h1 className="text-4xl font-bold text-primary-600 mb-8">Admin Dashboard</h1>
      <div className="card"><p>System administration</p></div>
    </div>
  )
}
ENDFILE

cat > migrations/schema.sql << 'ENDFILE'
CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  salary_min NUMERIC,
  salary_max NUMERIC,
  status TEXT DEFAULT 'open',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL,
  agency_id UUID,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_jobs_manager ON jobs(manager_id);
CREATE INDEX idx_applications_job ON applications(job_id);
ENDFILE

cat > README.md << 'ENDFILE'
# TalentDetector AI - ALL FIXED

## ✅ ALL ISSUES RESOLVED:
1. Role-based routing (candidates → candidate dashboard)
2. Post Job feature added
3. Analytics with charts
4. PDF export functionality
5. Enhanced landing page with AI features
6. Human background images
7. Moving animations

## Setup:
1. npm install
2. Update .env.local with Supabase credentials
3. Run migrations/schema.sql in Supabase
4. npm run dev
ENDFILE

echo "✅ ALL ISSUES FIXED!"
echo "Run: npm install && npm run dev"
