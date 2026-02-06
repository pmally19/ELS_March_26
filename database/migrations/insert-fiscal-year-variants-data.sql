-- Migration: Insert standard Fiscal Year Variants data
-- Purpose: Add common fiscal year variant configurations

-- Insert fiscal year variants (only if they don't already exist)
INSERT INTO fiscal_year_variants (variant_id, description, posting_periods, special_periods, year_shift, active)
SELECT 'K4', 'Calendar Year (January-December)', 12, 0, 0, true
WHERE NOT EXISTS (SELECT 1 FROM fiscal_year_variants WHERE variant_id = 'K4');

INSERT INTO fiscal_year_variants (variant_id, description, posting_periods, special_periods, year_shift, active)
SELECT '52', 'Fiscal Year (April-March)', 12, 0, 0, true
WHERE NOT EXISTS (SELECT 1 FROM fiscal_year_variants WHERE variant_id = '52');

INSERT INTO fiscal_year_variants (variant_id, description, posting_periods, special_periods, year_shift, active)
SELECT '53', 'Fiscal Year (July-June)', 12, 0, 0, true
WHERE NOT EXISTS (SELECT 1 FROM fiscal_year_variants WHERE variant_id = '53');

INSERT INTO fiscal_year_variants (variant_id, description, posting_periods, special_periods, year_shift, active)
SELECT '54', 'Fiscal Year (October-September)', 12, 0, 0, true
WHERE NOT EXISTS (SELECT 1 FROM fiscal_year_variants WHERE variant_id = '54');

INSERT INTO fiscal_year_variants (variant_id, description, posting_periods, special_periods, year_shift, active)
SELECT '55', 'Fiscal Year (April-March) with Special Periods', 12, 4, 0, true
WHERE NOT EXISTS (SELECT 1 FROM fiscal_year_variants WHERE variant_id = '55');

INSERT INTO fiscal_year_variants (variant_id, description, posting_periods, special_periods, year_shift, active)
SELECT '56', 'Fiscal Year (July-June) with Special Periods', 12, 4, 0, true
WHERE NOT EXISTS (SELECT 1 FROM fiscal_year_variants WHERE variant_id = '56');

INSERT INTO fiscal_year_variants (variant_id, description, posting_periods, special_periods, year_shift, active)
SELECT '57', 'Fiscal Year (October-September) with Special Periods', 12, 4, 0, true
WHERE NOT EXISTS (SELECT 1 FROM fiscal_year_variants WHERE variant_id = '57');

INSERT INTO fiscal_year_variants (variant_id, description, posting_periods, special_periods, year_shift, active)
SELECT '58', 'Calendar Year with 13 Periods', 13, 0, 0, true
WHERE NOT EXISTS (SELECT 1 FROM fiscal_year_variants WHERE variant_id = '58');

INSERT INTO fiscal_year_variants (variant_id, description, posting_periods, special_periods, year_shift, active)
SELECT '59', 'Calendar Year with 16 Periods', 16, 0, 0, true
WHERE NOT EXISTS (SELECT 1 FROM fiscal_year_variants WHERE variant_id = '59');

INSERT INTO fiscal_year_variants (variant_id, description, posting_periods, special_periods, year_shift, active)
SELECT '60', 'Quarterly Reporting (4 Periods)', 4, 0, 0, true
WHERE NOT EXISTS (SELECT 1 FROM fiscal_year_variants WHERE variant_id = '60');

-- Verify the insertions
SELECT COUNT(*) as total_variants FROM fiscal_year_variants;
SELECT variant_id, description, posting_periods, special_periods, active FROM fiscal_year_variants ORDER BY variant_id;

