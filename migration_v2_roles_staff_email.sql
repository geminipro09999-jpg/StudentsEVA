-- Fix: Add roles column and other missing profile fields
-- This script adds the missing 'roles' column and ensures all profile/bank fields exist.

-- 1. Add roles column if missing
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS roles TEXT[] DEFAULT ARRAY['lecturer'];

-- 2. Migrate existing single role to roles array for any users where roles is empty
UPDATE public.users SET roles = ARRAY[role] WHERE roles IS NULL OR roles = '{}';

-- 3. Add other missing profile fields
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS staff_email TEXT; -- Official / Staff contact email
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS account_name TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS bank_name TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS account_no TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS branch TEXT;

-- 4. Final verification: enable RLS and ensure appropriate permissions (optional, keep existing settings)
-- ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
