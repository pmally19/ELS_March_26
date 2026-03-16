-- Migration: Refactor AUC to Separate Table
-- This migration creates a dedicated auc_master table and moves AUC data from asset_master

-- Step 1: Create new auc_master table
CREATE TABLE IF NOT EXISTS auc_master (
  id SERIAL PRIMARY KEY,
  asset_number VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Status & Lifecycle
  auc_status VARCHAR(50) NOT NULL DEFAULT 'in_progress',
  construction_start_date DATE NOT NULL,
  planned_capitalization_date DATE,
  actual_capitalization_date DATE,
  
  -- Organization
  company_code_id INTEGER NOT NULL REFERENCES company_codes(id),
  asset_class_id INTEGER NOT NULL REFERENCES asset_classes(id),
  cost_center_id INTEGER REFERENCES cost_centers(id),
  plant_id INTEGER,
  
  -- Settlement
  wip_account_code VARCHAR(50) NOT NULL,
  settlement_profile VARCHAR(50),
  
  -- Relationship
  parent_asset_id INTEGER REFERENCES asset_master(id),
  
  -- Audit
  created_by INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Constraints
  CONSTRAINT chk_auc_status CHECK (auc_status IN ('in_progress', 'capitalized', 'abandoned'))
);

-- Step 2: Add plant_id to asset_master if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'asset_master' AND column_name = 'plant_id'
  ) THEN
    ALTER TABLE asset_master ADD COLUMN plant_id INTEGER;
  END IF;
END $$;

-- Step 3: Migrate existing AUC data from asset_master to auc_master (if any exist)
INSERT INTO auc_master (
  asset_number, name, description, auc_status,
  construction_start_date, planned_capitalization_date,
  actual_capitalization_date, company_code_id, asset_class_id,
  cost_center_id, wip_account_code, settlement_profile,
  created_at, updated_at
)
SELECT 
  asset_number, 
  name, 
  COALESCE(description, ''),
  COALESCE(auc_status, 'in_progress'),
  COALESCE(construction_start_date, CURRENT_DATE),
  planned_capitalization_date,
  actual_capitalization_date,
  company_code_id,
  asset_class_id,
  cost_center_id,
  COALESCE(wip_account_code, '150000'),
  settlement_profile,
  created_at,
  updated_at
FROM asset_master
WHERE is_auc = true
ON CONFLICT (asset_number) DO NOTHING;

-- Step 4: Note - We keep AUC records in asset_master for now for safety
-- They will be marked with is_auc = true
-- After verification, these can be deleted manually if needed

-- Step 5: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_auc_master_company_code ON auc_master(company_code_id);
CREATE INDEX IF NOT EXISTS idx_auc_master_asset_class ON auc_master(asset_class_id);
CREATE INDEX IF NOT EXISTS idx_auc_master_status ON auc_master(auc_status);
CREATE INDEX IF NOT EXISTS idx_auc_master_cost_center ON auc_master(cost_center_id);
CREATE INDEX IF NOT EXISTS idx_auc_master_plant ON auc_master(plant_id);

-- Step 6: Update the v_auc_summary view to use auc_master
DROP VIEW IF EXISTS v_auc_summary;

CREATE VIEW v_auc_summary AS
SELECT 
  am.id,
  am.asset_number,
  SUM(CASE WHEN act.is_settled = false THEN act.amount ELSE 0 END) as unsettled_costs,
  SUM(CASE WHEN act.is_settled = true THEN act.amount ELSE 0 END) as settled_costs,
  SUM(act.amount) as total_accumulated_costs,
  COUNT(act.id) as total_cost_entries
FROM auc_master am
LEFT JOIN auc_cost_tracking act ON am.id = act.auc_asset_id
GROUP BY am.id, am.asset_number;

-- Step 7: Grant permissions (adjust as needed)
GRANT SELECT, INSERT, UPDATE, DELETE ON auc_master TO PUBLIC;
GRANT USAGE, SELECT ON SEQUENCE auc_master_id_seq TO PUBLIC;

-- Migration complete
-- Next steps:
-- 1. Update backend code to use auc_master table
-- 2. Test all AUC operations
-- 3. After verification, optionally delete AUC records from asset_master
