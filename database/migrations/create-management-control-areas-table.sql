-- Create management_control_areas table
CREATE TABLE IF NOT EXISTS management_control_areas (
    id SERIAL PRIMARY KEY,
    area_code VARCHAR(10) NOT NULL UNIQUE,
    area_name VARCHAR(100) NOT NULL,
    description TEXT,
    operating_concern_code VARCHAR(10),
    person_responsible VARCHAR(100),
    company_code_id INTEGER,
    currency_code VARCHAR(3),
    fiscal_year_variant_id INTEGER,
    chart_of_accounts_id INTEGER,
    cost_center_hierarchy_code VARCHAR(20),
    profit_center_hierarchy_code VARCHAR(20),
    activity_type_version VARCHAR(10),
    costing_version VARCHAR(10),
    price_calculation_enabled BOOLEAN DEFAULT true,
    actual_costing_enabled BOOLEAN DEFAULT true,
    plan_costing_enabled BOOLEAN DEFAULT true,
    variance_calculation_enabled BOOLEAN DEFAULT true,
    settlement_method VARCHAR(20) DEFAULT 'full',
    allocation_cycle_posting_enabled BOOLEAN DEFAULT false,
    profit_center_accounting_enabled BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,
    updated_by INTEGER,
    CONSTRAINT fk_company_code FOREIGN KEY (company_code_id) REFERENCES company_codes(id),
    CONSTRAINT fk_fiscal_year_variant FOREIGN KEY (fiscal_year_variant_id) REFERENCES fiscal_year_variants(id),
    CONSTRAINT fk_chart_of_accounts FOREIGN KEY (chart_of_accounts_id) REFERENCES chart_of_accounts(id)
);

-- Create index on area_code for faster lookups
CREATE INDEX IF NOT EXISTS idx_management_control_areas_code ON management_control_areas(area_code);

-- Create index on company_code_id
CREATE INDEX IF NOT EXISTS idx_management_control_areas_company_code ON management_control_areas(company_code_id);

COMMENT ON TABLE management_control_areas IS 'Management control areas for cost accounting and profitability analysis';
COMMENT ON COLUMN management_control_areas.area_code IS 'Unique identifier for the control area';
COMMENT ON COLUMN management_control_areas.settlement_method IS 'Settlement method: full, delta, or statistical';
