-- FIX: Photo Upload and Avatar Permissions
-- Run this script in the Supabase SQL Editor to ensure Profile Photo Upload works for all roles.

-- 1. Ensure 'avatars' bucket exists and is public
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE
SET public = true;

-- 2. Drop existing policies to avoid conflicts/duplicates
DROP POLICY IF EXISTS "Public Access Avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload Avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Update Avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Delete Avatars" ON storage.objects;
DROP POLICY IF EXISTS "Avatars Public Read" ON storage.objects;
DROP POLICY IF EXISTS "Avatars Auth Insert" ON storage.objects;
DROP POLICY IF EXISTS "Avatars Auth Update" ON storage.objects;
DROP POLICY IF EXISTS "Avatars Auth Delete" ON storage.objects;

-- 3. Re-create Storage Policies (Permissive for Authenticated Users)

-- Policy: Anyone can view avatars
CREATE POLICY "Public Access Avatars"
ON storage.objects FOR SELECT
USING ( bucket_id = 'avatars' );

-- Policy: Any authenticated user can upload to 'avatars'
-- We allow them to upload any file. Use folder restrictions if needed (e.g. (storage.foldername(name))[1] = auth.uid()::text)
-- For now, keeping it simple as per original design.
CREATE POLICY "Authenticated Upload Avatars"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'avatars' AND auth.role() = 'authenticated' );

-- Policy: Any authenticated user can update files in 'avatars'
CREATE POLICY "Authenticated Update Avatars"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'avatars' AND auth.role() = 'authenticated' );

-- Policy: Any authenticated user can delete files in 'avatars'
CREATE POLICY "Authenticated Delete Avatars"
ON storage.objects FOR DELETE
USING ( bucket_id = 'avatars' AND auth.role() = 'authenticated' );

-- 4. Ensure PROFILES table allows AVATAR_URL update
-- (This might be redundant if policies already exist, but good to verify)

-- Check if Profiles RLS is enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Ensure "Users can update own profile" policy exists
-- We drop and recreate it to be sure it covers the avatar_url
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING ( auth.uid() = id )
WITH CHECK ( auth.uid() = id );

-- 5. Grant usage on schema (sometimes needed for new roles)
GRANT USAGE ON SCHEMA storage TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA storage TO postgres, anon, authenticated, service_role;
