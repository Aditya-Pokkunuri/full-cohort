-- Add message_type to messages table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'message_type') THEN
        ALTER TABLE public.messages ADD COLUMN message_type text DEFAULT 'text';
    END IF;
END $$;
