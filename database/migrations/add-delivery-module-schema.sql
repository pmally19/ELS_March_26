-- ==================================================================================
-- DELIVERY MODULE DATABASE SCHEMA
-- ==================================================================================
-- Purpose: Complete delivery workflow - from production to customer
-- NO SAP terminology | Complete tracking | Full integration
-- ==================================================================================

BEGIN;

-- ==================================================================================
-- 1. CREATE DELIVERY_ORDERS TABLE
-- ==================================================================================
CREATE TABLE IF NOT EXISTS delivery_orders (
  id SERIAL PRIMARY KEY,
  delivery_number VARCHAR(50) UNIQUE NOT NULL,
  sales_order_id INTEGER REFERENCES sales_orders(id) ON DELETE SET NULL,
  sales_order_number VARCHAR(50),
  customer_id INTEGER,
  customer_name VARCHAR(255) NOT NULL,
  
  -- Dates
  delivery_date DATE NOT NULL,
  planned_delivery_date DATE,
  actual_delivery_date DATE,
  dispatch_date DATE,
  
  -- Status tracking
  status VARCHAR(50) DEFAULT 'Pending' CHECK (status IN (
    'Pending', 'Preparing', 'Ready', 'Dispatched', 'In Transit', 
    'Delivered', 'Cancelled', 'Failed', 'Returned'
  )),
  
  -- Shipping information
  shipping_address TEXT NOT NULL,
  contact_person VARCHAR(255),
  contact_phone VARCHAR(50),
  contact_email VARCHAR(255),
  
  -- Logistics
  tracking_number VARCHAR(100),
  carrier VARCHAR(100),
  vehicle_number VARCHAR(50),
  driver_name VARCHAR(255),
  driver_phone VARCHAR(50),
  
  -- Documents
  packing_list_number VARCHAR(50),
  invoice_number VARCHAR(50),
  e_way_bill_number VARCHAR(50),
  
  -- Additional info
  delivery_notes TEXT,
  internal_notes TEXT,
  priority VARCHAR(20) DEFAULT 'Normal',
  
  -- Totals
  total_quantity DECIMAL(15,3),
  total_items INTEGER,
  total_weight DECIMAL(15,3),
  weight_unit VARCHAR(20),
  
  -- Audit
  created_by INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  dispatched_by INTEGER,
  received_by_customer VARCHAR(255),
  customer_signature TEXT,
  delivery_proof_url TEXT
);

-- Create indexes
CREATE INDEX idx_delivery_orders_sales_order ON delivery_orders(sales_order_id);
CREATE INDEX idx_delivery_orders_customer ON delivery_orders(customer_id);
CREATE INDEX idx_delivery_orders_status ON delivery_orders(status);
CREATE INDEX idx_delivery_orders_delivery_date ON delivery_orders(delivery_date);
CREATE INDEX idx_delivery_orders_number ON delivery_orders(delivery_number);

-- ==================================================================================
-- 2. ALTER EXISTING DELIVERY_ITEMS TABLE (table already exists)
-- ==================================================================================
-- Add new columns that don't exist yet
ALTER TABLE delivery_items
ADD COLUMN IF NOT EXISTS delivery_order_id INTEGER REFERENCES delivery_orders(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS line_number INTEGER,
ADD COLUMN IF NOT EXISTS material_code VARCHAR(100),
ADD COLUMN IF NOT EXISTS material_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS quantity_ordered DECIMAL(15,3),
ADD COLUMN IF NOT EXISTS quantity_delivered DECIMAL(15,3),
ADD COLUMN IF NOT EXISTS quantity_returned DECIMAL(15,3) DEFAULT 0,
ADD COLUMN IF NOT EXISTS unit_of_measure VARCHAR(20),
ADD COLUMN IF NOT EXISTS production_order_id INTEGER REFERENCES production_orders(id),
ADD COLUMN IF NOT EXISTS production_order_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS batch_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS serial_numbers TEXT[],
ADD COLUMN IF NOT EXISTS lot_number VARCHAR(100),
ADD COLUMN IF NOT EXISTS expiry_date DATE,
ADD COLUMN IF NOT EXISTS packages_count INTEGER,
ADD COLUMN IF NOT EXISTS package_type VARCHAR(50),
ADD COLUMN IF NOT EXISTS weight DECIMAL(15,3),
ADD COLUMN IF NOT EXISTS weight_unit VARCHAR(20),
ADD COLUMN IF NOT EXISTS quality_status VARCHAR(50) DEFAULT 'Passed',
ADD COLUMN IF NOT EXISTS inspection_notes TEXT,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Create indexes (skip if exist, no IF NOT EXISTS in older postgres)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_delivery_items_delivery_order') THEN
    CREATE INDEX idx_delivery_items_delivery_order ON delivery_items(delivery_order_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_delivery_items_production') THEN
    CREATE INDEX idx_delivery_items_production ON delivery_items(production_order_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_delivery_items_so') THEN
    CREATE INDEX idx_delivery_items_so ON delivery_items(sales_order_item_id);
  END IF;
END $$;

-- ==================================================================================
-- 3. CREATE MATERIAL_MOVEMENTS TABLE (For tracking all inventory movements)
-- ==================================================================================
CREATE TABLE IF NOT EXISTS material_movements (
  id SERIAL PRIMARY KEY,
  movement_number VARCHAR(50) UNIQUE NOT NULL,
  movement_type VARCHAR(50) NOT NULL CHECK (movement_type IN (
    'Goods Receipt', 'Goods Issue', 'Transfer', 'Return', 
    'Adjustment', 'Scrap', 'Production Receipt', 'Production Issue'
  )),
  
  -- Material info
  material_id INTEGER REFERENCES materials(id),
  material_code VARCHAR(100),
  material_name VARCHAR(255) NOT NULL,
  
  -- Quantity
  quantity DECIMAL(15,3) NOT NULL,
  unit_of_measure VARCHAR(20) NOT NULL,
  
  -- Locations
  from_location VARCHAR(100),
  to_location VARCHAR(100),
  plant_id INTEGER,
  warehouse_code VARCHAR(50),
  bin_location VARCHAR(50),
  
  -- References
  production_order_id INTEGER REFERENCES production_orders(id),
  sales_order_id INTEGER REFERENCES sales_orders(id),
  delivery_order_id INTEGER REFERENCES delivery_orders(id),
  reference_document VARCHAR(100),
  reference_type VARCHAR(50),
  
  -- Batch tracking
  batch_number VARCHAR(100),
  serial_number VARCHAR(100),
  
  -- Financial
  value_amount DECIMAL(15,2),
  currency VARCHAR(10),
  
  -- Status
  movement_date TIMESTAMP DEFAULT NOW(),
  posting_date DATE DEFAULT CURRENT_DATE,
  status VARCHAR(50) DEFAULT 'Posted',
  
  -- Audit
  posted_by INTEGER,
  approved_by INTEGER,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_material_movements_material ON material_movements(material_id);
CREATE INDEX idx_material_movements_type ON material_movements(movement_type);
CREATE INDEX idx_material_movements_production ON material_movements(production_order_id);
CREATE INDEX idx_material_movements_delivery ON material_movements(delivery_order_id);
CREATE INDEX idx_material_movements_date ON material_movements(movement_date);
CREATE INDEX idx_material_movements_number ON material_movements(movement_number);

-- ==================================================================================
-- 5. UPDATE SALES_ORDERS TABLE
-- ==================================================================================
ALTER TABLE sales_orders 
ADD COLUMN IF NOT EXISTS delivery_status VARCHAR(50) DEFAULT 'Not Delivered',
ADD COLUMN IF NOT EXISTS quantity_delivered DECIMAL(15,3) DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_delivery_date DATE,
ADD COLUMN IF NOT EXISTS total_deliveries INTEGER DEFAULT 0;

-- ==================================================================================
-- 6. UPDATE PRODUCTION_ORDERS TABLE
-- ==================================================================================
ALTER TABLE production_orders
ADD COLUMN IF NOT EXISTS material_issued BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS material_issue_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS material_issued_by INTEGER,
ADD COLUMN IF NOT EXISTS goods_received BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS goods_receipt_date TIMESTAMP,
ADD COLUMN IF NOT EXISTS goods_receipt_number VARCHAR(50);

-- ==================================================================================
-- 6. CREATE SEQUENCE FOR DELIVERY NUMBERS
-- ==================================================================================
CREATE SEQUENCE IF NOT EXISTS delivery_number_seq START WITH 1;

-- ==================================================================================
-- 8. CREATE SEQUENCE FOR MOVEMENT NUMBERS
-- ==================================================================================
CREATE SEQUENCE IF NOT EXISTS movement_number_seq START WITH 1;

-- ==================================================================================
-- 8. CREATE TRIGGER FOR DELIVERY UPDATED_AT
-- ==================================================================================
CREATE OR REPLACE FUNCTION update_delivery_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER delivery_orders_updated_at
BEFORE UPDATE ON delivery_orders
FOR EACH ROW
EXECUTE FUNCTION update_delivery_updated_at();

-- ==================================================================================
-- 9. CREATE VIEW FOR DELIVERY SUMMARY
-- ==================================================================================
CREATE OR REPLACE VIEW v_delivery_summary AS
SELECT 
  d.id,
  d.delivery_number,
  d.sales_order_number,
  d.customer_name,
  d.delivery_date,
  d.status,
  d.total_quantity,
  d.total_items,
  d.tracking_number,
  d.carrier,
  COUNT(di.id) as item_count,
  SUM(di.quantity_delivered) as total_qty_delivered,
  d.created_at
FROM delivery_orders d
LEFT JOIN delivery_items di ON di.delivery_order_id = d.id
GROUP BY d.id;

-- ==================================================================================
-- 10. ADD COMMENTS
-- ==================================================================================
COMMENT ON TABLE delivery_orders IS 'Tracks customer deliveries from warehouse';
COMMENT ON TABLE delivery_items IS 'Individual items in each delivery order';
COMMENT ON TABLE material_movements IS 'All inventory movements across the system';
COMMENT ON COLUMN delivery_orders.status IS 'Tracking status: Pending → Preparing → Ready → Dispatched → In Transit → Delivered';
COMMENT ON COLUMN material_movements.movement_type IS 'Type of inventory movement';

COMMIT;

-- ==================================================================================
-- VERIFICATION QUERIES
-- ==================================================================================
-- Check tables created
SELECT table_name FROM information_schema.tables 
WHERE table_name IN ('delivery_orders', 'delivery_items', 'material_movements')
ORDER BY table_name;

-- Check columns added to sales_orders
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'sales_orders' 
AND column_name IN ('delivery_status', 'quantity_delivered', 'last_delivery_date')
ORDER BY column_name;

-- Check columns added to production_orders
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'production_orders' 
AND column_name IN ('material_issued', 'material_issue_date', 'goods_received')
ORDER BY column_name;

SELECT CURRENT_TIMESTAMP as migration_completed;
