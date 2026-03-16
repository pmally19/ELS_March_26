-- Migration: Create Ledgers (Accounting Books) table
-- Purpose: Manage multiple accounting books for parallel accounting (e.g., local GAAP, IFRS, tax reporting)
-- No SAP terminology used

CREATE TABLE IF NOT EXISTS ledgers (
  id SERIAL PRIMARY KEY,
  
  -- Basic Information
  code VARCHAR(10) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  
  -- Classification
  ledger_type VARCHAR(20) NOT NULL DEFAULT 'PRIMARY', -- PRIMARY, SECONDARY, REPORTING
  ledger_category VARCHAR(50), -- FINANCIAL_REPORTING, TAX_REPORTING, MANAGEMENT_REPORTING
  
  -- Configuration
  fiscal_year_variant_id INTEGER REFERENCES fiscal_year_variants(id),
  default_currency_code VARCHAR(3) NOT NULL DEFAULT 'USD',
  parallel_currency_code VARCHAR(3), -- For parallel currency accounting
  
  -- Ledger Group Assignment
  ledger_group_id INTEGER, -- Reference to ledger_groups table (to be created if needed)
  
  -- Posting Control
  allow_postings BOOLEAN DEFAULT TRUE,
  is_consolidation_ledger BOOLEAN DEFAULT FALSE, -- For consolidation purposes
  requires_approval BOOLEAN DEFAULT FALSE,
  
  -- Display and Sorting
  display_order INTEGER DEFAULT 0,
  sort_key VARCHAR(10),
  
  -- Status and Metadata
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_default BOOLEAN DEFAULT FALSE, -- Only one default ledger per company
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by INTEGER,
  updated_by INTEGER
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_ledgers_code ON ledgers(code);
CREATE INDEX IF NOT EXISTS idx_ledgers_type ON ledgers(ledger_type);
CREATE INDEX IF NOT EXISTS idx_ledgers_active ON ledgers(is_active);
CREATE INDEX IF NOT EXISTS idx_ledgers_fiscal_year_variant ON ledgers(fiscal_year_variant_id);

-- Create unique constraint: only one default ledger can be active at a time
CREATE UNIQUE INDEX IF NOT EXISTS idx_ledgers_default_unique 
ON ledgers(is_default) 
WHERE is_default = TRUE AND is_active = TRUE;

COMMENT ON TABLE ledgers IS 'Accounting books for parallel accounting (e.g., different accounting standards)';
COMMENT ON COLUMN ledgers.code IS 'Unique code for the ledger';
COMMENT ON COLUMN ledgers.name IS 'Display name of the ledger';
COMMENT ON COLUMN ledgers.ledger_type IS 'Type: PRIMARY (main accounting), SECONDARY (alternative), REPORTING (reporting only)';
COMMENT ON COLUMN ledgers.ledger_category IS 'Category: FINANCIAL_REPORTING, TAX_REPORTING, MANAGEMENT_REPORTING';
COMMENT ON COLUMN ledgers.default_currency_code IS 'Primary currency for this ledger';
COMMENT ON COLUMN ledgers.parallel_currency_code IS 'Optional parallel currency for reporting';
COMMENT ON COLUMN ledgers.is_default IS 'Indicates the default ledger for the system';

