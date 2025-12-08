#!/bin/bash
# Complete Debug & Fix Agency Job Assignment (with directory creation)
# Run: bash fix-debug-agency.sh

set -e

echo "🔍 Creating Complete Debug & Fix..."

# Create directory
mkdir -p app/dashboard/agency/debug

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
        <h1 className="text-4xl font-bold">🔍 Agency Assignment Debug</h1>
        <button onClick={fetchDebugInfo} disabled={loading} className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700">
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {data && (
        <div className="space-y-6">
          {/* Current User */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
            <h2 className="text-2xl font-bold mb-4 text-blue-900">1️⃣ Current User</h2>
            <div className="bg-white p-4 rounded-lg">
              <p className="font-mono text-sm mb-2"><strong>User ID:</strong> {data.currentUser?.id}</p>
              <p className="font-mono text-sm"><strong>Email:</strong> {data.currentUser?.email}</p>
            </div>
          </div>

          {/* My Profile */}
          <div className="bg-emerald-50 border-2 border-emerald-200 rounded-xl p-6">
            <h2 className="text-2xl font-bold mb-4 text-emerald-900">2️⃣ My Profile</h2>
            <div className="bg-white p-4 rounded-lg">
              <p className="font-mono text-sm mb-2"><strong>Name:</strong> {data.myProfile?.full_name}</p>
              <p className="font-mono text-sm mb-2"><strong>Company:</strong> {data.myProfile?.company}</p>
              <p className="font-mono text-sm mb-2"><strong>Role:</strong> <span className="text-blue-600 font-bold">{data.myProfile?.role}</span></p>
              <p className="font-mono text-sm"><strong>Profile ID:</strong> {data.myProfile?.id}</p>
            </div>
          </div>

          {/* All Proposals in System */}
          <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-6">
            <h2 className="text-2xl font-bold mb-4 text-amber-900">
              3️⃣ All Proposals in System ({data.allProposals.data?.length || 0})
            </h2>
            {data.allProposals.error && (
              <div className="bg-red-100 border border-red-300 text-red-700 p-4 rounded mb-4">
                <strong>❌ Error:</strong> {data.allProposals.error.message}
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
                        Is this for me? {proposal.agency_id === data.currentUser?.id ? '✅ YES - THIS IS FOR YOU!' : '❌ NO - Different agency'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white p-8 rounded-lg text-center text-red-600">
                <p className="text-2xl font-bold mb-2">❌ NO PROPOSALS EXIST</p>
                <p className="text-sm text-gray-600">Manager hasn't assigned any jobs yet</p>
              </div>
            )}
          </div>

          {/* My Proposals */}
          <div className="bg-indigo-50 border-2 border-indigo-200 rounded-xl p-6">
            <h2 className="text-2xl font-bold mb-4 text-indigo-900">
              4️⃣ My Proposals ({data.myProposals.data?.length || 0})
            </h2>
            {data.myProposals.error && (
              <div className="bg-red-100 border border-red-300 text-red-700 p-4 rounded mb-4">
                <strong>❌ Error:</strong> {data.myProposals.error.message}
              </div>
            )}
            {data.myProposals.data && data.myProposals.data.length > 0 ? (
              <div className="space-y-4">
                {data.myProposals.data.map((proposal: any) => (
                  <div key={proposal.id} className="bg-white p-4 rounded-lg border-2 border-indigo-300">
                    <p className="text-lg font-bold text-gray-900 mb-2">✅ {proposal.jobs?.title || 'Job title missing'}</p>
                    <p className="text-sm text-gray-600 mb-1">Status: <strong>{proposal.status}</strong></p>
                    <p className="text-sm text-gray-600 mb-1">Commission: <strong>{proposal.manager_percentage}%</strong></p>
                    <p className="text-sm text-gray-600">From: {proposal.profiles?.full_name || 'Manager name missing'}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white p-8 rounded-lg text-center">
                <p className="text-2xl text-red-600 font-bold mb-4">❌ NO PROPOSALS FOUND FOR YOU</p>
                <div className="text-left bg-gray-50 p-4 rounded font-mono text-sm mb-4">
                  <p className="mb-2"><strong>SQL Query:</strong></p>
                  <p className="text-xs text-gray-600">SELECT * FROM commission_proposals</p>
                  <p className="text-xs text-gray-600">WHERE agency_id = '{data.currentUser?.id}'</p>
                </div>
                <div className="bg-yellow-50 border-2 border-yellow-300 p-4 rounded">
                  <p className="font-bold text-yellow-900 mb-2">Possible Issues:</p>
                  <ul className="text-sm text-yellow-800 text-left space-y-1">
                    <li>• Manager hasn't assigned job to this agency</li>
                    <li>• Agency ID mismatch</li>
                    <li>• RLS policy blocking access</li>
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* Action Items */}
          <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-6">
            <h2 className="text-2xl font-bold mb-4 text-purple-900">📋 What to Check</h2>
            <div className="space-y-3 text-sm">
              <div className="bg-white p-3 rounded">
                <p className="font-bold mb-1">Step 1: Check "All Proposals in System"</p>
                <p className="text-gray-600">If empty → Manager needs to assign jobs</p>
              </div>
              <div className="bg-white p-3 rounded">
                <p className="font-bold mb-1">Step 2: Look for "Is this for me?"</p>
                <p className="text-gray-600">If all say NO → Wrong agency selected by manager</p>
              </div>
              <div className="bg-white p-3 rounded">
                <p className="font-bold mb-1">Step 3: Check "My Proposals"</p>
                <p className="text-gray-600">If empty but proposals exist → RLS issue</p>
              </div>
            </div>
          </div>

          {/* Timestamp */}
          <div className="text-center text-sm text-gray-500">
            🕐 Last updated: {new Date(data.timestamp).toLocaleString()}
          </div>
        </div>
      )}
    </div>
  )
}
ENDFILE

echo ""
echo "✅ Debug page created successfully!"
echo ""
echo "📍 NEXT STEPS:"
echo ""
echo "1. Run: npm run dev"
echo ""
echo "2. As AGENCY user, visit:"
echo "   http://localhost:3000/dashboard/agency/debug"
echo ""
echo "3. Look at the 4 sections:"
echo "   1️⃣ Current User - Your user ID"
echo "   2️⃣ My Profile - Your role (should be 'agency')"
echo "   3️⃣ All Proposals - Are ANY proposals in the system?"
echo "   4️⃣ My Proposals - Proposals assigned to YOU"
echo ""
echo "4. Take a screenshot and share what you see!"
echo ""
echo "This will tell us EXACTLY what the problem is! 🔍"
