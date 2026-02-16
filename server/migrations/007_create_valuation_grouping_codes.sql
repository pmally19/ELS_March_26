-- Create Valuation Grouping Codes Master Data Table
-- Date: 2026-02-10

CREATE TABLE IF NOT EXISTS valuation_grouping_codes (
  id SERIAL PRIMARY KEY,
  code VARCHAR(10) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_valuation_grouping_codes_code ON valuation_grouping_codes(code);
CREATE INDEX IF NOT EXISTS idx_valuation_grouping_codes_active ON valuation_grouping_codes(is_active);

-- Add comment
COMMENT ON TABLE valuation_grouping_codes IS 'Master data for valuation grouping codes used to group materials for valuation purposes';
