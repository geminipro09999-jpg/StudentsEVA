-- Migration V5: Add Monthly Salary to Users Table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS monthly_salary NUMERIC(15, 2) DEFAULT 0.00;

-- Update existing users with a default value if needed
UPDATE public.users SET monthly_salary = 0.00 WHERE monthly_salary IS NULL;
