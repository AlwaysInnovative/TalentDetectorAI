-- Enhanced candidates table
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS linkedin_url TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS github_url TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS portfolio_url TEXT;

-- Professional details
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS current_company TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS current_position TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS experience_years INTEGER DEFAULT 0;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS education JSONB;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS certifications JSONB;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS languages JSONB;

-- CV and AI features
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS professional_summary TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS ai_generated_summary TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS cv_heat_map JSONB;

-- Mock interview tracking
CREATE TABLE IF NOT EXISTS mock_interviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id),
  questions JSONB,
  answers JSONB,
  ai_feedback JSONB,
  score INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- CV versions
CREATE TABLE IF NOT EXISTS cv_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
  version_name TEXT,
  content JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Messages
CREATE TABLE IF NOT EXISTS candidate_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
  from_user_id UUID REFERENCES auth.users(id),
  to_user_id UUID REFERENCES auth.users(id),
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mock_interviews_candidate ON mock_interviews(candidate_id);
CREATE INDEX IF NOT EXISTS idx_cv_versions_candidate ON cv_versions(candidate_id);
CREATE INDEX IF NOT EXISTS idx_messages_candidate ON candidate_messages(candidate_id);
