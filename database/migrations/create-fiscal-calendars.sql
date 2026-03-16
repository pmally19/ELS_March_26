-- Create fiscal_calendars table
CREATE TABLE IF NOT EXISTS fiscal_calendars (
  id SERIAL PRIMARY KEY,
  calendar_id VARCHAR(20) NOT NULL UNIQUE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  number_of_periods INTEGER NOT NULL DEFAULT 12,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT check_date_range CHECK (start_date < end_date),
  CONSTRAINT check_periods CHECK (number_of_periods BETWEEN 1 AND 52)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_fiscal_calendars_calendar_id ON fiscal_calendars(calendar_id);
CREATE INDEX IF NOT EXISTS idx_fiscal_calendars_active ON fiscal_calendars(active);
CREATE INDEX IF NOT EXISTS idx_fiscal_calendars_dates ON fiscal_calendars(start_date, end_date);
