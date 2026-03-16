-- Create pricing_procedure_determinations table
CREATE TABLE IF NOT EXISTS pricing_procedure_determinations (
  id SERIAL PRIMARY KEY,
  sales_organization_id INTEGER NOT NULL REFERENCES sales_organizations(id),
  distribution_channel_id INTEGER NOT NULL REFERENCES distribution_channels(id),
  division_id INTEGER NOT NULL REFERENCES divisions(id),
  customer_pricing_procedure_id INTEGER NOT NULL REFERENCES customer_pricing_procedures(id),
  document_pricing_procedure_id INTEGER NOT NULL REFERENCES document_pricing_procedures(id),
  pricing_procedure_id INTEGER NOT NULL REFERENCES pricing_procedures(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Prevent duplicate rules for the same combination
  UNIQUE(sales_organization_id, distribution_channel_id, division_id, customer_pricing_procedure_id, document_pricing_procedure_id)
);

-- Create indexes for performance (searching by context)
CREATE INDEX IF NOT EXISTS idx_pp_det_sales_area ON pricing_procedure_determinations(sales_organization_id, distribution_channel_id, division_id);
CREATE INDEX IF NOT EXISTS idx_pp_det_cust_doc ON pricing_procedure_determinations(customer_pricing_procedure_id, document_pricing_procedure_id);
