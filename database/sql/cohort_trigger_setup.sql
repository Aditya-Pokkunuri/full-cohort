-- Trigger Setup for Seamless User Creation in Cohort
-- Run this ONCE in your Supabase SQL Editor.

-- 1. Create the Function
CREATE OR REPLACE FUNCTION public.handle_new_cohort_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, org_id)
  VALUES (
    new.id, 
    new.email, 
    -- Use metadata name if provided, else default to 'Cohort Member'
    COALESCE(new.raw_user_meta_data->>'full_name', 'Cohort Member'),
    -- Use metadata role if provided, else default to 'employee'
    COALESCE(new.raw_user_meta_data->>'role', 'employee'),
    -- Fixed Cohort Org ID
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create the Trigger
-- This will run automatically every time a user is created in Auth
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_cohort_user();

-- 3. (Optional) Fix for existing users if any (skip if empty)
-- INSERT INTO public.profiles (id, email, org_id, role)
-- SELECT id, email, 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'employee'
-- FROM auth.users
-- WHERE id NOT IN (SELECT id FROM public.profiles);
