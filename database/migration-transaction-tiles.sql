-- =============================================
-- TRANSACTION TILES DATABASE MIGRATION
-- Converting all mock data to database tables
-- =============================================

-- 1. AUTOMATIC CLEARING TABLE
CREATE TABLE IF NOT EXISTS automatic_clearing (
    id SERIAL PRIMARY KEY,
    clearing_run VARCHAR(20) UNIQUE NOT NULL,
    run_date DATE NOT NULL,
    company_code_id INTEGER REFERENCES company_codes(id),
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

-- 2. ASSET ACCOUNTING TABLE
CREATE TABLE IF NOT EXISTS asset_accounting (
    id SERIAL PRIMARY KEY,
    asset_number VARCHAR(12) UNIQUE NOT NULL,
    asset_class VARCHAR(8),
    asset_class_description VARCHAR(100),
    asset_description VARCHAR(100),
    company_code_id INTEGER REFERENCES company_codes(id),
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

-- 3. TAX PROCESSING TABLE
CREATE TABLE IF NOT EXISTS tax_processing (
    id SERIAL PRIMARY KEY,
    tax_code VARCHAR(10) UNIQUE NOT NULL,
    tax_description VARCHAR(100),
    tax_type VARCHAR(20),
    tax_rate DECIMAL(5,2),
    jurisdiction VARCHAR(50),
    effective_from DATE,
    effective_to DATE,
    company_code_id INTEGER REFERENCES company_codes(id),
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

-- 4. CREDIT MANAGEMENT TABLE
CREATE TABLE IF NOT EXISTS credit_management (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id),
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

-- 5. GOODS RECEIPTS TABLE
CREATE TABLE IF NOT EXISTS goods_receipts (
    id SERIAL PRIMARY KEY,
    receipt_number VARCHAR(20) UNIQUE NOT NULL,
    document_date DATE NOT NULL,
    posting_date DATE NOT NULL,
    purchase_order VARCHAR(20),
    vendor_id INTEGER REFERENCES vendors(id),
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

-- 6. MATERIAL DOCUMENTS TABLE
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
    vendor_id INTEGER REFERENCES vendors(id),
    customer_id INTEGER REFERENCES customers(id),
    batch VARCHAR(10),
    stock_type VARCHAR(10) DEFAULT 'UNRESTRICTED',
    cost_center VARCHAR(10),
    gl_account VARCHAR(10),
    created_by VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    active BOOLEAN DEFAULT true
);

-- 7. WORK ORDERS TABLE
CREATE TABLE IF NOT EXISTS work_orders (
    id SERIAL PRIMARY KEY,
    work_order_number VARCHAR(12) UNIQUE NOT NULL,
    work_order_type VARCHAR(4) DEFAULT 'PM01',
    description VARCHAR(100),
    equipment_number VARCHAR(18),
    functional_location VARCHAR(30),
    plant VARCHAR(4),
    maintenance_activity_type VARCHAR(4),
    priority VARCHAR(1) DEFAULT '3',
    order_status VARCHAR(10) DEFAULT 'CRTD',
    system_status VARCHAR(10) DEFAULT 'CRTD',
    user_status VARCHAR(10),
    created_by VARCHAR(50),
    requested_start_date DATE,
    requested_end_date DATE,
    actual_start_date DATE,
    actual_end_date DATE,
    work_center VARCHAR(8),
    planner_group VARCHAR(3),
    estimated_cost DECIMAL(15,2) DEFAULT 0,
    actual_cost DECIMAL(15,2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'USD',
    completion_percentage DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    active BOOLEAN DEFAULT true
);

-- 8. CUSTOMER INVOICES TABLE
CREATE TABLE IF NOT EXISTS customer_invoices (
    id SERIAL PRIMARY KEY,
    invoice_number VARCHAR(20) UNIQUE NOT NULL,
    billing_date DATE NOT NULL,
    sales_order VARCHAR(20),
    customer_id INTEGER REFERENCES customers(id),
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

-- 9. VENDOR INVOICES TABLE
CREATE TABLE IF NOT EXISTS vendor_invoices (
    id SERIAL PRIMARY KEY,
    invoice_number VARCHAR(20) UNIQUE NOT NULL,
    invoice_date DATE NOT NULL,
    posting_date DATE,
    vendor_id INTEGER REFERENCES vendors(id),
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
    company_code_id INTEGER REFERENCES company_codes(id),
    created_by VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    active BOOLEAN DEFAULT true
);

-- INSERT SAMPLE DATA FOR EACH TABLE
-- ==================================

-- Sample data for automatic_clearing
INSERT INTO automatic_clearing (clearing_run, run_date, clearing_account, account_text, documents_processed, documents_cleared, documents_failed, total_cleared_amount, status, run_by, start_time, end_time) VALUES
('CLR-2025-001', '2025-07-21', '130000', 'Trade Receivables', 45, 42, 3, 485000.00, 'Completed', 'SYSTEM.AUTO', '2025-07-21 02:00:00', '2025-07-21 02:15:00'),
('CLR-2025-002', '2025-07-21', '130000', 'Trade Receivables', 38, 35, 3, 298750.00, 'Completed', 'SYSTEM.AUTO', '2025-07-21 14:00:00', '2025-07-21 14:12:00'),
('CLR-2025-003', '2025-07-22', '210000', 'Trade Payables', 52, 50, 2, 678900.00, 'Running', 'SYSTEM.AUTO', '2025-07-22 02:00:00', NULL);

-- Sample data for asset_accounting
INSERT INTO asset_accounting (asset_number, asset_class, asset_class_description, asset_description, capitalization_date, acquisition_value, accumulated_depreciation, net_book_value, depreciation_key, useful_life, cost_center, plant, location, asset_status) VALUES
('100000000001', '3000', 'Building', 'Main Office Building', '2020-01-15', 2500000.00, 312500.00, 2187500.00, 'LIND', 25, 'CC-ADM', '1000', 'Head Office', 'Active'),
('100000000002', '3100', 'Machinery', 'Production Line A', '2022-06-01', 850000.00, 127500.00, 722500.00, 'LIND', 10, 'CC-PROD', '1000', 'Factory Floor', 'Active'),
('100000000003', '3200', 'IT Equipment', 'Server Infrastructure', '2023-03-15', 185000.00, 30833.33, 154166.67, 'LIND', 5, 'CC-IT', '1000', 'Data Center', 'Active');

-- Sample data for tax_processing
INSERT INTO tax_processing (tax_code, tax_description, tax_type, tax_rate, jurisdiction, effective_from, effective_to, gl_account_tax_payable, gl_account_tax_receivable, is_output_tax, status) VALUES
('V1', 'Standard VAT 10%', 'VAT', 10.00, 'Federal', '2025-01-01', '2025-12-31', '236000', '154000', true, 'Active'),
('V2', 'Reduced VAT 5%', 'VAT', 5.00, 'Federal', '2025-01-01', '2025-12-31', '236100', '154100', true, 'Active'),
('S1', 'State Sales Tax 7%', 'Sales Tax', 7.00, 'State', '2025-01-01', '2025-12-31', '237000', '155000', true, 'Active');

-- Sample data for credit_management (assuming customer IDs exist)
INSERT INTO credit_management (customer_id, credit_control_area, credit_limit, risk_category, payment_terms, credit_exposure, available_credit, credit_utilization, last_credit_check, credit_status) VALUES
(1, '1000', 500000.00, 'A', 'Z001', 125000.00, 375000.00, 25.00, '2025-07-20', 'Active'),
(2, '1000', 250000.00, 'B', 'Z007', 98750.00, 151250.00, 39.50, '2025-07-19', 'Active'),
(3, '1000', 750000.00, 'A', 'Z001', 456000.00, 294000.00, 60.80, '2025-07-18', 'Watch');

-- Sample data for goods_receipts (assuming vendor IDs exist)
INSERT INTO goods_receipts (receipt_number, document_date, posting_date, purchase_order, vendor_id, plant, storage_location, material_number, material_description, quantity, unit, unit_price, total_amount, batch, gr_status) VALUES
('GR-2025-000001', '2025-07-21', '2025-07-21', 'PO-2025-001', 1, '1000', '0001', 'MAT-001', 'Industrial Paint System', 10.000, 'EA', 20000.0000, 200000.00, 'BATCH-001', 'Posted'),
('GR-2025-000002', '2025-07-20', '2025-07-20', 'PO-2025-002', 2, '1000', '0002', 'MAT-002', 'Steel Components', 50.000, 'KG', 125.5000, 6275.00, 'BATCH-002', 'Posted'),
('GR-2025-000003', '2025-07-19', '2025-07-19', 'PO-2025-003', 1, '1000', '0001', 'MAT-003', 'Chemical Supplies', 25.000, 'L', 85.0000, 2125.00, 'BATCH-003', 'Posted');

-- Sample data for material_documents
INSERT INTO material_documents (document_number, document_date, posting_date, document_type, material_number, material_description, plant, storage_location, movement_type, movement_description, quantity, unit, amount, purchase_order, batch, stock_type, cost_center, gl_account) VALUES
('MD-2025-000001', '2025-07-21', '2025-07-21', '601', 'MAT-001', 'Industrial Paint System', '1000', '0001', '101', 'GR from Purchase Order', 10.000, 'EA', 200000.00, 'PO-2025-001', 'BATCH-001', 'UNRESTRICTED', 'CC-PROD', '310100'),
('MD-2025-000002', '2025-07-20', '2025-07-20', '261', 'MAT-002', 'Steel Components', '1000', '0002', '261', 'Goods Issue to Order', -25.000, 'KG', -3137.50, NULL, 'BATCH-002', 'UNRESTRICTED', 'CC-PROD', '500100'),
('MD-2025-000003', '2025-07-19', '2025-07-19', '311', 'MAT-003', 'Chemical Supplies', '1000', '0001', '311', 'Stock Transfer', 15.000, 'L', 1275.00, NULL, 'BATCH-003', 'UNRESTRICTED', 'CC-CHEM', '310200');

-- Sample data for work_orders
INSERT INTO work_orders (work_order_number, description, equipment_number, plant, priority, order_status, requested_start_date, requested_end_date, work_center, planner_group, estimated_cost) VALUES
('WO-PM-000001', 'Preventive Maintenance - Conveyor Belt', 'EQ-CONV-001', '1000', '3', 'REL', '2025-07-25', '2025-07-26', 'WC-MAINT', 'M01', 2500.00),
('WO-PM-000002', 'Emergency Repair - Hydraulic System', 'EQ-HYD-002', '1000', '1', 'REL', '2025-07-22', '2025-07-22', 'WC-MAINT', 'M01', 8500.00),
('WO-PM-000003', 'Annual Inspection - Safety Equipment', 'EQ-SAFE-001', '1000', '2', 'CRTD', '2025-07-30', '2025-07-31', 'WC-SAFE', 'S01', 1200.00);

-- Sample data for customer_invoices (assuming customer IDs exist)
INSERT INTO customer_invoices (invoice_number, billing_date, sales_order, customer_id, net_value, tax_amount, gross_value, payment_terms, due_date, invoice_status, plant, sales_organization) VALUES
('CI-2025-000001', '2025-07-21', 'SO-2025-001', 1, 125000.00, 12500.00, 137500.00, 'Z001', '2025-08-20', 'OPEN', '1000', '1000'),
('CI-2025-000002', '2025-07-20', 'SO-2025-002', 2, 89750.00, 8975.00, 98725.00, 'Z007', '2025-08-05', 'OPEN', '1000', '1000'),
('CI-2025-000003', '2025-07-19', 'SO-2025-003', 3, 256000.00, 25600.00, 281600.00, 'Z001', '2025-08-18', 'PAID', '1000', '1000');

-- Sample data for vendor_invoices (assuming vendor IDs exist)
INSERT INTO vendor_invoices (invoice_number, invoice_date, posting_date, vendor_id, purchase_order, invoice_reference, net_amount, tax_amount, gross_amount, payment_terms, due_date, invoice_status, payment_status) VALUES
('VI-2025-000001', '2025-07-21', '2025-07-21', 1, 'PO-2025-001', 'VENDOR-INV-001', 200000.00, 20000.00, 220000.00, 'Z001', '2025-08-20', 'POSTED', 'OPEN'),
('VI-2025-000002', '2025-07-20', '2025-07-20', 2, 'PO-2025-002', 'VENDOR-INV-002', 6275.00, 627.50, 6902.50, 'Z007', '2025-08-05', 'POSTED', 'OPEN'),
('VI-2025-000003', '2025-07-19', '2025-07-19', 1, 'PO-2025-003', 'VENDOR-INV-003', 2125.00, 212.50, 2337.50, 'Z001', '2025-08-18', 'POSTED', 'PAID');

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_automatic_clearing_run_date ON automatic_clearing(run_date);
CREATE INDEX IF NOT EXISTS idx_asset_accounting_asset_number ON asset_accounting(asset_number);
CREATE INDEX IF NOT EXISTS idx_tax_processing_tax_code ON tax_processing(tax_code);
CREATE INDEX IF NOT EXISTS idx_credit_management_customer ON credit_management(customer_id);
CREATE INDEX IF NOT EXISTS idx_goods_receipts_posting_date ON goods_receipts(posting_date);
CREATE INDEX IF NOT EXISTS idx_material_documents_posting_date ON material_documents(posting_date);
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON work_orders(order_status);
CREATE INDEX IF NOT EXISTS idx_customer_invoices_billing_date ON customer_invoices(billing_date);
CREATE INDEX IF NOT EXISTS idx_vendor_invoices_invoice_date ON vendor_invoices(invoice_date);