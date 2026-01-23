-- Add RLS policies for students to manage their own self-assessments
-- This complements the existing policy which only allowed SELECT.

DROP POLICY IF EXISTS "Students can upsert their own self-assessments" ON public.student_skills_assessments;

CREATE POLICY "Students can upsert their own self-assessments"
ON public.student_skills_assessments
FOR ALL
TO authenticated
USING (student_id = auth.uid())
WITH CHECK (student_id = auth.uid());

-- Optional: If you want to be more restrictive and only allow students to edit the self_* fields,
-- that would require a trigger, but for now this ALL policy on rows they own is standard.
