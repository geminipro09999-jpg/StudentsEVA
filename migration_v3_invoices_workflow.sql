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
