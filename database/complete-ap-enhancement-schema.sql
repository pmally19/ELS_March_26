-- Complete AP Enhancement System Database Schema
-- Supports all 31 functions: 12 Vendor Master + 19 Operational Functions
-- Created: 2025-07-01

-- ===================================
-- VENDOR MASTER ENHANCEMENT TABLES (12 Functions)
-- ===================================

-- Enhanced Vendor Master Records
CREATE TABLE IF NOT EXISTS enhanced_vendor_master (
    id SERIAL PRIMARY KEY,
    vendor_id INTEGER REFERENCES vendors(id),
    corporate_group_id INTEGER,
    authorization_group VARCHAR(50),
    industry_key VARCHAR(10),
    tax_office VARCHAR(50),
    vat_registration VARCHAR(50),
    withholding_tax_country VARCHAR(3),
    withholding_tax_type VARCHAR(10),
    withholding_tax_code VARCHAR(10),
    withholding_liable BOOLEAN DEFAULT false,
    exemption_number VARCHAR(50),
    exemption_percentage DECIMAL(5,2),
    exemption_reason VARCHAR(10),
    exemption_from DATE,
    exemption_to DATE,
    head_office_account VARCHAR(20),
    alternative_payee VARCHAR(20),
    cash_management_group VARCHAR(10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50),
    updated_by VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    change_flag VARCHAR(1) DEFAULT 'C' -- C=Create, U=Update, D=Delete
);

-- Corporate Groups for Vendor Hierarchy
CREATE TABLE IF NOT EXISTS vendor_corporate_groups (
    id SERIAL PRIMARY KEY,
    group_code VARCHAR(20) UNIQUE NOT NULL,
    group_name VARCHAR(100) NOT NULL,
    description TEXT,
    parent_group_id INTEGER REFERENCES vendor_corporate_groups(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50),
    updated_by VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    change_flag VARCHAR(1) DEFAULT 'C'
);

-- Enhanced Banking Details
CREATE TABLE IF NOT EXISTS vendor_banking_details (
    id SERIAL PRIMARY KEY,
    vendor_id INTEGER REFERENCES vendors(id),
    bank_country VARCHAR(3),
    bank_key VARCHAR(20),
    bank_account VARCHAR(50),
    iban VARCHAR(34),
    account_type VARCHAR(10), -- CK=Checking, SV=Savings
    bank_type_key VARCHAR(10),
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50),
    updated_by VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    change_flag VARCHAR(1) DEFAULT 'C'
);

-- Authorization Groups
CREATE TABLE IF NOT EXISTS vendor_authorization_groups (
    id SERIAL PRIMARY KEY,
    group_code VARCHAR(20) UNIQUE NOT NULL,
    group_name VARCHAR(100) NOT NULL,
    description TEXT,
    access_level INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50),
    updated_by VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    change_flag VARCHAR(1) DEFAULT 'C'
);

-- ===================================
-- OPERATIONAL FUNCTIONS TABLES (19 Functions)
-- ===================================

-- Enhanced Invoice Verification (6 Functions)
CREATE TABLE IF NOT EXISTS invoice_verification_workflow (
    id SERIAL PRIMARY KEY,
    invoice_id INTEGER,
    workflow_stage VARCHAR(50) NOT NULL, -- RECEIVED, VERIFIED, APPROVED, POSTED, REJECTED
    verification_type VARCHAR(50), -- THREE_WAY_MATCH, TWO_WAY_MATCH, MANUAL
    po_number VARCHAR(50),
    gr_number VARCHAR(50),
    invoice_number VARCHAR(50) NOT NULL,
    vendor_id INTEGER REFERENCES vendors(id),
    invoice_amount DECIMAL(15,2) NOT NULL,
    verification_status VARCHAR(20) DEFAULT 'PENDING',
    assigned_to VARCHAR(50),
    approval_level INTEGER DEFAULT 1,
    hold_reason VARCHAR(100),
    verification_notes TEXT,
    line_item_count INTEGER DEFAULT 0,
    matched_amount DECIMAL(15,2) DEFAULT 0,
    variance_amount DECIMAL(15,2) DEFAULT 0,
    tolerance_exceeded BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50),
    updated_by VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    change_flag VARCHAR(1) DEFAULT 'C'
);

-- Invoice Line Item Validation
CREATE TABLE IF NOT EXISTS invoice_line_validation (
    id SERIAL PRIMARY KEY,
    verification_id INTEGER REFERENCES invoice_verification_workflow(id),
    line_number INTEGER NOT NULL,
    material_code VARCHAR(50),
    description TEXT,
    quantity_invoiced DECIMAL(10,3),
    quantity_received DECIMAL(10,3),
    quantity_ordered DECIMAL(10,3),
    unit_price DECIMAL(15,4),
    line_amount DECIMAL(15,2),
    tax_amount DECIMAL(15,2),
    validation_status VARCHAR(20) DEFAULT 'PENDING', -- MATCHED, VARIANCE, BLOCKED
    variance_reason VARCHAR(100),
    tolerance_percentage DECIMAL(5,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50),
    updated_by VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    change_flag VARCHAR(1) DEFAULT 'C'
);

-- Enhanced Payment Processing (8 Functions)
CREATE TABLE IF NOT EXISTS payment_processing_center (
    id SERIAL PRIMARY KEY,
    payment_request_id VARCHAR(50) UNIQUE NOT NULL,
    vendor_id INTEGER REFERENCES vendors(id),
    payment_method VARCHAR(50), -- CHECK, WIRE, ACH, CARD
    payment_type VARCHAR(50), -- INVOICE, DOWN_PAYMENT, MANUAL, CLEARING
    payment_amount DECIMAL(15,2) NOT NULL,
    currency_code VARCHAR(3) DEFAULT 'USD',
    house_bank VARCHAR(20),
    payment_date DATE,
    due_date DATE,
    payment_terms VARCHAR(20),
    payment_status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, APPROVED, PROCESSED, REJECTED
    approval_workflow_id INTEGER,
    payment_block_reason VARCHAR(100),
    alternative_payee_id INTEGER,
    batch_id VARCHAR(50),
    payment_reference VARCHAR(100),
    processing_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50),
    updated_by VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    change_flag VARCHAR(1) DEFAULT 'C'
);

-- Payment Method Configuration
CREATE TABLE IF NOT EXISTS payment_method_config (
    id SERIAL PRIMARY KEY,
    method_code VARCHAR(20) UNIQUE NOT NULL,
    method_name VARCHAR(100) NOT NULL,
    description TEXT,
    house_bank VARCHAR(20),
    bank_account VARCHAR(50),
    routing_number VARCHAR(20),
    is_automatic BOOLEAN DEFAULT false,
    min_amount DECIMAL(15,2),
    max_amount DECIMAL(15,2),
    processing_days INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50),
    updated_by VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    change_flag VARCHAR(1) DEFAULT 'C'
);

-- Enhanced Clearing & Settlement (5 Functions)
CREATE TABLE IF NOT EXISTS clearing_settlement_hub (
    id SERIAL PRIMARY KEY,
    clearing_id VARCHAR(50) UNIQUE NOT NULL,
    vendor_id INTEGER REFERENCES vendors(id),
    clearing_type VARCHAR(50), -- AUTOMATIC, MANUAL, PARTIAL, RESET
    clearing_method VARCHAR(50), -- FIFO, LIFO, SPECIFIC, AMOUNT
    clearing_status VARCHAR(20) DEFAULT 'PENDING',
    total_debit_amount DECIMAL(15,2) DEFAULT 0,
    total_credit_amount DECIMAL(15,2) DEFAULT 0,
    clearing_difference DECIMAL(15,2) DEFAULT 0,
    difference_reason VARCHAR(100),
    clearing_date DATE,
    clearing_document VARCHAR(50),
    reversal_document VARCHAR(50),
    reversal_reason VARCHAR(100),
    items_cleared INTEGER DEFAULT 0,
    processing_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50),
    updated_by VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    change_flag VARCHAR(1) DEFAULT 'C'
);

-- Clearing Line Items
CREATE TABLE IF NOT EXISTS clearing_line_items (
    id SERIAL PRIMARY KEY,
    clearing_id INTEGER REFERENCES clearing_settlement_hub(id),
    document_number VARCHAR(50),
    document_type VARCHAR(10),
    posting_date DATE,
    amount DECIMAL(15,2),
    currency_code VARCHAR(3) DEFAULT 'USD',
    reference VARCHAR(100),
    clearing_status VARCHAR(20) DEFAULT 'OPEN', -- OPEN, CLEARED, PARTIAL
    clearing_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50),
    updated_by VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    change_flag VARCHAR(1) DEFAULT 'C'
);

-- ===================================
-- INDEXES FOR PERFORMANCE
-- ===================================

CREATE INDEX IF NOT EXISTS idx_enhanced_vendor_master_vendor_id ON enhanced_vendor_master(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_banking_details_vendor_id ON vendor_banking_details(vendor_id);
CREATE INDEX IF NOT EXISTS idx_invoice_verification_vendor_id ON invoice_verification_workflow(vendor_id);
CREATE INDEX IF NOT EXISTS idx_invoice_verification_status ON invoice_verification_workflow(verification_status);
CREATE INDEX IF NOT EXISTS idx_payment_processing_vendor_id ON payment_processing_center(vendor_id);
CREATE INDEX IF NOT EXISTS idx_payment_processing_status ON payment_processing_center(payment_status);
CREATE INDEX IF NOT EXISTS idx_clearing_settlement_vendor_id ON clearing_settlement_hub(vendor_id);
CREATE INDEX IF NOT EXISTS idx_clearing_settlement_status ON clearing_settlement_hub(clearing_status);

-- ===================================
-- TRIGGER FUNCTIONS FOR TIMESTAMP UPDATES
-- ===================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    NEW.change_flag = 'U';
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to all tables
CREATE TRIGGER update_enhanced_vendor_master_updated_at 
    BEFORE UPDATE ON enhanced_vendor_master 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vendor_corporate_groups_updated_at 
    BEFORE UPDATE ON vendor_corporate_groups 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vendor_banking_details_updated_at 
    BEFORE UPDATE ON vendor_banking_details 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vendor_authorization_groups_updated_at 
    BEFORE UPDATE ON vendor_authorization_groups 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoice_verification_workflow_updated_at 
    BEFORE UPDATE ON invoice_verification_workflow 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoice_line_validation_updated_at 
    BEFORE UPDATE ON invoice_line_validation 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_processing_center_updated_at 
    BEFORE UPDATE ON payment_processing_center 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_method_config_updated_at 
    BEFORE UPDATE ON payment_method_config 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clearing_settlement_hub_updated_at 
    BEFORE UPDATE ON clearing_settlement_hub 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clearing_line_items_updated_at 
    BEFORE UPDATE ON clearing_line_items 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert initial sample data for testing
INSERT INTO vendor_corporate_groups (group_code, group_name, description, created_by) VALUES
('CG001', 'Manufacturing Group', 'Global Manufacturing Suppliers', 'system'),
('CG002', 'Service Providers', 'Professional Service Vendors', 'system'),
('CG003', 'Technology Partners', 'IT and Technology Suppliers', 'system')
ON CONFLICT (group_code) DO NOTHING;

INSERT INTO vendor_authorization_groups (group_code, group_name, description, access_level, created_by) VALUES
('AUTH01', 'Standard Access', 'Standard vendor access level', 1, 'system'),
('AUTH02', 'Restricted Access', 'Restricted vendor access level', 2, 'system'),
('AUTH03', 'High Security', 'High security vendor access level', 3, 'system')
ON CONFLICT (group_code) DO NOTHING;

INSERT INTO payment_method_config (method_code, method_name, description, is_automatic, processing_days, created_by) VALUES
('CHECK', 'Check Payment', 'Physical check payment method', false, 3, 'system'),
('WIRE', 'Wire Transfer', 'Electronic wire transfer', true, 1, 'system'),
('ACH', 'ACH Transfer', 'Automated Clearing House transfer', true, 2, 'system'),
('CARD', 'Credit Card', 'Corporate credit card payment', false, 1, 'system')
ON CONFLICT (method_code) DO NOTHING;