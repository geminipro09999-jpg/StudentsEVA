-- 1. Upgrade Users Table for Multi-Role and Profile Details
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS roles TEXT[] DEFAULT ARRAY['lecturer'];
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS address TEXT DEFAULT '';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT '';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS account_name TEXT DEFAULT '';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS bank_name TEXT DEFAULT '';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS account_no TEXT DEFAULT '';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS branch TEXT DEFAULT '';

-- 2. Migrate existing 'role' to 'roles' array
UPDATE public.users 
SET roles = ARRAY[role] 
WHERE roles IS NULL OR roles = ARRAY['lecturer'];

-- 3. Update 'admin' to have admin role in the array
UPDATE public.users 
SET roles = ARRAY['admin'] 
WHERE role = 'admin' AND 'admin' != ALL(roles);

-- 4. Enable RLS or ensure Disable if that's what we've been doing
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
