-- Migration v9: Add is_required to viva_criteria
ALTER TABLE public.viva_criteria ADD COLUMN IF NOT EXISTS is_required BOOLEAN DEFAULT TRUE;

-- Add remark to viva_scores if missing (for overall remark consistency)
ALTER TABLE public.viva_scores ADD COLUMN IF NOT EXISTS remark TEXT DEFAULT '';
