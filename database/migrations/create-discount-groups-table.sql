-- Migration: Create discount_groups table
-- Date: 2025-11-23
-- Description: Create discount groups table for pricing discount classifications

-- Create discount_groups table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.discount_groups (
    id SERIAL PRIMARY KEY,
    code VARCHAR(10) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    discount_percent DECIMAL(5, 2) NOT NULL,
    discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('PERCENTAGE', 'FIXED_AMOUNT')),
    minimum_order_value DECIMAL(15, 2) DEFAULT 0.00,
    maximum_discount DECIMAL(15, 2),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create index on code for faster lookups
CREATE INDEX IF NOT EXISTS idx_discount_groups_code ON public.discount_groups(code);
CREATE INDEX IF NOT EXISTS idx_discount_groups_is_active ON public.discount_groups(is_active);

-- Add comments for documentation
COMMENT ON TABLE public.discount_groups IS 'Pricing discount classifications and rules';
COMMENT ON COLUMN public.discount_groups.code IS 'Unique discount group code';
COMMENT ON COLUMN public.discount_groups.name IS 'Discount group name';
COMMENT ON COLUMN public.discount_groups.discount_percent IS 'Discount amount (percentage or fixed amount)';
COMMENT ON COLUMN public.discount_groups.discount_type IS 'Type of discount: PERCENTAGE or FIXED_AMOUNT';
COMMENT ON COLUMN public.discount_groups.minimum_order_value IS 'Minimum order value required to apply discount';
COMMENT ON COLUMN public.discount_groups.maximum_discount IS 'Maximum discount amount allowed';

