-- ADVANCED CANDIDATE WORKFLOW SYSTEM
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

CREATE TABLE IF NOT EXISTS interest_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interest_id UUID REFERENCES candidate_interests(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  file_url TEXT NOT NULL,
  filename TEXT NOT NULL,
  file_size BIGINT,
  uploaded_by UUID REFERENCES auth.users(id),
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  ai_analysis JSONB,
  metadata JSONB
);

CREATE TABLE IF NOT EXISTS candidate_interest_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interest_id UUID REFERENCES candidate_interests(id) ON DELETE CASCADE,
  candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
  response_type TEXT NOT NULL,
  message TEXT,
  availability_date DATE,
  salary_expectation DECIMAL,
  questions TEXT[],
  responded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_interest_documents_interest_id ON interest_documents(interest_id);
CREATE INDEX IF NOT EXISTS idx_candidate_responses_interest_id ON candidate_interest_responses(interest_id);
CREATE INDEX IF NOT EXISTS idx_candidate_interests_viewed ON candidate_interests(viewed_by_candidate);

RAISE NOTICE '✅ Advanced workflow database ready!';
