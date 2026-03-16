-- Create customer_pricing_procedures table
CREATE TABLE IF NOT EXISTS customer_pricing_procedures (
  id SERIAL PRIMARY KEY,
  procedure_code VARCHAR(10) NOT NULL UNIQUE,
  procedure_name VARCHAR(100) NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create unique index on procedure_code for performance
CREATE UNIQUE INDEX IF NOT EXISTS idx_customer_pricing_procedures_code 
  ON customer_pricing_procedures(procedure_code);

-- Create index on is_active for filtering
CREATE INDEX IF NOT EXISTS idx_customer_pricing_procedures_active 
  ON customer_pricing_procedures(is_active);

-- Insert standard SAP-based pricing procedure codes
INSERT INTO customer_pricing_procedures (procedure_code, procedure_name, description, is_active) VALUES
  ('ZCUST1', 'Standard Customer Pricing', 'Standard pricing procedure for regular customers', true),
  ('ZCUST2', 'Premium Customer Pricing', 'Pricing procedure for premium customers with special discounts', true),
  ('ZCUST3', 'Retail Customer Pricing', 'Pricing procedure for retail customers', true),
  ('ZCUST4', 'Wholesale Pricing', 'Pricing procedure for wholesale customers', true),
  ('ZCUST5', 'Export Pricing', 'Pricing procedure for export customers', true)
ON CONFLICT (procedure_code) DO NOTHING;

-- Add comment to table
COMMENT ON TABLE customer_pricing_procedures IS 'Master data for customer pricing procedure codes';
COMMENT ON COLUMN customer_pricing_procedures.procedure_code IS 'Unique pricing procedure code (max 10 characters)';
COMMENT ON COLUMN customer_pricing_procedures.procedure_name IS 'Descriptive name of the pricing procedure';
COMMENT ON COLUMN customer_pricing_procedures.description IS 'Optional detailed description';
COMMENT ON COLUMN customer_pricing_procedures.is_active IS 'Active status flag';
