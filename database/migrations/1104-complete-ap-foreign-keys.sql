-- Final migration to complete remaining foreign keys for Phase 4-8
-- Run this to finalize all AP table relationships

-- Start transaction
BEGIN;

-- ============================================================================
-- VENDOR_PAYMENT_ALLOCATIONS FOREIGN KEYS
-- ============================================================================

-- Drop existing constraints if they exist (to avoid errors on re-run)
DO $$ 
BEGIN
    -- Add FK to vendor_payments
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'fk_payment_allocations_payment'
    ) THEN
        ALTER TABLE vendor_payment_allocations
        ADD CONSTRAINT fk_payment_allocations_payment
        FOREIGN KEY (payment_id) REFERENCES vendor_payments(id)
        ON DELETE CASCADE;
        RAISE NOTICE 'Added: fk_payment_allocations_payment';
    END IF;

    -- Add FK to vendor_invoices
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'fk_payment_allocations_open_item'
    ) THEN
        ALTER TABLE vendor_payment_allocations  
        ADD CONSTRAINT fk_payment_allocations_open_item
        FOREIGN KEY (open_item_id) REFERENCES vendor_invoices(id)
        ON DELETE NO ACTION;
        RAISE NOTICE 'Added: fk_payment_allocations_open_item';
    END IF;
END $$;

-- ============================================================================
-- PAYMENT_PROPOSALS FOREIGN KEYS
-- ============================================================================

DO $$ 
BEGIN
    -- Add FK to company_codes
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'fk_payment_proposals_company_code'
    ) THEN
        ALTER TABLE payment_proposals
        ADD CONSTRAINT fk_payment_proposals_company_code
        FOREIGN KEY (company_code_id) REFERENCES company_codes(id)
        ON DELETE NO ACTION;
        RAISE NOTICE 'Added: fk_payment_proposals_company_code';
    END IF;
END $$;

-- ============================================================================
-- PAYMENT_PROPOSAL_ITEMS FOREIGN KEYS
-- ============================================================================

DO $$ 
BEGIN
    -- Add FK to vendor_invoices
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'fk_proposal_items_invoice'
    ) THEN
        ALTER TABLE payment_proposal_items
        ADD CONSTRAINT fk_proposal_items_invoice
        FOREIGN KEY (invoice_id) REFERENCES vendor_invoices(id)
        ON DELETE NO ACTION;
        RAISE NOTICE 'Added: fk_proposal_items_invoice';
    END IF;

    -- Add FK to vendors
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'fk_proposal_items_vendor'
    ) THEN
        ALTER TABLE payment_proposal_items
        ADD CONSTRAINT fk_proposal_items_vendor
        FOREIGN KEY (vendor_id) REFERENCES vendors(id)
        ON DELETE NO ACTION;
        RAISE NOTICE 'Added: fk_proposal_items_vendor';
    END IF;
END $$;

-- ============================================================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_vendor_payment_allocations_payment 
ON vendor_payment_allocations(payment_id);

CREATE INDEX IF NOT EXISTS idx_vendor_payment_allocations_open_item 
ON vendor_payment_allocations(open_item_id);

CREATE INDEX IF NOT EXISTS idx_payment_proposals_company_code 
ON payment_proposals(company_code_id);

CREATE INDEX IF NOT EXISTS idx_payment_proposals_status 
ON payment_proposals(status);

CREATE INDEX IF NOT EXISTS idx_payment_proposals_payment_date 
ON payment_proposals(payment_date);

CREATE INDEX IF NOT EXISTS idx_payment_proposal_items_invoice 
ON payment_proposal_items(invoice_id);

CREATE INDEX IF NOT EXISTS idx_payment_proposal_items_vendor 
ON payment_proposal_items(vendor_id);

CREATE INDEX IF NOT EXISTS idx_payment_proposal_items_status 
ON payment_proposal_items(status);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Show all foreign keys that were added
SELECT 
    tc.table_name,
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS foreign_table,
    ccu.column_name AS foreign_column
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name IN ('vendor_payment_allocations', 'payment_proposals', 'payment_proposal_items')
ORDER BY tc.table_name, tc.constraint_name;

-- Commit all changes
COMMIT;

-- Print success message
DO $$ 
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'MIGRATION COMPLETED SUCCESSFULLY';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE '';
    RAISE NOTICE 'All foreign keys for Phase 4-8 have been added.';
    RAISE NOTICE 'AP workflow is now fully configured with proper referential integrity.';
    RAISE NOTICE '';
END $$;
