-- Migration: Create Account Category References table
-- Description: Account Category Reference for Material Valuation in SAP
-- Links Valuation Grouping Code with Valuation Class for GL account determination

CREATE TABLE IF NOT EXISTS account_category_references (
  id SERIAL PRIMARY KEY,
  code VARCHAR(10) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
  created_by INTEGER,
  updated_by INTEGER
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_account_category_references_code ON account_category_references(code);
CREATE INDEX IF NOT EXISTS idx_account_category_references_is_active ON account_category_references(is_active);

-- Add comments for documentation
COMMENT ON TABLE account_category_references IS 'Account Category Reference for Material Valuation - controls assignment of materials to GL accounts';
COMMENT ON COLUMN account_category_references.code IS 'Unique account category reference code (e.g., 0001, 0002)';
COMMENT ON COLUMN account_category_references.name IS 'Descriptive name for the account category reference';
COMMENT ON COLUMN account_category_references.description IS 'Detailed description of usage and purpose';
COMMENT ON COLUMN account_category_references.is_active IS 'Whether this account category reference is active and available for use';

-- Insert sample data
INSERT INTO account_category_references (code, name, description, is_active, created_by, updated_by)
VALUES 
  ('0001', 'Standard Materials', 'Standard materials for general use', true, 1, 1),
  ('0002', 'Trading Goods', 'Trading goods and merchandise', true, 1, 1),
  ('0003', 'Raw Materials', 'Raw materials for production', true, 1, 1),
  ('0004', 'Finished Products', 'Finished products for sale', true, 1, 1)
ON CONFLICT (code) DO NOTHING;
