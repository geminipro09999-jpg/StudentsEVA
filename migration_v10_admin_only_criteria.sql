-- Migration v10: Add admin_only to viva_criteria
ALTER TABLE public.viva_criteria ADD COLUMN IF NOT EXISTS admin_only BOOLEAN DEFAULT FALSE;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
