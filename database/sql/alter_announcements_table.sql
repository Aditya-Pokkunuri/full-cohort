-- Add missing columns to announcements table
ALTER TABLE public.announcements
ADD COLUMN IF NOT EXISTS event_date date,
ADD COLUMN IF NOT EXISTS event_time text, -- Using text for flexibility with HH:MM format
ADD COLUMN IF NOT EXISTS event_for text default 'all', -- 'all', 'team', 'specific'
ADD COLUMN IF NOT EXISTS employees jsonb default '[]'::jsonb,
ADD COLUMN IF NOT EXISTS teams jsonb default '[]'::jsonb;

-- Optional: Add index for faster filtering if needed
CREATE INDEX IF NOT EXISTS idx_announcements_event_date ON public.announcements(event_date);
