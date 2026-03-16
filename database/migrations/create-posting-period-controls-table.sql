-- Migration: Create Posting Period Controls table
-- Purpose: Control when transactions can be posted to the general ledger
-- Links company codes, fiscal years, and periods with posting permissions
-- No SAP terminology - uses generic business terms

CREATE TABLE IF NOT EXISTS posting_period_controls (
  id SERIAL PRIMARY KEY,
  
  -- Company and Fiscal Year Association
  company_code_id INTEGER NOT NULL REFERENCES company_codes(id) ON DELETE CASCADE,
  fiscal_year_variant_id INTEGER REFERENCES fiscal_year_variants(id) ON DELETE SET NULL,
  fiscal_year INTEGER NOT NULL, -- e.g., 2024, 2025
  
  -- Period Range Control
  period_from INTEGER NOT NULL CHECK (period_from >= 1 AND period_from <= 16),
  period_to INTEGER NOT NULL CHECK (period_to >= 1 AND period_to <= 16),
  
  -- Posting Control Status
  posting_status VARCHAR(20) NOT NULL DEFAULT 'OPEN' CHECK (posting_status IN ('OPEN', 'CLOSED', 'LOCKED')),
  allow_posting BOOLEAN NOT NULL DEFAULT TRUE,
  allow_adjustments BOOLEAN NOT NULL DEFAULT FALSE, -- Allow adjustment entries
  allow_reversals BOOLEAN NOT NULL DEFAULT TRUE, -- Allow reversal entries
  
  -- Control Details
  control_reason TEXT, -- Reason for closing/locking
  controlled_by INTEGER, -- User ID who set the control
  controlled_at TIMESTAMP, -- When the control was set
  
  -- Status and Metadata
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by INTEGER,
  updated_by INTEGER,
  
  -- Ensure period_to >= period_from
  CONSTRAINT check_period_range CHECK (period_to >= period_from),
  
  -- Unique constraint: one control per company code, fiscal year, and period range
  CONSTRAINT unique_company_fiscal_period UNIQUE (company_code_id, fiscal_year, period_from, period_to)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_posting_period_controls_company ON posting_period_controls(company_code_id);
CREATE INDEX IF NOT EXISTS idx_posting_period_controls_fiscal_year ON posting_period_controls(fiscal_year);
CREATE INDEX IF NOT EXISTS idx_posting_period_controls_status ON posting_period_controls(posting_status);
CREATE INDEX IF NOT EXISTS idx_posting_period_controls_active ON posting_period_controls(is_active);
CREATE INDEX IF NOT EXISTS idx_posting_period_controls_company_fiscal ON posting_period_controls(company_code_id, fiscal_year);

-- Add comment
COMMENT ON TABLE posting_period_controls IS 'Controls when transactions can be posted to the general ledger for specific company codes, fiscal years, and periods';

-- Note: No default data inserted - all posting period controls must be configured by users

