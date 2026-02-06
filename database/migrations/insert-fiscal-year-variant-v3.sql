-- Migration: Insert V3 Fiscal Year Variant
-- Purpose: Add V3 fiscal year variant configuration

-- Insert V3 variant if it doesn't exist
INSERT INTO fiscal_year_variants (variant_id, description, posting_periods, special_periods, year_shift, active)
SELECT 'V3', 'Fiscal Year Variant V3 (Standard 12 Periods)', 12, 0, 0, true
WHERE NOT EXISTS (SELECT 1 FROM fiscal_year_variants WHERE variant_id = 'V3');
