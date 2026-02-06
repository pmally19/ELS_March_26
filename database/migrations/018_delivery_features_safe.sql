-- =====================================================
-- STANDARD DELIVERY FEATURES - SAFE MIGRATION
-- Only adds new columns, doesn't modify existing ones
-- All master data driven - no hardcoded values
-- =====================================================

-- Step 1: Create Schedule Lines table for Sales Orders
CREATE TABLE IF NOT EXISTS sales_order_schedule_lines (
  id SERIAL PRIMARY KEY,
  sales_order_id INTEGER NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
  sales_order_item_id INTEGER NOT NULL REFERENCES sales_order_items(id) ON DELETE CASCADE,
  line_number INTEGER NOT NULL,
  
  -- Scheduled quantities
  schedule_quantity DECIMAL(15,3) NOT NULL,
  confirmed_quantity DECIMAL(15,3) DEFAULT 0.000,
  delivered_quantity DECIMAL(15,3) DEFAULT 0.000,
  unit VARCHAR(10) NOT NULL,
  
  -- Dates
  requested_delivery_date TIMESTAMP NOT NULL,
  confirmed_delivery_date TIMESTAMP,
  material_availability_date TIMESTAMP,
  loading_date TIMESTAMP,
  transportation_planning_date TIMESTAMP,
  
  -- Status
  confirmation_status VARCHAR(20) DEFAULT 'UNCONFIRMED',
  availability_status VARCHAR(20) DEFAULT 'UNCHECKED',
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  
  UNIQUE(sales_order_item_id, line_number)
);

CREATE INDEX IF NOT EXISTS idx_schedule_lines_so_id ON sales_order_schedule_lines(sales_order_id);
CREATE INDEX IF NOT EXISTS idx_schedule_lines_soi_id ON sales_order_schedule_lines(sales_order_item_id);
CREATE INDEX IF NOT EXISTS idx_schedule_lines_delivery_date ON sales_order_schedule_lines(requested_delivery_date);

-- Step 2: Add new columns to sales_orders table (only if they don't exist)
DO $$
BEGIN
  -- Delivery block
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sales_orders' AND column_name='delivery_block') THEN
    ALTER TABLE sales_orders ADD COLUMN delivery_block VARCHAR(2);
  END IF;
  
  -- Complete delivery required
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sales_orders' AND column_name='complete_delivery_required') THEN
    ALTER TABLE sales_orders ADD COLUMN complete_delivery_required BOOLEAN DEFAULT false;
  END IF;
  
  -- Partial delivery allowed
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sales_orders' AND column_name='partial_delivery_allowed') THEN
    ALTER TABLE sales_orders ADD COLUMN partial_delivery_allowed VARCHAR(1) DEFAULT 'X';
  END IF;
  
  -- Delivery priority
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sales_orders' AND column_name='delivery_priority') THEN
    ALTER TABLE sales_orders ADD COLUMN delivery_priority VARCHAR(2) DEFAULT '02';
  END IF;
  
  -- Delivery group
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sales_orders' AND column_name='delivery_group') THEN
    ALTER TABLE sales_orders ADD COLUMN delivery_group VARCHAR(3);
  END IF;
  
  -- Shipping condition
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sales_orders' AND column_name='shipping_condition') THEN
    ALTER TABLE sales_orders ADD COLUMN shipping_condition VARCHAR(4);
  END IF;
  
  -- Route code
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sales_orders' AND column_name='route_code') THEN
    ALTER TABLE sales_orders ADD COLUMN route_code VARCHAR(6);
  END IF;
  
  -- Shipping point (might already exist from delivery documents)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sales_orders' AND column_name='shipping_point_code') THEN
    ALTER TABLE sales_orders ADD COLUMN shipping_point_code VARCHAR(4);
  END IF;
  
  -- Loading point
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sales_orders' AND column_name='loading_point') THEN
    ALTER TABLE sales_orders ADD COLUMN loading_point VARCHAR(4);
  END IF;
  
  -- Trade terms
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sales_orders' AND column_name='trade_terms') THEN
    ALTER TABLE sales_orders ADD COLUMN trade_terms VARCHAR(3);
  END IF;
  
  -- Trade terms location
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sales_orders' AND column_name='trade_terms_location') THEN
    ALTER TABLE sales_orders ADD COLUMN trade_terms_location VARCHAR(100);
  END IF;
END $$;

-- Step 3: Add new columns to delivery_documents table (only if they don't exist)
DO $$
BEGIN
  -- Delivery type
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='delivery_documents' AND column_name='delivery_type_code') THEN
    ALTER TABLE delivery_documents ADD COLUMN delivery_type_code VARCHAR(4);
  END IF;
  
  -- Delivery block
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='delivery_documents' AND column_name='delivery_block_code') THEN
    ALTER TABLE delivery_documents ADD COLUMN delivery_block_code VARCHAR(2);
  END IF;
  
  -- Delivery priority
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='delivery_documents' AND column_name='delivery_priority') THEN
    ALTER TABLE delivery_documents ADD COLUMN delivery_priority VARCHAR(2) DEFAULT '02';
  END IF;
  
  -- Delivery group
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='delivery_documents' AND column_name='delivery_group') THEN
    ALTER TABLE delivery_documents ADD COLUMN delivery_group VARCHAR(3);
  END IF;
  
  -- Complete delivery
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='delivery_documents' AND column_name='complete_delivery') THEN
    ALTER TABLE delivery_documents ADD COLUMN complete_delivery BOOLEAN DEFAULT false;
  END IF;
  
  -- Shipping condition
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='delivery_documents' AND column_name='shipping_condition') THEN
    ALTER TABLE delivery_documents ADD COLUMN shipping_condition VARCHAR(4);
  END IF;
  
  -- Route code
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='delivery_documents' AND column_name='route_code') THEN
    ALTER TABLE delivery_documents ADD COLUMN route_code VARCHAR(6);
  END IF;
  
  -- Loading point
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='delivery_documents' AND column_name='loading_point') THEN
    ALTER TABLE delivery_documents ADD COLUMN loading_point VARCHAR(4);
  END IF;
  
  -- Transportation zone
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='delivery_documents' AND column_name='transportation_zone') THEN
    ALTER TABLE delivery_documents ADD COLUMN transportation_zone VARCHAR(10);
  END IF;
  
  -- Inventory posting date
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='delivery_documents' AND column_name='inventory_posting_date') THEN
    ALTER TABLE delivery_documents ADD COLUMN inventory_posting_date DATE;
  END IF;
  
  -- Inventory posting status
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='delivery_documents' AND column_name='inventory_posting_status') THEN
    ALTER TABLE delivery_documents ADD COLUMN inventory_posting_status VARCHAR(20) DEFAULT 'NOT_POSTED';
  END IF;
  
  -- Inventory document number
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='delivery_documents' AND column_name='inventory_document_number') THEN
    ALTER TABLE delivery_documents ADD COLUMN inventory_document_number VARCHAR(20);
  END IF;
  
  -- Movement type
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='delivery_documents' AND column_name='movement_type') THEN
    ALTER TABLE delivery_documents ADD COLUMN movement_type VARCHAR(3) DEFAULT '601';
  END IF;
  
  -- Picking dates
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='delivery_documents' AND column_name='picking_start_date') THEN
    ALTER TABLE delivery_documents ADD COLUMN picking_start_date TIMESTAMP;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='delivery_documents' AND column_name='picking_completion_date') THEN
    ALTER TABLE delivery_documents ADD COLUMN picking_completion_date TIMESTAMP;
  END IF;
  
  -- Packing date
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='delivery_documents' AND column_name='packing_date') THEN
    ALTER TABLE delivery_documents ADD COLUMN packing_date TIMESTAMP;
  END IF;
  
  -- Loading dates
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='delivery_documents' AND column_name='loading_start_date') THEN
    ALTER TABLE delivery_documents ADD COLUMN loading_start_date TIMESTAMP;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='delivery_documents' AND column_name='loading_completion_date') THEN
    ALTER TABLE delivery_documents ADD COLUMN loading_completion_date TIMESTAMP;
  END IF;
  
  -- Shipment reference
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='delivery_documents' AND column_name='shipment_id') THEN
    ALTER TABLE delivery_documents ADD COLUMN shipment_id INTEGER;
  END IF;
  
  -- Carrier reference
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='delivery_documents' AND column_name='carrier_id') THEN
    ALTER TABLE delivery_documents ADD COLUMN carrier_id INTEGER;
  END IF;
  
  -- Tracking reference
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='delivery_documents' AND column_name='tracking_reference') THEN
    ALTER TABLE delivery_documents ADD COLUMN tracking_reference VARCHAR(100);
  END IF;
  
  -- Delivery split reason
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='delivery_documents' AND column_name='delivery_split_reason') THEN
    ALTER TABLE delivery_documents ADD COLUMN delivery_split_reason VARCHAR(4);
  END IF;
  
  -- Trade terms
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='delivery_documents' AND column_name='trade_terms') THEN
    ALTER TABLE delivery_documents ADD COLUMN trade_terms VARCHAR(3);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='delivery_documents' AND column_name='trade_terms_location') THEN
    ALTER TABLE delivery_documents ADD COLUMN trade_terms_location VARCHAR(100);
  END IF;
END $$;

-- Step 4: Add schedule line reference to delivery_items (only if they don't exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='delivery_items' AND column_name='schedule_line_id') THEN
    ALTER TABLE delivery_items ADD COLUMN schedule_line_id INTEGER REFERENCES sales_order_schedule_lines(id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='delivery_items' AND column_name='movement_type') THEN
    ALTER TABLE delivery_items ADD COLUMN movement_type VARCHAR(3) DEFAULT '601';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='delivery_items' AND column_name='inventory_posting_status') THEN
    ALTER TABLE delivery_items ADD COLUMN inventory_posting_status VARCHAR(20) DEFAULT 'NOT_POSTED';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='delivery_items' AND column_name='posted_quantity') THEN
    ALTER TABLE delivery_items ADD COLUMN posted_quantity DECIMAL(15,3) DEFAULT 0.000;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='delivery_items' AND column_name='stock_type') THEN
    ALTER TABLE delivery_items ADD COLUMN stock_type VARCHAR(20) DEFAULT 'UNRESTRICTED';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='delivery_items' AND column_name='valuation_type') THEN
    ALTER TABLE delivery_items ADD COLUMN valuation_type VARCHAR(10);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='delivery_items' AND column_name='special_stock_indicator') THEN
    ALTER TABLE delivery_items ADD COLUMN special_stock_indicator VARCHAR(1);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='delivery_items' AND column_name='project_code') THEN
    ALTER TABLE delivery_items ADD COLUMN project_code VARCHAR(24);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='delivery_items' AND column_name='cost_center') THEN
    ALTER TABLE delivery_items ADD COLUMN cost_center VARCHAR(10);
  END IF;
END $$;

-- Step 5: Create master data tables

-- Shipping Conditions
CREATE TABLE IF NOT EXISTS shipping_conditions_master (
  id SERIAL PRIMARY KEY,
  code VARCHAR(4) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  loading_group VARCHAR(4),
  transportation_group VARCHAR(4),
  proposed_shipping_point VARCHAR(4),
  manual_shipping_point_allowed BOOLEAN DEFAULT true,
  proposed_route VARCHAR(6),
  picking_lead_time_days DECIMAL(5,2) DEFAULT 0.00,
  packing_lead_time_days DECIMAL(5,2) DEFAULT 0.00,
  loading_lead_time_days DECIMAL(5,2) DEFAULT 0.00,
  transportation_lead_time_days DECIMAL(5,2) DEFAULT 1.00,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Delivery Blocks
CREATE TABLE IF NOT EXISTS delivery_blocks (
  id SERIAL PRIMARY KEY,
  code VARCHAR(2) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  block_type VARCHAR(20) NOT NULL,
  auto_release_allowed BOOLEAN DEFAULT false,
  requires_approval BOOLEAN DEFAULT true,
  approval_role VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Routes
CREATE TABLE IF NOT EXISTS routes_master (
  id SERIAL PRIMARY KEY,
  code VARCHAR(6) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  departure_zone VARCHAR(10),
  destination_zone VARCHAR(10),
  transportation_mode VARCHAR(20),
  transit_days DECIMAL(5,2) NOT NULL DEFAULT 1.00,
  distance_km DECIMAL(10,2),
  departure_time VARCHAR(5),
  frequency VARCHAR(20),
  operating_days JSONB,
  default_carrier_id INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Loading Points
CREATE TABLE IF NOT EXISTS loading_points (
  id SERIAL PRIMARY KEY,
  code VARCHAR(4) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  warehouse_code VARCHAR(4),
  shipping_point_code VARCHAR(4),
  address TEXT,
  dock_number VARCHAR(10),
  loading_bay VARCHAR(10),
  loading_capacity_per_day DECIMAL(10,2),
  equipment_available VARCHAR(100),
  operating_hours JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Delivery Split Reasons
CREATE TABLE IF NOT EXISTS delivery_split_reasons (
  id SERIAL PRIMARY KEY,
  code VARCHAR(4) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  reason_category VARCHAR(20) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Delivery Priorities
CREATE TABLE IF NOT EXISTS delivery_priorities (
  id SERIAL PRIMARY KEY,
  code VARCHAR(2) UNIQUE NOT NULL,
  name VARCHAR(50) NOT NULL,
  description TEXT,
  sort_order INTEGER NOT NULL,
  expedite_processing BOOLEAN DEFAULT false,
  priority_color VARCHAR(7),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inventory Movement Types
CREATE TABLE IF NOT EXISTS inventory_movement_types (
  id SERIAL PRIMARY KEY,
  code VARCHAR(3) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  movement_category VARCHAR(20) NOT NULL,
  inventory_effect VARCHAR(10) NOT NULL,
  debit_credit_indicator VARCHAR(1) NOT NULL,
  reversal_movement_type VARCHAR(3),
  requires_gl_account BOOLEAN DEFAULT false,
  default_debit_account VARCHAR(10),
  default_credit_account VARCHAR(10),
  creates_inventory_document BOOLEAN DEFAULT true,
  creates_accounting_document BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Delivery Block Log
CREATE TABLE IF NOT EXISTS delivery_block_log (
  id SERIAL PRIMARY KEY,
  sales_order_id INTEGER REFERENCES sales_orders(id),
  delivery_id INTEGER REFERENCES delivery_documents(id),
  block_code VARCHAR(2) NOT NULL,
  block_reason TEXT,
  blocked_by INTEGER,
  blocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  released_by INTEGER,
  released_at TIMESTAMP,
  release_reason TEXT,
  status VARCHAR(20) DEFAULT 'BLOCKED',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Shipment Documents
CREATE TABLE IF NOT EXISTS shipment_documents (
  id SERIAL PRIMARY KEY,
  shipment_number VARCHAR(20) UNIQUE NOT NULL,
  shipment_type VARCHAR(4),
  planned_departure_date TIMESTAMP,
  planned_arrival_date TIMESTAMP,
  actual_departure_date TIMESTAMP,
  actual_arrival_date TIMESTAMP,
  route_code VARCHAR(6),
  carrier_id INTEGER,
  transportation_mode VARCHAR(20),
  status VARCHAR(20) DEFAULT 'PLANNED',
  loading_point VARCHAR(4),
  loading_start_date TIMESTAMP,
  loading_end_date TIMESTAMP,
  tracking_number VARCHAR(100),
  current_location VARCHAR(100),
  total_weight DECIMAL(15,3),
  weight_unit VARCHAR(10) DEFAULT 'KG',
  total_volume DECIMAL(15,3),
  volume_unit VARCHAR(10) DEFAULT 'M3',
  total_packages INTEGER,
  created_by INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Shipment Items
CREATE TABLE IF NOT EXISTS shipment_items (
  id SERIAL PRIMARY KEY,
  shipment_id INTEGER NOT NULL REFERENCES shipment_documents(id) ON DELETE CASCADE,
  delivery_id INTEGER NOT NULL REFERENCES delivery_documents(id),
  sequence_number INTEGER NOT NULL,
  weight DECIMAL(15,3),
  weight_unit VARCHAR(10) DEFAULT 'KG',
  volume DECIMAL(15,3),
  volume_unit VARCHAR(10) DEFAULT 'M3',
  packages INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(shipment_id, delivery_id)
);

-- Step 6: Create indexes
CREATE INDEX IF NOT EXISTS idx_shipping_conditions_code ON shipping_conditions_master(code);
CREATE INDEX IF NOT EXISTS idx_delivery_blocks_code ON delivery_blocks(code);
CREATE INDEX IF NOT EXISTS idx_routes_code ON routes_master(code);
CREATE INDEX IF NOT EXISTS idx_loading_points_code ON loading_points(code);
CREATE INDEX IF NOT EXISTS idx_loading_points_warehouse ON loading_points(warehouse_code);
CREATE INDEX IF NOT EXISTS idx_delivery_split_reasons_code ON delivery_split_reasons(code);
CREATE INDEX IF NOT EXISTS idx_delivery_priorities_code ON delivery_priorities(code);
CREATE INDEX IF NOT EXISTS idx_delivery_priorities_sort ON delivery_priorities(sort_order);
CREATE INDEX IF NOT EXISTS idx_inventory_movement_types_code ON inventory_movement_types(code);
CREATE INDEX IF NOT EXISTS idx_inventory_movement_types_category ON inventory_movement_types(movement_category);
CREATE INDEX IF NOT EXISTS idx_delivery_block_log_so ON delivery_block_log(sales_order_id);
CREATE INDEX IF NOT EXISTS idx_delivery_block_log_delivery ON delivery_block_log(delivery_id);
CREATE INDEX IF NOT EXISTS idx_delivery_block_log_status ON delivery_block_log(status);
CREATE INDEX IF NOT EXISTS idx_shipment_number ON shipment_documents(shipment_number);
CREATE INDEX IF NOT EXISTS idx_shipment_status ON shipment_documents(status);
CREATE INDEX IF NOT EXISTS idx_shipment_route ON shipment_documents(route_code);
CREATE INDEX IF NOT EXISTS idx_shipment_items_shipment ON shipment_items(shipment_id);
CREATE INDEX IF NOT EXISTS idx_shipment_items_delivery ON shipment_items(delivery_id);

-- Step 7: Add configuration
INSERT INTO system_configuration (config_key, config_value, description)
VALUES 
  ('default_delivery_type_code', 'STD', 'Default delivery type code for standard deliveries'),
  ('default_shipping_condition', '01', 'Default shipping condition code'),
  ('default_delivery_priority', '02', 'Default delivery priority'),
  ('default_movement_type', '601', 'Default movement type for inventory posting'),
  ('delivery_split_by_date', 'true', 'Enable delivery split by requested date'),
  ('delivery_split_by_warehouse', 'true', 'Enable delivery split by warehouse'),
  ('auto_delivery_creation', 'false', 'Auto create deliveries when order confirmed'),
  ('picking_lead_time_days', '1', 'Default picking lead time in days'),
  ('packing_lead_time_days', '0.5', 'Default packing lead time in days'),
  ('loading_lead_time_days', '0.5', 'Default loading lead time in days'),
  ('transportation_planning_days', '0.5', 'Default transportation planning lead time in days')
ON CONFLICT (config_key) DO NOTHING;

-- Completion message
DO $$
BEGIN
  RAISE NOTICE '✅ Standard Delivery Features Migration Complete!';
  RAISE NOTICE '📋 Created: schedule_lines, shipping_conditions, delivery_blocks, routes, loading_points, priorities, movement_types, shipment_documents';
  RAISE NOTICE '🔧 Enhanced: sales_orders, delivery_documents, delivery_items';
  RAISE NOTICE '⚙️  Added system configuration for delivery defaults';
END $$;

