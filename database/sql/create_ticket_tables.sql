-- Create generic Tickets table
CREATE TABLE IF NOT EXISTS public.tickets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    type TEXT NOT NULL CHECK (type IN ('issue', 'enhancement')), -- Distinguish between Issue and Enhancement
    category TEXT NOT NULL,
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT DEFAULT 'open', -- Status can be 'open', 'proposed', 'in_progress', 'resolved', 'closed', etc.
    attachments JSONB DEFAULT '[]'::JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

-- Policies
-- Users can view their own tickets
CREATE POLICY "Users can view own tickets" ON public.tickets
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own tickets
CREATE POLICY "Users can create tickets" ON public.tickets
    FOR INSERT WITH CHECK (auth.uid() = user_id);
