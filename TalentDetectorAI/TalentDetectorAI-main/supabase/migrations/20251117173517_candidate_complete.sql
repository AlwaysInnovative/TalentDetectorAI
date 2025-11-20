-- Enhanced candidates table
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS resume_url TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS parsed_resume JSONB;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS skills JSONB;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS skill_ratings JSONB;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'public';
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS rate_expectation DECIMAL(10,2);
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS availability JSONB;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS ai_summary TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS career_level TEXT;

-- Candidate documents
CREATE TABLE IF NOT EXISTS candidate_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  document_url TEXT NOT NULL,
  file_name TEXT,
  uploaded_at TIMESTAMP DEFAULT NOW()
);

-- Job alerts
CREATE TABLE IF NOT EXISTS job_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
  criteria JSONB,
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- AI career insights
CREATE TABLE IF NOT EXISTS career_insights (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
  insight_type TEXT NOT NULL,
  content JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Interview availability
CREATE TABLE IF NOT EXISTS interview_availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  available_slots JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_documents_candidate ON candidate_documents(candidate_id);
CREATE INDEX IF NOT EXISTS idx_alerts_candidate ON job_alerts(candidate_id);
CREATE INDEX IF NOT EXISTS idx_insights_candidate ON career_insights(candidate_id);
CREATE INDEX IF NOT EXISTS idx_availability_candidate ON interview_availability(candidate_id);
