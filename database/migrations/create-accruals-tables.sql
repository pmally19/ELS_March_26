-- Accrual Management Tables
-- Created: 2026-02-03

-- Accrual Rules (defines how accruals are calculated)
CREATE TABLE IF NOT EXISTS accrual_rules (
  id SERIAL PRIMARY KEY,
  rule_name VARCHAR(100) UNIQUE NOT NULL,
  rule_description TEXT,
  accrual_type VARCHAR(20) NOT NULL, -- 'expense', 'revenue', 'payroll', 'interest'
  source_table VARCHAR(50), -- 'ap_invoices', 'deliveries', NULL for manual
  gl_expense_account_id INTEGER REFERENCES gl_accounts(id), -- Expense side
  gl_accrual_account_id INTEGER REFERENCES gl_accounts(id), -- Accrual liability side
  calculation_method VARCHAR(50) DEFAULT 'manual', -- 'unbilled_deliveries', 'unpaid_invoices', 'manual'
  company_code_id INTEGER REFERENCES company_codes(id),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Accrual Postings (actual accrual entries)
CREATE TABLE IF NOT EXISTS accrual_postings (
  id SERIAL PRIMARY KEY,
  accrual_rule_id INTEGER REFERENCES accrual_rules(id),
  fiscal_year INTEGER NOT NULL,
  fiscal_period INTEGER NOT NULL,
  fiscal_period_id INTEGER REFERENCES fiscal_periods(id),
  accrual_amount NUMERIC(15,2) NOT NULL,
  posting_date DATE NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'calculated', -- 'calculated', 'posted', 'reversed'
  journal_entry_id INTEGER REFERENCES journal_entries(id), -- Link to posted JE
  reversal_entry_id INTEGER REFERENCES journal_entries(id), -- Auto-reversal next period
  posted_at TIMESTAMPTZ,
  posted_by VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_accrual_postings_period ON accrual_postings(fiscal_year, fiscal_period);
CREATE INDEX IF NOT EXISTS idx_accrual_postings_status ON accrual_postings(status);
CREATE INDEX IF NOT EXISTS idx_accrual_rules_active ON accrual_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_accrual_rules_company ON accrual_rules(company_code_id);

-- Comments for documentation
COMMENT ON TABLE accrual_rules IS 'Defines rules for automatic accrual calculations';
COMMENT ON TABLE accrual_postings IS 'Stores calculated and posted accrual entries';
COMMENT ON COLUMN accrual_rules.calculation_method IS 'Method for calculating accruals: manual, unbilled_deliveries, unpaid_invoices';
COMMENT ON COLUMN accrual_postings.status IS 'Status of accrual: calculated, posted, reversed';
