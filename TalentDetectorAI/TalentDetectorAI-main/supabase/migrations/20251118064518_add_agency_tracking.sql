-- Add agency tracking to applications
ALTER TABLE applications ADD COLUMN IF NOT EXISTS submitted_by_agency_id UUID REFERENCES auth.users(id);
ALTER TABLE applications ADD COLUMN IF NOT EXISTS agency_commission DECIMAL(5,2);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_applications_agency ON applications(submitted_by_agency_id);

-- Function to auto-populate agency commission when application is created
CREATE OR REPLACE FUNCTION set_agency_commission()
RETURNS TRIGGER AS $$
BEGIN
  -- Get the agreed commission for this job and agency
  SELECT agreed_percentage INTO NEW.agency_commission
  FROM commission_proposals
  WHERE job_id = NEW.job_id
    AND agency_id = NEW.submitted_by_agency_id
    AND status = 'accepted'
  LIMIT 1;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS set_agency_commission_trigger ON applications;
CREATE TRIGGER set_agency_commission_trigger
  BEFORE INSERT ON applications
  FOR EACH ROW
  EXECUTE FUNCTION set_agency_commission();
