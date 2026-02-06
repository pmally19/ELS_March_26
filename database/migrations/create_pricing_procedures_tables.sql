-- Create pricing_procedures table (Global - No Company Code)
CREATE TABLE IF NOT EXISTS pricing_procedures (
  id SERIAL PRIMARY KEY,
  procedure_code VARCHAR(10) NOT NULL UNIQUE, -- Unique globally
  procedure_name VARCHAR(100) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create pricing_procedure_steps table
CREATE TABLE IF NOT EXISTS pricing_procedure_steps (
  id SERIAL PRIMARY KEY,
  procedure_id INTEGER NOT NULL REFERENCES pricing_procedures(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL,
  condition_type_code VARCHAR(10) NOT NULL, -- Logical link to condition_types
  is_mandatory BOOLEAN DEFAULT false,
  calculation_base VARCHAR(20) DEFAULT 'net', -- 'gross', 'net', 'previous_step'
  account_key VARCHAR(10), -- Link to GL account determination
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(procedure_id, step_number)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_pricing_procedures_code ON pricing_procedures(procedure_code);
CREATE INDEX IF NOT EXISTS idx_pricing_steps_procedure ON pricing_procedure_steps(procedure_id);
