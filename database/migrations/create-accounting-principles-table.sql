-- Migration: Create Accounting Principles table
-- Purpose: Manage accounting standards and principles (IFRS, US GAAP, Local GAAP, etc.)
-- No SAP terminology used

CREATE TABLE IF NOT EXISTS accounting_principles (
  id SERIAL PRIMARY KEY,
  code VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  standard_type VARCHAR(50), -- INTERNATIONAL, NATIONAL, REGIONAL
  jurisdiction VARCHAR(100), -- Country or region where this standard applies
  effective_date DATE, -- When this standard became effective
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by INTEGER,
  updated_by INTEGER
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_accounting_principles_code ON accounting_principles(code);
CREATE INDEX IF NOT EXISTS idx_accounting_principles_active ON accounting_principles(is_active);
CREATE INDEX IF NOT EXISTS idx_accounting_principles_standard_type ON accounting_principles(standard_type);

COMMENT ON TABLE accounting_principles IS 'Accounting standards and principles for financial reporting';
COMMENT ON COLUMN accounting_principles.code IS 'Unique code for the accounting principle';
COMMENT ON COLUMN accounting_principles.name IS 'Display name of the accounting principle';
COMMENT ON COLUMN accounting_principles.standard_type IS 'Type: INTERNATIONAL, NATIONAL, REGIONAL';
COMMENT ON COLUMN accounting_principles.jurisdiction IS 'Country or region where this standard applies';
COMMENT ON COLUMN accounting_principles.effective_date IS 'Date when this standard became effective';

