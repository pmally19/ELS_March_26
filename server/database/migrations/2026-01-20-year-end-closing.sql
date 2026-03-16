-- Year-End Closing Module Database Schema
-- Created: 2026-01-20
-- Purpose: Tables for receivable/payable confirmations, asset year-end closing, and fiscal year management

-- =====================================================
-- 1. FISCAL YEARS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS fiscal_years (
  id SERIAL PRIMARY KEY,
  fiscal_year VARCHAR(4) NOT NULL,
  company_code_id INTEGER REFERENCES company_codes(id),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'IN_CLOSING', 'CLOSED')),
  is_current BOOLEAN DEFAULT false,
  year_end_closing_started TIMESTAMP,
  year_end_closing_completed TIMESTAMP,
  year_end_closing_by INTEGER,
  posting_periods_open INTEGER DEFAULT 12,
  special_periods_open INTEGER DEFAULT 4,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(fiscal_year, company_code_id)
);

CREATE INDEX IF NOT EXISTS idx_fiscal_years_status ON fiscal_years(status);
CREATE INDEX IF NOT EXISTS idx_fiscal_years_current ON fiscal_years(is_current);
CREATE INDEX IF NOT EXISTS idx_fiscal_years_company ON fiscal_years(company_code_id);

COMMENT ON TABLE fiscal_years IS 'SAP-compliant fiscal year management (OB29/OB52)';

-- =====================================================
-- 2. BALANCE CONFIRMATIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS balance_confirmations (
  id SERIAL PRIMARY KEY,
  confirmation_type VARCHAR(10) NOT NULL CHECK (confirmation_type IN ('AR', 'AP')),
  fiscal_year VARCHAR(4) NOT NULL,
  company_code_id INTEGER REFERENCES company_codes(id),
  customer_id INTEGER REFERENCES erp_customers(id),
  vendor_id INTEGER REFERENCES vendors(id),
  
  -- Account Details
  account_number VARCHAR(20),
  account_name VARCHAR(100),
  
  -- Balance Details
  opening_balance DECIMAL(15,2) DEFAULT 0,
  debit_transactions DECIMAL(15,2) DEFAULT 0,
  credit_transactions DECIMAL(15,2) DEFAULT 0,
  closing_balance DECIMAL(15,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  
  -- Confirmation Status
  status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'LETTER_SENT', 'CONFIRMED', 'DISPUTED', 'RESOLVED')),
  confirmation_date DATE,
  confirmed_by_name VARCHAR(100),
  confirmed_by_email VARCHAR(100),
  
  -- Letter Management
  letter_generated BOOLEAN DEFAULT false,
  letter_sent_date DATE,
  letter_reference VARCHAR(50),
  reminder_sent_count INTEGER DEFAULT 0,
  last_reminder_date DATE,
  
  -- Dispute Handling
  is_disputed BOOLEAN DEFAULT false,
  dispute_date DATE,
  dispute_amount DECIMAL(15,2),
  dispute_reason TEXT,
  dispute_resolution_date DATE,
  resolution_notes TEXT,
  
  -- Audit Trail
  created_at TIMESTAMP DEFAULT NOW(),
  created_by INTEGER,
  updated_at TIMESTAMP DEFAULT NOW(),
  updated_by INTEGER,
  
  CONSTRAINT check_customer_or_vendor CHECK (
    (confirmation_type = 'AR' AND customer_id IS NOT NULL AND vendor_id IS NULL) OR
    (confirmation_type = 'AP' AND vendor_id IS NOT NULL AND customer_id IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_balance_confirmations_type ON balance_confirmations(confirmation_type);
CREATE INDEX IF NOT EXISTS idx_balance_confirmations_status ON balance_confirmations(status);
CREATE INDEX IF NOT EXISTS idx_balance_confirmations_fiscal_year ON balance_confirmations(fiscal_year);
CREATE INDEX IF NOT EXISTS idx_balance_confirmations_customer ON balance_confirmations(customer_id);
CREATE INDEX IF NOT EXISTS idx_balance_confirmations_vendor ON balance_confirmations(vendor_id);

COMMENT ON TABLE balance_confirmations IS 'Customer/Vendor balance confirmations (SAP F.18/F.19)';

-- =====================================================
-- 3. ASSET YEAR-END CLOSING TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS asset_year_end_closing (
  id SERIAL PRIMARY KEY,
  fiscal_year VARCHAR(4) NOT NULL,
  company_code_id INTEGER REFERENCES company_codes(id),
  
  -- Run Details
  run_date TIMESTAMP NOT NULL,
  run_by INTEGER,
  run_type VARCHAR(20) DEFAULT 'AUTOMATIC',
  status VARCHAR(20) DEFAULT 'IN_PROGRESS' CHECK (status IN ('IN_PROGRESS', 'COMPLETED', 'FAILED', 'CANCELLED')),
  
  -- Processing Statistics
  total_assets_processed INTEGER DEFAULT 0,
  assets_with_depreciation INTEGER DEFAULT 0,
  auc_assets_capitalized INTEGER DEFAULT 0,
  
  -- Financial Summary
  total_depreciation_posted DECIMAL(15,2) DEFAULT 0,
  total_auc_capitalized DECIMAL(15,2) DEFAULT 0,
  total_book_value DECIMAL(15,2) DEFAULT 0,
  
  -- Execution Details
  start_time TIMESTAMP,
  end_time TIMESTAMP,
  execution_duration_seconds INTEGER,
  errors_encountered INTEGER DEFAULT 0,
  error_log TEXT,
  
  -- Depreciation Run Details
  depreciation_area VARCHAR(10),
  depreciation_posted_to_gl BOOLEAN DEFAULT false,
  gl_posting_date DATE,
  gl_document_number VARCHAR(20),
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_asset_closing_fiscal_year ON asset_year_end_closing(fiscal_year);
CREATE INDEX IF NOT EXISTS idx_asset_closing_status ON asset_year_end_closing(status);
CREATE INDEX IF NOT EXISTS idx_asset_closing_company ON asset_year_end_closing(company_code_id);

COMMENT ON TABLE asset_year_end_closing IS 'Asset year-end depreciation runs (SAP AJAB)';

-- =====================================================
-- 4. FISCAL YEAR CHANGE LOG TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS fiscal_year_change_log (
  id SERIAL PRIMARY KEY,
  old_fiscal_year VARCHAR(4),
  new_fiscal_year VARCHAR(4) NOT NULL,
  company_code_id INTEGER REFERENCES company_codes(id),
  
  -- Change Details
  change_type VARCHAR(30) CHECK (change_type IN ('OPEN_NEW_YEAR', 'CLOSE_OLD_YEAR', 'ROLLOVER_BALANCES', 'PERIOD_CHANGE')),
  change_date TIMESTAMP NOT NULL,
  changed_by INTEGER,
  
  -- Pre-Validation
  pre_validation_run BOOLEAN DEFAULT true,
  validation_status VARCHAR(20) CHECK (validation_status IN ('PASSED', 'FAILED', 'WARNING')),
  validation_errors JSONB,
  validation_warnings JSONB,
  
  -- Balance Transfer Status
  gl_balances_transferred BOOLEAN DEFAULT false,
  ar_balances_transferred BOOLEAN DEFAULT false, 
  ap_balances_transferred BOOLEAN DEFAULT false,
  asset_balances_transferred BOOLEAN DEFAULT false,
  inventory_balances_transferred BOOLEAN DEFAULT false,
  
  -- Transfer Summary
  gl_accounts_transferred INTEGER DEFAULT 0,
  ar_customers_transferred INTEGER DEFAULT 0,
  ap_vendors_transferred INTEGER DEFAULT 0,
  total_balance_amount DECIMAL(15,2) DEFAULT 0,
  
  -- Posting Period Control
  old_year_periods_closed BOOLEAN DEFAULT false,
  new_year_periods_opened BOOLEAN DEFAULT false,
  special_periods_configured BOOLEAN DEFAULT false,
  
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fiscal_change_log_type ON fiscal_year_change_log(change_type);
CREATE INDEX IF NOT EXISTS idx_fiscal_change_log_year ON fiscal_year_change_log(new_fiscal_year);
CREATE INDEX IF NOT EXISTS idx_fiscal_change_log_company ON fiscal_year_change_log(company_code_id);

COMMENT ON TABLE fiscal_year_change_log IS 'Fiscal year change audit trail (SAP OB29)';

-- =====================================================
-- 5. INSERT SAMPLE DATA
-- =====================================================

-- Insert current fiscal year (2025)
INSERT INTO fiscal_years (fiscal_year, company_code_id, start_date, end_date, status, is_current, posting_periods_open, special_periods_open)
SELECT '2025', id, '2025-01-01', '2025-12-31', 'OPEN', true, 12, 4
FROM company_codes
WHERE active = true
LIMIT 1
ON CONFLICT (fiscal_year, company_code_id) DO NOTHING;

-- Insert next fiscal year (2026)
INSERT INTO fiscal_years (fiscal_year, company_code_id, start_date, end_date, status, is_current, posting_periods_open, special_periods_open)
SELECT '2026', id, '2026-01-01', '2026-12-31', 'OPEN', false, 0, 0
FROM company_codes
WHERE active = true
LIMIT 1
ON CONFLICT (fiscal_year, company_code_id) DO NOTHING;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Verify tables created
SELECT 
  'fiscal_years' as table_name, 
  COUNT(*) as record_count 
FROM fiscal_years
UNION ALL
SELECT 
  'balance_confirmations', 
  COUNT(*) 
FROM balance_confirmations
UNION ALL
SELECT 
  'asset_year_end_closing', 
  COUNT(*) 
FROM asset_year_end_closing
UNION ALL
SELECT 
  'fiscal_year_change_log', 
  COUNT(*) 
FROM fiscal_year_change_log;
