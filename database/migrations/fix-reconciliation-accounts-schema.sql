-- Migration: Fix reconciliation_accounts table structure
-- This migration updates the reconciliation_accounts table to use proper foreign keys
-- and removes hardcoded defaults as per requirements

-- Step 1: Backup existing data (if any)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'reconciliation_accounts') THEN
        CREATE TABLE IF NOT EXISTS reconciliation_accounts_backup AS 
        SELECT * FROM reconciliation_accounts;
        RAISE NOTICE 'Backed up existing reconciliation_accounts data';
    ELSE
        RAISE NOTICE 'reconciliation_accounts table does not exist, skipping backup';
    END IF;
END $$;

-- Step 2: Drop existing table if it exists with old structure
DROP TABLE IF EXISTS reconciliation_accounts CASCADE;

-- Step 3: Create new table with proper structure
CREATE TABLE reconciliation_accounts (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    gl_account_id INTEGER NOT NULL,
    account_type VARCHAR(20) NOT NULL,
    company_code_id INTEGER NOT NULL,
    is_active BOOLEAN NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    CONSTRAINT fk_reconciliation_accounts_gl_account 
        FOREIGN KEY (gl_account_id) 
        REFERENCES gl_accounts(id) 
        ON DELETE RESTRICT,
    CONSTRAINT fk_reconciliation_accounts_company_code 
        FOREIGN KEY (company_code_id) 
        REFERENCES company_codes(id) 
        ON DELETE RESTRICT
);

-- Step 4: Create indexes for better performance
CREATE INDEX idx_reconciliation_accounts_gl_account_id 
    ON reconciliation_accounts(gl_account_id);
CREATE INDEX idx_reconciliation_accounts_company_code_id 
    ON reconciliation_accounts(company_code_id);
CREATE INDEX idx_reconciliation_accounts_code 
    ON reconciliation_accounts(code);
CREATE INDEX idx_reconciliation_accounts_account_type 
    ON reconciliation_accounts(account_type);
CREATE INDEX idx_reconciliation_accounts_is_active 
    ON reconciliation_accounts(is_active);

-- Step 5: Add comments to columns
COMMENT ON TABLE reconciliation_accounts IS 'Reconciliation accounts for GL account assignments';
COMMENT ON COLUMN reconciliation_accounts.code IS 'Unique code for the reconciliation account';
COMMENT ON COLUMN reconciliation_accounts.name IS 'Name of the reconciliation account';
COMMENT ON COLUMN reconciliation_accounts.description IS 'Description of the reconciliation account';
COMMENT ON COLUMN reconciliation_accounts.gl_account_id IS 'Foreign key reference to gl_accounts table';
COMMENT ON COLUMN reconciliation_accounts.account_type IS 'Type of account (AR, AP, INVENTORY, etc.)';
COMMENT ON COLUMN reconciliation_accounts.company_code_id IS 'Foreign key reference to company_codes table';
COMMENT ON COLUMN reconciliation_accounts.is_active IS 'Active status of the reconciliation account';

-- Note: Data migration from backup table would need to be done manually
-- as it requires mapping old gl_account and company_code string values to IDs
-- Example migration query (uncomment and modify as needed):
/*
INSERT INTO reconciliation_accounts (code, name, description, gl_account_id, account_type, company_code_id, is_active, created_at, updated_at)
SELECT 
    ra.code,
    COALESCE(ra.description, ra.code) as name,
    ra.description,
    ga.id as gl_account_id,
    ra.account_type,
    cc.id as company_code_id,
    COALESCE(ra.is_active, true) as is_active,
    COALESCE(ra.created_at, NOW()) as created_at,
    COALESCE(ra.updated_at, NOW()) as updated_at
FROM reconciliation_accounts_backup ra
LEFT JOIN gl_accounts ga ON ga.account_number = ra.gl_account
LEFT JOIN company_codes cc ON cc.code = ra.company_code
WHERE ga.id IS NOT NULL AND cc.id IS NOT NULL;
*/

