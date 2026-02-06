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

// SAP table naming patterns by module
const sapModulePatterns = {
  'FI - Financial Accounting': {
    patterns: ['BKPF', 'BSEG', 'BSIS', 'BSAS', 'BSID', 'BSAD', 'BSIK', 'BSAK', 'GLT0', 'FAGLFLEXT', 'FAGLFLEXA'],
    keywords: ['accounting', 'document', 'ledger', 'gl_', 'general_ledger', 'accounts_payable', 'accounts_receivable', 'payment', 'bank', 'currency', 'fiscal', 'chart_of_accounts']
  },
  'CO - Controlling': {
    patterns: ['COEP', 'COBK', 'COSP', 'COSB', 'COPA', 'CEPC', 'CSKS', 'CSKA', 'COSP', 'COSB'],
    keywords: ['cost_center', 'profit_center', 'cost', 'allocation', 'internal_order', 'activity', 'profitability']
  },
  'SD - Sales & Distribution': {
    patterns: ['VBAK', 'VBAP', 'VBKD', 'VBPA', 'VBUK', 'VBUP', 'LIKP', 'LIPS', 'VBRK', 'VBRP', 'KNA1', 'KNVV', 'KNVP'],
    keywords: ['sales', 'order', 'delivery', 'invoice', 'customer', 'quote', 'inquiry', 'sd_', 'sales_']
  },
  'MM - Materials Management': {
    patterns: ['MARA', 'MARC', 'MARD', 'MAKT', 'MBEW', 'EKBE', 'EKPO', 'EKET', 'EKES', 'EKKO', 'EKPA', 'MSEG', 'MKPF'],
    keywords: ['material', 'purchase', 'goods_receipt', 'goods_issue', 'inventory', 'stock', 'vendor', 'warehouse', 'storage']
  },
  'PP - Production Planning': {
    patterns: ['AFKO', 'AFPO', 'AFRU', 'AFRC', 'AFVC', 'AFVV', 'CRHD', 'CRCA', 'PLAF', 'RESB'],
    keywords: ['production', 'routing', 'work_center', 'bom', 'bill_of_materials', 'mrp', 'planned_order']
  },
  'HR - Human Resources': {
    patterns: ['PA0001', 'PA0002', 'PA0003', 'PA0008', 'PA0009', 'PA0014', 'PA0015'],
    keywords: ['employee', 'personnel', 'hr_', 'personnel']
  },
  'AA - Asset Accounting': {
    patterns: ['ANLA', 'ANLB', 'ANLC', 'ANEP', 'ANEA', 'ANLP', 'ANLC'],
    keywords: ['asset', 'depreciation', 'chart_of_depreciation']
  },
  'Document Splitting': {
    patterns: ['FAGL_SPLIT_*'],
    keywords: ['document_splitting']
  },
  'System & Configuration': {
    patterns: ['T000', 'T001', 'T880', 'USR01', 'USR02'],
    keywords: ['system', 'user', 'role', 'permission', 'config', 'audit', 'log', 'api_key']
  },
  'Master Data': {
    patterns: ['KNA1', 'LFA1', 'MARA', 'T001', 'T880'],
    keywords: ['master', 'company_code', 'vendor', 'customer', 'material', 'chart_of_accounts', 'fiscal_year', 'currency']
  }
};

function categorizeTable(tableName) {
  const lowerName = tableName.toLowerCase();
  const categories = [];
  
  // Check for document splitting first (most specific)
  if (lowerName.startsWith('document_splitting')) {
    return 'Document Splitting';
  }
  
  for (const [module, config] of Object.entries(sapModulePatterns)) {
    if (module === 'Document Splitting') continue; // Already handled
    
    // Check keywords
    for (const keyword of config.keywords) {
      if (lowerName.includes(keyword.toLowerCase())) {
        categories.push(module);
        break;
      }
    }
  }
  
  // Special handling for specific patterns
  if (lowerName.startsWith('sd_') || (lowerName.includes('sales_') && !lowerName.includes('invoice'))) {
    if (!categories.includes('SD - Sales & Distribution')) {
      categories.push('SD - Sales & Distribution');
    }
  }
  
  if (lowerName.includes('accounting') || lowerName.includes('gl_') || lowerName.includes('general_ledger')) {
    if (!categories.includes('FI - Financial Accounting')) {
      categories.push('FI - Financial Accounting');
    }
  }
  
  if (lowerName.includes('cost_center') || lowerName.includes('profit_center') || lowerName.includes('cost_allocation')) {
    if (!categories.includes('CO - Controlling')) {
      categories.push('CO - Controlling');
    }
  }
  
  if (lowerName.includes('material') || lowerName.includes('purchase') || lowerName.includes('goods_receipt') || lowerName.includes('inventory')) {
    if (!categories.includes('MM - Materials Management')) {
      categories.push('MM - Materials Management');
    }
  }
  
  if (lowerName.includes('production') || lowerName.includes('routing') || lowerName.includes('work_center') || lowerName.includes('bom')) {
    if (!categories.includes('PP - Production Planning')) {
      categories.push('PP - Production Planning');
    }
  }
  
  if (lowerName.includes('employee') || lowerName.includes('personnel')) {
    if (!categories.includes('HR - Human Resources')) {
      categories.push('HR - Human Resources');
    }
  }
  
  if (lowerName.includes('asset') || lowerName.includes('depreciation')) {
    if (!categories.includes('AA - Asset Accounting')) {
      categories.push('AA - Asset Accounting');
    }
  }
  
  // If no category found, assign to appropriate default
  if (categories.length === 0) {
    if (lowerName.includes('master') || lowerName.includes('company_code') || lowerName.includes('vendor') || lowerName.includes('customer')) {
      return 'Master Data';
    } else if (lowerName.includes('system') || lowerName.includes('user') || lowerName.includes('config') || lowerName.includes('audit')) {
      return 'System & Configuration';
    } else {
      return 'Other';
    }
  }
  
  return categories[0]; // Return primary category
}

function getSAPEquivalent(tableName) {
  const lowerName = tableName.toLowerCase();
  
  // Direct mappings
  const mappings = {
    'accounting_documents': 'BKPF',
    'accounting_document_items': 'BSEG',
    'general_ledger_accounts': 'FAGLFLEXT',
    'accounts_payable': 'BSIK/BSAK',
    'accounts_receivable': 'BSID/BSAD',
    'vendors': 'LFA1',
    'erp_customers': 'KNA1',
    'sales_customers': 'KNA1',
    'material_master': 'MARA',
    'materials': 'MARA',
    'sales_orders': 'VBAK',
    'sales_order_items': 'VBAP',
    'purchase_orders': 'EKKO',
    'purchase_order_items': 'EKPO',
    'goods_receipt': 'MSEG/MKPF',
    'deliveries': 'LIKP',
    'delivery_items': 'LIPS',
    'sales_invoices': 'VBRK',
    'sales_invoice_items': 'VBRP',
    'cost_centers': 'CSKS',
    'profit_centers': 'CEPC',
    'company_codes': 'T001',
    'chart_of_accounts': 'T004',
    'fiscal_year_variants': 'T009',
    'ledgers': 'FAGL_SPLIT_*',
    'document_splitting_activation': 'FAGL_SPLIT_ACTIVATION',
    'document_splitting_rules': 'FAGL_SPLIT_RULES',
    'document_splitting_characteristics': 'FAGL_SPLIT_CHAR',
    'document_splitting_methods': 'FAGL_SPLIT_METHODS',
    'document_splitting_item_categories': 'FAGL_SPLIT_ITEM_CAT',
    'document_splitting_business_transactions': 'FAGL_SPLIT_BT',
    'document_splitting_document_type_mapping': 'FAGL_SPLIT_DOC_TYPE',
    'document_splitting_zero_balance_accounts': 'FAGL_SPLIT_ZBA',
    'document_splitting_gl_account_categories': 'FAGL_SPLIT_GL_CAT',
    'asset_master': 'ANLA',
    'assets': 'ANLA',
    'depreciation_areas': 'ANLB',
    'production_orders': 'AFKO',
    'routings': 'AFVC',
    'work_centers': 'CRHD',
    'bill_of_materials': 'MAST',
    'employees': 'PA0001',
    'personnel': 'PA0001'
  };
  
  if (mappings[tableName]) {
    return mappings[tableName];
  }
  
  // Pattern matching
  if (lowerName.startsWith('document_splitting_')) {
    return 'FAGL_SPLIT_*';
  }
  
  if (lowerName.includes('sales_order')) {
    return 'VBAK/VBAP';
  }
  
  if (lowerName.includes('purchase_order')) {
    return 'EKKO/EKPO';
  }
  
  if (lowerName.includes('goods_receipt')) {
    return 'MSEG/MKPF';
  }
  
  if (lowerName.includes('delivery') && !lowerName.includes('document')) {
    return 'LIKP/LIPS';
  }
  
  if (lowerName.includes('cost_center')) {
    return 'CSKS';
  }
  
  if (lowerName.includes('profit_center')) {
    return 'CEPC';
  }
  
  return '-';
}

async function exportTablesToExcel() {
  try {
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    // Prepare data for Excel
    const excelData = [];
    
    // Add header row
    excelData.push(['No.', 'Table Name', 'Module', 'SAP Equivalent', 'Description']);
    
    // Organize by module first
    const tablesByModule = {};
    
    result.rows.forEach(row => {
      const tableName = row.table_name;
      const module = categorizeTable(tableName);
      
      if (!tablesByModule[module]) {
        tablesByModule[module] = [];
      }
      
      tablesByModule[module].push({
        name: tableName,
        sapEquivalent: getSAPEquivalent(tableName),
        module: module
      });
    });
    
    // Sort modules
    const moduleOrder = [
      'FI - Financial Accounting',
      'CO - Controlling',
      'SD - Sales & Distribution',
      'MM - Materials Management',
      'PP - Production Planning',
      'HR - Human Resources',
      'AA - Asset Accounting',
      'Document Splitting',
      'Master Data',
      'System & Configuration',
      'Other'
    ];
    
    let rowNumber = 1;
    
    // Add data rows organized by module
    for (const module of moduleOrder) {
      if (tablesByModule[module] && tablesByModule[module].length > 0) {
        // Add module header row
        excelData.push([`=== ${module} (${tablesByModule[module].length} tables) ===`, '', '', '', '']);
        
        const tables = tablesByModule[module];
        tables.forEach(table => {
          excelData.push([
            rowNumber++,
            table.name,
            table.module,
            table.sapEquivalent,
            '' // Description column (can be filled manually)
          ]);
        });
        
        // Add blank row between modules
        excelData.push(['', '', '', '', '']);
      }
    }
    
    // Create workbook
    const wb = XLSX.utils.book_new();
    
    // Create worksheet from data
    const ws = XLSX.utils.aoa_to_sheet(excelData);
    
    // Set column widths
    ws['!cols'] = [
      { wch: 6 },   // No.
      { wch: 45 },  // Table Name
      { wch: 30 },  // Module
      { wch: 25 },  // SAP Equivalent
      { wch: 40 }   // Description
    ];
    
    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Tables by Module');
    
    // Create summary sheet
    const summaryData = [
      ['Module', 'Table Count'],
      ...moduleOrder.map(module => [
        module,
        tablesByModule[module] ? tablesByModule[module].length : 0
      ]),
      ['TOTAL', result.rows.length]
    ];
    
    const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
    summaryWs['!cols'] = [
      { wch: 35 },
      { wch: 12 }
    ];
    XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');
    
    // Write file
    const fileName = 'database-tables-sap-comparison.xlsx';
    XLSX.writeFile(wb, fileName);
    
    console.log(`\n✅ Excel file created successfully: ${fileName}`);
    console.log(`📊 Total tables: ${result.rows.length}`);
    console.log(`📁 Modules: ${Object.keys(tablesByModule).length}`);
    console.log(`\nFile location: ${process.cwd()}\\${fileName}`);
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

exportTablesToExcel();

