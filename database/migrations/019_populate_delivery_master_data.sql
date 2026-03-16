-- =====================================================
-- POPULATE DELIVERY MASTER DATA
-- Initial data to get the system working
-- =====================================================

-- 1. Delivery Priorities
INSERT INTO delivery_priorities (code, name, description, sort_order, expedite_processing, priority_color, is_active) VALUES
('01', 'High Priority', 'Urgent deliveries requiring immediate processing', 1, true, '#FF0000', true),
('02', 'Normal', 'Standard delivery priority', 2, false, '#00FF00', true),
('03', 'Low Priority', 'Non-urgent deliveries', 3, false, '#0000FF', true)
ON CONFLICT (code) DO NOTHING;

-- 2. Shipping Conditions
INSERT INTO shipping_conditions_master 
(code, name, description, picking_lead_time_days, packing_lead_time_days, loading_lead_time_days, transportation_lead_time_days, is_active) 
VALUES
('01', 'Standard Shipping', 'Regular ground shipping', 1.0, 0.5, 0.5, 2.0, true),
('02', 'Express Shipping', 'Expedited delivery service', 0.5, 0.25, 0.25, 1.0, true),
('03', 'Overnight', 'Next day delivery', 0.25, 0.25, 0.25, 0.5, true),
('04', 'Economy Shipping', 'Low-cost slow delivery', 1.5, 0.5, 0.5, 5.0, true)
ON CONFLICT (code) DO NOTHING;

-- 3. Delivery Blocks
INSERT INTO delivery_blocks (code, name, description, block_type, auto_release_allowed, requires_approval, approval_role, is_active) VALUES
('01', 'Credit Block', 'Customer exceeded credit limit', 'CREDIT', false, true, 'CREDIT_MANAGER', true),
('02', 'Quality Hold', 'Quality inspection required', 'QUALITY', false, true, 'QUALITY_MANAGER', true),
('03', 'Manual Block', 'Manually blocked by user', 'MANUAL', false, true, 'SALES_MANAGER', true),
('04', 'Export Documentation', 'Awaiting export documents', 'EXPORT', false, true, 'EXPORT_MANAGER', true),
('05', 'Pricing Review', 'Pricing requires approval', 'PRICING', false, true, 'PRICING_MANAGER', true)
ON CONFLICT (code) DO NOTHING;

-- 4. Routes
INSERT INTO routes_master (code, name, description, transportation_mode, transit_days, frequency, is_active) VALUES
('R001', 'Local Route', 'Local area deliveries', 'ROAD', 1.0, 'DAILY', true),
('R002', 'Regional Route', 'Regional deliveries', 'ROAD', 2.0, 'DAILY', true),
('R003', 'National Route', 'Cross-country deliveries', 'ROAD', 5.0, 'WEEKLY', true),
('R004', 'Express Air', 'Air freight express', 'AIR', 1.0, 'DAILY', true),
('R005', 'International Sea', 'International ocean freight', 'SEA', 30.0, 'WEEKLY', true)
ON CONFLICT (code) DO NOTHING;

-- 5. Delivery Split Reasons
INSERT INTO delivery_split_reasons (code, name, description, reason_category, is_active) VALUES
('A01', 'Partial Stock Availability', 'Not enough inventory for full order', 'AVAILABILITY', true),
('A02', 'Stock Allocation', 'Stock allocated from multiple locations', 'AVAILABILITY', true),
('D01', 'Multiple Delivery Dates', 'Customer requested different dates', 'DATE', true),
('D02', 'Schedule Line Split', 'Split by schedule line dates', 'DATE', true),
('W01', 'Different Warehouses', 'Items from different warehouses', 'WAREHOUSE', true),
('W02', 'Warehouse Capacity', 'Warehouse capacity constraints', 'WAREHOUSE', true),
('R01', 'Different Routes', 'Items require different routes', 'ROUTE', true),
('R02', 'Route Scheduling', 'Route schedule constraints', 'ROUTE', true),
('C01', 'Customer Request', 'Customer-requested split', 'CUSTOMER', true)
ON CONFLICT (code) DO NOTHING;

-- 6. Inventory Movement Types
INSERT INTO inventory_movement_types 
(code, name, description, movement_category, inventory_effect, debit_credit_indicator, creates_inventory_document, creates_accounting_document, is_active) 
VALUES
('601', 'Goods Issue for Delivery', 'Standard goods issue from sales order delivery', 'GOODS_ISSUE', 'DECREASE', 'D', true, true, true),
('602', 'Goods Issue for Scrapping', 'Scrap materials', 'GOODS_ISSUE', 'DECREASE', 'D', true, true, true),
('641', 'Free Goods Issue', 'Issue free goods (no charge)', 'GOODS_ISSUE', 'DECREASE', 'D', true, false, true),
('651', 'Return from Customer', 'Customer returns', 'GOODS_RECEIPT', 'INCREASE', 'C', true, true, true),
('101', 'Goods Receipt', 'Standard goods receipt', 'GOODS_RECEIPT', 'INCREASE', 'C', true, true, true),
('201', 'Goods Issue for Cost Center', 'Issue to internal cost center', 'GOODS_ISSUE', 'DECREASE', 'D', true, true, true),
('301', 'Transfer Posting', 'Stock transfer between locations', 'TRANSFER', 'NEUTRAL', 'D', true, false, true)
ON CONFLICT (code) DO NOTHING;

-- 7. Loading Points (get from existing plants)
INSERT INTO loading_points (code, name, description, warehouse_code, loading_capacity_per_day, is_active)
SELECT 
  SUBSTRING(CONCAT('L', id::text), 1, 4),
  CONCAT(name, ' - Main Dock'),
  CONCAT('Main loading dock for ', name),
  SUBSTRING(code, 1, 4),
  100.0,
  true
FROM plants 
WHERE active = true
ON CONFLICT (code) DO NOTHING;

-- 8. Document Types are typically pre-configured
-- Skipping document type creation as they may already exist

-- Completion message
DO $$
BEGIN
  RAISE NOTICE '✅ Delivery Master Data Populated Successfully!';
  RAISE NOTICE '📊 Created:';
  RAISE NOTICE '  - 3 Delivery Priorities (High, Normal, Low)';
  RAISE NOTICE '  - 4 Shipping Conditions (Standard, Express, Overnight, Economy)';
  RAISE NOTICE '  - 5 Delivery Block Reasons';
  RAISE NOTICE '  - 5 Routes (Local, Regional, National, Air, Sea)';
  RAISE NOTICE '  - 9 Delivery Split Reasons';
  RAISE NOTICE '  - 7 Inventory Movement Types';
  RAISE NOTICE '  - Loading Points from existing warehouses';
  RAISE NOTICE '  - 4 Delivery Document Types';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 System is ready to process deliveries!';
END $$;

