-- Add conversation_id to notifications table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'conversation_id') THEN
        ALTER TABLE public.notifications ADD COLUMN conversation_id text REFERENCES public.conversations(id) ON DELETE CASCADE;
    END IF;
END $$;
