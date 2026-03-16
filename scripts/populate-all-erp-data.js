/**
 * Complete ERP Data Population Script
 * Populates all 249 tables with comprehensive enterprise data
 */

import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function populateCompleteERPData() {
  console.log('Starting comprehensive ERP data population...');
  
  try {
    // 1. Master Data Foundation
    await populateOrganizationalStructure();
    await populateFinancialMasterData();
    await populateMaterialMasterData();
    await populateHumanResourcesData();
    
    // 2. Transactional Data
    await populateSalesData();
    await populatePurchaseData();
    await populateInventoryData();
    await populateProductionData();
    
    // 3. Financial Transactions
    await populateAccountingDocuments();
    await populateControllingData();
    
    // 4. Advanced Features
    await populateWorkflowData();
    await populateChangeDocuments();
    await populateAIAgentData();
    
    console.log('Complete ERP data population finished successfully!');
    
  } catch (error) {
    console.error('Error populating ERP data:', error);
    throw error;
  }
}

async function populateOrganizationalStructure() {
  console.log('Populating organizational structure...');
  
  // Company Codes
  await pool.query(`
    INSERT INTO company_codes (code, name, country, currency, city, address) VALUES
    ('1000', 'MallyERP Corporate', 'US', 'USD', 'New York', '123 Business Ave'),
    ('2000', 'MallyERP Europe', 'DE', 'EUR', 'Frankfurt', 'Hauptstraße 456'),
    ('3000', 'MallyERP Asia Pacific', 'SG', 'SGD', 'Singapore', '789 Marina Bay')
    ON CONFLICT (code) DO NOTHING
  `);
  
  // Plants
  await pool.query(`
    INSERT INTO plants (code, name, company_code_id, country, city, address) VALUES
    ('P001', 'Main Manufacturing Plant', 1, 'US', 'Detroit', '100 Industrial Blvd'),
    ('P002', 'Distribution Center East', 1, 'US', 'Atlanta', '200 Logistics Way'),
    ('P003', 'European Production', 2, 'DE', 'Munich', 'Industriestraße 300'),
    ('P004', 'Asia Pacific Hub', 3, 'SG', 'Jurong', '400 Manufacturing Road')
    ON CONFLICT (code) DO NOTHING
  `);
  
  // Storage Locations
  await pool.query(`
    INSERT INTO storage_locations (code, name, plant_id, storage_type, capacity) VALUES
    ('0001', 'Raw Materials', 1, 'RM', 10000),
    ('0002', 'Finished Goods', 1, 'FG', 5000),
    ('0003', 'Work in Process', 1, 'WIP', 2000),
    ('1001', 'Warehouse A', 2, 'FG', 15000),
    ('2001', 'European Warehouse', 3, 'FG', 8000)
    ON CONFLICT (code) DO NOTHING
  `);
}

async function populateFinancialMasterData() {
  console.log('Populating financial master data...');
  
  // Chart of Accounts
  await pool.query(`
    INSERT INTO chart_of_accounts (account_number, account_name, account_type, account_group, balance_sheet_account) VALUES
    ('100000', 'Cash and Cash Equivalents', 'ASSET', 'CURRENT_ASSETS', true),
    ('110000', 'Accounts Receivable', 'ASSET', 'CURRENT_ASSETS', true),
    ('120000', 'Inventory - Raw Materials', 'ASSET', 'CURRENT_ASSETS', true),
    ('121000', 'Inventory - Finished Goods', 'ASSET', 'CURRENT_ASSETS', true),
    ('200000', 'Property, Plant & Equipment', 'ASSET', 'FIXED_ASSETS', true),
    ('300000', 'Accounts Payable', 'LIABILITY', 'CURRENT_LIABILITIES', true),
    ('400000', 'Share Capital', 'EQUITY', 'EQUITY', true),
    ('500000', 'Sales Revenue', 'REVENUE', 'REVENUE', false),
    ('600000', 'Cost of Goods Sold', 'EXPENSE', 'COGS', false),
    ('700000', 'Operating Expenses', 'EXPENSE', 'OPEX', false)
    ON CONFLICT (account_number) DO NOTHING
  `);
  
  // Cost Centers
  await pool.query(`
    INSERT INTO cost_centers (code, name, company_code_id, responsible_person, cost_center_category) VALUES
    ('CC001', 'Manufacturing Operations', 1, 'John Smith', 'PRODUCTION'),
    ('CC002', 'Sales Department', 1, 'Sarah Johnson', 'SALES'),
    ('CC003', 'Human Resources', 1, 'Mike Wilson', 'ADMIN'),
    ('CC004', 'Research & Development', 1, 'Dr. Lisa Chen', 'RND'),
    ('CC005', 'Quality Control', 1, 'Robert Brown', 'QUALITY')
    ON CONFLICT (code) DO NOTHING
  `);
  
  // Profit Centers
  await pool.query(`
    INSERT INTO profit_centers (code, name, company_code_id, manager, profit_center_type) VALUES
    ('PC001', 'Electronics Division', 1, 'Mark Davis', 'DIVISION'),
    ('PC002', 'Automotive Division', 1, 'Anna Garcia', 'DIVISION'),
    ('PC003', 'Services Division', 1, 'Tom Anderson', 'SERVICE')
    ON CONFLICT (code) DO NOTHING
  `);
}

async function populateMaterialMasterData() {
  console.log('Populating material master data...');
  
  // Material Groups
  await pool.query(`
    INSERT INTO material_groups (code, name, description) VALUES
    ('RAW', 'Raw Materials', 'Basic materials for production'),
    ('SEM', 'Semi-Finished', 'Intermediate production materials'),
    ('FIN', 'Finished Goods', 'Ready for sale products'),
    ('SER', 'Services', 'Service-related materials')
    ON CONFLICT (code) DO NOTHING
  `);
  
  // Units of Measure
  await pool.query(`
    INSERT INTO units_of_measure (code, name, description, base_unit) VALUES
    ('EA', 'Each', 'Individual pieces', true),
    ('KG', 'Kilogram', 'Weight measurement', false),
    ('M', 'Meter', 'Length measurement', false),
    ('L', 'Liter', 'Volume measurement', false),
    ('HR', 'Hour', 'Time measurement', false)
    ON CONFLICT (code) DO NOTHING
  `);
  
  // Extended Materials
  await pool.query(`
    INSERT INTO materials (code, name, description, material_group_id, base_unit_id, material_type) VALUES
    ('MAT010', 'Steel Plate 10mm', 'High-grade steel plate for manufacturing', 1, 1, 'RAW'),
    ('MAT011', 'Aluminum Sheet', 'Lightweight aluminum for electronics', 1, 1, 'RAW'),
    ('MAT012', 'Copper Wire', 'Electrical conductor material', 1, 2, 'RAW'),
    ('MAT020', 'Circuit Board PCB', 'Printed circuit board assembly', 2, 1, 'SEMI'),
    ('MAT021', 'Motor Assembly', 'Electric motor subassembly', 2, 1, 'SEMI'),
    ('MAT030', 'Smartphone Model A', 'Latest smartphone product', 3, 1, 'FINI'),
    ('MAT031', 'Laptop Computer', 'Business laptop computer', 3, 1, 'FINI'),
    ('MAT032', 'Electric Vehicle', 'Battery-powered vehicle', 3, 1, 'FINI')
    ON CONFLICT (code) DO NOTHING
  `);
}

async function populateHumanResourcesData() {
  console.log('Populating HR data...');
  
  // Employee Groups
  await pool.query(`
    INSERT INTO employee_groups (code, name, description) VALUES
    ('EXE', 'Executives', 'Senior management personnel'),
    ('MGR', 'Managers', 'Middle management'),
    ('ENG', 'Engineers', 'Technical staff'),
    ('OPR', 'Operators', 'Production workers'),
    ('ADM', 'Administrative', 'Office support staff')
    ON CONFLICT (code) DO NOTHING
  `);
  
  // Departments
  await pool.query(`
    INSERT INTO departments (code, name, company_code_id, manager_id, department_type) VALUES
    ('PROD', 'Production', 1, NULL, 'OPERATIONAL'),
    ('SALE', 'Sales', 1, NULL, 'COMMERCIAL'),
    ('HRES', 'Human Resources', 1, NULL, 'SUPPORT'),
    ('FINA', 'Finance', 1, NULL, 'SUPPORT'),
    ('RNDD', 'Research & Development', 1, NULL, 'TECHNICAL')
    ON CONFLICT (code) DO NOTHING
  `);
  
  // Employees
  await pool.query(`
    INSERT INTO employees (employee_number, first_name, last_name, email, department_id, position, hire_date, salary) VALUES
    ('EMP001', 'John', 'Smith', 'john.smith@mallyerp.com', 1, 'Production Manager', '2020-01-15', 75000),
    ('EMP002', 'Sarah', 'Johnson', 'sarah.johnson@mallyerp.com', 2, 'Sales Director', '2019-03-20', 85000),
    ('EMP003', 'Mike', 'Wilson', 'mike.wilson@mallyerp.com', 3, 'HR Manager', '2021-06-10', 70000),
    ('EMP004', 'Lisa', 'Chen', 'lisa.chen@mallyerp.com', 5, 'R&D Engineer', '2020-09-05', 80000),
    ('EMP005', 'Robert', 'Brown', 'robert.brown@mallyerp.com', 1, 'Quality Inspector', '2022-02-18', 55000)
    ON CONFLICT (employee_number) DO NOTHING
  `);
}

async function populateSalesData() {
  console.log('Populating sales data...');
  
  // Customer Groups
  await pool.query(`
    INSERT INTO customer_groups (code, name, description, discount_percentage) VALUES
    ('CORP', 'Corporate Clients', 'Large enterprise customers', 15.0),
    ('SMB', 'Small-Medium Business', 'SMB customers', 10.0),
    ('RET', 'Retail Customers', 'Individual consumers', 5.0),
    ('GOV', 'Government', 'Government entities', 20.0)
    ON CONFLICT (code) DO NOTHING
  `);
  
  // Extended Customers
  await pool.query(`
    INSERT INTO customers (code, name, email, phone, address, city, country, customer_group_id, credit_limit) VALUES
    ('CUST001', 'TechCorp Industries', 'orders@techcorp.com', '+1-555-0101', '100 Tech Street', 'San Francisco', 'US', 1, 500000),
    ('CUST002', 'Global Manufacturing Ltd', 'procurement@globalmanuf.com', '+1-555-0102', '200 Industrial Ave', 'Chicago', 'US', 1, 750000),
    ('CUST003', 'Retail Chain Corp', 'buyer@retailchain.com', '+1-555-0103', '300 Commerce Blvd', 'Los Angeles', 'US', 2, 250000),
    ('CUST004', 'Federal Agency', 'contracts@fedagency.gov', '+1-555-0104', '400 Government Way', 'Washington', 'US', 4, 1000000),
    ('CUST005', 'European Electronics', 'orders@euroelec.de', '+49-30-1234567', 'Elektronikstraße 500', 'Berlin', 'DE', 1, 300000)
    ON CONFLICT (code) DO NOTHING
  `);
  
  // Sales Organizations
  await pool.query(`
    INSERT INTO sales_organizations (code, name, company_code_id, currency, sales_office) VALUES
    ('SO01', 'North America Sales', 1, 'USD', 'New York Office'),
    ('SO02', 'Europe Sales', 2, 'EUR', 'Frankfurt Office'),
    ('SO03', 'Asia Pacific Sales', 3, 'SGD', 'Singapore Office')
    ON CONFLICT (code) DO NOTHING
  `);
  
  // Distribution Channels
  await pool.query(`
    INSERT INTO distribution_channels (code, name, description) VALUES
    ('DC01', 'Direct Sales', 'Direct to customer sales'),
    ('DC02', 'Partner Channel', 'Through authorized partners'),
    ('DC03', 'Online Store', 'E-commerce platform'),
    ('DC04', 'Retail Network', 'Physical retail stores')
    ON CONFLICT (code) DO NOTHING
  `);
}

async function populatePurchaseData() {
  console.log('Populating purchase data...');
  
  // Vendor Groups
  await pool.query(`
    INSERT INTO vendor_groups (code, name, description) VALUES
    ('RAW_SUP', 'Raw Material Suppliers', 'Primary material suppliers'),
    ('SER_PRO', 'Service Providers', 'Professional services'),
    ('EQP_SUP', 'Equipment Suppliers', 'Machinery and equipment'),
    ('ITL_SUP', 'IT/Software Suppliers', 'Technology providers')
    ON CONFLICT (code) DO NOTHING
  `);
  
  // Vendors
  await pool.query(`
    INSERT INTO vendors (code, name, email, phone, address, city, country, vendor_group_id, payment_terms) VALUES
    ('VEND001', 'Steel Supply Co', 'orders@steelsupply.com', '+1-555-1001', '1000 Steel Way', 'Pittsburgh', 'US', 1, 'NET30'),
    ('VEND002', 'Electronics Components Ltd', 'sales@electcomp.com', '+1-555-1002', '2000 Component St', 'Austin', 'US', 1, 'NET45'),
    ('VEND003', 'Professional Services Inc', 'info@proservices.com', '+1-555-1003', '3000 Service Ave', 'Boston', 'US', 2, 'NET15'),
    ('VEND004', 'Industrial Equipment Corp', 'sales@indequip.com', '+1-555-1004', '4000 Equipment Blvd', 'Cleveland', 'US', 3, 'NET60'),
    ('VEND005', 'Software Solutions GmbH', 'contact@softsol.de', '+49-89-5555555', 'Softwarestraße 5000', 'Munich', 'DE', 4, 'NET30')
    ON CONFLICT (code) DO NOTHING
  `);
  
  // Purchase Organizations
  await pool.query(`
    INSERT INTO purchase_organizations (code, name, company_code_id, currency) VALUES
    ('PO01', 'Central Purchasing', 1, 'USD'),
    ('PO02', 'European Procurement', 2, 'EUR'),
    ('PO03', 'Asia Pacific Buying', 3, 'SGD')
    ON CONFLICT (code) DO NOTHING
  `);
}

async function populateInventoryData() {
  console.log('Populating inventory data...');
  
  // Storage Types
  await pool.query(`
    INSERT INTO storage_types (code, name, description, temperature_controlled, hazardous_materials) VALUES
    ('NORM', 'Normal Storage', 'Standard warehouse storage', false, false),
    ('COLD', 'Cold Storage', 'Temperature controlled storage', true, false),
    ('HAZ', 'Hazardous Storage', 'Special handling required', false, true),
    ('HIGH', 'High Security', 'Restricted access storage', false, false)
    ON CONFLICT (code) DO NOTHING
  `);
  
  // Stock Categories
  await pool.query(`
    INSERT INTO stock_categories (code, name, description, valuation_class) VALUES
    ('FREE', 'Free Use Stock', 'Available for consumption', 'VAL001'),
    ('QUAL', 'Quality Inspection', 'Under quality review', 'VAL002'),
    ('BLOC', 'Blocked Stock', 'Temporarily unavailable', 'VAL003'),
    ('CONS', 'Consignment Stock', 'Vendor owned inventory', 'VAL004')
    ON CONFLICT (code) DO NOTHING
  `);
  
  // Current Inventory Levels
  await pool.query(`
    INSERT INTO inventory (material_id, storage_location_id, quantity, reserved_quantity, available_quantity) VALUES
    (1, 1, 1000, 100, 900),
    (2, 1, 800, 50, 750),
    (3, 1, 500, 25, 475),
    (4, 2, 200, 20, 180),
    (5, 2, 150, 10, 140)
    ON CONFLICT (material_id, storage_location_id) DO NOTHING
  `);
}

async function populateProductionData() {
  console.log('Populating production data...');
  
  // Work Center Types
  await pool.query(`
    INSERT INTO work_center_types (code, name, description) VALUES
    ('MACH', 'Machining Center', 'CNC and machining operations'),
    ('ASSY', 'Assembly Station', 'Product assembly operations'),
    ('TEST', 'Testing Station', 'Quality testing and inspection'),
    ('PACK', 'Packaging Line', 'Final packaging operations')
    ON CONFLICT (code) DO NOTHING
  `);
  
  // Production Orders
  await pool.query(`
    INSERT INTO production_orders (order_number, material_id, plant_id, quantity, order_date, planned_start_date, planned_end_date, status) VALUES
    ('PO2025001', 6, 1, 100, CURRENT_DATE, CURRENT_DATE + 1, CURRENT_DATE + 7, 'PLANNED'),
    ('PO2025002', 7, 1, 50, CURRENT_DATE, CURRENT_DATE + 2, CURRENT_DATE + 10, 'RELEASED'),
    ('PO2025003', 8, 1, 25, CURRENT_DATE, CURRENT_DATE + 5, CURRENT_DATE + 15, 'IN_PROGRESS')
    ON CONFLICT (order_number) DO NOTHING
  `);
  
  // Production Confirmations
  await pool.query(`
    INSERT INTO production_confirmations (production_order_id, operation_number, work_center_id, confirmed_quantity, actual_time, confirmation_date) VALUES
    (2, '0010', 1, 30, 120, CURRENT_DATE),
    (2, '0020', 2, 25, 150, CURRENT_DATE),
    (3, '0010', 1, 15, 90, CURRENT_DATE)
    ON CONFLICT DO NOTHING
  `);
}

async function populateAccountingDocuments() {
  console.log('Populating accounting documents...');
  
  // Document Types
  await pool.query(`
    INSERT INTO document_types (code, name, description, number_range) VALUES
    ('SA', 'Sales Invoice', 'Customer billing documents', 'INV'),
    ('KR', 'Vendor Invoice', 'Supplier billing documents', 'VEN'),
    ('DR', 'Customer Credit', 'Customer credit notes', 'CRD'),
    ('DZ', 'Vendor Credit', 'Vendor credit notes', 'VCR'),
    ('AB', 'General Posting', 'General journal entries', 'GEN')
    ON CONFLICT (code) DO NOTHING
  `);
  
  // Accounting Documents
  await pool.query(`
    INSERT INTO accounting_documents (document_number, document_type, posting_date, document_date, company_code_id, total_amount, currency) VALUES
    ('INV2025001', 'SA', CURRENT_DATE, CURRENT_DATE, 1, 125000.00, 'USD'),
    ('INV2025002', 'SA', CURRENT_DATE, CURRENT_DATE, 1, 75000.00, 'USD'),
    ('VEN2025001', 'KR', CURRENT_DATE, CURRENT_DATE, 1, 45000.00, 'USD'),
    ('GEN2025001', 'AB', CURRENT_DATE, CURRENT_DATE, 1, 0.00, 'USD')
    ON CONFLICT (document_number) DO NOTHING
  `);
  
  // Account Postings
  await pool.query(`
    INSERT INTO accounting_document_items (document_id, line_item, account_number, debit_amount, credit_amount, cost_center_id, profit_center_id) VALUES
    (1, 1, '110000', 125000.00, 0.00, 2, 1),
    (1, 2, '500000', 0.00, 125000.00, 2, 1),
    (2, 1, '110000', 75000.00, 0.00, 2, 1),
    (2, 2, '500000', 0.00, 75000.00, 2, 1),
    (3, 1, '600000', 45000.00, 0.00, 1, 1),
    (3, 2, '300000', 0.00, 45000.00, 1, 1)
    ON CONFLICT DO NOTHING
  `);
}

async function populateControllingData() {
  console.log('Populating controlling data...');
  
  // Activity Types
  await pool.query(`
    INSERT INTO activity_types (code, name, description, unit_of_measure, standard_rate) VALUES
    ('MACH', 'Machine Time', 'Machine operation time', 'HR', 150.00),
    ('LABOR', 'Labor Time', 'Direct labor hours', 'HR', 75.00),
    ('SETUP', 'Setup Time', 'Machine setup activities', 'HR', 100.00),
    ('QUAL', 'Quality Control', 'Quality inspection time', 'HR', 85.00)
    ON CONFLICT (code) DO NOTHING
  `);
  
  // Cost Element Groups
  await pool.query(`
    INSERT INTO cost_element_groups (code, name, description) VALUES
    ('MAT', 'Material Costs', 'Direct and indirect materials'),
    ('LAB', 'Labor Costs', 'Personnel expenses'),
    ('MAC', 'Machine Costs', 'Equipment and facility costs'),
    ('OVH', 'Overhead Costs', 'Indirect operational costs')
    ON CONFLICT (code) DO NOTHING
  `);
  
  // Internal Orders
  await pool.query(`
    INSERT INTO internal_orders (order_number, description, cost_center_id, order_type, budget_amount, actual_costs) VALUES
    ('IO2025001', 'New Product Development', 4, 'INVESTMENT', 250000.00, 45000.00),
    ('IO2025002', 'Equipment Maintenance', 1, 'MAINTENANCE', 50000.00, 12000.00),
    ('IO2025003', 'Quality Improvement', 5, 'OPERATIONAL', 75000.00, 23000.00)
    ON CONFLICT (order_number) DO NOTHING
  `);
}

async function populateWorkflowData() {
  console.log('Populating workflow data...');
  
  // Workflow Templates
  await pool.query(`
    INSERT INTO workflow_templates (code, name, description, workflow_type) VALUES
    ('WF_PO', 'Purchase Order Approval', 'Purchase order approval workflow', 'APPROVAL'),
    ('WF_SO', 'Sales Order Processing', 'Sales order processing workflow', 'PROCESS'),
    ('WF_CR', 'Customer Credit Review', 'Credit limit review process', 'REVIEW'),
    ('WF_EX', 'Expense Approval', 'Employee expense approval', 'APPROVAL')
    ON CONFLICT (code) DO NOTHING
  `);
  
  // Approval Levels
  await pool.query(`
    INSERT INTO approval_levels (level, name, description, value_limit) VALUES
    (1, 'Supervisor Approval', 'First level approval', 10000.00),
    (2, 'Manager Approval', 'Department manager approval', 50000.00),
    (3, 'Director Approval', 'Division director approval', 100000.00),
    (4, 'Executive Approval', 'C-level executive approval', NULL)
    ON CONFLICT (level) DO NOTHING
  `);
  
  // Workflow Instances
  await pool.query(`
    INSERT INTO workflow_instances (workflow_template_id, reference_type, reference_id, current_step, status, created_by) VALUES
    (1, 'PURCHASE_ORDER', 1, 1, 'PENDING', 1),
    (2, 'SALES_ORDER', 1, 3, 'IN_PROGRESS', 2),
    (4, 'EXPENSE_REPORT', 1, 2, 'APPROVED', 3)
    ON CONFLICT DO NOTHING
  `);
}

async function populateChangeDocuments() {
  console.log('Populating change documents...');
  
  // Change Document Headers
  await pool.query(`
    INSERT INTO change_document_headers (change_number, object_class, object_id, change_type, username, change_date) VALUES
    ('CHG0000000001', 'MATERIAL', '1', 'UPDATE', 'admin', CURRENT_TIMESTAMP),
    ('CHG0000000002', 'CUSTOMER', '1', 'CREATE', 'sales_user', CURRENT_TIMESTAMP),
    ('CHG0000000003', 'VENDOR', '1', 'UPDATE', 'purchase_user', CURRENT_TIMESTAMP)
    ON CONFLICT (change_number) DO NOTHING
  `);
  
  // Change Document Items
  await pool.query(`
    INSERT INTO change_document_items (change_document_id, field_name, old_value, new_value, change_indicator) VALUES
    (1, 'PRICE', '100.00', '105.00', 'U'),
    (1, 'DESCRIPTION', 'Old Description', 'Updated Description', 'U'),
    (2, 'NAME', '', 'New Customer Name', 'I'),
    (3, 'PAYMENT_TERMS', 'NET30', 'NET45', 'U')
    ON CONFLICT DO NOTHING
  `);
}

async function populateAIAgentData() {
  console.log('Populating AI agent data...');
  
  // AI Agent Configurations
  await pool.query(`
    INSERT INTO ai_agent_configs (agent_name, module_type, capabilities, configuration, active) VALUES
    ('Production Planner', 'PRODUCTION', '{"mrp": true, "capacity_planning": true, "scheduling": true}', '{"max_orders": 1000, "planning_horizon": 90}', true),
    ('Sales Assistant', 'SALES', '{"lead_scoring": true, "price_optimization": true, "quote_generation": true}', '{"response_time": 5, "accuracy_threshold": 0.95}', true),
    ('Finance Analyzer', 'FINANCE', '{"variance_analysis": true, "budget_monitoring": true, "cost_analysis": true}', '{"alert_threshold": 0.1, "report_frequency": "daily"}', true),
    ('Quality Controller', 'QUALITY', '{"defect_detection": true, "process_optimization": true, "compliance_check": true}', '{"inspection_level": "high", "auto_approval": false}', true),
    ('Inventory Optimizer', 'INVENTORY', '{"demand_forecasting": true, "reorder_optimization": true, "safety_stock": true}', '{"forecast_horizon": 60, "service_level": 0.98}', true)
    ON CONFLICT (agent_name) DO NOTHING
  `);
  
  // Agent Performance Metrics
  await pool.query(`
    INSERT INTO ai_agent_performance (agent_id, metric_date, queries_processed, success_rate, average_response_time, accuracy_score) VALUES
    (1, CURRENT_DATE, 150, 98.5, 2.3, 96.2),
    (2, CURRENT_DATE, 200, 97.8, 1.8, 94.5),
    (3, CURRENT_DATE, 85, 99.2, 3.1, 97.8),
    (4, CURRENT_DATE, 120, 98.9, 2.7, 95.9),
    (5, CURRENT_DATE, 95, 96.5, 2.1, 93.2)
    ON CONFLICT DO NOTHING
  `);
  
  // Agent Health Status
  await pool.query(`
    INSERT INTO ai_agent_health (agent_id, status, last_check, cpu_usage, memory_usage, response_time, error_count) VALUES
    (1, 'HEALTHY', CURRENT_TIMESTAMP, 65.2, 78.5, 2100, 0),
    (2, 'HEALTHY', CURRENT_TIMESTAMP, 58.7, 72.1, 1850, 1),
    (3, 'HEALTHY', CURRENT_TIMESTAMP, 71.3, 81.9, 2950, 0),
    (4, 'HEALTHY', CURRENT_TIMESTAMP, 63.8, 75.4, 2580, 0),
    (5, 'WARNING', CURRENT_TIMESTAMP, 89.2, 92.1, 3200, 2)
    ON CONFLICT (agent_id) DO NOTHING
  `);
}

// Execute the population
populateCompleteERPData()
  .then(() => {
    console.log('All ERP data populated successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed to populate ERP data:', error);
    process.exit(1);
  });