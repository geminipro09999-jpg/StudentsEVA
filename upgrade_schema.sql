-- 1. Update Students Table
ALTER TABLE public.students 
ADD COLUMN IF NOT EXISTS group_name TEXT DEFAULT '';

-- 2. Create Lab Activities Table
CREATE TABLE IF NOT EXISTS public.lab_activities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    subject_name TEXT DEFAULT 'General',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Update Feedbacks Table
-- Add lab_activity_id
ALTER TABLE public.feedbacks 
ADD COLUMN IF NOT EXISTS lab_activity_id UUID REFERENCES public.lab_activities(id) ON DELETE SET NULL;

-- 4. Create Settings Table
CREATE TABLE IF NOT EXISTS public.settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insert initial labs if needed (optional)
INSERT INTO public.lab_activities (name) VALUES ('Lab Act 01'), ('Lab Act 02'), ('Lab Act 03') ON CONFLICT DO NOTHING;

-- Initial Google Sheet ID (empty)
INSERT INTO public.settings (key, value) VALUES ('google_sheet_id', '') ON CONFLICT DO NOTHING;
