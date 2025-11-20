-- ========================================
-- ENHANCE CANDIDATE INTERESTS TABLE
-- ========================================

-- Add columns for full JD details
ALTER TABLE candidate_interests
ADD COLUMN IF NOT EXISTS job_description TEXT,
ADD COLUMN IF NOT EXISTS job_title TEXT,
ADD COLUMN IF NOT EXISTS job_location TEXT;

-- ========================================
-- ENHANCE CANDIDATES TABLE  
-- ========================================

-- Add column to track which agency created the candidate
ALTER TABLE candidates
ADD COLUMN IF NOT EXISTS created_by_agency_id UUID REFERENCES auth.users(id);

-- ========================================
-- ENHANCED NOTIFICATION TRIGGERS
-- ========================================

-- Drop existing notification functions if they exist
DROP FUNCTION IF EXISTS notify_candidate_interest_sent CASCADE;
DROP FUNCTION IF EXISTS notify_candidate_interest_response CASCADE;
DROP FUNCTION IF EXISTS notify_application_status_change CASCADE;

-- Function: Notify when agency sends interest to candidate
CREATE OR REPLACE FUNCTION notify_candidate_interest_sent()
RETURNS TRIGGER AS $$
DECLARE
  agency_name TEXT;
  candidate_email TEXT;
  manager_email TEXT;
BEGIN
  -- Get agency name
  SELECT full_name INTO agency_name
  FROM profiles
  WHERE id = NEW.agency_id;

  -- Get candidate email
  SELECT email INTO candidate_email
  FROM candidates
  WHERE id = NEW.candidate_id;

  -- Get manager email from job
  SELECT p.email INTO manager_email
  FROM jobs j
  JOIN profiles p ON j.manager_id = p.id
  WHERE j.id = NEW.job_id;

  -- Notify Candidate
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

  -- Notify Manager (hiring manager who posted the job)
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

-- Function: Notify when candidate responds to interest
CREATE OR REPLACE FUNCTION notify_candidate_interest_response()
RETURNS TRIGGER AS $$
DECLARE
  candidate_name TEXT;
  agency_email TEXT;
  manager_email TEXT;
BEGIN
  -- Only trigger if status changed
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Get candidate name
  SELECT name INTO candidate_name
  FROM candidates
  WHERE id = NEW.candidate_id;

  -- Notify Agency
  INSERT INTO notifications (user_id, type, title, message, link, metadata)
  VALUES (
    NEW.agency_id,
    'candidate_responded',
    'Candidate Responded!',
    candidate_name || ' is ' || NEW.status || ' in your job opportunity',
    '/dashboard/agency/candidates/' || NEW.candidate_id,
    jsonb_build_object(
      'interest_id', NEW.id,
      'candidate_id', NEW.candidate_id,
      'job_id', NEW.job_id,
      'status', NEW.status
    )
  );

  -- Notify Manager
  INSERT INTO notifications (user_id, type, title, message, link, metadata)
  SELECT 
    j.manager_id,
    'candidate_interest_update',
    'Candidate Interest Update',
    candidate_name || ' is ' || NEW.status || ' for: ' || j.title,
    '/dashboard/manager/jobs/' || NEW.job_id,
    jsonb_build_object(
      'interest_id', NEW.id,
      'candidate_id', NEW.candidate_id,
      'job_id', NEW.job_id,
      'agency_id', NEW.agency_id,
      'status', NEW.status
    )
  FROM jobs j
  WHERE j.id = NEW.job_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function: Notify on application status changes
CREATE OR REPLACE FUNCTION notify_application_status_change()
RETURNS TRIGGER AS $$
DECLARE
  candidate_name TEXT;
  job_title TEXT;
BEGIN
  -- Only trigger if status changed
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Get candidate and job details
  SELECT c.name, j.title INTO candidate_name, job_title
  FROM candidates c, jobs j
  WHERE c.id = NEW.candidate_id AND j.id = NEW.job_id;

  -- Notify Candidate (if they have user_id)
  INSERT INTO notifications (user_id, type, title, message, link, metadata)
  SELECT 
    c.user_id,
    'application_status_changed',
    'Application Status Updated',
    'Your application for ' || job_title || ' is now: ' || NEW.status,
    '/dashboard/candidate/applications/' || NEW.id,
    jsonb_build_object(
      'application_id', NEW.id,
      'job_id', NEW.job_id,
      'status', NEW.status
    )
  FROM candidates c
  WHERE c.id = NEW.candidate_id AND c.user_id IS NOT NULL;

  -- Notify Agency (if submitted by agency)
  IF NEW.submitted_by_agency_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, title, message, link, metadata)
    VALUES (
      NEW.submitted_by_agency_id,
      'application_status_changed',
      'Application Status Updated',
      candidate_name || '''s application for ' || job_title || ' is now: ' || NEW.status,
      '/dashboard/agency/applications/' || NEW.id,
      jsonb_build_object(
        'application_id', NEW.id,
        'candidate_id', NEW.candidate_id,
        'job_id', NEW.job_id,
        'status', NEW.status
      )
    );
  END IF;

  -- Notify Manager
  INSERT INTO notifications (user_id, type, title, message, link, metadata)
  SELECT 
    j.manager_id,
    'application_status_changed',
    'Application Status Updated',
    candidate_name || '''s application status: ' || NEW.status,
    '/dashboard/manager/applications/' || NEW.id,
    jsonb_build_object(
      'application_id', NEW.id,
      'candidate_id', NEW.candidate_id,
      'job_id', NEW.job_id,
      'status', NEW.status
    )
  FROM jobs j
  WHERE j.id = NEW.job_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- CREATE TRIGGERS
-- ========================================

-- Drop existing triggers
DROP TRIGGER IF EXISTS trigger_notify_interest_sent ON candidate_interests;
DROP TRIGGER IF EXISTS trigger_notify_interest_response ON candidate_interests;
DROP TRIGGER IF EXISTS trigger_notify_application_status ON applications;

-- Trigger: When interest is sent (INSERT)
CREATE TRIGGER trigger_notify_interest_sent
AFTER INSERT ON candidate_interests
FOR EACH ROW
EXECUTE FUNCTION notify_candidate_interest_sent();

-- Trigger: When candidate responds (UPDATE status)
CREATE TRIGGER trigger_notify_interest_response
AFTER UPDATE OF status ON candidate_interests
FOR EACH ROW
EXECUTE FUNCTION notify_candidate_interest_response();

-- Trigger: When application status changes
CREATE TRIGGER trigger_notify_application_status
AFTER UPDATE OF status ON applications
FOR EACH ROW
EXECUTE FUNCTION notify_application_status_change();

-- ========================================
-- ADD INDEXES FOR PERFORMANCE
-- ========================================

CREATE INDEX IF NOT EXISTS idx_candidate_interests_candidate_id ON candidate_interests(candidate_id);
CREATE INDEX IF NOT EXISTS idx_candidate_interests_agency_id ON candidate_interests(agency_id);
CREATE INDEX IF NOT EXISTS idx_candidate_interests_job_id ON candidate_interests(job_id);
CREATE INDEX IF NOT EXISTS idx_candidate_interests_status ON candidate_interests(status);

CREATE INDEX IF NOT EXISTS idx_candidates_created_by_agency ON candidates(created_by_agency_id);
CREATE INDEX IF NOT EXISTS idx_candidates_email ON candidates(email);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);

-- ========================================
-- VERIFICATION
-- ========================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ ENHANCED CANDIDATE SYSTEM MIGRATION COMPLETE!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'NEW COLUMNS ADDED:';
  RAISE NOTICE '  • candidate_interests.job_description';
  RAISE NOTICE '  • candidate_interests.job_title';
  RAISE NOTICE '  • candidate_interests.job_location';
  RAISE NOTICE '  • candidates.created_by_agency_id';
  RAISE NOTICE '';
  RAISE NOTICE 'NEW TRIGGERS CREATED:';
  RAISE NOTICE '  • trigger_notify_interest_sent (INSERT on candidate_interests)';
  RAISE NOTICE '  • trigger_notify_interest_response (UPDATE status on candidate_interests)';
  RAISE NOTICE '  • trigger_notify_application_status (UPDATE status on applications)';
  RAISE NOTICE '';
  RAISE NOTICE 'NOTIFICATION FLOW:';
  RAISE NOTICE '  1. Agency sends interest → Candidate + Manager notified';
  RAISE NOTICE '  2. Candidate responds → Agency + Manager notified';
  RAISE NOTICE '  3. Application status changes → All parties notified';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END $$;
