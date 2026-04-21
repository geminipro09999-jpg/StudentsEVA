-- Attendance Feature Schema
-- Run this in your Supabase SQL editor

CREATE TABLE IF NOT EXISTS public.attendance (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id TEXT NOT NULL,
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    year INTEGER NOT NULL,
    present_days INTEGER NOT NULL DEFAULT 0,
    total_days INTEGER NOT NULL DEFAULT 1,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (student_id, month, year)
);

-- Disable RLS for MVP (enable in production)
ALTER TABLE public.attendance DISABLE ROW LEVEL SECURITY;

-- Optional index for fast lookups
CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON public.attendance (student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_month_year ON public.attendance (month, year);
