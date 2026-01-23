-- Poll Feature Schema

-- 1. Poll Options Table
CREATE TABLE IF NOT EXISTS public.poll_options (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    message_id uuid REFERENCES public.messages(id) ON DELETE CASCADE,
    option_text text NOT NULL,
    created_at timestamptz DEFAULT now()
);

ALTER TABLE public.poll_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View poll options" ON public.poll_options
    FOR SELECT USING (true);

CREATE POLICY "Create poll options" ON public.poll_options
    FOR INSERT WITH CHECK (true);

-- 2. Poll Votes Table
CREATE TABLE IF NOT EXISTS public.poll_votes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    poll_option_id uuid REFERENCES public.poll_options(id) ON DELETE CASCADE,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now(),
    UNIQUE(poll_option_id, user_id) -- Prevent duplicate votes for same option
);

-- Note: To enforce single vote per poll, we'd need a trigger or application logic.
-- For now allowing multiple option selection (checkbox style) or single (radio) will be handled in UI/Service.
-- But usually simple polls are single choice.
-- Let's add a trigger to enforce single vote per poll if strictness is required,
-- but for flexibility let's rely on unique(poll_option_id, user_id) which allows voting for multiple DIFFERENT options,
-- acting like a multi-select poll. Message metadata can store if it's single/multi allow.
-- For this iterations, we'll assume multi-select is possible or restricted by UI.

ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View poll votes" ON public.poll_votes
    FOR SELECT USING (true);

CREATE POLICY "Cast poll votes" ON public.poll_votes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Delete own vote" ON public.poll_votes
    FOR DELETE USING (auth.uid() = user_id);

-- 3. Add Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.poll_options;
ALTER PUBLICATION supabase_realtime ADD TABLE public.poll_votes;
