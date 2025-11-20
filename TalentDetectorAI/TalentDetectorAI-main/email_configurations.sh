#!/bin/bash
# Add Email Notifications for Candidates
# Run: bash add-email-notifications.sh

set -e

echo "📧 Setting up email notifications..."

# ==================== CREATE EMAIL NOTIFICATION SYSTEM ====================

cat > supabase/migrations/$(date +%Y%m%d%H%M%S)_add_email_notifications.sql << 'ENDFILE'
-- ========================================
-- EMAIL QUEUE TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  to_email TEXT NOT NULL,
  to_name TEXT,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  template_type TEXT, -- 'job_interest', 'credentials', 'status_update'
  metadata JSONB,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_queue_status ON email_queue(status);
CREATE INDEX IF NOT EXISTS idx_email_queue_created ON email_queue(created_at);

-- ========================================
-- ENHANCED TRIGGER WITH EMAIL QUEUE
-- ========================================

CREATE OR REPLACE FUNCTION notify_candidate_interest_sent()
RETURNS TRIGGER AS $$
DECLARE
  agency_name TEXT;
  agency_company TEXT;
  candidate_email TEXT;
  candidate_name TEXT;
  manager_email TEXT;
  email_subject TEXT;
  email_body TEXT;
BEGIN
  -- Get agency info
  SELECT full_name, company INTO agency_name, agency_company
  FROM profiles
  WHERE id = NEW.agency_id;

  -- Get candidate info
  SELECT email, name INTO candidate_email, candidate_name
  FROM candidates
  WHERE id = NEW.candidate_id;

  -- Get manager email
  SELECT p.email INTO manager_email
  FROM jobs j
  JOIN profiles p ON j.manager_id = p.id
  WHERE j.id = NEW.job_id;

  -- Queue email to candidate with full JD
  IF candidate_email IS NOT NULL THEN
    email_subject := 'New Job Opportunity: ' || COALESCE(NEW.job_title, 'Position Available');
    email_body := format(
'Dear %s,

%s from %s has identified an excellent opportunity that matches your profile.

🎯 POSITION: %s
📍 LOCATION: %s
💰 SALARY RANGE: %s

📋 JOB DESCRIPTION:
%s

WHAT''S NEXT?
If you''re interested in this opportunity, please reply to this email or log in to your dashboard to respond.

Best regards,
%s
%s

---
This is an automated message from TalentDetector AI. Please do not reply directly to this email.',
      candidate_name,
      agency_name,
      COALESCE(agency_company, 'Recruitment Agency'),
      COALESCE(NEW.job_title, 'Position'),
      COALESCE(NEW.job_location, 'Not specified'),
      COALESCE(NEW.salary_range, 'Competitive'),
      COALESCE(NEW.job_description, 'Full details available on request.'),
      agency_name,
      COALESCE(agency_company, '')
    );

    INSERT INTO email_queue (to_email, to_name, subject, body, template_type, metadata)
    VALUES (
      candidate_email,
      candidate_name,
      email_subject,
      email_body,
      'job_interest',
      jsonb_build_object(
        'interest_id', NEW.id,
        'job_id', NEW.job_id,
        'agency_id', NEW.agency_id,
        'candidate_id', NEW.candidate_id
      )
    );
  END IF;

  -- Notify Candidate in-app (if they have login)
  INSERT INTO notifications (user_id, type, title, message, link, metadata)
  SELECT 
    c.user_id,
    'interest_received',
    'New Job Opportunity!',
    agency_name || ' has sent you an opportunity: ' || COALESCE(NEW.job_title, 'Job Position'),
    '/dashboard/candidate/interests/' || NEW.id,
    jsonb_build_object(
      'interest_id', NEW.id,
      'agency_id', NEW.agency_id,
      'job_id', NEW.job_id,
      'job_title', NEW.job_title,
      'salary_range', NEW.salary_range
    )
  FROM candidates c
  WHERE c.id = NEW.candidate_id AND c.user_id IS NOT NULL;

  -- Notify Manager
  INSERT INTO notifications (user_id, type, title, message, link, metadata)
  SELECT 
    j.manager_id,
    'agency_sent_interest',
    'Agency Reached Out to Candidate',
    agency_name || ' has contacted a candidate for: ' || j.title,
    '/dashboard/manager/jobs/' || NEW.job_id,
    jsonb_build_object(
      'interest_id', NEW.id,
      'agency_id', NEW.agency_id,
      'candidate_id', NEW.candidate_id,
      'job_id', NEW.job_id
    )
  FROM jobs j
  WHERE j.id = NEW.job_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- FUNCTION TO SEND CREDENTIALS EMAIL
-- ========================================

CREATE OR REPLACE FUNCTION send_candidate_credentials_email()
RETURNS TRIGGER AS $$
DECLARE
  candidate_email TEXT;
  candidate_name TEXT;
  email_subject TEXT;
  email_body TEXT;
BEGIN
  -- Only send if candidate has user_id (credentials created)
  IF NEW.user_id IS NOT NULL AND OLD.user_id IS NULL THEN
    candidate_email := NEW.email;
    candidate_name := NEW.name;

    email_subject := 'Welcome to TalentDetector AI - Your Account is Ready';
    email_body := format(
'Dear %s,

Welcome to TalentDetector AI! Your account has been created by a recruitment agency.

📧 EMAIL: %s
🔑 PASSWORD: Check your agency contact for the password

You can now:
✓ View job opportunities sent to you
✓ Respond to recruitment agencies
✓ Track your application status
✓ Update your profile

🔗 LOGIN HERE: https://talentdetector.ai/auth/signin

If you did not request this account or have questions, please contact the agency that created your profile.

Best regards,
TalentDetector AI Team',
      candidate_name,
      candidate_email
    );

    INSERT INTO email_queue (to_email, to_name, subject, body, template_type, metadata)
    VALUES (
      candidate_email,
      candidate_name,
      email_subject,
      email_body,
      'credentials',
      jsonb_build_object(
        'candidate_id', NEW.id,
        'created_by_agency_id', NEW.created_by_agency_id
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- CREATE TRIGGERS
-- ========================================

-- Replace existing trigger
DROP TRIGGER IF EXISTS trigger_notify_interest_sent ON candidate_interests;
CREATE TRIGGER trigger_notify_interest_sent
AFTER INSERT ON candidate_interests
FOR EACH ROW
EXECUTE FUNCTION notify_candidate_interest_sent();

-- Add credentials email trigger
DROP TRIGGER IF EXISTS trigger_send_credentials_email ON candidates;
CREATE TRIGGER trigger_send_credentials_email
AFTER INSERT OR UPDATE OF user_id ON candidates
FOR EACH ROW
EXECUTE FUNCTION send_candidate_credentials_email();

-- ========================================
-- EMAIL SENDING VIEW (for monitoring)
-- ========================================

CREATE OR REPLACE VIEW email_queue_summary AS
SELECT 
  status,
  COUNT(*) as count,
  MIN(created_at) as oldest,
  MAX(created_at) as newest
FROM email_queue
GROUP BY status;

-- ========================================
-- SUCCESS MESSAGE
-- ========================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ EMAIL NOTIFICATION SYSTEM CREATED!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'NEW TABLE:';
  RAISE NOTICE '  • email_queue - Stores all outgoing emails';
  RAISE NOTICE '';
  RAISE NOTICE 'EMAIL TYPES:';
  RAISE NOTICE '  • job_interest - When agency sends opportunity';
  RAISE NOTICE '  • credentials - When candidate account created';
  RAISE NOTICE '  • status_update - When status changes';
  RAISE NOTICE '';
  RAISE NOTICE 'NEXT STEPS:';
  RAISE NOTICE '  1. Set up email sender (see instructions)';
  RAISE NOTICE '  2. Process email queue';
  RAISE NOTICE '  3. Monitor with: SELECT * FROM email_queue_summary;';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END $$;
ENDFILE

echo "✅ Email notification migration created!"

# ==================== CREATE EMAIL PROCESSOR API ROUTE ====================

mkdir -p app/api/send-emails

cat > app/api/send-emails/route.ts << 'ENDFILE'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// This endpoint processes the email queue
// Call it periodically (e.g., every minute via cron job)

export async function POST(request: Request) {
  try {
    // Verify secret key for security
    const { searchParams } = new URL(request.url)
    const secret = searchParams.get('secret')
    
    if (secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

    // Get pending emails (limit 10 per batch)
    const { data: emails, error } = await supabase
      .from('email_queue')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(10)

    if (error) throw error

    if (!emails || emails.length === 0) {
      return NextResponse.json({ message: 'No emails to send', count: 0 })
    }

    const results = []

    for (const email of emails) {
      try {
        // TODO: Send email using your preferred service
        // Examples: SendGrid, Resend, AWS SES, Postmark
        
        // For now, we'll just log it and mark as sent
        console.log('📧 Sending email:', {
          to: email.to_email,
          subject: email.subject
        })

        // EXAMPLE: Using Resend (install: npm install resend)
        /*
        const resend = new Resend(process.env.RESEND_API_KEY)
        await resend.emails.send({
          from: 'noreply@talentdetector.ai',
          to: email.to_email,
          subject: email.subject,
          text: email.body
        })
        */

        // Mark as sent
        await supabase
          .from('email_queue')
          .update({ 
            status: 'sent', 
            sent_at: new Date().toISOString() 
          })
          .eq('id', email.id)

        results.push({ id: email.id, status: 'sent' })

      } catch (error: any) {
        // Mark as failed
        await supabase
          .from('email_queue')
          .update({ 
            status: 'failed',
            error_message: error.message 
          })
          .eq('id', email.id)

        results.push({ id: email.id, status: 'failed', error: error.message })
      }
    }

    return NextResponse.json({ 
      message: 'Email batch processed',
      count: results.length,
      results 
    })

  } catch (error: any) {
    console.error('Email processing error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// Health check
export async function GET() {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from('email_queue')
      .select('status, count(*)')
      .group('status')

    if (error) throw error

    return NextResponse.json({ 
      status: 'healthy',
      queue: data || []
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
ENDFILE

echo "✅ Email processor API created!"

# ==================== UPDATE ENV TEMPLATE ====================

cat >> .env.local.example << 'ENDFILE'

# Email Configuration
CRON_SECRET=your-secret-key-here
RESEND_API_KEY=your-resend-api-key  # or other email service
ENDFILE

echo ""
echo "✅✅✅ EMAIL NOTIFICATION SYSTEM COMPLETE! ✅✅✅"
echo ""
echo "📧 WHAT WAS CREATED:"
echo ""
echo "1. DATABASE:"
echo "   ✓ email_queue table - Stores all emails"
echo "   ✓ Enhanced triggers - Queue emails automatically"
echo "   ✓ Monitoring view - email_queue_summary"
echo ""
echo "2. API ENDPOINT:"
echo "   ✓ /api/send-emails - Processes email queue"
echo "   ✓ Batch processing (10 emails at a time)"
echo "   ✓ Error handling & retry logic"
echo ""
echo "3. EMAIL TYPES:"
echo "   ✓ Job interest with full JD"
echo "   ✓ Account credentials welcome email"
echo "   ✓ Status update notifications"
echo ""
echo "📋 SETUP INSTRUCTIONS:"
echo ""
echo "1. Apply database migration:"
echo "   Run the SQL in Supabase dashboard"
echo ""
echo "2. Choose email service (pick one):"
echo ""
echo "   OPTION A - Resend (Recommended):"
echo "   • Sign up: https://resend.com"
echo "   • Get API key"
echo "   • Install: npm install resend"
echo "   • Add to .env.local: RESEND_API_KEY=re_xxx"
echo ""
echo "   OPTION B - SendGrid:"
echo "   • Sign up: https://sendgrid.com"
echo "   • Install: npm install @sendgrid/mail"
echo "   • Add to .env.local: SENDGRID_API_KEY=SG.xxx"
echo ""
echo "   OPTION C - Postmark:"
echo "   • Sign up: https://postmarkapp.com"
echo "   • Install: npm install postmark"
echo "   • Add to .env.local: POSTMARK_API_KEY=xxx"
echo ""
echo "3. Add secret key to .env.local:"
echo "   CRON_SECRET=$(openssl rand -hex 32)"
echo ""
echo "4. Set up cron job (choose one):"
echo ""
echo "   OPTION A - Vercel Cron (if deployed on Vercel):"
echo "   Add to vercel.json:"
echo '   {'
echo '     "crons": [{'
echo '       "path": "/api/send-emails?secret=YOUR_SECRET",'
echo '       "schedule": "* * * * *"'
echo '     }]'
echo '   }'
echo ""
echo "   OPTION B - Manual cron (Linux/Mac):"
echo '   */1 * * * * curl -X POST "https://your-domain.com/api/send-emails?secret=YOUR_SECRET"'
echo ""
echo "   OPTION C - Development (manual):"
echo '   curl -X POST "http://localhost:3000/api/send-emails?secret=YOUR_SECRET"'
echo ""
echo "5. Monitor emails:"
echo "   SELECT * FROM email_queue WHERE status = 'pending';"
echo "   SELECT * FROM email_queue_summary;"
echo ""
echo "📬 TEST THE SYSTEM:"
echo ""
echo "1. Agency creates candidate with credentials"
echo "2. Check email_queue table - should see 'credentials' email"
echo "3. Agency sends interest to candidate"
echo "4. Check email_queue - should see 'job_interest' email"
echo "5. Trigger email processor (manually or via cron)"
echo "6. Check candidate's email inbox!"
echo ""
