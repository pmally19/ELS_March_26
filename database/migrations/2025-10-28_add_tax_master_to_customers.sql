-- Migration: Add Tax Master Integration to Customers Table
-- Date: 2025-10-28
-- Description: Add tax_profile_id and tax_rule_id to erp_customers table for tax master integration

-- Add tax master reference columns to erp_customers table
ALTER TABLE public.erp_customers 
ADD COLUMN IF NOT EXISTS tax_profile_id INTEGER REFERENCES public.tax_profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS tax_rule_id INTEGER REFERENCES public.tax_rules(id) ON DELETE SET NULL;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_erp_customers_tax_profile_id ON public.erp_customers(tax_profile_id);
CREATE INDEX IF NOT EXISTS idx_erp_customers_tax_rule_id ON public.erp_customers(tax_rule_id);

-- Add comments
COMMENT ON COLUMN public.erp_customers.tax_profile_id IS 'Reference to tax profile from tax master';
COMMENT ON COLUMN public.erp_customers.tax_rule_id IS 'Reference to tax rule from tax master - auto-populates tax fields';

