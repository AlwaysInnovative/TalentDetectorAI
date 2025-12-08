#!/bin/bash
# fix-commission-invite-complete.sh
set -e

echo "🔧 Fixing commission invite flow: API keys + FK constraints + duplicates..."

# 1. Fix the API send-invite handler with proper error handling
cat > app/api/send-commission-invite/route.ts <<'ENDAPI'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const { manager_id, agency_id, job_id } = await request.json()
    
    if (!manager_id || !agency_id || !job_id) {
      return NextResponse.json({ 
        error: 'Missing required fields (manager_id, agency_id, job_id)' 
      }, { status: 400 })
    }

    // Use service role key for admin operations
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // 1. Check if manager exists (if FK references managers table)
    const { data: manager } = await supabaseAdmin
      .from('managers')
      .select('id')
      .eq('id', manager_id)
      .single()

    if (!manager) {
      return NextResponse.json({ 
        error: 'Manager not found. Please ensure you are logged in as a manager.' 
      }, { status: 404 })
    }

    // 2. Check if agency exists
    const { data: agency } = await supabaseAdmin
      .from('agencies')
      .select('id')
      .eq('id', agency_id)
      .single()

    if (!agency) {
      return NextResponse.json({ 
        error: 'Agency not found.' 
      }, { status: 404 })
    }

    // 3. Check if job exists
    const { data: job } = await supabaseAdmin
      .from('jobs')
      .select('id')
      .eq('id', job_id)
      .single()

    if (!job) {
      return NextResponse.json({ 
        error: 'Job not found.' 
      }, { status: 404 })
    }

    // 4. Check for duplicate proposal
    const { data: existing } = await supabaseAdmin
      .from('commission_proposals')
      .select('id')
      .eq('manager_id', manager_id)
      .eq('agency_id', agency_id)
      .eq('job_id', job_id)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ 
        error: 'You have already sent an invite to this agency for this job.' 
      }, { status: 409 })
    }

    // 5. Insert the proposal
    const { data, error } = await supabaseAdmin
      .from('commission_proposals')
      .insert({
        manager_id,
        agency_id,
        job_id,
        status: 'pending',
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Insert error:', error)
      return NextResponse.json({ 
        error: 'Failed to send invite. Please try again.' 
      }, { status: 500 })
    }

    // 6. Send notification to agency
    await supabaseAdmin.from('notifications').insert({
      user_id: agency_id,
      type: 'commission_invite',
      title: 'New Commission Proposal',
      message: 'You have received a new commission proposal',
      link: `/dashboard/agency/proposals/${data.id}`,
      ai_priority: 'high'
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Invite sent successfully!',
      data 
    })

  } catch (error: any) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ 
      error: 'An unexpected error occurred. Please try again.' 
    }, { status: 500 })
  }
}
ENDAPI

echo "✅ API handler created with full error handling"

# 2. Fix the client-side button handler
cat > app/dashboard/manager/agencies/send-invite-button.tsx <<'ENDBUTTON'
'use client'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { Loader2 } from 'lucide-react'

export function SendInviteButton({ manager_id, agency_id, job_id }) {
  const [sending, setSending] = useState(false)

  async function handleSendInvite() {
    setSending(true)
    try {
      const response = await fetch('/api/send-commission-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manager_id, agency_id, job_id })
      })

      const result = await response.json()

      if (!response.ok) {
        toast.error(result.error || 'Failed to send invite')
        return
      }

      toast.success(result.message || 'Invite sent successfully!')
    } catch (error) {
      console.error('Send invite error:', error)
      toast.error('Network error. Please check your connection.')
    } finally {
      setSending(false)
    }
  }

  return (
    <button
      onClick={handleSendInvite}
      disabled={sending}
      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold disabled:opacity-50 flex items-center gap-2"
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
ENDBUTTON

echo "✅ Client button component created"

# 3. Create .env.example with required keys
cat > .env.example <<'ENDENV'
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your-project-url.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ENDENV

echo "✅ .env.example created"

echo ""
echo "=========================================="
echo "✅ COMMISSION INVITE FIX COMPLETE!"
echo "=========================================="
echo ""
echo "What was fixed:"
echo "  1. ✅ Proper Supabase client initialization with service role key"
echo "  2. ✅ Check manager_id exists before insert (fixes FK error)"
echo "  3. ✅ Check for duplicate proposals (fixes 409 error)"
echo "  4. ✅ Meaningful error messages for all scenarios"
echo "  5. ✅ User-friendly toast notifications"
echo ""
echo "Next steps:"
echo "  1. Ensure your .env.local has:"
echo "     - NEXT_PUBLIC_SUPABASE_URL"
echo "     - NEXT_PUBLIC_SUPABASE_ANON_KEY"
echo "     - SUPABASE_SERVICE_ROLE_KEY"
echo ""
echo "  2. Import and use SendInviteButton in your manager page:"
echo "     import { SendInviteButton } from './send-invite-button'"
echo ""
echo "  3. Restart: npm run dev"
echo ""
echo "  4. Test clicking 'Send Invite' - you'll see:"
echo "     ✅ 'Invite sent successfully!' (on success)"
echo "     ❌ 'Manager not found' (if manager_id invalid)"
echo "     ❌ 'Already sent an invite' (if duplicate)"
echo ""
echo "No more raw errors! 🎉"
ENDAPI

chmod +x fix-commission-invite-complete.sh
bash fix-commission-invite-complete.sh
