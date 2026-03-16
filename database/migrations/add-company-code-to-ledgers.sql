-- Migration: Add company_code_id to ledgers table
-- Purpose: Link ledgers to company codes for company-specific ledger configuration
-- No SAP terminology used

ALTER TABLE ledgers 
ADD COLUMN IF NOT EXISTS company_code_id INTEGER REFERENCES company_codes(id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_ledgers_company_code ON ledgers(company_code_id);

COMMENT ON COLUMN ledgers.company_code_id IS 'Company code this ledger is assigned to (optional - can be global)';

