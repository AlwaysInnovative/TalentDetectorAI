#!/bin/bash
# complete-candidate-workflow-fix.sh
set -e

echo "🚀 Creating production-grade Agency → Candidate → RTR workflow..."

# ============================================================================
# 1. DATABASE MIGRATION: Add missing columns and constraints
# ============================================================================

cat > migrations/add-workflow-columns.sql <<'ENDSQL'
-- Add missing status tracking columns to candidate_interests if not exist
ALTER TABLE candidate_interests 
ADD COLUMN IF NOT EXISTS candidate_acceptance_status TEXT DEFAULT 'pending_response';
-- Values: pending_response, accepted, rejected

ALTER TABLE candidate_interests 
ADD COLUMN IF NOT EXISTS candidate_response_comment TEXT;

ALTER TABLE candidate_interests 
ADD COLUMN IF NOT EXISTS rtr_generated_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE candidate_interests 
ADD COLUMN IF NOT EXISTS rtr_sent_at TIMESTAMP WITH TIME ZONE;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_candidate_interests_status ON candidate_interests(status);
CREATE INDEX IF NOT EXISTS idx_candidate_interests_acceptance ON candidate_interests(candidate_acceptance_status);

-- Update existing records with proper defaults
UPDATE candidate_interests 
SET candidate_acceptance_status = 'pending_response' 
WHERE candidate_acceptance_status IS NULL;

COMMENT ON COLUMN candidate_interests.candidate_acceptance_status IS 
'Tracks candidate response: pending_response, accepted, rejected';

COMMENT ON COLUMN candidate_interests.status IS 
'Overall workflow status: sent, candidate_accepted, cv_received, rtr_ready, rtr_signed, completed';
ENDSQL

echo "✅ Database migration created"

# ============================================================================
# 2. API: Candidate Accept/Reject JD
# ============================================================================

mkdir -p app/api/candidate/respond-to-interest

cat > app/api/candidate/respond-to-interest/route.ts <<'ENDAPI1'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const { interest_id, accepted, comment } = await request.json()
    
    if (!interest_id || accepted === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get interest details
    const { data: interest, error: fetchErr } = await supabaseAdmin
      .from('candidate_interests')
      .select('*, candidates(name, email), jobs(title), agency_id')
      .eq('id', interest_id)
      .single()

    if (fetchErr || !interest) {
      return NextResponse.json({ error: 'Interest not found' }, { status: 404 })
    }

    // Update interest with candidate response
    const { error: updateErr } = await supabaseAdmin
      .from('candidate_interests')
      .update({
        candidate_acceptance_status: accepted ? 'accepted' : 'rejected',
        candidate_response: accepted ? 'accepted' : 'rejected',
        candidate_response_comment: comment || null,
        candidate_responded_at: new Date().toISOString(),
        status: accepted ? 'candidate_accepted' : 'rejected'
      })
      .eq('id', interest_id)

    if (updateErr) {
      console.error('Update error:', updateErr)
      return NextResponse.json({ error: 'Failed to save response' }, { status: 500 })
    }

    // Notify agency
    await supabaseAdmin.from('notifications').insert({
      user_id: interest.agency_id,
      type: accepted ? 'candidate_accepted_jd' : 'candidate_rejected_jd',
      title: accepted ? '✅ Candidate Accepted JD' : '❌ Candidate Declined JD',
      message: `${interest.candidates.name} has ${accepted ? 'accepted' : 'rejected'} the ${interest.jobs.title} opportunity${comment ? ': ' + comment : ''}`,
      link: `/dashboard/agency/interests/${interest_id}`,
      ai_priority: 'high',
      metadata: { interest_id, candidate_id: interest.candidate_id, accepted, comment }
    })

    return NextResponse.json({ 
      success: true, 
      message: accepted ? 'You have accepted this opportunity!' : 'You have declined this opportunity.'
    })

  } catch (error: any) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 })
  }
}
ENDAPI1

echo "✅ API: Candidate respond to interest created"

# ============================================================================
# 3. API: Candidate Upload CV
# ============================================================================

mkdir -p app/api/candidate/upload-cv

cat > app/api/candidate/upload-cv/route.ts <<'ENDAPI2'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const { interest_id, cv_url, cv_filename } = await request.json()
    
    if (!interest_id || !cv_url) {
      return NextResponse.json({ error: 'Missing CV or interest ID' }, { status: 400 })
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get interest
    const { data: interest, error: fetchErr } = await supabaseAdmin
      .from('candidate_interests')
      .select('*, candidates(name), jobs(title), agency_id')
      .eq('id', interest_id)
      .single()

    if (fetchErr || !interest) {
      return NextResponse.json({ error: 'Interest not found' }, { status: 404 })
    }

    // Update with CV
    const { error: updateErr } = await supabaseAdmin
      .from('candidate_interests')
      .update({
        cv_url,
        cv_filename,
        cv_uploaded_at: new Date().toISOString(),
        status: 'cv_received'
      })
      .eq('id', interest_id)

    if (updateErr) {
      return NextResponse.json({ error: 'Failed to save CV' }, { status: 500 })
    }

    // Notify agency
    await supabaseAdmin.from('notifications').insert({
      user_id: interest.agency_id,
      type: 'cv_received',
      title: '📄 CV Received',
      message: `${interest.candidates.name} uploaded CV for ${interest.jobs.title}`,
      link: `/dashboard/agency/interests/${interest_id}`,
      ai_priority: 'high',
      metadata: { interest_id, cv_url }
    })

    return NextResponse.json({ success: true, message: 'CV uploaded successfully!' })

  } catch (error: any) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
ENDAPI2

echo "✅ API: Candidate upload CV created"

# ============================================================================
# 4. API: Agency Generate & Send RTR
# ============================================================================

mkdir -p app/api/agency/generate-send-rtr

cat > app/api/agency/generate-send-rtr/route.ts <<'ENDAPI3'
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const { interest_id } = await request.json()
    
    if (!interest_id) {
      return NextResponse.json({ error: 'Missing interest ID' }, { status: 400 })
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Get full interest details
    const { data: interest, error: fetchErr } = await supabaseAdmin
      .from('candidate_interests')
      .select(`
        *, 
        candidates(id, name, email, phone, location, user_id),
        jobs(id, title, location, salary_min, salary_max),
        agency:profiles!candidate_interests_agency_id_fkey(id, full_name, company, email)
      `)
      .eq('id', interest_id)
      .single()

    if (fetchErr || !interest) {
      return NextResponse.json({ error: 'Interest not found' }, { status: 404 })
    }

    // Ensure CV is uploaded
    if (!interest.cv_url) {
      return NextResponse.json({ 
        error: 'Cannot send RTR until candidate uploads CV' 
      }, { status: 400 })
    }

    const { candidates: candidate, jobs: job, agency } = interest

    // Generate RTR HTML
    const rtrHtml = `
<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/>
<title>Right to Represent Agreement</title>
<style>
body{font-family:Arial,sans-serif;background:#f4f6fb;color:#1e293b;padding:2rem;}
.container{max-width:700px;margin:auto;background:#fff;padding:40px;border-radius:10px;box-shadow:0 3px 15px rgba(0,0,0,0.1);}
h1{color:#1e3a8a;}
.section{margin-bottom:2rem;}
.section-title{text-transform:uppercase;color:#3b82f6;font-size:1.1em;margin-bottom:10px;font-weight:700;}
dl{display:grid;grid-template-columns:max-content 1fr;row-gap:6px;column-gap:16px;}
dt{font-weight:bold;}
ul{padding-left:22px;line-height:1.6;}
.signature-area{border-bottom:2px solid #222;height:45px;margin:15px 0;}
.footer{text-align:center;color:#6b7280;font-size:0.9em;margin-top:30px;}
</style></head>
<body>
<div class="container">
<h1>Right to Represent Agreement</h1>
<p><em>Generated: ${new Date().toLocaleString()}</em></p>
<div class="section">
  <div class="section-title">Parties</div>
  <dl>
    <dt>Agency:</dt><dd>${agency?.full_name || 'N/A'} (${agency?.company || 'N/A'})</dd>
    <dt>Agency Email:</dt><dd>${agency?.email || 'N/A'}</dd>
    <dt>Candidate:</dt><dd>${candidate?.name || 'N/A'}</dd>
    <dt>Candidate Email:</dt><dd>${candidate?.email || 'N/A'}</dd>
    <dt>Candidate Phone:</dt><dd>${candidate?.phone || 'N/A'}</dd>
    <dt>Location:</dt><dd>${candidate?.location || 'N/A'}</dd>
  </dl>
</div>
<div class="section">
  <div class="section-title">Position</div>
  <dl>
    <dt>Title:</dt><dd>${job?.title || 'N/A'}</dd>
    <dt>Location:</dt><dd>${job?.location || 'N/A'}</dd>
    <dt>Salary:</dt><dd>£${job?.salary_min?.toLocaleString() || '0'} - £${job?.salary_max?.toLocaleString() || '0'}</dd>
  </dl>
</div>
<div class="section">
  <div class="section-title">Terms</div>
  <ul>
    <li>Exclusive right to represent candidate for 90 days.</li>
    <li>Agency submits candidate's CV to employer.</li>
    <li>Candidate must not apply directly during this period.</li>
    <li>Candidate agrees to cooperate and provide accurate info.</li>
    <li>Agency maintains confidentiality and provides updates.</li>
    <li>No fees for candidate; agency paid by employer.</li>
    <li>Electronic signature is legally binding.</li>
  </ul>
</div>
<p><strong>Candidate Signature:</strong></p>
<div class="signature-area"></div>
<p><strong>Date:</strong></p>
<div class="signature-area"></div>
<div class="footer">Generated by TalentDetector AI © ${new Date().getFullYear()}</div>
</div></body></html>`.trim()

    // Upload RTR to storage
    const rtrFileName = `rtr_${interest_id}_${Date.now()}.html`
    const { error: uploadErr } = await supabaseAdmin.storage
      .from('documents')
      .upload(rtrFileName, rtrHtml, { contentType: 'text/html', upsert: false })

    if (uploadErr) {
      return NextResponse.json({ error: 'Failed to generate RTR' }, { status: 500 })
    }

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('documents')
      .getPublicUrl(rtrFileName)

    // Update interest
    const { error: updateErr } = await supabaseAdmin
      .from('candidate_interests')
      .update({
        right_to_represent_url: publicUrl,
        rtr_generated_at: new Date().toISOString(),
        rtr_sent_at: new Date().toISOString(),
        status: 'rtr_ready'
      })
      .eq('id', interest_id)

    if (updateErr) {
      return NextResponse.json({ error: 'Failed to update status' }, { status: 500 })
    }

    // Notify candidate
    if (candidate?.user_id) {
      await supabaseAdmin.from('notifications').insert({
        user_id: candidate.user_id,
        type: 'rtr_ready',
        title: '✍️ Please Sign Your RTR Agreement',
        message: `Your Right to Represent agreement for ${job?.title} is ready for signature`,
        link: `/dashboard/candidate/interests/${interest_id}/sign-rtr`,
        ai_priority: 'high',
        metadata: { interest_id, rtr_url: publicUrl }
      })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'RTR generated and sent to candidate!',
      rtr_url: publicUrl 
    })

  } catch (error: any) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Failed to generate RTR' }, { status: 500 })
  }
}
ENDAPI3

echo "✅ API: Agency generate RTR created"

# ============================================================================
# 5. FRONTEND: Candidate Accept/Reject Component
# ============================================================================

mkdir -p app/dashboard/candidate/interests/[id]

cat > app/dashboard/candidate/interests/[id]/respond-component.tsx <<'ENDCOMP1'
'use client'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { Loader2, ThumbsUp, ThumbsDown } from 'lucide-react'

export function RespondToJD({ interestId, onSuccess }: { interestId: string; onSuccess: () => void }) {
  const [responding, setResponding] = useState(false)
  const [comment, setComment] = useState('')

  async function handleRespond(accepted: boolean) {
    setResponding(true)
    try {
      const response = await fetch('/api/candidate/respond-to-interest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interest_id: interestId, accepted, comment })
      })

      const result = await response.json()
      if (!response.ok) {
        toast.error(result.error || 'Failed to submit response')
        return
      }

      toast.success(result.message)
      onSuccess()
    } catch (error) {
      toast.error('Network error. Please try again.')
    } finally {
      setResponding(false)
    }
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow space-y-4">
      <h3 className="text-lg font-bold">Respond to this Opportunity</h3>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Add any comments or questions (optional)..."
        className="w-full p-3 border rounded-lg"
        rows={3}
      />
      <div className="flex gap-3">
        <button
          onClick={() => handleRespond(false)}
          disabled={responding}
          className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {responding ? <Loader2 className="w-5 h-5 animate-spin" /> : <ThumbsDown className="w-5 h-5" />}
          Decline
        </button>
        <button
          onClick={() => handleRespond(true)}
          disabled={responding}
          className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {responding ? <Loader2 className="w-5 h-5 animate-spin" /> : <ThumbsUp className="w-5 h-5" />}
          Accept
        </button>
      </div>
    </div>
  )
}
ENDCOMP1

echo "✅ Frontend: Candidate respond component created"

# ============================================================================
# 6. FRONTEND: Agency Generate RTR Button
# ============================================================================

cat > app/dashboard/agency/interests/generate-rtr-button.tsx <<'ENDCOMP2'
'use client'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { Loader2, FileText } from 'lucide-react'

export function GenerateRTRButton({ interestId, onSuccess }: { interestId: string; onSuccess?: () => void }) {
  const [generating, setGenerating] = useState(false)

  async function handleGenerate() {
    setGenerating(true)
    try {
      const response = await fetch('/api/agency/generate-send-rtr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interest_id: interestId })
      })

      const result = await response.json()
      if (!response.ok) {
        toast.error(result.error || 'Failed to generate RTR')
        return
      }

      toast.success(result.message)
      if (onSuccess) onSuccess()
    } catch (error) {
      toast.error('Network error. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <button
      onClick={handleGenerate}
      disabled={generating}
      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold disabled:opacity-50 flex items-center gap-2"
    >
      {generating ? (
        <>
          <Loader2 className="w-5 h-5 animate-spin" />
          Generating RTR...
        </>
      ) : (
        <>
          <FileText className="w-5 h-5" />
          Generate & Send RTR
        </>
      )}
    </button>
  )
}
ENDCOMP2

echo "✅ Frontend: Agency generate RTR button created"

echo ""
echo "=========================================="
echo "✅ COMPLETE WORKFLOW SOLUTION DEPLOYED!"
echo "=========================================="
echo ""
echo "📋 What was created:"
echo "  1. ✅ Database migration with workflow columns"
echo "  2. ✅ API: Candidate accept/reject JD"
echo "  3. ✅ API: Candidate upload CV"
echo "  4. ✅ API: Agency generate & send RTR"
echo "  5. ✅ Frontend: Candidate response component"
echo "  6. ✅ Frontend: Agency RTR generation button"
echo ""
echo "🚀 Deployment Instructions:"
echo ""
echo "STEP 1: Run database migration"
echo "  - Go to Supabase SQL Editor"
echo "  - Run: migrations/add-workflow-columns.sql"
echo ""
echo "STEP 2: Restart your app"
echo "  npm run dev"
echo ""
echo "STEP 3: Test the complete workflow:"
echo "  1. Agency sends JD/interest to candidate"
echo "  2. Candidate sees notification → accepts/rejects with comment"
echo "  3. Agency receives notification of acceptance"
echo "  4. Candidate uploads CV"
echo "  5. Agency receives CV notification"
echo "  6. Agency clicks 'Generate & Send RTR'"
echo "  7. Candidate receives RTR to sign"
echo ""
echo "📊 Status Flow:"
echo "  sent → candidate_accepted → cv_received → rtr_ready → rtr_signed"
echo ""
echo "🎯 All notifications are automatic!"
echo "🎉 Production-ready with error handling!"
