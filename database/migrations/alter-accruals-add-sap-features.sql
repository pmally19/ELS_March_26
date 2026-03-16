-- Add auto-reversal support to accrual_rules
ALTER TABLE accrual_rules ADD COLUMN IF NOT EXISTS requires_reversal BOOLEAN DEFAULT FALSE;
ALTER TABLE accrual_rules ADD COLUMN IF NOT EXISTS provision_type VARCHAR(20) DEFAULT 'accrual'; -- 'accrual' or 'provision'

-- Add accrual objects table for linear amortization (SAP-style)
CREATE TABLE IF NOT EXISTS accrual_objects (
  id SERIAL PRIMARY KEY,
  object_name VARCHAR(200) NOT NULL,
  description TEXT,
  accrual_rule_id INTEGER REFERENCES accrual_rules(id),
  total_amount NUMERIC(15,2) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  company_code_id INTEGER REFERENCES company_codes(id),
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'completed', 'cancelled'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_accrual_objects_rule ON accrual_objects(accrual_rule_id);
CREATE INDEX IF NOT EXISTS idx_accrual_objects_status ON accrual_objects(status);
CREATE INDEX IF NOT EXISTS idx_accrual_objects_dates ON accrual_objects(start_date, end_date);
