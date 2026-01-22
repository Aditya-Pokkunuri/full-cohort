-- ============================================================================
-- SQL Migration: Add Self-Assessment and Override columns
-- ============================================================================
-- Purpose: Enable students to rate themselves and managers to override with reason.
--
-- New Columns:
--   - self_soft_skill_traits (JSONB)
--   - self_soft_skills_score (NUMERIC)
--   - self_development_skill_traits (JSONB)
--   - self_development_skills_score (NUMERIC)
--   - override_reason (TEXT)
--
-- Created: January 22, 2026
-- ============================================================================

-- Add columns if they don't exist
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
        ALTER TABLE student_skills_assessments ADD COLUMN override_reason TEXT;
    END IF;
END $$;

-- Comment on new columns
COMMENT ON COLUMN student_skills_assessments.self_soft_skill_traits IS 'Soft skills assessment by the student themselves';
COMMENT ON COLUMN student_skills_assessments.self_soft_skills_score IS 'Average soft skills score calculated from self-assessment';
COMMENT ON COLUMN student_skills_assessments.self_development_skill_traits IS 'Development skills assessment by the student themselves';
COMMENT ON COLUMN student_skills_assessments.self_development_skills_score IS 'Average development skills score calculated from self-assessment';
COMMENT ON COLUMN student_skills_assessments.override_reason IS 'Reason provided by manager/executive when their score differs from student self-score';
