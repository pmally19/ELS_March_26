-- ==================================================================================
-- FIX GOODS RECEIPT TRIGGER - RECREATE SEQUENCE AND UPDATE TO STOCK_MOVEMENTS
-- ==================================================================================
-- Purpose: Fix missing movement_number_seq and update trigger to use stock_movements
-- ==================================================================================

BEGIN;

-- 1. Recreate the movement_number_seq sequence
CREATE SEQUENCE IF NOT EXISTS movement_number_seq START WITH 1;

-- 2. Update trigger function to use stock_movements instead of material_movements
CREATE OR REPLACE FUNCTION create_movement_on_goods_receipt()
RETURNS TRIGGER AS $$
DECLARE
    v_movement_number VARCHAR(50);
    v_seq_num INTEGER;
    v_material_name VARCHAR(255);
    v_plant_code VARCHAR(20);
    v_purchase_order_number VARCHAR(50);
BEGIN
    -- Generate movement number
    v_seq_num := nextval('movement_number_seq');
    v_movement_number := 'MV-' || to_char(NOW(), 'YYYYMMDD') || '-' || lpad(v_seq_num::text, 4, '0');
    
    -- Get material name from materials table
    SELECT name INTO v_material_name 
    FROM materials 
    WHERE code = NEW.material_code 
    LIMIT 1;
    
    IF v_material_name IS NULL THEN
        SELECT name INTO v_material_name
        FROM products
        WHERE sku = NEW.material_code
        LIMIT 1;
    END IF;
    
    -- Get plant_code from plants table
    SELECT code INTO v_plant_code
    FROM plants
    WHERE id = NEW.plant_id
    LIMIT 1;
    
    -- Get purchase order number
    SELECT order_number INTO v_purchase_order_number
    FROM purchase_orders
    WHERE id = NEW.purchase_order_id
    LIMIT 1;
    
    -- Insert stock movement for goods receipt (using stock_movements table)
    INSERT INTO stock_movements (
        movement_number, movement_type, material_code, material_name,
        quantity, unit_of_measure, to_location, plant_code,
        goods_receipt_id, purchase_order_id,
        document_number, reference_document, batch_number,
        movement_date, posting_date, status, posted_by, notes
    ) VALUES (
        v_movement_number,
        '101',  -- SAP movement type for GR against PO
        NEW.material_code,
        COALESCE(v_material_name, 'Material ' || NEW.material_code),
        NEW.quantity,
        COALESCE(NEW.unit, 'EA'),
        NEW.storage_location,
        COALESCE(v_plant_code, NEW.plant_code),
        NEW.id,
        NEW.purchase_order_id,
        NEW.receipt_number,
        COALESCE(v_purchase_order_number, NEW.purchase_order),
        NEW.batch,
        NEW.receipt_date,
        COALESCE(NEW.posting_date, NEW.receipt_date),
        'Posted',
        NEW.created_by,
        'Auto-created from goods receipt ' || NEW.receipt_number
    );
    
    RAISE NOTICE 'Stock movement % created for goods receipt %', v_movement_number, NEW.receipt_number;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Drop and recreate trigger
DROP TRIGGER IF EXISTS trigger_create_movement_on_gr ON goods_receipts;

CREATE TRIGGER trigger_create_movement_on_gr
    AFTER INSERT ON goods_receipts
    FOR EACH ROW
    EXECUTE FUNCTION create_movement_on_goods_receipt();

COMMENT ON FUNCTION create_movement_on_goods_receipt() IS 
  'Auto-creates stock movement (movement type 101) when goods receipt is posted';

COMMIT;

-- Verification
SELECT 
    'SUCCESS: movement_number_seq recreated' as status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'movement_number_seq')
        THEN 'Sequence exists'
        ELSE 'ERROR: Sequence missing'
    END as sequence_status,
    CASE
        WHEN EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_create_movement_on_gr')
        THEN 'Trigger exists'
        ELSE 'ERROR: Trigger missing'
    END as trigger_status,
    CURRENT_TIMESTAMP as completed_at;
