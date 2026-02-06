-- Migration: Add missing fields for complete asset workflow
-- Purpose: Add fields identified in gap analysis

-- Add missing fields to asset_master
ALTER TABLE asset_master
  ADD COLUMN IF NOT EXISTS chart_of_depreciation_id INTEGER REFERENCES chart_of_depreciation(id),
  ADD COLUMN IF NOT EXISTS residual_value NUMERIC(18,2),
  ADD COLUMN IF NOT EXISTS depreciation_start_date DATE,
  ADD COLUMN IF NOT EXISTS depreciation_end_date DATE;

-- Add missing fields to asset_account_determination
ALTER TABLE asset_account_determination
  ADD COLUMN IF NOT EXISTS valid_from_date DATE,
  ADD COLUMN IF NOT EXISTS valid_to_date DATE,
  ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 0;

-- Add missing fields to asset_classes
ALTER TABLE asset_classes
  ADD COLUMN IF NOT EXISTS chart_of_depreciation_id INTEGER REFERENCES chart_of_depreciation(id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_asset_master_chart_of_depreciation ON asset_master(chart_of_depreciation_id);
CREATE INDEX IF NOT EXISTS idx_asset_account_determination_valid_dates ON asset_account_determination(valid_from_date, valid_to_date);
CREATE INDEX IF NOT EXISTS idx_asset_account_determination_priority ON asset_account_determination(priority);
CREATE INDEX IF NOT EXISTS idx_asset_classes_chart_of_depreciation ON asset_classes(chart_of_depreciation_id);

-- Add comments
COMMENT ON COLUMN asset_master.chart_of_depreciation_id IS 'Reference to chart of depreciation configuration';
COMMENT ON COLUMN asset_master.residual_value IS 'Residual or salvage value of the asset';
COMMENT ON COLUMN asset_master.depreciation_start_date IS 'Date when depreciation should begin';
COMMENT ON COLUMN asset_master.depreciation_end_date IS 'Date when depreciation should end';
COMMENT ON COLUMN asset_account_determination.valid_from_date IS 'Date from which this rule is valid';
COMMENT ON COLUMN asset_account_determination.valid_to_date IS 'Date until which this rule is valid';
COMMENT ON COLUMN asset_account_determination.priority IS 'Priority for rule selection when multiple rules match (higher number = higher priority)';
COMMENT ON COLUMN asset_classes.chart_of_depreciation_id IS 'Reference to chart of depreciation configuration';

