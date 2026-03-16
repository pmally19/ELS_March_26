-- Migration: Add company_code_id to bank_master table
-- This integrates bank master with company codes for multi-company support

-- Add company_code_id column to bank_master table
ALTER TABLE bank_master 
ADD COLUMN IF NOT EXISTS company_code_id INTEGER;

-- Add foreign key constraint to company_codes table
ALTER TABLE bank_master
ADD CONSTRAINT fk_bank_master_company_code 
FOREIGN KEY (company_code_id) 
REFERENCES company_codes(id)
ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_bank_master_company_code_id 
ON bank_master(company_code_id);

-- Add comment to document the column
COMMENT ON COLUMN bank_master.company_code_id IS 'Reference to company code for multi-company bank management';

