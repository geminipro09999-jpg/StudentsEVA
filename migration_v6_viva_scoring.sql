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
