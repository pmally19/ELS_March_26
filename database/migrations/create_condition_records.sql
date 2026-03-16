-- Migration: Create condition_records table for pricing master data
-- Date: 2026-02-05
-- Description: Stores actual pricing values (prices, discounts, freight, etc.)

CREATE TABLE IF NOT EXISTS condition_records (
  id SERIAL PRIMARY KEY,
  condition_type_code VARCHAR(10) NOT NULL,
  
  -- Key fields for condition record determination
  company_code_id INTEGER REFERENCES company_codes(id),
  sales_org_id INTEGER REFERENCES sales_organizations(id),
  distribution_channel_id INTEGER REFERENCES distribution_channels(id),
  division_id INTEGER REFERENCES divisions(id),
  customer_code VARCHAR(10),
  material_code VARCHAR(18),
  material_group VARCHAR(10),
  customer_group VARCHAR(10),
  
  -- Pricing value
  condition_value DECIMAL(15,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'INR',
  per_unit INTEGER DEFAULT 1,
  unit_of_measure VARCHAR(3),
  
  -- Calculation type
  calculation_type VARCHAR(1) DEFAULT 'A', -- A=Amount, P=Percentage
  
  -- Validity period
  valid_from DATE NOT NULL,
  valid_to DATE NOT NULL DEFAULT '9999-12-31',
  
  -- Scale pricing
  scale_quantity_from DECIMAL(15,3),
  scale_quantity_to DECIMAL(15,3),
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR(50),
  
  -- Ensure valid date range
  CONSTRAINT check_valid_dates CHECK (valid_from <= valid_to),
  CONSTRAINT check_scale_range CHECK (
    (scale_quantity_from IS NULL AND scale_quantity_to IS NULL) OR
    (scale_quantity_from IS NOT NULL AND scale_quantity_to IS NOT NULL AND scale_quantity_from <= scale_quantity_to)
  )
);

-- Indexes for fast condition record searches
CREATE INDEX IF NOT EXISTS idx_condition_records_type ON condition_records(condition_type_code);
CREATE INDEX IF NOT EXISTS idx_condition_records_material ON condition_records(material_code) WHERE material_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_condition_records_customer ON condition_records(customer_code) WHERE customer_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_condition_records_validity ON condition_records(valid_from, valid_to);
CREATE INDEX IF NOT EXISTS idx_condition_records_active ON condition_records(is_active, condition_type_code);

-- Composite index for common search patterns
CREATE INDEX IF NOT EXISTS idx_condition_records_search 
  ON condition_records(condition_type_code, material_code, customer_code, valid_from, valid_to)
  WHERE is_active = true;

-- Comments
COMMENT ON TABLE condition_records IS 'Master data for pricing conditions - stores actual prices, discounts, surcharges, etc.';
COMMENT ON COLUMN condition_records.condition_type_code IS 'Links to condition_types table';
COMMENT ON COLUMN condition_records.condition_value IS 'Pricing value - can be amount or percentage based on calculation_type';
COMMENT ON COLUMN condition_records.per_unit IS 'Condition value per X units (e.g., price per 10 units)';
COMMENT ON COLUMN condition_records.calculation_type IS 'A=Fixed Amount, P=Percentage';
COMMENT ON COLUMN condition_records.scale_quantity_from IS 'Starting quantity for scale pricing (NULL for non-scale)';
COMMENT ON COLUMN condition_records.scale_quantity_to IS 'Ending quantity for scale pricing (NULL for non-scale)';
