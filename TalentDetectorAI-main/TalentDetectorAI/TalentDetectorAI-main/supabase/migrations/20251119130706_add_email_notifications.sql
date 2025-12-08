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
