-- Enhanced candidates table
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS resume_text TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS resume_url TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS linkedin_url TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS github_url TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS portfolio_url TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS education JSONB;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS work_history JSONB;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS certifications TEXT[];
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS languages TEXT[];
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS soft_skills TEXT[];
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS ai_summary TEXT;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS strengths JSONB;
ALTER TABLE candidates ADD COLUMN IF NOT EXISTS areas_for_improvement JSONB;

-- CV analysis results
CREATE TABLE IF NOT EXISTS cv_analysis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    overall_score INTEGER CHECK (overall_score >= 0 AND overall_score <= 100),
    skills_match_score INTEGER,
    experience_match_score INTEGER,
    education_match_score INTEGER,
    keywords_found TEXT[],
    keywords_missing TEXT[],
    strengths TEXT[],
    gaps TEXT[],
    recommendation TEXT,
    heat_map JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cv_analysis_candidate ON cv_analysis(candidate_id);
CREATE INDEX IF NOT EXISTS idx_cv_analysis_job ON cv_analysis(job_id);
CREATE INDEX IF NOT EXISTS idx_cv_analysis_score ON cv_analysis(overall_score DESC);

-- Candidate interactions
CREATE TABLE IF NOT EXISTS candidate_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
    agency_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    interaction_type TEXT NOT NULL, -- viewed, contacted, interviewed, shortlisted, rejected
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_candidate_interactions ON candidate_interactions(candidate_id, created_at DESC);

-- Enable RLS
ALTER TABLE cv_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_interactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cv_analysis_select" ON cv_analysis FOR SELECT TO authenticated USING (true);
CREATE POLICY "cv_analysis_insert" ON cv_analysis FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "interactions_select" ON candidate_interactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "interactions_insert" ON candidate_interactions FOR INSERT TO authenticated WITH CHECK (true);
