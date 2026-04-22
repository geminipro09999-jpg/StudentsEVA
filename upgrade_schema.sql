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
