-- Migration: Create Chart of Depreciation table
-- Purpose: Store depreciation configuration for asset accounting
-- No hardcoded data - all data must be configured by users

CREATE TABLE IF NOT EXISTS chart_of_depreciation (
  id SERIAL PRIMARY KEY,
  code VARCHAR(10) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  company_code_id INTEGER NOT NULL REFERENCES company_codes(id) ON DELETE RESTRICT,
  fiscal_year_variant_id INTEGER REFERENCES fiscal_year_variants(id) ON DELETE SET NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  country VARCHAR(3),
  depreciation_method VARCHAR(50),
  base_method VARCHAR(50),
  depreciation_calculation VARCHAR(50),
  period_control VARCHAR(20),
  allow_manual_depreciation BOOLEAN NOT NULL DEFAULT FALSE,
  allow_accelerated_depreciation BOOLEAN NOT NULL DEFAULT FALSE,
  allow_special_depreciation BOOLEAN NOT NULL DEFAULT FALSE,
  require_depreciation_key BOOLEAN NOT NULL DEFAULT TRUE,
  allow_negative_depreciation BOOLEAN NOT NULL DEFAULT FALSE,
  depreciation_start_date TIMESTAMP,
  depreciation_end_date TIMESTAMP,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER,
  updated_by INTEGER
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_chart_of_depreciation_code ON chart_of_depreciation(code);
CREATE INDEX IF NOT EXISTS idx_chart_of_depreciation_company_code ON chart_of_depreciation(company_code_id);
CREATE INDEX IF NOT EXISTS idx_chart_of_depreciation_fiscal_year_variant ON chart_of_depreciation(fiscal_year_variant_id);
CREATE INDEX IF NOT EXISTS idx_chart_of_depreciation_active ON chart_of_depreciation(is_active);

-- Add comments
COMMENT ON TABLE chart_of_depreciation IS 'Chart of depreciation configuration for asset accounting - no hardcoded data';
COMMENT ON COLUMN chart_of_depreciation.code IS 'Unique code for the depreciation chart';
COMMENT ON COLUMN chart_of_depreciation.name IS 'Name of the depreciation chart';
COMMENT ON COLUMN chart_of_depreciation.company_code_id IS 'Reference to company code';
COMMENT ON COLUMN chart_of_depreciation.depreciation_method IS 'Method: STRAIGHT_LINE, DECLINING_BALANCE, UNITS_OF_PRODUCTION, etc.';
COMMENT ON COLUMN chart_of_depreciation.base_method IS 'Base for calculation: ACQUISITION_VALUE, REPLACEMENT_VALUE, BOOK_VALUE';
COMMENT ON COLUMN chart_of_depreciation.depreciation_calculation IS 'Calculation method: PRO_RATA, FULL_YEAR, HALF_YEAR';

