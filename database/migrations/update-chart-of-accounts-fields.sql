-- Migration: Update chart_of_accounts table to contain only required fields
-- Fields: Chart ID, Description, Language, Length of G/L Account Number, 
--         Controlling Integration, Group Chart of Accounts, Block Indicator,
--         Manual Creation Allowed, Maintenance Language

-- Add new required fields if they don't exist
ALTER TABLE chart_of_accounts 
ADD COLUMN IF NOT EXISTS controlling_integration BOOLEAN DEFAULT false;

ALTER TABLE chart_of_accounts 
ADD COLUMN IF NOT EXISTS manual_creation_allowed BOOLEAN DEFAULT true;

-- Rename chart_id to chart_of_accounts_id for clarity (if needed, we'll keep chart_id)
-- Keep chart_id as is since it's the unique identifier

-- Ensure all required fields exist
-- chart_id - already exists (Chart of Accounts ID)
-- description - already exists (Description)
-- maintenance_language - already exists (Maintenance Language)
-- account_length - already exists (Length of G/L Account Number)
-- group_chart_id - already exists (Group Chart of Accounts)
-- active - already exists (Block Indicator - inverted logic)

-- Remove fields that are not in the required list
-- Note: We'll keep company_code_id, country_code, etc. as they might be used elsewhere
-- But we'll focus on the required fields for the UI

-- Add language field if it doesn't exist (default language)
ALTER TABLE chart_of_accounts 
ADD COLUMN IF NOT EXISTS language VARCHAR(5);

-- Update maintenance_language to allow longer codes if needed
ALTER TABLE chart_of_accounts 
ALTER COLUMN maintenance_language TYPE VARCHAR(5);

-- Add comments for clarity
COMMENT ON COLUMN chart_of_accounts.chart_id IS 'Unique identifier for the chart of accounts (e.g., INCO, USCO)';
COMMENT ON COLUMN chart_of_accounts.description IS 'Name or description of the chart (e.g., India Operational CoA)';
COMMENT ON COLUMN chart_of_accounts.language IS 'Default language for the chart (e.g., EN)';
COMMENT ON COLUMN chart_of_accounts.account_length IS 'Number of digits for G/L account numbers (e.g., 6)';
COMMENT ON COLUMN chart_of_accounts.controlling_integration IS 'Indicates if controlling area uses the same chart of accounts';
COMMENT ON COLUMN chart_of_accounts.group_chart_id IS 'Optional field for consolidation purposes - reference to group chart';
COMMENT ON COLUMN chart_of_accounts.active IS 'Block indicator - blocks the CoA from being used if false';
COMMENT ON COLUMN chart_of_accounts.manual_creation_allowed IS 'Allows manual G/L account creation if true';
COMMENT ON COLUMN chart_of_accounts.maintenance_language IS 'Language in which chart of accounts is maintained';

