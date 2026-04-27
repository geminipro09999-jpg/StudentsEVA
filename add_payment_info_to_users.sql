-- Add payment information to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS hourly_rate NUMERIC(15, 2) DEFAULT 3000.00,
ADD COLUMN IF NOT EXISTS payment_unit TEXT DEFAULT 'hour' CHECK (payment_unit IN ('hour', 'unit'));

-- Update existing users to have a default rate
UPDATE public.users SET hourly_rate = 3000.00, payment_unit = 'hour' WHERE hourly_rate IS NULL;
