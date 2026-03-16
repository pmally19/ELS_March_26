-- Create Account Keys table for pricing procedure GL account determination
CREATE TABLE IF NOT EXISTS account_keys (
  id SERIAL PRIMARY KEY,
  code VARCHAR(10) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  account_type VARCHAR(50) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  CONSTRAINT chk_account_type CHECK (account_type IN (
    'Revenue', 'Expense', 'Tax', 'Liability', 'Asset', 'Discount'
  ))
);

-- Create indexes for performance
CREATE INDEX idx_account_keys_code ON account_keys(code);
CREATE INDEX idx_account_keys_type ON account_keys(account_type);
CREATE INDEX idx_account_keys_active ON account_keys(is_active);

-- Add comments
COMMENT ON TABLE account_keys IS 'Account keys for pricing procedure GL account determination (SAP ECC style)';
COMMENT ON COLUMN account_keys.code IS 'Unique account key code (e.g., ERL, MWS, FRC) - max 10 characters';
COMMENT ON COLUMN account_keys.name IS 'Display name of the account key';
COMMENT ON COLUMN account_keys.description IS 'Optional detailed description';
COMMENT ON COLUMN account_keys.account_type IS 'Type of account posting: Revenue, Expense, Tax, Liability, Asset, or Discount';
COMMENT ON COLUMN account_keys.is_active IS 'Whether this account key is active and available for use';

-- Insert SAP standard account keys
INSERT INTO account_keys (code, name, description, account_type, is_active) VALUES
-- Revenue Keys
('ERL', 'Revenue', 'Sales revenue posting', 'Revenue', true),
('ERF', 'Revenue Final', 'Final revenue account posting', 'Revenue', true),
('ERS', 'Revenue Statistical', 'Statistical revenue (no GL posting)', 'Revenue', true),

-- Discount Keys
('DSC', 'Discount', 'Customer discount expense', 'Discount', true),
('BON', 'Bonus', 'Bonus discount given to customers', 'Discount', true),

-- Tax Keys
('MWS', 'Output Tax', 'Output VAT/Sales tax payable', 'Tax', true),
('VST', 'Input Tax', 'Input VAT/Purchase tax receivable', 'Tax', true),

-- Freight/Transport Keys
('FRC', 'Freight Revenue', 'Freight charges revenue', 'Revenue', true),
('FRE', 'Freight Expense', 'Freight cost expense', 'Expense', true),

-- Other
('SUR', 'Surcharge', 'Additional surcharges', 'Revenue', true),
('COF', 'Cost of Freight', 'Freight cost allocation', 'Expense', true)
ON CONFLICT (code) DO NOTHING;
