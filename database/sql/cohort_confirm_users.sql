-- Confirm all users with emails ending in @cohort.com or @cohort.test
UPDATE auth.users
SET email_confirmed_at = now()
WHERE email LIKE '%@cohort.com' OR email LIKE '%@cohort.test';

-- Specifically confirm aditya@cohort.com just in case
UPDATE auth.users
SET email_confirmed_at = now()
WHERE email = 'aditya@cohort.com';
