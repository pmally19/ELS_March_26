-- ============================================================================
-- Credit Management Tables - Missing Tables Fix
-- Created: 2026-01-08
-- Purpose: Create missing tables for credit management functionality
-- ============================================================================

-- Table 1: dunning_notices
-- Purpose: Track dunning (payment reminder) notices sent to customers
CREATE TABLE IF NOT EXISTS dunning_notices (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  dunning_level INTEGER NOT NULL DEFAULT 1, -- 1=First reminder, 2=Second, 3=Final
  notice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  total_overdue_amount NUMERIC(15,2) NOT NULL DEFAULT 0.00,
  interest_amount NUMERIC(15,2) DEFAULT 0.00,
  dunning_fee NUMERIC(15,2) DEFAULT 0.00,
  total_amount NUMERIC(15,2) NOT NULL DEFAULT 0.00,
  status VARCHAR(20) NOT NULL DEFAULT 'sent', -- sent, acknowledged, paid, escalated
  sent_via VARCHAR(50), -- email, mail, fax
  sent_to VARCHAR(255), -- email address or contact info
  sent_by INTEGER, -- user who sent the notice
  acknowledged_at TIMESTAMP,
  paid_at TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_dunning_customer ON dunning_notices(customer_id);
CREATE INDEX idx_dunning_status ON dunning_notices(status);
CREATE INDEX idx_dunning_date ON dunning_notices(notice_date DESC);

COMMENT ON TABLE dunning_notices IS 'Tracks payment reminder notices sent to customers for overdue invoices';

-- Table 2: cash_applications
-- Purpose: Track cash application (payment allocation) to invoices
CREATE TABLE IF NOT EXISTS cash_applications (
  id SERIAL PRIMARY KEY,
  payment_id INTEGER, -- Reference to customer_payments or bank_transactions
  payment_number VARCHAR(50),
  payment_date DATE NOT NULL,
  payment_amount NUMERIC(15,2) NOT NULL,
  
  -- Application details
  invoice_id INTEGER, -- Reference to AR invoice
  invoice_number VARCHAR(50),
  applied_amount NUMERIC(15,2) NOT NULL DEFAULT 0.00,
  discount_amount NUMERIC(15,2) DEFAULT 0.00,
  writeoff_amount NUMERIC(15,2) DEFAULT 0.00,
  
  -- Status
  application_status VARCHAR(20) NOT NULL DEFAULT 'unmatched', -- unmatched, matched, applied, reversed
  match_type VARCHAR(20), -- automatic, manual, partial
  matched_by INTEGER, -- user who matched
  matched_at TIMESTAMP,
  
  -- Financial details
  customer_id INTEGER REFERENCES customers(id),
  company_code_id INTEGER,
  currency_code VARCHAR(3) DEFAULT 'USD',
  
  -- GL posting
  gl_document_number VARCHAR(50),
  posted_to_gl BOOLEAN DEFAULT false,
  posting_date DATE,
  
  -- Metadata
  notes TEXT,
  reversal_reason TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by INTEGER,
  updated_by INTEGER
);

CREATE INDEX idx_cash_app_payment ON cash_applications(payment_id);
CREATE INDEX idx_cash_app_invoice ON cash_applications(invoice_id);
CREATE INDEX idx_cash_app_status ON cash_applications(application_status);
CREATE INDEX idx_cash_app_customer ON cash_applications(customer_id);
CREATE INDEX idx_cash_app_date ON cash_applications(payment_date DESC);

COMMENT ON TABLE cash_applications IS 'Tracks allocation of customer payments to invoices';

-- Table 3: dunning_runs
-- Purpose: Track batch dunning process runs
CREATE TABLE IF NOT EXISTS dunning_runs (
  id SERIAL PRIMARY KEY,
  run_date DATE NOT NULL DEFAULT CURRENT_DATE,
  run_type VARCHAR(20) DEFAULT 'automatic', -- automatic, manual
  company_code_id INTEGER,
  
  -- Selection criteria
  customer_group VARCHAR(50),
  dunning_level INTEGER,
  min_overdue_days INTEGER,
  min_overdue_amount NUMERIC(15,2),
  
  -- Results
  customers_processed INTEGER DEFAULT 0,
  notices_created INTEGER DEFAULT 0,
  total_dunned_amount NUMERIC(15,2) DEFAULT 0.00,
  
  -- Status
  status VARCHAR(20) DEFAULT 'in_progress', -- in_progress, completed, failed
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  
  -- Details
  error_message TEXT,
  run_by INTEGER,
  notes TEXT,
  
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_dunning_runs_date ON dunning_runs(run_date DESC);
CREATE INDEX idx_dunning_runs_status ON dunning_runs(status);

COMMENT ON TABLE dunning_runs IS 'Tracks batch dunning process executions';

-- Table 4: credit_limits
-- Purpose: Track customer credit limits and exposure
CREATE TABLE IF NOT EXISTS credit_limits (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  company_code_id INTEGER,
  
  -- Credit limit
  credit_limit NUMERIC(15,2) NOT NULL DEFAULT 0.00,
  currency_code VARCHAR(3) DEFAULT 'USD',
  
  -- Exposure tracking
  current_receivables NUMERIC(15,2) DEFAULT 0.00,
  current_orders NUMERIC(15,2) DEFAULT 0.00,
  current_deliveries NUMERIC(15,2) DEFAULT 0.00,
  total_exposure NUMERIC(15,2) DEFAULT 0.00,
  available_credit NUMERIC(15,2) DEFAULT 0.00,
  
  -- Credit check settings
  credit_check_enabled BOOLEAN DEFAULT true,
  block_on_limit_exceeded BOOLEAN DEFAULT true,
  warning_percentage NUMERIC(5,2) DEFAULT 90.00, -- Warn at 90% of limit
  
  -- Status
  status VARCHAR(20) DEFAULT 'active', -- active, suspended, blocked
  blocked_reason TEXT,
  
  -- Dates
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE,
  last_reviewed_date DATE,
  next_review_date DATE,
  
  -- Metadata
  reviewed_by INTEGER,
  approved_by INTEGER,
  notes TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by INTEGER,
  updated_by INTEGER
);

CREATE INDEX idx_credit_limits_customer ON credit_limits(customer_id);
CREATE INDEX idx_credit_limits_company ON credit_limits(company_code_id);
CREATE INDEX idx_credit_limits_status ON credit_limits(status);

COMMENT ON TABLE credit_limits IS 'Customer credit limits and exposure tracking';

-- Table 5: payment_terms
-- (Check if exists, if not create)
CREATE TABLE IF NOT EXISTS payment_terms (
  id SERIAL PRIMARY KEY,
  code VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  
  -- Terms details
  net_days INTEGER NOT NULL DEFAULT 30, -- Net payment due in X days
  discount_1_days INTEGER, -- First discount period
  discount_1_percent NUMERIC(5,2), -- First discount percentage
  discount_2_days INTEGER, -- Second discount period
  discount_2_percent NUMERIC(5,2), -- Second discount percentage
  
  -- Baseline date
  baseline_date VARCHAR(20) DEFAULT 'invoice_date', -- invoice_date, delivery_date, end_of_month
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_payment_terms_code ON payment_terms(code);

COMMENT ON TABLE payment_terms IS 'Payment term definitions for customers and vendors';

-- Insert default payment terms if table is empty
INSERT INTO payment_terms (code, name, net_days, description)
SELECT 'NET30', 'Net 30 Days', 30, 'Payment due in 30 days'
WHERE NOT EXISTS (SELECT 1 FROM payment_terms WHERE code = 'NET30');

INSERT INTO payment_terms (code, name, net_days, discount_1_days, discount_1_percent, description)
SELECT '2/10NET30', '2% 10 Days Net 30', 30, 10, 2.00, '2% discount if paid within 10 days, net due in 30 days'
WHERE NOT EXISTS (SELECT 1 FROM payment_terms WHERE code = '2/10NET30');

INSERT INTO payment_terms (code, name, net_days, description)
SELECT 'NET60', 'Net 60 Days', 60, 'Payment due in 60 days'
WHERE NOT EXISTS (SELECT 1 FROM payment_terms WHERE code = 'NET60');

-- Verification queries
SELECT 'dunning_notices' as table_name, COUNT(*) as row_count FROM dunning_notices
UNION ALL
SELECT 'cash_applications', COUNT(*) FROM cash_applications
UNION ALL
SELECT 'dunning_runs', COUNT(*) FROM dunning_runs
UNION ALL
SELECT 'credit_limits', COUNT(*) FROM credit_limits
UNION ALL
SELECT 'payment_terms', COUNT(*) FROM payment_terms;

-- List all created tables
SELECT table_name, 
       pg_size_pretty(pg_total_relation_size(quote_ident(table_name)::regclass)) as size
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('dunning_notices', 'cash_applications', 'dunning_runs', 'credit_limits', 'payment_terms')
ORDER BY table_name;

COMMIT;

-- Success message
SELECT '✅ Credit Management tables created successfully!' as status;
