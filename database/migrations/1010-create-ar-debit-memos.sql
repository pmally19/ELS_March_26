-- Migration: Create AR Debit Memos Tables
-- Version: 1010
-- Description: Creates tables for AR debit memos (additional customer charges)

-- ============================================================================
-- AR Debit Memo Header Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS debit_memos (
    id SERIAL PRIMARY KEY,
    debit_memo_number VARCHAR(50) NOT NULL UNIQUE,
    
    -- References
    customer_id INTEGER NOT NULL,
    billing_document_id INTEGER,
    sales_order_id INTEGER,
    
    -- Dates
    debit_date DATE DEFAULT CURRENT_DATE NOT NULL,
    due_date DATE,
    posting_date DATE,
    
    -- Amounts
    total_amount NUMERIC(15,2) NOT NULL,
    tax_amount NUMERIC(15,2) DEFAULT 0,
    net_amount NUMERIC(15,2),
    currency VARCHAR(3) DEFAULT 'USD',
    
    -- Status and Processing
    posting_status VARCHAR(20) DEFAULT 'DRAFT' NOT NULL,
    accounting_document_number VARCHAR(50),
    
    -- Business Context
    reason_code VARCHAR(10),
    reason_description TEXT,
    reference VARCHAR(100),
    notes TEXT,
    
    -- Organization
    company_code_id INTEGER,
    plant_id INTEGER,
    
    -- Audit Fields
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER,
    active BOOLEAN DEFAULT TRUE,
    
    -- Constraints
    CONSTRAINT chk_debit_memo_status CHECK (
        posting_status IN ('DRAFT', 'POSTED', 'CANCELLED', 'REVERSED')
    ),
    CONSTRAINT chk_debit_memo_amounts CHECK (
        total_amount >= 0 AND tax_amount >= 0
    )
);

-- ============================================================================
-- AR Debit Memo Items Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS debit_memo_items (
    id SERIAL PRIMARY KEY,
    debit_memo_id INTEGER NOT NULL,
    
    -- Line Item Data
    line_number INTEGER DEFAULT 1,
    billing_item_id INTEGER,
    product_id INTEGER,
    material_id INTEGER,
    description TEXT,
    
    -- Quantities and Pricing
    quantity NUMERIC(15,3) DEFAULT 1,
    unit_of_measure VARCHAR(3),
    unit_price NUMERIC(15,2),
    total_amount NUMERIC(15,2) NOT NULL,
    tax_amount NUMERIC(15,2) DEFAULT 0,
    tax_code VARCHAR(2),
    
    -- Accounting Assignment
    gl_account_id INTEGER,
    cost_center_id INTEGER,
    profit_center_id INTEGER,
    
    -- Audit
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    CONSTRAINT fk_debit_memo_items_header 
        FOREIGN KEY (debit_memo_id) 
        REFERENCES debit_memos(id) 
        ON DELETE CASCADE,
    
    -- Constraints
    CONSTRAINT chk_debit_item_amounts CHECK (
        total_amount >= 0 AND tax_amount >= 0 AND quantity > 0
    )
);

-- ============================================================================
-- Indexes for Performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_debit_memos_customer 
    ON debit_memos(customer_id);

CREATE INDEX IF NOT EXISTS idx_debit_memos_status 
    ON debit_memos(posting_status);

CREATE INDEX IF NOT EXISTS idx_debit_memos_date 
    ON debit_memos(debit_date);

CREATE INDEX IF NOT EXISTS idx_debit_memos_number 
    ON debit_memos(debit_memo_number);

CREATE INDEX IF NOT EXISTS idx_debit_memos_company 
    ON debit_memos(company_code_id);

CREATE INDEX IF NOT EXISTS idx_debit_memo_items_header 
    ON debit_memo_items(debit_memo_id);

CREATE INDEX IF NOT EXISTS idx_debit_memo_items_product 
    ON debit_memo_items(product_id);

CREATE INDEX IF NOT EXISTS idx_debit_memo_items_material 
    ON debit_memo_items(material_id);

-- ============================================================================
-- Comments for Documentation
-- ============================================================================
COMMENT ON TABLE debit_memos IS 
    'AR debit memos for additional customer charges (freight, restocking fees, price adjustments, late fees)';

COMMENT ON TABLE debit_memo_items IS 
    'Line items for AR debit memos with product/material details and accounting assignments';

COMMENT ON COLUMN debit_memos.debit_memo_number IS 
    'Unique debit memo number generated from sequence (e.g., DM-2025-000001)';

COMMENT ON COLUMN debit_memos.reason_code IS 
    'Reason for debit memo: FREIGHT, RESTOCK, PRICE_ADJ, LATE_FEE, OTHER';

COMMENT ON COLUMN debit_memos.posting_status IS 
    'Status: DRAFT (editable), POSTED (sent to GL), CANCELLED, REVERSED';
