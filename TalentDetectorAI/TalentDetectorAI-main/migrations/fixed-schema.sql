-- DROP existing constraints if any
DROP TABLE IF EXISTS applications CASCADE;
DROP TABLE IF EXISTS interviews CASCADE;
DROP TABLE IF EXISTS commissions CASCADE;
DROP TABLE IF EXISTS jobs CASCADE;
DROP TABLE IF EXISTS candidates CASCADE;

-- Jobs Table (NO foreign key to users)
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  salary_min NUMERIC,
  salary_max NUMERIC,
  ai_generated_description TEXT,
  ai_keywords JSONB,
  status TEXT DEFAULT 'open',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Candidates Table
CREATE TABLE candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  cv_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Applications Table
CREATE TABLE applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  candidate_id UUID NOT NULL,
  agency_id UUID,
  status TEXT DEFAULT 'pending',
  ai_match_score INTEGER,
  ai_insights JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Interviews Table
CREATE TABLE interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  scheduled_at TIMESTAMPTZ,
  status TEXT DEFAULT 'scheduled',
  ai_questions JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Commission Table
CREATE TABLE commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES applications(id),
  agency_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_jobs_manager ON jobs(manager_id);
CREATE INDEX idx_applications_job ON applications(job_id);
CREATE INDEX idx_applications_candidate ON applications(candidate_id);

-- Sample data
INSERT INTO jobs (manager_id, title, description, location, salary_min, salary_max) VALUES
(gen_random_uuid(), 'Senior Full-Stack Developer', 'Experienced React/Node developer', 'Remote', 80000, 120000),
(gen_random_uuid(), 'Product Manager', 'Lead product strategy', 'London', 70000, 100000);
