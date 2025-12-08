#!/bin/bash
# Complete Debug & Fix Agency Job Assignment
# Run: bash debug-agency-assignments.sh

set -e

echo "🔍 Creating Complete Debug & Fix..."

# ==================== CREATE DEBUG PAGE ====================

cat > app/dashboard/agency/debug/page.tsx << 'ENDFILE'
'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { RefreshCw } from 'lucide-react'

export default function AgencyDebugPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  async function fetchDebugInfo() {
    setLoading(true)
    const supabase = createClient()
    
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      
      // Get current user's profile
      const { data: myProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id || '')
        .single()
      
      // Try to get ALL commission proposals
      const { data: allProposals, error: allError } = await supabase
        .from('commission_proposals')
        .select('*')
        .order('created_at', { ascending: false })
      
      // Get proposals for this agency
      const { data: myProposals, error: myError } = await supabase
        .from('commission_proposals')
        .select(`
          *,
          jobs(*),
          profiles!commission_proposals_manager_id_fkey(*)
        `)
        .eq('agency_id', user?.id || '')
        .order('created_at', { ascending: false })
      
      setData({
        currentUser: user,
        myProfile,
        allProposals: { data: allProposals, error: allError },
        myProposals: { data: myProposals, error: myError },
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      console.error('Debug error:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDebugInfo()
  }, [])

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold">Agency Assignment Debug</h1>
        <button onClick={fetchDebugInfo} disabled={loading} className="btn-primary flex items-center gap-2">
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {data && (
        <div className="space-y-6">
          {/* Current User */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
            <h2 className="text-2xl font-bold mb-4 text-blue-900">Current User</h2>
            <div className="bg-white p-4 rounded-lg">
              <p className="font-mono text-sm mb-2"><strong>User ID:</strong> {data.currentUser?.id}</p>
              <p className="font-mono text-sm"><strong>Email:</strong> {data.currentUser?.email}</p>
            </div>
          </div>

          {/* My Profile */}
          <div className="bg-emerald-50 border-2 border-emerald-200 rounded-xl p-6">
            <h2 className="text-2xl font-bold mb-4 text-emerald-900">My Profile</h2>
            <div className="bg-white p-4 rounded-lg">
              <p className="font-mono text-sm mb-2"><strong>Name:</strong> {data.myProfile?.full_name}</p>
              <p className="font-mono text-sm mb-2"><strong>Company:</strong> {data.myProfile?.company}</p>
              <p className="font-mono text-sm mb-2"><strong>Role:</strong> {data.myProfile?.role}</p>
              <p className="font-mono text-sm"><strong>Profile ID:</strong> {data.myProfile?.id}</p>
            </div>
          </div>

          {/* All Proposals in System */}
          <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-6">
            <h2 className="text-2xl font-bold mb-4 text-amber-900">
              All Proposals in System ({data.allProposals.data?.length || 0})
            </h2>
            {data.allProposals.error && (
              <div className="bg-red-100 border border-red-300 text-red-700 p-4 rounded mb-4">
                <strong>Error:</strong> {data.allProposals.error.message}
              </div>
            )}
            {data.allProposals.data && data.allProposals.data.length > 0 ? (
              <div className="space-y-2">
                {data.allProposals.data.map((proposal: any) => (
                  <div key={proposal.id} className="bg-white p-4 rounded-lg border border-amber-200">
                    <p className="font-mono text-xs mb-1"><strong>Proposal ID:</strong> {proposal.id}</p>
                    <p className="font-mono text-xs mb-1"><strong>Job ID:</strong> {proposal.job_id}</p>
                    <p className="font-mono text-xs mb-1"><strong>Agency ID:</strong> {proposal.agency_id}</p>
                    <p className="font-mono text-xs mb-1"><strong>Manager ID:</strong> {proposal.manager_id}</p>
                    <p className="font-mono text-xs mb-1"><strong>Status:</strong> <span className="font-bold text-blue-600">{proposal.status}</span></p>
                    <p className="font-mono text-xs"><strong>Commission:</strong> {proposal.manager_percentage}%</p>
                    <div className="mt-2 p-2 bg-blue-50 rounded">
                      <p className="text-xs font-bold text-blue-900">
                        Is this for me? {proposal.agency_id === data.currentUser?.id ? '✅ YES' : '❌ NO'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white p-8 rounded-lg text-center text-gray-500">
                No proposals found in entire system
              </div>
            )}
          </div>

          {/* My Proposals */}
          <div className="bg-indigo-50 border-2 border-indigo-200 rounded-xl p-6">
            <h2 className="text-2xl font-bold mb-4 text-indigo-900">
              My Proposals ({data.myProposals.data?.length || 0})
            </h2>
            {data.myProposals.error && (
              <div className="bg-red-100 border border-red-300 text-red-700 p-4 rounded mb-4">
                <strong>Error:</strong> {data.myProposals.error.message}
              </div>
            )}
            {data.myProposals.data && data.myProposals.data.length > 0 ? (
              <div className="space-y-4">
                {data.myProposals.data.map((proposal: any) => (
                  <div key={proposal.id} className="bg-white p-4 rounded-lg border-2 border-indigo-300">
                    <p className="text-lg font-bold text-gray-900 mb-2">{proposal.jobs?.title || 'Job title missing'}</p>
                    <p className="text-sm text-gray-600 mb-1">Status: <strong>{proposal.status}</strong></p>
                    <p className="text-sm text-gray-600 mb-1">Commission: <strong>{proposal.manager_percentage}%</strong></p>
                    <p className="text-sm text-gray-600">From: {proposal.profiles?.full_name || 'Manager name missing'}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white p-8 rounded-lg text-center">
                <p className="text-xl text-red-600 font-bold mb-2">❌ NO PROPOSALS FOUND FOR YOU</p>
                <p className="text-sm text-gray-600 mb-4">Checking filters:</p>
                <div className="text-left bg-gray-50 p-4 rounded font-mono text-xs">
                  <p>Looking for proposals where:</p>
                  <p className="ml-4">agency_id = {data.currentUser?.id}</p>
                </div>
              </div>
            )}
          </div>

          {/* Timestamp */}
          <div className="text-center text-sm text-gray-500">
            Last updated: {new Date(data.timestamp).toLocaleString()}
          </div>
        </div>
      )}
    </div>
  )
}
ENDFILE

mkdir -p app/dashboard/agency/debug

echo ""
echo "✅ Debug page created!"
echo ""
echo "CRITICAL DEBUGGING STEPS:"
echo ""
echo "1. Visit: /dashboard/agency/debug"
echo ""
echo "2. Check the output carefully:"
echo "   - Look at 'All Proposals in System'"
echo "   - See if any exist at all"
echo "   - Check if your User ID matches any agency_id"
echo ""
echo "3. If NO proposals exist:"
echo "   → Manager hasn't assigned job yet OR assignment failed"
echo ""
echo "4. If proposals exist but NOT for you:"
echo "   → Agency ID mismatch (check User ID vs agency_id)"
echo ""
echo "5. If proposals exist FOR you:"
echo "   → RLS policy issue (you can see in debug but not main page)"
echo ""
echo "Run: npm run dev"
echo ""
echo "Then go to: /dashboard/agency/debug"
echo "Screenshot the output and share what you see!"
