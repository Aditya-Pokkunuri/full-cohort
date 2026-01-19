-- Add missing columns to tasks table for proof submission and lifecycle support
DO $$
BEGIN
    -- Add proof_text if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'proof_text') THEN
        ALTER TABLE public.tasks ADD COLUMN proof_text text;
    END IF;

    -- Add proof_url if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'proof_url') THEN
        ALTER TABLE public.tasks ADD COLUMN proof_url text;
    END IF;

    -- Add phase_validations if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'phase_validations') THEN
        ALTER TABLE public.tasks ADD COLUMN phase_validations jsonb DEFAULT '{}'::jsonb;
    END IF;

    -- Add lifecycle_state if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'lifecycle_state') THEN
        ALTER TABLE public.tasks ADD COLUMN lifecycle_state text DEFAULT 'requirements';
    END IF;

    -- Add sub_state if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'sub_state') THEN
        ALTER TABLE public.tasks ADD COLUMN sub_state text DEFAULT 'in_progress';
    END IF;
END $$;
