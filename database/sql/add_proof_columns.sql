-- Add proof_text and proof_url columns to tasks table if they don't exist
-- This ensures the legacy/flat compatibility for proof submissions

DO $$ 
BEGIN 
    -- Add proof_text if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'proof_text') THEN 
        ALTER TABLE tasks ADD COLUMN proof_text text; 
    END IF;

    -- Add proof_url if it doesn't exist (safety check, likely exists)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'proof_url') THEN 
        ALTER TABLE tasks ADD COLUMN proof_url text; 
    END IF;

END $$;
