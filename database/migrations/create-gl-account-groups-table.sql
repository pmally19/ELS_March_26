-- Migration: Create GL Account Groups table
-- Purpose: Classification system for General Ledger accounts
-- Removes all SAP terminology, uses generic business terms

CREATE TABLE IF NOT EXISTS gl_account_groups (
  id SERIAL PRIMARY KEY,
  
  -- Basic Information
  code VARCHAR(10) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  
  -- Account Classification
  account_category VARCHAR(20) NOT NULL, -- ASSETS, LIABILITIES, EQUITY, REVENUE, EXPENSES
  account_subcategory VARCHAR(50), -- Current Assets, Fixed Assets, etc.
  
  -- Number Assignment Rules
  account_number_pattern VARCHAR(50), -- Pattern for account numbers
  account_number_min_length INTEGER DEFAULT 4,
  account_number_max_length INTEGER DEFAULT 10,
  number_range_start VARCHAR(20),
  number_range_end VARCHAR(20),
  
  -- Field Control Settings
  field_control_group VARCHAR(10), -- Controls which fields are required/optional/hidden
  account_name_required BOOLEAN DEFAULT TRUE,
  description_required BOOLEAN DEFAULT FALSE,
  currency_required BOOLEAN DEFAULT TRUE,
  tax_settings_required BOOLEAN DEFAULT FALSE,
  
  -- Account Behavior Settings
  allow_posting BOOLEAN DEFAULT TRUE,
  requires_reconciliation BOOLEAN DEFAULT FALSE,
  allow_cash_posting BOOLEAN DEFAULT FALSE,
  requires_cost_center BOOLEAN DEFAULT FALSE,
  requires_profit_center BOOLEAN DEFAULT FALSE,
  
  -- Display and Layout
  display_layout VARCHAR(10), -- Controls screen layout
  sort_order INTEGER DEFAULT 0,
  
  -- Status and Metadata
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_gl_account_groups_code ON gl_account_groups(code);
CREATE INDEX IF NOT EXISTS idx_gl_account_groups_category ON gl_account_groups(account_category);
CREATE INDEX IF NOT EXISTS idx_gl_account_groups_active ON gl_account_groups(is_active);

-- Add foreign key to gl_accounts if the column exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'gl_accounts' AND column_name = 'gl_account_group_id'
  ) THEN
    ALTER TABLE gl_accounts
    ADD CONSTRAINT fk_gl_accounts_account_group
    FOREIGN KEY (gl_account_group_id) REFERENCES gl_account_groups(id)
    ON DELETE SET NULL;
  END IF;
END $$;

-- Add comment
COMMENT ON TABLE gl_account_groups IS 'Classification system for General Ledger accounts that controls account creation rules, number assignments, and field requirements';

-- Insert default GL Account Groups
INSERT INTO gl_account_groups (
  code, name, description, account_category, account_subcategory,
  account_number_min_length, account_number_max_length,
  number_range_start, number_range_end,
  account_name_required, currency_required, allow_posting,
  is_active
) VALUES 
  ('GL-ASSET', 'Asset Accounts', 'General ledger accounts for assets', 'ASSETS', 'General Assets', 4, 10, '1000', '1999', TRUE, TRUE, TRUE, TRUE),
  ('GL-LIAB', 'Liability Accounts', 'General ledger accounts for liabilities', 'LIABILITIES', 'General Liabilities', 4, 10, '2000', '2999', TRUE, TRUE, TRUE, TRUE),
  ('GL-EQUITY', 'Equity Accounts', 'General ledger accounts for equity', 'EQUITY', 'General Equity', 4, 10, '3000', '3999', TRUE, TRUE, TRUE, TRUE),
  ('GL-REVENUE', 'Revenue Accounts', 'General ledger accounts for revenue', 'REVENUE', 'General Revenue', 4, 10, '4000', '4999', TRUE, TRUE, TRUE, TRUE),
  ('GL-EXPENSE', 'Expense Accounts', 'General ledger accounts for expenses', 'EXPENSES', 'General Expenses', 4, 10, '5000', '6999', TRUE, TRUE, TRUE, TRUE)
ON CONFLICT (code) DO NOTHING;

