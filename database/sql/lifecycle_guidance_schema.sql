-- =====================================================
-- Lifecycle Stage Guidance - Supabase Schema Reference
-- =====================================================
-- This file documents the data structure for lifecycle stage guidance.
-- NO schema changes are required since phase_validations is already JSONB.
-- Run these queries only if you need to inspect or debug the data.

-- =====================================================
-- 1. View tasks with their phase guidance
-- =====================================================
SELECT 
    id,
    title,
    assigned_to,
    lifecycle_state,
    phase_validations->'active_phases' AS active_phases,
    phase_validations->'guidance' AS guidance
FROM tasks
WHERE phase_validations->'guidance' IS NOT NULL
ORDER BY created_at DESC
LIMIT 20;

-- =====================================================
-- 2. View guidance for a specific phase across all tasks
-- =====================================================
SELECT 
    id,
    title,
    phase_validations->'guidance'->>'requirement_refiner' AS requirements_guidance,
    phase_validations->'guidance'->>'design_guidance' AS design_guidance,
    phase_validations->'guidance'->>'build_guidance' AS build_guidance
FROM tasks
WHERE phase_validations->'guidance' IS NOT NULL
LIMIT 20;

-- =====================================================
-- 3. Check if a task has guidance for current phase
-- =====================================================
-- Replace 'TASK_ID_HERE' with actual task UUID
SELECT 
    id,
    title,
    lifecycle_state,
    phase_validations->'guidance'->>lifecycle_state AS current_phase_guidance
FROM tasks
WHERE id = 'TASK_ID_HERE';

-- =====================================================
-- 4. Update guidance for a specific task phase (if needed)
-- =====================================================
-- This is an example - replace values as needed
/*
UPDATE tasks
SET phase_validations = jsonb_set(
    phase_validations,
    '{guidance, requirement_refiner}',
    '"Updated guidance text here"'::jsonb
)
WHERE id = 'TASK_ID_HERE';
*/

-- =====================================================
-- 5. Expected phase_validations structure
-- =====================================================
/*
{
    "active_phases": ["requirement_refiner", "design_guidance", "build_guidance", "deployment"],
    "guidance": {
        "requirement_refiner": "Gather all requirements from the client document...",
        "design_guidance": "Follow the Figma mockups at https://...",
        "build_guidance": "Use React with TypeScript...",
        "deployment": "Deploy to staging first for review."
    },
    "requirement_refiner": {
        "status": "approved",
        "proof_url": "...",
        "submitted_at": "..."
    }
}
*/
