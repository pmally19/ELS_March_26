-- ==================================================================================
-- MATERIAL MOVEMENTS SYSTEM - COMPLETE FIX
-- ==================================================================================
-- Purpose: Ensure material_movements table and sequences are properly set up
-- ==================================================================================

BEGIN;

-- 1. Ensure movement_number_seq exists
CREATE SEQUENCE IF NOT EXISTS movement_number_seq START WITH 1;

-- 2. Verify material_movements table structure
-- Check if table exists and create if missing
CREATE TABLE IF NOT EXISTS material_movements (
    id SERIAL PRIMARY KEY,
    movement_number VARCHAR(50) UNIQUE NOT NULL,
    movement_type VARCHAR(50) NOT NULL CHECK (movement_type IN (
        'Goods Receipt', 'Goods Issue', 'Transfer', 'Return', 
        'Adjustment', 'Scrap', 'Production Receipt', 'Production Issue'
    )),
    
    -- Material info
    material_id INTEGER,
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
    production_order_id INTEGER,
    sales_order_id INTEGER,
    delivery_order_id INTEGER,
    purchase_order_id INTEGER,
    goods_receipt_id INTEGER,
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

-- 3. Add missing columns if they don't exist
DO $$ 
BEGIN
    -- Add purchase_order_id if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'material_movements' AND column_name = 'purchase_order_id'
    ) THEN
        ALTER TABLE material_movements ADD COLUMN purchase_order_id INTEGER;
    END IF;
    
    -- Add goods_receipt_id if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'material_movements' AND column_name = 'goods_receipt_id'
    ) THEN
        ALTER TABLE material_movements ADD COLUMN goods_receipt_id INTEGER;
    END IF;
END $$;

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_mm_material ON material_movements(material_id);
CREATE INDEX IF NOT EXISTS idx_mm_type ON material_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_mm_production ON material_movements(production_order_id);
CREATE INDEX IF NOT EXISTS idx_mm_delivery ON material_movements(delivery_order_id);
CREATE INDEX IF NOT EXISTS idx_mm_purchase ON material_movements(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_mm_goods_receipt ON material_movements(goods_receipt_id);
CREATE INDEX IF NOT EXISTS idx_mm_date ON material_movements(movement_date);
CREATE INDEX IF NOT EXISTS idx_mm_number ON material_movements(movement_number);

-- 5. Add comments
COMMENT ON TABLE material_movements IS 'Central inventory transaction log - ALL stock movements tracked here';
COMMENT ON COLUMN material_movements.movement_type IS 'Type of inventory movement: Goods Receipt (purchase), Goods Issue (sales), Production Receipt/Issue, etc.';
COMMENT ON COLUMN material_movements.delivery_order_id IS 'FK to delivery_documents.id for goods issue movements';
COMMENT ON COLUMN material_movements.purchase_order_id IS 'FK to purchase_orders.id for goods receipt movements';
COMMENT ON COLUMN material_movements.goods_receipt_id IS 'FK to goods_receipts.id for goods receipt movements';

-- 6. Create trigger to auto-update stock_balances
CREATE OR REPLACE FUNCTION update_stock_on_movement()
RETURNS TRIGGER AS $$
BEGIN
    -- For Goods Receipt: Increase stock
    IF NEW.movement_type = 'Goods Receipt' THEN
        INSERT INTO stock_balances (
            material_code, plant_code, storage_location, quantity, 
            available_quantity, unit, last_updated
        )
        VALUES (
            NEW.material_code, 
            COALESCE((SELECT code FROM plants WHERE id = NEW.plant_id), 'DEFAULT'),
            COALESCE(NEW.to_location, '0001'),
            NEW.quantity,
            NEW.quantity,
            NEW.unit_of_measure,
            NOW()
        )
        ON CONFLICT (material_code, plant_code, storage_location)
        DO UPDATE SET
            quantity = stock_balances.quantity + NEW.quantity,
            available_quantity = stock_balances.available_quantity + NEW.quantity,
            last_updated = NOW();
    
    -- For Goods Issue: Decrease stock
    ELSIF NEW.movement_type = 'Goods Issue' THEN
        UPDATE stock_balances
        SET quantity = quantity - NEW.quantity,
            available_quantity = GREATEST(0, available_quantity - NEW.quantity),
            last_updated = NOW()
        WHERE material_code = NEW.material_code
          AND plant_code = COALESCE((SELECT code FROM plants WHERE id = NEW.plant_id), 'DEFAULT')
          AND storage_location = COALESCE(NEW.from_location, '0001');
    
    -- For Production Receipt: Increase finished goods
    ELSIF NEW.movement_type = 'Production Receipt' THEN
        INSERT INTO stock_balances (
            material_code, plant_code, storage_location, quantity, 
            available_quantity, unit, last_updated
        )
        VALUES (
            NEW.material_code, 
            COALESCE((SELECT code FROM plants WHERE id = NEW.plant_id), 'DEFAULT'),
            COALESCE(NEW.to_location, '0001'),
            NEW.quantity,
            NEW.quantity,
            NEW.unit_of_measure,
            NOW()
        )
        ON CONFLICT (material_code, plant_code, storage_location)
        DO UPDATE SET
            quantity = stock_balances.quantity + NEW.quantity,
            available_quantity = stock_balances.available_quantity + NEW.quantity,
            last_updated = NOW();
    
    -- For Production Issue: Decrease raw materials
    ELSIF NEW.movement_type = 'Production Issue' THEN
        UPDATE stock_balances
        SET quantity = quantity - NEW.quantity,
            available_quantity = GREATEST(0, available_quantity - NEW.quantity),
            last_updated = NOW()
        WHERE material_code = NEW.material_code
          AND plant_code = COALESCE((SELECT code FROM plants WHERE id = NEW.plant_id), 'DEFAULT')
          AND storage_location = COALESCE(NEW.from_location, '0001');
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS trigger_update_stock_on_movement ON material_movements;

-- Create trigger
CREATE TRIGGER trigger_update_stock_on_movement
    AFTER INSERT ON material_movements
    FOR EACH ROW
    EXECUTE FUNCTION update_stock_on_movement();

COMMIT;

-- Verification
SELECT 
    'material_movements' as table_name,
    COUNT(*) as record_count
FROM material_movements
UNION ALL
SELECT 
    'stock_balances' as table_name,
    COUNT(*) as record_count
FROM stock_balances;

SELECT 'Database structure fixed' as status, CURRENT_TIMESTAMP as completed_at;
