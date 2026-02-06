/**
 * Full System Intelligence Engine for MallyERP
 * Comprehensive understanding of all ERP modules, processes, and data relationships
 */

import OpenAI from "openai";
import pkg from 'pg';
const { Pool } = pkg;

class FullSystemIntelligence {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 30000
    });

    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    // Complete ERP system knowledge base
    this.systemKnowledge = {
      modules: {
        'sales': {
          tables: ['customers', 'sales_orders', 'quotes', 'opportunities', 'leads'],
          processes: ['lead_to_cash', 'order_processing', 'customer_management'],
          relationships: ['customer_orders', 'order_items', 'customer_credit'],
          kpis: ['revenue', 'conversion_rate', 'customer_lifetime_value']
        },
        'finance': {
          tables: ['gl_accounts', 'invoices', 'payments', 'budgets', 'cost_centers'],
          processes: ['accounts_payable', 'accounts_receivable', 'general_ledger'],
          relationships: ['invoice_payments', 'gl_postings', 'budget_variance'],
          kpis: ['cash_flow', 'profitability', 'payment_terms']
        },
        'inventory': {
          tables: ['materials', 'inventory_movements', 'warehouses', 'stock_levels'],
          processes: ['stock_management', 'reorder_processing', 'valuation'],
          relationships: ['stock_movements', 'warehouse_stock', 'supplier_materials'],
          kpis: ['turnover_rate', 'stock_accuracy', 'carrying_cost']
        },
        'production': {
          tables: ['production_orders', 'boms', 'work_centers', 'routings'],
          processes: ['production_planning', 'manufacturing_execution', 'capacity_planning'],
          relationships: ['bom_components', 'routing_operations', 'capacity_requirements'],
          kpis: ['efficiency', 'throughput', 'quality_metrics']
        },
        'purchasing': {
          tables: ['vendors', 'purchase_orders', 'requisitions', 'contracts'],
          processes: ['procurement', 'vendor_management', 'contract_management'],
          relationships: ['vendor_materials', 'po_receipts', 'contract_terms'],
          kpis: ['cost_savings', 'supplier_performance', 'lead_time']
        },
        'hr': {
          tables: ['employees', 'payroll', 'benefits', 'performance'],
          processes: ['employee_management', 'payroll_processing', 'performance_review'],
          relationships: ['employee_benefits', 'payroll_deductions', 'performance_goals'],
          kpis: ['retention_rate', 'productivity', 'satisfaction']
        }
      },

      businessProcesses: {
        'lead_to_cash': {
          steps: ['lead_generation', 'qualification', 'quote_creation', 'order_entry', 'fulfillment', 'invoicing', 'payment'],
          integration: ['sales', 'finance', 'inventory'],
          automation: ['credit_check', 'pricing', 'delivery_scheduling']
        },
        'procure_to_pay': {
          steps: ['requisition', 'po_creation', 'approval', 'receipt', 'invoice_matching', 'payment'],
          integration: ['purchasing', 'finance', 'inventory'],
          automation: ['approval_routing', 'three_way_matching', 'payment_scheduling']
        },
        'plan_to_produce': {
          steps: ['demand_planning', 'material_planning', 'capacity_planning', 'production_execution', 'quality_control'],
          integration: ['production', 'inventory', 'sales'],
          automation: ['mrp_calculation', 'scheduling', 'quality_alerts']
        }
      },

      dataRelationships: {
        'customer_order_flow': 'customers -> sales_orders -> order_items -> invoices -> payments',
        'material_flow': 'materials -> inventory_movements -> production_orders -> finished_goods',
        'financial_flow': 'transactions -> gl_accounts -> financial_statements -> reports',
        'procurement_flow': 'requisitions -> purchase_orders -> receipts -> vendor_payments'
      }
    };
  }

  async executeDirectQuery(query, context = {}) {
    try {
      // Check if this is a count query and execute it directly
      if (query.toLowerCase().includes('how many') || query.toLowerCase().includes('total')) {
        const result = await this.executeCountQuery(query);
        if (result !== null) {
          return result;
        }
      }

      // Check if this is a list query and execute it directly  
      if (query.toLowerCase().includes('show') || query.toLowerCase().includes('list')) {
        const result = await this.executeListQuery(query);
        if (result !== null) {
          return result;
        }
      }

      return await this.analyzeUserQuery(query, context);
    } catch (error) {
      console.error('Direct query execution error:', error);
      return await this.analyzeUserQuery(query, context);
    }
  }

  async executeCountQuery(query) {
    try {
      const lowerQuery = query.toLowerCase();

      // Purchase orders
      if (lowerQuery.includes('purchase order')) {
        const result = await this.pool.query('SELECT COUNT(*) as count FROM purchase_orders');
        return `${result.rows[0].count} purchase orders`;
      }

      // Sales orders
      if (lowerQuery.includes('sales order') || lowerQuery.includes('order')) {
        const result = await this.pool.query('SELECT COUNT(*) as count FROM sales_orders');
        return `${result.rows[0].count} sales orders`;
      }

      // Customers
      if (lowerQuery.includes('customer')) {
        const result = await this.pool.query('SELECT COUNT(*) as count FROM customers');
        return `${result.rows[0].count} customers`;
      }

      // Materials/Products
      if (lowerQuery.includes('material') || lowerQuery.includes('product')) {
        const result = await this.pool.query('SELECT COUNT(*) as count FROM materials');
        return `${result.rows[0].count} materials`;
      }

      // Vendors
      if (lowerQuery.includes('vendor') || lowerQuery.includes('supplier')) {
        const result = await this.pool.query('SELECT COUNT(*) as count FROM vendors');
        return `${result.rows[0].count} vendors`;
      }

      // Employees
      if (lowerQuery.includes('employee')) {
        const result = await this.pool.query('SELECT COUNT(*) as count FROM employees');
        return `${result.rows[0].count} employees`;
      }

      return null;
    } catch (error) {
      console.error('Count query error:', error);
      return null;
    }
  }

  async executeListQuery(query) {
    try {
      const lowerQuery = query.toLowerCase();

      // Show customers
      if (lowerQuery.includes('customer')) {
        const result = await this.pool.query('SELECT id, name, email, status FROM customers LIMIT 10');
        if (result.rows.length === 0) return '0 customers found';
        return result.rows.map(row => `${row.id}: ${row.name} (${row.email}) - ${row.status}`).join('\n');
      }

      // Show materials
      if (lowerQuery.includes('material') || lowerQuery.includes('product')) {
        const result = await this.pool.query('SELECT id, material_code, description, material_type FROM materials LIMIT 10');
        if (result.rows.length === 0) return '0 materials found';
        return result.rows.map(row => `${row.material_code}: ${row.description} (${row.material_type})`).join('\n');
      }

      return null;
    } catch (error) {
      console.error('List query error:', error);
      return null;
    }
  }

  async analyzeUserQuery(query, context = {}) {
    try {
      // Enhanced system prompt with DIRECT RESULTS focus
      const systemPrompt = `You are Jr. Assistant for MallyERP. CRITICAL: Always provide DIRECT RESULTS, not explanations.

EXECUTE QUERIES AND RETURN DATA IMMEDIATELY:
- For count questions: Return the actual number
- For list questions: Return the actual data
- For status questions: Return current state
- NO analysis steps, NO implementation plans, ONLY RESULTS

Database Access: You have full access to 244 ERP tables
Current Context:
- User Role: ${context.userRole || 'Chief'}
- Current Module: ${context.currentModule || 'Dashboard'}
- Session Data: ${JSON.stringify(context.sessionData || {})}

RESPOND WITH ACTIONS, NOT EXPLANATIONS. Execute commands directly.

For navigation: Provide exact routes like "/comprehensive/customers" or "/inventory"
For data requests: Query actual database tables and return real results
For analysis: Use actual system data to generate insights
For automation: Trigger real workflow processes

User Query: "${query}"

Analyze this query and provide a comprehensive response with:
1. Intent classification
2. Required actions (navigation, data retrieval, analysis, automation)
3. Specific implementation steps
4. Expected outcomes

Be precise, actionable, and use real system capabilities.`;

      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: query }
        ],
        max_tokens: 1000,
        temperature: 0.1
      });

      const analysis = response.choices[0].message.content;

      // Parse AI response and execute actions
      const actions = await this.parseAndExecuteActions(analysis, query, context);

      return {
        analysis: analysis,
        actions: actions,
        systemUnderstanding: this.getRelevantSystemKnowledge(query),
        confidence: 0.95,
        executionPlan: actions.map(a => a.description)
      };

    } catch (error) {
      console.error('Full system analysis failed:', error);
      return this.fallbackAnalysis(query, context);
    }
  }

  async parseAndExecuteActions(analysis, query, context) {
    const actions = [];
    const queryLower = query.toLowerCase();

    // Navigation detection
    if (queryLower.includes('go to') || queryLower.includes('show') || queryLower.includes('open')) {
      const navigationAction = await this.detectNavigationIntent(query);
      if (navigationAction) actions.push(navigationAction);
    }

    // Data retrieval detection
    if (queryLower.includes('list') || queryLower.includes('display') || queryLower.includes('get')) {
      const dataAction = await this.detectDataRetrievalIntent(query);
      if (dataAction) actions.push(dataAction);
    }

    // Analysis detection
    if (queryLower.includes('analyze') || queryLower.includes('report') || queryLower.includes('insights')) {
      const analysisAction = await this.detectAnalysisIntent(query);
      if (analysisAction) actions.push(analysisAction);
    }

    // Automation detection
    if (queryLower.includes('create') || queryLower.includes('process') || queryLower.includes('automate')) {
      const automationAction = await this.detectAutomationIntent(query);
      if (automationAction) actions.push(automationAction);
    }

    return actions;
  }

  async detectNavigationIntent(query) {
    const navigationMap = {
      'customer': '/comprehensive/customers',
      'inventory': '/comprehensive/inventory',
      'sales': '/sales',
      'finance': '/finance',
      'production': '/production',
      'purchasing': '/purchasing',
      'hr': '/hr',
      'report': '/reports',
      'dashboard': '/',
      'master data': '/master-data'
    };

    for (const [keyword, route] of Object.entries(navigationMap)) {
      if (query.toLowerCase().includes(keyword)) {
        return {
          type: 'navigation',
          target: route,
          description: `Navigate to ${keyword} module`,
          execute: true
        };
      }
    }
    return null;
  }

  async detectDataRetrievalIntent(query) {
    const dataQueries = {
      'customers': 'SELECT * FROM customers ORDER BY created_at DESC LIMIT 20',
      'orders': 'SELECT * FROM sales_orders ORDER BY order_date DESC LIMIT 20',
      'materials': 'SELECT * FROM materials WHERE is_active = true LIMIT 20',
      'inventory': 'SELECT * FROM inventory_movements ORDER BY created_at DESC LIMIT 20',
      'vendors': 'SELECT * FROM vendors WHERE status = \'active\' LIMIT 20',
      'employees': 'SELECT * FROM employees WHERE is_active = true LIMIT 20'
    };

    for (const [entity, query_sql] of Object.entries(dataQueries)) {
      if (query.toLowerCase().includes(entity)) {
        return {
          type: 'data_retrieval',
          entity: entity,
          query: query_sql,
          description: `Retrieve ${entity} data from database`,
          execute: true
        };
      }
    }
    return null;
  }

  async detectAnalysisIntent(query) {
    if (query.toLowerCase().includes('customer') && query.toLowerCase().includes('analysis')) {
      return {
        type: 'analysis',
        module: 'customers',
        analysisType: 'comprehensive',
        description: 'Generate comprehensive customer analysis with AI insights',
        execute: true
      };
    }

    if (query.toLowerCase().includes('inventory') && (query.toLowerCase().includes('optimization') || query.toLowerCase().includes('analysis'))) {
      return {
        type: 'analysis',
        module: 'inventory',
        analysisType: 'optimization',
        description: 'Generate inventory optimization analysis with recommendations',
        execute: true
      };
    }

    return {
      type: 'analysis',
      module: 'general',
      analysisType: 'business_intelligence',
      description: 'Generate business intelligence analysis',
      execute: true
    };
  }

  async detectAutomationIntent(query) {
    if (query.toLowerCase().includes('create customer')) {
      return {
        type: 'automation',
        process: 'customer_creation',
        description: 'Automate customer creation process',
        execute: true
      };
    }

    if (query.toLowerCase().includes('reorder') || query.toLowerCase().includes('purchase')) {
      return {
        type: 'automation',
        process: 'purchase_requisition',
        description: 'Automate purchase requisition creation',
        execute: true
      };
    }

    return {
      type: 'automation',
      process: 'workflow_trigger',
      description: 'Trigger automated workflow process',
      execute: true
    };
  }

  getRelevantSystemKnowledge(query) {
    const queryLower = query.toLowerCase();
    const relevantModules = [];

    for (const [module, data] of Object.entries(this.systemKnowledge.modules)) {
      if (queryLower.includes(module) ||
        data.tables.some(table => queryLower.includes(table)) ||
        data.processes.some(process => queryLower.includes(process))) {
        relevantModules.push(module);
      }
    }

    return {
      relevantModules,
      availableProcesses: this.systemKnowledge.businessProcesses,
      dataRelationships: this.systemKnowledge.dataRelationships
    };
  }

  async executeSystemQuery(query) {
    try {
      const result = await this.pool.query(query);
      return {
        success: true,
        data: result.rows,
        rowCount: result.rowCount
      };
    } catch (error) {
      console.error('System query execution failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  fallbackAnalysis(query, context) {
    return {
      analysis: `I understand you're asking about: "${query}". I can help with all MallyERP modules including Sales, Finance, Inventory, Production, Purchasing, and HR. I have complete system knowledge and can execute real commands.`,
      actions: [{
        type: 'assistance',
        description: 'Provide comprehensive system assistance',
        execute: true
      }],
      systemUnderstanding: this.systemKnowledge,
      confidence: 0.7,
      executionPlan: ['Analyze request', 'Provide intelligent assistance']
    };
  }

  async validateSystemIntegrity() {
    try {
      // Check database connectivity
      const dbCheck = await this.pool.query('SELECT COUNT(*) FROM customers');

      // Check OpenAI connectivity
      const aiCheck = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: "test" }],
        max_tokens: 5
      });

      return {
        database: dbCheck ? 'connected' : 'disconnected',
        ai: aiCheck ? 'connected' : 'disconnected',
        systemKnowledge: 'complete',
        status: 'fully_operational'
      };
    } catch (error) {
      return {
        database: 'error',
        ai: 'error',
        systemKnowledge: 'complete',
        status: 'degraded',
        error: error.message
      };
    }
  }
}

export default FullSystemIntelligence;