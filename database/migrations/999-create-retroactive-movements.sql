-- MANUAL FIX: Create material movements for already-posted deliveries
-- This creates movements retroactively for deliveries that were posted before the fix was implemented

BEGIN;

-- Create material movements for all posted delivery items that don't have movements yet
INSERT INTO material_movements (
    movement_number,
    movement_type,
    material_id,
    material_code,
    material_name,
    quantity,
    unit_of_measure,
    from_location,
    plant_id,
    delivery_order_id,
    sales_order_id,
    reference_document,
    reference_type,
    movement_date,
    posting_date,
    status,
    posted_by,
    notes
)
SELECT 
    'MV-' || to_char(NOW(), 'YYYYMMDD') || '-' || LPAD((ROW_NUMBER() OVER (ORDER BY di.id))::text, 4, '0') as movement_number,
    'Goods Issue' as movement_type,
    NULL as material_id,  -- Set to NULL to avoid FK constraint issues
    COALESCE(m.code, p.sku, 'UNKNOWN') as material_code,
    COALESCE(di.material_name, p.name, m.name, 'Unknown Material') as material_name,
    di.pgi_quantity as quantity,
    COALESCE(di.unit, 'EA') as unit_of_measure,
    di.storage_location as from_location,
    p.plant_id,
    dd.id as delivery_order_id,
    dd.sales_order_id,
    dd.delivery_number as reference_document,
    'Delivery' as reference_type,
    COALESCE(dd.pgi_date, dd.updated_at, dd.created_at) as movement_date,
    COALESCE(dd.pgi_date::date, dd.updated_at::date, CURRENT_DATE) as posting_date,
    'Posted' as status,
    1 as posted_by,
    'Retroactively created for delivery ' || dd.delivery_number as notes
FROM delivery_items di
JOIN delivery_documents dd ON di.delivery_id = dd.id
LEFT JOIN products p ON di.material_id = p.id
LEFT JOIN materials m ON di.material_id = m.id OR p.sku = m.code
WHERE dd.pgi_status = 'POSTED'
  AND di.inventory_posting_status = 'POSTED'
  AND di.pgi_quantity > 0
  AND NOT EXISTS (
      SELECT 1 FROM material_movements mm 
      WHERE mm.delivery_order_id = dd.id 
        AND mm.material_code = COALESCE(m.code, p.sku)
  );

-- Show what was created
SELECT COUNT(*) as movements_created FROM material_movements 
WHERE notes LIKE 'Retroactively created%';

COMMIT;

SELECT 'SUCCESS: Material movements created for existing posted deliveries' as status;
