-- Migration: Improve Purchase Order Schema
-- Description: Add missing constraints, indexes, and optimizations without breaking existing code
-- Date: 2026-01-03

DO $$ 
BEGIN
    RAISE NOTICE 'Starting Purchase Order schema improvements...';
    
    -- ========================================
    -- 1. ADD MISSING FOREIGN KEY CONSTRAINTS
    -- ========================================
    
    -- Add FK for purchase_order_items.purchase_order_id if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_po_items_purchase_order_id'
        AND table_name = 'purchase_order_items'
    ) THEN
        ALTER TABLE purchase_order_items
        ADD CONSTRAINT fk_po_items_purchase_order_id
        FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id)
        ON DELETE CASCADE;
        
        RAISE NOTICE 'Added FK constraint: purchase_order_items.purchase_order_id';
    ELSE
        RAISE NOTICE 'FK constraint already exists: purchase_order_items.purchase_order_id';
    END IF;
    
    -- Add FK for purchase_order_items.material_id if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_po_items_material_id'
        AND table_name = 'purchase_order_items'
    ) THEN
        ALTER TABLE purchase_order_items
        ADD CONSTRAINT fk_po_items_material_id
        FOREIGN KEY (material_id) REFERENCES materials(id)
        ON DELETE RESTRICT;
        
        RAISE NOTICE 'Added FK constraint: purchase_order_items.material_id';
    ELSE
        RAISE NOTICE 'FK constraint already exists: purchase_order_items.material_id';
    END IF;
    
    -- ========================================
    -- 2. CREATE PERFORMANCE INDEXES
    -- ========================================
    
    -- Index on vendor_id for filtering
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_po_vendor_id'
    ) THEN
        CREATE INDEX idx_po_vendor_id ON purchase_orders(vendor_id);
        RAISE NOTICE 'Created index: idx_po_vendor_id';
    ELSE
        RAISE NOTICE 'Index already exists: idx_po_vendor_id';
    END IF;
    
    -- Index on status for filtering
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_po_status'
    ) THEN
        CREATE INDEX idx_po_status ON purchase_orders(status);
        RAISE NOTICE 'Created index: idx_po_status';
    ELSE
        RAISE NOTICE 'Index already exists: idx_po_status';
    END IF;
    
    -- Index on order_date for date range queries
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_po_order_date'
    ) THEN
        CREATE INDEX idx_po_order_date ON purchase_orders(order_date);
        RAISE NOTICE 'Created index: idx_po_order_date';
    ELSE
        RAISE NOTICE 'Index already exists: idx_po_order_date';
    END IF;
    
    -- Index on purchase_order_id in items table
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_po_items_po_id'
    ) THEN
        CREATE INDEX idx_po_items_po_id ON purchase_order_items(purchase_order_id);
        RAISE NOTICE 'Created index: idx_po_items_po_id';
    ELSE
        RAISE NOTICE 'Index already exists: idx_po_items_po_id';
    END IF;
    
    -- Index on material_id in items table
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_po_items_material_id'
    ) THEN
        CREATE INDEX idx_po_items_material_id ON purchase_order_items(material_id);
        RAISE NOTICE 'Created index: idx_po_items_material_id';
    ELSE
        RAISE NOTICE 'Index already exists: idx_po_items_material_id';
    END IF;
    
    -- Composite index for quantity tracking queries
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_po_items_tracking'
    ) THEN
        CREATE INDEX idx_po_items_tracking ON purchase_order_items(purchase_order_id, status);
        RAISE NOTICE 'Created index: idx_po_items_tracking';
    ELSE
        RAISE NOTICE 'Index already exists: idx_po_items_tracking';
    END IF;
    
    -- ========================================
    -- 3. ADD HELPFUL COMMENTS
    -- ========================================
    
    COMMENT ON COLUMN purchase_orders.vendor_name IS 'Denormalized vendor name for performance - should match vendors.name via FK';
    COMMENT ON COLUMN purchase_orders.currency IS 'Denormalized currency code - should match currencies.code via FK';
    COMMENT ON COLUMN purchase_orders.status IS 'Order status: DRAFT, PENDING, APPROVED, SENT, PARTIALLY_RECEIVED, RECEIVED, CLOSED';
    COMMENT ON INDEX idx_po_vendor_id IS 'Improves vendor filtering performance';
    COMMENT ON INDEX idx_po_status IS 'Improves status filtering performance';
    COMMENT ON INDEX idx_po_order_date IS 'Improves date range query performance';
    
    RAISE NOTICE 'Purchase Order schema improvements completed successfully!';
    
END $$;

-- Verify the improvements
DO $$
DECLARE
    index_count INTEGER;
    fk_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO index_count 
    FROM pg_indexes 
    WHERE tablename IN ('purchase_orders', 'purchase_order_items')
    AND indexname LIKE 'idx_po%';
    
    SELECT COUNT(*) INTO fk_count
    FROM information_schema.table_constraints
    WHERE table_name = 'purchase_order_items'
    AND constraint_type = 'FOREIGN KEY'
    AND constraint_name LIKE 'fk_po%';
    
    RAISE NOTICE '✓ Total Purchase Order indexes: %', index_count;
    RAISE NOTICE '✓ Total Purchase Order Item FKs: %', fk_count;
END $$;
