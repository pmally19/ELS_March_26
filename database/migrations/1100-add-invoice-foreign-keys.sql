-- Migration 1100: Add missing foreign keys to vendor_invoices table
-- Part of Phase 4: Invoice Verification and Posting fixes

-- Add foreign key to purchase_orders if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'fk_vendor_invoices_purchase_order'
    ) THEN
        ALTER TABLE vendor_invoices 
        ADD CONSTRAINT fk_vendor_invoices_purchase_order 
        FOREIGN KEY (purchase_order_id) 
        REFERENCES purchase_orders(id) 
        ON DELETE NO ACTION
        ON UPDATE NO ACTION;
        
        RAISE NOTICE 'Added foreign key: fk_vendor_invoices_purchase_order';
    ELSE
        RAISE NOTICE 'Foreign key fk_vendor_invoices_purchase_order already exists';
    END IF;
END $$;

-- Add foreign key to goods_receipts if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'fk_vendor_invoices_goods_receipt'
    ) THEN
        ALTER TABLE vendor_invoices
        ADD CONSTRAINT fk_vendor_invoices_goods_receipt
        FOREIGN KEY (goods_receipt_id) 
        REFERENCES goods_receipts(id)
        ON DELETE NO ACTION
        ON UPDATE NO ACTION;
        
        RAISE NOTICE 'Added foreign key: fk_vendor_invoices_goods_receipt';
    ELSE
        RAISE NOTICE 'Foreign key fk_vendor_invoices_goods_receipt already exists';
    END IF;
END $$;

-- Add payment blocking columns if they don't exist
ALTER TABLE vendor_invoices 
ADD COLUMN IF NOT EXISTS payment_blocked BOOLEAN DEFAULT FALSE;

ALTER TABLE vendor_invoices 
ADD COLUMN IF NOT EXISTS blocking_reason VARCHAR(500);

ALTER TABLE vendor_invoices 
ADD COLUMN IF NOT EXISTS price_variance NUMERIC(15,2) DEFAULT 0;

ALTER TABLE vendor_invoices 
ADD COLUMN IF NOT EXISTS quantity_variance NUMERIC(15,2) DEFAULT 0;

ALTER TABLE vendor_invoices
ADD COLUMN IF NOT EXISTS tolerance_group_id INTEGER;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_vendor_invoices_po 
ON vendor_invoices(purchase_order_id);

CREATE INDEX IF NOT EXISTS idx_vendor_invoices_gr 
ON vendor_invoices(goods_receipt_id);

CREATE INDEX IF NOT EXISTS idx_vendor_invoices_blocked 
ON vendor_invoices(payment_blocked) 
WHERE payment_blocked = TRUE;

-- Add comment
COMMENT ON COLUMN vendor_invoices.payment_blocked IS 'Invoice blocked for payment due to tolerance violations';
COMMENT ON COLUMN vendor_invoices.blocking_reason IS 'Reason for payment blocking (e.g., price variance, quantity variance)';
COMMENT ON COLUMN vendor_invoices.price_variance IS 'Price variance amount compared to PO';
COMMENT ON COLUMN vendor_invoices.quantity_variance IS 'Quantity variance compared to GR';
