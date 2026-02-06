-- AP Enhancement Database Schema
-- New tables for additional AP functionality identified in gap analysis
-- All tables are NEW ADDITIONS - existing AP functionality remains unchanged

-- 1. Enhanced Vendor Master Data (Section 1.1-1.6 from document)
CREATE TABLE IF NOT EXISTS ap_vendor_master_extended (
    id SERIAL PRIMARY KEY,
    vendor_id INTEGER REFERENCES erp_vendors(id),
    
    -- Authorization and Corporate Structure
    authorization_group VARCHAR(10),
    corporate_group VARCHAR(50),
    
    -- Tax Information 
    tax_office VARCHAR(50),
    tax_number VARCHAR(50),
    vat_registration_number VARCHAR(50),
    industry_key VARCHAR(10),
    
    -- Banking Information
    bank_country VARCHAR(2),
    bank_key VARCHAR(50),
    bank_account VARCHAR(50),
    iban VARCHAR(34),
    account_type VARCHAR(10),
    bank_type_key VARCHAR(4),
    
    -- Payment Configuration
    payment_terms VARCHAR(20),
    check_double_invoice BOOLEAN DEFAULT false,
    payment_methods TEXT[], -- Array of allowed payment methods
    alternative_payee INTEGER,
    payment_block VARCHAR(1),
    house_bank VARCHAR(5),
    
    -- Withholding Tax Setup
    wh_tax_country VARCHAR(2),
    wh_tax_type VARCHAR(2),
    wh_tax_code VARCHAR(2),
    wh_tax_liable BOOLEAN DEFAULT false,
    exemption_number VARCHAR(50),
    exemption_percentage NUMERIC(5,2),
    exemption_reason VARCHAR(2),
    exemption_from DATE,
    exemption_to DATE,
    
    -- Blocking and Status Management
    blocked_all_company_codes BOOLEAN DEFAULT false,
    blocked_selected_company_code BOOLEAN DEFAULT false,
    blocked_all_purchasing_org BOOLEAN DEFAULT false,
    block_quality_reason VARCHAR(50),
    deletion_flag_all_areas BOOLEAN DEFAULT false,
    deletion_flag_company_code BOOLEAN DEFAULT false,
    deletion_flag_purchasing_org BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    active BOOLEAN DEFAULT true
);

-- 2. Vendor Change Tracking (Section 1.4 from document)
CREATE TABLE IF NOT EXISTS ap_vendor_changes (
    id SERIAL PRIMARY KEY,
    vendor_id INTEGER REFERENCES erp_vendors(id),
    change_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    changed_by VARCHAR(50),
    table_name VARCHAR(50),
    field_name VARCHAR(50),
    field_description VARCHAR(100),
    old_value TEXT,
    new_value TEXT,
    change_type VARCHAR(20), -- 'insert', 'update', 'delete'
    sensitive_field BOOLEAN DEFAULT false,
    company_code_specific BOOLEAN DEFAULT false,
    active BOOLEAN DEFAULT true
);

-- 3. Document Parking (Section 1.9 from document)
CREATE TABLE IF NOT EXISTS ap_document_parking (
    id SERIAL PRIMARY KEY,
    document_number VARCHAR(50) UNIQUE,
    vendor_id INTEGER REFERENCES erp_vendors(id),
    document_type VARCHAR(10) DEFAULT 'KR',
    document_date DATE NOT NULL,
    posting_date DATE NOT NULL,
    company_code VARCHAR(10),
    currency VARCHAR(3),
    
    -- Header Information
    invoice_date DATE,
    reference VARCHAR(50),
    amount NUMERIC(15,2),
    calculate_tax BOOLEAN DEFAULT false,
    payment_terms VARCHAR(20),
    baseline_date DATE,
    document_header_text TEXT,
    
    -- Special G/L Indicators
    special_gl_indicator VARCHAR(2),
    
    -- Parking Status
    parked_by VARCHAR(50),
    parked_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'parked', -- 'parked', 'posted', 'deleted'
    incomplete_reason TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    active BOOLEAN DEFAULT true
);

-- 4. Document Parking Line Items
CREATE TABLE IF NOT EXISTS ap_document_parking_items (
    id SERIAL PRIMARY KEY,
    parking_document_id INTEGER REFERENCES ap_document_parking(id),
    line_number INTEGER,
    
    -- G/L Account Information
    gl_account VARCHAR(20),
    amount_document_currency NUMERIC(15,2),
    debit_credit VARCHAR(1), -- 'D' or 'C'
    tax_code VARCHAR(2),
    cost_center VARCHAR(20),
    
    -- Additional Fields
    invoice_reference VARCHAR(50),
    payment_block VARCHAR(1),
    payment_method VARCHAR(10),
    assignment_number VARCHAR(50),
    line_item_text TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    active BOOLEAN DEFAULT true
);

-- 5. Down Payment Management (Sections 1.12-1.14 from document)
CREATE TABLE IF NOT EXISTS ap_down_payments (
    id SERIAL PRIMARY KEY,
    request_document_number VARCHAR(50),
    payment_document_number VARCHAR(50),
    vendor_id INTEGER REFERENCES erp_vendors(id),
    
    -- Request Information
    request_date DATE,
    target_special_gl_indicator VARCHAR(2),
    down_payment_amount NUMERIC(15,2),
    due_date DATE,
    tax_code VARCHAR(2),
    
    -- Payment Information
    payment_date DATE,
    bank_account VARCHAR(50),
    clearing_document_number VARCHAR(50),
    clearing_date DATE,
    
    -- Status Management
    status VARCHAR(20) DEFAULT 'requested', -- 'requested', 'paid', 'cleared', 'cancelled'
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    active BOOLEAN DEFAULT true
);

-- 6. Manual Outgoing Payments (Section 1.11 from document)
CREATE TABLE IF NOT EXISTS ap_manual_payments (
    id SERIAL PRIMARY KEY,
    document_number VARCHAR(50),
    vendor_id INTEGER REFERENCES erp_vendors(id),
    
    -- Header Data
    document_date DATE,
    document_type VARCHAR(10) DEFAULT 'KZ',
    company_code VARCHAR(10),
    posting_date DATE,
    currency VARCHAR(3),
    
    -- Bank and Payment Info
    bank_account VARCHAR(50),
    payment_amount NUMERIC(15,2),
    value_date DATE,
    reference VARCHAR(50),
    document_header_text TEXT,
    clearing_text TEXT,
    
    -- Check Information (for manual checks)
    check_number VARCHAR(50),
    check_date DATE,
    manual_check BOOLEAN DEFAULT true,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    active BOOLEAN DEFAULT true
);

-- 7. Payment Blocking Management
CREATE TABLE IF NOT EXISTS ap_payment_blocks (
    id SERIAL PRIMARY KEY,
    vendor_id INTEGER REFERENCES erp_vendors(id),
    invoice_id INTEGER REFERENCES ap_invoices(id),
    
    -- Block Information
    block_type VARCHAR(20), -- 'manual', 'automatic', 'difference', 'random'
    block_reason VARCHAR(50),
    blocked_by VARCHAR(50),
    block_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Unblock Information
    unblocked_by VARCHAR(50),
    unblock_date TIMESTAMP,
    unblock_reason TEXT,
    
    -- Status
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'removed'
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    active BOOLEAN DEFAULT true
);

-- 8. Clearing Operations (Sections 1.15, 1.18 from document)
CREATE TABLE IF NOT EXISTS ap_clearing_operations (
    id SERIAL PRIMARY KEY,
    vendor_id INTEGER REFERENCES erp_vendors(id),
    clearing_document_number VARCHAR(50),
    
    -- Clearing Information
    clearing_date DATE,
    clearing_currency VARCHAR(3),
    cleared_by VARCHAR(50),
    
    -- Reset Information (for clearing reversals)
    reset_by VARCHAR(50),
    reset_date TIMESTAMP,
    reset_reason TEXT,
    
    -- Status
    operation_type VARCHAR(20), -- 'clear', 'reset'
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'reversed'
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    active BOOLEAN DEFAULT true
);

-- 9. Clearing Line Items
CREATE TABLE IF NOT EXISTS ap_clearing_line_items (
    id SERIAL PRIMARY KEY,
    clearing_operation_id INTEGER REFERENCES ap_clearing_operations(id),
    
    -- Document Reference
    document_number VARCHAR(50),
    line_item_number INTEGER,
    fiscal_year INTEGER,
    
    -- Amounts
    document_amount NUMERIC(15,2),
    clearing_amount NUMERIC(15,2),
    difference_amount NUMERIC(15,2),
    
    -- Selection Status
    selected_for_clearing BOOLEAN DEFAULT false,
    assignment_number VARCHAR(50),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    active BOOLEAN DEFAULT true
);

-- 10. Enhanced Credit Memo Processing (Section 1.8 from document)
CREATE TABLE IF NOT EXISTS ap_credit_memos (
    id SERIAL PRIMARY KEY,
    vendor_id INTEGER REFERENCES erp_vendors(id),
    
    -- Credit Memo Information
    credit_memo_number VARCHAR(50),
    invoice_reference VARCHAR(50), -- Reference to original invoice
    credit_memo_date DATE,
    posting_date DATE,
    amount NUMERIC(15,2),
    currency VARCHAR(3),
    
    -- Processing Information
    document_type VARCHAR(10) DEFAULT 'KG',
    payment_terms VARCHAR(20),
    baseline_date DATE,
    
    -- Status and Processing
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'posted', 'applied'
    posted_document_number VARCHAR(50),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    active BOOLEAN DEFAULT true
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ap_vendor_master_vendor_id ON ap_vendor_master_extended(vendor_id);
CREATE INDEX IF NOT EXISTS idx_ap_vendor_changes_vendor_id ON ap_vendor_changes(vendor_id);
CREATE INDEX IF NOT EXISTS idx_ap_vendor_changes_date ON ap_vendor_changes(change_date);
CREATE INDEX IF NOT EXISTS idx_ap_document_parking_vendor ON ap_document_parking(vendor_id);
CREATE INDEX IF NOT EXISTS idx_ap_document_parking_status ON ap_document_parking(status);
CREATE INDEX IF NOT EXISTS idx_ap_down_payments_vendor ON ap_down_payments(vendor_id);
CREATE INDEX IF NOT EXISTS idx_ap_down_payments_status ON ap_down_payments(status);
CREATE INDEX IF NOT EXISTS idx_ap_manual_payments_vendor ON ap_manual_payments(vendor_id);
CREATE INDEX IF NOT EXISTS idx_ap_payment_blocks_vendor ON ap_payment_blocks(vendor_id);
CREATE INDEX IF NOT EXISTS idx_ap_payment_blocks_status ON ap_payment_blocks(status);
CREATE INDEX IF NOT EXISTS idx_ap_clearing_ops_vendor ON ap_clearing_operations(vendor_id);
CREATE INDEX IF NOT EXISTS idx_ap_credit_memos_vendor ON ap_credit_memos(vendor_id);