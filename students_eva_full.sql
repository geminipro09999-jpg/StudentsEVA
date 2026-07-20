-- ======= supabase_schema.sql =======
-- Supabase SQL Schema for Student Evaluation App

-- 1. Create Users Table (for NextAuth Custom Credentials)
CREATE TABLE public.users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'lecturer',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create Students Table
CREATE TABLE public.students (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    photo_url TEXT DEFAULT '',
    course TEXT NOT NULL,
    batch TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create Feedbacks Table
CREATE TABLE public.feedbacks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    lecturer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    remark TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Allow anonymous reads/writes for simplicity during our MVP
-- (In production, Row Level Security (RLS) should be enabled)
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.students DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedbacks DISABLE ROW LEVEL SECURITY;


-- ======= upgrade_schema.sql =======
-- 1. Update Students Table
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS group_name TEXT DEFAULT '';

-- 2. Create Subjects Table
CREATE TABLE IF NOT EXISTS public.subjects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create Lab Activities Table
CREATE TABLE IF NOT EXISTS public.lab_activities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ENSURE UNIQUE CONSTRAINTS (Fix for existing tables without constraints)
DO $$ 
BEGIN
    -- Subjects name uniqueness
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'subjects_name_key') THEN
        BEGIN
            ALTER TABLE public.subjects ADD CONSTRAINT subjects_name_key UNIQUE (name);
        EXCEPTION WHEN others THEN 
            RAISE NOTICE 'Could not add unique constraint to subjects(name), might already exist with different name';
        END;
    END IF;

    -- Lab activities name uniqueness
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lab_activities_name_key') THEN
        BEGIN
            ALTER TABLE public.lab_activities ADD CONSTRAINT lab_activities_name_key UNIQUE (name);
        EXCEPTION WHEN others THEN 
            RAISE NOTICE 'Could not add unique constraint to lab_activities(name), might already exist with different name';
        END;
    END IF;

    -- Safely add subject_id to lab_activities if it's missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name='lab_activities' AND column_name='subject_id') THEN
        ALTER TABLE public.lab_activities ADD COLUMN subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 4. Update Feedbacks Table
ALTER TABLE public.feedbacks 
ADD COLUMN IF NOT EXISTS lab_activity_id UUID REFERENCES public.lab_activities(id) ON DELETE SET NULL;

-- 5. Create Settings Table
CREATE TABLE IF NOT EXISTS public.settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Disable RLS for MVP
ALTER TABLE public.subjects DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_activities DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings DISABLE ROW LEVEL SECURITY;

-- 7. Seeding Initial Data (Uses WHERE NOT EXISTS for maximum safety)
DO $$
DECLARE
    gen_id UUID;
BEGIN
    -- Create 'General' subject safely
    IF NOT EXISTS (SELECT 1 FROM public.subjects WHERE name = 'General') THEN
        INSERT INTO public.subjects (name) VALUES ('General');
    END IF;
    
    SELECT id INTO gen_id FROM public.subjects WHERE name = 'General';
    
    -- Insert labs safely
    IF NOT EXISTS (SELECT 1 FROM public.lab_activities WHERE name = 'Lab Act 01') THEN
        INSERT INTO public.lab_activities (name, subject_id) VALUES ('Lab Act 01', gen_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.lab_activities WHERE name = 'Lab Act 02') THEN
        INSERT INTO public.lab_activities (name, subject_id) VALUES ('Lab Act 02', gen_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.lab_activities WHERE name = 'Lab Act 03') THEN
        INSERT INTO public.lab_activities (name, subject_id) VALUES ('Lab Act 03', gen_id);
    END IF;

    -- Seed settings safely
    IF NOT EXISTS (SELECT 1 FROM public.settings WHERE key = 'google_sheet_id') THEN
        INSERT INTO public.settings (key, value) VALUES ('google_sheet_id', '');
    END IF;
END $$;


-- ======= attendance_schema.sql =======
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


-- ======= timesheet_schema.sql =======
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


-- ======= add_payment_info_to_users.sql =======
-- Add payment information to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS hourly_rate NUMERIC(15, 2) DEFAULT 3000.00,
ADD COLUMN IF NOT EXISTS payment_unit TEXT DEFAULT 'hour' CHECK (payment_unit IN ('hour', 'unit'));

-- Update existing users to have a default rate
UPDATE public.users SET hourly_rate = 3000.00, payment_unit = 'hour' WHERE hourly_rate IS NULL;


-- ======= migration_roles_profile.sql =======
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


-- ======= migration_v2_roles_staff_email.sql =======
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


-- ======= migration_v3_invoices_workflow.sql =======
-- Create invoices table for approval workflow
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    invoice_no TEXT NOT NULL UNIQUE,
    month TEXT NOT NULL,
    year INTEGER NOT NULL,
    amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
    deductions NUMERIC(15, 2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    invoice_data JSONB NOT NULL, -- Stores full invoice state (qty, unit price, date, etc.)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- 1. Staff can view their own invoices
CREATE POLICY "Staff can view own invoices" ON public.invoices
    FOR SELECT USING (auth.uid() = user_id);

-- 2. Staff can insert their own invoices (Submit)
CREATE POLICY "Staff can submit own invoices" ON public.invoices
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 3. Admins can view ALL invoices
CREATE POLICY "Admins can view all invoices" ON public.invoices
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND ('admin' = ANY(roles) OR 'administrator' = ANY(roles) OR role IN ('admin', 'administrator'))
        )
    );

-- 4. Admins can update status and deductions
CREATE POLICY "Admins can manage invoices" ON public.invoices
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() 
            AND ('admin' = ANY(roles) OR 'administrator' = ANY(roles) OR role IN ('admin', 'administrator'))
        )
    );

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();


-- ======= migration_v4_signature.sql =======
-- Add e_signature column to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS e_signature TEXT;

-- Comment for clarity
COMMENT ON COLUMN public.users.e_signature IS 'Base64 string or URL of the user signature image';


-- ======= migration_v5_monthly_salary.sql =======
-- Migration V5: Add Monthly Salary to Users Table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS monthly_salary NUMERIC(15, 2) DEFAULT 0.00;

-- Update existing users with a default value if needed
UPDATE public.users SET monthly_salary = 0.00 WHERE monthly_salary IS NULL;


-- ======= migration_v6_viva_scoring.sql =======
-- 1. Create Viva Events Table
CREATE TABLE IF NOT EXISTS public.viva_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    viva_date DATE NOT NULL,
    deadline TIMESTAMP WITH TIME ZONE NOT NULL,
    created_by UUID REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create Viva Criteria Table
CREATE TABLE IF NOT EXISTS public.viva_criteria (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    viva_id UUID REFERENCES public.viva_events(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    max_marks INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create Viva Panelists Table
CREATE TABLE IF NOT EXISTS public.viva_panelists (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    viva_id UUID REFERENCES public.viva_events(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    UNIQUE(viva_id, user_id)
);

-- 4. Create Viva Scores Table
CREATE TABLE IF NOT EXISTS public.viva_scores (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    viva_id UUID REFERENCES public.viva_events(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    lecturer_id UUID REFERENCES public.users(id),
    criteria_id UUID REFERENCES public.viva_criteria(id) ON DELETE CASCADE,
    score DECIMAL NOT NULL,
    is_locked BOOLEAN DEFAULT FALSE,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(viva_id, student_id, lecturer_id, criteria_id)
);

-- 5. Create Quiz Marks Table
CREATE TABLE IF NOT EXISTS public.quiz_marks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    quiz_name TEXT NOT NULL,
    marks DECIMAL NOT NULL,
    total_marks INTEGER DEFAULT 100,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Disable RLS for these tables as per project pattern
ALTER TABLE public.viva_events DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.viva_criteria DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.viva_panelists DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.viva_scores DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_marks DISABLE ROW LEVEL SECURITY;


-- ======= migration_v7_flexible_payments.sql =======
-- Migration V7: Add Flexible Payment Methods to Users Table
-- This migration adds support for multiple concurrent payment methods (Hourly, Unit, Monthly)

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS hourly_rate NUMERIC(15, 2) DEFAULT 3000.00,
ADD COLUMN IF NOT EXISTS payment_unit TEXT DEFAULT 'hour',
ADD COLUMN IF NOT EXISTS monthly_salary NUMERIC(15, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS unit_rate NUMERIC(15, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS payment_methods TEXT[] DEFAULT ARRAY['hourly'];

-- Initialize payment methods based on existing roles
-- 1. Lecturers get 'hourly' by default
UPDATE public.users 
SET payment_methods = ARRAY['hourly'] 
WHERE ('lecturer' = ANY(roles) OR role = 'lecturer')
AND payment_methods IS NULL;

-- 2. Incubator staff get 'monthly' by default
UPDATE public.users 
SET payment_methods = ARRAY['monthly'] 
WHERE ('incubator_staff' = ANY(roles) OR role = 'incubator_staff')
AND (payment_methods IS NULL OR payment_methods = ARRAY['hourly']);

-- 3. Administrators get access to all methods for testing
UPDATE public.users 
SET payment_methods = ARRAY['hourly', 'unit', 'monthly'] 
WHERE ('admin' = ANY(roles) OR role = 'admin' OR 'administrator' = ANY(roles) OR role = 'administrator');

-- 4. Final safety check for any remaining nulls
UPDATE public.users SET payment_methods = ARRAY['hourly'] WHERE payment_methods IS NULL;
UPDATE public.users SET unit_rate = 0.00 WHERE unit_rate IS NULL;


-- ======= migration_v8_realign_payments.sql =======
-- Migration V8: Realign Staff Payment Methods
-- Lecturer (Per Day), Lecturer* (Hourly), Incubator (Monthly)

-- 1. Reset Lecturers to 'unit' (Per Day)
UPDATE public.users 
SET payment_methods = ARRAY['unit'] 
WHERE ('lecturer' = ANY(roles) OR role = 'lecturer');

-- 2. Set Lecturer* (Hourly) to 'hourly'
UPDATE public.users 
SET payment_methods = ARRAY['hourly'] 
WHERE ('lecturer_hourly' = ANY(roles) OR role = 'lecturer_hourly');

-- 3. Set Incubator Staff to 'monthly'
UPDATE public.users 
SET payment_methods = ARRAY['monthly'] 
WHERE ('incubator_staff' = ANY(roles) OR role = 'incubator_staff');

-- 4. Admins keep all for management
UPDATE public.users 
SET payment_methods = ARRAY['hourly', 'unit', 'monthly'] 
WHERE ('admin' = ANY(roles) OR role = 'admin' OR 'administrator' = ANY(roles) OR role = 'administrator');


-- ======= migration_v9_criteria_options.sql =======
-- Migration v9: Add is_required to viva_criteria
ALTER TABLE public.viva_criteria ADD COLUMN IF NOT EXISTS is_required BOOLEAN DEFAULT TRUE;

-- Add remark to viva_scores if missing (for overall remark consistency)
ALTER TABLE public.viva_scores ADD COLUMN IF NOT EXISTS remark TEXT DEFAULT '';


-- ======= migration_v10_admin_only_criteria.sql =======
-- Migration v10: Add admin_only to viva_criteria
ALTER TABLE public.viva_criteria ADD COLUMN IF NOT EXISTS admin_only BOOLEAN DEFAULT FALSE;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';


-- ======= migration_v12_enforce_cascade.sql =======
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


-- ======= fix_rls_attendance.sql =======
-- Unblock local development and testing by disabling RLS for attendance
-- This resolves the "new row violates row-level security policy for table 'attendance'" error when uploading attendance records
ALTER TABLE public.attendance DISABLE ROW LEVEL SECURITY;

-- Alternatively, if you want to keep RLS enabled but allow all inserts (useful for public APIs):
-- CREATE POLICY "Enable insert for all users" ON "public"."attendance" AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);


-- ======= fix_rls_invoices.sql =======
-- Unblock local development by disabling RLS for invoices
-- This resolves the "row-level security policy violation" when submitting invoices
ALTER TABLE public.invoices DISABLE ROW LEVEL SECURITY;



