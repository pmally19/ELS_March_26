-- Fix existing production orders data
-- 1. Fix BOM linkage for orders with NULL bom_id
UPDATE production_orders po
SET bom_id = (
    SELECT id FROM bill_of_materials bom
    WHERE bom.material_id = po.material_id
    AND (bom.is_active = true OR bom.is_active IS NULL)
    ORDER BY bom.id
    LIMIT 1
),
updated_at = CURRENT_TIMESTAMP
WHERE po.bom_id IS NULL
AND EXISTS (
    SELECT 1 FROM bill_of_materials bom
    WHERE bom.material_id = po.material_id
);

-- 2. Create initial production versions for materials that have both BOM and Routing
INSERT INTO production_versions (
    material_id, plant_id, version_number, bom_id, routing_id, routing_model_type,
    valid_from, lot_size_from, is_active, created_at, updated_at
)
SELECT DISTINCT
    m.id as material_id,
    p.id as plant_id,
    '01' as version_number,
    bom.id as bom_id,
    COALESCE(rm.id, r.routing_id::integer) as routing_id,
    CASE WHEN rm.id IS NOT NULL THEN 'modern' ELSE 'legacy' END as routing_model_type,
    CURRENT_DATE as valid_from,
    0 as lot_size_from,
    true as is_active,
    CURRENT_TIMESTAMP as created_at,
    CURRENT_TIMESTAMP as updated_at
FROM materials m
CROSS JOIN plants p
INNER JOIN bill_of_materials bom ON bom.material_id = m.id 
    AND (bom.is_active = true OR bom.is_active IS NULL)
LEFT JOIN routing_master rm ON rm.material_id = m.id 
    AND rm.plant_id = p.id 
    AND (rm.is_active = true OR rm.is_active IS NULL)
LEFT JOIN routings r ON r.material_id::int = m.id 
    AND r.plant_id::int = p.id 
    AND COALESCE(r.routing_status, 'ACTIVE') = 'ACTIVE'
WHERE m.is_manufactured = true
  AND m.is_active = true
  AND p.is_active = true
  AND (rm.id IS NOT NULL OR r.routing_id IS NOT NULL)
ON CONFLICT (material_id, plant_id, version_number) DO NOTHING;

-- 3. Update existing production orders to use production versions
UPDATE production_orders po
SET production_version_id = (
    SELECT id FROM production_versions pv
    WHERE pv.material_id = po.material_id
    AND pv.plant_id = po.plant_id
    AND pv.is_active = true
    ORDER BY pv.id
    LIMIT 1
),
updated_at = CURRENT_TIMESTAMP
WHERE po.production_version_id IS NULL
AND EXISTS (
    SELECT 1 FROM production_versions pv
    WHERE pv.material_id = po.material_id
    AND pv.plant_id = po.plant_id
);

-- 4. Populate material_mrp_data for manufactured materials
INSERT INTO material_mrp_data (
    material_id, plant_id, mrp_type, procurement_type, planning_strategy,
    lot_size_key, minimum_lot_size, reorder_point, safety_stock,
    planned_delivery_time, is_active, created_at, updated_at
)
SELECT 
    m.id as material_id,
    p.id as plant_id,
    COALESCE(m.mrp_type, 'PD') as mrp_type,
    COALESCE(m.procurement_type, 'E') as procurement_type,
    '40' as planning_strategy,
    'EX' as lot_size_key,
    1 as minimum_lot_size, -- Default to 1, can be updated later if minimum_order_quantity column exists
    COALESCE(m.reorder_point, 0) as reorder_point,
    COALESCE(m.safety_stock, 0) as safety_stock,
    1 as planned_delivery_time,
    true as is_active,
    CURRENT_TIMESTAMP as created_at,
    CURRENT_TIMESTAMP as updated_at
FROM materials m
CROSS JOIN plants p
WHERE m.is_manufactured = true
  AND m.is_active = true
  AND p.is_active = true
ON CONFLICT (material_id, plant_id) DO UPDATE SET
    mrp_type = EXCLUDED.mrp_type,
    procurement_type = EXCLUDED.procurement_type,
    updated_at = CURRENT_TIMESTAMP;

