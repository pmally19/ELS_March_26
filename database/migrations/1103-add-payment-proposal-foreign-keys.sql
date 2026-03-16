-- Migration 1103: Add missing foreign keys to payment_proposals and payment_proposal_items
-- Part of Phase 6: Payment Proposals fixes

-- Add foreign key to company_codes in payment_proposals
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'fk_payment_proposals_company_code'
    ) THEN
        ALTER TABLE payment_proposals
        ADD CONSTRAINT fk_payment_proposals_company_code
        FOREIGN KEY (company_code_id) 
        REFERENCES company_codes(id)
        ON DELETE NO ACTION
        ON UPDATE NO ACTION;
        
        RAISE NOTICE 'Added foreign key: fk_payment_proposals_company_code';
    ELSE
        RAISE NOTICE 'Foreign key already exists: fk_payment_proposals_company_code';
    END IF;
END $$;

-- Add foreign key to vendor_invoices in payment_proposal_items
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'fk_proposal_items_invoice'
    ) THEN
        ALTER TABLE payment_proposal_items
        ADD CONSTRAINT fk_proposal_items_invoice
        FOREIGN KEY (invoice_id) 
        REFERENCES vendor_invoices(id)
        ON DELETE NO ACTION
        ON UPDATE NO ACTION;
        
        RAISE NOTICE 'Added foreign key: fk_proposal_items_invoice';
    ELSE
        RAISE NOTICE 'Foreign key already exists: fk_proposal_items_invoice';
    END IF;
END $$;

-- Add foreign key to vendors in payment_proposal_items
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'fk_proposal_items_vendor'
    ) THEN
        ALTER TABLE payment_proposal_items
        ADD CONSTRAINT fk_proposal_items_vendor
        FOREIGN KEY (vendor_id) 
        REFERENCES vendors(id)
        ON DELETE NO ACTION
        ON UPDATE NO ACTION;
        
        RAISE NOTICE 'Added foreign key: fk_proposal_items_vendor';
    ELSE
        RAISE NOTICE 'Foreign key already exists: fk_proposal_items_vendor';
    END IF;
END $$;

-- Add foreign key to bank_accounts in payment_proposal_items (if column exists)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'payment_proposal_items' 
        AND column_name = 'bank_account_id'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'fk_proposal_items_bank_account'
        ) THEN
            ALTER TABLE payment_proposal_items
            ADD CONSTRAINT fk_proposal_items_bank_account
            FOREIGN KEY (bank_account_id) 
            REFERENCES bank_accounts(id)
            ON DELETE NO ACTION
            ON UPDATE NO ACTION;
            
            RAISE NOTICE 'Added foreign key: fk_proposal_items_bank_account';
        END IF;
    END IF;
END $$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_payment_proposals_company_code 
ON payment_proposals(company_code_id);

CREATE INDEX IF NOT EXISTS idx_payment_proposals_status 
ON payment_proposals(status);

CREATE INDEX IF NOT EXISTS idx_payment_proposals_date 
ON payment_proposals(payment_date);

CREATE INDEX IF NOT EXISTS idx_proposal_items_invoice 
ON payment_proposal_items(invoice_id);

CREATE INDEX IF NOT EXISTS idx_proposal_items_vendor 
ON payment_proposal_items(vendor_id);

CREATE INDEX IF NOT EXISTS idx_proposal_items_status 
ON payment_proposal_items(status);

-- Add comments
COMMENT ON TABLE payment_proposals IS 'Payment run proposals for batch payment processing';
COMMENT ON TABLE payment_proposal_items IS 'Individual invoices included in a payment proposal';
COMMENT ON COLUMN payment_proposals.payment_date IS 'Proposed payment execution date';
COMMENT ON COLUMN payment_proposal_items.exception_type IS 'Type of exception if invoice cannot be paid (e.g., blocked, missing bank account)';
