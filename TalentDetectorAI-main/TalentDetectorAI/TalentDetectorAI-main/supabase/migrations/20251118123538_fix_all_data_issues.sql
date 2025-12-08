-- ===== STEP 1: Find and fix missing profiles =====

-- Create profiles for any auth users that don't have them
INSERT INTO profiles (id, email, full_name, role, created_at)
SELECT 
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'full_name', au.email),
    COALESCE(au.raw_user_meta_data->>'role', 'candidate'),
    au.created_at
FROM auth.users au
WHERE NOT EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = au.id
)
ON CONFLICT (id) DO NOTHING;

-- ===== STEP 2: Clean up orphaned commission proposals =====

-- Option A: Delete proposals with non-existent references (SAFE - removes bad data)
-- DELETE FROM commission_proposals
-- WHERE manager_id NOT IN (SELECT id FROM profiles)
--    OR agency_id NOT IN (SELECT id FROM profiles)
--    OR job_id NOT IN (SELECT id FROM jobs);

-- Option B: Keep the data but create placeholder profiles (PRESERVES data)
-- For any manager_id that doesn't exist, create a placeholder profile
INSERT INTO profiles (id, email, full_name, role, created_at)
SELECT DISTINCT 
    cp.manager_id,
    'placeholder_' || cp.manager_id || '@temp.com',
    'Deleted Manager',
    'hiring_manager',
    NOW()
FROM commission_proposals cp
WHERE cp.manager_id NOT IN (SELECT id FROM profiles)
ON CONFLICT (id) DO NOTHING;

-- For any agency_id that doesn't exist, create a placeholder profile
INSERT INTO profiles (id, email, full_name, role, created_at)
SELECT DISTINCT 
    cp.agency_id,
    'placeholder_' || cp.agency_id || '@temp.com',
    'Deleted Agency',
    'agency',
    NOW()
FROM commission_proposals cp
WHERE cp.agency_id NOT IN (SELECT id FROM profiles)
ON CONFLICT (id) DO NOTHING;

-- ===== STEP 3: Now foreign keys will work =====

-- Drop existing constraints if they exist
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'commission_proposals_agency_id_fkey') THEN
        ALTER TABLE commission_proposals DROP CONSTRAINT commission_proposals_agency_id_fkey;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'commission_proposals_manager_id_fkey') THEN
        ALTER TABLE commission_proposals DROP CONSTRAINT commission_proposals_manager_id_fkey;
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'commission_proposals_job_id_fkey') THEN
        ALTER TABLE commission_proposals DROP CONSTRAINT commission_proposals_job_id_fkey;
    END IF;
END $$;

-- Add proper foreign keys
ALTER TABLE commission_proposals
ADD CONSTRAINT commission_proposals_agency_id_fkey 
FOREIGN KEY (agency_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE commission_proposals
ADD CONSTRAINT commission_proposals_manager_id_fkey 
FOREIGN KEY (manager_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE commission_proposals
ADD CONSTRAINT commission_proposals_job_id_fkey 
FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE;

-- ===== STEP 4: Verify data integrity =====

-- This will show any remaining issues
DO $$
DECLARE
    orphaned_count INTEGER;
BEGIN
    -- Check for orphaned proposals
    SELECT COUNT(*) INTO orphaned_count
    FROM commission_proposals cp
    WHERE NOT EXISTS (SELECT 1 FROM profiles WHERE id = cp.manager_id)
       OR NOT EXISTS (SELECT 1 FROM profiles WHERE id = cp.agency_id)
       OR NOT EXISTS (SELECT 1 FROM jobs WHERE id = cp.job_id);
    
    IF orphaned_count > 0 THEN
        RAISE WARNING 'Found % orphaned commission proposals', orphaned_count;
    ELSE
        RAISE NOTICE 'All commission proposals have valid references!';
    END IF;
END $$;
