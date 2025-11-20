-- Drop existing policies
DROP POLICY IF EXISTS "allow_select_all_managers" ON profiles;

-- Create correct policy for hiring_manager role
CREATE POLICY "allow_select_all_hiring_managers"
ON profiles FOR SELECT
TO authenticated
USING (role = 'hiring_manager');

-- Verify all roles in the system
-- Expected roles: 'hiring_manager', 'agency', 'candidate'
