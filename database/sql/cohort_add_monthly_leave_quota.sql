-- Add monthly_leave_quota to profiles table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'monthly_leave_quota') THEN
        ALTER TABLE public.profiles ADD COLUMN monthly_leave_quota integer DEFAULT 0;
    END IF;
END $$;

-- Reload the schema cache by notifying pgbouncer or simply expecting Supabase to catch up
-- Usually just running the DDL is enough.
