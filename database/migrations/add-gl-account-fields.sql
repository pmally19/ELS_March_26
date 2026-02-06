-- Migration: Add comprehensive GL Account fields (section-wise)
-- This adds all missing fields for complete GL Account management

-- Section 1: Basic Data - Add Long Text
ALTER TABLE gl_accounts 
ADD COLUMN IF NOT EXISTS long_text TEXT;

-- Section 2: Account Characteristics - Add missing fields
ALTER TABLE gl_accounts 
ADD COLUMN IF NOT EXISTS cash_account_indicator BOOLEAN DEFAULT false;

ALTER TABLE gl_accounts 
ADD COLUMN IF NOT EXISTS mark_for_deletion BOOLEAN DEFAULT false;

-- Section 3: Company Code Assignment - Add all fields
ALTER TABLE gl_accounts 
ADD COLUMN IF NOT EXISTS company_code_id INTEGER;

-- Add foreign key constraint (only if it doesn't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'fk_gl_accounts_company_code'
    ) THEN
        ALTER TABLE gl_accounts
        ADD CONSTRAINT fk_gl_accounts_company_code 
        FOREIGN KEY (company_code_id) 
        REFERENCES company_codes(id)
        ON DELETE SET NULL;
    END IF;
END $$;

ALTER TABLE gl_accounts 
ADD COLUMN IF NOT EXISTS account_currency VARCHAR(3);

ALTER TABLE gl_accounts 
ADD COLUMN IF NOT EXISTS field_status_group VARCHAR(4);

ALTER TABLE gl_accounts 
ADD COLUMN IF NOT EXISTS open_item_management BOOLEAN DEFAULT false;

ALTER TABLE gl_accounts 
ADD COLUMN IF NOT EXISTS line_item_display BOOLEAN DEFAULT true;

ALTER TABLE gl_accounts 
ADD COLUMN IF NOT EXISTS sort_key VARCHAR(2);

-- Section 4: Tax Settings
ALTER TABLE gl_accounts 
ADD COLUMN IF NOT EXISTS tax_category VARCHAR(2);

ALTER TABLE gl_accounts 
ADD COLUMN IF NOT EXISTS posting_without_tax_allowed BOOLEAN DEFAULT false;

-- Section 5: Interest Calculation
ALTER TABLE gl_accounts 
ADD COLUMN IF NOT EXISTS interest_calculation_indicator BOOLEAN DEFAULT false;

ALTER TABLE gl_accounts 
ADD COLUMN IF NOT EXISTS interest_calculation_frequency VARCHAR(2);

ALTER TABLE gl_accounts 
ADD COLUMN IF NOT EXISTS interest_calculation_date DATE;

-- Section 6: Account Relationships
ALTER TABLE gl_accounts 
ADD COLUMN IF NOT EXISTS alternative_account_number VARCHAR(10);

ALTER TABLE gl_accounts 
ADD COLUMN IF NOT EXISTS group_account_number VARCHAR(10);

ALTER TABLE gl_accounts 
ADD COLUMN IF NOT EXISTS trading_partner VARCHAR(10);

-- Section 8: System Fields - Add audit fields
ALTER TABLE gl_accounts 
ADD COLUMN IF NOT EXISTS created_by INTEGER;

ALTER TABLE gl_accounts 
ADD COLUMN IF NOT EXISTS updated_by INTEGER;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_gl_accounts_company_code_id ON gl_accounts(company_code_id);
CREATE INDEX IF NOT EXISTS idx_gl_accounts_account_currency ON gl_accounts(account_currency);
CREATE INDEX IF NOT EXISTS idx_gl_accounts_tax_category ON gl_accounts(tax_category);
CREATE INDEX IF NOT EXISTS idx_gl_accounts_alternative_account_number ON gl_accounts(alternative_account_number);
CREATE INDEX IF NOT EXISTS idx_gl_accounts_group_account_number ON gl_accounts(group_account_number);

-- Remove duplicate 'active' field if it exists (keep is_active)
-- Note: This is safe to run multiple times
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'gl_accounts' AND column_name = 'active'
    ) THEN
        ALTER TABLE gl_accounts DROP COLUMN active;
    END IF;
END $$;

-- Add comments for documentation
COMMENT ON COLUMN gl_accounts.long_text IS 'Detailed description of the account';
COMMENT ON COLUMN gl_accounts.cash_account_indicator IS 'Indicates if this is a cash account';
COMMENT ON COLUMN gl_accounts.mark_for_deletion IS 'Soft delete flag - marks account for deletion';
COMMENT ON COLUMN gl_accounts.company_code_id IS 'Reference to company code for multi-company support';
COMMENT ON COLUMN gl_accounts.account_currency IS 'Currency code for the account (e.g., USD, EUR)';
COMMENT ON COLUMN gl_accounts.field_status_group IS 'Controls field status in document entry';
COMMENT ON COLUMN gl_accounts.open_item_management IS 'Enables open item tracking for reconciliation';
COMMENT ON COLUMN gl_accounts.line_item_display IS 'Controls whether line items are displayed';
COMMENT ON COLUMN gl_accounts.sort_key IS 'Default sort sequence for line items';
COMMENT ON COLUMN gl_accounts.tax_category IS 'Tax code for tax calculations';
COMMENT ON COLUMN gl_accounts.posting_without_tax_allowed IS 'Allows postings without tax';
COMMENT ON COLUMN gl_accounts.interest_calculation_indicator IS 'Enables interest calculation';
COMMENT ON COLUMN gl_accounts.interest_calculation_frequency IS 'Frequency code for interest calculation';
COMMENT ON COLUMN gl_accounts.interest_calculation_date IS 'Next interest calculation date';
COMMENT ON COLUMN gl_accounts.alternative_account_number IS 'Alternative account identifier';
COMMENT ON COLUMN gl_accounts.group_account_number IS 'Group account for consolidation';
COMMENT ON COLUMN gl_accounts.trading_partner IS 'Trading partner account reference';
COMMENT ON COLUMN gl_accounts.created_by IS 'User ID who created the account';
COMMENT ON COLUMN gl_accounts.updated_by IS 'User ID who last updated the account';

