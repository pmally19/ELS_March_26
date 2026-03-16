-- Migration: Create Material Account Determination (OBYC) Table
-- Description: Configure automatic GL account determination for material valuation
-- SAP Transaction: OBYC

CREATE TABLE IF NOT EXISTS material_account_determination (
  id SERIAL PRIMARY KEY,
  
  -- Determination Keys
  chart_of_accounts_id INTEGER NOT NULL,
  valuation_grouping_code_id INTEGER NOT NULL,
  valuation_class_id INTEGER NOT NULL,
  transaction_key_id INTEGER NOT NULL,
  account_category_reference_id INTEGER,
  
  -- GL Account for this determination
  gl_account_id INTEGER NOT NULL,
  
  -- Metadata
  description TEXT,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
  created_by INTEGER,
  updated_by INTEGER,
  
  -- Unique constraint: One configuration per combination
  CONSTRAINT uq_material_account_det UNIQUE (
    chart_of_accounts_id, 
    valuation_grouping_code_id, 
    valuation_class_id,
    transaction_key_id,
    account_category_reference_id
  ),
  
  -- Foreign Keys
  CONSTRAINT fk_chart_of_accounts
    FOREIGN KEY (chart_of_accounts_id) 
    REFERENCES chart_of_accounts(id) 
    ON DELETE RESTRICT,
    
  CONSTRAINT fk_valuation_grouping_code
    FOREIGN KEY (valuation_grouping_code_id) 
    REFERENCES valuation_grouping_codes(id) 
    ON DELETE RESTRICT,
    
  CONSTRAINT fk_valuation_class
    FOREIGN KEY (valuation_class_id) 
    REFERENCES valuation_classes(id) 
    ON DELETE RESTRICT,
    
  CONSTRAINT fk_transaction_key
    FOREIGN KEY (transaction_key_id) 
    REFERENCES transaction_keys(id) 
    ON DELETE RESTRICT,
    
  CONSTRAINT fk_account_category_ref 
    FOREIGN KEY (account_category_reference_id) 
    REFERENCES account_category_references(id) 
    ON DELETE SET NULL,
    
  CONSTRAINT fk_gl_account 
    FOREIGN KEY (gl_account_id) 
    REFERENCES gl_accounts(id) 
    ON DELETE RESTRICT
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_mat_acct_det_coa ON material_account_determination(chart_of_accounts_id);
CREATE INDEX IF NOT EXISTS idx_mat_acct_det_val_group ON material_account_determination(valuation_grouping_code_id);
CREATE INDEX IF NOT EXISTS idx_mat_acct_det_val_class ON material_account_determination(valuation_class_id);
CREATE INDEX IF NOT EXISTS idx_mat_acct_det_tx_key ON material_account_determination(transaction_key_id);
CREATE INDEX IF NOT EXISTS idx_mat_acct_det_active ON material_account_determination(is_active);
CREATE INDEX IF NOT EXISTS idx_mat_acct_det_gl_account ON material_account_determination(gl_account_id);

-- Add table and column comments
COMMENT ON TABLE material_account_determination IS 'Material Account Determination (OBYC) - Automatic GL account determination for material valuation and inventory transactions';
COMMENT ON COLUMN material_account_determination.chart_of_accounts_id IS 'Chart of Accounts ID (filters GL accounts)';
COMMENT ON COLUMN material_account_determination.valuation_grouping_code_id IS 'Valuation Grouping Code from Plant (groups materials for valuation)';
COMMENT ON COLUMN material_account_determination.valuation_class_id IS 'Valuation Class from Material (determines valuation method)';
COMMENT ON COLUMN material_account_determination.transaction_key_id IS 'Transaction Key (BSX, BSA, GBB, etc.) determines which account type';
COMMENT ON COLUMN material_account_determination.account_category_reference_id IS 'Account Category Reference (optional additional grouping)';
COMMENT ON COLUMN material_account_determination.gl_account_id IS 'GL Account to be used for this determination combination';
