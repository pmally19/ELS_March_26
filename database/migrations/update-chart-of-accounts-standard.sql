-- Migration: Update chart_of_accounts table to follow standard structure
-- Adds: country_code, company_code_id, account_number_format, and other standard fields
-- Removes hardcoded defaults and makes it data-driven

-- Add country_code if it doesn't exist (standard field)
ALTER TABLE chart_of_accounts 
ADD COLUMN IF NOT EXISTS country_code VARCHAR(3);

-- Add company_code_id for company assignment (standard field)
ALTER TABLE chart_of_accounts 
ADD COLUMN IF NOT EXISTS company_code_id INTEGER;

-- Add account_number_format (standard field for account number structure)
ALTER TABLE chart_of_accounts 
ADD COLUMN IF NOT EXISTS account_number_format VARCHAR(50);

-- Add account_group_structure (standard field for account grouping)
ALTER TABLE chart_of_accounts 
ADD COLUMN IF NOT EXISTS account_group_structure TEXT;

-- Add is_operational_chart (standard field)
ALTER TABLE chart_of_accounts 
ADD COLUMN IF NOT EXISTS is_operational_chart BOOLEAN DEFAULT true;

-- Add consolidation_chart_id (for consolidation charts)
ALTER TABLE chart_of_accounts 
ADD COLUMN IF NOT EXISTS consolidation_chart_id INTEGER;

-- Add group_chart_id (for group charts)
ALTER TABLE chart_of_accounts 
ADD COLUMN IF NOT EXISTS group_chart_id INTEGER;

-- Update account_length default to NULL (remove hardcoded default)
ALTER TABLE chart_of_accounts 
ALTER COLUMN account_length DROP DEFAULT;

-- Update maintenance_language to allow longer codes
ALTER TABLE chart_of_accounts 
ALTER COLUMN maintenance_language TYPE VARCHAR(5);

-- Add foreign key constraints
DO $$
BEGIN
    -- Add foreign key for company_code_id if company_codes table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'company_codes') THEN
        ALTER TABLE chart_of_accounts
        ADD CONSTRAINT fk_chart_of_accounts_company_code 
        FOREIGN KEY (company_code_id) 
        REFERENCES company_codes(id)
        ON DELETE SET NULL;
    END IF;
    
    -- Add self-referencing foreign keys for consolidation and group charts
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_chart_consolidation'
    ) THEN
        ALTER TABLE chart_of_accounts
        ADD CONSTRAINT fk_chart_consolidation 
        FOREIGN KEY (consolidation_chart_id) 
        REFERENCES chart_of_accounts(id)
        ON DELETE SET NULL;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_chart_group'
    ) THEN
        ALTER TABLE chart_of_accounts
        ADD CONSTRAINT fk_chart_group 
        FOREIGN KEY (group_chart_id) 
        REFERENCES chart_of_accounts(id)
        ON DELETE SET NULL;
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_company_code_id 
ON chart_of_accounts(company_code_id);

CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_country_code 
ON chart_of_accounts(country_code);

CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_active 
ON chart_of_accounts(active);

-- Add comments
COMMENT ON COLUMN chart_of_accounts.chart_id IS 'Unique identifier for the chart of accounts';
COMMENT ON COLUMN chart_of_accounts.description IS 'Description/name of the chart of accounts';
COMMENT ON COLUMN chart_of_accounts.account_length IS 'Number of digits for general ledger account numbers (typically 6-16)';
COMMENT ON COLUMN chart_of_accounts.maintenance_language IS 'Language code for maintaining the chart (e.g., EN, DE, FR)';
COMMENT ON COLUMN chart_of_accounts.country_code IS 'Country code where this chart is used (ISO 3166-1 alpha-3)';
COMMENT ON COLUMN chart_of_accounts.company_code_id IS 'Reference to company code that uses this chart';
COMMENT ON COLUMN chart_of_accounts.account_number_format IS 'Format pattern for account numbers (e.g., "NNNNNN" for 6 digits)';
COMMENT ON COLUMN chart_of_accounts.account_group_structure IS 'JSON structure defining account groups and ranges';
COMMENT ON COLUMN chart_of_accounts.is_operational_chart IS 'Indicates if this is an operational chart (true) or reporting chart (false)';
COMMENT ON COLUMN chart_of_accounts.consolidation_chart_id IS 'Reference to consolidation chart if applicable';
COMMENT ON COLUMN chart_of_accounts.group_chart_id IS 'Reference to group chart if applicable';

