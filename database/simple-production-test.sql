-- Simple Production Order Test Data for mallyerp database
-- This uses existing database structure

-- Insert a few simple production orders directly
INSERT INTO production_orders (
    order_number, order_type, planned_quantity, 
    unit_of_measure, planned_start_date, planned_end_date,
    priority, status, created_at, active
) VALUES
    ('PO-2025-001', 'Standard', 1000, 'PC', 
     CURRENT_DATE - INTERVAL '5 days', CURRENT_DATE + INTERVAL '10 days',
     'HIGH', 'In Production', NOW() - INTERVAL '7 days', true),
    
    ('PO-2025-002', 'Standard', 500, 'PC',
     CURRENT_DATE + INTERVAL '2 days', CURRENT_DATE + INTERVAL '15 days',
     'NORMAL', 'Released', NOW() - INTERVAL '3 days', true),
    
    ('PO-2025-003', 'Special', 200, 'PC',
     CURRENT_DATE + INTERVAL '7 days', CURRENT_DATE + INTERVAL '20 days',
     'NORMAL', 'Created', NOW() - INTERVAL '1 day', true),
    
    ('PO-2025-004', 'Standard', 800, 'PC',
     CURRENT_DATE - INTERVAL '20 days', CURRENT_DATE - INTERVAL '5 days',
     'NORMAL', 'Confirmed', NOW() - INTERVAL '25 days', true),
    
    ('PO-2025-005', 'Emergency', 300, 'PC',
     CURRENT_DATE + INTERVAL '1 day', CURRENT_DATE + INTERVAL '5 days',
     'HIGH', 'Created', NOW(), true),
    
    ('PO-2025-006', 'Standard', 150, 'PC',
     CURRENT_DATE + INTERVAL '30 days', CURRENT_DATE + INTERVAL '45 days',
     'LOW', 'Created', NOW() - INTERVAL '2 days', true)
ON CONFLICT (order_number) DO NOTHING;

-- Verification query
SELECT order_number, planned_quantity, status, priority
FROM production_orders 
WHERE order_number LIKE 'PO-2025-%'
ORDER BY order_number;
