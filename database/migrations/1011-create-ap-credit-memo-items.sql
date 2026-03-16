-- Migration: Create AP Credit Memo Items Table
-- Version: 1011
-- Description: Creates line items table for AP credit memos (vendor credit notes)
-- Note: The ap_credit_memos header table exists in ap-enhancements-schema.sql

-- ============================================================================
-- AP Credit Memo Items Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS ap_credit_memo_items (
    id SERIAL PRIMARY KEY,
    credit_memo_id INTEGER NOT NULL,
    
    -- Line Item Data
    line_number INTEGER DEFAULT 1,
    invoice_item_id INTEGER,
    purchase_order_item_id INTEGER,
    material_id INTEGER,
    description TEXT,
    
    -- Quantities and Pricing
    quantity NUMERIC(15,3),
    unit_of_measure VARCHAR(3),
    unit_price NUMERIC(15,2),
    total_amount NUMERIC(15,2) NOT NULL,
    
    -- Tax
    tax_code VARCHAR(2),
    tax_amount NUMERIC(15,2) DEFAULT 0,
    
    -- Accounting Assignment
    gl_account_id INTEGER,
    cost_center_id INTEGER,
    profit_center_id INTEGER,
    
    -- Audit
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT chk_ap_credit_item_amounts CHECK (
        total_amount >= 0 AND (tax_amount IS NULL OR tax_amount >= 0)
    )
);

-- ============================================================================
-- Foreign Key to Header (if ap_credit_memos exists)
-- ============================================================================
DO $$
BEGIN
    -- Only add foreign key if ap_credit_memos table exists
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'ap_credit_memos'
    ) THEN
        ALTER TABLE ap_credit_memo_items
        ADD CONSTRAINT fk_ap_credit_memo_items_header 
            FOREIGN KEY (credit_memo_id) 
            REFERENCES ap_credit_memos(id) 
            ON DELETE CASCADE;
    END IF;
END
$$;

-- ============================================================================
-- Indexes for Performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_ap_credit_memo_items_header 
    ON ap_credit_memo_items(credit_memo_id);

CREATE INDEX IF NOT EXISTS idx_ap_credit_memo_items_material 
    ON ap_credit_memo_items(material_id);

CREATE INDEX IF NOT EXISTS idx_ap_credit_memo_items_po_item 
    ON ap_credit_memo_items(purchase_order_item_id);

-- ============================================================================
-- Comments for Documentation
-- ============================================================================
COMMENT ON TABLE ap_credit_memo_items IS 
    'Line items for AP credit memos (vendor credit notes) with material details and accounting assignments';

COMMENT ON COLUMN ap_credit_memo_items.invoice_item_id IS 
    'Reference to original vendor invoice item being credited';

COMMENT ON COLUMN ap_credit_memo_items.total_amount IS 
    'Amount to be credited (positive value reduces AP liability)';
