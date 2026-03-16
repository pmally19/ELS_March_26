-- Migration: Add GL Categorization Fields and Enhance GL Structure
-- Date: 2025-10-28
-- Description: Adds cash flow, balance sheet, and income statement categorization fields to gl_accounts
--              Adds fiscal period, bank transaction link, and other fields to gl_entries
--              Adds gl_posting_status to customer_payments

BEGIN;

-- ============================================================================
-- 1. Add categorization fields to gl_accounts table
-- ============================================================================

-- Add cash_flow_category field
ALTER TABLE gl_accounts 
ADD COLUMN IF NOT EXISTS cash_flow_category VARCHAR(20);

COMMENT ON COLUMN gl_accounts.cash_flow_category IS 'Categorizes accounts for cash flow statement: OPERATING, INVESTING, FINANCING';

-- Add balance_sheet_category field
ALTER TABLE gl_accounts 
ADD COLUMN IF NOT EXISTS balance_sheet_category VARCHAR(20);

COMMENT ON COLUMN gl_accounts.balance_sheet_category IS 'Categorizes balance sheet accounts: CURRENT_ASSET, NON_CURRENT_ASSET, CURRENT_LIABILITY, NON_CURRENT_LIABILITY, EQUITY';

-- Add income_statement_category field
ALTER TABLE gl_accounts 
ADD COLUMN IF NOT EXISTS income_statement_category VARCHAR(20);

COMMENT ON COLUMN gl_accounts.income_statement_category IS 'Categorizes income statement accounts: SALES_REVENUE, OTHER_REVENUE, COGS, SELLING_EXPENSE, GNA_EXPENSE, RND_EXPENSE, INTEREST_INCOME, INTEREST_EXPENSE, OTHER_INCOME, OTHER_EXPENSE';

-- ============================================================================
-- 2. Add missing fields to gl_entries table
-- ============================================================================

-- Add bank_transaction_id field
ALTER TABLE gl_entries 
ADD COLUMN IF NOT EXISTS bank_transaction_id INTEGER;

COMMENT ON COLUMN gl_entries.bank_transaction_id IS 'Links GL entry to bank_transactions table for reconciliation';

-- Add fiscal_period field
ALTER TABLE gl_entries 
ADD COLUMN IF NOT EXISTS fiscal_period INTEGER;

COMMENT ON COLUMN gl_entries.fiscal_period IS 'Fiscal period number (typically 1-12 for monthly periods)';

-- Add fiscal_year field
ALTER TABLE gl_entries 
ADD COLUMN IF NOT EXISTS fiscal_year INTEGER;

COMMENT ON COLUMN gl_entries.fiscal_year IS 'Fiscal year (e.g., 2025)';

-- Add description field if not exists
ALTER TABLE gl_entries 
ADD COLUMN IF NOT EXISTS description TEXT;

COMMENT ON COLUMN gl_entries.description IS 'Description of the GL entry';

-- Add cost_center_id field if not exists
ALTER TABLE gl_entries 
ADD COLUMN IF NOT EXISTS cost_center_id INTEGER REFERENCES cost_centers(id);

COMMENT ON COLUMN gl_entries.cost_center_id IS 'Cost center for this GL entry';

-- Add profit_center_id field if not exists
ALTER TABLE gl_entries 
ADD COLUMN IF NOT EXISTS profit_center_id INTEGER REFERENCES profit_centers(id);

COMMENT ON COLUMN gl_entries.profit_center_id IS 'Profit center for this GL entry';

-- Add reference field if not exists
ALTER TABLE gl_entries 
ADD COLUMN IF NOT EXISTS reference VARCHAR(255);

COMMENT ON COLUMN gl_entries.reference IS 'Reference number or document reference';

-- Add source_module field if not exists
ALTER TABLE gl_entries 
ADD COLUMN IF NOT EXISTS source_module VARCHAR(50);

COMMENT ON COLUMN gl_entries.source_module IS 'Source module that created this entry: SALES, PROCUREMENT, FINANCE, etc.';

-- Add source_document_id field if not exists
ALTER TABLE gl_entries 
ADD COLUMN IF NOT EXISTS source_document_id INTEGER;

COMMENT ON COLUMN gl_entries.source_document_id IS 'ID of the source document (invoice, payment, etc.)';

-- Add source_document_type field if not exists
ALTER TABLE gl_entries 
ADD COLUMN IF NOT EXISTS source_document_type VARCHAR(50);

COMMENT ON COLUMN gl_entries.source_document_type IS 'Type of source document: INVOICE, PAYMENT, JOURNAL, etc.';

-- ============================================================================
-- 3. Add gl_posting_status to customer_payments table
-- ============================================================================

ALTER TABLE customer_payments 
ADD COLUMN IF NOT EXISTS gl_posting_status VARCHAR(20) DEFAULT 'pending';

COMMENT ON COLUMN customer_payments.gl_posting_status IS 'GL posting status: POSTED, PENDING, FAILED';

-- ============================================================================
-- 4. Update existing gl_entries to populate fiscal_year and fiscal_period
--    from posting_date if not already set
-- ============================================================================

UPDATE gl_entries
SET 
  fiscal_year = EXTRACT(YEAR FROM posting_date)::INTEGER,
  fiscal_period = EXTRACT(MONTH FROM posting_date)::INTEGER
WHERE (fiscal_year IS NULL OR fiscal_period IS NULL)
  AND posting_date IS NOT NULL;

-- ============================================================================
-- 5. Create indexes for performance
-- ============================================================================

-- Index on gl_accounts categorization fields
CREATE INDEX IF NOT EXISTS idx_gl_accounts_cash_flow_category ON gl_accounts(cash_flow_category) WHERE cash_flow_category IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_gl_accounts_balance_sheet_category ON gl_accounts(balance_sheet_category) WHERE balance_sheet_category IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_gl_accounts_income_statement_category ON gl_accounts(income_statement_category) WHERE income_statement_category IS NOT NULL;

-- Index on gl_entries new fields
CREATE INDEX IF NOT EXISTS idx_gl_entries_bank_transaction_id ON gl_entries(bank_transaction_id) WHERE bank_transaction_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_gl_entries_fiscal_period_year ON gl_entries(fiscal_year, fiscal_period) WHERE fiscal_year IS NOT NULL AND fiscal_period IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_gl_entries_source_document ON gl_entries(source_document_type, source_document_id) WHERE source_document_type IS NOT NULL;

-- Index on customer_payments gl_posting_status
CREATE INDEX IF NOT EXISTS idx_customer_payments_gl_posting_status ON customer_payments(gl_posting_status);

COMMIT;

-- ============================================================================
-- Verification queries (run separately to verify migration)
-- ============================================================================
/*
-- Verify gl_accounts new columns
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'gl_accounts' 
  AND column_name IN ('cash_flow_category', 'balance_sheet_category', 'income_statement_category');

-- Verify gl_entries new columns
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'gl_entries' 
  AND column_name IN ('bank_transaction_id', 'fiscal_period', 'fiscal_year', 'description', 
                      'cost_center_id', 'profit_center_id', 'reference', 'source_module', 
                      'source_document_id', 'source_document_type');

-- Verify customer_payments new column
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'customer_payments' 
  AND column_name = 'gl_posting_status';
*/

