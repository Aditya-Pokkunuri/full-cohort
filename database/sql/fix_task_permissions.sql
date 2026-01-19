-- Enable deletion of tasks for Organization members
-- Run this if you are unable to delete tasks due to permission issues

-- 1. Enable RLS (just in case)
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- 2. Create a specific policy for deleting tasks
-- This follows the pattern: Users can delete tasks that belong to their Organization
DROP POLICY IF EXISTS "Users can delete tasks" ON public.tasks;

CREATE POLICY "Users can delete tasks" ON public.tasks
FOR DELETE
USING (
  auth.uid() IN (
    SELECT id FROM public.profiles 
    WHERE org_id = public.tasks.org_id
  )
);
