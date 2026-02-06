import express from 'express';
import { db } from '../db';
import { sql } from 'drizzle-orm';

const router = express.Router();

// Domain Intelligence Service for Jr. Assistant
// Maps business requests to specific data and screens

interface DomainRequest {
  domain: string;
  entity: string;
  action: string;
  company_code?: string;
}

interface DomainResponse {
  success: boolean;
  data_summary: string;
  navigation_url: string;
  entity_count?: number;
  quick_actions: string[];
}

// Enhanced domain mapping with live data integration
const DOMAIN_MAPPINGS = {
  finance: {
    conditions: {
      api: '/api/condition-types',
      url: '/condition-types-management',
      table: 'condition_types'
    },
    accounts: {
      api: '/api/master-data/chart-of-accounts',
      url: '/master-data/chart-of-accounts',
      table: 'chart_of_accounts'
    },
    gl: {
      api: '/api/finance/gl-accounts',
      url: '/finance',
      table: 'chart_of_accounts'
    },
    ar: {
      api: '/api/finance/accounts-receivable',
      url: '/finance?tab=ar',
      table: 'accounts_receivable'
    },
    ap: {
      api: '/api/finance/accounts-payable',
      url: '/finance?tab=ap',
      table: 'accounts_payable'
    }
  },
  sales: {
    customers: {
      api: '/api/sales/customers',
      url: '/sales/customers',
      table: 'customers'
    },
    orders: {
      api: '/api/sales/orders',
      url: '/sales/orders',
      table: 'sales_orders'
    },
    quotes: {
      api: '/api/sales/quotes',
      url: '/sales/quotes',
      table: 'sales_quotes'
    }
  },
  inventory: {
    products: {
      api: '/api/inventory/products',
      url: '/inventory/products',
      table: 'products'
    },
    stock: {
      api: '/api/inventory/stock',
      url: '/inventory/stock',
      table: 'inventory_movements'
    },
    categories: {
      api: '/api/inventory/categories',
      url: '/inventory/categories',
      table: 'product_categories'
    }
  },
  masterdata: {
    company: {
      api: '/api/master-data/company-code',
      url: '/master-data/company-code',
      table: 'company_codes'
    },
    plant: {
      api: '/api/master-data/plant',
      url: '/master-data/plant',
      table: 'plants'
    },
    vendor: {
      api: '/api/master-data/vendor',
      url: '/master-data/vendor',
      table: 'vendors'
    },
    material: {
      api: '/api/master-data/material',
      url: '/master-data/material',
      table: 'materials'
    }
  },
  production: {
    workorders: {
      api: '/api/production/work-orders',
      url: '/production',
      table: 'work_orders'
    },
    bom: {
      api: '/api/master-data/bill-of-materials',
      url: '/master-data/bill-of-materials',
      table: 'bill_of_materials'
    }
  },
  purchasing: {
    orders: {
      api: '/api/purchase/orders',
      url: '/purchase',
      table: 'purchase_orders'
    },
    requisitions: {
      api: '/api/purchase/requisitions',
      url: '/transactions/purchase-requisition',
      table: 'purchase_requisitions'
    }
  },
  hr: {
    employees: {
      api: '/api/master-data/employees',
      url: '/master-data/employees',
      table: 'employees'
    },
    payroll: {
      api: '/api/hr/payroll',
      url: '/transactions/payroll-processing',
      table: 'payroll_records'
    }
  },
  controlling: {
    costcenters: {
      api: '/api/master-data/cost-centers',
      url: '/master-data/cost-centers',
      table: 'cost_centers'
    },
    profitcenters: {
      api: '/api/master-data/profit-centers',
      url: '/master-data/profit-centers',
      table: 'profit_centers'
    }
  }
};

// Smart domain detection and data retrieval
router.post('/analyze-request', async (req, res) => {
  try {
    const { message, current_domain } = req.body;
    const userInput = message.toLowerCase();
    
    // Analyze the request and determine domain + entity
    const analysis = await analyzeDomainRequest(userInput, current_domain);
    
    if (analysis.domain && analysis.entity) {
      const response = await getDomainData(analysis.domain, analysis.entity, analysis.company_code);
      res.json(response);
    } else {
      res.json({
        success: false,
        message: 'Could not determine specific domain request',
        suggestion: 'Try asking about specific entities like "show customers" or "bring conditions"'
      });
    }
  } catch (error) {
    console.error('Domain analysis error:', error);
    res.status(500).json({ success: false, error: 'Domain analysis failed' });
  }
});

// Analyze user request to determine domain and entity
async function analyzeDomainRequest(userInput: string, currentDomain: string): Promise<DomainRequest> {
  const analysis: DomainRequest = {
    domain: '',
    entity: '',
    action: '',
    company_code: 'DOM01'
  };
  
  // Determine action
  if (userInput.includes('show') || userInput.includes('list') || userInput.includes('display')) {
    analysis.action = 'show';
  } else if (userInput.includes('bring') || userInput.includes('open') || userInput.includes('navigate')) {
    analysis.action = 'navigate';
  } else if (userInput.includes('create') || userInput.includes('add')) {
    analysis.action = 'create';
  }
  
  // Determine domain and entity
  if (userInput.includes('condition')) {
    analysis.domain = 'finance';
    analysis.entity = 'conditions';
  } else if (userInput.includes('customer')) {
    analysis.domain = 'sales';
    analysis.entity = 'customers';
  } else if (userInput.includes('sales order')) {
    analysis.domain = 'sales';
    analysis.entity = 'orders';
  } else if (userInput.includes('product') || userInput.includes('material')) {
    analysis.domain = 'inventory';
    analysis.entity = 'products';
  } else if (userInput.includes('stock') || userInput.includes('inventory')) {
    analysis.domain = 'inventory';
    analysis.entity = 'stock';
  } else if (userInput.includes('company code')) {
    analysis.domain = 'masterdata';
    analysis.entity = 'company';
  } else if (userInput.includes('plant')) {
    analysis.domain = 'masterdata';
    analysis.entity = 'plant';
  } else if (userInput.includes('vendor')) {
    analysis.domain = 'masterdata';
    analysis.entity = 'vendor';
  } else if (userInput.includes('ar') || userInput.includes('accounts receivable') || userInput.includes('receivables')) {
    analysis.domain = 'finance';
    analysis.entity = 'ar';
  } else if (userInput.includes('ap') || userInput.includes('accounts payable') || userInput.includes('payables')) {
    analysis.domain = 'finance';
    analysis.entity = 'ap';
  } else if (userInput.includes('account') || userInput.includes('gl') || userInput.includes('chart')) {
    analysis.domain = 'finance';
    analysis.entity = 'accounts';
  } else if (userInput.includes('work order') || userInput.includes('production')) {
    analysis.domain = 'production';
    analysis.entity = 'workorders';
  } else if (userInput.includes('purchase order') || userInput.includes('purchasing')) {
    analysis.domain = 'purchasing';
    analysis.entity = 'orders';
  } else if (userInput.includes('employee')) {
    analysis.domain = 'hr';
    analysis.entity = 'employees';
  } else if (userInput.includes('cost center')) {
    analysis.domain = 'controlling';
    analysis.entity = 'costcenters';
  } else if (userInput.includes('profit center')) {
    analysis.domain = 'controlling';
    analysis.entity = 'profitcenters';
  }
  
  return analysis;
}

// Get live data for specific domain and entity
async function getDomainData(domain: string, entity: string, companyCode: string = 'DOM01'): Promise<DomainResponse> {
  try {
    const domainMappings = DOMAIN_MAPPINGS as any;
    const mapping = domainMappings[domain]?.[entity];
    if (!mapping) {
      return {
        success: false,
        data_summary: 'Domain mapping not found',
        navigation_url: '/',
        quick_actions: []
      };
    }
    
    // Get actual count from database
    let entityCount = 0;
    try {
      const countResult = await db.execute(sql`SELECT COUNT(*) as count FROM ${sql.identifier(mapping.table)}`);
      const firstResult = countResult?.[0] as any;
      entityCount = parseInt(firstResult?.count || '0');
    } catch (dbError) {
      console.log(`Table ${mapping.table} may not exist yet`);
    }
    
    // Generate domain-specific summary
    const summary = generateDomainSummary(domain, entity, entityCount, companyCode);
    const quickActions = generateQuickActions(domain, entity);
    
    return {
      success: true,
      data_summary: summary,
      navigation_url: mapping.url,
      entity_count: entityCount,
      quick_actions: quickActions
    };
  } catch (error) {
    console.error('Domain data retrieval error:', error);
    return {
      success: false,
      data_summary: 'Error retrieving domain data',
      navigation_url: '/',
      quick_actions: []
    };
  }
}

// Generate intelligent summaries based on domain
function generateDomainSummary(domain: string, entity: string, count: number, companyCode: string): string {
  switch (`${domain}-${entity}`) {
    case 'finance-conditions':
      return `Found ${count} condition types defined for ${companyCode}. These include revenue, cost, discount, tax, and fee conditions for pricing management.`;
    case 'sales-customers':
      return `${count} customers registered in the system. Manage customer master data, credit limits, and sales relationships.`;
    case 'sales-orders':
      return `${count} sales orders in the system. Track order processing, delivery status, and customer fulfillment.`;
    case 'inventory-products':
      return `${count} products in inventory. Manage product master data, pricing, and availability.`;
    case 'inventory-stock':
      return `Stock movements and inventory transactions. Monitor stock levels and material movements.`;
    case 'masterdata-company':
      return `Company code master data for ${companyCode}. Organizational structure and legal entity information.`;
    case 'masterdata-plant':
      return `${count} plants configured. Manufacturing and storage location management.`;
    case 'masterdata-vendor':
      return `${count} vendors in the system. Supplier master data and purchasing relationships.`;
    case 'finance-accounts':
      return `Chart of accounts with ${count} GL accounts. Financial account structure and hierarchy.`;
    case 'finance-ar':
      return `${count} accounts receivable records. Customer outstanding balances and payment tracking.`;
    case 'finance-ap':
      return `${count} accounts payable records. Vendor outstanding balances and payment management.`;
    case 'production-workorders':
      return `${count} work orders in production. Manufacturing execution and scheduling.`;
    case 'purchasing-orders':
      return `${count} purchase orders. Procurement and vendor order management.`;
    case 'hr-employees':
      return `${count} employees in the system. HR master data and organizational assignments.`;
    case 'controlling-costcenters':
      return `${count} cost centers defined. Cost accounting and responsibility center management.`;
    case 'controlling-profitcenters':
      return `${count} profit centers configured. Profitability analysis and segment reporting.`;
    default:
      return `${count} ${entity} records available in ${domain} domain.`;
  }
}

// Generate context-appropriate quick actions
function generateQuickActions(domain: string, entity: string): string[] {
  const baseActions = ['View all records', 'Search by criteria', 'Export data'];
  
  switch (`${domain}-${entity}`) {
    case 'finance-conditions':
      return [...baseActions, 'Create new condition type', 'Set calculation dependencies', 'Configure access rules'];
    case 'sales-customers':
      return [...baseActions, 'Create new customer', 'Update credit limits', 'View sales history'];
    case 'inventory-products':
      return [...baseActions, 'Create new product', 'Update pricing', 'Check stock levels'];
    case 'finance-ar':
      return [...baseActions, 'Process customer payments', 'View aging report', 'Send payment reminders'];
    case 'finance-ap':
      return [...baseActions, 'Process vendor payments', 'View payment due dates', 'Approve pending invoices'];
    case 'masterdata-company':
      return [...baseActions, 'Update company information', 'Configure fiscal year', 'Set currencies'];
    case 'production-workorders':
      return [...baseActions, 'Create work order', 'Schedule production', 'Track progress'];
    case 'purchasing-orders':
      return [...baseActions, 'Create purchase order', 'Approve pending orders', 'Track deliveries'];
    default:
      return baseActions;
  }
}

export default router;