-- =====================================================================
-- MIGRATION: Add Demand-Driven Production Flow Linkages
-- Purpose: Connect Sales Orders → Planned Orders → Production Orders
-- Date: 2025-12-30
-- =====================================================================

-- Start transaction for safety
BEGIN;

-- =====================================================================
-- STEP 1: Add columns to production_orders table
-- =====================================================================
ALTER TABLE production_orders
  ADD COLUMN IF NOT EXISTS sales_order_id INTEGER,
  ADD COLUMN IF NOT EXISTS sales_order_number VARCHAR(50),
  ADD COLUMN IF NOT EXISTS planned_order_id INTEGER,
  ADD COLUMN IF NOT EXISTS demand_source VARCHAR(20) DEFAULT 'MANUAL',
  ADD COLUMN IF NOT EXISTS source_document_number VARCHAR(50),
  ADD COLUMN IF NOT EXISTS source_document_type VARCHAR(20),
  ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS delivery_priority VARCHAR(20) DEFAULT 'NORMAL',
  ADD COLUMN IF NOT EXISTS special_instructions TEXT;

-- Add comment for documentation
COMMENT ON COLUMN production_orders.sales_order_id IS 'Link to originating sales order (if created from customer demand)';
COMMENT ON COLUMN production_orders.planned_order_id IS 'Link to planned order (if converted from MRP planning)';
COMMENT ON COLUMN production_orders.demand_source IS 'Source: SALES_ORDER, FORECAST, STOCK_REPLENISHMENT, MANUAL';
COMMENT ON COLUMN production_orders.delivery_priority IS 'Priority: URGENT, HIGH, NORMAL, LOW';

-- =====================================================================
-- STEP 2: Add columns to planned_orders table
-- =====================================================================
ALTER TABLE planned_orders
  ADD COLUMN IF NOT EXISTS sales_order_id INTEGER,
  ADD COLUMN IF NOT EXISTS sales_order_number VARCHAR(50),
  ADD COLUMN IF NOT EXISTS sales_order_item_number VARCHAR(10),
  ADD COLUMN IF NOT EXISTS demand_source VARCHAR(20) DEFAULT 'MRP',
  ADD COLUMN IF NOT EXISTS source_document_type VARCHAR(20),
  ADD COLUMN IF NOT EXISTS source_document_id INTEGER,
  ADD COLUMN IF NOT EXISTS converted_production_order_id INTEGER,
  ADD COLUMN IF NOT EXISTS converted_by INTEGER,
  ADD COLUMN IF NOT EXISTS converted_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS delivery_date DATE;

-- Add comment for documentation
COMMENT ON COLUMN planned_orders.sales_order_id IS 'Link to sales order that triggered this planned order';
COMMENT ON COLUMN planned_orders.demand_source IS 'Source: SALES_ORDER, FORECAST, STOCK_REPLENISHMENT, MRP';
COMMENT ON COLUMN planned_orders.converted_production_order_id IS 'Production order created from this planned order';
COMMENT ON COLUMN planned_orders.status IS 'Status: OPEN, CONVERTED, CANCELLED';

-- =====================================================================
-- STEP 3: Add columns to sales_orders table
-- =====================================================================
ALTER TABLE sales_orders
  ADD COLUMN IF NOT EXISTS production_status VARCHAR(20) DEFAULT 'NOT_STARTED',
  ADD COLUMN IF NOT EXISTS mrp_run_required BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS planned_order_created BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS production_order_created BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS production_start_date DATE,
  ADD COLUMN IF NOT EXISTS production_completion_date DATE,
  ADD COLUMN IF NOT EXISTS production_priority VARCHAR(20) DEFAULT 'NORMAL';

-- Add comment for documentation
COMMENT ON COLUMN sales_orders.production_status IS 'Status: NOT_STARTED, PLANNED, IN_PRODUCTION, COMPLETED, DELIVERED';
COMMENT ON COLUMN sales_orders.production_priority IS 'Priority: URGENT, HIGH, NORMAL, LOW';

-- =====================================================================
-- STEP 4: Add Foreign Key Constraints (with ON DELETE SET NULL for safety)
-- =====================================================================

-- Production Orders → Sales Orders
ALTER TABLE production_orders
  DROP CONSTRAINT IF EXISTS fk_prod_order_sales_order,
  ADD CONSTRAINT fk_prod_order_sales_order 
    FOREIGN KEY (sales_order_id) REFERENCES sales_orders(id) 
    ON DELETE SET NULL;

-- Production Orders → Planned Orders
ALTER TABLE production_orders
  DROP CONSTRAINT IF EXISTS fk_prod_order_planned_order,
  ADD CONSTRAINT fk_prod_order_planned_order 
    FOREIGN KEY (planned_order_id) REFERENCES planned_orders(id) 
    ON DELETE SET NULL;

-- Planned Orders → Sales Orders
ALTER TABLE planned_orders
  DROP CONSTRAINT IF EXISTS fk_planned_order_sales_order,
  ADD CONSTRAINT fk_planned_order_sales_order 
    FOREIGN KEY (sales_order_id) REFERENCES sales_orders(id) 
    ON DELETE SET NULL;

-- Planned Orders → Converted Production Order
ALTER TABLE planned_orders
  DROP CONSTRAINT IF EXISTS fk_planned_order_converted_prod_order,
  ADD CONSTRAINT fk_planned_order_converted_prod_order 
    FOREIGN KEY (converted_production_order_id) REFERENCES production_orders(id) 
    ON DELETE SET NULL;

-- Planned Orders → Converted By User
ALTER TABLE planned_orders
  DROP CONSTRAINT IF EXISTS fk_planned_order_converted_by,
  ADD CONSTRAINT fk_planned_order_converted_by 
    FOREIGN KEY (converted_by) REFERENCES users(id) 
    ON DELETE SET NULL;

-- =====================================================================
-- STEP 5: Create Performance Indexes
-- =====================================================================

-- Indexes for production_orders
CREATE INDEX IF NOT EXISTS idx_prod_orders_sales_order ON production_orders(sales_order_id);
CREATE INDEX IF NOT EXISTS idx_prod_orders_planned_order ON production_orders(planned_order_id);
CREATE INDEX IF NOT EXISTS idx_prod_orders_demand_source ON production_orders(demand_source);

-- Indexes for planned_orders
CREATE INDEX IF NOT EXISTS idx_planned_orders_sales_order ON planned_orders(sales_order_id);
CREATE INDEX IF NOT EXISTS idx_planned_orders_status ON planned_orders(status);
CREATE INDEX IF NOT EXISTS idx_planned_orders_converted_prod_order ON planned_orders(converted_production_order_id);

-- Indexes for sales_orders
CREATE INDEX IF NOT EXISTS idx_sales_orders_production_status ON sales_orders(production_status);
CREATE INDEX IF NOT EXISTS idx_sales_orders_mrp_run_required ON sales_orders(mrp_run_required) WHERE mrp_run_required = TRUE;

-- =====================================================================
-- STEP 6: Create Validation Check Constraints
-- =====================================================================

-- Validate demand_source values in production_orders
ALTER TABLE production_orders
  DROP CONSTRAINT IF EXISTS chk_prod_order_demand_source,
  ADD CONSTRAINT chk_prod_order_demand_source 
    CHECK (demand_source IN ('SALES_ORDER', 'FORECAST', 'STOCK_REPLENISHMENT', 'MANUAL'));

-- Validate delivery_priority values in production_orders
ALTER TABLE production_orders
  DROP CONSTRAINT IF EXISTS chk_prod_order_delivery_priority,
  ADD CONSTRAINT chk_prod_order_delivery_priority 
    CHECK (delivery_priority IN ('URGENT', 'HIGH', 'NORMAL', 'LOW'));

-- Validate demand_source values in planned_orders
ALTER TABLE planned_orders
  DROP CONSTRAINT IF EXISTS chk_planned_order_demand_source,
  ADD CONSTRAINT chk_planned_order_demand_source 
    CHECK (demand_source IN ('SALES_ORDER', 'FORECAST', 'STOCK_REPLENISHMENT', 'MRP'));

-- Validate production_status values in sales_orders
ALTER TABLE sales_orders
  DROP CONSTRAINT IF EXISTS chk_sales_order_production_status,
  ADD CONSTRAINT chk_sales_order_production_status 
    CHECK (production_status IN ('NOT_STARTED', 'PLANNED', 'IN_PRODUCTION', 'COMPLETED', 'DELIVERED'));

-- Validate production_priority values in sales_orders
ALTER TABLE sales_orders
  DROP CONSTRAINT IF EXISTS chk_sales_order_production_priority,
  ADD CONSTRAINT chk_sales_order_production_priority 
    CHECK (production_priority IN ('URGENT', 'HIGH', 'NORMAL', 'LOW'));

-- =====================================================================
-- STEP 7: Update existing records with default values (safe migration)
-- =====================================================================

-- Update existing production orders
UPDATE production_orders 
SET 
  demand_source = 'MANUAL',
  delivery_priority = 'NORMAL'
WHERE demand_source IS NULL OR delivery_priority IS NULL;

-- Update existing sales orders
UPDATE sales_orders 
SET 
  production_status = 'NOT_STARTED',
  mrp_run_required = TRUE,
  planned_order_created = FALSE,
  production_order_created = FALSE,
  production_priority = 'NORMAL'
WHERE production_status IS NULL;

-- Update existing planned orders
UPDATE planned_orders 
SET demand_source = 'MRP'
WHERE demand_source IS NULL;

-- =====================================================================
-- STEP 8: Create helper view for demand traceability
-- =====================================================================

CREATE OR REPLACE VIEW v_production_demand_trace AS
SELECT 
  po.id AS production_order_id,
  po.order_number AS production_order_number,
  po.status AS production_status,
  po.demand_source,
  po.customer_name,
  
  -- Planned Order Info
  plo.id AS planned_order_id,
  plo.order_number AS planned_order_number,
  plo.status AS planned_order_status,
  
  -- Sales Order Info
  so.id AS sales_order_id,
  so.order_number AS sales_order_number,
  so.customer_name AS sales_customer_name,
  so.production_status AS sales_production_status,
  so.order_date AS sales_order_date,
  
  -- Material Info
  m.id AS material_id,
  m.code AS material_code,
  m.name AS material_name,
  
  -- Demand Chain
  CASE 
    WHEN po.sales_order_id IS NOT NULL THEN 'SALES_ORDER'
    WHEN po.planned_order_id IS NOT NULL THEN 'PLANNED_ORDER'
    ELSE 'MANUAL'
  END AS demand_chain_type,
  
  -- Timeline
  so.order_date AS demand_creation_date,
  plo.created_at AS planning_date,
  po.created_at AS production_creation_date,
  po.actual_start_date AS production_start_date,
  po.actual_end_date AS production_completion_date
  
FROM production_orders po
LEFT JOIN planned_orders plo ON po.planned_order_id = plo.id
LEFT JOIN sales_orders so ON COALESCE(po.sales_order_id, plo.sales_order_id) = so.id
LEFT JOIN materials m ON po.material_id = m.id
WHERE po.active = TRUE;

COMMENT ON VIEW v_production_demand_trace IS 'Complete demand traceability from sales order through production';

-- =====================================================================
-- STEP 9: Verification Queries
-- =====================================================================

-- Verify columns were added
DO $$
BEGIN
  -- Check production_orders
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'production_orders' AND column_name = 'sales_order_id') THEN
    RAISE EXCEPTION 'Failed to add sales_order_id to production_orders';
  END IF;
  
  -- Check planned_orders
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'planned_orders' AND column_name = 'sales_order_id') THEN
    RAISE EXCEPTION 'Failed to add sales_order_id to planned_orders';
  END IF;
  
  -- Check sales_orders
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'sales_orders' AND column_name = 'production_status') THEN
    RAISE EXCEPTION 'Failed to add production_status to sales_orders';
  END IF;
  
  RAISE NOTICE '✓ All columns added successfully';
END $$;

-- =====================================================================
-- SUCCESS - Commit transaction
-- =====================================================================

COMMIT;

-- Display summary
SELECT 
  'Migration Completed Successfully!' AS status,
  NOW() AS completed_at;

SELECT 
  'production_orders' AS table_name,
  COUNT(*) AS total_records,
  COUNT(sales_order_id) AS linked_to_sales,
  COUNT(planned_order_id) AS linked_to_planned
FROM production_orders
UNION ALL
SELECT 
  'planned_orders',
  COUNT(*),
  COUNT(sales_order_id),
  COUNT(converted_production_order_id)
FROM planned_orders
UNION ALL
SELECT 
  'sales_orders',
  COUNT(*),
  COUNT(CASE WHEN production_order_created THEN 1 END),
  COUNT(CASE WHEN planned_order_created THEN 1 END)
FROM sales_orders;
