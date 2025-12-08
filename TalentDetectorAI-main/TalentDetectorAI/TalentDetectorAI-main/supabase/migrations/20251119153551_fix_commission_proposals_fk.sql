-- ========================================
-- FIX COMMISSION PROPOSALS FOREIGN KEYS
-- ========================================

-- Drop existing foreign key constraints
ALTER TABLE commission_proposals
DROP CONSTRAINT IF EXISTS commission_proposals_manager_id_fkey,
DROP CONSTRAINT IF EXISTS commission_proposals_agency_id_fkey,
DROP CONSTRAINT IF EXISTS commission_proposals_job_id_fkey;

-- Add correct foreign key constraints
ALTER TABLE commission_proposals
ADD CONSTRAINT commission_proposals_manager_id_fkey 
  FOREIGN KEY (manager_id) 
  REFERENCES profiles(id) 
  ON DELETE CASCADE,

ADD CONSTRAINT commission_proposals_agency_id_fkey 
  FOREIGN KEY (agency_id) 
  REFERENCES profiles(id) 
  ON DELETE CASCADE,

ADD CONSTRAINT commission_proposals_job_id_fkey 
  FOREIGN KEY (job_id) 
  REFERENCES jobs(id) 
  ON DELETE CASCADE;

-- Ensure profiles table has proper structure
ALTER TABLE profiles
DROP CONSTRAINT IF EXISTS profiles_id_fkey;

ALTER TABLE profiles
ADD CONSTRAINT profiles_id_fkey 
  FOREIGN KEY (id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_commission_proposals_manager_id 
  ON commission_proposals(manager_id);

CREATE INDEX IF NOT EXISTS idx_commission_proposals_agency_id 
  ON commission_proposals(agency_id);

CREATE INDEX IF NOT EXISTS idx_commission_proposals_job_id 
  ON commission_proposals(job_id);

CREATE INDEX IF NOT EXISTS idx_commission_proposals_status 
  ON commission_proposals(status);

-- Verification
DO $$
DECLARE
  manager_fk_exists BOOLEAN;
  agency_fk_exists BOOLEAN;
  job_fk_exists BOOLEAN;
BEGIN
  -- Check constraints
  SELECT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'commission_proposals_manager_id_fkey'
  ) INTO manager_fk_exists;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'commission_proposals_agency_id_fkey'
  ) INTO agency_fk_exists;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'commission_proposals_job_id_fkey'
  ) INTO job_fk_exists;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ COMMISSION PROPOSALS FK FIXED!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Foreign Key Constraints:';
  RAISE NOTICE '  manager_id → profiles: %', CASE WHEN manager_fk_exists THEN '✅' ELSE '❌' END;
  RAISE NOTICE '  agency_id → profiles: %', CASE WHEN agency_fk_exists THEN '✅' ELSE '❌' END;
  RAISE NOTICE '  job_id → jobs: %', CASE WHEN job_fk_exists THEN '✅' ELSE '❌' END;
  RAISE NOTICE '';
  RAISE NOTICE 'Now managers can invite agencies without errors!';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END $$;
