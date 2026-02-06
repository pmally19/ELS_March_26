-- Add period_closing_documents table for tracking generated reports and documents
CREATE TABLE IF NOT EXISTS period_closing_documents (
  id SERIAL PRIMARY KEY,
  period_closing_id INTEGER REFERENCES period_end_closing(id) ON DELETE CASCADE,
  fiscal_period_id INTEGER REFERENCES fiscal_periods(id),
  company_code_id INTEGER,
  document_type VARCHAR(50) NOT NULL, -- 'checklist', 'summary', 'audit_trail', 'gl_balances'
  document_name VARCHAR(255) NOT NULL,
  document_data JSONB, -- Store document content as JSON
  generated_at TIMESTAMP DEFAULT NOW(),
  generated_by VARCHAR(100),
  status VARCHAR(20) DEFAULT 'final', -- 'draft', 'final'
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_period_closing_documents_closing_id ON period_closing_documents(period_closing_id);
CREATE INDEX IF NOT EXISTS idx_period_closing_documents_fiscal_period_id ON period_closing_documents(fiscal_period_id);
CREATE INDEX IF NOT EXISTS idx_period_closing_documents_type ON period_closing_documents(document_type);

-- Add daily_validation_runs table to track validation executions
CREATE TABLE IF NOT EXISTS daily_validation_runs (
  id SERIAL PRIMARY KEY,
  fiscal_period_id INTEGER REFERENCES fiscal_periods(id),
  company_code_id INTEGER,
  run_date TIMESTAMP DEFAULT NOW(),
  total_entries INTEGER DEFAULT 0,
  balanced_entries INTEGER DEFAULT 0,
  unbalanced_entries INTEGER DEFAULT 0,
  total_debits DECIMAL(15,2) DEFAULT 0,
  total_credits DECIMAL(15,2) DEFAULT 0,
  warnings_count INTEGER DEFAULT 0,
  errors_count INTEGER DEFAULT 0,
  validation_status VARCHAR(20), -- 'passed', 'failed', 'warnings'
  executed_by VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_daily_validation_runs_period_id ON daily_validation_runs(fiscal_period_id);
CREATE INDEX IF NOT EXISTS idx_daily_validation_runs_date ON daily_validation_runs(run_date);
