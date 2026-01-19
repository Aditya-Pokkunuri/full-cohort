-- Fix task deletion by ensuring dependent records in 'time_logs' are automatically deleted
-- This resolves the "Foreign key violation" error when deleting a task

-- 1. Update time_logs constraint
ALTER TABLE public.time_logs
    DROP CONSTRAINT IF EXISTS time_logs_task_id_fkey;

ALTER TABLE public.time_logs
    ADD CONSTRAINT time_logs_task_id_fkey
    FOREIGN KEY (task_id)
    REFERENCES public.tasks(id)
    ON DELETE CASCADE;
