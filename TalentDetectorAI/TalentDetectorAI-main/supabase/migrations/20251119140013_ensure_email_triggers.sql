-- Make sure email triggers are active

-- Recreate the trigger for candidate interest emails
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

%s from %s has an exciting opportunity for you!

POSITION: %s
LOCATION: %s
SALARY: %s

JOB DESCRIPTION:
%s

If interested, please log in to your dashboard or reply to this email.

Best regards,
%s',
      candidate_name,
      agency_name,
      COALESCE(agency_company, 'Recruitment Agency'),
      COALESCE(NEW.job_title, 'Position'),
      COALESCE(NEW.job_location, 'Not specified'),
      COALESCE(NEW.salary_range, 'Competitive'),
      COALESCE(NEW.job_description, 'Details available on request.'),
      agency_name
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
        'agency_id', NEW.agency_id
      )
    );
    
    RAISE NOTICE 'Email queued for %', candidate_email;
  END IF;

  -- In-app notification
  INSERT INTO notifications (user_id, type, title, message, link, metadata)
  SELECT 
    c.user_id,
    'interest_received',
    'New Job Opportunity!',
    agency_name || ' sent you: ' || COALESCE(NEW.job_title, 'Job Position'),
    '/dashboard/candidate/interests/' || NEW.id,
    jsonb_build_object('interest_id', NEW.id)
  FROM candidates c
  WHERE c.id = NEW.candidate_id AND c.user_id IS NOT NULL;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS trigger_notify_interest_sent ON candidate_interests;
CREATE TRIGGER trigger_notify_interest_sent
AFTER INSERT ON candidate_interests
FOR EACH ROW
EXECUTE FUNCTION notify_candidate_interest_sent();

RAISE NOTICE '✅ Email triggers active';
