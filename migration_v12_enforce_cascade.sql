-- Ensure Viva Event deletions cascade to all related data
-- This fixes the "cannot delete viva" error when scores or panelists exist.

-- 1. Fix viva_criteria
ALTER TABLE public.viva_criteria 
DROP CONSTRAINT IF EXISTS viva_criteria_viva_id_fkey,
ADD CONSTRAINT viva_criteria_viva_id_fkey 
FOREIGN KEY (viva_id) 
REFERENCES public.viva_events(id) 
ON DELETE CASCADE;

-- 2. Fix viva_panelists
ALTER TABLE public.viva_panelists 
DROP CONSTRAINT IF EXISTS viva_panelists_viva_id_fkey,
ADD CONSTRAINT viva_panelists_viva_id_fkey 
FOREIGN KEY (viva_id) 
REFERENCES public.viva_events(id) 
ON DELETE CASCADE;

-- 3. Fix viva_scores
-- Scores depend on both viva_id AND criteria_id. Both should cascade.
ALTER TABLE public.viva_scores 
DROP CONSTRAINT IF EXISTS viva_scores_viva_id_fkey,
ADD CONSTRAINT viva_scores_viva_id_fkey 
FOREIGN KEY (viva_id) 
REFERENCES public.viva_events(id) 
ON DELETE CASCADE;

ALTER TABLE public.viva_scores 
DROP CONSTRAINT IF EXISTS viva_scores_criteria_id_fkey,
ADD CONSTRAINT viva_scores_criteria_id_fkey 
FOREIGN KEY (criteria_id) 
REFERENCES public.viva_criteria(id) 
ON DELETE CASCADE;

-- Also ensure RLS is disabled if it was accidentally re-enabled
ALTER TABLE public.viva_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.viva_criteria DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.viva_panelists DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.viva_scores DISABLE ROW LEVEL SECURITY;
