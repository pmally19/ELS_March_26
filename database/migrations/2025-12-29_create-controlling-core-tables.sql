-- =====================================================================
-- CONTROLLING MODULE - CORE TABLES MIGRATION
-- Date: 2025-12-29
-- Purpose: Create core controlling tables (cost centers, planning, actuals)
-- =====================================================================

-- DROP OLD TABLES (created by /initialize endpoint)
DROP TABLE IF EXISTS cost_center_actuals CASCADE;
DROP TABLE IF EXISTS cost_center_planning CASCADE;
DROP TABLE IF EXISTS profit_center_actuals CASCADE;
DROP TABLE IF EXISTS cost_centers CASCADE;
DROP TABLE IF EXISTS profit_centers CASCADE;
DROP TABLE IF EXISTS activity_types CASCADE;

-- =====================================================================
-- 1. COST CENTERS TABLE
-- =====================================================================
CREATE TABLE cost_centers (
  id SERIAL PRIMARY KEY,
  cost_center VARCHAR(20) UNIQUE NOT NULL,
  description VARCHAR(255) NOT NULL,
  cost_center_category VARCHAR(50) NOT NULL,
  hierarchy_area VARCHAR(100),
  company_code_id INTEGER REFERENCES company_codes(id),
  controlling_area VARCHAR(4) DEFAULT 'A000',
  responsible_person VARCHAR(100),
  valid_from DATE,
  valid_to DATE,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_cost_center_category CHECK (cost_center_category IN (
    'PRODUCTION', 'SALES', 'ADMINISTRATIVE', 'SERVICE', 'IT', 'HR', 
    'FINANCE', 'PURCHASING', 'LOGISTICS', 'MARKETING', 'R&D'
  ))
);

CREATE INDEX idx_cost_centers_category ON cost_centers(cost_center_category);
CREATE INDEX idx_cost_centers_company ON cost_centers(company_code_id);
CREATE INDEX idx_cost_centers_active ON cost_centers(active);

COMMENT ON TABLE cost_centers IS 'Cost center master data for cost accounting';
COMMENT ON COLUMN cost_centers.cost_center IS 'Unique cost center code';
COMMENT ON COLUMN cost_centers.cost_center_category IS 'Category: PRODUCTION, SALES, ADMINISTRATIVE, etc.';

-- =====================================================================
-- 2. ACTIVITY TYPES TABLE
-- =====================================================================
CREATE TABLE activity_types (
  id SERIAL PRIMARY KEY,
  activity_type VARCHAR(20) UNIQUE NOT NULL,
  description VARCHAR(255) NOT NULL,
  unit_of_measure VARCHAR(10) NOT NULL,
  category VARCHAR(50),
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_activity_uom CHECK (unit_of_measure IN (
    'HRS', 'MIN', 'CYCLES', 'UNITS', 'KWH', 'KG', 'M', 'M2', 'M3', 'EACH', 'KM'
  ))
);

CREATE INDEX idx_activity_types_active ON activity_types(active);

COMMENT ON TABLE activity_types IS 'Activity types for activity-based costing';
COMMENT ON COLUMN activity_types.unit_of_measure IS 'HRS=Hours, MIN=Minutes, CYCLES=Machine Cycles, etc.';

-- =====================================================================
-- 3. COST CENTER PLANNING TABLE
-- =====================================================================
CREATE TABLE cost_center_planning (
  id SERIAL PRIMARY KEY,
  cost_center VARCHAR(20) NOT NULL REFERENCES cost_centers(cost_center) ON DELETE CASCADE,
  fiscal_year INTEGER NOT NULL,
  period INTEGER NOT NULL,
  account VARCHAR(20) NOT NULL,
  activity_type VARCHAR(20) REFERENCES activity_types(activity_type),
  planned_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  planned_quantity NUMERIC(15,3) DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'USD',
  version INTEGER DEFAULT 1,
  planning_status VARCHAR(20) DEFAULT 'DRAFT',
  approved_by VARCHAR(100),
  approved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_fiscal_year CHECK (fiscal_year BETWEEN 2000 AND 2100),
  CONSTRAINT chk_period CHECK (period BETWEEN 1 AND 16),
  CONSTRAINT chk_planning_status CHECK (planning_status IN ('DRAFT', 'SUBMITTED', 'APPROVED', 'LOCKED')),
  UNIQUE(cost_center, fiscal_year, period, account, activity_type)
);

CREATE INDEX idx_planning_cost_center ON cost_center_planning(cost_center);
CREATE INDEX idx_planning_year_period ON cost_center_planning(fiscal_year, period);
CREATE INDEX idx_planning_account ON cost_center_planning(account);
CREATE INDEX idx_planning_status ON cost_center_planning(planning_status);

COMMENT ON TABLE cost_center_planning IS 'Cost center planning data (budgets)';

-- =====================================================================
-- 4. COST CENTER ACTUALS TABLE  
-- =====================================================================
CREATE TABLE cost_center_actuals (
  id SERIAL PRIMARY KEY,
  cost_center VARCHAR(20) NOT NULL REFERENCES cost_centers(cost_center) ON DELETE CASCADE,
  fiscal_year INTEGER NOT NULL,
  period INTEGER NOT NULL,
  posting_date DATE NOT NULL,
  account VARCHAR(20) NOT NULL,
  activity_type VARCHAR(20) REFERENCES activity_types(activity_type),
  actual_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  actual_quantity NUMERIC(15,3) DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'USD',
  document_number VARCHAR(50),
  reference VARCHAR(100),
  cost_element VARCHAR(20),
  posted_by VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_actuals_fiscal_year CHECK (fiscal_year BETWEEN 2000 AND 2100),
  CONSTRAINT chk_actuals_period CHECK (period BETWEEN 1 AND 16)
);

CREATE INDEX idx_actuals_cost_center ON cost_center_actuals(cost_center);
CREATE INDEX idx_actuals_year_period ON cost_center_actuals(fiscal_year, period);
CREATE INDEX idx_actuals_account ON cost_center_actuals(account);
CREATE INDEX idx_actuals_posting_date ON cost_center_actuals(posting_date);
CREATE INDEX idx_actuals_document ON cost_center_actuals(document_number);

COMMENT ON TABLE cost_center_actuals IS 'Actual costs posted to cost centers';
COMMENT ON COLUMN cost_center_actuals.document_number IS 'Related GL document or source document';
COMMENT ON COLUMN cost_center_actuals.cost_element IS 'Primary/secondary cost element classification';

-- =====================================================================
-- 5. PROFIT CENTERS TABLE (if not exists)
-- =====================================================================
CREATE TABLE profit_centers (
  id SERIAL PRIMARY KEY,
  profit_center VARCHAR(20) UNIQUE NOT NULL,
  description VARCHAR(255) NOT NULL,
  profit_center_group VARCHAR(50),
  company_code_id INTEGER REFERENCES company_codes(id),
  controlling_area VARCHAR(4) DEFAULT 'A000',
  segment VARCHAR(50),
  hierarchy_area VARCHAR(100),
  responsible_person VARCHAR(100),
  valid_from DATE,
  valid_to DATE,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_profit_centers_company ON profit_centers(company_code_id);
CREATE INDEX idx_profit_centers_active ON profit_centers(active);

COMMENT ON TABLE profit_centers IS 'Profit center master data for profitability analysis';

-- =====================================================================
-- 6. PROFIT CENTER ACTUALS TABLE
-- =====================================================================
CREATE TABLE profit_center_actuals (
  id SERIAL PRIMARY KEY,
  profit_center VARCHAR(20) NOT NULL REFERENCES profit_centers(profit_center) ON DELETE CASCADE,
  fiscal_year INTEGER NOT NULL,
  period INTEGER NOT NULL,
  posting_date DATE NOT NULL,
  revenue NUMERIC(15,2) DEFAULT 0,
  cogs NUMERIC(15,2) DEFAULT 0,
  operating_expenses NUMERIC(15,2) DEFAULT 0,
  other_income NUMERIC(15,2) DEFAULT 0,
  other_expenses NUMERIC(15,2) DEFAULT 0,
  customer_group VARCHAR(50),
  product_group VARCHAR(50),
  sales_organization VARCHAR(50),
  document_number VARCHAR(50),
  currency VARCHAR(3) DEFAULT 'USD',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_pc_actuals_fiscal_year CHECK (fiscal_year BETWEEN 2000 AND 2100),
  CONSTRAINT chk_pc_actuals_period CHECK (period BETWEEN 1 AND 16)
);

CREATE INDEX idx_pc_actuals_profit_center ON profit_center_actuals(profit_center);
CREATE INDEX idx_pc_actuals_year_period ON profit_center_actuals(fiscal_year, period);
CREATE INDEX idx_pc_actuals_customer_group ON profit_center_actuals(customer_group);
CREATE INDEX idx_pc_actuals_product_group ON profit_center_actuals(product_group);

COMMENT ON TABLE profit_center_actuals IS 'Actual profitability data by profit center';

-- =====================================================================
-- 7. INSERT SAMPLE ACTIVITY TYPES
-- =====================================================================
INSERT INTO activity_types (activity_type, description, unit_of_measure, category, active) VALUES
  ('MACH-HR', 'Machine Hours', 'HRS', 'PRODUCTION', true),
  ('LABOR-HR', 'Labor Hours', 'HRS', 'PRODUCTION', true),
  ('SETUP-HR', 'Setup Hours', 'HRS', 'PRODUCTION', true),
  ('QC-HR', 'Quality Control Hours', 'HRS', 'QUALITY', true),
  ('MAINT-HR', 'Maintenance Hours', 'HRS', 'MAINTENANCE', true),
  ('ENERGY', 'Energy Consumption', 'KWH', 'UTILITIES', true),
  ('TRANSPORT', 'Transportation', 'KM', 'LOGISTICS', true)
ON CONFLICT (activity_type) DO NOTHING;

-- =====================================================================
-- 8. INSERT SAMPLE COST CENTERS
-- =====================================================================
INSERT INTO cost_centers (cost_center, description, cost_center_category, hierarchy_area) VALUES
  ('CC-PROD-001', 'Production Line 1', 'PRODUCTION', 'Manufacturing'),
  ('CC-PROD-002', 'Production Line 2', 'PRODUCTION', 'Manufacturing'),
  ('CC-PROD-003', 'Assembly Department', 'PRODUCTION', 'Manufacturing'),
  ('CC-QC-001', 'Quality Control', 'PRODUCTION', 'Manufacturing'),
  ('CC-MAINT-001', 'Maintenance Workshop', 'SERVICE', 'Manufacturing'),
  ('CC-WHSE-001', 'Warehouse Operations', 'LOGISTICS', 'Operations'),
  ('CC-IT-001', 'IT Department', 'IT', 'Support'),
  ('CC-HR-001', 'Human Resources', 'HR', 'Admin'),
  ('CC-FIN-001', 'Finance Department', 'FINANCE', 'Admin'),
  ('CC-SALES-001', 'Sales & Marketing', 'SALES', 'Commercial'),
  ('CC-RD-001', 'Research & Development', 'R&D', 'Innovation'),
  ('CC-PURCH-001', 'Purchasing Department', 'PURCHASING', 'Operations')
ON CONFLICT (cost_center) DO NOTHING;

-- =====================================================================
-- 9. INSERT SAMPLE PROFIT CENTERS
-- =====================================================================
INSERT INTO profit_centers (profit_center, description, profit_center_group, segment) VALUES
  ('PC-MFG-001', 'Manufacturing Division', 'MANUFACTURING', 'Industrial'),
  ('PC-RETAIL-001', 'Retail Operations', 'SALES', 'Consumer'),
  ('PC-GOV-001', 'Government Contracts', 'SALES', 'Government'),
  ('PC-EXP-001', 'Export Division', 'SALES', 'International'),
  ('PC-SERV-001', 'Service Division', 'SERVICE', 'After Sales')
ON CONFLICT (profit_center) DO NOTHING;

-- =====================================================================
-- END OF MIGRATION
-- =====================================================================
