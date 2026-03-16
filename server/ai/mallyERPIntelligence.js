/**
 * MallyERP Complete System Intelligence
 * Comprehensive knowledge of all 76 tiles, modules, and business processes
 */

import OpenAI from "openai";
import pkg from 'pg';
const { Pool } = pkg;

class MallyERPIntelligence {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    // Complete MallyERP System Knowledge
    this.systemArchitecture = {
      totalTiles: 76,
      totalTables: 280,
      modules: {
        'Master Data (MD)': {
          tileCount: 36,
          description: 'Company structure, materials, customers, vendors, financial master',
          categories: ['Organizational', 'Core', 'Financial', 'Materials', 'Sales', 'Logistics', 'Inventory', 'Operations', 'Quality', 'Tracking', 'System'],
          keyTiles: ['Company Code', 'Plant', 'Material Master', 'Customer Master', 'Vendor Master', 'Cost Centers']
        },
        'Sales (SL)': {
          tileCount: 10,
          description: 'Orders, leads, opportunities, invoices, customer management',
          categories: ['Dashboard', 'Transactions', 'CRM', 'Documents', 'Service', 'Master Data', 'Setup', 'Advanced'],
          keyTiles: ['Sales Overview', 'Sales Orders', 'Leads Management', 'Opportunities', 'Customer Management']
        },
        'Inventory (IN)': {
          tileCount: 4,
          description: 'Stock management, warehouse operations, inventory reports',
          categories: ['Dashboard', 'Operations', 'Reporting'],
          keyTiles: ['Inventory Dashboard', 'Stock Management', 'Warehouse Operations', 'Inventory Reports']
        },
        'Purchase (PU)': {
          tileCount: 8,
          description: 'Purchase orders, vendors, goods receipt, contracts',
          categories: ['Dashboard', 'Documents', 'Requests', 'Master Data', 'Operations', 'Approval', 'Legal', 'Strategic'],
          keyTiles: ['Purchase Dashboard', 'Purchase Orders', 'Vendor Management', 'Goods Receipt', 'Contract Management']
        },
        'Production (PR)': {
          tileCount: 12,
          description: 'Planning, execution, work centers, quality control',
          categories: ['Dashboard', 'Planning', 'Operations', 'Resources', 'Documents', 'Quality'],
          keyTiles: ['Production Dashboard', 'Production Planning', 'Manufacturing Execution', 'Work Center Management', 'Quality Control']
        },
        'Finance (FI)': {
          tileCount: 6,
          description: 'Dashboard, GL, AP, AR, reports, budget',
          categories: ['Financial', 'Reporting', 'Planning'],
          keyTiles: ['Finance Dashboard', 'General Ledger', 'Accounts Payable', 'Accounts Receivable', 'Financial Reports'],
          enhancements: {
            'AP Enhancement': {
              functionCount: 31,
              functionGroups: 6,
              description: 'Enhanced Vendor Management, Invoice Verification, Payment Processing, Document Parking, Down Payment Management, Clearing & Settlement'
            }
          }
        }
      }
    };

    // Business Process Knowledge
    this.businessProcesses = {
      'Lead-to-Cash': {
        steps: ['Lead → Opportunity → Quote → Sales Order → Delivery → Invoice → Payment'],
        modules: ['Sales', 'Finance', 'Inventory'],
        description: 'Complete customer order fulfillment cycle'
      },
      'Procure-to-Pay': {
        steps: ['Requisition → Purchase Order → Goods Receipt → Invoice → Payment'],
        modules: ['Purchase', 'Finance', 'Inventory'],
        description: 'Complete vendor procurement cycle'
      },
      'Plan-to-Produce': {
        steps: ['Production Planning → Material Requirement → Production Order → Manufacturing → Goods Receipt'],
        modules: ['Production', 'Inventory', 'Purchase'],
        description: 'Complete manufacturing execution cycle'
      }
    };

    // Navigation Knowledge
    this.navigationMap = {
      '/': 'Dashboard',
      '/master-data': 'Master Data',
      '/transactions': 'Transactions',
      '/sales': 'Sales',
      '/inventory': 'Inventory',
      '/purchase': 'Purchase',
      '/production': 'Production',
      '/finance': 'Finance',
      '/general-ledger': 'General Ledger',
      '/controlling': 'Controlling',
      '/reports': 'Reports',
      '/workspace-manager': 'Workspace Manager'
    };
  }

  async processQuery(userQuery, context = {}) {
    const query = userQuery.toLowerCase();
    
    try {
      // System overview queries
      if (query.includes('system overview') || query.includes('tile system') || query.includes('complete mallyerp')) {
        return await this.getSystemOverview();
      }

      // Module-specific queries (order matters - more specific first)
      if (query.includes('master data') || query.includes('md')) {
        console.log('Matched master data query');
        return await this.getModuleInfo('Master Data (MD)');
      }
      
      if (query.includes('finance') || query.includes('fi')) {
        console.log('Matched finance query');
        return await this.getFinanceModuleInfo();
      }
      
      if (query.includes('sales') || query.includes('sl')) {
        return await this.getModuleInfo('Sales (SL)');
      }
      
      if (query.includes('production') || query.includes('pr')) {
        return await this.getModuleInfo('Production (PR)');
      }
      
      if (query.includes('purchase') || query.includes('pu')) {
        return await this.getModuleInfo('Purchase (PU)');
      }
      
      if (query.includes('inventory') || query.includes(' in ') || query === 'in') {
        return await this.getModuleInfo('Inventory (IN)');
      }

      // Business process queries
      if (query.includes('lead to cash') || query.includes('order to cash')) {
        return this.getBusinessProcessInfo('Lead-to-Cash');
      }
      
      if (query.includes('procure to pay') || query.includes('purchase to pay')) {
        return this.getBusinessProcessInfo('Procure-to-Pay');
      }
      
      if (query.includes('plan to produce') || query.includes('make to stock')) {
        return this.getBusinessProcessInfo('Plan-to-Produce');
      }

      // Database queries
      if (query.includes('how many') || query.includes('count') || query.includes('total')) {
        return await this.handleCountQueries(query);
      }

      // Data queries (check before navigation) - include "go to" for data entities
      if (query.includes('show') || query.includes('list') || query.includes('display') || 
          (query.includes('go to') && (query.includes('account') || query.includes('customer') || query.includes('vendor') || query.includes('material')))) {
        console.log('Detected data query, processing with handleDataQueries...');
        return await this.handleDataQueries(query);
      }

      // Navigation queries (more specific navigation commands only for pages/modules)
      if (query.includes('go to') || query.includes('navigate to') || query.includes('open page')) {
        return await this.handleNavigationQueries(query);
      }

      // Use OpenAI for complex queries
      return await this.getIntelligentResponse(userQuery, context);

    } catch (error) {
      console.error('MallyERP Intelligence Error:', error);
      return `I encountered an issue processing your request. Let me help you with MallyERP system information. Try asking about modules, tiles, or business processes.`;
    }
  }

  async getSystemOverview() {
    const arch = this.systemArchitecture;
    
    let response = `## **📊 COMPLETE MALLYERP TILE SYSTEM**

**Total Business Functions: ${arch.totalTiles} Tiles**
**Database Tables: ${arch.totalTables} Tables**

**By Module:**
`;

    for (const [moduleName, moduleInfo] of Object.entries(arch.modules)) {
      response += `• **${moduleName}**: ${moduleInfo.tileCount} tiles - ${moduleInfo.description}\n`;
    }

    response += `
**Business Domain Coverage:**
• **Organizational**: Company codes, plants, storage locations, sales/purchase organizations
• **Core Business**: Materials, customers, vendors, BOMs, cost centers
• **Financial**: GL accounts, payment terms, tax codes, reconciliation accounts
• **Operations**: Manufacturing, procurement, inventory, quality control
• **Strategic**: Planning, forecasting, budgeting, reporting

**AP Enhancement Suite**: 31 additional functions across 6 function groups (Enhanced Vendor Management, Invoice Verification, Payment Processing, Document Parking, Down Payment Management, Clearing & Settlement)

**Current Total**: ${arch.totalTiles} registered tiles + 31 AP enhancement functions = **107+ business functions operational**`;

    return response;
  }

  async getModuleInfo(moduleName) {
    const moduleInfo = this.systemArchitecture.modules[moduleName];
    
    if (!moduleInfo) {
      return `Module "${moduleName}" not found. Available modules: ${Object.keys(this.systemArchitecture.modules).join(', ')}`;
    }

    // Get actual tile data from database
    const moduleCode = moduleName.split('(')[1]?.replace(')', '') || moduleName.substring(0, 2).toUpperCase();
    const result = await this.pool.query(`
      SELECT tile_id, tile_name, tile_category, route_path, description 
      FROM system_tiles 
      WHERE tile_id LIKE $1 
      ORDER BY tile_id
    `, [`${moduleCode}%`]);

    let response = `## **${moduleName} Module**

**Total Tiles**: ${moduleInfo.tileCount}
**Description**: ${moduleInfo.description}

**Categories**: ${moduleInfo.categories.join(', ')}

**Key Business Functions:**
`;

    if (result.rows.length > 0) {
      result.rows.slice(0, 10).forEach(tile => {
        response += `• **${tile.tile_name}** (${tile.tile_id}) - ${tile.tile_category}\n`;
      });
      
      if (result.rows.length > 10) {
        response += `... and ${result.rows.length - 10} more functions\n`;
      }
    } else {
      moduleInfo.keyTiles.forEach(tile => {
        response += `• ${tile}\n`;
      });
    }

    response += `\n**Navigation**: Available through main navigation menu → ${moduleName.split('(')[0].trim()}`;

    return response;
  }

  async getFinanceModuleInfo() {
    const moduleInfo = this.systemArchitecture.modules['Finance (FI)'];
    
    let response = `## **Finance (FI) Module**

**Base Tiles**: ${moduleInfo.tileCount}
**AP Enhancement**: ${moduleInfo.enhancements['AP Enhancement'].functionCount} additional functions
**Total Finance Functions**: ${moduleInfo.tileCount + moduleInfo.enhancements['AP Enhancement'].functionCount}

**Core Functions:**
• Finance Dashboard - Central financial overview
• General Ledger - Chart of accounts and GL entries
• Accounts Payable - Vendor payments and invoice processing
• Accounts Receivable - Customer payments and collections
• Financial Reports - Comprehensive financial reporting
• Budget Management - Planning and budget control

**AP Enhancement Suite (31 Functions):**
${moduleInfo.enhancements['AP Enhancement'].description}

**Function Groups:**
• Enhanced Vendor Management (12 functions)
• Invoice Verification (5 functions)  
• Payment Processing (4 functions)
• Clearing & Settlement (5 functions)
• Document Parking (3 functions)
• Down Payment Management (2 functions)

**Access**: Finance → AP Tiles for enhanced functions
**Navigation**: /finance for main dashboard, /finance/ap-tiles for enhancements`;

    return response;
  }

  getBusinessProcessInfo(processName) {
    const process = this.businessProcesses[processName];
    
    if (!process) {
      return `Business process "${processName}" not found. Available processes: ${Object.keys(this.businessProcesses).join(', ')}`;
    }

    return `## **${processName} Business Process**

**Description**: ${process.description}

**Process Flow**: ${process.steps[0]}

**Involved Modules**: ${process.modules.join(', ')}

**Integration Points**: This process flows seamlessly between modules, ensuring complete business workflow automation and data integrity across the entire ERP system.`;
  }

  async handleCountQueries(query) {
    // Handle various count queries with actual database data
    if (query.includes('tile') || query.includes('function')) {
      const result = await this.pool.query('SELECT COUNT(*) as count FROM system_tiles WHERE is_active = true');
      return `There are ${result.rows[0].count} active system tiles in MallyERP across all modules.`;
    }
    
    if (query.includes('table')) {
      return `MallyERP contains ${this.systemArchitecture.totalTables} database tables providing complete enterprise coverage.`;
    }
    
    if (query.includes('module')) {
      return `MallyERP has ${Object.keys(this.systemArchitecture.modules).length} core modules: ${Object.keys(this.systemArchitecture.modules).join(', ')}.`;
    }

    if (query.includes('customer')) {
      const result = await this.pool.query('SELECT COUNT(*) as count FROM erp_customers');
      return `There are ${result.rows[0].count} customers in the system.`;
    }

    if (query.includes('vendor') || query.includes('supplier')) {
      const result = await this.pool.query('SELECT COUNT(*) as count FROM erp_vendors');
      return `There are ${result.rows[0].count} vendors in the system.`;
    }

    return `I can provide counts for tiles, tables, modules, customers, vendors, and other business entities. What specific count would you like?`;
  }

  async handleNavigationQueries(query) {
    for (const [route, name] of Object.entries(this.navigationMap)) {
      if (query.includes(name.toLowerCase()) || query.includes(route.substring(1))) {
        return {
          response: `Navigating to ${name}...`,
          action: {
            type: 'navigate',
            route: route,
            moduleName: name
          }
        };
      }
    }

    return `I can navigate to: ${Object.values(this.navigationMap).join(', ')}. Which module would you like to visit?`;
  }

  async handleDataQueries(query) {
    // CUSTOMERS
    if (query.includes('customer')) {
      const result = await this.pool.query('SELECT id, name, customer_code, country, email FROM erp_customers LIMIT 5');
      if (result.rows.length === 0) {
        return 'No customers found. You can create customers through Sales → Customer Management or Master Data → Customer Master.';
      }
      
      let response = `Found ${result.rows.length} customers:\n`;
      result.rows.forEach(row => {
        response += `• ${row.name} (Code: ${row.customer_code}) - ${row.country} ${row.email ? `- ${row.email}` : ''}\n`;
      });
      return response;
    }

    // VENDORS/SUPPLIERS
    if (query.includes('vendor') || query.includes('supplier')) {
      const result = await this.pool.query('SELECT id, name, vendor_code, country, email FROM erp_vendors LIMIT 5');
      if (result.rows.length === 0) {
        return 'No vendors found. You can create vendors through Purchase → Vendor Management or Master Data → Vendor Master.';
      }
      
      let response = `Found ${result.rows.length} vendors:\n`;
      result.rows.forEach(row => {
        response += `• ${row.name} (Code: ${row.vendor_code}) - ${row.country} ${row.email ? `- ${row.email}` : ''}\n`;
      });
      return response;
    }

    // MATERIALS/PRODUCTS
    if (query.includes('material') || query.includes('product')) {
      const result = await this.pool.query('SELECT id, name, code, type, base_uom FROM materials LIMIT 5');
      if (result.rows.length === 0) {
        return 'No materials found. You can create materials through Master Data → Material Master.';
      }
      
      let response = `Found ${result.rows.length} materials:\n`;
      result.rows.forEach(row => {
        response += `• ${row.name} (Code: ${row.code}) - ${row.type} [${row.base_uom}]\n`;
      });
      return response;
    }

    // SALES ORDERS
    if (query.includes('sales order') || query.includes('sale')) {
      const result = await this.pool.query('SELECT id, order_number, customer_name, order_date, total_amount, status FROM sales_orders LIMIT 5');
      if (result.rows.length === 0) {
        return 'No sales orders found. You can create sales orders through Sales → Order Management.';
      }
      
      let response = `Found ${result.rows.length} sales orders:\n`;
      result.rows.forEach(row => {
        response += `• Order ${row.order_number} - ${row.customer_name} - $${row.total_amount} [${row.status}]\n`;
      });
      return response;
    }

    // PURCHASE ORDERS  
    if (query.includes('purchase order') || query.includes('purchase')) {
      const result = await this.pool.query('SELECT id, order_number, vendor_name, order_date, total_amount, status FROM purchase_orders LIMIT 5');
      if (result.rows.length === 0) {
        return 'No purchase orders found. You can create purchase orders through Purchase → Order Management.';
      }
      
      let response = `Found ${result.rows.length} purchase orders:\n`;
      result.rows.forEach(row => {
        response += `• PO ${row.order_number} - ${row.vendor_name} - $${row.total_amount} [${row.status}]\n`;
      });
      return response;
    }

    // INVOICES
    if (query.includes('invoice')) {
      const result = await this.pool.query('SELECT id, invoice_number, customer_name, invoice_date, total_amount, status FROM invoices LIMIT 5');
      if (result.rows.length === 0) {
        return 'No invoices found. You can create invoices through Finance → Invoice Management.';
      }
      
      let response = `Found ${result.rows.length} invoices:\n`;
      result.rows.forEach(row => {
        response += `• Invoice ${row.invoice_number} - ${row.customer_name} - $${row.total_amount} [${row.status}]\n`;
      });
      return response;
    }

    // EMPLOYEES
    if (query.includes('employee') || query.includes('staff')) {
      const result = await this.pool.query('SELECT id, employee_code, first_name, last_name, department, position FROM employees LIMIT 5');
      if (result.rows.length === 0) {
        return 'No employees found. You can manage employees through HR → Employee Management.';
      }
      
      let response = `Found ${result.rows.length} employees:\n`;
      result.rows.forEach(row => {
        response += `• ${row.first_name} ${row.last_name} (${row.employee_code}) - ${row.department} - ${row.position}\n`;
      });
      return response;
    }

    // PRODUCTION ORDERS
    if (query.includes('production order') || query.includes('production')) {
      const result = await this.pool.query('SELECT id, order_number, material_number, quantity, start_date, status FROM production_orders LIMIT 5');
      if (result.rows.length === 0) {
        return 'No production orders found. You can create production orders through Production → Order Management.';
      }
      
      let response = `Found ${result.rows.length} production orders:\n`;
      result.rows.forEach(row => {
        response += `• Order ${row.order_number} - ${row.material_number} - Qty: ${row.quantity} [${row.status}]\n`;
      });
      return response;
    }

    // PAYMENTS
    if (query.includes('payment')) {
      const result = await this.pool.query('SELECT id, payment_reference, vendor_name, amount, payment_date, status FROM payments LIMIT 5');
      if (result.rows.length === 0) {
        return 'No payments found. You can manage payments through Finance → Payment Management.';
      }
      
      let response = `Found ${result.rows.length} payments:\n`;
      result.rows.forEach(row => {
        response += `• Payment ${row.payment_reference} - ${row.vendor_name} - $${row.amount} [${row.status}]\n`;
      });
      return response;
    }

    // ENHANCED FINANCE MODULES
    if (query.includes('ar aging') || query.includes('accounts receivable aging')) {
      const result = await this.pool.query(`
        SELECT 
          COUNT(*) as total_items,
          SUM(outstanding_amount) as total_outstanding,
          SUM(CASE WHEN aging_bucket = 'Current' THEN outstanding_amount ELSE 0 END) as current_amount,
          SUM(CASE WHEN aging_bucket = '30Days' THEN outstanding_amount ELSE 0 END) as thirty_days,
          SUM(CASE WHEN aging_bucket = 'Over90' THEN outstanding_amount ELSE 0 END) as over_ninety
        FROM ar_open_items WHERE active = true
      `);
      const data = result.rows[0];
      return `AR Aging Summary:
• Total Outstanding: $${data.total_outstanding || 0}
• Current (0-30 days): $${data.current_amount || 0}
• 30+ Days: $${data.thirty_days || 0}
• Over 90 Days: $${data.over_ninety || 0}
• Total Items: ${data.total_items}

Access full AR aging at Finance → AR Enhanced → Aging Report`;
    }

    if (query.includes('ap aging') || query.includes('accounts payable aging')) {
      const result = await this.pool.query(`
        SELECT 
          COUNT(*) as total_items,
          SUM(outstanding_amount) as total_outstanding,
          SUM(CASE WHEN aging_bucket = 'Current' THEN outstanding_amount ELSE 0 END) as current_amount,
          SUM(CASE WHEN aging_bucket = '30Days' THEN outstanding_amount ELSE 0 END) as thirty_days,
          SUM(CASE WHEN aging_bucket = 'Over90' THEN outstanding_amount ELSE 0 END) as over_ninety
        FROM ap_open_items WHERE active = true
      `);
      const data = result.rows[0];
      return `AP Aging Summary:
• Total Outstanding: $${data.total_outstanding || 0}
• Current (0-30 days): $${data.current_amount || 0}
• 30+ Days: $${data.thirty_days || 0}
• Over 90 Days: $${data.over_ninety || 0}
• Total Items: ${data.total_items}

Access full AP aging at Finance → AP Enhanced → Aging Report`;
    }

    if (query.includes('gl document') || query.includes('general ledger document')) {
      const result = await this.pool.query(`
        SELECT document_number, document_type, posting_date, total_amount, status 
        FROM gl_document_headers 
        WHERE active = true 
        ORDER BY posting_date DESC 
        LIMIT 5
      `);
      if (result.rows.length === 0) {
        return 'No GL documents found. Create new GL documents at Finance → GL Enhanced → Create GL Document.';
      }
      
      let response = `Found ${result.rows.length} GL documents:\n`;
      result.rows.forEach(row => {
        response += `• ${row.document_number} - ${row.document_type} - $${row.total_amount} [${row.status}]\n`;
      });
      return response + '\nManage GL documents at Finance → GL Enhanced → Documents';
    }

    // GL ACCOUNTS - specific handling for GL account queries
    if (query.includes('gl account') || query.includes('general ledger') || (query.includes('account') && !query.includes('customer') && !query.includes('vendor'))) {
      const result = await this.pool.query('SELECT account_number, account_name, account_type, account_group FROM gl_accounts WHERE is_active = true LIMIT 5');
      if (result.rows.length === 0) {
        return 'No GL accounts found. You can create GL accounts through Finance → GL Enhanced → Chart of Accounts.';
      }
      
      let response = `Found ${result.rows.length} GL accounts:\n`;
      result.rows.forEach(row => {
        response += `• ${row.account_number} - ${row.account_name} (${row.account_type}) [${row.account_group}]\n`;
      });
      return response + '\nAccess full Chart of Accounts at Finance → GL Enhanced → Accounts';
    }

    // GENERAL DATA REQUEST
    if (query.includes('show me') || query.includes('list') || query.includes('display')) {
      return `I can show you data from any MallyERP module:

**Sales & CRM:** customers, sales orders, leads, opportunities, quotes
**Purchase:** vendors/suppliers, purchase orders, receipts, contracts  
**Finance:** invoices, payments, GL accounts, cost centers
**Inventory:** materials/products, stock levels, movements, warehouses
**Production:** production orders, work orders, BOMs, routing
**HR:** employees, departments, positions, organizational structure

What specific data would you like to see?`;
    }

    return 'I can show you customers, vendors, materials, orders, invoices, employees, and other business data. What would you like to see?';
  }

  async getIntelligentResponse(userQuery, context) {
    const systemPrompt = `You are Jr. Assistant, the intelligent AI expert for MallyERP - a comprehensive Enterprise Resource Planning system.

SYSTEM KNOWLEDGE:
- 76 total system tiles across 6 modules
- 280 database tables with complete enterprise coverage
- Modules: Master Data (36 tiles), Sales (10 tiles), Inventory (4 tiles), Purchase (8 tiles), Production (12 tiles), Finance (6 tiles + 31 AP enhancement functions)
- Complete business processes: Lead-to-Cash, Procure-to-Pay, Plan-to-Produce
- 244 core ERP tables with integrated workflows

You understand:
- All module relationships and data flows
- Complete organizational hierarchy (Company → Plants → Storage Locations → Cost Centers)
- Master data structure (materials, customers, vendors, BOMs)
- Financial integration (AP, AR, GL posting)
- Business process automation and workflow management

Respond as a knowledgeable ERP consultant who understands the complete system architecture, business processes, and can guide users through any MallyERP functionality.

Current context: ${JSON.stringify(context)}`;

    const completion = await this.openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userQuery }
      ],
      max_tokens: 1000,
      temperature: 0.7
    });

    return completion.choices[0].message.content;
  }
}

export default MallyERPIntelligence;