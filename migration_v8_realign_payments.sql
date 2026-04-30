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
