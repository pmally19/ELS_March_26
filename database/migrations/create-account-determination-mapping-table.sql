-- Create Account Determination Mapping table
CREATE TABLE IF NOT EXISTS account_determination_mapping (
  id SERIAL PRIMARY KEY,
  account_key_code VARCHAR(10) NOT NULL,
  business_scenario VARCHAR(100) NOT NULL,
  company_code VARCHAR(10) NOT NULL,
  gl_account_id INTEGER NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Unique constraint to prevent duplicate mappings
  CONSTRAINT uq_account_determination UNIQUE (account_key_code, business_scenario, company_code),
  
  -- Foreign key to account_keys table
  CONSTRAINT fk_account_key FOREIGN KEY (account_key_code) 
    REFERENCES account_keys(code) ON DELETE RESTRICT,
  
  -- Foreign key to gl_accounts table
  CONSTRAINT fk_gl_account FOREIGN KEY (gl_account_id) 
    REFERENCES gl_accounts(id) ON DELETE RESTRICT
);

-- Create indexes for performance
CREATE INDEX idx_account_det_mapping_key ON account_determination_mapping(account_key_code);
CREATE INDEX idx_account_det_mapping_scenario ON account_determination_mapping(business_scenario);
CREATE INDEX idx_account_det_mapping_company ON account_determination_mapping(company_code);
CREATE INDEX idx_account_det_mapping_gl_account ON account_determination_mapping(gl_account_id);
CREATE INDEX idx_account_det_mapping_active ON account_determination_mapping(is_active);

-- Add comments
COMMENT ON TABLE account_determination_mapping IS 'Maps account keys to GL accounts based on business scenarios and company codes';
COMMENT ON COLUMN account_determination_mapping.account_key_code IS 'Account key code (e.g., ERL, MWS, FRC) from account_keys table';
COMMENT ON COLUMN account_determination_mapping.business_scenario IS 'Business scenario (e.g., Domestic Sales, Export Sales, Returns)';
COMMENT ON COLUMN account_determination_mapping.company_code IS 'Company code for multi-company support';
COMMENT ON COLUMN account_determination_mapping.gl_account_id IS 'GL account ID from gl_accounts table';
COMMENT ON COLUMN account_determination_mapping.description IS 'Optional description explaining this mapping';
COMMENT ON COLUMN account_determination_mapping.is_active IS 'Whether this mapping is active';

-- Insert sample mappings (optional)
INSERT INTO account_determination_mapping (account_key_code, business_scenario, company_code, gl_account_id, description, is_active)
SELECT 
  'ERL',
  'Domestic Sales',
  c.company_code,
  gl.id,
  'Standard revenue posting for domestic sales',
  true
FROM 
  (SELECT company_code FROM companies LIMIT 1) c,
  (SELECT id FROM gl_accounts WHERE account_number LIKE '4%' LIMIT 1) gl
WHERE EXISTS (SELECT 1 FROM account_keys WHERE code = 'ERL')
  AND EXISTS (SELECT 1 FROM companies)
  AND EXISTS (SELECT 1 FROM gl_accounts WHERE account_number LIKE '4%')
ON CONFLICT (account_key_code, business_scenario, company_code) DO NOTHING;
