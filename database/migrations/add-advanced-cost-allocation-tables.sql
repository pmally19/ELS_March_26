-- Migration: Add Advanced Cost Allocation Tables
-- Date: 2025-10-28
-- Description: Adds tables for activity-based, direct, and step-down cost allocation, plus inventory aging analysis

-- ===================================================================
-- 1. ACTIVITY COST POOLS TABLE
-- ===================================================================
CREATE TABLE IF NOT EXISTS activity_cost_pools (
  id SERIAL PRIMARY KEY,
  cost_center_id INTEGER NOT NULL,
  activity_name VARCHAR(100) NOT NULL,
  driver_type VARCHAR(50) NOT NULL, -- 'MACHINE_HOURS', 'LABOR_HOURS', 'SETUP_HOURS', etc.
  activity_rate NUMERIC(15,4) NOT NULL,
  total_activity_cost NUMERIC(15,2) NOT NULL DEFAULT 0,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (cost_center_id) REFERENCES cost_centers(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_activity_cost_pools_cost_center ON activity_cost_pools(cost_center_id);
CREATE INDEX IF NOT EXISTS idx_activity_cost_pools_driver_type ON activity_cost_pools(driver_type);
CREATE INDEX IF NOT EXISTS idx_activity_cost_pools_period ON activity_cost_pools(period_start, period_end);

COMMENT ON TABLE activity_cost_pools IS 'Activity cost pools for activity-based cost allocation';
COMMENT ON COLUMN activity_cost_pools.driver_type IS 'Type of activity driver (MACHINE_HOURS, LABOR_HOURS, SETUP_HOURS, etc.)';
COMMENT ON COLUMN activity_cost_pools.activity_rate IS 'Cost per unit of activity driver';

-- ===================================================================
-- 2. STEP-DOWN ALLOCATION RULES TABLE
-- ===================================================================
CREATE TABLE IF NOT EXISTS step_down_allocation_rules (
  id SERIAL PRIMARY KEY,
  from_cost_center_id INTEGER NOT NULL,
  to_cost_center_id INTEGER NOT NULL,
  allocation_percentage NUMERIC(5,2) NOT NULL,
  sequence_order INTEGER NOT NULL,
  allocation_basis VARCHAR(50), -- 'PERCENTAGE', 'QUANTITY', 'VALUE'
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (from_cost_center_id) REFERENCES cost_centers(id) ON DELETE CASCADE,
  FOREIGN KEY (to_cost_center_id) REFERENCES cost_centers(id) ON DELETE CASCADE,
  UNIQUE(from_cost_center_id, to_cost_center_id, sequence_order)
);

CREATE INDEX IF NOT EXISTS idx_step_down_from_cost_center ON step_down_allocation_rules(from_cost_center_id);
CREATE INDEX IF NOT EXISTS idx_step_down_to_cost_center ON step_down_allocation_rules(to_cost_center_id);
CREATE INDEX IF NOT EXISTS idx_step_down_sequence ON step_down_allocation_rules(sequence_order);

COMMENT ON TABLE step_down_allocation_rules IS 'Rules for step-down cost allocation from service to production cost centers';
COMMENT ON COLUMN step_down_allocation_rules.sequence_order IS 'Order of allocation (1 = first, 2 = second, etc.)';

-- ===================================================================
-- 3. COST CENTER COSTS TABLE
-- ===================================================================
CREATE TABLE IF NOT EXISTS cost_center_costs (
  id SERIAL PRIMARY KEY,
  cost_center_id INTEGER NOT NULL,
  cost_type VARCHAR(50) NOT NULL, -- 'DIRECT', 'INDIRECT', 'SERVICE', 'PRODUCTION'
  cost_category VARCHAR(100),
  total_cost NUMERIC(15,2) NOT NULL,
  period DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (cost_center_id) REFERENCES cost_centers(id) ON DELETE CASCADE,
  UNIQUE(cost_center_id, cost_type, period)
);

CREATE INDEX IF NOT EXISTS idx_cost_center_costs_cost_center ON cost_center_costs(cost_center_id);
CREATE INDEX IF NOT EXISTS idx_cost_center_costs_period ON cost_center_costs(period);
CREATE INDEX IF NOT EXISTS idx_cost_center_costs_type ON cost_center_costs(cost_type);

COMMENT ON TABLE cost_center_costs IS 'Cost accumulation by cost center for allocation purposes';

-- ===================================================================
-- 4. INVENTORY AGING ANALYSIS TABLE
-- ===================================================================
CREATE TABLE IF NOT EXISTS inventory_aging_analysis (
  id SERIAL PRIMARY KEY,
  material_code VARCHAR(50) NOT NULL,
  plant_code VARCHAR(10) NOT NULL,
  storage_location VARCHAR(10) NOT NULL,
  analysis_date DATE NOT NULL,
  quantity NUMERIC(15,3) NOT NULL,
  inventory_value NUMERIC(15,2) NOT NULL,
  average_age_days NUMERIC(10,2) NOT NULL,
  carrying_cost NUMERIC(15,2) DEFAULT 0,
  obsolescence_cost NUMERIC(15,2) DEFAULT 0,
  total_aging_cost NUMERIC(15,2) DEFAULT 0,
  aging_category VARCHAR(20), -- 'CURRENT', 'SLOW_MOVING', 'AGING', 'OBSOLETE'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (material_code) REFERENCES materials(code) ON DELETE CASCADE,
  UNIQUE(material_code, plant_code, storage_location, analysis_date)
);

CREATE INDEX IF NOT EXISTS idx_inventory_aging_material ON inventory_aging_analysis(material_code);
CREATE INDEX IF NOT EXISTS idx_inventory_aging_location ON inventory_aging_analysis(plant_code, storage_location);
CREATE INDEX IF NOT EXISTS idx_inventory_aging_category ON inventory_aging_analysis(aging_category);
CREATE INDEX IF NOT EXISTS idx_inventory_aging_date ON inventory_aging_analysis(analysis_date);

COMMENT ON TABLE inventory_aging_analysis IS 'Inventory aging cost analysis results';
COMMENT ON COLUMN inventory_aging_analysis.aging_category IS 'CURRENT (<90 days), SLOW_MOVING (90-180), AGING (180-365), OBSOLETE (>365)';

-- ===================================================================
-- 5. ADD CARRYING COST AND OBSOLESCENCE RATE TO MATERIALS TABLE
-- ===================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'materials' 
        AND column_name = 'carrying_cost_rate'
    ) THEN
        ALTER TABLE materials ADD COLUMN carrying_cost_rate NUMERIC(5,4);
        RAISE NOTICE 'Added carrying_cost_rate to materials';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'materials' 
        AND column_name = 'obsolescence_rate'
    ) THEN
        ALTER TABLE materials ADD COLUMN obsolescence_rate NUMERIC(5,4);
        RAISE NOTICE 'Added obsolescence_rate to materials';
    END IF;
END $$;

COMMENT ON COLUMN materials.carrying_cost_rate IS 'Annual carrying cost rate for inventory aging analysis (e.g., 0.15 = 15%)';
COMMENT ON COLUMN materials.obsolescence_rate IS 'Obsolescence cost rate for aging inventory (e.g., 0.05 = 5%)';

-- ===================================================================
-- 6. ADD SYSTEM CONFIGURATION FOR DEFAULT RATES
-- ===================================================================
INSERT INTO system_configuration (config_key, config_value, description, active)
VALUES 
  ('default_carrying_cost_rate', '0.15', 'Default annual carrying cost rate (15%)', true),
  ('default_obsolescence_rate', '0.05', 'Default obsolescence cost rate (5%)', true)
ON CONFLICT (config_key) DO UPDATE 
SET config_value = EXCLUDED.config_value,
    description = EXCLUDED.description,
    active = EXCLUDED.active;

