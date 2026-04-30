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
