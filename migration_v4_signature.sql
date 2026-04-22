-- Add e_signature column to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS e_signature TEXT;

-- Comment for clarity
COMMENT ON COLUMN public.users.e_signature IS 'Base64 string or URL of the user signature image';
