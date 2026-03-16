import pkg from 'pg';
const { Pool } = pkg;
import XLSX from 'xlsx';

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'mallyerp',
  password: 'Mokshith@21',
  port: 5432,
});

// Focused list of most important SAP tables (core business tables)
const importantSapTables = [
  // FI - Financial Accounting Core
  { sap: 'BKPF', module: 'FI', category: 'Document Header', description: 'Accounting Document Header' },
  { sap: 'BSEG', module: 'FI', category: 'Document Line Items', description: 'Accounting Document Line Items' },
  { sap: 'BSIK', module: 'FI', category: 'Accounts Payable', description: 'Vendor Line Items (Open Items)' },
  { sap: 'BSAK', module: 'FI', category: 'Accounts Payable', description: 'Vendor Line Items (Cleared Items)' },
  { sap: 'BSID', module: 'FI', category: 'Accounts Receivable', description: 'Customer Line Items (Open Items)' },
  { sap: 'BSAD', module: 'FI', category: 'Accounts Receivable', description: 'Customer Line Items (Cleared Items)' },
  { sap: 'FAGLFLEXT', module: 'FI', category: 'General Ledger', description: 'New General Ledger: Totals Table' },
  { sap: 'FAGLFLEXA', module: 'FI', category: 'General Ledger', description: 'New General Ledger: Line Items' },
  { sap: 'GLT0', module: 'FI', category: 'General Ledger', description: 'G/L Account Totals' },
  { sap: 'BSIS', module: 'FI', category: 'General Ledger', description: 'G/L Account Line Items (Debit)' },
  { sap: 'BSAS', module: 'FI', category: 'General Ledger', description: 'G/L Account Line Items (Credit)' },
  
  // FI - Master Data
  { sap: 'T001', module: 'FI', category: 'Company Code', description: 'Company Codes' },
  { sap: 'T004', module: 'FI', category: 'Chart of Accounts', description: 'Chart of Accounts' },
  { sap: 'T009', module: 'FI', category: 'Fiscal Year', description: 'Fiscal Year Variants' },
  { sap: 'SKA1', module: 'FI', category: 'G/L Account Master', description: 'G/L Account Master (Chart of Accounts)' },
  { sap: 'SKB1', module: 'FI', category: 'G/L Account Master', description: 'G/L Account Master (Company Code)' },
  
  // FI - Document Splitting (S/4HANA)
  { sap: 'FAGL_SPLIT_ACTIVATION', module: 'FI', category: 'Document Splitting', description: 'Document Splitting Activation' },
  { sap: 'FAGL_SPLIT_RULES', module: 'FI', category: 'Document Splitting', description: 'Document Splitting Rules' },
  { sap: 'FAGL_SPLIT_CHAR', module: 'FI', category: 'Document Splitting', description: 'Document Splitting Characteristics' },
  { sap: 'FAGL_SPLIT_METHODS', module: 'FI', category: 'Document Splitting', description: 'Document Splitting Methods' },
  { sap: 'FAGL_SPLIT_ITEM_CAT', module: 'FI', category: 'Document Splitting', description: 'Document Splitting Item Categories' },
  { sap: 'FAGL_SPLIT_BT', module: 'FI', category: 'Document Splitting', description: 'Document Splitting Business Transactions' },
  { sap: 'FAGL_SPLIT_DOC_TYPE', module: 'FI', category: 'Document Splitting', description: 'Document Splitting Document Type Mapping' },
  { sap: 'FAGL_SPLIT_ZBA', module: 'FI', category: 'Document Splitting', description: 'Document Splitting Zero Balance Accounts' },
  { sap: 'FAGL_SPLIT_GL_CAT', module: 'FI', category: 'Document Splitting', description: 'Document Splitting G/L Account Categories' },
  
  // CO - Controlling
  { sap: 'CSKS', module: 'CO', category: 'Cost Centers', description: 'Cost Center Master Data' },
  { sap: 'CEPC', module: 'CO', category: 'Profit Centers', description: 'Profit Center Master Data' },
  { sap: 'COEP', module: 'CO', category: 'Controlling Documents', description: 'CO Object: Line Items' },
  { sap: 'COBK', module: 'CO', category: 'Controlling Documents', description: 'CO Object: Document Header' },
  { sap: 'COSP', module: 'CO', category: 'Cost Elements', description: 'CO Object: Cost Totals (Primary)' },
  { sap: 'COSB', module: 'CO', category: 'Cost Elements', description: 'CO Object: Cost Totals (Secondary)' },
  { sap: 'AUFK', module: 'CO', category: 'Internal Orders', description: 'Internal Order Master Data' },
  
  // SD - Sales & Distribution Core
  { sap: 'VBAK', module: 'SD', category: 'Sales Documents', description: 'Sales Document: Header Data' },
  { sap: 'VBAP', module: 'SD', category: 'Sales Documents', description: 'Sales Document: Item Data' },
  { sap: 'VBKD', module: 'SD', category: 'Sales Documents', description: 'Sales Document: Business Data' },
  { sap: 'VBPA', module: 'SD', category: 'Sales Documents', description: 'Sales Document: Partner' },
  { sap: 'VBUK', module: 'SD', category: 'Sales Documents', description: 'Sales Document: Header Status' },
  { sap: 'VBUP', module: 'SD', category: 'Sales Documents', description: 'Sales Document: Item Status' },
  { sap: 'VBRK', module: 'SD', category: 'Billing Documents', description: 'Billing Document: Header Data' },
  { sap: 'VBRP', module: 'SD', category: 'Billing Documents', description: 'Billing Document: Item Data' },
  { sap: 'LIKP', module: 'SD', category: 'Deliveries', description: 'Delivery: Header Data' },
  { sap: 'LIPS', module: 'SD', category: 'Deliveries', description: 'Delivery: Item Data' },
  { sap: 'KNA1', module: 'SD', category: 'Customer Master', description: 'Customer Master (General Data)' },
  { sap: 'KNB1', module: 'SD', category: 'Customer Master', description: 'Customer Master (Company Code)' },
  { sap: 'KNVV', module: 'SD', category: 'Customer Master', description: 'Customer Master (Sales Area)' },
  { sap: 'KNVP', module: 'SD', category: 'Customer Master', description: 'Customer Master (Partner Functions)' },
  
  // MM - Materials Management Core
  { sap: 'MARA', module: 'MM', category: 'Material Master', description: 'Material Master (General Data)' },
  { sap: 'MARC', module: 'MM', category: 'Material Master', description: 'Material Master (Plant Data)' },
  { sap: 'MARD', module: 'MM', category: 'Material Master', description: 'Material Master (Storage Location)' },
  { sap: 'MAKT', module: 'MM', category: 'Material Master', description: 'Material Master (Descriptions)' },
  { sap: 'MBEW', module: 'MM', category: 'Material Master', description: 'Material Master (Valuation)' },
  { sap: 'EKKO', module: 'MM', category: 'Purchasing', description: 'Purchasing Document Header' },
  { sap: 'EKPO', module: 'MM', category: 'Purchasing', description: 'Purchasing Document Item' },
  { sap: 'EKBE', module: 'MM', category: 'Purchasing', description: 'Purchasing Document History' },
  { sap: 'MSEG', module: 'MM', category: 'Goods Receipt', description: 'Material Document: Segment' },
  { sap: 'MKPF', module: 'MM', category: 'Goods Receipt', description: 'Material Document Header' },
  { sap: 'LFA1', module: 'MM', category: 'Vendor Master', description: 'Vendor Master (General Data)' },
  { sap: 'LFB1', module: 'MM', category: 'Vendor Master', description: 'Vendor Master (Company Code)' },
  { sap: 'LFM1', module: 'MM', category: 'Vendor Master', description: 'Vendor Master (Purchasing Organization)' },
  
  // PP - Production Planning
  { sap: 'AFKO', module: 'PP', category: 'Production Orders', description: 'Order Header Data' },
  { sap: 'AFPO', module: 'PP', category: 'Production Orders', description: 'Order Item Data' },
  { sap: 'AFRU', module: 'PP', category: 'Production Orders', description: 'Order Confirmation' },
  { sap: 'AFVC', module: 'PP', category: 'Routings', description: 'Sequence - Operation' },
  { sap: 'AFVV', module: 'PP', category: 'Routings', description: 'Sequence - Operation Values' },
  { sap: 'CRHD', module: 'PP', category: 'Work Centers', description: 'Work Center Header' },
  { sap: 'MAST', module: 'PP', category: 'BOM', description: 'Material BOM' },
  { sap: 'STKO', module: 'PP', category: 'BOM', description: 'BOM Header' },
  { sap: 'STPO', module: 'PP', category: 'BOM', description: 'BOM Item' },
  { sap: 'PLAF', module: 'PP', category: 'MRP', description: 'Planned Order' },
  { sap: 'RESB', module: 'PP', category: 'Reservations', description: 'Reservation/Dependent Requirements' },
  
  // AA - Asset Accounting
  { sap: 'ANLA', module: 'AA', category: 'Asset Master', description: 'Asset Master Record' },
  { sap: 'ANLB', module: 'AA', category: 'Asset Master', description: 'Asset Depreciation Areas' },
  { sap: 'ANLC', module: 'AA', category: 'Asset Master', description: 'Asset Value Fields' },
  { sap: 'ANEP', module: 'AA', category: 'Asset Documents', description: 'Asset Line Items' },
  { sap: 'ANEA', module: 'AA', category: 'Asset Documents', description: 'Asset Document Header' },
  
  // HR - Human Resources
  { sap: 'PA0001', module: 'HR', category: 'Personnel', description: 'Personnel Administration: Infotype 0001 (Organizational Assignment)' },
  { sap: 'PA0002', module: 'HR', category: 'Personnel', description: 'Personnel Administration: Infotype 0002 (Personal Data)' },
  { sap: 'PA0003', module: 'HR', category: 'Personnel', description: 'Personnel Administration: Infotype 0003 (Payroll Status)' },
  { sap: 'PA0008', module: 'HR', category: 'Personnel', description: 'Personnel Administration: Infotype 0008 (Basic Pay)' },
  { sap: 'PA0009', module: 'HR', category: 'Personnel', description: 'Personnel Administration: Infotype 0009 (Bank Details)' }
];

// Your table mappings
const yourTableMappings = {
  'BKPF': ['accounting_documents'],
  'BSEG': ['accounting_document_items'],
  'BSIK': ['accounts_payable', 'ap_open_items'],
  'BSAK': ['accounts_payable', 'ap_payments'],
  'BSID': ['accounts_receivable', 'ar_open_items'],
  'BSAD': ['accounts_receivable', 'ar_payment_applications'],
  'FAGLFLEXT': ['general_ledger_accounts', 'gl_accounts'],
  'FAGLFLEXA': ['gl_entries', 'general_ledger'],
  'GLT0': ['general_ledger'],
  'BSIS': ['gl_entries'],
  'BSAS': ['gl_entries'],
  'T001': ['company_codes'],
  'T004': ['chart_of_accounts'],
  'T009': ['fiscal_year_variants'],
  'SKA1': ['gl_accounts', 'general_ledger_accounts'],
  'SKB1': ['gl_accounts', 'general_ledger_accounts'],
  'FAGL_SPLIT_ACTIVATION': ['document_splitting_activation'],
  'FAGL_SPLIT_RULES': ['document_splitting_rules'],
  'FAGL_SPLIT_CHAR': ['document_splitting_characteristics'],
  'FAGL_SPLIT_METHODS': ['document_splitting_methods'],
  'FAGL_SPLIT_ITEM_CAT': ['document_splitting_item_categories'],
  'FAGL_SPLIT_BT': ['document_splitting_business_transactions'],
  'FAGL_SPLIT_DOC_TYPE': ['document_splitting_document_type_mapping'],
  'FAGL_SPLIT_ZBA': ['document_splitting_zero_balance_accounts'],
  'FAGL_SPLIT_GL_CAT': ['document_splitting_gl_account_categories'],
  'CSKS': ['cost_centers', 'cost_center_master'],
  'CEPC': ['profit_centers', 'profit_center_master'],
  'COEP': ['cost_center_actuals', 'cost_center_costs'],
  'COBK': ['cost_allocations'],
  'COSP': ['cost_allocations'],
  'COSB': ['cost_allocations'],
  'AUFK': ['internal_orders'],
  'VBAK': ['sales_orders'],
  'VBAP': ['sales_order_items'],
  'VBKD': ['sales_orders'],
  'VBPA': ['sales_order_conditions'],
  'VBUK': ['sales_orders'],
  'VBUP': ['sales_order_items'],
  'VBRK': ['sales_invoices'],
  'VBRP': ['sales_invoice_items'],
  'LIKP': ['deliveries', 'delivery_documents'],
  'LIPS': ['delivery_items'],
  'KNA1': ['erp_customers', 'sales_customers'],
  'KNB1': ['erp_customers'],
  'KNVV': ['sales_customers'],
  'KNVP': ['customer_contacts', 'sales_customer_contacts'],
  'MARA': ['material_master', 'materials'],
  'MARC': ['material_plants', 'materials'],
  'MARD': ['storage_locations', 'inventory_balance'],
  'MAKT': ['materials', 'material_master'],
  'MBEW': ['materials', 'material_master'],
  'EKKO': ['purchase_orders'],
  'EKPO': ['purchase_order_items'],
  'EKBE': ['goods_receipt', 'goods_receipt_documents'],
  'MSEG': ['goods_receipt', 'goods_receipt_items', 'inventory_movements'],
  'MKPF': ['goods_receipt_documents'],
  'LFA1': ['vendors', 'erp_vendors'],
  'LFB1': ['vendors', 'erp_vendors'],
  'LFM1': ['vendors', 'erp_vendors'],
  'AFKO': ['production_orders'],
  'AFPO': ['production_order_operations'],
  'AFRU': ['production_orders'],
  'AFVC': ['routings', 'routing_operations'],
  'AFVV': ['routing_operations'],
  'CRHD': ['work_centers'],
  'MAST': ['bill_of_materials'],
  'STKO': ['bill_of_materials'],
  'STPO': ['bom_components', 'bom_items'],
  'PLAF': ['planned_orders'],
  'RESB': ['material_reservations'],
  'ANLA': ['asset_master', 'assets'],
  'ANLB': ['depreciation_areas'],
  'ANLC': ['assets'],
  'ANEP': ['assets'],
  'ANEA': ['assets'],
  'PA0001': ['employees', 'personnel', 'employee_master'],
  'PA0002': ['employees', 'personnel'],
  'PA0003': ['employees', 'personnel'],
  'PA0008': ['employees', 'personnel'],
  'PA0009': ['employees', 'personnel']
};

async function analyzeSAPTables() {
  try {
    const dbTables = await getDatabaseTables();
    const analysis = [];
    
    for (const sapTable of importantSapTables) {
      const yourTables = yourTableMappings[sapTable.sap] || [];
      const found = yourTables.some(t => dbTables.includes(t.toLowerCase()));
      
      analysis.push({
        sapTable: sapTable.sap,
        module: sapTable.module,
        category: sapTable.category,
        description: sapTable.description,
        status: found ? '✅ Implemented' : '❌ Missing',
        yourTables: found ? yourTables.filter(t => dbTables.includes(t.toLowerCase())).join(', ') : 'Not found',
        reason: found ? 'Covered by existing tables' : getMissingReason(sapTable),
        priority: found ? '-' : getPriority(sapTable),
        recommendation: found ? 'No action needed' : getRecommendation(sapTable)
      });
    }
    
    // Create Excel
    const wb = XLSX.utils.book_new();
    
    // Main analysis sheet
    const mainData = [
      ['SAP Table', 'Module', 'Category', 'Description', 'Status', 'Your Table(s)', 'Reason', 'Priority', 'Recommendation']
    ];
    
    analysis.forEach(a => {
      mainData.push([
        a.sapTable,
        a.module,
        a.category,
        a.description,
        a.status,
        a.yourTables,
        a.reason,
        a.priority,
        a.recommendation
      ]);
    });
    
    const ws1 = XLSX.utils.aoa_to_sheet(mainData);
    ws1['!cols'] = [
      { wch: 25 }, // SAP Table
      { wch: 8 },  // Module
      { wch: 25 }, // Category
      { wch: 50 }, // Description
      { wch: 15 }, // Status
      { wch: 35 }, // Your Tables
      { wch: 60 }, // Reason
      { wch: 12 }, // Priority
      { wch: 80 }  // Recommendation
    ];
    XLSX.utils.book_append_sheet(wb, ws1, 'SAP Table Analysis');
    
    // Missing tables only
    const missingData = [
      ['SAP Table', 'Module', 'Category', 'Description', 'Priority', 'Reason', 'Recommendation']
    ];
    
    analysis.filter(a => a.status === '❌ Missing').forEach(a => {
      missingData.push([
        a.sapTable,
        a.module,
        a.category,
        a.description,
        a.priority,
        a.reason,
        a.recommendation
      ]);
    });
    
    const ws2 = XLSX.utils.aoa_to_sheet(missingData);
    ws2['!cols'] = [
      { wch: 25 },
      { wch: 8 },
      { wch: 25 },
      { wch: 50 },
      { wch: 12 },
      { wch: 60 },
      { wch: 80 }
    ];
    XLSX.utils.book_append_sheet(wb, ws2, 'Missing Tables');
    
    // Summary
    const summaryData = [
      ['Analysis Summary'],
      [''],
      ['Total SAP Tables Analyzed', importantSapTables.length],
      ['Implemented', analysis.filter(a => a.status === '✅ Implemented').length],
      ['Missing', analysis.filter(a => a.status === '❌ Missing').length],
      [''],
      ['Missing by Priority'],
      ['High', analysis.filter(a => a.priority === 'High').length],
      ['Medium', analysis.filter(a => a.priority === 'Medium').length],
      ['Low', analysis.filter(a => a.priority === 'Low').length]
    ];
    
    const ws3 = XLSX.utils.aoa_to_sheet(summaryData);
    ws3['!cols'] = [{ wch: 30 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, ws3, 'Summary');
    
    const fileName = 'focused-sap-comparison.xlsx';
    XLSX.writeFile(wb, fileName);
    
    const implemented = analysis.filter(a => a.status === '✅ Implemented').length;
    const missing = analysis.filter(a => a.status === '❌ Missing').length;
    const highPriority = analysis.filter(a => a.priority === 'High').length;
    
    console.log(`\n✅ Focused Analysis Complete!`);
    console.log(`📊 Total Important SAP Tables: ${importantSapTables.length}`);
    console.log(`✅ Implemented: ${implemented} (${(implemented/importantSapTables.length*100).toFixed(1)}%)`);
    console.log(`❌ Missing: ${missing} (${(missing/importantSapTables.length*100).toFixed(1)}%)`);
    console.log(`🔴 High Priority Missing: ${highPriority}`);
    console.log(`\n📁 Excel file: ${fileName}`);
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

async function getDatabaseTables() {
  const result = await pool.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);
  return result.rows.map(r => r.table_name.toLowerCase());
}

function getMissingReason(sapTable) {
  const reasons = {
    'BSIS': 'Separate debit/credit tables not needed - handled by gl_entries with amount sign',
    'BSAS': 'Separate debit/credit tables not needed - handled by gl_entries with amount sign',
    'BSAK': 'Cleared items tracked in same table with status field',
    'BSAD': 'Cleared items tracked in same table with status field',
    'FAGLFLEXA': 'Line items handled in gl_entries or accounting_document_items',
    'GLT0': 'Totals calculated on-the-fly or in general_ledger table',
    'SKA1': 'Chart-specific data handled in gl_accounts with chart_of_accounts_id',
    'SKB1': 'Company-specific data handled in gl_accounts with company_code_id',
    'COEP': 'CO line items may be consolidated into cost_center_actuals',
    'COBK': 'CO document header may not be needed if using simpler structure',
    'COSP': 'Primary cost totals may be calculated from transactions',
    'COSB': 'Secondary cost totals may be calculated from transactions',
    'VBKD': 'Business data included in sales_orders table',
    'VBPA': 'Partner data handled in separate partner/contact tables',
    'VBUK': 'Status tracked in sales_orders table',
    'VBUP': 'Status tracked in sales_order_items table',
    'KNB1': 'Company code data may be in main customer table',
    'KNVV': 'Sales area data may be in main customer table or separate',
    'KNVP': 'Partner functions handled in contact/relationship tables',
    'MARC': 'Plant data may be in material_plants or materials table',
    'MARD': 'Storage location data in storage_locations or inventory_balance',
    'MAKT': 'Descriptions in materials table or separate descriptions table',
    'MBEW': 'Valuation data in materials table',
    'EKBE': 'History tracked in goods_receipt or transaction tables',
    'LFB1': 'Company code data in main vendor table',
    'LFM1': 'Purchasing org data in main vendor table',
    'AFPO': 'Operations may be in production_order_operations',
    'AFRU': 'Confirmations may be in production_orders',
    'AFVV': 'Operation values in routing_operations',
    'STKO': 'BOM header in bill_of_materials',
    'STPO': 'BOM items in bom_components or bom_items',
    'ANLC': 'Value fields in assets table',
    'ANEP': 'Line items in assets or transactions',
    'ANEA': 'Document header in assets or transactions',
    'PA0002': 'Personal data in employees table',
    'PA0003': 'Payroll status may not be needed',
    'PA0008': 'Basic pay in employees or payroll table',
    'PA0009': 'Bank details in employees or separate table'
  };
  
  return reasons[sapTable.sap] || 'Table structure may be consolidated or handled differently in your system';
}

function getPriority(sapTable) {
  const highPriority = ['BKPF', 'BSEG', 'BSIK', 'BSID', 'FAGLFLEXT', 'VBAK', 'VBAP', 'VBRK', 'VBRP', 'MARA', 'EKKO', 'EKPO', 'MSEG', 'MKPF'];
  const mediumPriority = ['CSKS', 'CEPC', 'LIKP', 'LIPS', 'KNA1', 'LFA1', 'AFKO', 'AFVC', 'CRHD', 'MAST', 'ANLA', 'ANLB'];
  
  if (highPriority.includes(sapTable.sap)) return 'High';
  if (mediumPriority.includes(sapTable.sap)) return 'Medium';
  return 'Low';
}

function getRecommendation(sapTable) {
  const recommendations = {
    'BSIS': 'Not needed - use gl_entries with debit/credit indicator',
    'BSAS': 'Not needed - use gl_entries with debit/credit indicator',
    'BSAK': 'Consider adding cleared_date or status field to accounts_payable',
    'BSAD': 'Consider adding cleared_date or status field to accounts_receivable',
    'FAGLFLEXA': 'Line items already in accounting_document_items - no action needed',
    'GLT0': 'Consider materialized view or summary table if performance needed',
    'SKA1': 'Chart-specific fields can be added to gl_accounts if needed',
    'SKB1': 'Company-specific fields already in gl_accounts - no action needed',
    'COEP': 'Evaluate if detailed CO line items needed for reporting',
    'COBK': 'May not be needed if using simpler cost allocation structure',
    'COSP': 'Totals can be calculated from transactions if needed',
    'COSB': 'Totals can be calculated from transactions if needed',
    'VBKD': 'Business data fields can be added to sales_orders if needed',
    'VBPA': 'Partner relationships handled in contact tables - review if partner functions needed',
    'VBUK': 'Status fields can be added to sales_orders if needed',
    'VBUP': 'Status fields can be added to sales_order_items if needed',
    'KNB1': 'Company code fields can be added to customer table if needed',
    'KNVV': 'Sales area assignment may be needed - evaluate business requirements',
    'KNVP': 'Partner function assignment may be needed - evaluate business requirements',
    'MARC': 'Plant-specific data in material_plants - review if more fields needed',
    'MARD': 'Storage location data in storage_locations - review if more fields needed',
    'MAKT': 'Descriptions can be added to materials table or separate table',
    'MBEW': 'Valuation fields can be added to materials table if needed',
    'EKBE': 'History tracking in goods_receipt - review if more detail needed',
    'LFB1': 'Company code fields can be added to vendor table if needed',
    'LFM1': 'Purchasing org fields can be added to vendor table if needed',
    'AFPO': 'Operations in production_order_operations - review if more fields needed',
    'AFRU': 'Confirmations can be added to production_orders if needed',
    'AFVV': 'Operation values in routing_operations - review if more fields needed',
    'STKO': 'BOM header in bill_of_materials - review if more fields needed',
    'STPO': 'BOM items in bom_components - review if more fields needed',
    'ANLC': 'Value fields can be added to assets table if needed',
    'ANEP': 'Line items can be in assets or separate transactions table',
    'ANEA': 'Document header can be in assets or separate transactions table',
    'PA0002': 'Personal data in employees table - review if more fields needed',
    'PA0003': 'Payroll status may not be needed unless payroll module implemented',
    'PA0008': 'Basic pay can be in employees or separate payroll table',
    'PA0009': 'Bank details can be in employees or separate table'
  };
  
  return recommendations[sapTable.sap] || 'Evaluate based on specific business requirements';
}

analyzeSAPTables();

