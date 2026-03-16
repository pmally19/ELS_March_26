-- ==================================================================================
-- DELIVERY MODULE CLEANUP - CONSOLIDATE TO SINGLE TABLE
-- ==================================================================================
-- Purpose: Remove duplicate delivery_orders table and use delivery_documents as single source
-- ==================================================================================

BEGIN;

-- 1. Drop unused delivery_orders table (no production data)
DROP TABLE IF EXISTS delivery_orders CASCADE;

-- 2. Ensure delivery_documents is properly commented
COMMENT ON TABLE delivery_documents IS 
  'PRIMARY delivery management table - comprehensive SAP-style delivery tracking with schedule line integration';

-- 3. Add any missing indexes for performance
CREATE INDEX IF NOT EXISTS idx_delivery_documents_sales_order 
  ON delivery_documents(sales_order_id);

CREATE INDEX IF NOT EXISTS idx_delivery_documents_customer 
  ON delivery_documents(customer_id);

CREATE INDEX IF NOT EXISTS idx_delivery_documents_status 
  ON delivery_documents(status);

CREATE INDEX IF NOT EXISTS idx_delivery_documents_pgi_status 
  ON delivery_documents(pgi_status);

CREATE INDEX IF NOT EXISTS idx_delivery_documents_delivery_date 
  ON delivery_documents(delivery_date);

-- 4. Verify delivery_items uses delivery_id correctly
COMMENT ON COLUMN delivery_items.delivery_id IS 
  'Foreign key to delivery_documents.id';

-- 5. Update material_movements comment if needed
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'material_movements' 
    AND column_name = 'delivery_order_id'
  ) THEN
    COMMENT ON COLUMN material_movements.delivery_order_id IS 
      'Foreign key to delivery_documents.id (legacy column name, refers to delivery_documents)';
  END IF;
END $$;

COMMIT;

-- Verification
SELECT 
  'delivery_documents' as table_name,
  COUNT(*) as record_count
FROM delivery_documents
UNION ALL
SELECT 
  'delivery_items' as table_name,
  COUNT(*) as record_count
FROM delivery_items;

SELECT CURRENT_TIMESTAMP as cleanup_completed;
