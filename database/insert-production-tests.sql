-- Production Order Test Data - Final Version with correct status values
DO $$
DECLARE
    mat_id INTEGER;
    plant_id INTEGER;
    bom_id INTEGER;
BEGIN
    SELECT id INTO mat_id FROM materials LIMIT 1;
    SELECT id INTO plant_id FROM plants LIMIT 1;
    SELECT id INTO bom_id FROM bill_of_materials LIMIT 1;
    
    INSERT INTO production_orders (
        order_number, material_id, bom_id, plant_id,
        order_type, planned_quantity, unit_of_measure,
        planned_start_date, planned_end_date,
        priority, status, created_at, active
    ) VALUES
        ('PO-TEST-001', mat_id, bom_id, plant_id, 'PROD01', 1000, 'PC',
         CURRENT_DATE - INTERVAL '5 days', CURRENT_DATE + INTERVAL '10 days',
         'HIGH', 'In Progress', NOW() - INTERVAL '7 days', true),
        
        ('PO-TEST-002', mat_id, bom_id, plant_id, 'PROD01', 500, 'PC',
         CURRENT_DATE + INTERVAL '2 days', CURRENT_DATE + INTERVAL '15 days',
         'NORMAL', 'Released', NOW() - INTERVAL '3 days', true),
        
        ('PO-TEST-003', mat_id, bom_id, plant_id, 'PROD01', 200, 'PC',
         CURRENT_DATE + INTERVAL '7 days', CURRENT_DATE + INTERVAL '20 days',
         'NORMAL', 'Planned', NOW() - INTERVAL '1 day', true),
        
        ('PO-TEST-004', mat_id, bom_id, plant_id, 'PROD01', 800, 'PC',
         CURRENT_DATE - INTERVAL '20 days', CURRENT_DATE - INTERVAL '5 days',
         'NORMAL', 'Completed', NOW() - INTERVAL '25 days', true),
        
        ('PO-TEST-005', mat_id, bom_id, plant_id, 'PROD01', 300, 'PC',
         CURRENT_DATE + INTERVAL '1 day', CURRENT_DATE + INTERVAL '5 days',
         'HIGH', 'Planned', NOW(), true),
        
        ('PO-TEST-006', mat_id, bom_id, plant_id, 'PROD01', 150, 'PC',
         CURRENT_DATE + INTERVAL '30 days', CURRENT_DATE + INTERVAL '45 days',
         'LOW', 'Planned', NOW() - INTERVAL '2 days', true)
    ON CONFLICT (order_number) DO UPDATE SET status = EXCLUDED.status;
    
    RAISE NOTICE '✅ Successfully inserted 6 test production orders';
END $$;

SELECT order_number, planned_quantity, unit_of_measure, status, priority
FROM production_orders WHERE order_number LIKE 'PO-TEST-%' ORDER BY order_number;
