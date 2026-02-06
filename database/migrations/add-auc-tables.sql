-- =====================================================
-- AUC (Asset Under Construction) Database Migration
-- =====================================================
-- This script adds AUC functionality to the existing
-- asset management system
-- =====================================================

-- Step 1: Add AUC-specific columns to asset_master table
ALTER TABLE asset_master 
  ADD COLUMN IF NOT EXISTS is_auc BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS auc_status VARCHAR(50),
  ADD COLUMN IF NOT EXISTS construction_start_date DATE,
  ADD COLUMN IF NOT EXISTS planned_capitalization_date DATE,
  ADD COLUMN IF NOT EXISTS actual_capitalization_date DATE,
  ADD COLUMN IF NOT EXISTS wip_account_code VARCHAR(50),
  ADD COLUMN IF NOT EXISTS settlement_profile VARCHAR(50),
  ADD COLUMN IF NOT EXISTS parent_asset_id INTEGER REFERENCES asset_master(id);

-- Add comments for documentation
COMMENT ON COLUMN asset_master.is_auc IS 'Indicates if this is an Asset Under Construction';
COMMENT ON COLUMN asset_master.auc_status IS 'AUC status: in_construction, capitalized, abandoned';
COMMENT ON COLUMN asset_master.construction_start_date IS 'Date construction/development started';
COMMENT ON COLUMN asset_master.planned_capitalization_date IS 'Planned date for capitalization';
COMMENT ON COLUMN asset_master.actual_capitalization_date IS 'Actual date when AUC was capitalized';
COMMENT ON COLUMN asset_master.wip_account_code IS 'GL account code for WIP (Work in Progress)';
COMMENT ON COLUMN asset_master.settlement_profile IS 'Settlement profile code determining how costs are settled';
COMMENT ON COLUMN asset_master.parent_asset_id IS 'Reference to final fixed asset after capitalization';

-- Create index for AUC queries
CREATE INDEX IF NOT EXISTS idx_asset_master_is_auc ON asset_master(is_auc);
CREATE INDEX IF NOT EXISTS idx_asset_master_auc_status ON asset_master(auc_status);
CREATE INDEX IF NOT EXISTS idx_asset_master_parent_asset ON asset_master(parent_asset_id);

-- Step 2: Create auc_cost_tracking table
CREATE TABLE IF NOT EXISTS auc_cost_tracking (
  id SERIAL PRIMARY KEY,
  auc_asset_id INTEGER NOT NULL REFERENCES asset_master(id) ON DELETE CASCADE,
  posting_date DATE NOT NULL,
  document_number VARCHAR(50),
  cost_element VARCHAR(50),
  description TEXT,
  amount NUMERIC(18,2) NOT NULL,
  currency_code VARCHAR(3) DEFAULT 'USD',
  gl_account_code VARCHAR(50),
  cost_center_id INTEGER REFERENCES cost_centers(id),
  purchase_order_id INTEGER,
  goods_receipt_id INTEGER,
  invoice_id INTEGER,
  is_settled BOOLEAN DEFAULT false,
  settlement_date DATE,
  settlement_document VARCHAR(50),
  settlement_asset_id INTEGER REFERENCES asset_master(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR(100),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by VARCHAR(100)
);

-- Add comments
COMMENT ON TABLE auc_cost_tracking IS 'Tracks all costs accumulated for Assets Under Construction';
COMMENT ON COLUMN auc_cost_tracking.cost_element IS 'Type of cost: Material, Labor, Overhead, Equipment, etc.';
COMMENT ON COLUMN auc_cost_tracking.is_settled IS 'Whether this cost has been settled to a fixed asset';
COMMENT ON COLUMN auc_cost_tracking.settlement_asset_id IS 'Asset to which this cost was settled';

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_auc_cost_tracking_asset ON auc_cost_tracking(auc_asset_id);
CREATE INDEX IF NOT EXISTS idx_auc_cost_tracking_settled ON auc_cost_tracking(is_settled);
CREATE INDEX IF NOT EXISTS idx_auc_cost_tracking_posting_date ON auc_cost_tracking(posting_date);
CREATE INDEX IF NOT EXISTS idx_auc_cost_tracking_cost_center ON auc_cost_tracking(cost_center_id);

-- Step 3: Create auc_settlement_rules table
CREATE TABLE IF NOT EXISTS auc_settlement_rules (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  settlement_type VARCHAR(50) NOT NULL,
  settlement_receiver VARCHAR(50) NOT NULL,
  default_asset_class_id INTEGER REFERENCES asset_classes(id),
  percentage NUMERIC(5,2),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR(100),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by VARCHAR(100)
);

-- Add comments
COMMENT ON TABLE auc_settlement_rules IS 'Defines rules for settling AUC costs to fixed assets';
COMMENT ON COLUMN auc_settlement_rules.settlement_type IS 'Type: full, partial, percentage';
COMMENT ON COLUMN auc_settlement_rules.settlement_receiver IS 'Receiver: fixed_asset, cost_center, project';
COMMENT ON COLUMN auc_settlement_rules.percentage IS 'Percentage for partial settlements';

-- Create index
CREATE INDEX IF NOT EXISTS idx_auc_settlement_rules_code ON auc_settlement_rules(code);
CREATE INDEX IF NOT EXISTS idx_auc_settlement_rules_active ON auc_settlement_rules(is_active);

-- Step 4: Insert default settlement rules
INSERT INTO auc_settlement_rules (code, name, description, settlement_type, settlement_receiver, is_active)
VALUES 
  ('FULL_CAP', 'Full Capitalization', 'Settle all AUC costs to a fixed asset', 'full', 'fixed_asset', true),
  ('PARTIAL_CC', 'Partial to Cost Center', 'Settle partial costs to cost center', 'partial', 'cost_center', true),
  ('PERCENTAGE', 'Percentage Settlement', 'Settle by percentage to multiple receivers', 'percentage', 'fixed_asset', true)
ON CONFLICT (code) DO NOTHING;

-- Step 5: Create trigger for updated_at timestamps
CREATE OR REPLACE FUNCTION update_auc_cost_tracking_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auc_cost_tracking_updated_at
  BEFORE UPDATE ON auc_cost_tracking
  FOR EACH ROW
  EXECUTE FUNCTION update_auc_cost_tracking_timestamp();

CREATE TRIGGER trigger_auc_settlement_rules_updated_at
  BEFORE UPDATE ON auc_settlement_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_auc_cost_tracking_timestamp();

-- Step 6: Create view for AUC summary
CREATE OR REPLACE VIEW v_auc_summary AS
SELECT 
  am.id,
  am.asset_number,
  am.name,
  am.description,
  am.auc_status,
  am.construction_start_date,
  am.planned_capitalization_date,
  am.actual_capitalization_date,
  am.settlement_profile,
  am.company_code_id,
  am.cost_center_id,
  am.parent_asset_id,
  COUNT(act.id) as total_cost_entries,
  SUM(CASE WHEN act.is_settled = false THEN act.amount ELSE 0 END) as unsettled_costs,
  SUM(CASE WHEN act.is_settled = true THEN act.amount ELSE 0 END) as settled_costs,
  SUM(act.amount) as total_accumulated_costs,
  MAX(act.posting_date) as last_cost_date,
  am.created_at,
  am.updated_at
FROM asset_master am
LEFT JOIN auc_cost_tracking act ON am.id = act.auc_asset_id
WHERE am.is_auc = true
GROUP BY am.id, am.asset_number, am.name, am.description, am.auc_status,
         am.construction_start_date, am.planned_capitalization_date,
         am.actual_capitalization_date, am.settlement_profile,
         am.company_code_id, am.cost_center_id, am.parent_asset_id,
         am.created_at, am.updated_at;

COMMENT ON VIEW v_auc_summary IS 'Summary view of all AUCs with their accumulated costs';

-- Step 7: Grant permissions (adjust as needed for your setup)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON auc_cost_tracking TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON auc_settlement_rules TO your_app_user;
-- GRANT SELECT ON v_auc_summary TO your_app_user;

-- Migration complete
SELECT 'AUC Migration completed successfully!' as status;
