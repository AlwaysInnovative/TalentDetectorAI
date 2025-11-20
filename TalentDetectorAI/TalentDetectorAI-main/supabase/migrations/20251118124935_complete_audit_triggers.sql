-- Create audit tables if they don't exist
CREATE TABLE IF NOT EXISTS job_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL,
    action TEXT NOT NULL,
    field_changed TEXT,
    old_value TEXT,
    new_value TEXT,
    changed_by UUID,
    changed_by_name TEXT,
    changed_by_role TEXT,
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agency_assignment_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL,
    agency_id UUID,
    agency_name TEXT,
    action TEXT NOT NULL,
    old_rate NUMERIC,
    new_rate NUMERIC,
    status TEXT,
    comment TEXT,
    changed_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_job_history_job_id ON job_history(job_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agency_assignment_history_job ON agency_assignment_history(job_id, created_at DESC);

-- Enable RLS
ALTER TABLE job_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE agency_assignment_history ENABLE ROW LEVEL SECURITY;

-- RLS policies
DROP POLICY IF EXISTS "job_history_select" ON job_history;
CREATE POLICY "job_history_select" ON job_history FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "agency_history_select" ON agency_assignment_history;
CREATE POLICY "agency_history_select" ON agency_assignment_history FOR SELECT TO authenticated USING (true);

-- Trigger function for commission proposals
CREATE OR REPLACE FUNCTION track_commission_changes()
RETURNS TRIGGER AS $$
DECLARE
    agency_name TEXT;
BEGIN
    SELECT full_name INTO agency_name FROM profiles WHERE id = NEW.agency_id;

    IF TG_OP = 'INSERT' THEN
        INSERT INTO agency_assignment_history (job_id, agency_id, agency_name, action, new_rate, status, changed_by)
        VALUES (NEW.job_id, NEW.agency_id, agency_name, 'assigned', NEW.manager_percentage, NEW.status, auth.uid());
        
        INSERT INTO job_history (job_id, action, field_changed, new_value, changed_by, changed_by_role, comment)
        VALUES (NEW.job_id, 'agency_assigned', 'agency', agency_name, auth.uid(), 'hiring_manager', 
                'Assigned with ' || NEW.manager_percentage || '% commission');

    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.manager_percentage != NEW.manager_percentage THEN
            INSERT INTO agency_assignment_history (job_id, agency_id, agency_name, action, old_rate, new_rate, status, changed_by)
            VALUES (NEW.job_id, NEW.agency_id, agency_name, 'rate_changed', OLD.manager_percentage, NEW.manager_percentage, NEW.status, auth.uid());
        END IF;

        IF OLD.status != NEW.status THEN
            INSERT INTO agency_assignment_history (job_id, agency_id, agency_name, action, new_rate, status, changed_by)
            VALUES (NEW.job_id, NEW.agency_id, agency_name, 'status_' || NEW.status, NEW.manager_percentage, NEW.status, auth.uid());
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS commission_proposals_audit_trigger ON commission_proposals;
CREATE TRIGGER commission_proposals_audit_trigger
    AFTER INSERT OR UPDATE ON commission_proposals
    FOR EACH ROW
    EXECUTE FUNCTION track_commission_changes();

-- Prevent editing open jobs
CREATE OR REPLACE FUNCTION prevent_edit_open_jobs()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status = 'open' AND NEW.status = 'open' THEN
        IF OLD.title != NEW.title OR OLD.description != NEW.description OR 
           OLD.location != NEW.location OR OLD.salary_min != NEW.salary_min OR OLD.salary_max != NEW.salary_max THEN
            RAISE EXCEPTION 'Cannot edit job details while status is OPEN. Change status first.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_edit_open_jobs_trigger ON jobs;
CREATE TRIGGER prevent_edit_open_jobs_trigger
    BEFORE UPDATE ON jobs
    FOR EACH ROW
    EXECUTE FUNCTION prevent_edit_open_jobs();
