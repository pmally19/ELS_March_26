-- ========================================================================
-- PRODUCTION ORDER TESTING - SAMPLE DATA SETUP
-- ========================================================================
-- Purpose: Insert comprehensive sample data for Production Order UI testing
-- Usage: Run this script in your PostgreSQL database
-- Note: Uses ON CONFLICT to avoid duplicates - safe to run multiple times
-- ========================================================================

-- Step 1: Insert Materials
-- ----------------------------------------
INSERT INTO materials (code, name, description, material_type, base_unit, active, created_at)
VALUES
  ('FG-001', 'Premium Widget Assembly', 'High-quality finished product widget', 'Finished Good', 'PC', true, NOW()),
  ('FG-002', 'Standard Gadget Kit', 'Standard production gadget assembly', 'Finished Good', 'PC', true, NOW()),
  ('FG-003', 'Deluxe Component Set', 'Premium component manufacturing set', 'Finished Good', 'PC', true, NOW()),
  ('RM-001', 'Steel Sheet Grade A', 'Industrial grade steel sheets', 'Raw Material', 'KG', true, NOW()),
  ('RM-002', 'Aluminum Alloy', 'Lightweight aluminum material', 'Raw Material', 'KG', true, NOW())
ON CONFLICT (code) DO NOTHING;

-- Step 2: Insert Plants
-- ----------------------------------------
INSERT INTO plants (code, name, description, address, city, state, country, active, created_at)
VALUES
  ('P1000', 'Main Production Plant', 'Primary manufacturing facility', '123 Industrial Drive', 'Detroit', 'MI', 'USA', true, NOW()),
  ('P2000', 'East Coast Facility', 'Secondary production center', '456 Factory Lane', 'Boston', 'MA', 'USA', true, NOW())
ON CONFLICT (code) DO NOTHING;

-- Step 3: Insert Work Centers
-- ----------------------------------------
DO $$
DECLARE
    plant_1 INTEGER;
    plant_2 INTEGER;
BEGIN
    SELECT id INTO plant_1 FROM plants WHERE code = 'P1000' LIMIT 1;
    SELECT id INTO plant_2 FROM plants WHERE code = 'P2000' LIMIT 1;

    INSERT INTO work_centers (code, name, description, plant_id, capacity, unit_of_measure, cost_center, status, active, created_at)
    VALUES
      ('WC-ASM-01', 'Assembly Line 1', 'Primary assembly workstation', plant_1, 100, 'PC/HR', 'CC-1000', 'Available', true, NOW()),
      ('WC-ASM-02', 'Assembly Line 2', 'Secondary assembly line', plant_1, 80, 'PC/HR', 'CC-1000', 'Available', true, NOW()),
      ('WC-WELD-01', 'Welding Station 1', 'Automated welding center', plant_1, 50, 'PC/HR', 'CC-2000', 'Available', true, NOW()),
      ('WC-PKG-01', 'Packaging Line 1', 'Final packaging station', plant_2, 120, 'PC/HR', 'CC-3000', 'Available', true, NOW())
    ON CONFLICT (code) DO NOTHING;
END $$;

-- Step 4: Insert Bill of Materials
-- ----------------------------------------
DO $$
DECLARE
    mat_fg1 INTEGER;
    mat_fg2 INTEGER;
    mat_rm1 INTEGER;
    mat_rm2 INTEGER;
BEGIN
    SELECT id INTO mat_fg1 FROM materials WHERE code = 'FG-001' LIMIT 1;
    SELECT id INTO mat_fg2 FROM materials WHERE code = 'FG-002' LIMIT 1;
    SELECT id INTO mat_rm1 FROM materials WHERE code = 'RM-001' LIMIT 1;
    SELECT id INTO mat_rm2 FROM materials WHERE code = 'RM-002' LIMIT 1;

    INSERT INTO bill_of_materials (code, name, material_id, version, base_quantity, base_unit, valid_from, is_active, created_at)
    VALUES
      ('BOM-FG001-V1', 'Premium Widget BOM v1', mat_fg1, 1, 1, 'PC', NOW() - INTERVAL '90 days', true, NOW()),
      ('BOM-FG002-V1', 'Standard Gadget BOM v1', mat_fg2, 1, 1, 'PC', NOW() - INTERVAL '60 days', true, NOW())
    ON CONFLICT (code) DO NOTHING;

    -- Insert BOM items
    INSERT INTO bom_items (bom_id, material_id, quantity, unit_of_measure, item_number, item_category)
    SELECT b.id, mat_rm1, 2.5, 'KG', 10, 'L'
    FROM bill_of_materials b WHERE b.code = 'BOM-FG001-V1'
    ON CONFLICT DO NOTHING;

    INSERT INTO bom_items (bom_id, material_id, quantity, unit_of_measure, item_number, item_category)
    SELECT b.id, mat_rm2, 1.8, 'KG', 20, 'L'
    FROM bill_of_materials b WHERE b.code = 'BOM-FG001-V1'
    ON CONFLICT DO NOTHING;
END $$;

-- Step 5: Insert Production Orders (6 diverse scenarios)
-- ----------------------------------------
DO $$
DECLARE
    mat_fg1 INTEGER;
    mat_fg2 INTEGER;
    mat_fg3 INTEGER;
    plant_1 INTEGER;
    plant_2 INTEGER;
    wc_asm1 INTEGER;
    wc_asm2 INTEGER;
    wc_weld INTEGER;
    bom_1 INTEGER;
    cost_center INTEGER;
BEGIN
    -- Get IDs
    SELECT id INTO mat_fg1 FROM materials WHERE code = 'FG-001' LIMIT 1;
    SELECT id INTO mat_fg2 FROM materials WHERE code = 'FG-002' LIMIT 1;
    SELECT id INTO mat_fg3 FROM materials WHERE code = 'FG-003' LIMIT 1;
    SELECT id INTO plant_1 FROM plants WHERE code = 'P1000' LIMIT 1;
    SELECT id INTO plant_2 FROM plants WHERE code = 'P2000' LIMIT 1;
    SELECT id INTO wc_asm1 FROM work_centers WHERE code = 'WC-ASM-01' LIMIT 1;
    SELECT id INTO wc_asm2 FROM work_centers WHERE code = 'WC-ASM-02' LIMIT 1;
    SELECT id INTO wc_weld FROM work_centers WHERE code = 'WC-WELD-01' LIMIT 1;
    SELECT id INTO bom_1 FROM bill_of_materials WHERE code = 'BOM-FG001-V1' LIMIT 1;
    SELECT id INTO cost_center FROM cost_centers WHERE code = 'CC-1000' LIMIT 1;

    -- Order 1: High Priority, In Production (actively running)
    INSERT INTO production_orders (
        order_number, material_id, bom_id, plant_id, work_center_id, 
        order_type, planned_quantity, actual_quantity, scrap_quantity,
        unit_of_measure, planned_start_date, planned_end_date,
        actual_start_date, priority, status, cost_center_id,
        notes, created_at, active
    ) VALUES (
        'PO-2025-001', mat_fg1, bom_1, plant_1, wc_asm1,
        'Standard', 1000, 450, 15,
        'PC', CURRENT_DATE - INTERVAL '5 days', CURRENT_DATE + INTERVAL '10 days',
        CURRENT_DATE - INTERVAL '4 days', 'HIGH', 'In Production', cost_center,
        'Urgent customer order - expedite processing', NOW() - INTERVAL '7 days', true
    ) ON CONFLICT (order_number) DO NOTHING;

    -- Order 2: Released, Ready to Start
    INSERT INTO production_orders (
        order_number, material_id, bom_id, plant_id, work_center_id,
        order_type, planned_quantity, actual_quantity, scrap_quantity,
        unit_of_measure, planned_start_date, planned_end_date,
        priority, status, cost_center_id,
        notes, created_at, active
    ) VALUES (
        'PO-2025-002', mat_fg2, NULL, plant_1, wc_asm2,
        'Standard', 500, 0, 0,
        'PC', CURRENT_DATE + INTERVAL '2 days', CURRENT_DATE + INTERVAL '15 days',
        'NORMAL', 'Released', cost_center,
        'Standard production run for inventory replenishment', NOW() - INTERVAL '3 days', true
    ) ON CONFLICT (order_number) DO NOTHING;

    -- Order 3: Created, Awaiting Release
    INSERT INTO production_orders (
        order_number, material_id, bom_id, plant_id, work_center_id,
        order_type, planned_quantity, actual_quantity, scrap_quantity,
        unit_of_measure, planned_start_date, planned_end_date,
        priority, status, cost_center_id,
        notes, created_at, active
    ) VALUES (
        'PO-2025-003', mat_fg3, NULL, plant_2, wc_weld,
        'Special', 200, 0, 0,
        'PC', CURRENT_DATE + INTERVAL '7 days', CURRENT_DATE + INTERVAL '20 days',
        'NORMAL', 'Created', cost_center,
        'Special order awaiting material availability', NOW() - INTERVAL '1 day', true
    ) ON CONFLICT (order_number) DO NOTHING;

    -- Order 4: Completed Successfully
    INSERT INTO production_orders (
        order_number, material_id, bom_id, plant_id, work_center_id,
        order_type, planned_quantity, actual_quantity, scrap_quantity,
        unit_of_measure, planned_start_date, planned_end_date,
        actual_start_date, actual_end_date, priority, status, cost_center_id,
        notes, created_at, active
    ) VALUES (
        'PO-2025-004', mat_fg1, bom_1, plant_1, wc_asm1,
        'Standard', 800, 795, 5,
        'PC', CURRENT_DATE - INTERVAL '20 days', CURRENT_DATE - INTERVAL '5 days',
        CURRENT_DATE - INTERVAL '19 days', CURRENT_DATE - INTERVAL '6 days',
        'NORMAL', 'Confirmed', cost_center,
        'Successfully completed with minimal scrap', NOW() - INTERVAL '25 days', true
    ) ON CONFLICT (order_number) DO NOTHING;

    -- Order 5: Emergency High Priority
    INSERT INTO production_orders (
        order_number, material_id, bom_id, plant_id, work_center_id,
        order_type, planned_quantity, actual_quantity, scrap_quantity,
        unit_of_measure, planned_start_date, planned_end_date,
        priority, status, cost_center_id,
        notes, created_at, active
    ) VALUES (
        'PO-2025-005', mat_fg2, NULL, plant_1, wc_asm2,
        'Emergency', 300, 0, 0,
        'PC', CURRENT_DATE + INTERVAL '1 day', CURRENT_DATE + INTERVAL '5 days',
        'HIGH', 'Created', cost_center,
        'URGENT: Emergency replacement order for customer stockout', NOW(), true
    ) ON CONFLICT (order_number) DO NOTHING;

    -- Order 6: Low Priority, Future Planning
    INSERT INTO production_orders (
        order_number, material_id, bom_id, plant_id, work_center_id,
        order_type, planned_quantity, actual_quantity, scrap_quantity,
        unit_of_measure, planned_start_date, planned_end_date,
        priority, status, cost_center_id,
        notes, created_at, active
    ) VALUES (
        'PO-2025-006', mat_fg3, NULL, plant_2, wc_weld,
        'Standard', 150, 0, 0,
        'PC', CURRENT_DATE + INTERVAL '30 days', CURRENT_DATE + INTERVAL '45 days',
        'LOW', 'Created', cost_center,
        'Long-term planning order for Q2 inventory build', NOW() - INTERVAL '2 days', true
    ) ON CONFLICT (order_number) DO NOTHING;

END $$;

-- ========================================================================
-- VERIFICATION QUERIES
-- ========================================================================

-- Verify all production orders were created
SELECT 
    po.order_number,
    m.name as material_name,
    p.name as plant_name,
    wc.name as work_center,
    po.planned_quantity,
    po.actual_quantity,
    po.status,
    po.priority
FROM production_orders po
LEFT JOIN materials m ON po.material_id = m.id
LEFT JOIN plants p ON po.plant_id = p.id
LEFT JOIN work_centers wc ON po.work_center_id = wc.id
WHERE po.order_number LIKE 'PO-2025-%'
ORDER BY po.order_number;

-- Expected Result: 6 rows with order numbers PO-2025-001 through PO-2025-006

-- ========================================================================
-- CLEANUP (OPTIONAL - Only run if you need to reset test data)
-- ========================================================================

/*
-- Uncomment to delete test production orders
DELETE FROM production_orders WHERE order_number LIKE 'PO-2025-%';

-- Uncomment to delete all test data
DELETE FROM bom_items WHERE bom_id IN (SELECT id FROM bill_of_materials WHERE code LIKE 'BOM-FG%');
DELETE FROM bill_of_materials WHERE code LIKE 'BOM-FG%';
DELETE FROM work_centers WHERE code LIKE 'WC-%';
DELETE FROM plants WHERE code IN ('P1000', 'P2000');
DELETE FROM materials WHERE code IN ('FG-001', 'FG-002', 'FG-003', 'RM-001', 'RM-002');
*/
