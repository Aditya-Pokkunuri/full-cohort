-- ============================================================================
-- SQL Migration: FIX Student Skills Assessments Schema & Permissions
-- ============================================================================
-- Run this in Supabase SQL Editor if you encounter a 400 error when saving.

-- 1. Add Self-Assessment columns if they are missing
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'student_skills_assessments' AND column_name = 'self_soft_skill_traits') THEN
        ALTER TABLE student_skills_assessments ADD COLUMN self_soft_skill_traits JSONB DEFAULT '{}';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'student_skills_assessments' AND column_name = 'self_soft_skills_score') THEN
        ALTER TABLE student_skills_assessments ADD COLUMN self_soft_skills_score NUMERIC(4,2) DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'student_skills_assessments' AND column_name = 'self_development_skill_traits') THEN
        ALTER TABLE student_skills_assessments ADD COLUMN self_development_skill_traits JSONB DEFAULT '{}';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'student_skills_assessments' AND column_name = 'self_development_skills_score') THEN
        ALTER TABLE student_skills_assessments ADD COLUMN self_development_skills_score NUMERIC(4,2) DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'student_skills_assessments' AND column_name = 'override_reason') THEN
        ALTER TABLE student_skills_assessments ADD COLUMN override_reason TEXT DEFAULT '';
    END IF;
END $$;

-- 2. Ensure RLS Policy allows students to save their own assessments
-- Remove old policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Students can view their own skills assessments" ON public.student_skills_assessments;
DROP POLICY IF EXISTS "Students can upsert their own self-assessments" ON public.student_skills_assessments;

-- Allow students to view, insert, and update rows where they are the student
CREATE POLICY "Manage own skills assessments"
ON public.student_skills_assessments
FOR ALL
TO authenticated
USING (student_id = auth.uid())
WITH CHECK (student_id = auth.uid());

-- 3. Ensure CHECK constraint includes 'employee' role
ALTER TABLE student_skills_assessments 
DROP CONSTRAINT IF EXISTS student_skills_assessments_reviewer_role_check;

ALTER TABLE student_skills_assessments 
ADD CONSTRAINT student_skills_assessments_reviewer_role_check 
CHECK (reviewer_role IN ('executive', 'manager', 'team_lead', 'employee'));

-- 4. Verify (Optional log)
COMMENT ON TABLE student_skills_assessments IS 'Stores periodic assessments with self-review support';
