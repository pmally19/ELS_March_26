-- ==================================================================================
-- FIX GOODS RECEIPT TRIGGER - CORRECT COLUMN NAMES FOR STOCK_MOVEMENTS
-- ==================================================================================
-- Purpose: Update trigger to use actual stock_movements table columns
-- ==================================================================================

BEGIN;

-- Update trigger function with correct column names for stock_movements
CREATE OR REPLACE FUNCTION create_movement_on_goods_receipt()
RETURNS TRIGGER AS $$
DECLARE
    v_material_name VARCHAR(255);
    v_plant_code VARCHAR(20);
    v_purchase_order_number VARCHAR(50);
    v_unit_price NUMERIC(15,2);
BEGIN
    -- Get plant_code from plants table if plant_id is provided
    IF NEW.plant_id IS NOT NULL THEN
        SELECT code INTO v_plant_code
        FROM plants
        WHERE id = NEW.plant_id
        LIMIT 1;
    ELSE
        v_plant_code := NEW.plant_code;
    END IF;
    
    -- Get purchase order number if purchase_order_id is provided
    IF NEW.purchase_order_id IS NOT NULL THEN
        SELECT order_number INTO v_purchase_order_number
        FROM purchase_orders
        WHERE id = NEW.purchase_order_id
        LIMIT 1;
    ELSE
        v_purchase_order_number := NEW.purchase_order;
    END IF;
    
    -- Get unit price (use from goods receipt or calculate)
    v_unit_price := COALESCE(NEW.unit_price, 0);
    
    -- Insert stock movement for goods receipt
    -- Using actual stock_movements table columns
    INSERT INTO stock_movements (
        document_number,
        posting_date,
        material_code,
        plant_code,
        storage_location,
        movement_type,
        quantity,
        unit,
        unit_price,
        total_value,
        reference_document,
        notes,
        batch_number,
        vendor_code,
        created_at,
        created_by,
        gl_account,
        financial_posting_status
    ) VALUES (
        NEW.receipt_number,                                    -- document_number
        COALESCE(NEW.posted_date::date, NEW.receipt_date),    -- posting_date
        NEW.material_code,                                     -- material_code
        COALESCE(v_plant_code, NEW.plant_code),               -- plant_code
        NULL,                                                  -- storage_location (not in goods_receipts)
        '101',                                                 -- movement_type (GR against PO)
        NEW.quantity,                                          -- quantity
        'EA',                                                  -- unit (default)
        v_unit_price,                                          -- unit_price
        COALESCE(NEW.total_value, NEW.quantity * v_unit_price), -- total_value
        COALESCE(v_purchase_order_number, NEW.purchase_order), -- reference_document
        'Auto-created from goods receipt ' || NEW.receipt_number, -- notes
        NEW.batch_number,                                      -- batch_number
        NEW.vendor_code,                                       -- vendor_code
        CURRENT_TIMESTAMP,                                     -- created_at
        NEW.created_by,                                        -- created_by
        NULL,                                                  -- gl_account
        'PENDING'                                              -- financial_posting_status
    );
    
    RAISE NOTICE 'Stock movement created for goods receipt %', NEW.receipt_number;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger already exists, no need to recreate
-- Just update the function

COMMENT ON FUNCTION create_movement_on_goods_receipt() IS 
  'Auto-creates stock movement (type 101) when goods receipt is posted - uses correct stock_movements schema';

COMMIT;

-- Verification
SELECT 
    'SUCCESS: Trigger function updated with correct column names' as status,
    CURRENT_TIMESTAMP as completed_at;

SELECT 
    'Trigger function exists: ' || proname as function_check
FROM pg_proc 
WHERE proname = 'create_movement_on_goods_receipt';
