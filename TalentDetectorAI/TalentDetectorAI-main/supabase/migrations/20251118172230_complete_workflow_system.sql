-- ========================================
-- CANDIDATE INTEREST TRACKING
-- ========================================

CREATE TABLE IF NOT EXISTS candidate_interests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    agency_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'interested', 'not_interested', 'accepted', 'rejected')),
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    responded_at TIMESTAMPTZ,
    jd_sent BOOLEAN DEFAULT TRUE,
    salary_range TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(candidate_id, job_id, agency_id) -- Prevent duplicates
);

CREATE INDEX IF NOT EXISTS idx_candidate_interests_candidate ON candidate_interests(candidate_id);
CREATE INDEX IF NOT EXISTS idx_candidate_interests_job ON candidate_interests(job_id);
CREATE INDEX IF NOT EXISTS idx_candidate_interests_agency ON candidate_interests(agency_id);
CREATE INDEX IF NOT EXISTS idx_candidate_interests_status ON candidate_interests(status);

-- ========================================
-- WORKFLOW STATUS TRACKING
-- ========================================

CREATE TABLE IF NOT EXISTS workflow_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL, -- interest_sent, candidate_responded, manager_updated, etc.
    entity_type TEXT NOT NULL, -- candidate_interest, application, job, etc.
    entity_id UUID NOT NULL,
    actor_id UUID REFERENCES profiles(id),
    actor_type TEXT, -- agency, candidate, manager
    data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workflow_events_entity ON workflow_events(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_workflow_events_type ON workflow_events(event_type);
CREATE INDEX IF NOT EXISTS idx_workflow_events_created ON workflow_events(created_at DESC);

-- ========================================
-- ENHANCED NOTIFICATIONS TABLE
-- ========================================

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS action_url TEXT;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent'));

-- ========================================
-- RLS POLICIES
-- ========================================

ALTER TABLE candidate_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_events ENABLE ROW LEVEL SECURITY;

-- Candidate interests policies
DROP POLICY IF EXISTS "candidate_interests_select" ON candidate_interests;
CREATE POLICY "candidate_interests_select" ON candidate_interests
FOR SELECT TO authenticated
USING (
    agency_id = auth.uid() OR 
    candidate_id IN (SELECT id FROM candidates WHERE user_id = auth.uid()) OR
    job_id IN (SELECT id FROM jobs WHERE manager_id = auth.uid())
);

DROP POLICY IF EXISTS "candidate_interests_insert" ON candidate_interests;
CREATE POLICY "candidate_interests_insert" ON candidate_interests
FOR INSERT TO authenticated
WITH CHECK (agency_id = auth.uid());

DROP POLICY IF EXISTS "candidate_interests_update" ON candidate_interests;
CREATE POLICY "candidate_interests_update" ON candidate_interests
FOR UPDATE TO authenticated
USING (
    agency_id = auth.uid() OR
    candidate_id IN (SELECT id FROM candidates WHERE user_id = auth.uid())
);

-- Workflow events policies
DROP POLICY IF EXISTS "workflow_events_select" ON workflow_events;
CREATE POLICY "workflow_events_select" ON workflow_events
FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "workflow_events_insert" ON workflow_events;
CREATE POLICY "workflow_events_insert" ON workflow_events
FOR INSERT TO authenticated
WITH CHECK (true);

-- ========================================
-- TRIGGER: Notify on Candidate Interest
-- ========================================

CREATE OR REPLACE FUNCTION notify_candidate_interest()
RETURNS TRIGGER AS $$
DECLARE
    agency_name TEXT;
    job_title TEXT;
    candidate_name TEXT;
    candidate_email TEXT;
    manager_id UUID;
BEGIN
    -- Get related data
    SELECT full_name INTO agency_name FROM profiles WHERE id = NEW.agency_id;
    SELECT title, manager_id INTO job_title, manager_id FROM jobs WHERE id = NEW.job_id;
    SELECT name, email INTO candidate_name, candidate_email FROM candidates WHERE id = NEW.candidate_id;
    
    IF TG_OP = 'INSERT' THEN
        -- Log workflow event
        INSERT INTO workflow_events (event_type, entity_type, entity_id, actor_id, actor_type, data)
        VALUES (
            'interest_sent',
            'candidate_interest',
            NEW.id,
            NEW.agency_id,
            'agency',
            jsonb_build_object(
                'candidate_name', candidate_name,
                'job_title', job_title,
                'agency_name', agency_name
            )
        );
        
        -- Notify manager
        INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id, action_url, priority, data)
        VALUES (
            manager_id,
            'candidate_interest_sent',
            'Candidate Interest Sent',
            agency_name || ' sent job opportunity to ' || candidate_name || ' for ' || job_title,
            'candidate_interest',
            NEW.id,
            '/dashboard/manager/applications',
            'normal',
            jsonb_build_object('candidate_id', NEW.candidate_id, 'job_id', NEW.job_id)
        );
        
    ELSIF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
        -- Log status change
        INSERT INTO workflow_events (event_type, entity_type, entity_id, actor_id, data)
        VALUES (
            'candidate_responded',
            'candidate_interest',
            NEW.id,
            NULL,
            jsonb_build_object(
                'old_status', OLD.status,
                'new_status', NEW.status,
                'candidate_name', candidate_name,
                'job_title', job_title
            )
        );
        
        -- Notify agency
        INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id, action_url, priority, data)
        VALUES (
            NEW.agency_id,
            'candidate_responded',
            'Candidate Responded',
            candidate_name || ' ' || 
            CASE 
                WHEN NEW.status = 'interested' THEN 'is interested in'
                WHEN NEW.status = 'not_interested' THEN 'declined'
                ELSE 'updated their response for'
            END || ' ' || job_title,
            'candidate_interest',
            NEW.id,
            '/dashboard/agency/candidates',
            CASE WHEN NEW.status = 'interested' THEN 'high' ELSE 'normal' END,
            jsonb_build_object('candidate_id', NEW.candidate_id, 'job_id', NEW.job_id, 'status', NEW.status)
        );
        
        -- Notify manager
        INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id, action_url, priority)
        VALUES (
            manager_id,
            'candidate_status_update',
            'Candidate Status Update',
            candidate_name || ' ' || NEW.status || ' for ' || job_title,
            'candidate_interest',
            NEW.id,
            '/dashboard/manager/applications',
            CASE WHEN NEW.status = 'interested' THEN 'high' ELSE 'normal' END
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS candidate_interest_notifications ON candidate_interests;
CREATE TRIGGER candidate_interest_notifications
    AFTER INSERT OR UPDATE ON candidate_interests
    FOR EACH ROW
    EXECUTE FUNCTION notify_candidate_interest();

-- ========================================
-- TRIGGER: Application Status Updates
-- ========================================

CREATE OR REPLACE FUNCTION notify_application_status()
RETURNS TRIGGER AS $$
DECLARE
    job_title TEXT;
    candidate_name TEXT;
    agency_name TEXT;
    manager_id UUID;
BEGIN
    SELECT title, manager_id INTO job_title, manager_id FROM jobs WHERE id = NEW.job_id;
    SELECT name INTO candidate_name FROM candidates WHERE id = NEW.candidate_id;
    SELECT full_name INTO agency_name FROM profiles WHERE id = NEW.submitted_by_agency_id;
    
    IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
        -- Log event
        INSERT INTO workflow_events (event_type, entity_type, entity_id, data)
        VALUES (
            'application_status_changed',
            'application',
            NEW.id,
            jsonb_build_object(
                'old_status', OLD.status,
                'new_status', NEW.status,
                'candidate_name', candidate_name,
                'job_title', job_title
            )
        );
        
        -- Notify agency
        IF NEW.submitted_by_agency_id IS NOT NULL THEN
            INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id, priority)
            VALUES (
                NEW.submitted_by_agency_id,
                'application_status_update',
                'Application Status: ' || UPPER(NEW.status),
                candidate_name || ' - ' || job_title || ' is now ' || NEW.status,
                'application',
                NEW.id,
                CASE 
                    WHEN NEW.status = 'shortlisted' THEN 'high'
                    WHEN NEW.status = 'interviewed' THEN 'high'
                    WHEN NEW.status = 'offered' THEN 'urgent'
                    ELSE 'normal'
                END
            );
        END IF;
        
        -- Notify manager
        INSERT INTO notifications (user_id, type, title, message, entity_type, entity_id)
        VALUES (
            manager_id,
            'application_update',
            'Application Updated',
            candidate_name || ' application status: ' || NEW.status,
            'application',
            NEW.id
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS application_status_notifications ON applications;
CREATE TRIGGER application_status_notifications
    AFTER UPDATE ON applications
    FOR EACH ROW
    EXECUTE FUNCTION notify_application_status();
