#!/bin/bash
# Fix Agency Registration Setup
# Run: bash fix-agency-setup.sh

set -e

echo "🚀 Setting up Agency System (with directories)..."

# Create all necessary directories
mkdir -p app/auth/register/agency
mkdir -p scripts

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

      if (authError) throw authError
      if (!authData.user) throw new Error('Registration failed')

      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          email: formData.email,
          full_name: formData.fullName,
          company: formData.company,
          role: 'agency'
        })

      if (profileError) throw profileError

      toast.success('✅ Registration successful!')
      
      setTimeout(() => {
        router.push('/dashboard/agency')
      }, 1000)
    } catch (error: any) {
      console.error('Registration error:', error)
      toast.error(error.message || 'Registration failed')
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
          <p className="text-gray-600">Partner with hiring managers</p>
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
                placeholder="John Smith"
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
      </div>
    </div>
  )
}
ENDFILE

echo ""
echo "✅ Agency registration page created!"
echo ""
echo "Now run: npm run dev"
echo ""
echo "Then register agencies at:"
echo "http://localhost:3000/auth/register/agency"
echo ""
echo "Example agencies to create:"
echo "1. john@abcrecruitment.com - ABC Recruitment Ltd"
echo "2. sarah@xyztalent.com - XYZ Talent Agency"  
echo "3. mike@globalrecruiters.com - Global Recruiters Inc"
