-- Migration: Create Ledger Groups table
-- Purpose: Group related ledgers together for management and reporting
-- No SAP terminology used

CREATE TABLE IF NOT EXISTS ledger_groups (
  id SERIAL PRIMARY KEY,
  
  -- Basic Information
  code VARCHAR(10) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  
  -- Group Classification
  group_type VARCHAR(50), -- STANDARD, CONSOLIDATION, TAX_REPORTING
  
  -- Display and Sorting
  display_order INTEGER DEFAULT 0,
  
  -- Status and Metadata
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by INTEGER,
  updated_by INTEGER
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_ledger_groups_code ON ledger_groups(code);
CREATE INDEX IF NOT EXISTS idx_ledger_groups_active ON ledger_groups(is_active);

COMMENT ON TABLE ledger_groups IS 'Groups for organizing related accounting ledgers';
COMMENT ON COLUMN ledger_groups.code IS 'Unique code for the ledger group';
COMMENT ON COLUMN ledger_groups.name IS 'Display name of the ledger group';

