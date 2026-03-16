-- Migration: Create AP Debit Memos Tables
-- Version: 1012
-- Description: Creates tables for AP debit memos (vendor claims, returns to vendor)

-- ============================================================================
-- AP Debit Memo Header Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS ap_debit_memos (
    id SERIAL PRIMARY KEY,
    debit_memo_number VARCHAR(50) NOT NULL UNIQUE,
    
    -- References
    vendor_id INTEGER NOT NULL,
    purchase_order_id INTEGER,
    vendor_invoice_id INTEGER,
    goods_receipt_id INTEGER,
    
    -- Dates
    debit_memo_date DATE DEFAULT CURRENT_DATE NOT NULL,
    posting_date DATE,
    baseline_date DATE,
    
    -- Amounts
    amount NUMERIC(15,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    tax_amount NUMERIC(15,2) DEFAULT 0,
    net_amount NUMERIC(15,2),
    
    -- Document Processing
    document_type VARCHAR(10) DEFAULT 'DR',
    posting_status VARCHAR(20) DEFAULT 'DRAFT' NOT NULL,
    posted_document_number VARCHAR(50),
    
    -- Business Context
    reason_code VARCHAR(10),
    reason_description TEXT,
    payment_terms VARCHAR(20),
    reference VARCHAR(100),
    notes TEXT,
    
    -- Organization
    company_code_id INTEGER,
    purchasing_org_id INTEGER,
    plant_id INTEGER,
    
    -- Audit Fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER,
    active BOOLEAN DEFAULT TRUE,
    
    -- Constraints
    CONSTRAINT chk_ap_debit_memo_status CHECK (
        posting_status IN ('DRAFT', 'POSTED', 'CANCELLED', 'REVERSED')
    ),
    CONSTRAINT chk_ap_debit_memo_amounts CHECK (
        amount >= 0 AND (tax_amount IS NULL OR tax_amount >= 0)
    )
);

-- ============================================================================
-- AP Debit Memo Items Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS ap_debit_memo_items (
    id SERIAL PRIMARY KEY,
    debit_memo_id INTEGER NOT NULL,
    
    -- Line Item Data
    line_number INTEGER DEFAULT 1,
    purchase_order_item_id INTEGER,
    goods_receipt_item_id INTEGER,
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
    
    -- Foreign Keys
    CONSTRAINT fk_ap_debit_memo_items_header 
        FOREIGN KEY (debit_memo_id) 
        REFERENCES ap_debit_memos(id) 
        ON DELETE CASCADE,
    
    -- Constraints
    CONSTRAINT chk_ap_debit_item_amounts CHECK (
        total_amount >= 0 AND tax_amount >= 0
    )
);

-- ============================================================================
-- Indexes for Performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_ap_debit_memos_vendor 
    ON ap_debit_memos(vendor_id);

CREATE INDEX IF NOT EXISTS idx_ap_debit_memos_status 
    ON ap_debit_memos(posting_status);

CREATE INDEX IF NOT EXISTS idx_ap_debit_memos_date 
    ON ap_debit_memos(debit_memo_date);

CREATE INDEX IF NOT EXISTS idx_ap_debit_memos_number 
    ON ap_debit_memos(debit_memo_number);

CREATE INDEX IF NOT EXISTS idx_ap_debit_memos_po 
    ON ap_debit_memos(purchase_order_id);

CREATE INDEX IF NOT EXISTS idx_ap_debit_memo_items_header 
    ON ap_debit_memo_items(debit_memo_id);

CREATE INDEX IF NOT EXISTS idx_ap_debit_memo_items_material 
    ON ap_debit_memo_items(material_id);

-- ============================================================================
-- Comments for Documentation
-- ============================================================================
COMMENT ON TABLE ap_debit_memos IS 
    'AP debit memos for vendor claims (quality issues, shortages, returns to vendor)';

COMMENT ON TABLE ap_debit_memo_items IS 
    'Line items for AP debit memos with material details and accounting assignments';

COMMENT ON COLUMN ap_debit_memos.debit_memo_number IS 
    'Unique debit memo number generated from sequence (e.g., APDM-2025-000001)';

COMMENT ON COLUMN ap_debit_memos.reason_code IS 
    'Reason for debit memo: QUALITY, SHORTAGE, RETURN, PRICE_ERR, OTHER';

COMMENT ON COLUMN ap_debit_memos.posting_status IS 
    'Status: DRAFT (editable), POSTED (sent to GL), CANCELLED, REVERSED';

COMMENT ON COLUMN ap_debit_memos.amount IS 
    'Amount to be debited from vendor (reduces AP liability)';
