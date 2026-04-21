-- Timesheet Feature Schema
-- Run this in your Supabase SQL editor

CREATE TABLE IF NOT EXISTS public.timesheets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lecturer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    work_date DATE NOT NULL,
    in_time TIME NOT NULL,
    out_time TIME NOT NULL,
    hours NUMERIC(5,2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    admin_note TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (lecturer_id, work_date)
);

-- Disable RLS for MVP
ALTER TABLE public.timesheets DISABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_timesheets_lecturer ON public.timesheets (lecturer_id);
CREATE INDEX IF NOT EXISTS idx_timesheets_status ON public.timesheets (status);
CREATE INDEX IF NOT EXISTS idx_timesheets_date ON public.timesheets (work_date);
