-- Agency-owned candidates (FIXED - renamed current_role to role_title)
CREATE TABLE IF NOT EXISTS agency_candidates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  cv_url TEXT,
  parsed_cv JSONB,
  skills JSONB,
  experience_years INTEGER DEFAULT 0,
  role_title TEXT,
  summary TEXT,
  ai_enrichment JSONB,
  profile_completeness INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(agency_id, email)
);

-- Job submissions by agency
CREATE TABLE IF NOT EXISTS agency_submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID REFERENCES auth.users(id),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  candidate_id UUID REFERENCES agency_candidates(id) ON DELETE CASCADE,
  ai_match_score INTEGER,
  match_reasoning TEXT,
  status TEXT DEFAULT 'submitted',
  submitted_at TIMESTAMP DEFAULT NOW(),
  feedback TEXT,
  viewed_by_manager BOOLEAN DEFAULT FALSE
);

-- RTR tracking
CREATE TABLE IF NOT EXISTS rtr_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID REFERENCES auth.users(id),
  candidate_id UUID REFERENCES agency_candidates(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  docusign_envelope_id TEXT,
  status TEXT DEFAULT 'draft',
  sent_at TIMESTAMP,
  viewed_at TIMESTAMP,
  signed_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Commission tracking
CREATE TABLE IF NOT EXISTS agency_commissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID REFERENCES auth.users(id),
  submission_id UUID REFERENCES agency_submissions(id) ON DELETE CASCADE,
  base_amount DECIMAL(10,2),
  bonus_amount DECIMAL(10,2),
  total_amount DECIMAL(10,2),
  status TEXT DEFAULT 'pending',
  paid_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Candidate preparation notes
CREATE TABLE IF NOT EXISTS candidate_prep_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID REFERENCES auth.users(id),
  candidate_id UUID REFERENCES agency_candidates(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  ai_suggestions JSONB,
  custom_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(agency_id, candidate_id, job_id)
);

-- Automated workflows
CREATE TABLE IF NOT EXISTS agency_automations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID REFERENCES auth.users(id),
  automation_type TEXT NOT NULL,
  config JSONB,
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_agency_candidates_agency ON agency_candidates(agency_id);
CREATE INDEX IF NOT EXISTS idx_agency_candidates_email ON agency_candidates(email);
CREATE INDEX IF NOT EXISTS idx_submissions_agency ON agency_submissions(agency_id);
CREATE INDEX IF NOT EXISTS idx_submissions_job ON agency_submissions(job_id);
CREATE INDEX IF NOT EXISTS idx_submissions_candidate ON agency_submissions(candidate_id);
CREATE INDEX IF NOT EXISTS idx_rtr_agency ON rtr_tracking(agency_id);
CREATE INDEX IF NOT EXISTS idx_rtr_candidate ON rtr_tracking(candidate_id);
CREATE INDEX IF NOT EXISTS idx_commissions_agency ON agency_commissions(agency_id);
CREATE INDEX IF NOT EXISTS idx_prep_notes_candidate ON candidate_prep_notes(candidate_id);
