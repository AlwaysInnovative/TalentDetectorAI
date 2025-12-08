-- ========================================
-- FIX NOTIFICATIONS TABLE
-- ========================================

-- Add missing columns if they don't exist
ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS link TEXT,
ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Update notification trigger to work without link if needed
CREATE OR REPLACE FUNCTION notify_candidate_interest_sent()
RETURNS TRIGGER AS $$
DECLARE
  agency_name TEXT;
  agency_company TEXT;
  candidate_email TEXT;
  candidate_name TEXT;
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

  -- Queue email to candidate
  IF candidate_email IS NOT NULL THEN
    email_subject := 'New Job Opportunity: ' || COALESCE(NEW.job_title, 'Position Available');
    email_body := format(
'Dear %s,

%s from %s has identified an excellent opportunity for you.

POSITION: %s
LOCATION: %s
SALARY: %s

JOB DESCRIPTION:
%s

If you are interested, please reply to this email or log in to your dashboard.

Best regards,
%s
%s',
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

    -- Insert into email queue if table exists
    BEGIN
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
      RAISE NOTICE '✅ Email queued for %', candidate_email;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '⚠️ Email queue failed: %', SQLERRM;
    END;
  END IF;

  -- In-app notification (only if user_id exists)
  BEGIN
    INSERT INTO notifications (user_id, type, title, message, link, metadata)
    SELECT 
      c.user_id,
      'interest_received',
      'New Job Opportunity!',
      agency_name || ' sent you an opportunity: ' || COALESCE(NEW.job_title, 'Job Position'),
      '/dashboard/candidate/interests',
      jsonb_build_object(
        'interest_id', NEW.id,
        'agency_id', NEW.agency_id,
        'job_id', NEW.job_id,
        'job_title', NEW.job_title
      )
    FROM candidates c
    WHERE c.id = NEW.candidate_id AND c.user_id IS NOT NULL;
    
    RAISE NOTICE '✅ In-app notification created';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '⚠️ Notification failed: %', SQLERRM;
  END;

  -- Notify manager
  BEGIN
    INSERT INTO notifications (user_id, type, title, message, link, metadata)
    SELECT 
      j.manager_id,
      'agency_sent_interest',
      'Agency Reached Out to Candidate',
      agency_name || ' contacted a candidate for: ' || j.title,
      '/dashboard/manager/jobs',
      jsonb_build_object(
        'interest_id', NEW.id,
        'agency_id', NEW.agency_id,
        'candidate_id', NEW.candidate_id,
        'job_id', NEW.job_id
      )
    FROM jobs j
    WHERE j.id = NEW.job_id;
    
    RAISE NOTICE '✅ Manager notification created';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '⚠️ Manager notification failed: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger
DROP TRIGGER IF EXISTS trigger_notify_interest_sent ON candidate_interests;
CREATE TRIGGER trigger_notify_interest_sent
AFTER INSERT ON candidate_interests
FOR EACH ROW
EXECUTE FUNCTION notify_candidate_interest_sent();

-- ========================================
-- VERIFICATION
-- ========================================

DO $$
DECLARE
  link_exists BOOLEAN;
  metadata_exists BOOLEAN;
BEGIN
  -- Check if columns exist
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notifications' AND column_name = 'link'
  ) INTO link_exists;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notifications' AND column_name = 'metadata'
  ) INTO metadata_exists;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ NOTIFICATIONS TABLE FIXED!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Column Status:';
  RAISE NOTICE '  link: %', CASE WHEN link_exists THEN '✅ EXISTS' ELSE '❌ MISSING' END;
  RAISE NOTICE '  metadata: %', CASE WHEN metadata_exists THEN '✅ EXISTS' ELSE '❌ MISSING' END;
  RAISE NOTICE '';
  RAISE NOTICE 'Trigger Status:';
  RAISE NOTICE '  ✅ trigger_notify_interest_sent created';
  RAISE NOTICE '';
  RAISE NOTICE 'Features:';
  RAISE NOTICE '  ✅ Email queuing with error handling';
  RAISE NOTICE '  ✅ In-app notifications with safe fallback';
  RAISE NOTICE '  ✅ Manager notifications';
  RAISE NOTICE '';
  RAISE NOTICE 'Test by:';
  RAISE NOTICE '  1. Send interest to candidate';
  RAISE NOTICE '  2. Check: SELECT * FROM email_queue;';
  RAISE NOTICE '  3. Check: SELECT * FROM notifications;';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END $$;
