#!/bin/bash
# Agency Registration & Test Data Setup
# Run: bash setup-agencies.sh

set -e

echo "🚀 Setting up Agency System..."

# ==================== AGENCY REGISTRATION PAGE ====================

cat > app/auth/register/agency/page.tsx << 'ENDFILE'
'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Building2, Mail, Lock, User, Loader2 } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'

export default function AgencyRegister() {
  const [formData, setFormData] = useState({
    fullName: '',
    company: '',
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
      
      console.log('Starting agency registration for:', formData.email)
      
      // 1. Sign up the user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            role: 'agency'
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
          company: formData.company,
          role: 'agency'
        })

      if (profileError) {
        console.error('Profile error:', profileError)
        throw profileError
      }

      console.log('Agency profile created')

      toast.success('✅ Registration successful! Please check your email to verify.')
      
      // Wait a bit for everything to process
      setTimeout(() => {
        router.push('/dashboard/agency')
      }, 1000)
    } catch (error: any) {
      console.error('Registration error:', error)
      toast.error(error.message || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-blue-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent mb-2">
            Join as Recruitment Agency
          </h1>
          <p className="text-gray-600">Partner with hiring managers to find top talent</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2">Full Name *</label>
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
            <label className="block text-sm font-semibold mb-2">Company Name *</label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={formData.company}
                onChange={e => setFormData({...formData, company: e.target.value})}
                className="input pl-10"
                placeholder="ABC Recruitment Ltd"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Email *</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
                className="input pl-10"
                placeholder="john@abcrecruitment.com"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Password *</label>
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
            <label className="block text-sm font-semibold mb-2">Confirm Password *</label>
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
            className="w-full bg-gradient-to-r from-indigo-600 to-blue-600 text-white py-3 rounded-xl font-bold hover:opacity-90 transition flex items-center justify-center gap-2">
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Creating account...
              </>
            ) : (
              'Create Agency Account'
            )}
          </button>
        </form>

        <p className="text-center text-sm text-gray-600 mt-6">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-indigo-600 font-semibold hover:underline">
            Sign In
          </Link>
        </p>
        
        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500">Or register as:</p>
          <div className="flex gap-2 justify-center mt-2">
            <Link href="/auth/register/candidate" className="text-xs text-blue-600 hover:underline">
              Candidate
            </Link>
            <span className="text-gray-400">•</span>
            <Link href="/auth/register/manager" className="text-xs text-emerald-600 hover:underline">
              Hiring Manager
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
ENDFILE

# ==================== CREATE TEST DATA SCRIPT ====================

cat > scripts/create-test-agencies.sql << 'ENDFILE'
-- Create test agencies (run this in Supabase SQL Editor)
-- Note: Replace with actual user IDs after they sign up

-- First, you'll need to manually create agency accounts via the registration page
-- Then you can verify them here

-- Check existing agencies
SELECT id, email, full_name, company, role 
FROM profiles 
WHERE role = 'agency';

-- If you want to manually convert an existing user to an agency:
-- UPDATE profiles SET role = 'agency', company = 'Test Agency Ltd' WHERE email = 'test@agency.com';
ENDFILE

# ==================== ADD LINK TO LANDING PAGE ====================

cat > app/page.tsx << 'ENDFILE'
'use client'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Briefcase, Users, Building2, TrendingUp, Sparkles } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16">
          <h1 className="text-6xl font-bold mb-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
            TalentDetector AI
          </h1>
          <p className="text-2xl text-gray-600 mb-8">
            AI-Powered Recruitment Platform
          </p>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto">
            Connect hiring managers, recruitment agencies, and talented candidates with intelligent matching and automated workflows
          </p>
        </motion.div>

        {/* Role Selection Cards */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* Hiring Manager */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl p-8 shadow-xl hover:shadow-2xl transition">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mb-6">
              <Briefcase className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-2xl font-bold mb-4 text-gray-900">Hiring Manager</h3>
            <p className="text-gray-600 mb-6">
              Post jobs, manage agencies, and find the perfect candidates with AI-powered insights
            </p>
            <div className="space-y-3">
              <Link href="/auth/register/manager">
                <button className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-xl font-bold hover:opacity-90 transition">
                  Get Started
                </button>
              </Link>
              <Link href="/auth/login">
                <button className="w-full border-2 border-blue-600 text-blue-600 py-3 rounded-xl font-bold hover:bg-blue-50 transition">
                  Sign In
                </button>
              </Link>
            </div>
          </motion.div>

          {/* Agency */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl p-8 shadow-xl hover:shadow-2xl transition">
            <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center mb-6">
              <Building2 className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-2xl font-bold mb-4 text-gray-900">Recruitment Agency</h3>
            <p className="text-gray-600 mb-6">
              Access job opportunities, submit candidates, and earn competitive commissions
            </p>
            <div className="space-y-3">
              <Link href="/auth/register/agency">
                <button className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-xl font-bold hover:opacity-90 transition">
                  Get Started
                </button>
              </Link>
              <Link href="/auth/login">
                <button className="w-full border-2 border-indigo-600 text-indigo-600 py-3 rounded-xl font-bold hover:bg-indigo-50 transition">
                  Sign In
                </button>
              </Link>
            </div>
          </motion.div>

          {/* Candidate */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-2xl p-8 shadow-xl hover:shadow-2xl transition">
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-600 to-green-600 rounded-2xl flex items-center justify-center mb-6">
              <Users className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-2xl font-bold mb-4 text-gray-900">Candidate</h3>
            <p className="text-gray-600 mb-6">
              Find your dream job with AI matching, CV builder, and interview preparation tools
            </p>
            <div className="space-y-3">
              <Link href="/auth/register/candidate">
                <button className="w-full bg-gradient-to-r from-emerald-600 to-green-600 text-white py-3 rounded-xl font-bold hover:opacity-90 transition">
                  Get Started
                </button>
              </Link>
              <Link href="/auth/login">
                <button className="w-full border-2 border-emerald-600 text-emerald-600 py-3 rounded-xl font-bold hover:bg-emerald-50 transition">
                  Sign In
                </button>
              </Link>
            </div>
          </motion.div>
        </div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-20 text-center">
          <h2 className="text-3xl font-bold mb-12 text-gray-900">Powered by AI</h2>
          <div className="grid md:grid-cols-4 gap-8 max-w-6xl mx-auto">
            {[
              { icon: Sparkles, title: 'AI Matching', desc: 'Intelligent candidate-job matching' },
              { icon: TrendingUp, title: 'Analytics', desc: 'Real-time hiring insights' },
              { icon: Users, title: 'Collaboration', desc: 'Seamless agency-manager workflow' },
              { icon: Briefcase, title: 'Automation', desc: 'Automated screening & scheduling' }
            ].map((feature, i) => (
              <div key={i} className="text-center">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <feature.icon className="w-6 h-6 text-indigo-600" />
                </div>
                <h4 className="font-bold text-gray-900 mb-2">{feature.title}</h4>
                <p className="text-sm text-gray-600">{feature.desc}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
ENDFILE

echo ""
echo "✅ Agency System Setup Complete!"
echo ""
echo "STEPS TO CREATE AGENCIES:"
echo ""
echo "1. Go to: http://localhost:3000/auth/register/agency"
echo "2. Fill in agency details:"
echo "   - Full Name: John Smith"
echo "   - Company: ABC Recruitment Ltd"
echo "   - Email: john@abcrecruitment.com"
echo "   - Password: password123"
echo ""
echo "3. Repeat for multiple agencies:"
echo "   - XYZ Talent Agency"
echo "   - Global Recruiters Inc"
echo "   - Tech Staffing Solutions"
echo ""
echo "4. Go to /dashboard/manager/agencies to see them!"
echo ""
echo "Or use the landing page at: http://localhost:3000"
echo ""
echo "Run: npm run dev"
