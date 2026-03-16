-- Create document_pricing_procedures table
CREATE TABLE IF NOT EXISTS document_pricing_procedures (
  id SERIAL PRIMARY KEY,
  procedure_code VARCHAR(10) NOT NULL UNIQUE,
  procedure_name VARCHAR(100) NOT NULL,
  description TEXT,
  pricing_control VARCHAR(20) NOT NULL DEFAULT 'Normal',
  manual_price_allowed BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT valid_pricing_control CHECK (pricing_control IN ('Normal', 'No Pricing', 'Redetermine'))
);

-- Create unique index on procedure_code for performance
CREATE UNIQUE INDEX IF NOT EXISTS idx_document_pricing_procedures_code 
  ON document_pricing_procedures(procedure_code);

-- Create index on is_active for filtering
CREATE INDEX IF NOT EXISTS idx_document_pricing_procedures_active 
  ON document_pricing_procedures(is_active);

-- Create index on pricing_control for filtering
CREATE INDEX IF NOT EXISTS idx_document_pricing_procedures_pricing_control 
  ON document_pricing_procedures(pricing_control);

-- Insert standard SAP-based document pricing procedure codes
INSERT INTO document_pricing_procedures (procedure_code, procedure_name, description, pricing_control, manual_price_allowed, is_active) VALUES
  ('ZDOC1', 'Standard Order Pricing', 'Standard pricing for sales orders', 'Normal', true, true),
  ('ZDOC2', 'Quotation Pricing', 'Pricing for quotations and proposals', 'Normal', true, true),
  ('ZDOC3', 'Contract Pricing', 'Fixed contract pricing without recalculation', 'No Pricing', false, true),
  ('ZDOC4', 'Rush Order Pricing', 'Expedited order pricing with automatic redetermination', 'Redetermine', true, true),
  ('ZDOC5', 'Returns Pricing', 'Pricing for return documents and credit processing', 'Normal', false, true),
  ('ZDOC6', 'Credit Memo Pricing', 'Credit memo pricing with recalculation logic', 'Redetermine', true, true)
ON CONFLICT (procedure_code) DO NOTHING;

-- Add comments to table
COMMENT ON TABLE document_pricing_procedures IS 'Master data for document pricing procedure codes';
COMMENT ON COLUMN document_pricing_procedures.procedure_code IS 'Unique pricing procedure code (max 10 characters)';
COMMENT ON COLUMN document_pricing_procedures.procedure_name IS 'Descriptive name of the pricing procedure';
COMMENT ON COLUMN document_pricing_procedures.description IS 'Optional detailed description';
COMMENT ON COLUMN document_pricing_procedures.pricing_control IS 'Pricing control: Normal, No Pricing, or Redetermine';
COMMENT ON COLUMN document_pricing_procedures.manual_price_allowed IS 'Allow manual price override by users';
COMMENT ON COLUMN document_pricing_procedures.is_active IS 'Active status flag';
