-- Migration: Add tax breakdown and tax profile to sales_orders
-- Date: 2025-10-28
-- Description: Add fields to store tax breakdown by rule and tax profile ID in sales orders

-- Add tax_breakdown column (JSONB to store tax rule breakdown)
ALTER TABLE sales_orders 
ADD COLUMN IF NOT EXISTS tax_breakdown JSONB;

-- Add tax_profile_id column (reference to tax_profiles)
ALTER TABLE sales_orders 
ADD COLUMN IF NOT EXISTS tax_profile_id INTEGER REFERENCES tax_profiles(id) ON DELETE SET NULL;

-- Add index on tax_profile_id for better query performance
CREATE INDEX IF NOT EXISTS idx_sales_orders_tax_profile_id 
ON sales_orders(tax_profile_id);

-- Add comments
COMMENT ON COLUMN sales_orders.tax_breakdown IS 'JSON array of tax rules applied to this order with individual amounts';
COMMENT ON COLUMN sales_orders.tax_profile_id IS 'Reference to the tax profile used for this order';

-- Example tax_breakdown structure:
-- [
--   {
--     "rule_id": 1,
--     "rule_code": "VAT01",
--     "title": "Value Added Tax",
--     "rate_percent": 10.0,
--     "amount": 100.00
--   },
--   {
--     "rule_id": 2,
--     "rule_code": "SALES01",
--     "title": "Sales Tax",
--     "rate_percent": 7.5,
--     "amount": 75.00
--   }
-- ]

