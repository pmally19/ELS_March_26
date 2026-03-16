-- Migration: Remove unused fields from chart_of_accounts table
-- Keep only the required fields:
-- 1. Chart of Accounts ID (chart_id)
-- 2. Description (description)
-- 3. Language (language)
-- 4. Length of G/L Account Number (account_length)
-- 5. Controlling Integration (controlling_integration)
-- 6. Group Chart of Accounts (group_chart_id)
-- 7. Block Indicator (active)
-- 8. Manual Creation Allowed (manual_creation_allowed)
-- 9. Maintenance Language (maintenance_language)

-- Drop foreign key constraints first
ALTER TABLE chart_of_accounts 
DROP CONSTRAINT IF EXISTS fk_chart_of_accounts_company_code;

ALTER TABLE chart_of_accounts 
DROP CONSTRAINT IF EXISTS fk_consolidation_chart;

-- Note: We keep fk_group_chart as group_chart_id is required

-- Drop indexes for columns we're removing
DROP INDEX IF EXISTS idx_chart_of_accounts_country_code;
DROP INDEX IF EXISTS idx_chart_of_accounts_company_code_id;
DROP INDEX IF EXISTS idx_chart_of_accounts_is_operational_chart;
DROP INDEX IF EXISTS idx_chart_of_accounts_consolidation_chart_id;

-- Drop unused columns
ALTER TABLE chart_of_accounts 
DROP COLUMN IF EXISTS country_code,
DROP COLUMN IF EXISTS company_code_id,
DROP COLUMN IF EXISTS account_number_format,
DROP COLUMN IF EXISTS account_group_structure,
DROP COLUMN IF EXISTS is_operational_chart,
DROP COLUMN IF EXISTS consolidation_chart_id;

-- Verify that required fields still exist (they should)
-- chart_id, description, language, account_length, controlling_integration,
-- group_chart_id, active, manual_creation_allowed, maintenance_language

COMMENT ON TABLE chart_of_accounts IS 'Chart of Accounts master data with only required fields';

