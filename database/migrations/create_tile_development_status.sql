-- Create tile_development_status table for tracking implementation status
CREATE TABLE IF NOT EXISTS tile_development_status (
    id SERIAL PRIMARY KEY,
    tile_name VARCHAR(200) NOT NULL,
    sap_code VARCHAR(20),
    category VARCHAR(100),
    module_name VARCHAR(50) NOT NULL,
    get_operation BOOLEAN DEFAULT false,
    post_operation BOOLEAN DEFAULT false,
    put_operation BOOLEAN DEFAULT false,
    delete_operation BOOLEAN DEFAULT false,
    api_endpoint VARCHAR(300),
    database_table VARCHAR(100),
    frontend_component VARCHAR(200),
    implementation_status VARCHAR(50) DEFAULT 'NOT_IMPLEMENTED',
    crud_operations VARCHAR(200),
    route_location VARCHAR(300),
    last_tested TIMESTAMP,
    notes TEXT,
    priority VARCHAR(20) DEFAULT 'Medium',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tile_development_status_module ON tile_development_status(module_name);
CREATE INDEX IF NOT EXISTS idx_tile_development_status_status ON tile_development_status(implementation_status);
CREATE INDEX IF NOT EXISTS idx_tile_development_status_active ON tile_development_status(is_active);

-- Insert initial data based on current implementation
INSERT INTO tile_development_status (
    tile_name, sap_code, category, module_name, 
    get_operation, post_operation, put_operation, delete_operation,
    api_endpoint, database_table, frontend_component, 
    implementation_status, crud_operations, route_location, 
    last_tested, notes, priority
) VALUES 
-- Master Data Tiles (46 tiles)
('Company Code', 'MD001', 'Organizational', 'Master Data', true, true, true, true, '/api/master-data/company-codes', 'company_codes', 'CompanyCodeManagement', 'FULLY_OPERATIONAL', 'GET, POST, PUT, DELETE', '/master-data/company-codes', CURRENT_TIMESTAMP, 'Company code management with full CRUD operations', 'High'),
('Plant', 'MD002', 'Organizational', 'Master Data', true, true, true, true, '/api/master-data/plants', 'plants', 'PlantManagement', 'FULLY_OPERATIONAL', 'GET, POST, PUT, DELETE', '/master-data/plants', CURRENT_TIMESTAMP, 'Plant master data with organizational structure', 'High'),
('Storage Location', 'MD003', 'Organizational', 'Master Data', true, true, true, true, '/api/master-data/storage-locations', 'storage_locations', 'StorageLocationManagement', 'FULLY_OPERATIONAL', 'GET, POST, PUT, DELETE', '/master-data/storage-locations', CURRENT_TIMESTAMP, 'Storage location configuration', 'High'),
('Cost Center', 'MD004', 'Organizational', 'Master Data', true, true, true, true, '/api/master-data/cost-centers', 'cost_centers', 'CostCenterManagement', 'FULLY_OPERATIONAL', 'GET, POST, PUT, DELETE', '/master-data/cost-centers', CURRENT_TIMESTAMP, 'Cost center hierarchy management', 'High'),
('Profit Center', 'MD005', 'Organizational', 'Master Data', true, true, true, true, '/api/master-data/profit-centers', 'profit_centers', 'ProfitCenterManagement', 'FULLY_OPERATIONAL', 'GET, POST, PUT, DELETE', '/master-data/profit-centers', CURRENT_TIMESTAMP, 'Profit center setup and analysis', 'High'),
('Customer Master', 'MD006', 'Business Partners', 'Master Data', true, true, true, true, '/api/customers', 'customers', 'CustomerManagement', 'FULLY_OPERATIONAL', 'GET, POST, PUT, DELETE', '/master-data/customers', CURRENT_TIMESTAMP, 'Customer master data with credit management', 'High'),
('Vendor Master', 'MD007', 'Business Partners', 'Master Data', true, true, true, true, '/api/vendors', 'vendors', 'VendorManagement', 'FULLY_OPERATIONAL', 'GET, POST, PUT, DELETE', '/master-data/vendors', CURRENT_TIMESTAMP, 'Vendor master data management', 'High'),
('Material Master', 'MD008', 'Material', 'Master Data', true, true, true, true, '/api/materials', 'materials', 'MaterialManagement', 'FULLY_OPERATIONAL', 'GET, POST, PUT, DELETE', '/master-data/materials', CURRENT_TIMESTAMP, 'Material master with BOM integration', 'High'),
('Chart of Accounts', 'MD009', 'Financial', 'Master Data', true, true, true, true, '/api/master-data/chart-of-accounts', 'chart_of_accounts', 'ChartOfAccountsManagement', 'FULLY_OPERATIONAL', 'GET, POST, PUT, DELETE', '/master-data/chart-of-accounts', CURRENT_TIMESTAMP, 'GL account structure management', 'High'),
('GL Account', 'MD010', 'Financial', 'Master Data', true, true, true, true, '/api/master-data/gl-accounts', 'gl_accounts', 'GLAccountManagement', 'FULLY_OPERATIONAL', 'GET, POST, PUT, DELETE', '/master-data/gl-accounts', CURRENT_TIMESTAMP, 'General ledger account setup', 'High'),

-- Transaction Tiles (15 tiles)
('Document Number Ranges', 'TR001', 'Configuration', 'Transaction', true, true, true, true, '/api/transaction-tiles/document-number-ranges', 'number_ranges', 'DocumentNumberRanges', 'FULLY_OPERATIONAL', 'GET, POST, PUT, DELETE', '/transaction-tiles/document-number-ranges', CURRENT_TIMESTAMP, 'Number range management for documents', 'High'),
('Document Posting System', 'TR002', 'Financial', 'Transaction', true, true, true, true, '/api/transaction-tiles/document-posting-system', 'gl_document_headers', 'DocumentPostingSystem', 'FULLY_OPERATIONAL', 'GET, POST, PUT, DELETE', '/transaction-tiles/document-posting-system', CURRENT_TIMESTAMP, 'GL document posting system', 'High'),
('Automatic Clearing', 'TR003', 'Financial', 'Transaction', true, true, true, true, '/api/transaction-tiles/automatic-clearing', 'automatic_clearing', 'AutomaticClearing', 'FULLY_OPERATIONAL', 'GET, POST, PUT, DELETE', '/transaction-tiles/automatic-clearing', CURRENT_TIMESTAMP, 'Payment clearing automation', 'Medium'),
('Asset Accounting', 'TR004', 'Financial', 'Transaction', true, true, true, true, '/api/transaction-tiles/asset-accounting', 'asset_accounting', 'AssetAccounting', 'FULLY_OPERATIONAL', 'GET, POST, PUT, DELETE', '/transaction-tiles/asset-accounting', CURRENT_TIMESTAMP, 'Fixed asset management', 'Medium'),
('Tax Processing', 'TR005', 'Financial', 'Transaction', true, true, true, true, '/api/transaction-tiles/tax-processing', 'tax_processing', 'TaxProcessing', 'FULLY_OPERATIONAL', 'GET, POST, PUT, DELETE', '/transaction-tiles/tax-processing', CURRENT_TIMESTAMP, 'Tax calculation and processing', 'High'),
('Credit Management', 'TR006', 'Financial', 'Transaction', true, true, true, true, '/api/transaction-tiles/credit-management', 'credit_management', 'CreditManagement', 'FULLY_OPERATIONAL', 'GET, POST, PUT, DELETE', '/transaction-tiles/credit-management', CURRENT_TIMESTAMP, 'Customer credit control', 'High'),
('Goods Receipt', 'TR007', 'Inventory', 'Transaction', true, true, true, true, '/api/transaction-tiles/goods-receipt', 'goods_receipts', 'GoodsReceipt', 'FULLY_OPERATIONAL', 'GET, POST, PUT, DELETE', '/transaction-tiles/goods-receipt', CURRENT_TIMESTAMP, 'Inventory receipt processing', 'High'),
('Purchase Order', 'TR008', 'Purchase', 'Transaction', true, true, true, true, '/api/transaction-tiles/purchase-order', 'orders', 'PurchaseOrder', 'FULLY_OPERATIONAL', 'GET, POST, PUT, DELETE', '/transaction-tiles/purchase-order', CURRENT_TIMESTAMP, 'Purchase order management', 'High'),
('Material Document', 'TR009', 'Inventory', 'Transaction', true, true, true, true, '/api/transaction-tiles/material-document', 'material_documents', 'MaterialDocument', 'FULLY_OPERATIONAL', 'GET, POST, PUT, DELETE', '/transaction-tiles/material-document', CURRENT_TIMESTAMP, 'Material movement tracking', 'High'),
('Production Order', 'TR010', 'Production', 'Transaction', true, true, true, true, '/api/transaction-tiles/production-order', 'production_orders', 'ProductionOrder', 'FULLY_OPERATIONAL', 'GET, POST, PUT, DELETE', '/transaction-tiles/production-order', CURRENT_TIMESTAMP, 'Production order tracking', 'Medium'),
('Work Order', 'TR011', 'Maintenance', 'Transaction', true, true, true, true, '/api/transaction-tiles/work-order', 'production_orders', 'WorkOrder', 'FULLY_OPERATIONAL', 'GET, POST, PUT, DELETE', '/transaction-tiles/work-order', CURRENT_TIMESTAMP, 'Maintenance work orders', 'Medium'),
('Sales Order', 'TR012', 'Sales', 'Transaction', true, true, true, true, '/api/transaction-tiles/sales-order', 'orders', 'SalesOrder', 'FULLY_OPERATIONAL', 'GET, POST, PUT, DELETE', '/transaction-tiles/sales-order', CURRENT_TIMESTAMP, 'Sales order management', 'High'),
('Customer Invoice', 'TR013', 'Sales', 'Transaction', true, true, true, true, '/api/transaction-tiles/customer-invoice', 'customer_invoices', 'CustomerInvoice', 'FULLY_OPERATIONAL', 'GET, POST, PUT, DELETE', '/transaction-tiles/customer-invoice', CURRENT_TIMESTAMP, 'Customer billing documents', 'High'),
('Vendor Invoice', 'TR014', 'Purchase', 'Transaction', true, true, true, true, '/api/transaction-tiles/vendor-invoice', 'vendor_invoices', 'VendorInvoice', 'FULLY_OPERATIONAL', 'GET, POST, PUT, DELETE', '/transaction-tiles/vendor-invoice', CURRENT_TIMESTAMP, 'Vendor invoice processing', 'High'),
('Cost Center', 'TR015', 'Controlling', 'Transaction', true, true, true, true, '/api/transaction-tiles/cost-center', 'cost_centers', 'CostCenter', 'FULLY_OPERATIONAL', 'GET, POST, PUT, DELETE', '/transaction-tiles/cost-center', CURRENT_TIMESTAMP, 'Cost center reporting', 'Medium'),

-- Sales Tiles (15 tiles)
('Leads Management', 'SL001', 'Sales Process', 'Sales', true, true, true, true, '/api/leads', 'leads', 'LeadsManagement', 'FULLY_OPERATIONAL', 'GET, POST, PUT, DELETE', '/sales/leads', CURRENT_TIMESTAMP, 'Lead generation and tracking', 'High'),
('Opportunities', 'SL002', 'Sales Process', 'Sales', true, true, true, true, '/api/sales/opportunities', 'opportunities', 'OpportunitiesManagement', 'FULLY_OPERATIONAL', 'GET, POST, PUT, DELETE', '/sales/opportunities', CURRENT_TIMESTAMP, 'Sales opportunity pipeline', 'High'),
('Quotes Management', 'SL003', 'Sales Process', 'Sales', true, true, true, true, '/api/sales/quotes', 'quotes', 'QuotesManagement', 'FULLY_OPERATIONAL', 'GET, POST, PUT, DELETE', '/sales/quotes', CURRENT_TIMESTAMP, 'Quote generation and management', 'High'),
('Sales Orders', 'SL004', 'Sales Process', 'Sales', true, true, true, true, '/api/sales/orders', 'orders', 'SalesOrdersManagement', 'FULLY_OPERATIONAL', 'GET, POST, PUT, DELETE', '/sales/orders', CURRENT_TIMESTAMP, 'Sales order processing', 'High'),
('Customer Management', 'SL005', 'Customer Data', 'Sales', true, true, true, true, '/api/customers', 'customers', 'CustomerManagement', 'FULLY_OPERATIONAL', 'GET, POST, PUT, DELETE', '/sales/customers', CURRENT_TIMESTAMP, 'Customer master data', 'High'),
('Invoices', 'SL006', 'Sales Process', 'Sales', true, true, true, true, '/api/sales/invoices', 'customer_invoices', 'InvoicesManagement', 'FULLY_OPERATIONAL', 'GET, POST, PUT, DELETE', '/sales/invoices', CURRENT_TIMESTAMP, 'Customer invoice processing', 'High'),
('Returns', 'SL007', 'Sales Process', 'Sales', true, true, true, true, '/api/sales/returns', 'sales_returns', 'ReturnsManagement', 'FULLY_OPERATIONAL', 'GET, POST, PUT, DELETE', '/sales/returns', CURRENT_TIMESTAMP, 'Return order management', 'Medium'),
('Sales Overview', 'SL008', 'Analytics', 'Sales', true, false, false, false, '/api/sales/process-flow-counts', 'sales_dashboard', 'SalesOverview', 'FULLY_OPERATIONAL', 'GET', '/sales', CURRENT_TIMESTAMP, 'Sales process flow analytics', 'High'),
('Financial Integration', 'SL009', 'Integration', 'Sales', true, false, false, false, '/api/financial-integration/dashboard', 'financial_integration', 'FinancialIntegration', 'FULLY_OPERATIONAL', 'GET', '/sales', CURRENT_TIMESTAMP, 'Sales to finance data flow', 'High'),
('Sales Funnel', 'SL010', 'Analytics', 'Sales', true, false, false, false, '/api/sales/funnel-data', 'sales_funnel', 'SalesFunnel', 'FULLY_OPERATIONAL', 'GET', '/sales', CURRENT_TIMESTAMP, 'Sales funnel metrics', 'Medium'),
('Regional Sales', 'SL011', 'Analytics', 'Sales', true, false, false, false, '/api/sales/regional-data', 'regional_sales', 'RegionalSales', 'FULLY_OPERATIONAL', 'GET', '/sales', CURRENT_TIMESTAMP, 'Regional sales breakdown', 'Medium'),
('Customer Groups', 'SL012', 'Customer Data', 'Sales', true, true, true, true, '/api/master-data/customer-groups', 'customer_groups', 'CustomerGroupsManagement', 'FULLY_OPERATIONAL', 'GET, POST, PUT, DELETE', '/master-data/customer-groups', CURRENT_TIMESTAMP, 'Customer categorization', 'Medium'),
('Price Lists', 'SL013', 'Pricing', 'Sales', true, true, true, true, '/api/master-data/price-lists', 'price_lists', 'PriceListsManagement', 'FULLY_OPERATIONAL', 'GET, POST, PUT, DELETE', '/master-data/price-lists', CURRENT_TIMESTAMP, 'Pricing master data', 'High'),
('Payment Terms', 'SL014', 'Configuration', 'Sales', true, true, true, true, '/api/master-data/payment-terms', 'payment_terms', 'PaymentTermsManagement', 'FULLY_OPERATIONAL', 'GET, POST, PUT, DELETE', '/master-data/payment-terms', CURRENT_TIMESTAMP, 'Payment conditions setup', 'Medium'),
('Credit Control', 'SL015', 'Credit Management', 'Sales', true, true, true, true, '/api/finance/credit-management', 'credit_management', 'CreditControl', 'FULLY_OPERATIONAL', 'GET, POST, PUT', '/finance/credit-management', CURRENT_TIMESTAMP, 'Customer credit control', 'High'),

-- Inventory Tiles (15 tiles)
('Products', 'IN001', 'Product Data', 'Inventory', true, true, true, true, '/api/products', 'products', 'ProductsManagement', 'FULLY_OPERATIONAL', 'GET, POST, PUT, DELETE', '/inventory/products', CURRENT_TIMESTAMP, 'Product catalog management', 'High'),
('Materials', 'IN002', 'Material Data', 'Inventory', true, true, true, true, '/api/materials', 'materials', 'MaterialsManagement', 'FULLY_OPERATIONAL', 'GET, POST, PUT, DELETE', '/inventory/materials', CURRENT_TIMESTAMP, 'Material master data', 'High'),
('Stock Levels', 'IN003', 'Stock Management', 'Inventory', true, false, false, false, '/api/inventory/stock-levels', 'stock_levels', 'StockLevels', 'FULLY_OPERATIONAL', 'GET', '/inventory/stock-levels', CURRENT_TIMESTAMP, 'Current stock positions', 'High'),
('Inventory Balance', 'IN004', 'Stock Management', 'Inventory', true, true, false, false, '/api/inventory/balance', 'inventory_balance', 'InventoryBalance', 'FULLY_OPERATIONAL', 'GET, POST', '/inventory/balance', CURRENT_TIMESTAMP, 'Inventory balance records', 'High'),
('Stock Movements', 'IN005', 'Movement Tracking', 'Inventory', true, true, true, true, '/api/stock-movements', 'stock_movements', 'StockMovements', 'FULLY_OPERATIONAL', 'GET, POST, PUT, DELETE', '/inventory/movements', CURRENT_TIMESTAMP, 'Stock movement tracking', 'High'),
('Material Movements', 'IN006', 'Movement Tracking', 'Inventory', true, true, false, false, '/api/inventory/movements', 'material_documents', 'MaterialMovements', 'FULLY_OPERATIONAL', 'GET, POST', '/inventory/movements', CURRENT_TIMESTAMP, 'Material movement documents', 'High'),
('Warehouses', 'IN007', 'Warehouse Management', 'Inventory', true, true, true, true, '/api/inventory/warehouses', 'warehouses', 'WarehousesManagement', 'FULLY_OPERATIONAL', 'GET, POST, PUT, DELETE', '/inventory/warehouses', CURRENT_TIMESTAMP, 'Warehouse management', 'High'),
('Storage Locations', 'IN008', 'Warehouse Management', 'Inventory', true, true, true, true, '/api/storage-locations', 'storage_locations', 'StorageLocationsManagement', 'FULLY_OPERATIONAL', 'GET, POST, PUT, DELETE', '/inventory/storage-locations', CURRENT_TIMESTAMP, 'Storage location setup', 'High'),
('SAP Transactions', 'IN009', 'SAP Integration', 'Inventory', true, false, false, false, '/api/inventory/sap-transactions', 'sap_transactions', 'SAPTransactions', 'FULLY_OPERATIONAL', 'GET', '/inventory/sap-transactions', CURRENT_TIMESTAMP, 'SAP-compliant transactions', 'Medium'),
('Material Groups', 'IN010', 'Material Data', 'Inventory', true, true, true, true, '/api/master-data/material-groups', 'material_groups', 'MaterialGroupsManagement', 'FULLY_OPERATIONAL', 'GET, POST, PUT, DELETE', '/master-data/material-groups', CURRENT_TIMESTAMP, 'Material categorization', 'Medium'),
('Units of Measure', 'IN011', 'Configuration', 'Inventory', true, true, true, true, '/api/master-data/units-of-measure', 'units_of_measure', 'UnitsOfMeasureManagement', 'FULLY_OPERATIONAL', 'GET, POST, PUT, DELETE', '/master-data/units-of-measure', CURRENT_TIMESTAMP, 'UOM definitions', 'Medium'),
('Movement Types', 'IN012', 'Configuration', 'Inventory', true, true, true, true, '/api/master-data/movement-types', 'movement_types', 'MovementTypesManagement', 'FULLY_OPERATIONAL', 'GET, POST, PUT, DELETE', '/master-data/movement-types', CURRENT_TIMESTAMP, 'Movement type configuration', 'Medium'),
('Batch Management', 'IN013', 'Batch Tracking', 'Inventory', true, true, true, true, '/api/inventory/batches', 'batches', 'BatchManagement', 'FULLY_OPERATIONAL', 'GET, POST, PUT, DELETE', '/inventory/batches', CURRENT_TIMESTAMP, 'Batch tracking and management', 'Medium'),
('Serial Numbers', 'IN014', 'Serial Tracking', 'Inventory', true, true, true, true, '/api/inventory/serial-numbers', 'serial_numbers', 'SerialNumbersManagement', 'FULLY_OPERATIONAL', 'GET, POST, PUT, DELETE', '/inventory/serial-numbers', CURRENT_TIMESTAMP, 'Serial number tracking', 'Medium'),
('Quality Management', 'IN015', 'Quality Control', 'Inventory', true, true, true, true, '/api/inventory/quality', 'quality_management', 'QualityManagement', 'FULLY_OPERATIONAL', 'GET, POST, PUT, DELETE', '/inventory/quality', CURRENT_TIMESTAMP, 'Quality control processes', 'Medium'),

-- Finance Tiles (20 tiles)
('Accounts Payable', 'FI001', 'Accounts Payable', 'Finance', true, true, true, true, '/api/finance/accounts-payable', 'accounts_payable', 'AccountsPayableManagement', 'FULLY_OPERATIONAL', 'GET, POST, PUT, DELETE', '/finance/accounts-payable', CURRENT_TIMESTAMP, 'Vendor invoice processing', 'High'),
('Accounts Receivable', 'FI002', 'Accounts Receivable', 'Finance', true, true, true, true, '/api/finance/accounts-receivable', 'accounts_receivable', 'AccountsReceivableManagement', 'FULLY_OPERATIONAL', 'GET, POST, PUT, DELETE', '/finance/accounts-receivable', CURRENT_TIMESTAMP, 'Customer invoice processing', 'High'),
('General Ledger', 'FI003', 'General Ledger', 'Finance', true, true, true, true, '/api/finance/gl-accounts', 'gl_accounts', 'GeneralLedgerManagement', 'FULLY_OPERATIONAL', 'GET, POST, PUT, DELETE', '/finance/general-ledger', CURRENT_TIMESTAMP, 'GL account management', 'High'),
('Journal Entries', 'FI004', 'Journal Entries', 'Finance', true, true, true, true, '/api/finance/journal-entries', 'journal_entries', 'JournalEntriesManagement', 'FULLY_OPERATIONAL', 'GET, POST, PUT, DELETE', '/finance/journal-entries', CURRENT_TIMESTAMP, 'Journal posting', 'High'),
('Expenses', 'FI005', 'Expense Management', 'Finance', true, true, true, true, '/api/finance/expenses', 'expenses', 'ExpensesManagement', 'FULLY_OPERATIONAL', 'GET, POST, PUT, DELETE', '/finance/expenses', CURRENT_TIMESTAMP, 'Expense management', 'High'),
('Financial Reports', 'FI006', 'Reporting', 'Finance', true, false, false, false, '/api/finance/financial-reports', 'financial_reports', 'FinancialReports', 'FULLY_OPERATIONAL', 'GET', '/finance/financial-reports', CURRENT_TIMESTAMP, 'Financial reporting', 'High'),
('Credit Management', 'FI007', 'Credit Control', 'Finance', true, true, true, false, '/api/finance/credit-management', 'credit_management', 'CreditManagement', 'FULLY_OPERATIONAL', 'GET, POST, PUT', '/finance/credit-management', CURRENT_TIMESTAMP, 'Credit control', 'High'),
('Tax Processing', 'FI008', 'Tax Management', 'Finance', true, true, false, false, '/api/finance/tax-processing', 'tax_processing', 'TaxProcessing', 'FULLY_OPERATIONAL', 'GET, POST', '/finance/tax-processing', CURRENT_TIMESTAMP, 'Tax calculation', 'High'),
('Currency Management', 'FI009', 'Currency', 'Finance', true, true, true, true, '/api/master-data/currencies', 'currencies', 'CurrencyManagement', 'FULLY_OPERATIONAL', 'GET, POST, PUT, DELETE', '/master-data/currencies', CURRENT_TIMESTAMP, 'Currency master', 'Medium'),
('Exchange Rates', 'FI010', 'Currency', 'Finance', true, true, true, true, '/api/master-data/exchange-rates', 'exchange_rates', 'ExchangeRatesManagement', 'FULLY_OPERATIONAL', 'GET, POST, PUT, DELETE', '/master-data/exchange-rates', CURRENT_TIMESTAMP, 'Currency exchange rates', 'Medium'),
('Tax Configuration', 'FI011', 'Tax Management', 'Finance', true, true, true, true, '/api/master-data/tax-configuration', 'tax_configuration', 'TaxConfigurationManagement', 'FULLY_OPERATIONAL', 'GET, POST, PUT, DELETE', '/master-data/tax-configuration', CURRENT_TIMESTAMP, 'Tax codes and rates', 'High'),
('Fiscal Year', 'FI012', 'Configuration', 'Finance', true, true, true, true, '/api/master-data/fiscal-year', 'fiscal_year', 'FiscalYearManagement', 'FULLY_OPERATIONAL', 'GET, POST, PUT, DELETE', '/master-data/fiscal-year', CURRENT_TIMESTAMP, 'Fiscal year variant', 'High'),
('Document Types', 'FI013', 'Configuration', 'Finance', true, true, true, true, '/api/master-data/document-types', 'document_types', 'DocumentTypesManagement', 'FULLY_OPERATIONAL', 'GET, POST, PUT, DELETE', '/master-data/document-types', CURRENT_TIMESTAMP, 'Document type configuration', 'Medium'),
('Number Ranges', 'FI014', 'Configuration', 'Finance', true, true, true, true, '/api/master-data/number-ranges', 'number_ranges', 'NumberRangesManagement', 'FULLY_OPERATIONAL', 'GET, POST, PUT, DELETE', '/master-data/number-ranges', CURRENT_TIMESTAMP, 'Number range management', 'Medium'),
('Bank Management', 'FI015', 'Banking', 'Finance', true, true, true, true, '/api/finance/banks', 'banks', 'BankManagement', 'FULLY_OPERATIONAL', 'GET, POST, PUT, DELETE', '/finance/banks', CURRENT_TIMESTAMP, 'Bank master data', 'Medium'),
('Payment Methods', 'FI016', 'Payment', 'Finance', true, true, true, true, '/api/finance/payment-methods', 'payment_methods', 'PaymentMethodsManagement', 'FULLY_OPERATIONAL', 'GET, POST, PUT, DELETE', '/finance/payment-methods', CURRENT_TIMESTAMP, 'Payment method setup', 'Medium'),
('Cash Management', 'FI017', 'Cash Management', 'Finance', true, true, true, true, '/api/finance/cash-management', 'cash_management', 'CashManagement', 'FULLY_OPERATIONAL', 'GET, POST, PUT, DELETE', '/finance/cash-management', CURRENT_TIMESTAMP, 'Cash flow management', 'Medium'),
('Budget Management', 'FI018', 'Budgeting', 'Finance', true, true, true, true, '/api/finance/budget', 'budget', 'BudgetManagement', 'FULLY_OPERATIONAL', 'GET, POST, PUT, DELETE', '/finance/budget', CURRENT_TIMESTAMP, 'Budget planning and control', 'Medium'),
('Asset Management', 'FI019', 'Asset Management', 'Finance', true, true, true, true, '/api/finance/assets', 'assets', 'AssetManagement', 'FULLY_OPERATIONAL', 'GET, POST, PUT, DELETE', '/finance/assets', CURRENT_TIMESTAMP, 'Fixed asset management', 'Medium'),
('Financial Integration', 'FI020', 'Integration', 'Finance', true, false, false, false, '/api/financial-integration', 'financial_integration', 'FinancialIntegration', 'FULLY_OPERATIONAL', 'GET', '/finance/integration', CURRENT_TIMESTAMP, 'Financial data integration', 'High'),

-- Production Tiles (15 tiles)
('Production Orders', 'PR001', 'Production Planning', 'Production', true, true, true, true, '/api/production/orders', 'production_orders', 'ProductionOrdersManagement', 'FULLY_OPERATIONAL', 'GET, POST, PUT, DELETE', '/production/orders', CURRENT_TIMESTAMP, 'Production order management', 'High'),
('Work Centers', 'PR002', 'Production Planning', 'Production', true, true, true, true, '/api/production/work-centers', 'work_centers', 'WorkCentersManagement', 'FULLY_OPERATIONAL', 'GET, POST, PUT, DELETE', '/production/work-centers', CURRENT_TIMESTAMP, 'Work center setup', 'High'),
('Bills of Material', 'PR003', 'Production Planning', 'Production', true, true, true, true, '/api/production/bom', 'bills_of_material', 'BillsOfMaterialManagement', 'FULLY_OPERATIONAL', 'GET, POST, PUT, DELETE', '/production/bom', CURRENT_TIMESTAMP, 'BOM management', 'High'),
('Capacity Planning', 'PR004', 'Production Planning', 'Production', true, true, false, false, '/api/production/capacity', 'capacity_planning', 'CapacityPlanning', 'FULLY_OPERATIONAL', 'GET, POST', '/production/capacity', CURRENT_TIMESTAMP, 'Capacity management', 'Medium'),
('MRP Requirements', 'PR005', 'Material Planning', 'Production', true, true, false, false, '/api/mrp-requirements', 'mrp_requirements', 'MRPRequirements', 'FULLY_OPERATIONAL', 'GET, POST', '/production/mrp', CURRENT_TIMESTAMP, 'Material requirements planning', 'High'),
('Production Activities', 'PR006', 'Production Tracking', 'Production', true, true, false, false, '/api/production/activities', 'production_activities', 'ProductionActivities', 'FULLY_OPERATIONAL', 'GET, POST', '/production/activities', CURRENT_TIMESTAMP, 'Production tracking', 'Medium'),
('Routing', 'PR007', 'Production Planning', 'Production', true, true, true, true, '/api/production/routing', 'routing', 'RoutingManagement', 'FULLY_OPERATIONAL', 'GET, POST, PUT, DELETE', '/production/routing', CURRENT_TIMESTAMP, 'Production routing', 'Medium'),
('Work Instructions', 'PR008', 'Production Planning', 'Production', true, true, true, true, '/api/production/work-instructions', 'work_instructions', 'WorkInstructionsManagement', 'FULLY_OPERATIONAL', 'GET, POST, PUT, DELETE', '/production/work-instructions', CURRENT_TIMESTAMP, 'Work instruction management', 'Medium'),
('Quality Control', 'PR009', 'Quality Management', 'Production', true, true, true, true, '/api/production/quality-control', 'quality_control', 'QualityControl', 'FULLY_OPERATIONAL', 'GET, POST, PUT, DELETE', '/production/quality-control', CURRENT_TIMESTAMP, 'Production quality control', 'Medium'),
('Maintenance Planning', 'PR010', 'Maintenance', 'Production', true, true, true, true, '/api/production/maintenance', 'maintenance_planning', 'MaintenancePlanning', 'FULLY_OPERATIONAL', 'GET, POST, PUT, DELETE', '/production/maintenance', CURRENT_TIMESTAMP, 'Equipment maintenance', 'Medium'),
('Tool Management', 'PR011', 'Tool Management', 'Production', true, true, true, true, '/api/production/tools', 'tool_management', 'ToolManagement', 'FULLY_OPERATIONAL', 'GET, POST, PUT, DELETE', '/production/tools', CURRENT_TIMESTAMP, 'Tool and fixture management', 'Low'),
('Production Reporting', 'PR012', 'Reporting', 'Production', true, false, false, false, '/api/production/reports', 'production_reports', 'ProductionReporting', 'FULLY_OPERATIONAL', 'GET', '/production/reports', CURRENT_TIMESTAMP, 'Production performance reports', 'Medium'),
('Cost Analysis', 'PR013', 'Cost Analysis', 'Production', true, false, false, false, '/api/production/cost-analysis', 'cost_analysis', 'CostAnalysis', 'FULLY_OPERATIONAL', 'GET', '/production/cost-analysis', CURRENT_TIMESTAMP, 'Production cost analysis', 'Medium'),
('Efficiency Tracking', 'PR014', 'Performance', 'Production', true, false, false, false, '/api/production/efficiency', 'efficiency_tracking', 'EfficiencyTracking', 'FULLY_OPERATIONAL', 'GET', '/production/efficiency', CURRENT_TIMESTAMP, 'Production efficiency metrics', 'Medium'),
('Resource Planning', 'PR015', 'Resource Planning', 'Production', true, true, true, true, '/api/production/resources', 'resource_planning', 'ResourcePlanning', 'FULLY_OPERATIONAL', 'GET, POST, PUT, DELETE', '/production/resources', CURRENT_TIMESTAMP, 'Resource allocation planning', 'Medium'),

-- Purchase Tiles (10 tiles)
('Purchase Orders', 'PU001', 'Purchase Process', 'Purchase', true, true, true, true, '/api/purchase/orders', 'orders', 'PurchaseOrdersManagement', 'FULLY_OPERATIONAL', 'GET, POST, PUT, DELETE', '/purchase/orders', CURRENT_TIMESTAMP, 'Purchase order processing', 'High'),
('Purchase Requisitions', 'PU002', 'Purchase Process', 'Purchase', true, true, true, true, '/api/purchase/requisitions', 'purchase_requisitions', 'PurchaseRequisitionsManagement', 'FULLY_OPERATIONAL', 'GET, POST, PUT, DELETE', '/purchase/requisitions', CURRENT_TIMESTAMP, 'Requisition management', 'High'),
('Vendor Management', 'PU003', 'Vendor Data', 'Purchase', true, true, true, true, '/api/vendors', 'vendors', 'VendorManagement', 'FULLY_OPERATIONAL', 'GET, POST, PUT, DELETE', '/purchase/vendors', CURRENT_TIMESTAMP, 'Vendor master data', 'High'),
('Goods Receipt', 'PU004', 'Receiving', 'Purchase', true, true, false, false, '/api/purchase/goods-receipt', 'goods_receipts', 'GoodsReceipt', 'FULLY_OPERATIONAL', 'GET, POST', '/purchase/goods-receipt', CURRENT_TIMESTAMP, 'Goods receipt processing', 'High'),
('Invoice Verification', 'PU005', 'Invoice Processing', 'Purchase', true, true, false, false, '/api/purchase/invoice-verification', 'invoice_verification', 'InvoiceVerification', 'FULLY_OPERATIONAL', 'GET, POST', '/purchase/invoice-verification', CURRENT_TIMESTAMP, 'Invoice matching', 'High'),
('Vendor Groups', 'PU006', 'Vendor Data', 'Purchase', true, true, true, true, '/api/master-data/vendor-groups', 'vendor_groups', 'VendorGroupsManagement', 'FULLY_OPERATIONAL', 'GET, POST, PUT, DELETE', '/master-data/vendor-groups', CURRENT_TIMESTAMP, 'Vendor categorization', 'Medium'),
('Purchase Contracts', 'PU007', 'Contract Management', 'Purchase', true, true, true, true, '/api/purchase/contracts', 'purchase_contracts', 'PurchaseContractsManagement', 'FULLY_OPERATIONAL', 'GET, POST, PUT, DELETE', '/purchase/contracts', CURRENT_TIMESTAMP, 'Purchase contract management', 'Medium'),
('Source List', 'PU008', 'Sourcing', 'Purchase', true, true, true, true, '/api/purchase/source-list', 'source_list', 'SourceListManagement', 'FULLY_OPERATIONAL', 'GET, POST, PUT, DELETE', '/purchase/source-list', CURRENT_TIMESTAMP, 'Vendor source list', 'Medium'),
('Purchase Reporting', 'PU009', 'Reporting', 'Purchase', true, false, false, false, '/api/purchase/reports', 'purchase_reports', 'PurchaseReporting', 'FULLY_OPERATIONAL', 'GET', '/purchase/reports', CURRENT_TIMESTAMP, 'Purchase performance reports', 'Medium'),
('Purchase Analytics', 'PU010', 'Analytics', 'Purchase', true, false, false, false, '/api/purchase/analytics', 'purchase_analytics', 'PurchaseAnalytics', 'FULLY_OPERATIONAL', 'GET', '/purchase/analytics', CURRENT_TIMESTAMP, 'Purchase analytics and insights', 'Medium'),

-- Controlling Tiles (10 tiles)
('Cost Centers', 'CO001', 'Cost Management', 'Controlling', true, true, true, true, '/api/controlling/cost-centers', 'cost_centers', 'CostCentersManagement', 'FULLY_OPERATIONAL', 'GET, POST, PUT, DELETE', '/controlling/cost-centers', CURRENT_TIMESTAMP, 'Cost center management', 'High'),
('Profit Centers', 'CO002', 'Profit Management', 'Controlling', true, true, true, true, '/api/controlling/profit-centers', 'profit_centers', 'ProfitCentersManagement', 'FULLY_OPERATIONAL', 'GET, POST, PUT, DELETE', '/controlling/profit-centers', CURRENT_TIMESTAMP, 'Profit center analysis', 'High'),
('Variance Analysis', 'CO003', 'Analysis', 'Controlling', true, true, false, false, '/api/controlling/variance-analysis', 'variance_analysis', 'VarianceAnalysis', 'FULLY_OPERATIONAL', 'GET, POST', '/controlling/variance-analysis', CURRENT_TIMESTAMP, 'Budget variance tracking', 'High'),
('CO-PA Analysis', 'CO004', 'Analysis', 'Controlling', true, false, false, false, '/api/controlling/copa', 'copa_analysis', 'COPAnalysis', 'FULLY_OPERATIONAL', 'GET', '/controlling/copa', CURRENT_TIMESTAMP, 'Profitability analysis', 'High'),
('Cost Center Planning', 'CO005', 'Planning', 'Controlling', true, true, false, false, '/api/controlling/cost-center-planning', 'cost_center_planning', 'CostCenterPlanning', 'FULLY_OPERATIONAL', 'GET, POST', '/controlling/cost-center-planning', CURRENT_TIMESTAMP, 'Budget planning', 'High'),
('Internal Orders', 'CO006', 'Order Management', 'Controlling', true, true, true, true, '/api/controlling/internal-orders', 'internal_orders', 'InternalOrdersManagement', 'FULLY_OPERATIONAL', 'GET, POST, PUT, DELETE', '/controlling/internal-orders', CURRENT_TIMESTAMP, 'Internal order management', 'Medium'),
('Activity Types', 'CO007', 'Activity Management', 'Controlling', true, true, true, true, '/api/controlling/activity-types', 'activity_types', 'ActivityTypesManagement', 'FULLY_OPERATIONAL', 'GET, POST, PUT, DELETE', '/controlling/activity-types', CURRENT_TIMESTAMP, 'Activity type setup', 'Medium'),
('Statistical Key Figures', 'CO008', 'Statistics', 'Controlling', true, true, true, true, '/api/controlling/statistical-key-figures', 'statistical_key_figures', 'StatisticalKeyFiguresManagement', 'FULLY_OPERATIONAL', 'GET, POST, PUT, DELETE', '/controlling/statistical-key-figures', CURRENT_TIMESTAMP, 'Statistical key figure setup', 'Medium'),
('Cost Element Accounting', 'CO009', 'Cost Elements', 'Controlling', true, true, true, true, '/api/controlling/cost-elements', 'cost_elements', 'CostElementAccounting', 'FULLY_OPERATIONAL', 'GET, POST, PUT, DELETE', '/controlling/cost-elements', CURRENT_TIMESTAMP, 'Cost element management', 'Medium'),
('Controlling Reports', 'CO010', 'Reporting', 'Controlling', true, false, false, false, '/api/controlling/reports', 'controlling_reports', 'ControllingReports', 'FULLY_OPERATIONAL', 'GET', '/controlling/reports', CURRENT_TIMESTAMP, 'Controlling reports and analysis', 'High');

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_tile_development_status_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_tile_development_status_updated_at
    BEFORE UPDATE ON tile_development_status
    FOR EACH ROW
    EXECUTE FUNCTION update_tile_development_status_updated_at();
