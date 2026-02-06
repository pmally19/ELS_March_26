-- Migration: Create Depreciation Methods table
-- Purpose: Master data table for asset depreciation methods configuration
-- No SAP terminology used - generic business terms only

CREATE TABLE IF NOT EXISTS depreciation_methods (
  id SERIAL PRIMARY KEY,
  code VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  
  -- Method Configuration
  calculation_type VARCHAR(50) NOT NULL, -- STRAIGHT_LINE, DECLINING_BALANCE, UNITS_OF_PRODUCTION, SUM_OF_YEARS
  base_value_type VARCHAR(50) NOT NULL, -- ACQUISITION_VALUE, BOOK_VALUE, REPLACEMENT_VALUE
  
  -- Calculation Parameters
  depreciation_rate DECIMAL(5,2), -- Annual depreciation rate as percentage
  useful_life_years INTEGER, -- Default useful life in years
  residual_value_percent DECIMAL(5,2) DEFAULT 0, -- Residual value as percentage of acquisition value
  
  -- Advanced Options
  allow_partial_year BOOLEAN NOT NULL DEFAULT TRUE, -- Allow depreciation for partial years
  prorata_basis VARCHAR(50) DEFAULT 'DAYS', -- DAYS, MONTHS, FULL_YEAR
  switch_method_allowed BOOLEAN NOT NULL DEFAULT FALSE, -- Allow switching to another method
  
  -- Company and Organization
  company_code_id INTEGER REFERENCES company_codes(id),
  applicable_to_asset_class VARCHAR(50), -- Specific asset class or NULL for all
  
  -- Status and Metadata
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_default BOOLEAN NOT NULL DEFAULT FALSE, -- Default method for new assets
  created_by VARCHAR(50),
  updated_by VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  active BOOLEAN DEFAULT TRUE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_depreciation_methods_code ON depreciation_methods(code);
CREATE INDEX IF NOT EXISTS idx_depreciation_methods_company_code ON depreciation_methods(company_code_id);
CREATE INDEX IF NOT EXISTS idx_depreciation_methods_active ON depreciation_methods(is_active);
CREATE INDEX IF NOT EXISTS idx_depreciation_methods_calculation_type ON depreciation_methods(calculation_type);

-- Add comments for documentation
COMMENT ON TABLE depreciation_methods IS 'Master data table for asset depreciation methods - no hardcoded data';
COMMENT ON COLUMN depreciation_methods.code IS 'Unique code identifier for the depreciation method';
COMMENT ON COLUMN depreciation_methods.name IS 'Display name of the depreciation method';
COMMENT ON COLUMN depreciation_methods.calculation_type IS 'Type: STRAIGHT_LINE, DECLINING_BALANCE, UNITS_OF_PRODUCTION, SUM_OF_YEARS';
COMMENT ON COLUMN depreciation_methods.base_value_type IS 'Base value for calculation: ACQUISITION_VALUE, BOOK_VALUE, REPLACEMENT_VALUE';
COMMENT ON COLUMN depreciation_methods.depreciation_rate IS 'Annual depreciation rate as percentage (for declining balance methods)';
COMMENT ON COLUMN depreciation_methods.useful_life_years IS 'Default useful life in years for assets using this method';
COMMENT ON COLUMN depreciation_methods.residual_value_percent IS 'Residual value as percentage of acquisition value';
COMMENT ON COLUMN depreciation_methods.prorata_basis IS 'Basis for partial year calculation: DAYS, MONTHS, FULL_YEAR';

