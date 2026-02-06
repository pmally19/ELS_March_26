-- Migration: Enhance Ledgers table for S4 HANA-like functionality
-- Purpose: Add missing fields to match S4 HANA ledger capabilities
-- No SAP terminology used

-- Add new columns to ledgers table
ALTER TABLE ledgers 
ADD COLUMN IF NOT EXISTS accounting_principle VARCHAR(50), -- IFRS, US_GAAP, LOCAL_GAAP, etc.
ADD COLUMN IF NOT EXISTS base_ledger_id INTEGER REFERENCES ledgers(id), -- For extension ledgers
ADD COLUMN IF NOT EXISTS extension_type VARCHAR(20), -- ADJUSTMENT, REPORTING, TAX
ADD COLUMN IF NOT EXISTS document_splitting_active BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS company_code_currency_active BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS group_currency_active BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS hard_currency_active BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS index_currency_active BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS index_currency_code VARCHAR(3),
ADD COLUMN IF NOT EXISTS chart_of_accounts_id INTEGER REFERENCES chart_of_accounts(id),
ADD COLUMN IF NOT EXISTS posting_period_control_id INTEGER; -- Reference to posting_period_controls

-- Update comments
COMMENT ON COLUMN ledgers.accounting_principle IS 'Accounting principle (IFRS, US_GAAP, LOCAL_GAAP, etc.)';
COMMENT ON COLUMN ledgers.base_ledger_id IS 'Base ledger for extension ledgers (self-reference)';
COMMENT ON COLUMN ledgers.extension_type IS 'Type of extension: ADJUSTMENT, REPORTING, TAX';
COMMENT ON COLUMN ledgers.document_splitting_active IS 'Enable document splitting functionality';
COMMENT ON COLUMN ledgers.company_code_currency_active IS 'Use company code currency';
COMMENT ON COLUMN ledgers.group_currency_active IS 'Use group currency for consolidation';
COMMENT ON COLUMN ledgers.hard_currency_active IS 'Use hard currency for statutory reporting';
COMMENT ON COLUMN ledgers.index_currency_active IS 'Use index currency';
COMMENT ON COLUMN ledgers.index_currency_code IS 'Index currency code if active';
COMMENT ON COLUMN ledgers.chart_of_accounts_id IS 'Chart of accounts for this ledger';
COMMENT ON COLUMN ledgers.posting_period_control_id IS 'Posting period control for this ledger';

