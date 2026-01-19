-- Enable Auto Confirm for new users
-- Run this in your Supabase SQL Editor

-- 1. Create the auto-confirm function
CREATE OR REPLACE FUNCTION public.auto_confirm_new_users()
RETURNS trigger AS $$
BEGIN
    NEW.email_confirmed_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create the trigger to run BEFORE insertion
DROP TRIGGER IF EXISTS on_auth_user_created_auto_confirm ON auth.users;

CREATE TRIGGER on_auth_user_created_auto_confirm
BEFORE INSERT ON auth.users
FOR EACH ROW EXECUTE PROCEDURE public.auto_confirm_new_users();

-- 3. Confirm ANY existing unconfirmed users
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE email_confirmed_at IS NULL;
