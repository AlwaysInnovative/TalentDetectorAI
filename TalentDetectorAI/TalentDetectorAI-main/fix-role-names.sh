#!/bin/bash
# Fix All References from 'manager' to 'hiring_manager'
# Run: bash fix-role-names.sh

set -e

echo "🔧 Fixing role references: 'manager' → 'hiring_manager'..."

# ==================== FIX RLS POLICIES ====================

cat > supabase/migrations/$(date +%Y%m%d%H%M%S)_fix_role_names.sql << 'ENDFILE'
-- Drop existing policies
DROP POLICY IF EXISTS "allow_select_all_managers" ON profiles;

-- Create correct policy for hiring_manager role
CREATE POLICY "allow_select_all_hiring_managers"
ON profiles FOR SELECT
TO authenticated
USING (role = 'hiring_manager');

-- Verify all roles in the system
-- Expected roles: 'hiring_manager', 'agency', 'candidate'
ENDFILE

# ==================== FIX MANAGER AGENCIES PAGE ====================

cat > app/dashboard/manager/agencies/page.tsx << 'ENDFILE'
'use client'
import { useState, useEffect } from 'react'
import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'
import { Building2, UserCheck, Percent, Plus, Users, Loader2, UserPlus, RefreshCw } from 'lucide-react'
import DynamicBackground from '@/components/ui/DynamicBackground'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import Link from 'next/link'

const fetcher = async () => {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  console.log('Current user:', user?.id)
  
  const [agenciesRes, jobsRes, proposalsRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('role', 'agency').order('created_at', { ascending: false }),
    supabase.from('jobs').select('*').eq('manager_id', user?.id || '').eq('status', 'open'),
    supabase.from('commission_proposals').select('*, profiles!commission_proposals_agency_id_fkey(*), jobs(*)').eq('manager_id', user?.id || '')
  ])
  
  console.log('✅ Agencies fetched:', agenciesRes.data?.length, agenciesRes.data)
  console.log('✅ Jobs fetched:', jobsRes.data?.length)
  
  return {
    agencies: agenciesRes.data || [],
    jobs: jobsRes.data || [],
    proposals: proposalsRes.data || []
  }
}

export default function AgenciesPage() {
  const { data, mutate, isLoading } = useSWR('manager-agencies', fetcher, { 
    refreshInterval: 3000,
    revalidateOnFocus: true,
    revalidateOnReconnect: true
  })
  const [selectedAgency, setSelectedAgency] = useState<any>(null)
  const [selectedJob, setSelectedJob] = useState('')
  const [percentage, setPercentage] = useState(15)
  const [inviting, setInviting] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    
    const channel = supabase
      .channel('profiles-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'profiles',
        filter: 'role=eq.agency'
      }, (payload) => {
        console.log('🔔 Real-time profile change:', payload)
        toast.success('🔔 New agency registered!')
        mutate()
      })
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [mutate])

  async function handleRefresh() {
    setRefreshing(true)
    await mutate()
    toast.success('✅ List refreshed!')
    setTimeout(() => setRefreshing(false), 500)
  }

  async function handleInviteAgency() {
    if (!selectedAgency || !selectedJob) {
      toast.error('Select both agency and job')
      return
    }

    setInviting(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      const { error } = await supabase.from('commission_proposals').insert({
        job_id: selectedJob,
        agency_id: selectedAgency.id,
        manager_id: user?.id,
        manager_percentage: percentage,
        status: 'pending'
      })

      if (error) throw error

      await supabase.from('notifications').insert({
        user_id: selectedAgency.id,
        type: 'commission_proposal',
        title: 'New Job Opportunity',
        message: `Commission proposal: ${percentage}%`,
        data: { job_id: selectedJob }
      })

      toast.success('✅ Invitation sent to agency!')
      setSelectedAgency(null)
      setSelectedJob('')
      mutate()
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setInviting(false)
    }
  }

  async function handleProposalResponse(proposalId: string, action: 'accept') {
    const supabase = createClient()
    
    const proposal = data?.proposals.find((p: any) => p.id === proposalId)
    const { error } = await supabase
      .from('commission_proposals')
      .update({ 
        status: 'accepted',
        agreed_percentage: proposal?.proposed_percentage || proposal?.manager_percentage,
        agreed_at: new Date().toISOString()
      })
      .eq('id', proposalId)
    
    if (error) {
      toast.error('Failed to accept')
    } else {
      toast.success('✅ Proposal accepted!')
      mutate()
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="relative">
      <DynamicBackground page="agencies" />
      
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Agency Management</h1>
          <p className="text-gray-600">
            {data?.agencies?.length || 0} registered {data?.agencies?.length === 1 ? 'agency' : 'agencies'}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-4 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-xl font-bold shadow hover:bg-gray-50 transition flex items-center gap-2">
            <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <Link href="/auth/register/agency" target="_blank">
            <button className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl font-bold shadow-lg flex items-center gap-2 hover:opacity-90">
              <UserPlus className="w-5 h-5" /> Register New Agency
            </button>
          </Link>
        </div>
      </div>

      {/* Quick Debug Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <p className="text-sm font-mono text-blue-900">
          Debug: Found {data?.agencies?.length || 0} agencies | 
          {data?.agencies?.map((a: any) => ` ${a.full_name}`).join(', ') || ' None'}
        </p>
        <Link href="/dashboard/manager/agencies/debug" className="text-xs text-blue-600 hover:underline">
          View Full Debug Info →
        </Link>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Available Agencies</h2>
            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-bold">
              {data?.agencies?.length || 0} total
            </span>
          </div>
          
          {data?.agencies && data.agencies.length > 0 ? (
            <div className="space-y-4">
              {data.agencies.map((agency: any) => (
                <motion.div
                  key={agency.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ scale: 1.02 }}
                  onClick={() => setSelectedAgency(agency)}
                  className={'bg-white rounded-xl p-6 shadow-lg cursor-pointer transition border-2 ' +
                    (selectedAgency?.id === agency.id ? 'border-blue-600 ring-2 ring-blue-600/20' : 'border-transparent hover:border-blue-200')}>
                  
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg">
                      <Building2 className="w-8 h-8 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900">{agency.full_name}</h3>
                      <p className="text-sm text-gray-600 mt-1">{agency.email}</p>
                      {agency.company && (
                        <p className="text-sm text-blue-600 mt-2 font-semibold flex items-center gap-1">
                          <Building2 className="w-4 h-4" />
                          {agency.company}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 mt-2">
                        Registered: {new Date(agency.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    {selectedAgency?.id === agency.id && (
                      <div className="flex flex-col items-center gap-2">
                        <UserCheck className="w-8 h-8 text-emerald-600" />
                        <span className="text-xs font-bold text-emerald-600">Selected</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl p-12 text-center shadow-lg border-2 border-dashed border-gray-300">
              <Building2 className="w-20 h-20 text-gray-300 mx-auto mb-4" />
              <p className="text-xl text-gray-600 mb-4 font-semibold">No agencies registered yet</p>
              <p className="text-sm text-gray-500 mb-6">Register agencies to build your recruitment network</p>
              <Link href="/auth/register/agency" target="_blank">
                <button className="btn-primary flex items-center gap-2 mx-auto">
                  <Plus className="w-5 h-5" /> Register First Agency
                </button>
              </Link>
            </div>
          )}
        </div>

        <div className="sticky top-4">
          <div className="bg-white rounded-xl p-6 shadow-lg border-2 border-gray-200">
            <h2 className="text-2xl font-bold mb-6">Invite Agency to Job</h2>

            {selectedAgency ? (
              <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border-2 border-blue-200">
                <p className="text-sm text-blue-900 font-semibold mb-2">✅ Selected Agency:</p>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-blue-600">{selectedAgency.full_name}</p>
                    <p className="text-xs text-blue-700">{selectedAgency.company}</p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 mb-4 p-4 bg-gray-50 rounded-lg text-center">
                ← Select an agency from the list
              </p>
            )}

            <div className="mb-4">
              <label className="block text-sm font-semibold mb-2">Select Job *</label>
              <select value={selectedJob} onChange={(e) => setSelectedJob(e.target.value)} className="input">
                <option value="">Choose a job...</option>
                {data?.jobs?.map((job: any) => (
                  <option key={job.id} value={job.id}>{job.title} - {job.location}</option>
                ))}
              </select>
              {(!data?.jobs || data.jobs.length === 0) && (
                <p className="text-xs text-amber-600 mt-2">
                  No open jobs. <Link href="/dashboard/manager/jobs/create" className="underline font-semibold">Post a job first</Link>
                </p>
              )}
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold mb-2">Commission Percentage</label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="5"
                  max="25"
                  value={percentage}
                  onChange={(e) => setPercentage(parseInt(e.target.value))}
                  className="flex-1"
                />
                <div className="px-5 py-3 bg-gradient-to-br from-emerald-100 to-green-100 text-emerald-700 rounded-xl font-bold text-2xl min-w-[90px] text-center border-2 border-emerald-300 shadow">
                  {percentage}%
                </div>
              </div>
            </div>

            <button
              onClick={handleInviteAgency}
              disabled={inviting || !selectedAgency || !selectedJob}
              className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50">
              {inviting ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Sending...</>
              ) : (
                <><Percent className="w-5 h-5" /> Send Invitation ({percentage}%)</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
ENDFILE

# ==================== FIX MANAGER REGISTRATION ====================

cat > app/auth/register/manager/page.tsx << 'ENDFILE'
'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Briefcase, Mail, Lock, User, Loader2, ArrowRight, CheckCircle, Building2, TrendingUp, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'

export default function ManagerRegister() {
  const [formData, setFormData] = useState({ fullName: '', company: '', email: '', password: '', confirmPassword: '' })
  const [loading, setLoading] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [showSuccess, setShowSuccess] = useState(false)

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
          data: { full_name: formData.fullName, role: 'hiring_manager' },
          emailRedirectTo: `${window.location.origin}/auth/signin`
        }
      })
      if (authError) throw authError
      await supabase.from('profiles').insert({
        id: authData.user!.id,
        email: formData.email,
        full_name: formData.fullName,
        company: formData.company,
        role: 'hiring_manager'
      })
      setShowSuccess(true)
    } catch (error: any) {
      toast.error(error.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const steps = [ { number: 1, title: 'Personal Info', icon: User }, { number: 2, title: 'Company', icon: Building2 }, { number: 3, title: 'Security', icon: Lock } ]

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-900 to-green-900 flex items-center justify-center p-4">
        <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="bg-white rounded-3xl p-12 max-w-2xl text-center">
          <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6"><CheckCircle className="w-14 h-14 text-white" /></div>
          <h1 className="text-4xl font-bold mb-4">Welcome! 🎉</h1>
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6 mb-6">
            <p className="text-sm text-blue-800 mb-2">Verification email sent to:</p>
            <p className="font-bold text-blue-600">{formData.email}</p>
          </div>
          <Link href="/auth/signin"><button className="btn-primary">Go to Sign In <ArrowRight className="w-5 h-5 inline" /></button></Link>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-900 to-green-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-10 max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4"><Briefcase className="w-10 h-10 text-white" /></div>
          <h2 className="text-3xl font-bold mb-2">Create Manager Account</h2>
          <p className="text-gray-600">Start posting jobs</p>
        </div>
        <form onSubmit={handleRegister} className="space-y-4">
          <AnimatePresence mode="wait">
            {currentStep === 1 && (
              <motion.div key="1" initial={{ x: 20 }} animate={{ x: 0 }} exit={{ x: -20 }}>
                <input type="text" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} className="input" placeholder="Full Name" required />
                <button type="button" onClick={() => formData.fullName && setCurrentStep(2)} className="w-full btn-primary mt-4">Continue</button>
              </motion.div>
            )}
            {currentStep === 2 && (
              <motion.div key="2" initial={{ x: 20 }} animate={{ x: 0 }} exit={{ x: -20 }}>
                <input type="text" value={formData.company} onChange={e => setFormData({...formData, company: e.target.value})} className="input" placeholder="Company Name" required />
                <div className="flex gap-2 mt-4">
                  <button type="button" onClick={() => setCurrentStep(1)} className="flex-1 btn-secondary">Back</button>
                  <button type="button" onClick={() => formData.company && setCurrentStep(3)} className="flex-1 btn-primary">Continue</button>
                </div>
              </motion.div>
            )}
            {currentStep === 3 && (
              <motion.div key="3" initial={{ x: 20 }} animate={{ x: 0 }} exit={{ x: -20 }} className="space-y-4">
                <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="input" placeholder="Email" required />
                <input type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="input" placeholder="Password" required minLength={6} />
                <input type="password" value={formData.confirmPassword} onChange={e => setFormData({...formData, confirmPassword: e.target.value})} className="input" placeholder="Confirm Password" required minLength={6} />
                <div className="flex gap-2">
                  <button type="button" onClick={() => setCurrentStep(2)} className="flex-1 btn-secondary">Back</button>
                  <button type="submit" disabled={loading} className="flex-1 btn-primary">{loading ? 'Creating...' : 'Create Account'}</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </form>
        <p className="text-center text-sm text-gray-600 mt-6">Already registered? <Link href="/auth/signin" className="text-emerald-600 font-bold hover:underline">Sign In</Link></p>
      </div>
    </div>
  )
}
ENDFILE

echo ""
echo "✅ All role references fixed!"
echo ""
echo "Fixed:"
echo "✓ RLS policies now check for 'hiring_manager' role"
echo "✓ Manager agencies page updated"
echo "✓ Manager registration creates 'hiring_manager' role"
echo "✓ Added debug info to agencies page"
echo ""
echo "Run:"
echo "npx supabase db push"
echo "npm run dev"
echo ""
echo "Then visit /dashboard/manager/agencies"
echo "You should now see all registered agencies!"
