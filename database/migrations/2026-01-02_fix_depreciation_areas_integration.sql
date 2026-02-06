-- Migration: Add missing fields to depreciation_areas table
-- Date: 2026-01-02
-- Purpose: Enable full multi-area depreciation support

-- Add missing critical fields
ALTER TABLE depreciation_areas ADD COLUMN IF NOT EXISTS posting_indicator VARCHAR(20) DEFAULT 'REALTIME';
ALTER TABLE depreciation_areas ADD COLUMN IF NOT EXISTS ledger_group VARCHAR(10);
ALTER TABLE depreciation_areas ADD COLUMN IF NOT EXISTS currency_type VARCHAR(10) DEFAULT 'LOCAL';
ALTER TABLE depreciation_areas ADD COLUMN IF NOT EXISTS fiscal_year_variant_id INTEGER REFERENCES fiscal_year_variants(id);
ALTER TABLE depreciation_areas ADD COLUMN IF NOT EXISTS base_method VARCHAR(50) DEFAULT 'ACQUISITION_COST';
ALTER TABLE depreciation_areas ADD COLUMN IF NOT EXISTS period_control VARCHAR(50) DEFAULT 'MONTHLY';

-- Add comments
COMMENT ON COLUMN depreciation_areas.posting_indicator IS 'Controls GL posting: REALTIME, PERIODIC, NONE';
COMMENT ON COLUMN depreciation_areas.ledger_group IS 'Target ledger group (0L, 2L, etc.) for multi-GAAP';
COMMENT ON COLUMN depreciation_areas.currency_type IS 'Currency type: LOCAL, GROUP, PARALLEL';
COMMENT ON COLUMN depreciation_areas.fiscal_year_variant_id IS 'Specific fiscal year calendar for this area';
COMMENT ON COLUMN depreciation_areas.base_method IS 'Base for calculation: ACQUISITION_COST, NET_BOOK_VALUE, REPLACEMENT_COST';
COMMENT ON COLUMN depreciation_areas.period_control IS 'Period calculation: MONTHLY, MID_MONTH, QUARTERLY';

-- Add index for fiscal year variant lookup
CREATE INDEX IF NOT EXISTS idx_depreciation_areas_fyv ON depreciation_areas(fiscal_year_variant_id);

-- Add foreign key constraint to asset_master (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_asset_master_depreciation_area'
    ) THEN
        ALTER TABLE asset_master 
        ADD CONSTRAINT fk_asset_master_depreciation_area 
        FOREIGN KEY (depreciation_area_id) 
        REFERENCES depreciation_areas(id);
    END IF;
END $$;

-- Update asset_account_determination to support area-specific rules
ALTER TABLE asset_account_determination ADD COLUMN IF NOT EXISTS depreciation_area_id INTEGER REFERENCES depreciation_areas(id);
CREATE INDEX IF NOT EXISTS idx_asset_acct_det_area ON asset_account_determination(depreciation_area_id);

COMMENT ON COLUMN asset_account_determination.depreciation_area_id IS 'Link to specific depreciation area for area-specific GL accounts';

-- Set default values for existing records
UPDATE depreciation_areas 
SET 
    posting_indicator = 'REALTIME',
    currency_type = 'LOCAL',
    base_method = 'ACQUISITION_COST',
    period_control = 'MONTHLY'
WHERE posting_indicator IS NULL;
