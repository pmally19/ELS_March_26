-- Migration: Create Retained Earnings Accounts table
-- Purpose: Accounts used to carry forward profit/loss from one fiscal year to another
-- Links company codes with GL accounts for year-end closing and profit/loss carry forward
-- No SAP terminology - uses generic business terms

CREATE TABLE IF NOT EXISTS retained_earnings_accounts (
  id SERIAL PRIMARY KEY,
  
  -- Company and Account Association
  company_code_id INTEGER NOT NULL REFERENCES company_codes(id) ON DELETE CASCADE,
  gl_account_id INTEGER NOT NULL REFERENCES gl_accounts(id) ON DELETE CASCADE,
  fiscal_year_variant_id INTEGER REFERENCES fiscal_year_variants(id) ON DELETE SET NULL,
  
  -- Account Configuration
  account_type VARCHAR(20) NOT NULL DEFAULT 'RETAINED_EARNINGS' CHECK (account_type IN ('RETAINED_EARNINGS', 'PROFIT_CARRY_FORWARD', 'LOSS_CARRY_FORWARD')),
  description TEXT, -- Description of the account purpose
  
  -- Carry Forward Settings
  carry_forward_profit BOOLEAN NOT NULL DEFAULT TRUE, -- Carry forward profit to this account
  carry_forward_loss BOOLEAN NOT NULL DEFAULT TRUE, -- Carry forward loss to this account
  automatic_carry_forward BOOLEAN NOT NULL DEFAULT FALSE, -- Automatically carry forward at year-end
  
  -- Year-End Closing Settings
  use_for_year_end_closing BOOLEAN NOT NULL DEFAULT TRUE, -- Use this account for year-end closing
  closing_account_type VARCHAR(20) CHECK (closing_account_type IN ('PROFIT', 'LOSS', 'BOTH')), -- Type of closing
  
  -- Status and Metadata
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by INTEGER,
  updated_by INTEGER,
  
  -- Unique constraint: one retained earnings account per company code and account type combination
  CONSTRAINT unique_company_account_type UNIQUE (company_code_id, account_type)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_retained_earnings_accounts_company ON retained_earnings_accounts(company_code_id);
CREATE INDEX IF NOT EXISTS idx_retained_earnings_accounts_gl_account ON retained_earnings_accounts(gl_account_id);
CREATE INDEX IF NOT EXISTS idx_retained_earnings_accounts_type ON retained_earnings_accounts(account_type);
CREATE INDEX IF NOT EXISTS idx_retained_earnings_accounts_active ON retained_earnings_accounts(is_active);

-- Add comment
COMMENT ON TABLE retained_earnings_accounts IS 'Accounts used to carry forward profit/loss from one fiscal year to another, linked to company codes and GL accounts';

-- Note: No default data inserted - all retained earnings accounts must be configured by users

