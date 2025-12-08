#!/bin/bash
# production-commission-fix.sh
set -e

echo "🚀 Applying production fix for commission_proposals foreign key errors..."

# ============================================================================
# 1. FIX: API ROUTE WITH PROPER FK HANDLING
# ============================================================================

mkdir -p app/api/send-commission-invite

cat > app/api/send-commission-invite/route.ts <<'ENDAPI'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const { manager_id, agency_id, job_id } = await request.json()
    
    if (!manager_id || !agency_id || !job_id) {
      return NextResponse.json({ 
        error: 'Missing required fields' 
      }, { status: 400 })
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Check if manager exists in profiles table (standard Supabase pattern)
    const { data: managerProfile, error: managerErr } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('id', manager_id)
      .single()

    if (managerErr || !managerProfile) {
      return NextResponse.json({ 
        error: 'Manager profile not found. Please ensure you are logged in as a manager.' 
      }, { status: 404 })
    }

    // Check if agency exists
    const { data: agency, error: agencyErr } = await supabaseAdmin
      .from('profiles')
      .select('id, role')
      .eq('id', agency_id)
      .eq('role', 'agency')
      .single()

    if (agencyErr || !agency) {
      return NextResponse.json({ 
        error: 'Agency not found.' 
      }, { status: 404 })
    }

    // Check if job exists
    const { data: job, error: jobErr } = await supabaseAdmin
      .from('jobs')
      .select('id')
      .eq('id', job_id)
      .single()

    if (jobErr || !job) {
      return NextResponse.json({ 
        error: 'Job not found.' 
      }, { status: 404 })
    }

    // Check for existing proposal
    const { data: existing, error: existErr } = await supabaseAdmin
      .from('commission_proposals')
      .select('id, status')
      .eq('manager_id', manager_id)
      .eq('agency_id', agency_id)
      .eq('job_id', job_id)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ 
        error: `A ${existing.status} proposal already exists for this agency and job.` 
      }, { status: 409 })
    }

    // Insert proposal
    const { data, error } = await supabaseAdmin
      .from('commission_proposals')
      .insert({
        manager_id,
        agency_id,
        job_id,
        status: 'pending',
        manager_percentage: '15.00',
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Insert error:', error)
      return NextResponse.json({ 
        error: 'Failed to create proposal. Please try again.' 
      }, { status: 500 })
    }

    // Send notification to agency
    await supabaseAdmin.from('notifications').insert({
      user_id: agency_id,
      type: 'commission_invite',
      title: '📋 New Commission Proposal',
      message: 'You have received a new commission proposal from a manager',
      link: `/dashboard/agency/proposals/${data.id}`,
      ai_priority: 'high',
      metadata: { proposal_id: data.id, manager_id, job_id }
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Invitation sent successfully!',
      data 
    })

  } catch (error: any) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ 
      error: 'An unexpected error occurred.' 
    }, { status: 500 })
  }
}
ENDAPI

echo "✅ API route created with proper FK validation"

# ============================================================================
# 2. FIX: UPDATE EXISTING MANAGER PAGE TO USE NEW API
# ============================================================================

cat > app/dashboard/manager/agencies/send-invite-handler.tsx <<'ENDHANDLER'
'use client'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { Loader2 } from 'lucide-react'

interface SendInviteButtonProps {
  managerId: string
  agencyId: string
  jobId: string
  onSuccess?: () => void
}

export function SendInviteButton({ managerId, agencyId, jobId, onSuccess }: SendInviteButtonProps) {
  const [sending, setSending] = useState(false)

  async function handleSend() {
    setSending(true)
    try {
      const response = await fetch('/api/send-commission-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          manager_id: managerId,
          agency_id: agencyId,
          job_id: jobId
        })
      })

      const result = await response.json()

      if (!response.ok) {
        toast.error(result.error || 'Failed to send invitation')
        return
      }

      toast.success(result.message || 'Invitation sent successfully!')
      if (onSuccess) onSuccess()
    } catch (error) {
      console.error('Send invite error:', error)
      toast.error('Network error. Please check your connection.')
    } finally {
      setSending(false)
    }
  }

  return (
    <button
      onClick={handleSend}
      disabled={sending}
      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition"
    >
      {sending ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Sending...
        </>
      ) : (
        'Send Invite'
      )}
    </button>
  )
}
ENDHANDLER

echo "✅ Send invite button component created"

# ============================================================================
# 3. SQL MIGRATION: Ensure FK references correct table
# ============================================================================

cat > fix-fk-constraint.sql <<'ENDSQL'
-- Drop old constraint if it references non-existent 'managers' table
ALTER TABLE commission_proposals 
DROP CONSTRAINT IF EXISTS commission_proposals_manager_id_fkey;

-- Add correct FK constraint pointing to profiles table
ALTER TABLE commission_proposals 
ADD CONSTRAINT commission_proposals_manager_id_fkey 
FOREIGN KEY (manager_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Ensure indexes for performance
CREATE INDEX IF NOT EXISTS idx_commission_proposals_manager ON commission_proposals(manager_id);
CREATE INDEX IF NOT EXISTS idx_commission_proposals_agency ON commission_proposals(agency_id);
CREATE INDEX IF NOT EXISTS idx_commission_proposals_job ON commission_proposals(job_id);

-- Create unique constraint to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_commission_proposals_unique 
ON commission_proposals(manager_id, agency_id, job_id) 
WHERE status != 'rejected';
ENDSQL

echo "✅ SQL migration file created"

# ============================================================================
# 4. ENVIRONMENT CHECK
# ============================================================================

cat > check-env.sh <<'ENDCHECK'
#!/bin/bash
echo "🔍 Checking environment variables..."

if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
  echo "❌ NEXT_PUBLIC_SUPABASE_URL is not set"
  exit 1
fi

if [ -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY" ]; then
  echo "❌ NEXT_PUBLIC_SUPABASE_ANON_KEY is not set"
  exit 1
fi

if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo "❌ SUPABASE_SERVICE_ROLE_KEY is not set"
  exit 1
fi

echo "✅ All required environment variables are set"
ENDCHECK

chmod +x check-env.sh

echo ""
echo "=========================================="
echo "✅ PRODUCTION FIX COMPLETE!"
echo "=========================================="
echo ""
echo "📋 What was created:"
echo "  1. ✅ /api/send-commission-invite - Production-ready API"
echo "  2. ✅ SendInviteButton component with error handling"
echo "  3. ✅ fix-fk-constraint.sql - Database migration"
echo "  4. ✅ check-env.sh - Environment validator"
echo ""
echo "🚀 Deployment steps:"
echo ""
echo "  1. Run SQL migration in Supabase:"
echo "     - Go to SQL Editor in Supabase Dashboard"
echo "     - Copy contents of fix-fk-constraint.sql"
echo "     - Execute the SQL"
echo ""
echo "  2. Verify environment variables:"
echo "     bash check-env.sh"
echo ""
echo "  3. Import SendInviteButton in your manager page:"
echo "     import { SendInviteButton } from './send-invite-handler'"
echo ""
echo "  4. Use in your page:"
echo "     <SendInviteButton"
echo "       managerId={currentUser.id}"
echo "       agencyId={agency.id}"
echo "       jobId={selectedJob.id}"
echo "     />"
echo ""
echo "  5. Restart your app:"
echo "     npm run dev"
echo ""
echo "🎯 This fix handles:"
echo "  ✅ Missing manager profiles"
echo "  ✅ Duplicate proposals (409)"
echo "  ✅ Foreign key violations"
echo "  ✅ User-friendly error messages"
echo "  ✅ Real-time notifications"
echo ""
echo "💡 All errors now show friendly toast messages instead of raw DB errors!"
