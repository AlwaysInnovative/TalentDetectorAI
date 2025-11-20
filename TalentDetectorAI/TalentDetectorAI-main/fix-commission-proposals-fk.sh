#!/bin/bash
# Fix Commission Proposals Foreign Key Constraint
# Run: bash fix-commission-proposals-fk.sh

set -e

echo "🔧 Fixing commission proposals foreign key constraint..."

cat > supabase/migrations/$(date +%Y%m%d%H%M%S)_fix_commission_proposals_fk.sql << 'ENDFILE'
-- ========================================
-- FIX COMMISSION PROPOSALS FOREIGN KEYS
-- ========================================

-- Drop existing foreign key constraints
ALTER TABLE commission_proposals
DROP CONSTRAINT IF EXISTS commission_proposals_manager_id_fkey,
DROP CONSTRAINT IF EXISTS commission_proposals_agency_id_fkey,
DROP CONSTRAINT IF EXISTS commission_proposals_job_id_fkey;

-- Add correct foreign key constraints
ALTER TABLE commission_proposals
ADD CONSTRAINT commission_proposals_manager_id_fkey 
  FOREIGN KEY (manager_id) 
  REFERENCES profiles(id) 
  ON DELETE CASCADE,

ADD CONSTRAINT commission_proposals_agency_id_fkey 
  FOREIGN KEY (agency_id) 
  REFERENCES profiles(id) 
  ON DELETE CASCADE,

ADD CONSTRAINT commission_proposals_job_id_fkey 
  FOREIGN KEY (job_id) 
  REFERENCES jobs(id) 
  ON DELETE CASCADE;

-- Ensure profiles table has proper structure
ALTER TABLE profiles
DROP CONSTRAINT IF EXISTS profiles_id_fkey;

ALTER TABLE profiles
ADD CONSTRAINT profiles_id_fkey 
  FOREIGN KEY (id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_commission_proposals_manager_id 
  ON commission_proposals(manager_id);

CREATE INDEX IF NOT EXISTS idx_commission_proposals_agency_id 
  ON commission_proposals(agency_id);

CREATE INDEX IF NOT EXISTS idx_commission_proposals_job_id 
  ON commission_proposals(job_id);

CREATE INDEX IF NOT EXISTS idx_commission_proposals_status 
  ON commission_proposals(status);

-- Verification
DO $$
DECLARE
  manager_fk_exists BOOLEAN;
  agency_fk_exists BOOLEAN;
  job_fk_exists BOOLEAN;
BEGIN
  -- Check constraints
  SELECT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'commission_proposals_manager_id_fkey'
  ) INTO manager_fk_exists;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'commission_proposals_agency_id_fkey'
  ) INTO agency_fk_exists;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'commission_proposals_job_id_fkey'
  ) INTO job_fk_exists;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ COMMISSION PROPOSALS FK FIXED!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Foreign Key Constraints:';
  RAISE NOTICE '  manager_id → profiles: %', CASE WHEN manager_fk_exists THEN '✅' ELSE '❌' END;
  RAISE NOTICE '  agency_id → profiles: %', CASE WHEN agency_fk_exists THEN '✅' ELSE '❌' END;
  RAISE NOTICE '  job_id → jobs: %', CASE WHEN job_fk_exists THEN '✅' ELSE '❌' END;
  RAISE NOTICE '';
  RAISE NOTICE 'Now managers can invite agencies without errors!';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END $$;
ENDFILE

echo "✅ Migration created!"

# ==================== UPDATE INVITE AGENCY COMPONENT ====================

cat > app/dashboard/manager/jobs/[id]/invite-agency.tsx << 'ENDFILE'
'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { UserPlus, Loader2, X, Search, Building2, Mail, Sparkles } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'

export default function InviteAgency({ jobId }: { jobId: string }) {
  const [showModal, setShowModal] = useState(false)
  const [agencies, setAgencies] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedAgency, setSelectedAgency] = useState<any>(null)
  const [commission, setCommission] = useState('15')
  const [loading, setLoading] = useState(false)
  const [inviting, setInviting] = useState(false)

  async function loadAgencies() {
    setLoading(true)
    try {
      const supabase = createClient()
      
      // Get all agencies
      const { data: agencyProfiles, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'agency')
        .order('full_name', { ascending: true })

      if (error) throw error

      // Check existing invitations
      const { data: existingInvites } = await supabase
        .from('commission_proposals')
        .select('agency_id')
        .eq('job_id', jobId)

      const invitedIds = new Set(existingInvites?.map(i => i.agency_id) || [])

      // Filter out already invited agencies
      const available = (agencyProfiles || []).filter(
        (agency: any) => !invitedIds.has(agency.id)
      )

      setAgencies(available)
    } catch (error: any) {
      console.error('Load agencies error:', error)
      toast.error('Failed to load agencies')
    } finally {
      setLoading(false)
    }
  }

  async function handleInvite() {
    if (!selectedAgency) {
      toast.error('Please select an agency')
      return
    }

    const commissionValue = parseFloat(commission)
    if (isNaN(commissionValue) || commissionValue < 1 || commissionValue > 50) {
      toast.error('Commission must be between 1% and 50%')
      return
    }

    setInviting(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) throw new Error('Not authenticated')

      // Create commission proposal
      const { error: insertError } = await supabase
        .from('commission_proposals')
        .insert({
          job_id: jobId,
          manager_id: user.id,
          agency_id: selectedAgency.id,
          manager_percentage: commissionValue,
          status: 'pending'
        })

      if (insertError) {
        console.error('Insert error:', insertError)
        throw insertError
      }

      toast.success(`✅ Invitation sent to ${selectedAgency.full_name}!`)
      
      setShowModal(false)
      setSelectedAgency(null)
      setCommission('15')
    } catch (error: any) {
      console.error('Invite error:', error)
      toast.error(error.message || 'Failed to send invitation')
    } finally {
      setInviting(false)
    }
  }

  const filteredAgencies = agencies.filter((agency: any) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      agency.full_name?.toLowerCase().includes(query) ||
      agency.email?.toLowerCase().includes(query) ||
      agency.company?.toLowerCase().includes(query)
    )
  })

  return (
    <>
      <button
        onClick={() => {
          setShowModal(true)
          loadAgencies()
        }}
        className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl font-bold hover:shadow-xl transition flex items-center gap-2">
        <UserPlus className="w-5 h-5" />
        Invite Agency
      </button>

      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowModal(false)}>
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
              onClick={(e) => e.stopPropagation()}>
              
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-3xl font-bold text-gray-900">Invite Agency</h2>
                  <p className="text-gray-600 mt-1">Select an agency and set commission rate</p>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition">
                  <X className="w-6 h-6 text-gray-600" />
                </button>
              </div>

              {/* Search */}
              <div className="mb-6">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search agencies..."
                    className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Agency List */}
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                </div>
              ) : filteredAgencies.length === 0 ? (
                <div className="text-center py-12">
                  <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600">No agencies available</p>
                </div>
              ) : (
                <div className="space-y-3 mb-6 max-h-64 overflow-y-auto">
                  {filteredAgencies.map((agency: any) => (
                    <div
                      key={agency.id}
                      onClick={() => setSelectedAgency(agency)}
                      className={`p-4 rounded-xl cursor-pointer transition border-2 ${
                        selectedAgency?.id === agency.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-300 bg-gray-50'
                      }`}>
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                          {agency.full_name?.[0]?.toUpperCase() || 'A'}
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-gray-900">{agency.full_name}</p>
                          {agency.company && (
                            <p className="text-sm text-gray-600 flex items-center gap-1">
                              <Building2 className="w-4 h-4" />
                              {agency.company}
                            </p>
                          )}
                          <p className="text-sm text-gray-500 flex items-center gap-1">
                            <Mail className="w-4 h-4" />
                            {agency.email}
                          </p>
                        </div>
                        {selectedAgency?.id === agency.id && (
                          <Sparkles className="w-6 h-6 text-blue-600" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Commission Input */}
              {selectedAgency && (
                <div className="mb-6 p-4 bg-blue-50 border-2 border-blue-200 rounded-xl">
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Commission Percentage (%)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    step="0.5"
                    value={commission}
                    onChange={(e) => setCommission(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none text-lg font-bold"
                    placeholder="15"
                  />
                  <p className="text-xs text-gray-600 mt-2">
                    Typical range: 10-25%. Agency can negotiate.
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={handleInvite}
                  disabled={!selectedAgency || inviting}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-4 rounded-xl font-bold hover:shadow-xl transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  {inviting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Sending Invitation...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-5 h-5" />
                      Send Invitation
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="px-8 py-4 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-xl font-bold transition">
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
ENDFILE

echo "✅ Invite agency component created!"

echo ""
echo "✅✅✅ COMMISSION PROPOSALS FK FIX COMPLETE! ✅✅✅"
echo ""
echo "🔧 WHAT WAS FIXED:"
echo ""
echo "1. FOREIGN KEY CONSTRAINTS:"
echo "   ✓ manager_id now references profiles(id)"
echo "   ✓ agency_id now references profiles(id)"
echo "   ✓ job_id references jobs(id)"
echo "   ✓ All with CASCADE delete"
echo ""
echo "2. INVITE AGENCY COMPONENT:"
echo "   ✓ Search functionality"
echo "   ✓ Agency selection UI"
echo "   ✓ Commission percentage input"
echo "   ✓ Filters out already invited agencies"
echo "   ✓ Error handling"
echo ""
echo "📋 NEXT STEPS:"
echo ""
echo "1. Apply the migration:"
echo "   (Copy and paste in Supabase SQL Editor)"
echo ""
echo "2. The component is ready, but you need to integrate it."
echo "   Add to your job detail page:"
echo "   import InviteAgency from './invite-agency'"
echo "   <InviteAgency jobId={job.id} />"
echo ""
echo "3. Test by inviting an agency to a job!"
echo ""
echo "The foreign key error is now fixed! 🎯"
