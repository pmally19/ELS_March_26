-- ==================================================================================
-- GOODS RECEIPT TRIGGER - AUTO CREATE MATERIAL MOVEMENTS
-- ==================================================================================
-- Purpose: Automatically create material movements when goods receipts are posted
-- ==================================================================================

BEGIN;

-- Create trigger function
CREATE OR REPLACE FUNCTION create_movement_on_goods_receipt()
RETURNS TRIGGER AS $$
DECLARE
    v_movement_number VARCHAR(50);
    v_seq_num INTEGER;
    v_material_name VARCHAR(255);
    v_plant_id INTEGER;
    v_purchase_order_id INTEGER;
BEGIN
    -- Generate movement number
    v_seq_num := nextval('movement_number_seq');
    v_movement_number := 'MV-' || to_char(NOW(), 'YYYYMMDD') || '-' || lpad(v_seq_num::text, 4, '0');
    
    -- Get material name from products or materials table
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
    
    -- Get plant_id from plant_code
    SELECT id INTO v_plant_id
    FROM plants
    WHERE code = NEW.plant_code
    LIMIT 1;
    
    -- Get purchase order ID from order number
    SELECT id INTO v_purchase_order_id
    FROM purchase_orders
    WHERE order_number = NEW.purchase_order
    LIMIT 1;
    
    -- Insert material movement for goods receipt
    INSERT INTO material_movements (
        movement_number, movement_type, material_code, material_name,
        quantity, unit_of_measure, to_location, plant_id,
        goods_receipt_id, purchase_order_id,
        reference_document, reference_type, batch_number,
        movement_date, posting_date, status, posted_by, notes
    ) VALUES (
        v_movement_number,
        'Goods Receipt',
        NEW.material_code,
        COALESCE(v_material_name, 'Material ' || NEW.material_code),
        NEW.total_quantity,
        COALESCE(NEW.unit, 'EA'),
        NEW.storage_location,
        v_plant_id,
        NEW.id,
        v_purchase_order_id,
        NEW.receipt_number,
        'Goods Receipt',
        NEW.batch,
        NEW.receipt_date,
        NEW.posting_date,
        'Posted',
        NEW.created_by,
        'Auto-created from goods receipt ' || NEW.receipt_number
    );
    
    RAISE NOTICE 'Material movement % created for goods receipt %', v_movement_number, NEW.receipt_number;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trigger_create_movement_on_gr ON goods_receipts;

-- Create trigger
CREATE TRIGGER trigger_create_movement_on_gr
    AFTER INSERT ON goods_receipts
    FOR EACH ROW
    EXECUTE FUNCTION create_movement_on_goods_receipt();

COMMENT ON FUNCTION create_movement_on_goods_receipt() IS 
  'Auto-creates material movement when goods receipt is posted. Trigger handles stock balance update.';

COMMIT;

SELECT 'Goods receipt trigger created successfully' as status, CURRENT_TIMESTAMP as completed_at;
