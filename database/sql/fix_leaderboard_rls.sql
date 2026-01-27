-- Fix RLS for student_skills_assessments to allow cohort-wide rankings
-- This allows students to see scores of others in their organization for the leaderboard.

-- 1. Drop the restrictive student-only select policy
DROP POLICY IF EXISTS "Students can view their own skills assessments" ON student_skills_assessments;

-- 2. Create a new policy that allows viewing assessments within the same organization
CREATE POLICY "Users can view cohort skills assessments"
ON student_skills_assessments
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles viewer, profiles student
        WHERE viewer.id = auth.uid()
        AND student.id = student_skills_assessments.student_id
        AND (
            -- Same organization
            viewer.org_id = student.org_id
            -- OR the viewer is an executive (usually has access to everything)
            OR viewer.role = 'executive'
        )
    )
);

-- Ensure managers still have full control (as defined in original script)
-- The original policy "Managers can manage team skills assessments" is FOR ALL, 
-- but it might be better to ensure it's robust. 
-- For now, the global SELECT policy covers the reading part for everyone in the org.
