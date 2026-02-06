-- Migration: Fix Inventory Finance & Cost Schema Issues
-- Date: 2025-11-18
-- Purpose: Add missing columns and fix schema mismatches

-- ===================================================================
-- 1. Add is_default column to company_codes (optional enhancement)
-- ===================================================================
-- Note: This is optional - code has been updated to work without it
-- Uncomment if you want to add this column for better default company code handling

-- ALTER TABLE company_codes 
-- ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false;

-- CREATE INDEX IF NOT EXISTS idx_company_codes_is_default 
-- ON company_codes(is_default) WHERE is_default = true;

-- ===================================================================
-- 2. Add profit_center_id to cost_centers (optional enhancement)
-- ===================================================================
-- Note: Code has been updated to work without this column
-- Uncomment if you want direct relationship between cost centers and profit centers

-- ALTER TABLE cost_centers 
-- ADD COLUMN IF NOT EXISTS profit_center_id INTEGER REFERENCES profit_centers(id);

-- CREATE INDEX IF NOT EXISTS idx_cost_centers_profit_center_id 
-- ON cost_centers(profit_center_id);

-- ===================================================================
-- 3. Add storage_location to goods_receipts if missing
-- ===================================================================
-- Check if column exists first, then add if needed
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'goods_receipts' 
        AND column_name = 'storage_location'
    ) THEN
        ALTER TABLE goods_receipts 
        ADD COLUMN storage_location VARCHAR(10);
        
        -- Try to populate from existing data if possible
        -- (This is a placeholder - adjust based on your data structure)
        -- UPDATE goods_receipts 
        -- SET storage_location = (SELECT code FROM storage_locations LIMIT 1)
        -- WHERE storage_location IS NULL;
    END IF;
END $$;

-- ===================================================================
-- 4. Add status column to accounting_documents if missing
-- ===================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'accounting_documents' 
        AND column_name = 'status'
    ) THEN
        ALTER TABLE accounting_documents 
        ADD COLUMN status VARCHAR(20) DEFAULT 'POSTED';
        
        -- Update existing records
        UPDATE accounting_documents 
        SET status = 'POSTED' 
        WHERE status IS NULL;
    END IF;
END $$;

-- ===================================================================
-- 5. Verify journal_entries structure
-- ===================================================================
-- Note: journal_entries table structure may differ from expectations
-- The code expects: document_id, gl_account, debit_amount, credit_amount
-- But database may have: document_number, different structure
-- Code should be updated to match actual structure (already done in fixes)

-- ===================================================================
-- 6. Add comments for documentation
-- ===================================================================
COMMENT ON COLUMN cost_centers.overhead_rate IS 'Overhead rate percentage for cost allocation';
COMMENT ON COLUMN cost_centers.overhead_calculation_method IS 'Method for overhead calculation: PERCENTAGE, etc.';
COMMENT ON COLUMN profit_centers.profit_center IS 'Profit center code (not profit_center_code)';
COMMENT ON COLUMN production_orders.material_id IS 'Reference to materials table (not material_code)';
COMMENT ON COLUMN activity_cost_pools.driver_type IS 'Activity driver type (not activity_driver)';
COMMENT ON COLUMN step_down_allocation_rules.from_cost_center_id IS 'Source cost center for allocation';
COMMENT ON COLUMN step_down_allocation_rules.to_cost_center_id IS 'Target cost center for allocation';

-- ===================================================================
-- 7. Create indexes for better performance
-- ===================================================================
CREATE INDEX IF NOT EXISTS idx_cost_centers_active 
ON cost_centers(active) WHERE active = true;

CREATE INDEX IF NOT EXISTS idx_profit_centers_active 
ON profit_centers(active) WHERE active = true;

CREATE INDEX IF NOT EXISTS idx_profit_centers_company_code_id 
ON profit_centers(company_code_id);

CREATE INDEX IF NOT EXISTS idx_cost_centers_company_code_id 
ON cost_centers(company_code_id);

CREATE INDEX IF NOT EXISTS idx_activity_cost_pools_cost_center_driver 
ON activity_cost_pools(cost_center_id, driver_type) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_step_down_allocation_rules_from_to 
ON step_down_allocation_rules(from_cost_center_id, to_cost_center_id) WHERE is_active = true;

-- ===================================================================
-- Migration Complete
-- ===================================================================

