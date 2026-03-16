-- =====================================================================================
-- PRODUCTION MODULE DATABASE FIXES
-- Date: 2025-12-29
-- Purpose: Fix production order statuses, create production versions, add indexes
-- =====================================================================================

-- STEP 1: Standardize Production Order Statuses
-- =====================================================================================
-- Convert existing statuses to standard SAP-style values

UPDATE production_orders 
SET status = CASE 
  WHEN status = 'CREATED' THEN 'Planned'
  WHEN status = 'RELEASED' THEN 'Released'
  WHEN status = 'IN_PROGRESS' THEN 'In Progress'
  WHEN status = 'CONFIRMED' THEN 'Confirmed'
  WHEN status = 'COMPLETED' THEN 'Completed'
  WHEN status = 'CLOSED' THEN 'Closed'
  WHEN status = 'CANCELLED' THEN 'Cancelled'
  ELSE 'Planned'  -- Default to Planned if unknown
END
WHERE status IS NOT NULL;

-- Update NULL statuses to 'Planned'
UPDATE production_orders 
SET status = 'Planned'
WHERE status IS NULL;

-- Add constraint for valid statuses
ALTER TABLE production_orders 
DROP CONSTRAINT IF EXISTS chk_production_order_status;

ALTER TABLE production_orders
ADD CONSTRAINT chk_production_order_status 
CHECK (status IN ('Planned', 'Released', 'In Progress', 'Confirmed', 'Completed', 'Closed', 'Cancelled'));


-- STEP 2: Create Production Versions
-- =====================================================================================
-- Production versions link materials to BOMs and routings
-- This is essential for MRP and production planning

-- First, get a default plant_id
DO $$
DECLARE
  default_plant_id INTEGER;
BEGIN
  -- Get the first active plant as default
  SELECT id INTO default_plant_id FROM plants WHERE active = true LIMIT 1;
  
  -- If no active plant, get any plant
  IF default_plant_id IS NULL THEN
    SELECT id INTO default_plant_id FROM plants LIMIT 1;
  END IF;
  
  -- Insert production versions
  INSERT INTO production_versions (
    material_id, 
    bom_id, 
    routing_id,
    plant_id,
    version_number, 
    is_active, 
    valid_from,
    created_at,
    updated_at
  )
  SELECT 
      bom.material_id,
      bom.id as bom_id,
      NULL as routing_id,
      default_plant_id as plant_id,  -- Use default plant
      '001' as version_number,
      true as is_active,
      CURRENT_TIMESTAMP as valid_from,
      CURRENT_TIMESTAMP as created_at,
      CURRENT_TIMESTAMP as updated_at
  FROM bill_of_materials bom
  INNER JOIN materials m ON bom.material_id = m.id  -- Ensure material exists
  WHERE bom.is_active = true
    AND bom.material_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 
      FROM production_versions pv 
      WHERE pv.material_id = bom.material_id 
        AND pv.bom_id = bom.id
    );
END $$;


-- STEP 3: Update Existing Production Orders to Link to Production Versions
-- =====================================================================================
-- Link orders to their production versions if BOM exists

UPDATE production_orders po
SET production_version_id = pv.id
FROM production_versions pv
WHERE po.bom_id = pv.bom_id
  AND po.material_id = pv.material_id
  AND pv.is_active = true
  AND po.production_version_id IS NULL;


-- STEP 4: Add Performance Indexes
-- =====================================================================================

-- Production Orders indexes
CREATE INDEX IF NOT EXISTS idx_production_orders_status ON production_orders(status) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_production_orders_material_id ON production_orders(material_id) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_production_orders_bom_id ON production_orders(bom_id);
CREATE INDEX IF NOT EXISTS idx_production_orders_work_center ON production_orders(work_center_id);
CREATE INDEX IF NOT EXISTS idx_production_orders_dates ON production_orders(planned_start_date, planned_end_date);

-- BOM indexes
CREATE INDEX IF NOT EXISTS idx_bom_material_id ON bill_of_materials(material_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_bom_items_bom_id ON bom_items(bom_id);
-- CREATE INDEX IF NOT EXISTS idx_bom_items_component ON bom_items(component_material_id); -- Column name unknown

-- Production Versions indexes
CREATE INDEX IF NOT EXISTS idx_production_versions_material ON production_versions(material_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_production_versions_bom ON production_versions(bom_id) WHERE is_active = true;

-- Work Centers indexes
CREATE INDEX IF NOT EXISTS idx_work_centers_active ON work_centers(id) WHERE active = true;


-- STEP 5: Add Comments for Documentation
-- =====================================================================================

COMMENT ON COLUMN production_orders.status IS 'Order status: Planned, Released, In Progress, Confirmed, Completed, Closed, Cancelled';
COMMENT ON COLUMN production_orders.production_version_id IS 'Links to production_versions which defines BOM and routing';
COMMENT ON TABLE production_versions IS 'Links materials to specific BOMs and routings for production';


-- STEP 6: Verify Migration Results
-- =====================================================================================

-- Check production order statuses
SELECT 
    status,
    COUNT(*) as count
FROM production_orders
GROUP BY status
ORDER BY status;

-- Check production versions
SELECT 
    pv.id,
    pv.material_id,
    m.code as material_code,
    m.name as material_name,
    bom.code as bom_code,
    pv.version_number
FROM production_versions pv
LEFT JOIN materials m ON pv.material_id = m.id
LEFT JOIN bill_of_materials bom ON pv.bom_id = bom.id
WHERE pv.is_active = true
ORDER BY pv.material_id;

-- Check orders linked to versions
SELECT 
    COUNT(*) as total_orders,
    COUNT(production_version_id) as orders_with_version,
    COUNT(*) - COUNT(production_version_id) as orders_without_version
FROM production_orders
WHERE active = true;


-- =====================================================================================
-- END OF MIGRATION
-- Expected Results:
-- - All production orders have valid statuses
-- - Production versions created for all BOMs
-- - Performance indexes added
-- - Orders linked to production versions where possible
-- =====================================================================================
