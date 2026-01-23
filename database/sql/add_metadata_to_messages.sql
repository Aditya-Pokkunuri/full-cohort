-- Add metadata column to messages table for flexible configuration (e.g. poll settings)
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;
