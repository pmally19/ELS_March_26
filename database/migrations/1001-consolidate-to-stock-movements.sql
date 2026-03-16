-- ==================================================================================
-- CONSOLIDATE TO STOCK_MOVEMENTS TABLE  
-- ==================================================================================
-- Purpose: Drop material_movements table - all code now uses stock_movements
-- ==================================================================================

BEGIN;

-- Simply drop material_movements since all backend code now uses stock_movements
-- No data migration needed - stock_movements already has the data

-- 1. Drop foreign key constraints that reference material_movements
DO $$
DECLARE
    constraint_record RECORD;
BEGIN
    FOR constraint_record IN
        SELECT
            tc.table_name,
            tc.constraint_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND ccu.table_name = 'material_movements'
    LOOP
        EXECUTE format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I CASCADE',
            constraint_record.table_name,
            constraint_record.constraint_name);
        RAISE NOTICE 'Dropped FK: %.%', constraint_record.table_name, constraint_record.constraint_name;
    END LOOP;
END $$;

-- 2. Drop material_movements table and related objects
DROP TABLE IF EXISTS material_movements CASCADE;
DROP SEQUENCE IF EXISTS movement_number_seq CASCADE;

-- 3. Ensure stock_movements has all necessary indexes
CREATE INDEX IF NOT EXISTS idx_stock_movements_material ON stock_movements(material_code);
CREATE INDEX IF NOT EXISTS idx_stock_movements_type ON stock_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_stock_movements_date ON stock_movements(posting_date);
CREATE INDEX IF NOT EXISTS idx_stock_movements_plant ON stock_movements(plant_code);
CREATE INDEX IF NOT EXISTS idx_stock_movements_vendor ON stock_movements(vendor_code);
CREATE INDEX IF NOT EXISTS idx_stock_movements_customer ON stock_movements(customer_code);
CREATE INDEX IF NOT EXISTS idx_stock_movements_production ON stock_movements(production_order_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_document ON stock_movements(document_number);
CREATE INDEX IF NOT EXISTS idx_stock_movements_reference ON stock_movements(reference_document);

-- 4. Update table comment
COMMENT ON TABLE stock_movements IS 'Central inventory transaction log - ALL stock movements tracked here (material_movements dropped)';

COMMIT;

-- Verification
SELECT 
    CASE 
        WHEN COUNT(*) = 0 THEN 'SUCCESS: material_movements table dropped'
        ELSE 'WARNING: material_movements still exists'
    END as migration_status
FROM information_schema.tables
WHERE table_name = 'material_movements';

SELECT 
    'stock_movements' as table_name,
    COUNT(*) as total_records
FROM stock_movements;
