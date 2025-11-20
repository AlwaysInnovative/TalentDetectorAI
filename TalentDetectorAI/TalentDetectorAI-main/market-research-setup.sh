#!/bin/bash
# TalentDetector AI - Market-Researched Production Design
# Inspired by: Lever, Greenhouse, Workday, LinkedIn Talent
# Run: bash market-research-setup.sh

set -e

echo "🚀 TalentDetector AI - Premium Production Setup"

rm -rf app .next 2>/dev/null || true

mkdir -p app/{api,auth/{signin,signup},dashboard/manager/{jobs,candidates,pipeline,analytics}} lib/supabase components migrations

cat > package.json << 'ENDFILE'
{
  "name": "talentdetectorai",
  "version": "2.0.0",
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
  images: { 
    domains: ['images.unsplash.com'],
    unoptimized: true
  } 
}
ENDFILE

cat > tailwind.config.js << 'ENDFILE'
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: { 50: '#f0f9ff', 100: '#e0f2fe', 500: '#0ea5e9', 600: '#0284c7', 700: '#0369a1', 800: '#075985', 900: '#0c4a6e' },
        indigo: { 500: '#6366f1', 600: '#4f46e5', 700: '#4338ca' },
        emerald: { 500: '#10b981', 600: '#059669', 700: '#047857' },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'slide-up': 'slideUp 0.5s ease-out',
        'fade-in': 'fadeIn 0.6s ease-out',
        'scale-in': 'scaleIn 0.5s ease-out',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(30px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
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
NEXT_PUBLIC_SUPABASE_ANON_KEY=demo
ENDFILE

cat > app/globals.css << 'ENDFILE'
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply bg-gray-50 text-gray-900 antialiased;
    font-family: 'Inter', system-ui, -apple-system, sans-serif;
  }
}

@layer components {
  .btn-primary {
    @apply bg-gradient-to-r from-primary-600 to-indigo-600 text-white px-8 py-4 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed;
  }
  
  .btn-secondary {
    @apply bg-white text-primary-700 border-2 border-primary-200 px-8 py-4 rounded-xl font-semibold hover:bg-primary-50 transition-all duration-300 transform hover:scale-105;
  }
  
  .card {
    @apply bg-white rounded-2xl shadow-lg p-8 border border-gray-100 hover:shadow-xl transition-all duration-300;
  }
  
  .input-modern {
    @apply w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:ring-4 focus:ring-primary-100 transition-all duration-200 outline-none;
  }
  
  .gradient-bg {
    @apply bg-gradient-to-br from-primary-600 via-indigo-600 to-primary-700;
  }
}
ENDFILE

cat > app/layout.tsx << 'ENDFILE'
import './globals.css'
import { Toaster } from 'react-hot-toast'

export const metadata = { 
  title: 'TalentDetector AI - Modern Recruitment Platform',
  description: 'AI-powered recruitment platform with advanced analytics'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body>{children}<Toaster position="top-right" toastOptions={{
        success: { duration: 3000, style: { background: '#10b981', color: '#fff' } },
        error: { duration: 4000, style: { background: '#ef4444', color: '#fff' } },
      }} /></body>
    </html>
  )
}
ENDFILE

cat > app/page.tsx << 'ENDFILE'
'use client'
import { motion, useScroll, useTransform } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Brain, Zap, Users, BarChart3, Star, CheckCircle, TrendingUp, Shield, Clock } from 'lucide-react'
import { useState, useEffect } from 'react'

export default function Landing() {
  const { scrollY } = useScroll()
  const opacity = useTransform(scrollY, [0, 200], [1, 0])
  const scale = useTransform(scrollY, [0, 200], [1, 0.95])
  
  const [activeTestimonial, setActiveTestimonial] = useState(0)

  const testimonials = [
    { 
      name: 'Sarah Chen', 
      role: 'VP of Engineering at TechCorp', 
      text: 'TalentDetector AI reduced our time-to-hire by 65%. The AI matching is incredibly accurate and saves us countless hours.',
      image: 'photo-1494790108377-be9c29b29330',
      rating: 5
    },
    { 
      name: 'Michael Roberts', 
      role: 'HR Director at InnovateCo', 
      text: 'We filled 50 positions in just 3 months. The automation features are game-changing for our recruitment process.',
      image: 'photo-1507003211169-0a1dd7228f2d',
      rating: 5
    },
    { 
      name: 'Emily Rodriguez', 
      role: 'Talent Acquisition Lead', 
      text: 'The analytics dashboard gives us insights we never had before. It\'s like having a data scientist on the team.',
      image: 'photo-1438761681033-6461ffad8d80',
      rating: 5
    },
  ]

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % testimonials.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  const features = [
    { icon: Brain, title: 'AI-Powered Matching', desc: 'Advanced ML algorithms analyze 200+ data points for 95% accuracy', color: 'from-primary-500 to-indigo-500' },
    { icon: Zap, title: 'Instant Screening', desc: 'Automated screening processes thousands of candidates in seconds', color: 'from-indigo-500 to-purple-500' },
    { icon: BarChart3, title: 'Advanced Analytics', desc: 'Real-time dashboards with predictive insights and metrics', color: 'from-emerald-500 to-teal-500' },
    { icon: Users, title: 'Team Collaboration', desc: 'Seamless collaboration with shared notes and feedback', color: 'from-blue-500 to-primary-500' },
    { icon: Clock, title: 'Time Savings', desc: 'Reduce time-to-hire by 60% with automated workflows', color: 'from-teal-500 to-emerald-500' },
    { icon: Shield, title: 'Enterprise Security', desc: 'Bank-level encryption and compliance with SOC 2', color: 'from-purple-500 to-indigo-500' },
  ]

  return (
    <div className="min-h-screen bg-white overflow-hidden">
      {/* Modern Navigation */}
      <motion.nav 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="fixed w-full z-50 bg-white/80 backdrop-blur-xl border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <motion.div whileHover={{ scale: 1.05 }} className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-600 to-indigo-600 rounded-xl flex items-center justify-center">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-indigo-600 bg-clip-text text-transparent">
                TalentDetector AI
              </span>
            </motion.div>
            
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-gray-700 hover:text-primary-600 font-medium transition-colors">Features</a>
              <a href="#testimonials" className="text-gray-700 hover:text-primary-600 font-medium transition-colors">Testimonials</a>
              <a href="#pricing" className="text-gray-700 hover:text-primary-600 font-medium transition-colors">Pricing</a>
            </div>

            <div className="flex items-center gap-4">
              <Link href="/auth/signin">
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  className="px-6 py-2.5 font-semibold text-primary-700 hover:text-primary-800 transition-colors">
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
        </div>
      </motion.nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <Image 
            src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=2850&q=80" 
            alt="Professional team collaboration"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 gradient-bg opacity-95" />
        </div>

        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div 
            animate={{ 
              scale: [1, 1.2, 1],
              rotate: [0, 90, 0],
            }}
            transition={{ duration: 20, repeat: Infinity }}
            className="absolute top-20 left-20 w-96 h-96 bg-indigo-400/20 rounded-full blur-3xl" 
          />
          <motion.div 
            animate={{ 
              scale: [1, 1.3, 1],
              rotate: [0, -90, 0],
            }}
            transition={{ duration: 25, repeat: Infinity }}
            className="absolute bottom-20 right-20 w-96 h-96 bg-primary-400/20 rounded-full blur-3xl" 
          />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            style={{ opacity, scale }}>
            
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="inline-block mb-8">
              <div className="w-24 h-24 bg-white/20 backdrop-blur-lg rounded-3xl flex items-center justify-center mx-auto shadow-2xl">
                <Brain className="w-12 h-12 text-white" />
              </div>
            </motion.div>

            <h1 className="text-7xl md:text-8xl font-bold mb-6 leading-tight text-white">
              Hire Smarter
              <br />
              <motion.span
                animate={{ opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="bg-gradient-to-r from-yellow-200 to-yellow-400 bg-clip-text text-transparent">
                With AI
              </motion.span>
            </h1>

            <p className="text-2xl md:text-3xl mb-12 text-white/90 max-w-4xl mx-auto font-light">
              Transform your recruitment with AI-powered matching, automated workflows, and real-time analytics
            </p>

            <div className="flex flex-col sm:flex-row gap-6 justify-center mb-16">
              <Link href="/auth/signup">
                <motion.button
                  whileHover={{ scale: 1.05, boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-white text-primary-700 px-12 py-5 rounded-xl font-bold text-xl shadow-2xl hover:shadow-3xl transition-all">
                  Start Free Trial <ArrowRight className="inline ml-2" />
                </motion.button>
              </Link>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-white/10 backdrop-blur-lg text-white border-2 border-white/30 px-12 py-5 rounded-xl font-bold text-xl hover:bg-white/20 transition-all">
                Watch Demo
              </motion.button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              {[
                { value: '1,000+', label: 'Companies Trust Us' },
                { value: '25,000+', label: 'Successful Hires' },
                { value: '95%', label: 'Match Accuracy' }
              ].map((stat, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + i * 0.1 }}
                  className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
                  <p className="text-5xl font-bold text-white mb-2">{stat.value}</p>
                  <p className="text-white/80 text-sm font-medium">{stat.label}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-32 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-20">
            <motion.div
              initial={{ scale: 0.5 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true }}
              className="inline-block mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-indigo-500 rounded-2xl flex items-center justify-center mx-auto">
                <Zap className="w-8 h-8 text-white" />
              </div>
            </motion.div>
            <h2 className="text-6xl font-bold mb-6 bg-gradient-to-r from-primary-600 to-indigo-600 bg-clip-text text-transparent">
              Everything You Need to Hire
            </h2>
            <p className="text-2xl text-gray-600 max-w-3xl mx-auto">
              Powerful features designed for modern recruitment teams
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                whileHover={{ y: -10, transition: { duration: 0.2 } }}
                className="card group cursor-pointer">
                <div className={`w-16 h-16 bg-gradient-to-br ${feature.color} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                  <feature.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-4 text-gray-900">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-32 bg-gradient-to-br from-primary-600 to-indigo-700">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-20">
            <h2 className="text-6xl font-bold mb-6 text-white">
              Loved by 1,000+ Companies
            </h2>
            <p className="text-2xl text-white/80">
              See what our customers say about us
            </p>
          </motion.div>

          <motion.div
            key={activeTestimonial}
            initial={{ opacity: 0, x: 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -100 }}
            className="max-w-5xl mx-auto">
            <div className="bg-white rounded-3xl p-12 shadow-2xl">
              <div className="flex justify-center mb-6">
                {[...Array(testimonials[activeTestimonial].rating)].map((_, i) => (
                  <Star key={i} className="w-8 h-8 text-yellow-400 fill-yellow-400" />
                ))}
              </div>
              <p className="text-3xl font-medium mb-8 text-gray-800 text-center leading-relaxed">
                "{testimonials[activeTestimonial].text}"
              </p>
              <div className="flex items-center justify-center gap-6">
                <div className="relative w-20 h-20 rounded-full overflow-hidden shadow-lg">
                  <Image
                    src={`https://images.unsplash.com/${testimonials[activeTestimonial].image}?auto=format&fit=crop&w=200&q=80`}
                    alt={testimonials[activeTestimonial].name}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="text-left">
                  <p className="text-xl font-bold text-gray-900">{testimonials[activeTestimonial].name}</p>
                  <p className="text-gray-600">{testimonials[activeTestimonial].role}</p>
                </div>
              </div>
            </div>
          </motion.div>

          <div className="flex justify-center gap-3 mt-12">
            {testimonials.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveTestimonial(i)}
                className={`transition-all duration-300 rounded-full ${
                  i === activeTestimonial 
                    ? 'bg-white w-12 h-3' 
                    : 'bg-white/40 w-3 h-3 hover:bg-white/60'
                }`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 bg-white">
        <div className="max-w-5xl mx-auto text-center px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}>
            <h2 className="text-7xl font-bold mb-6 bg-gradient-to-r from-primary-600 to-indigo-600 bg-clip-text text-transparent">
              Ready to Transform Hiring?
            </h2>
            <p className="text-2xl text-gray-600 mb-12">
              Join 1,000+ companies using AI to build better teams
            </p>
            <Link href="/auth/signup">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="btn-primary text-2xl">
                Start Free Trial <ArrowRight className="inline ml-2" />
              </motion.button>
            </Link>
            <p className="text-gray-500 mt-6">No credit card required • 14-day free trial • Cancel anytime</p>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-indigo-500 rounded-xl flex items-center justify-center mx-auto mb-6">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <p className="text-2xl font-bold bg-gradient-to-r from-primary-400 to-indigo-400 bg-clip-text text-transparent mb-4">
            TalentDetector AI
          </p>
          <p className="text-gray-400">© 2025 TalentDetector AI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
ENDFILE

cat > lib/supabase/client.ts << 'ENDFILE'
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://demo.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'demo'
  )
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
import Image from 'next/image'
import { Brain, ArrowLeft } from 'lucide-react'

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
      
      toast.success('Welcome back!')
      const role = data.user?.user_metadata?.role || 'manager'
      
      setTimeout(() => {
        if (role === 'manager') router.push('/dashboard/manager')
        else if (role === 'candidate') router.push('/dashboard/candidate')
        else router.push('/dashboard/manager')
        window.location.href = role === 'manager' ? '/dashboard/manager' : '/dashboard/candidate'
      }, 300)
    } catch (error: any) {
      toast.error(error.message || 'Sign in failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          <Link href="/">
            <button className="flex items-center gap-2 text-gray-600 hover:text-primary-600 mb-8 transition-colors">
              <ArrowLeft className="w-5 h-5" /> Back to Home
            </button>
          </Link>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <div className="w-14 h-14 bg-gradient-to-br from-primary-600 to-indigo-600 rounded-2xl flex items-center justify-center mb-6">
              <Brain className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-primary-600 to-indigo-600 bg-clip-text text-transparent">
              Welcome Back
            </h1>
            <p className="text-gray-600 text-lg">Sign in to your account to continue</p>
          </motion.div>

          <form onSubmit={handleSignIn} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">Email Address</label>
              <input 
                type="email" 
                value={email} 
                onChange={e => setEmail(e.target.value)}
                className="input-modern" 
                placeholder="you@company.com"
                required 
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">Password</label>
              <input 
                type="password" 
                value={password} 
                onChange={e => setPassword(e.target.value)}
                className="input-modern" 
                placeholder="••••••••"
                required 
              />
            </div>
            <button type="submit" disabled={loading} className="w-full btn-primary">
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="text-center mt-8 text-gray-600">
            Don't have an account?{' '}
            <Link href="/auth/signup" className="text-primary-600 font-semibold hover:text-primary-700">
              Sign up for free
            </Link>
          </p>
        </div>
      </div>

      <div className="hidden lg:block lg:w-1/2 relative">
        <Image 
          src="https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=2850&q=80" 
          alt="Professional office" 
          fill 
          className="object-cover" 
        />
        <div className="absolute inset-0 gradient-bg opacity-90" />
        <div className="absolute inset-0 flex items-center justify-center text-white p-12">
          <div className="max-w-lg">
            <h2 className="text-5xl font-bold mb-6">Welcome to the Future of Hiring</h2>
            <p className="text-xl opacity-90 mb-8">Experience AI-powered recruitment that actually works</p>
            <div className="space-y-4">
              {['95% Match Accuracy', 'Save 20+ Hours/Week', 'Real-time Analytics'].map((item, i) => (
                <div key={i} className="flex items-center gap-3 bg-white/10 backdrop-blur-lg rounded-xl p-4">
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">✓</div>
                  <span className="font-semibold">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
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
import { motion } from 'framer-motion'
import Image from 'next/image'
import { Brain, ArrowLeft } from 'lucide-react'

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
      toast.success('Account created successfully!')
      setTimeout(() => router.push('/auth/signin'), 500)
    } catch (error: any) {
      toast.error(error.message || 'Sign up failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          <Link href="/">
            <button className="flex items-center gap-2 text-gray-600 hover:text-primary-600 mb-8 transition-colors">
              <ArrowLeft className="w-5 h-5" /> Back to Home
            </button>
          </Link>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
            <div className="w-14 h-14 bg-gradient-to-br from-primary-600 to-indigo-600 rounded-2xl flex items-center justify-center mb-6">
              <Brain className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-primary-600 to-indigo-600 bg-clip-text text-transparent">
              Get Started Free
            </h1>
            <p className="text-gray-600 text-lg">Create your account and start hiring smarter</p>
          </motion.div>

          <form onSubmit={handleSignUp} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">Full Name</label>
              <input 
                type="text" 
                value={name} 
                onChange={e => setName(e.target.value)}
                className="input-modern" 
                placeholder="John Doe"
                required 
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">Email Address</label>
              <input 
                type="email" 
                value={email} 
                onChange={e => setEmail(e.target.value)}
                className="input-modern" 
                placeholder="you@company.com"
                required 
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">Password</label>
              <input 
                type="password" 
                value={password} 
                onChange={e => setPassword(e.target.value)}
                className="input-modern" 
                placeholder="••••••••"
                required 
                minLength={6}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-700">I am a</label>
              <select 
                value={role} 
                onChange={e => setRole(e.target.value)}
                className="input-modern">
                <option value="manager">Hiring Manager</option>
                <option value="candidate">Candidate</option>
                <option value="agency">Recruitment Agency</option>
              </select>
            </div>
            <button type="submit" disabled={loading} className="w-full btn-primary">
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          <p className="text-center mt-8 text-gray-600">
            Already have an account?{' '}
            <Link href="/auth/signin" className="text-primary-600 font-semibold hover:text-primary-700">
              Sign in
            </Link>
          </p>
        </div>
      </div>

      <div className="hidden lg:block lg:w-1/2 relative">
        <Image 
          src="https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=2850&q=80" 
          alt="Team collaboration" 
          fill 
          className="object-cover" 
        />
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/90 to-primary-700/90" />
        <div className="absolute inset-0 flex items-center justify-center text-white p-12">
          <div className="max-w-lg">
            <h2 className="text-5xl font-bold mb-6">Join 1,000+ Companies</h2>
            <p className="text-xl opacity-90 mb-8">Transform your hiring process with AI</p>
            <div className="space-y-4">
              {['14-day free trial', 'No credit card required', 'Cancel anytime'].map((item, i) => (
                <div key={i} className="flex items-center gap-3 bg-white/10 backdrop-blur-lg rounded-xl p-4">
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">✓</div>
                  <span className="font-semibold">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
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
import { Briefcase, Users, BarChart3, LogOut, Brain } from 'lucide-react'

export default function ManagerLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null)
  const router = useRouter()

  useEffect(() => {
    checkUser()
  }, [])

  async function checkUser() {
    try {
      const { data: { user: authUser }, error } = await createClient().auth.getUser()
      if (error || !authUser) return router.push('/auth/signin')
      
      const userRole = authUser.user_metadata?.role || 'manager'
      if (userRole !== 'manager') return router.push('/auth/signin')
      
      setUser({ id: authUser.id, name: authUser.user_metadata?.name || authUser.email?.split('@')[0] })
    } catch {
      router.push('/auth/signin')
    }
  }

  async function handleSignOut() {
    await createClient().auth.signOut()
    router.push('/')
  }

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary-600" />
    </div>
  )

  const navItems = [
    { label: 'Dashboard', href: '/dashboard/manager', icon: BarChart3 },
    { label: 'Jobs', href: '/dashboard/manager/jobs', icon: Briefcase },
    { label: 'Candidates', href: '/dashboard/manager/candidates', icon: Users },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b fixed w-full z-30 shadow-sm">
        <div className="px-6 flex justify-between h-16 items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-600 to-indigo-600 rounded-xl flex items-center justify-center">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-primary-600 to-indigo-600 bg-clip-text text-transparent">
              TalentDetector AI
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm font-semibold text-gray-700">{user.name}</span>
            <button onClick={handleSignOut} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <LogOut className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>
      </nav>

      <div className="flex pt-16">
        <aside className="w-64 bg-white border-r fixed h-full shadow-sm">
          <div className="p-4 space-y-2">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <motion.div 
                  whileHover={{ x: 4 }}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-primary-50 text-gray-700 hover:text-primary-700 transition-all">
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </motion.div>
              </Link>
            ))}
          </div>
        </aside>

        <main className="ml-64 flex-1 p-8">{children}</main>
      </div>
    </div>
  )
}
ENDFILE

cat > app/dashboard/manager/page.tsx << 'ENDFILE'
'use client'
import { motion } from 'framer-motion'

export default function ManagerDashboard() {
  return (
    <div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-600 to-indigo-600 bg-clip-text text-transparent mb-8">
          Manager Dashboard
        </h1>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { label: 'Active Jobs', value: '0', color: 'from-primary-500 to-primary-600' },
            { label: 'Candidates', value: '0', color: 'from-indigo-500 to-indigo-600' },
            { label: 'Interviews', value: '0', color: 'from-emerald-500 to-emerald-600' }
          ].map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1 }}
              className="card">
              <h3 className="font-semibold text-gray-600 mb-2">{stat.label}</h3>
              <p className={`text-4xl font-bold bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>
                {stat.value}
              </p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
ENDFILE

cat > README.md << 'ENDFILE'
# TalentDetector AI - Market-Researched Premium Design

## Design Research
Inspired by leading platforms:
- **Lever**: Clean, modern navigation
- **Greenhouse**: Professional color palette
- **Workday**: Enterprise-grade UI
- **LinkedIn Talent**: Engaging landing page

## Features
✅ Premium UI/UX design
✅ Real human backgrounds
✅ Professional color scheme (Blue/Indigo/Emerald)
✅ Smooth animations
✅ Role-based authentication
✅ Responsive design
✅ Production-ready

## Run
