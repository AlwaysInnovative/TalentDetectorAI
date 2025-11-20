-- ========================================
-- ADVANCED CANDIDATE WORKFLOW SYSTEM
-- ========================================

-- Add CV and documents to candidate_interests
ALTER TABLE candidate_interests
ADD COLUMN IF NOT EXISTS cv_url TEXT,
ADD COLUMN IF NOT EXISTS cv_filename TEXT,
ADD COLUMN IF NOT EXISTS cv_uploaded_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS ai_cv_analysis JSONB,
ADD COLUMN IF NOT EXISTS ai_match_score INTEGER,
ADD COLUMN IF NOT EXISTS ai_improvements TEXT[],
ADD COLUMN IF NOT EXISTS candidate_response TEXT,
ADD COLUMN IF NOT EXISTS candidate_responded_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS right_to_represent_url TEXT,
ADD COLUMN IF NOT EXISTS right_to_represent_signed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS right_to_represent_signed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS agency_notes TEXT,
ADD COLUMN IF NOT EXISTS viewed_by_candidate BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS viewed_at TIMESTAMPTZ;

-- Create documents table for all attachments
CREATE TABLE IF NOT EXISTS interest_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interest_id UUID REFERENCES candidate_interests(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL CHECK (document_type IN ('cv', 'cover_letter', 'certificate', 'right_to_represent', 'other')),
  file_url TEXT NOT NULL,
  filename TEXT NOT NULL,
  file_size BIGINT,
  uploaded_by UUID REFERENCES auth.users(id),
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  ai_analysis JSONB,
  metadata JSONB
);

-- Create candidate responses table for detailed tracking
CREATE TABLE IF NOT EXISTS candidate_interest_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interest_id UUID REFERENCES candidate_interests(id) ON DELETE CASCADE,
  candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
  response_type TEXT NOT NULL CHECK (response_type IN ('interested', 'not_interested', 'need_more_info')),
  message TEXT,
  availability_date DATE,
  salary_expectation DECIMAL,
  questions TEXT[],
  responded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_interest_documents_interest_id ON interest_documents(interest_id);
CREATE INDEX IF NOT EXISTS idx_interest_documents_type ON interest_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_candidate_responses_interest_id ON candidate_interest_responses(interest_id);
CREATE INDEX IF NOT EXISTS idx_candidate_interests_viewed ON candidate_interests(viewed_by_candidate);
CREATE INDEX IF NOT EXISTS idx_candidate_interests_match_score ON candidate_interests(ai_match_score);

-- Function to mark as viewed
CREATE OR REPLACE FUNCTION mark_interest_viewed()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.viewed_by_candidate = TRUE AND OLD.viewed_by_candidate = FALSE THEN
    NEW.viewed_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_mark_interest_viewed ON candidate_interests;
CREATE TRIGGER trigger_mark_interest_viewed
BEFORE UPDATE OF viewed_by_candidate ON candidate_interests
FOR EACH ROW
EXECUTE FUNCTION mark_interest_viewed();

-- Function to notify when candidate views interest
CREATE OR REPLACE FUNCTION notify_interest_viewed()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.viewed_by_candidate = TRUE AND OLD.viewed_by_candidate = FALSE THEN
    -- Notify agency
    INSERT INTO notifications (user_id, type, title, message, link, metadata)
    VALUES (
      NEW.agency_id,
      'interest_viewed',
      'Candidate Viewed Opportunity',
      'Candidate has viewed the job opportunity you sent',
      '/dashboard/agency/interests',
      jsonb_build_object('interest_id', NEW.id, 'candidate_id', NEW.candidate_id)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notify_interest_viewed ON candidate_interests;
CREATE TRIGGER trigger_notify_interest_viewed
AFTER UPDATE OF viewed_by_candidate ON candidate_interests
FOR EACH ROW
EXECUTE FUNCTION notify_interest_viewed();

-- Function to notify when CV uploaded
CREATE OR REPLACE FUNCTION notify_cv_uploaded()
RETURNS TRIGGER AS $$
DECLARE
  interest RECORD;
BEGIN
  IF NEW.cv_url IS NOT NULL AND OLD.cv_url IS NULL THEN
    -- Get interest details
    SELECT * INTO interest FROM candidate_interests WHERE id = NEW.id;
    
    -- Notify agency
    INSERT INTO notifications (user_id, type, title, message, link, metadata)
    VALUES (
      interest.agency_id,
      'cv_uploaded',
      'Candidate Uploaded CV',
      'Candidate has uploaded their CV for review',
      '/dashboard/agency/interests',
      jsonb_build_object(
        'interest_id', NEW.id,
        'candidate_id', interest.candidate_id,
        'match_score', NEW.ai_match_score
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notify_cv_uploaded ON candidate_interests;
CREATE TRIGGER trigger_notify_cv_uploaded
AFTER UPDATE OF cv_url ON candidate_interests
FOR EACH ROW
EXECUTE FUNCTION notify_cv_uploaded();

RAISE NOTICE '========================================';
RAISE NOTICE '✅ ADVANCED WORKFLOW SYSTEM CREATED!';
RAISE NOTICE '========================================';
RAISE NOTICE '';
RAISE NOTICE 'New Tables:';
RAISE NOTICE '  • interest_documents - CV, certificates, RTR';
RAISE NOTICE '  • candidate_interest_responses - Detailed responses';
RAISE NOTICE '';
RAISE NOTICE 'New Columns in candidate_interests:';
RAISE NOTICE '  • CV upload and AI analysis';
RAISE NOTICE '  • Match scoring';
RAISE NOTICE '  • Right to represent document';
RAISE NOTICE '  • View tracking';
RAISE NOTICE '';
RAISE NOTICE 'Automated Triggers:';
RAISE NOTICE '  • Mark as viewed with timestamp';
RAISE NOTICE '  • Notify agency when viewed';
RAISE NOTICE '  • Notify agency when CV uploaded';
RAISE NOTICE '';
RAISE NOTICE '========================================';
