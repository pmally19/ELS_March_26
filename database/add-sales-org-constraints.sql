-- Add foreign key constraint for sd_sales_organizations.company_code_id
-- This ensures referential integrity between sales organizations and company codes

-- Check if the constraint already exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'sd_sales_organizations_company_code_id_fkey' 
        AND table_name = 'sd_sales_organizations'
    ) THEN
        -- Add the foreign key constraint
        ALTER TABLE public.sd_sales_organizations 
        ADD CONSTRAINT sd_sales_organizations_company_code_id_fkey 
        FOREIGN KEY (company_code_id) REFERENCES public.company_codes(id);
        
        RAISE NOTICE 'Foreign key constraint added successfully';
    ELSE
        RAISE NOTICE 'Foreign key constraint already exists';
    END IF;
END $$;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_sd_sales_organizations_company_code_id 
ON public.sd_sales_organizations(company_code_id);

-- Add index for code field for better performance
CREATE INDEX IF NOT EXISTS idx_sd_sales_organizations_code 
ON public.sd_sales_organizations(code);

-- Add index for status field for filtering
CREATE INDEX IF NOT EXISTS idx_sd_sales_organizations_status 
ON public.sd_sales_organizations(status);

-- Add index for is_active field for filtering
CREATE INDEX IF NOT EXISTS idx_sd_sales_organizations_is_active 
ON public.sd_sales_organizations(is_active);
