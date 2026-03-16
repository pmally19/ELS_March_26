-- Create fiscal_periods table
CREATE TABLE IF NOT EXISTS fiscal_periods (
  id SERIAL PRIMARY KEY,
  fiscal_year_variant_id INTEGER,
  period_number INTEGER NOT NULL,
  period_name VARCHAR(50) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  fiscal_year INTEGER NOT NULL,
  status VARCHAR(20) DEFAULT 'Open' CHECK (status IN ('Open', 'Closed', 'Locked')),
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT check_period_dates CHECK (start_date < end_date),
  CONSTRAINT check_period_number CHECK (period_number > 0)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_fiscal_periods_variant ON fiscal_periods(fiscal_year_variant_id);
CREATE INDEX IF NOT EXISTS idx_fiscal_periods_year ON fiscal_periods(fiscal_year);
CREATE INDEX IF NOT EXISTS idx_fiscal_periods_status ON fiscal_periods(status);
CREATE INDEX IF NOT EXISTS idx_fiscal_periods_dates ON fiscal_periods(start_date, end_date);
