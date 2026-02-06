import pkg from 'pg';
const { Pool } = pkg;

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
  
  for (const [module, config] of Object.entries(sapModulePatterns)) {
    // Check keywords
    for (const keyword of config.keywords) {
      if (lowerName.includes(keyword.toLowerCase())) {
        categories.push(module);
        break;
      }
    }
  }
  
  // Special handling for specific patterns
  if (lowerName.startsWith('sd_') || lowerName.includes('sales_')) {
    if (!categories.includes('SD - Sales & Distribution')) {
      categories.push('SD - Sales & Distribution');
    }
  }
  
  if (lowerName.startsWith('document_splitting')) {
    if (!categories.includes('Document Splitting')) {
      categories.unshift('Document Splitting');
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
      categories.push('Master Data');
    } else if (lowerName.includes('system') || lowerName.includes('user') || lowerName.includes('config') || lowerName.includes('audit')) {
      categories.push('System & Configuration');
    } else {
      categories.push('Other');
    }
  }
  
  return categories[0] || 'Other'; // Return primary category
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
  
  if (lowerName.includes('delivery')) {
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

async function listTablesByModule() {
  try {
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    // Organize by module
    const tablesByModule = {};
    
    result.rows.forEach(row => {
      const tableName = row.table_name;
      const module = categorizeTable(tableName);
      
      if (!tablesByModule[module]) {
        tablesByModule[module] = [];
      }
      
      tablesByModule[module].push({
        name: tableName,
        sapEquivalent: getSAPEquivalent(tableName)
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
    
    console.log('='.repeat(100));
    console.log('DATABASE TABLES ORGANIZED BY MODULE (SAP COMPARISON)');
    console.log('='.repeat(100));
    console.log(`\nTotal Tables: ${result.rows.length}\n`);
    
    let totalCount = 0;
    
    for (const module of moduleOrder) {
      if (tablesByModule[module] && tablesByModule[module].length > 0) {
        const tables = tablesByModule[module];
        totalCount += tables.length;
        
        console.log(`\n${'='.repeat(100)}`);
        console.log(`${module.toUpperCase()} (${tables.length} tables)`);
        console.log('='.repeat(100));
        console.log(`${'No.'.padEnd(5)} ${'Table Name'.padEnd(50)} ${'SAP Equivalent'.padEnd(30)}`);
        console.log('-'.repeat(100));
        
        tables.forEach((table, index) => {
          const num = (index + 1).toString().padEnd(5);
          const name = table.name.padEnd(50);
          const sap = table.sapEquivalent.padEnd(30);
          console.log(`${num} ${name} ${sap}`);
        });
      }
    }
    
    // Handle any remaining modules not in the order list
    for (const [module, tables] of Object.entries(tablesByModule)) {
      if (!moduleOrder.includes(module)) {
        console.log(`\n${'='.repeat(100)}`);
        console.log(`${module.toUpperCase()} (${tables.length} tables)`);
        console.log('='.repeat(100));
        console.log(`${'No.'.padEnd(5)} ${'Table Name'.padEnd(50)} ${'SAP Equivalent'.padEnd(30)}`);
        console.log('-'.repeat(100));
        
        tables.forEach((table, index) => {
          const num = (index + 1).toString().padEnd(5);
          const name = table.name.padEnd(50);
          const sap = table.sapEquivalent.padEnd(30);
          console.log(`${num} ${name} ${sap}`);
        });
      }
    }
    
    console.log(`\n${'='.repeat(100)}`);
    console.log(`SUMMARY: ${totalCount} tables organized across ${Object.keys(tablesByModule).length} modules`);
    console.log('='.repeat(100));
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

listTablesByModule();

