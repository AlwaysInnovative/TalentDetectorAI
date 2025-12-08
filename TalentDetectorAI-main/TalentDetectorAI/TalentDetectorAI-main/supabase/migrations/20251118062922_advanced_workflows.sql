-- Agency commission proposals
CREATE TABLE IF NOT EXISTS commission_proposals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  agency_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  manager_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  proposed_percentage DECIMAL(5,2),
  manager_percentage DECIMAL(5,2),
  status TEXT DEFAULT 'pending',
  agency_message TEXT,
  manager_message TEXT,
  agreed_percentage DECIMAL(5,2),
  created_at TIMESTAMP DEFAULT NOW(),
  agreed_at TIMESTAMP
);

-- Chat messages for job discussions
CREATE TABLE IF NOT EXISTS job_chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES auth.users(id),
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- AI recommendations cache
CREATE TABLE IF NOT EXISTS ai_recommendations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  recommendation_type TEXT NOT NULL,
  content JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP
);

-- Interview scheduling
CREATE TABLE IF NOT EXISTS interview_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  proposed_times JSONB,
  confirmed_time TIMESTAMP,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_commission_proposals_job ON commission_proposals(job_id);
CREATE INDEX IF NOT EXISTS idx_commission_proposals_agency ON commission_proposals(agency_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_job ON job_chat_messages(job_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON job_chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_ai_recommendations_user ON ai_recommendations(user_id);
