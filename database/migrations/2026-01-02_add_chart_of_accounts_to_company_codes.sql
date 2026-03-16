-- Migration: Add Chart of Accounts to Company Codes
-- Date: 2026-01-02
-- Purpose: Add chart_of_accounts_id field to company_codes table

-- Add chart_of_accounts_id column
ALTER TABLE company_codes 
ADD COLUMN IF NOT EXISTS chart_of_accounts_id INTEGER;

-- Add foreign key constraint
ALTER TABLE company_codes
DROP CONSTRAINT IF EXISTS fk_company_codes_chart_of_accounts;

ALTER TABLE company_codes
ADD CONSTRAINT fk_company_codes_chart_of_accounts
FOREIGN KEY (chart_of_accounts_id) 
REFERENCES chart_of_accounts(id)
ON DELETE SET NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_company_codes_chart_of_accounts_id 
ON company_codes(chart_of_accounts_id);

-- Verify the migration
DO $$
BEGIN
  RAISE NOTICE 'Migration completed successfully';
  RAISE NOTICE 'Added chart_of_accounts_id column to company_codes table';
  RAISE NOTICE 'Added foreign key constraint to chart_of_accounts';
  RAISE NOTICE 'Added index for performance optimization';
END $$;
