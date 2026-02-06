-- Migration: Add missing columns to purchase_requisition_items
-- Date: 2026-01-12
-- Purpose: Fix critical data loss in Purchase Requisition items

BEGIN;

-- Add material information columns
ALTER TABLE purchase_requisition_items
  ADD COLUMN IF NOT EXISTS material_code VARCHAR(50),
  ADD COLUMN IF NOT EXISTS material_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS material_number VARCHAR(50),
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS unit_of_measure VARCHAR(10) DEFAULT 'EA';

-- Add procurement assignment columns
ALTER TABLE purchase_requisition_items
  ADD COLUMN IF NOT EXISTS material_group VARCHAR(50),
  ADD COLUMN IF NOT EXISTS material_group_id INTEGER,
  ADD COLUMN IF NOT EXISTS storage_location VARCHAR(50),
  ADD COLUMN IF NOT EXISTS storage_location_id INTEGER,
  ADD COLUMN IF NOT EXISTS purchasing_group VARCHAR(50),
  ADD COLUMN IF NOT EXISTS purchasing_group_id INTEGER,
  ADD COLUMN IF NOT EXISTS purchasing_org VARCHAR(50),
  ADD COLUMN IF NOT EXISTS purchasing_organization_id INTEGER;

-- Add cost center (item level) columns
ALTER TABLE purchase_requisition_items
  ADD COLUMN IF NOT EXISTS cost_center VARCHAR(50),
  ADD COLUMN IF NOT EXISTS cost_center_id INTEGER;

-- Add plant/warehouse columns
ALTER TABLE purchase_requisition_items
  ADD COLUMN IF NOT EXISTS plant_id INTEGER,
  ADD COLUMN IF NOT EXISTS plant_code VARCHAR(20);

-- Add pricing estimation columns
ALTER TABLE purchase_requisition_items
  ADD COLUMN IF NOT EXISTS estimated_unit_price NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS estimated_total_price NUMERIC(15,2);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_pr_items_material_code ON purchase_requisition_items(material_code);
CREATE INDEX IF NOT EXISTS idx_pr_items_storage_location_id ON purchase_requisition_items(storage_location_id);
CREATE INDEX IF NOT EXISTS idx_pr_items_purchasing_group_id ON purchase_requisition_items(purchasing_group_id);
CREATE INDEX IF NOT EXISTS idx_pr_items_purchasing_org_id ON purchase_requisition_items(purchasing_organization_id);
CREATE INDEX IF NOT EXISTS idx_pr_items_cost_center_id ON purchase_requisition_items(cost_center_id);
CREATE INDEX IF NOT EXISTS idx_pr_items_plant_id ON purchase_requisition_items(plant_id);

-- Add foreign key constraints (with error handling for missing reference tables)
DO $$
BEGIN
  -- Storage location FK
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'storage_locations') THEN
    ALTER TABLE purchase_requisition_items
      ADD CONSTRAINT fk_pr_item_storage_location 
      FOREIGN KEY (storage_location_id) 
      REFERENCES storage_locations(id)
      ON DELETE SET NULL;
  END IF;

  -- Purchasing group FK
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'purchasing_groups') THEN
    ALTER TABLE purchase_requisition_items
      ADD CONSTRAINT fk_pr_item_purchasing_group 
      FOREIGN KEY (purchasing_group_id) 
      REFERENCES purchasing_groups(id)
      ON DELETE SET NULL;
  END IF;

  -- Purchasing organization FK
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'purchasing_organizations') THEN
    ALTER TABLE purchase_requisition_items
      ADD CONSTRAINT fk_pr_item_purchasing_org 
      FOREIGN KEY (purchasing_organization_id) 
      REFERENCES purchasing_organizations(id)
      ON DELETE SET NULL;
  END IF;

  -- Cost center FK
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cost_centers') THEN
    ALTER TABLE purchase_requisition_items
      ADD CONSTRAINT fk_pr_item_cost_center 
      FOREIGN KEY (cost_center_id) 
      REFERENCES cost_centers(id)
      ON DELETE SET NULL;
  END IF;

  -- Plant FK
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'plants') THEN
    ALTER TABLE purchase_requisition_items
      ADD CONSTRAINT fk_pr_item_plant 
      FOREIGN KEY (plant_id) 
      REFERENCES plants(id)
      ON DELETE SET NULL;
  END IF;

  -- Material FK
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'materials') THEN
    ALTER TABLE purchase_requisition_items
      DROP CONSTRAINT IF EXISTS fk_pr_item_material;
    
    ALTER TABLE purchase_requisition_items
      ADD CONSTRAINT fk_pr_item_material 
      FOREIGN KEY (material_id) 
      REFERENCES materials(id)
      ON DELETE SET NULL;
  END IF;
END $$;

COMMIT;

-- Verification query
SELECT 
  COUNT(*) as total_columns,
  COUNT(*) FILTER (WHERE column_name IN (
    'material_code', 'material_name', 'description', 'unit_of_measure',
    'storage_location', 'purchasing_group', 'purchasing_org', 'cost_center'
  )) as new_columns_added
FROM information_schema.columns
WHERE table_name = 'purchase_requisition_items';
