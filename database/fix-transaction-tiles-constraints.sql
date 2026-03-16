-- FIX FOREIGN KEY CONSTRAINTS FOR TRANSACTION TILES
-- ================================================

-- Fix company_codes to remove foreign key constraints and use company_code directly
DROP TABLE IF EXISTS automatic_clearing CASCADE;
CREATE TABLE automatic_clearing (
    id SERIAL PRIMARY KEY,
    clearing_run VARCHAR(20) UNIQUE NOT NULL,
    run_date DATE NOT NULL,
    company_code VARCHAR(4) DEFAULT '1000',
    clearing_account VARCHAR(10),
    account_text VARCHAR(100),
    documents_processed INTEGER DEFAULT 0,
    documents_cleared INTEGER DEFAULT 0,
    documents_failed INTEGER DEFAULT 0,
    total_cleared_amount DECIMAL(15,2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'USD',
    clearing_method VARCHAR(20) DEFAULT 'Automatic',
    tolerance_group VARCHAR(20),
    status VARCHAR(20) DEFAULT 'Pending',
    run_by VARCHAR(50),
    start_time TIMESTAMP,
    end_time TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    active BOOLEAN DEFAULT true
);

-- Fix asset accounting table with corrected column names
DROP TABLE IF EXISTS asset_accounting CASCADE;
CREATE TABLE asset_accounting (
    id SERIAL PRIMARY KEY,
    asset_number VARCHAR(12) UNIQUE NOT NULL,
    asset_class VARCHAR(8),
    asset_class_text VARCHAR(100),
    asset_description VARCHAR(100),
    company_code VARCHAR(4) DEFAULT '1000',
    capitalization_date DATE,
    acquisition_value DECIMAL(15,2) DEFAULT 0,
    accumulated_depreciation DECIMAL(15,2) DEFAULT 0,
    net_book_value DECIMAL(15,2) DEFAULT 0,
    depreciation_key VARCHAR(4),
    useful_life INTEGER,
    cost_center VARCHAR(10),
    plant VARCHAR(4),
    location VARCHAR(50),
    asset_status VARCHAR(20) DEFAULT 'Active',
    currency VARCHAR(3) DEFAULT 'USD',
    created_by VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    active BOOLEAN DEFAULT true
);

-- Create tax processing table
CREATE TABLE IF NOT EXISTS tax_processing (
    id SERIAL PRIMARY KEY,
    tax_code VARCHAR(10) UNIQUE NOT NULL,
    tax_description VARCHAR(100),
    tax_type VARCHAR(20),
    tax_rate DECIMAL(5,2),
    jurisdiction VARCHAR(50),
    effective_from DATE,
    effective_to DATE,
    company_code VARCHAR(4) DEFAULT '1000',
    gl_account_tax_payable VARCHAR(10),
    gl_account_tax_receivable VARCHAR(10),
    is_input_tax BOOLEAN DEFAULT false,
    is_output_tax BOOLEAN DEFAULT false,
    calculation_method VARCHAR(20) DEFAULT 'Standard',
    status VARCHAR(20) DEFAULT 'Active',
    created_by VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    active BOOLEAN DEFAULT true
);

-- Create credit management table without foreign key constraints
CREATE TABLE IF NOT EXISTS credit_management (
    id SERIAL PRIMARY KEY,
    customer_code VARCHAR(10),
    customer_name VARCHAR(100),
    credit_control_area VARCHAR(4),
    credit_limit DECIMAL(15,2),
    risk_category VARCHAR(10),
    payment_terms VARCHAR(4),
    dunning_procedure VARCHAR(4),
    credit_exposure DECIMAL(15,2) DEFAULT 0,
    available_credit DECIMAL(15,2) DEFAULT 0,
    credit_utilization DECIMAL(5,2) DEFAULT 0,
    last_credit_check DATE,
    credit_status VARCHAR(20) DEFAULT 'Active',
    blocked_orders INTEGER DEFAULT 0,
    overdue_amount DECIMAL(15,2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'USD',
    created_by VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    active BOOLEAN DEFAULT true
);

-- Fix goods receipts table with correct column names
DROP TABLE IF EXISTS goods_receipts CASCADE;
CREATE TABLE goods_receipts (
    id SERIAL PRIMARY KEY,
    receipt_number VARCHAR(20) UNIQUE NOT NULL,
    receipt_date DATE NOT NULL,
    posting_date DATE NOT NULL,
    purchase_order VARCHAR(20),
    vendor_code VARCHAR(10),
    vendor_name VARCHAR(100),
    plant VARCHAR(4),
    storage_location VARCHAR(4),
    movement_type VARCHAR(3) DEFAULT '101',
    material_number VARCHAR(18),
    material_description VARCHAR(100),
    quantity DECIMAL(13,3) DEFAULT 0,
    unit VARCHAR(3),
    unit_price DECIMAL(15,4) DEFAULT 0,
    total_amount DECIMAL(15,2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'USD',
    batch VARCHAR(10),
    quality_status VARCHAR(20) DEFAULT 'Unrestricted',
    gr_status VARCHAR(20) DEFAULT 'Posted',
    created_by VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    active BOOLEAN DEFAULT true
);

-- Create material documents table
CREATE TABLE IF NOT EXISTS material_documents (
    id SERIAL PRIMARY KEY,
    document_number VARCHAR(20) UNIQUE NOT NULL,
    document_date DATE NOT NULL,
    posting_date DATE NOT NULL,
    document_type VARCHAR(3),
    material_number VARCHAR(18),
    material_description VARCHAR(100),
    plant VARCHAR(4),
    storage_location VARCHAR(4),
    movement_type VARCHAR(3),
    movement_description VARCHAR(100),
    quantity DECIMAL(13,3) DEFAULT 0,
    unit VARCHAR(3),
    amount DECIMAL(15,2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'USD',
    purchase_order VARCHAR(20),
    vendor_code VARCHAR(10),
    customer_code VARCHAR(10),
    batch VARCHAR(10),
    stock_type VARCHAR(10) DEFAULT 'UNRESTRICTED',
    cost_center VARCHAR(10),
    gl_account VARCHAR(10),
    created_by VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    active BOOLEAN DEFAULT true
);

-- Create customer invoices table
CREATE TABLE IF NOT EXISTS customer_invoices (
    id SERIAL PRIMARY KEY,
    invoice_number VARCHAR(20) UNIQUE NOT NULL,
    billing_date DATE NOT NULL,
    sales_order VARCHAR(20),
    customer_code VARCHAR(10),
    customer_name VARCHAR(100),
    billing_type VARCHAR(4) DEFAULT 'F2',
    net_value DECIMAL(15,2) DEFAULT 0,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    gross_value DECIMAL(15,2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'USD',
    payment_terms VARCHAR(4),
    due_date DATE,
    invoice_status VARCHAR(10) DEFAULT 'OPEN',
    accounting_status VARCHAR(10) DEFAULT 'POSTED',
    plant VARCHAR(4),
    sales_organization VARCHAR(4),
    distribution_channel VARCHAR(2),
    division VARCHAR(2),
    created_by VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    active BOOLEAN DEFAULT true
);

-- Create vendor invoices table
CREATE TABLE IF NOT EXISTS vendor_invoices (
    id SERIAL PRIMARY KEY,
    invoice_number VARCHAR(20) UNIQUE NOT NULL,
    invoice_date DATE NOT NULL,
    posting_date DATE,
    vendor_code VARCHAR(10),
    vendor_name VARCHAR(100),
    purchase_order VARCHAR(20),
    invoice_reference VARCHAR(35),
    net_amount DECIMAL(15,2) DEFAULT 0,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    gross_amount DECIMAL(15,2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'USD',
    payment_terms VARCHAR(4),
    due_date DATE,
    payment_method VARCHAR(4),
    invoice_status VARCHAR(10) DEFAULT 'PARKED',
    payment_status VARCHAR(10) DEFAULT 'OPEN',
    company_code VARCHAR(4) DEFAULT '1000',
    created_by VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    active BOOLEAN DEFAULT true
);

-- INSERT CORRECTED SAMPLE DATA
-- ============================

-- Sample data for automatic_clearing
INSERT INTO automatic_clearing (clearing_run, run_date, company_code, clearing_account, account_text, documents_processed, documents_cleared, documents_failed, total_cleared_amount, status, run_by, start_time, end_time) VALUES
('CLR-2025-001', '2025-07-21', '1000', '130000', 'Trade Receivables', 45, 42, 3, 485000.00, 'Completed', 'SYSTEM.AUTO', '2025-07-21 02:00:00', '2025-07-21 02:15:00'),
('CLR-2025-002', '2025-07-21', '1000', '130000', 'Trade Receivables', 38, 35, 3, 298750.00, 'Completed', 'SYSTEM.AUTO', '2025-07-21 14:00:00', '2025-07-21 14:12:00'),
('CLR-2025-003', '2025-07-22', '1000', '210000', 'Trade Payables', 52, 50, 2, 678900.00, 'Running', 'SYSTEM.AUTO', '2025-07-22 02:00:00', NULL);

-- Sample data for asset_accounting
INSERT INTO asset_accounting (asset_number, asset_class, asset_class_text, asset_description, company_code, capitalization_date, acquisition_value, accumulated_depreciation, net_book_value, depreciation_key, useful_life, cost_center, plant, location, asset_status) VALUES
('100000000001', '3000', 'Building', 'Main Office Building', '1000', '2020-01-15', 2500000.00, 312500.00, 2187500.00, 'LIND', 25, 'CC-ADM', '1000', 'Head Office', 'Active'),
('100000000002', '3100', 'Machinery', 'Production Line A', '1000', '2022-06-01', 850000.00, 127500.00, 722500.00, 'LIND', 10, 'CC-PROD', '1000', 'Factory Floor', 'Active'),
('100000000003', '3200', 'IT Equipment', 'Server Infrastructure', '1000', '2023-03-15', 185000.00, 30833.33, 154166.67, 'LIND', 5, 'CC-IT', '1000', 'Data Center', 'Active');

-- Sample data for tax_processing
INSERT INTO tax_processing (tax_code, tax_description, tax_type, tax_rate, jurisdiction, effective_from, effective_to, company_code, gl_account_tax_payable, gl_account_tax_receivable, is_output_tax, status) VALUES
('V1', 'Standard VAT 10%', 'VAT', 10.00, 'Federal', '2025-01-01', '2025-12-31', '1000', '236000', '154000', true, 'Active'),
('V2', 'Reduced VAT 5%', 'VAT', 5.00, 'Federal', '2025-01-01', '2025-12-31', '1000', '236100', '154100', true, 'Active'),
('S1', 'State Sales Tax 7%', 'Sales Tax', 7.00, 'State', '2025-01-01', '2025-12-31', '1000', '237000', '155000', true, 'Active');

-- Sample data for credit_management
INSERT INTO credit_management (customer_code, customer_name, credit_control_area, credit_limit, risk_category, payment_terms, credit_exposure, available_credit, credit_utilization, last_credit_check, credit_status) VALUES
('CUST001', 'TechFlow Solutions Inc', '1000', 500000.00, 'A', 'Z001', 125000.00, 375000.00, 25.00, '2025-07-20', 'Active'),
('CUST002', 'GreenEarth Manufacturing', '1000', 250000.00, 'B', 'Z007', 98750.00, 151250.00, 39.50, '2025-07-19', 'Active'),
('CUST003', 'RetailMax Group', '1000', 750000.00, 'A', 'Z001', 456000.00, 294000.00, 60.80, '2025-07-18', 'Watch');

-- Sample data for goods_receipts
INSERT INTO goods_receipts (receipt_number, receipt_date, posting_date, purchase_order, vendor_code, vendor_name, plant, storage_location, material_number, material_description, quantity, unit, unit_price, total_amount, batch, gr_status) VALUES
('GR-2025-000001', '2025-07-21', '2025-07-21', 'PO-2025-001', 'VEND001', 'Industrial Supplies Corp', '1000', '0001', 'MAT-001', 'Industrial Paint System', 10.000, 'EA', 20000.0000, 200000.00, 'BATCH-001', 'Posted'),
('GR-2025-000002', '2025-07-20', '2025-07-20', 'PO-2025-002', 'VEND002', 'Steel Solutions Ltd', '1000', '0002', 'MAT-002', 'Steel Components', 50.000, 'KG', 125.5000, 6275.00, 'BATCH-002', 'Posted'),
('GR-2025-000003', '2025-07-19', '2025-07-19', 'PO-2025-003', 'VEND001', 'Chemical Supplies Inc', '1000', '0001', 'MAT-003', 'Chemical Supplies', 25.000, 'L', 85.0000, 2125.00, 'BATCH-003', 'Posted');

-- Sample data for material_documents
INSERT INTO material_documents (document_number, document_date, posting_date, document_type, material_number, material_description, plant, storage_location, movement_type, movement_description, quantity, unit, amount, purchase_order, batch, stock_type, cost_center, gl_account) VALUES
('MD-2025-000001', '2025-07-21', '2025-07-21', '601', 'MAT-001', 'Industrial Paint System', '1000', '0001', '101', 'GR from Purchase Order', 10.000, 'EA', 200000.00, 'PO-2025-001', 'BATCH-001', 'UNRESTRICTED', 'CC-PROD', '310100'),
('MD-2025-000002', '2025-07-20', '2025-07-20', '261', 'MAT-002', 'Steel Components', '1000', '0002', '261', 'Goods Issue to Order', -25.000, 'KG', -3137.50, NULL, 'BATCH-002', 'UNRESTRICTED', 'CC-PROD', '500100'),
('MD-2025-000003', '2025-07-19', '2025-07-19', '311', 'MAT-003', 'Chemical Supplies', '1000', '0001', '311', 'Stock Transfer', 15.000, 'L', 1275.00, NULL, 'BATCH-003', 'UNRESTRICTED', 'CC-CHEM', '310200');

-- Sample data for customer_invoices
INSERT INTO customer_invoices (invoice_number, billing_date, sales_order, customer_code, customer_name, net_value, tax_amount, gross_value, payment_terms, due_date, invoice_status, plant, sales_organization) VALUES
('CI-2025-000001', '2025-07-21', 'SO-2025-001', 'CUST001', 'TechFlow Solutions Inc', 125000.00, 12500.00, 137500.00, 'Z001', '2025-08-20', 'OPEN', '1000', '1000'),
('CI-2025-000002', '2025-07-20', 'SO-2025-002', 'CUST002', 'GreenEarth Manufacturing', 89750.00, 8975.00, 98725.00, 'Z007', '2025-08-05', 'OPEN', '1000', '1000'),
('CI-2025-000003', '2025-07-19', 'SO-2025-003', 'CUST003', 'RetailMax Group', 256000.00, 25600.00, 281600.00, 'Z001', '2025-08-18', 'PAID', '1000', '1000');

-- Sample data for vendor_invoices
INSERT INTO vendor_invoices (invoice_number, invoice_date, posting_date, vendor_code, vendor_name, purchase_order, invoice_reference, net_amount, tax_amount, gross_amount, payment_terms, due_date, invoice_status, payment_status, company_code) VALUES
('VI-2025-000001', '2025-07-21', '2025-07-21', 'VEND001', 'Industrial Supplies Corp', 'PO-2025-001', 'VENDOR-INV-001', 200000.00, 20000.00, 220000.00, 'Z001', '2025-08-20', 'POSTED', 'OPEN', '1000'),
('VI-2025-000002', '2025-07-20', '2025-07-20', 'VEND002', 'Steel Solutions Ltd', 'PO-2025-002', 'VENDOR-INV-002', 6275.00, 627.50, 6902.50, 'Z007', '2025-08-05', 'POSTED', 'OPEN', '1000'),
('VI-2025-000003', '2025-07-19', '2025-07-19', 'VEND001', 'Chemical Supplies Inc', 'PO-2025-003', 'VENDOR-INV-003', 2125.00, 212.50, 2337.50, 'Z001', '2025-08-18', 'POSTED', 'PAID', '1000');

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_automatic_clearing_run_date ON automatic_clearing(run_date);
CREATE INDEX IF NOT EXISTS idx_automatic_clearing_company_code ON automatic_clearing(company_code);
CREATE INDEX IF NOT EXISTS idx_asset_accounting_asset_number ON asset_accounting(asset_number);
CREATE INDEX IF NOT EXISTS idx_asset_accounting_company_code ON asset_accounting(company_code);
CREATE INDEX IF NOT EXISTS idx_tax_processing_tax_code ON tax_processing(tax_code);
CREATE INDEX IF NOT EXISTS idx_tax_processing_company_code ON tax_processing(company_code);
CREATE INDEX IF NOT EXISTS idx_credit_management_customer_code ON credit_management(customer_code);
CREATE INDEX IF NOT EXISTS idx_goods_receipts_posting_date ON goods_receipts(posting_date);
CREATE INDEX IF NOT EXISTS idx_goods_receipts_vendor_code ON goods_receipts(vendor_code);
CREATE INDEX IF NOT EXISTS idx_material_documents_posting_date ON material_documents(posting_date);
CREATE INDEX IF NOT EXISTS idx_material_documents_material_number ON material_documents(material_number);
CREATE INDEX IF NOT EXISTS idx_customer_invoices_billing_date ON customer_invoices(billing_date);
CREATE INDEX IF NOT EXISTS idx_customer_invoices_customer_code ON customer_invoices(customer_code);
CREATE INDEX IF NOT EXISTS idx_vendor_invoices_invoice_date ON vendor_invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_vendor_invoices_vendor_code ON vendor_invoices(vendor_code);