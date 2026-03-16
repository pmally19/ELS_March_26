-- Migration 1102: Add missing foreign keys to payment tables
-- Part of Phase 5: Vendor Payment Processing fixes

-- Add foreign keys to vendor_payment_allocations

-- Foreign key to vendor_payments
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'fk_payment_allocations_payment'
    ) THEN
        ALTER TABLE vendor_payment_allocations
        ADD CONSTRAINT fk_payment_allocations_payment
        FOREIGN KEY (payment_id) 
        REFERENCES vendor_payments(id)
        ON DELETE CASCADE
        ON UPDATE NO ACTION;
        
        RAISE NOTICE 'Added foreign key: fk_payment_allocations_payment';
    ELSE
        RAISE NOTICE 'Foreign key already exists: fk_payment_allocations_payment';
    END IF;
END $$;

-- Foreign key to vendor_invoices (open items)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'fk_payment_allocations_open_item'
    ) THEN
        ALTER TABLE vendor_payment_allocations  
        ADD CONSTRAINT fk_payment_allocations_open_item
        FOREIGN KEY (open_item_id) 
        REFERENCES vendor_invoices(id)
        ON DELETE NO ACTION
        ON UPDATE NO ACTION;
        
        RAISE NOTICE 'Added foreign key: fk_payment_allocations_open_item';
    ELSE
        RAISE NOTICE 'Foreign key already exists: fk_payment_allocations_open_item';
    END IF;
END $$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_payment_allocations_payment 
ON vendor_payment_allocations(payment_id);

CREATE INDEX IF NOT EXISTS idx_payment_allocations_open_item 
ON vendor_payment_allocations(open_item_id);

CREATE INDEX IF NOT EXISTS idx_payment_allocations_date 
ON vendor_payment_allocations(allocation_date);

-- Add comments
COMMENT ON TABLE vendor_payment_allocations IS 'Tracks allocation of vendor payments to specific invoices/open items';
COMMENT ON COLUMN vendor_payment_allocations.open_item_id IS 'References vendor_invoices.id for the invoice being paid';
COMMENT ON COLUMN vendor_payment_allocations.allocated_amount IS 'Amount allocated from payment to this specific invoice';
