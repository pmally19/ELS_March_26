-- Migration 1101: Add missing foreign keys to three_way_matches table
-- Part of Phase 4: Invoice Verification and Posting fixes

-- Add foreign key to purchase_orders
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'fk_three_way_match_purchase_order'
    ) THEN
        ALTER TABLE three_way_matches
        ADD CONSTRAINT fk_three_way_match_purchase_order
        FOREIGN KEY (purchase_order_id) 
        REFERENCES purchase_orders(id) 
        ON DELETE NO ACTION
        ON UPDATE NO ACTION;
        
        RAISE NOTICE 'Added foreign key: fk_three_way_match_purchase_order';
    ELSE
        RAISE NOTICE 'Foreign key already exists: fk_three_way_match_purchase_order';
    END IF;
END $$;

-- Add foreign key to goods_receipts
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'fk_three_way_match_goods_receipt'
    ) THEN
        ALTER TABLE three_way_matches
        ADD CONSTRAINT fk_three_way_match_goods_receipt
        FOREIGN KEY (goods_receipt_id) 
        REFERENCES goods_receipts(id)
        ON DELETE NO ACTION
        ON UPDATE NO ACTION;
        
        RAISE NOTICE 'Added foreign key: fk_three_way_match_goods_receipt';
    ELSE
        RAISE NOTICE 'Foreign key already exists: fk_three_way_match_goods_receipt';
    END IF;
END $$;

-- Add foreign key to vendor_invoices
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'fk_three_way_match_invoice'
    ) THEN
        ALTER TABLE three_way_matches
        ADD CONSTRAINT fk_three_way_match_invoice
        FOREIGN KEY (invoice_id) 
        REFERENCES vendor_invoices(id)
        ON DELETE NO ACTION
        ON UPDATE NO ACTION;
        
        RAISE NOTICE 'Added foreign key: fk_three_way_match_invoice';
    ELSE
        RAISE NOTICE 'Foreign key already exists: fk_three_way_match_invoice';
    END IF;
END $$;

-- Add foreign key to materials
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'fk_three_way_match_material'
    ) THEN
        ALTER TABLE three_way_matches
        ADD CONSTRAINT fk_three_way_match_material
        FOREIGN KEY (material_id) 
        REFERENCES materials(id)
        ON DELETE NO ACTION
        ON UPDATE NO ACTION;
        
        RAISE NOTICE 'Added foreign key: fk_three_way_match_material';
    ELSE
        RAISE NOTICE 'Foreign key already exists: fk_three_way_match_material';
    END IF;
END $$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_three_way_match_po 
ON three_way_matches(purchase_order_id);

CREATE INDEX IF NOT EXISTS idx_three_way_match_gr 
ON three_way_matches(goods_receipt_id);

CREATE INDEX IF NOT EXISTS idx_three_way_match_invoice 
ON three_way_matches(invoice_id);

CREATE INDEX IF NOT EXISTS idx_three_way_match_material 
ON three_way_matches(material_id);

CREATE INDEX IF NOT EXISTS idx_three_way_match_tolerance_exceeded 
ON three_way_matches(tolerance_exceeded) 
WHERE tolerance_exceeded = TRUE;

-- Add comments
COMMENT ON TABLE three_way_matches IS 'Tracks three-way matching between PO, GR, and Invoice for procurement validation';
COMMENT ON COLUMN three_way_matches.tolerance_exceeded IS 'TRUE if price or quantity variance exceeds configured tolerance limits';
COMMENT ON COLUMN three_way_matches.price_variance IS 'Difference between invoice price and PO price';
COMMENT ON COLUMN three_way_matches.quantity_variance IS 'Difference between invoice quantity and GR quantity';
