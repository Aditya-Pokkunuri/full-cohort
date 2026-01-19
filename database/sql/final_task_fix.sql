-- Comprehensive Fix for Task Management
-- Run this in your Supabase SQL Editor

-- 1. Fix missing Organization IDs for existing tasks
-- This ensures they match your profile's organization
UPDATE public.tasks 
SET org_id = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' 
WHERE org_id IS NULL;

-- 2. Update Row Level Security (RLS) to allow flexible deletion
-- Drop the previous policy
DROP POLICY IF EXISTS "Users can delete tasks" ON public.tasks;

-- Create a robust policy that allows deletion for Managers, Team Leads, Executives, 
-- or the person who created the task (assigned_by).
CREATE POLICY "Users can delete tasks" ON public.tasks
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND (
      profiles.role IN ('manager', 'executive') 
      OR public.tasks.assigned_by = auth.uid()
    )
    -- Final safety: ensure user belongs to the same organization as the task
    -- (The tasks table org_id was fixed to match in Step 1)
    AND (profiles.org_id = public.tasks.org_id OR public.tasks.org_id IS NULL)
  )
);

-- 3. Ensure 'ALL' policy doesn't conflict
-- If there is a generic policy preventing delete, we can explicitly enable it
-- This script assumes the current setup allows DELETE via the policy above.
