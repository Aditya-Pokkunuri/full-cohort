-- Add sender_type to messages table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'sender_type') THEN
        ALTER TABLE public.messages ADD COLUMN sender_type text DEFAULT 'human';
    END IF;
END $$;
