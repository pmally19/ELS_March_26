-- Enterprise Gigantic Tables Creation
-- Two comprehensive tables compressing maximum ERP functionality

-- 1. ENTERPRISE TRANSACTION REGISTRY - Complete Financial Transaction Management
CREATE TABLE IF NOT EXISTS enterprise_transaction_registry (
    id SERIAL PRIMARY KEY,
    transaction_uuid VARCHAR(50) UNIQUE NOT NULL,
    business_entity_code VARCHAR(20) NOT NULL,
    fiscal_period VARCHAR(10) NOT NULL,
    transaction_category VARCHAR(20) NOT NULL, -- SALES, PURCHASE, PRODUCTION, etc.
    source_application VARCHAR(50) NOT NULL,
    reference_document VARCHAR(50) NOT NULL,
    
    -- Financial Core
    primary_account VARCHAR(20) NOT NULL,
    offset_account VARCHAR(20),
    debit_amount DECIMAL(15,2) DEFAULT 0.00,
    credit_amount DECIMAL(15,2) DEFAULT 0.00,
    net_amount DECIMAL(15,2) NOT NULL,
    currency_code VARCHAR(5) DEFAULT 'USD',
    base_currency_amount DECIMAL(15,2) NOT NULL,
    tax_amount DECIMAL(15,2) DEFAULT 0.00,
    discount_amount DECIMAL(15,2) DEFAULT 0.00,
    
    -- Business Context
    customer_vendor_code VARCHAR(50),
    material_service_code VARCHAR(50),
    project_code VARCHAR(50),
    cost_center_code VARCHAR(50) NOT NULL,
    profit_center_code VARCHAR(50) NOT NULL,
    business_unit_code VARCHAR(50),
    
    -- Process Management
    processing_status VARCHAR(15) DEFAULT 'ACTIVE',
    approval_status VARCHAR(15) DEFAULT 'APPROVED',
    workflow_instance VARCHAR(50),
    
    -- Audit and Compliance
    business_date DATE NOT NULL,
    posting_date DATE NOT NULL,
    created_by INTEGER NOT NULL,
    created_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modified_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    version_number INTEGER DEFAULT 1,
    change_indicator VARCHAR(10) DEFAULT 'INSERT',
    
    -- Extended Attributes
    notes TEXT,
    custom_fields JSONB,
    external_reference VARCHAR(100),
    batch_identifier VARCHAR(50),
    
    -- Master Data Integration Columns
    company_master_ref VARCHAR(20),
    plant_master_ref VARCHAR(20),
    customer_master_ref VARCHAR(50),
    vendor_master_ref VARCHAR(50),
    material_master_ref VARCHAR(50),
    cost_center_master_ref VARCHAR(50),
    employee_master_ref VARCHAR(50),
    gl_account_master JSONB,
    organizational_hierarchy JSONB
);

-- 2. MATERIAL MOVEMENT REGISTRY - Complete Material Lifecycle Management
CREATE TABLE IF NOT EXISTS material_movement_registry (
    id SERIAL PRIMARY KEY,
    movement_uuid VARCHAR(50) UNIQUE NOT NULL,
    movement_sequence VARCHAR(50) NOT NULL,
    movement_category VARCHAR(20) NOT NULL, -- RECEIPT, ISSUE, TRANSFER
    movement_subcategory VARCHAR(30) NOT NULL,
    business_transaction_type VARCHAR(50) NOT NULL,
    
    -- Material Identification
    material_identifier VARCHAR(50) NOT NULL,
    material_description TEXT NOT NULL,
    material_specification JSONB,
    batch_identifier VARCHAR(50),
    serial_numbers TEXT[],
    
    -- Quantity and Location
    destination_location_code VARCHAR(50) NOT NULL,
    source_location_code VARCHAR(50),
    storage_zone_code VARCHAR(20),
    warehouse_section VARCHAR(20),
    movement_quantity DECIMAL(15,3) NOT NULL,
    base_unit_measure VARCHAR(10) NOT NULL,
    alternative_unit_measure VARCHAR(10),
    
    -- Valuation
    unit_valuation DECIMAL(15,4) NOT NULL,
    total_valuation DECIMAL(15,2) NOT NULL,
    standard_cost DECIMAL(15,4),
    moving_average_price DECIMAL(15,4),
    valuation_area VARCHAR(20),
    
    -- Business Partner and Document Context
    business_partner_code VARCHAR(50),
    originating_document VARCHAR(50) NOT NULL,
    line_item_number INTEGER,
    purchase_order_reference VARCHAR(50),
    sales_order_reference VARCHAR(50),
    production_order_reference VARCHAR(50),
    
    -- Quality and Compliance
    quality_status VARCHAR(20) DEFAULT 'RELEASED',
    inspection_required BOOLEAN DEFAULT FALSE,
    expiration_date DATE,
    manufacturing_date DATE,
    shelf_life_days INTEGER,
    
    -- Process Context
    processing_status VARCHAR(15) DEFAULT 'COMPLETED',
    movement_reason_code VARCHAR(20),
    cost_center_charging VARCHAR(50),
    asset_reference VARCHAR(50),
    
    -- Planning and Control
    reservation_number VARCHAR(50),
    requirement_tracking_number VARCHAR(50),
    project_allocation VARCHAR(50),
    
    -- Audit Trail
    execution_date DATE NOT NULL,
    posting_date DATE NOT NULL,
    effective_date DATE NOT NULL,
    created_by INTEGER NOT NULL,
    created_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    version_number INTEGER DEFAULT 1,
    
    -- Logistics and Transportation
    delivery_note VARCHAR(50),
    transportation_reference VARCHAR(50),
    carrier_information JSONB,
    packaging_details JSONB,
    
    -- Integration Fields
    external_system_reference VARCHAR(100),
    interface_status VARCHAR(20) DEFAULT 'SYNCHRONIZED',
    last_sync_timestamp TIMESTAMP,
    
    -- Extended Analytics
    movement_velocity_score DECIMAL(5,2),
    business_impact_rating VARCHAR(10),
    environmental_impact JSONB,
    
    -- Master Data Integration Columns
    plant_master_ref VARCHAR(20),
    material_master_ref VARCHAR(50),
    vendor_master_ref VARCHAR(50),
    customer_master_ref VARCHAR(50),
    work_center_master_ref VARCHAR(50),
    bom_master_ref VARCHAR(50),
    routing_master_ref VARCHAR(50),
    personnel_master_ref VARCHAR(50),
    master_data_enrichment JSONB,
    organizational_context JSONB
);

-- Create comprehensive indexes for performance
CREATE INDEX IF NOT EXISTS idx_etr_business_date ON enterprise_transaction_registry(business_date, transaction_category);
CREATE INDEX IF NOT EXISTS idx_etr_reference_doc ON enterprise_transaction_registry(reference_document);
CREATE INDEX IF NOT EXISTS idx_etr_entity_period ON enterprise_transaction_registry(business_entity_code, fiscal_period);
CREATE INDEX IF NOT EXISTS idx_etr_cost_center ON enterprise_transaction_registry(cost_center_code, profit_center_code);
CREATE INDEX IF NOT EXISTS idx_etr_processing ON enterprise_transaction_registry(processing_status, approval_status);
CREATE INDEX IF NOT EXISTS idx_etr_master_data ON enterprise_transaction_registry(company_master_ref, plant_master_ref, customer_master_ref, vendor_master_ref);
CREATE INDEX IF NOT EXISTS idx_etr_organizational ON enterprise_transaction_registry USING GIN(organizational_hierarchy);

CREATE INDEX IF NOT EXISTS idx_mmr_execution_date ON material_movement_registry(execution_date, movement_category);
CREATE INDEX IF NOT EXISTS idx_mmr_material ON material_movement_registry(material_identifier, destination_location_code);
CREATE INDEX IF NOT EXISTS idx_mmr_originating_doc ON material_movement_registry(originating_document);
CREATE INDEX IF NOT EXISTS idx_mmr_business_partner ON material_movement_registry(business_partner_code);
CREATE INDEX IF NOT EXISTS idx_mmr_processing ON material_movement_registry(processing_status, quality_status);
CREATE INDEX IF NOT EXISTS idx_mmr_master_data ON material_movement_registry(plant_master_ref, material_master_ref, work_center_master_ref);
CREATE INDEX IF NOT EXISTS idx_mmr_enrichment ON material_movement_registry USING GIN(master_data_enrichment);

-- Insert sample integrated data with master data
INSERT INTO enterprise_transaction_registry (
    transaction_uuid, business_entity_code, fiscal_period, transaction_category,
    source_application, reference_document, primary_account, offset_account,
    debit_amount, credit_amount, net_amount, base_currency_amount,
    customer_vendor_code, cost_center_code, profit_center_code,
    business_date, posting_date, created_by,
    company_master_ref, customer_master_ref, material_master_ref,
    gl_account_master, organizational_hierarchy
) VALUES 
('ETR-001', 'CORP01', '202506', 'SALES', 'SALES_APP', 'SO-001', 'ACC-110000', 'ACC-400000', 
 2750000.00, 0.00, 2750000.00, 2750000.00, 'CUST-001', 'CC-SALES', 'PC-COMMERCIAL',
 CURRENT_DATE, CURRENT_DATE, 1, 'CORP01', 'Global Manufacturing Corp', 'Luxury Vehicle Products',
 '{"primary_account_name": "Accounts Receivable", "account_type": "ASSET", "account_group": "RECEIVABLES"}',
 '{"business_area": "COMMERCIAL_OPERATIONS", "reporting_segment": "MAJOR_TRANSACTIONS"}'),

('ETR-002', 'CORP01', '202506', 'SALES', 'SALES_APP', 'SO-001', 'ACC-400000', 'ACC-110000',
 0.00, 2750000.00, -2750000.00, -2750000.00, 'CUST-001', 'CC-SALES', 'PC-COMMERCIAL',
 CURRENT_DATE, CURRENT_DATE, 1, 'CORP01', 'Global Manufacturing Corp', 'Luxury Vehicle Products',
 '{"primary_account_name": "Sales Revenue", "account_type": "REVENUE", "account_group": "REVENUE"}',
 '{"business_area": "COMMERCIAL_OPERATIONS", "reporting_segment": "MAJOR_TRANSACTIONS"}'),

('ETR-003', 'CORP01', '202506', 'PURCHASE', 'PURCHASE_APP', 'PO-001', 'ACC-140000', 'ACC-191100',
 125500.00, 0.00, 125500.00, 125500.00, 'VEND-001', 'CC-PURCHASE', 'PC-OPERATIONS',
 CURRENT_DATE, CURRENT_DATE, 1, 'CORP01', 'Premium Steel Corporation', 'Raw Materials & Components',
 '{"primary_account_name": "Raw Materials Inventory", "account_type": "ASSET", "account_group": "INVENTORY"}',
 '{"business_area": "PROCUREMENT_OPERATIONS", "reporting_segment": "SIGNIFICANT_TRANSACTIONS"}');

INSERT INTO material_movement_registry (
    movement_uuid, movement_sequence, movement_category, movement_subcategory,
    business_transaction_type, material_identifier, material_description,
    destination_location_code, movement_quantity, base_unit_measure,
    unit_valuation, total_valuation, originating_document,
    execution_date, posting_date, effective_date, created_by,
    plant_master_ref, material_master_ref, customer_master_ref,
    master_data_enrichment, organizational_context
) VALUES 
('MMR-001', 'MVT-001', 'RECEIPT', 'VENDOR_DELIVERY', 'VENDOR_INVOICE_RECEIPT',
 'MAT-STEEL-001', 'High-Grade Steel Plate', 'WH-001-A1', 1000.000, 'KG',
 125.5000, 125500.00, 'PO-001', CURRENT_DATE, CURRENT_DATE, CURRENT_DATE, 1,
 'MAIN_PLANT', 'High-Grade Steel Plate', NULL,
 '{"material_classification": "RAW_MATERIAL", "business_impact": "MEDIUM_VALUE", "quality_requirements": "INCOMING_INSPECTION_REQUIRED"}',
 '{"operational_area": "INBOUND_LOGISTICS", "value_stream": "PROCUREMENT_STREAM", "cost_allocation": "INVENTORY_COST"}'),

('MMR-002', 'MVT-002', 'ISSUE', 'PRODUCTION_CONSUMPTION', 'MFG_CONSUMPTION',
 'MAT-STEEL-001', 'High-Grade Steel Plate', 'WH-001-A1', -800.000, 'KG',
 125.5000, -100400.00, 'WO-001', CURRENT_DATE, CURRENT_DATE, CURRENT_DATE, 1,
 'MAIN_PLANT', 'High-Grade Steel Plate', NULL,
 '{"material_classification": "RAW_MATERIAL", "business_impact": "MEDIUM_VALUE", "quality_requirements": "QUALITY_RELEASE_REQUIRED"}',
 '{"operational_area": "OUTBOUND_LOGISTICS", "value_stream": "PRODUCTION_STREAM", "cost_allocation": "CONSUMPTION_COST"}'),

('MMR-003', 'MVT-003', 'RECEIPT', 'PRODUCTION_OUTPUT', 'MFG_COMPLETION',
 'MAT-VEHICLE-001', 'Luxury Sedan Model X', 'WH-002-FG', 25.000, 'EA',
 55000.0000, 1375000.00, 'WO-001', CURRENT_DATE, CURRENT_DATE, CURRENT_DATE, 1,
 'MAIN_PLANT', 'Luxury Sedan Model X', NULL,
 '{"material_classification": "FINISHED_GOOD", "business_impact": "HIGH_VALUE", "quality_requirements": "FINAL_INSPECTION"}',
 '{"operational_area": "INBOUND_LOGISTICS", "value_stream": "PRODUCTION_STREAM", "cost_allocation": "INVENTORY_COST"}'),

('MMR-004', 'MVT-004', 'ISSUE', 'CUSTOMER_DELIVERY', 'CUSTOMER_SHIPMENT',
 'MAT-VEHICLE-001', 'Luxury Sedan Model X', 'WH-002-FG', -20.000, 'EA',
 55000.0000, -1100000.00, 'SO-001', CURRENT_DATE, CURRENT_DATE, CURRENT_DATE, 1,
 'MAIN_PLANT', 'Luxury Sedan Model X', 'Global Manufacturing Corp',
 '{"material_classification": "FINISHED_GOOD", "business_impact": "HIGH_VALUE", "quality_requirements": "SHIPPING_INSPECTION"}',
 '{"operational_area": "OUTBOUND_LOGISTICS", "value_stream": "SALES_STREAM", "cost_allocation": "CONSUMPTION_COST"}");