-- Create controlling_area_company_assignments table
-- Links Company Codes to Controlling Areas (1:N)

CREATE TABLE IF NOT EXISTS controlling_area_company_assignments (
  id SERIAL PRIMARY KEY,
  controlling_area_id INTEGER NOT NULL REFERENCES management_control_areas(id) ON DELETE CASCADE,
  company_code_id INTEGER NOT NULL REFERENCES company_codes(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure a company code can only be assigned to ONE controlling area
  CONSTRAINT idx_unique_company_assignment UNIQUE (company_code_id),
  -- Prevent duplicate assignments (redundant due to above unique constraint but good for clarity)
  CONSTRAINT idx_unique_ca_company_pair UNIQUE (controlling_area_id, company_code_id)
);

COMMENT ON TABLE controlling_area_company_assignments IS 'Assignments of Company Codes to Management Control Areas';
