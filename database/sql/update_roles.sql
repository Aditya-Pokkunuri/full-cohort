-- Update 'employee' role to 'student' in project_members table
UPDATE project_members 
SET role = 'student' 
WHERE role = 'employee';

-- Optional: Update 'team_members' table if it exists and uses this role
-- UPDATE team_members SET role_in_project = 'student' WHERE role_in_project = 'employee';
