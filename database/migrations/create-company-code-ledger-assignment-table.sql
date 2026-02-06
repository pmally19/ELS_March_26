-- Migration: Create Company Code Ledger Assignment table
-- Purpose: Assign ledgers to company codes (many-to-many relationship)
-- In S4 HANA, ledgers must be assigned to company codes to be used
-- No SAP terminology used

CREATE TABLE IF NOT EXISTS company_code_ledger_assignments (
  id SERIAL PRIMARY KEY,
  
  -- Relationships
  company_code_id INTEGER NOT NULL REFERENCES company_codes(id) ON DELETE CASCADE,
  ledger_id INTEGER NOT NULL REFERENCES ledgers(id) ON DELETE CASCADE,
  
  -- Currency Configuration (ledger-specific per company code)
  company_code_currency_code VARCHAR(3), -- Currency from company code
  group_currency_code VARCHAR(3), -- Group currency for consolidation
  hard_currency_code VARCHAR(3), -- Hard currency for statutory reporting
  
  -- Accounting Principle
  accounting_principle VARCHAR(50), -- IFRS, US_GAAP, LOCAL_GAAP, etc.
  
  -- Posting Period Control
  posting_period_control_id INTEGER, -- Reference to posting_period_controls table
  
  -- Assignment Settings
  is_primary_ledger BOOLEAN DEFAULT FALSE, -- Primary ledger for this company code
  is_mandatory BOOLEAN DEFAULT FALSE, -- Postings must go to this ledger
  
  -- Status and Metadata
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  assigned_date TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by INTEGER,
  updated_by INTEGER,
  
  -- Unique constraint: one ledger per company code
  UNIQUE(company_code_id, ledger_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_company_code_ledger_company ON company_code_ledger_assignments(company_code_id);
CREATE INDEX IF NOT EXISTS idx_company_code_ledger_ledger ON company_code_ledger_assignments(ledger_id);
CREATE INDEX IF NOT EXISTS idx_company_code_ledger_active ON company_code_ledger_assignments(is_active);
CREATE INDEX IF NOT EXISTS idx_company_code_ledger_primary ON company_code_ledger_assignments(company_code_id, is_primary_ledger) WHERE is_primary_ledger = TRUE;

COMMENT ON TABLE company_code_ledger_assignments IS 'Assigns ledgers to company codes with ledger-specific settings';
COMMENT ON COLUMN company_code_ledger_assignments.company_code_currency_code IS 'Company code currency for this ledger assignment';
COMMENT ON COLUMN company_code_ledger_assignments.group_currency_code IS 'Group currency for consolidation reporting';
COMMENT ON COLUMN company_code_ledger_assignments.hard_currency_code IS 'Hard currency for statutory reporting';
COMMENT ON COLUMN company_code_ledger_assignments.accounting_principle IS 'Accounting principle (IFRS, US_GAAP, LOCAL_GAAP)';
COMMENT ON COLUMN company_code_ledger_assignments.is_primary_ledger IS 'Indicates the primary ledger for this company code';

