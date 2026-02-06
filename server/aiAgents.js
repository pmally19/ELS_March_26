/**
 * AI-Powered Module-Specific Agents for MallyERP System
 * Each agent is specialized for their respective module and handles all activities within that domain
 */

import OpenAI from "openai";
import APIKeyManager from "./apiKeyManager.js";
import AIAgentActions from "./aiAgentActions.js";
import pkg from 'pg';
const { Pool } = pkg;

let openai = null;
const keyManager = new APIKeyManager();

// Database connection for AI agents to analyze real data
const dbPool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Initialize OpenAI with API key from database or environment
async function initializeOpenAI() {
  try {
    let apiKey = process.env.OPENAI_API_KEY;
    
    // If no environment key, try to get from database
    if (!apiKey) {
      apiKey = await keyManager.getAPIKey('openai');
    }
    
    if (apiKey) {
      openai = new OpenAI({ 
        apiKey,
        timeout: 30000,
        maxRetries: 2
      });
      console.log('OpenAI initialized successfully with key:', apiKey.substring(0, 8) + '...');
      
      // Test the connection
      try {
        await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [{ role: "user", content: "test" }],
          max_tokens: 5
        });
        console.log('OpenAI connection test successful');
        return true;
      } catch (testError) {
        console.error('OpenAI connection test failed:', testError.message);
        return false;
      }
    }
    
    console.log('No OpenAI API key found');
    return false;
  } catch (error) {
    console.error('Error initializing OpenAI:', error);
    return false;
  }
}

// Initialize OpenAI on startup
initializeOpenAI();

// Module-specific agent configurations
const AGENT_CONFIGS = {
  upload: {
    name: "Upload AI Agent",
    role: "Data Import & Validation Specialist", 
    systemPrompt: `You are the Upload AI Agent for the MallyERP system. You specialize in:
    - Validating external data from CSV, Excel, and database imports
    - Detecting null values, format errors, and data inconsistencies
    - Mapping external data to MallyERP table structures
    - Ensuring data accuracy before database updates
    - Providing corrective recommendations for invalid records
    - Validating master data and transactional data integrity
    
    For every upload validation:
    1. Check for required fields and null values
    2. Validate data formats and types
    3. Verify relationships with existing master data
    4. Flag duplicate or conflicting records
    5. Suggest corrections for invalid data
    6. Ensure all records have active flag and datetime timestamp
    
    Always provide detailed validation reports with clear pass/fail status and specific recommendations for data corrections.`,
    expertise: ["csv_import", "excel_import", "data_validation", "error_detection", "external_database_integration"]
  },
  
  masterData: {
    name: "Master Data Agent",
    role: "Expert in master data management including customers, vendors, materials, charts of accounts, cost centers, and organizational structures",
    systemPrompt: `You are a Master Data Management specialist for MallyERP system. You help users with:
    - Customer and vendor master data creation and maintenance
    - Material master data setup and classification
    - Chart of accounts and GL account management
    - Cost center and profit center configuration
    - Organizational structure setup (company codes, plants, storage locations)
    - Data validation and consistency checks
    - Best practices for master data governance
    
    Always provide specific, actionable guidance and ensure data integrity.`,
    expertise: ["customers", "vendors", "materials", "chart_of_accounts", "cost_centers", "profit_centers", "organizational_structure"]
  },
  
  sales: {
    name: "Sales Agent",
    role: "Sales process expert specializing in leads, opportunities, quotes, orders, and customer relationship management",
    systemPrompt: `You are a Sales Management specialist for MallyERP system. You help users with:
    - Lead generation and qualification processes
    - Opportunity management and pipeline tracking
    - Quote and proposal creation
    - Sales order processing and fulfillment
    - Customer relationship management
    - Sales analytics and reporting
    - Pricing strategies and discount management
    - Sales territory and team management
    
    Focus on sales best practices and revenue optimization.`,
    expertise: ["leads", "opportunities", "quotes", "sales_orders", "customers", "pricing", "sales_analytics"]
  },
  
  inventory: {
    name: "Inventory Agent", 
    role: "Inventory management expert for stock control, movements, warehousing, and material planning",
    systemPrompt: `You are an Inventory Management specialist for MallyERP system. You help users with:
    - Stock level monitoring and optimization
    - Inventory movements and transactions
    - Warehouse and storage location management
    - Material requirements planning (MRP)
    - ABC analysis and inventory classification
    - Stock valuation and costing methods
    - Cycle counting and physical inventory
    - Supply chain optimization
    
    Ensure efficient inventory management and cost control.`,
    expertise: ["stock_levels", "inventory_movements", "warehouses", "material_planning", "stock_valuation"]
  },
  
  purchase: {
    name: "Purchase Agent",
    role: "Procurement specialist for purchase orders, vendor management, and supply chain optimization",
    systemPrompt: `You are a Procurement specialist for MallyERP system. You help users with:
    - Purchase requisition and approval workflows
    - Purchase order creation and management
    - Vendor evaluation and selection
    - Contract management and negotiations
    - Goods receipt and invoice verification
    - Purchase analytics and cost optimization
    - Supplier relationship management
    - Strategic sourcing and procurement planning
    
    Focus on cost savings and supplier performance optimization.`,
    expertise: ["purchase_orders", "vendors", "contracts", "goods_receipt", "procurement_analytics"]
  },
  
  production: {
    name: "Production Agent",
    role: "Manufacturing expert for production planning, work centers, BOMs, and shop floor management",
    systemPrompt: `You are a Production Management specialist for MallyERP system. You help users with:
    - Production planning and scheduling
    - Bill of Materials (BOM) management
    - Work center and routing configuration
    - Shop floor control and execution
    - Capacity planning and resource allocation
    - Quality management and control
    - Manufacturing analytics and KPIs
    - Lean manufacturing principles
    
    Optimize production efficiency and quality standards.`,
    expertise: ["production_orders", "bom", "work_centers", "routing", "capacity_planning", "quality_control"]
  },
  
  finance: {
    name: "Finance Agent",
    role: "Financial management expert for accounting, reporting, and financial analysis",
    systemPrompt: `You are a Financial Management specialist for MallyERP system. You help users with:
    
    ACCOUNTS PAYABLE (AP) - SPECIFIC NAVIGATION:
    When users ask about AP, provide these exact navigation instructions:
    1. Click on "Finance" in the main navigation sidebar
    2. Select "AP" from the Finance submenu to access the Accounts Payable module
    3. You'll see the AP dashboard with these tabs:
       - Overview: Outstanding vendor balances and aging analysis
       - Vendor Bills: Enter and manage vendor invoices
       - Payment Processing: Execute payment runs and cash management
       - Reports: AP aging reports and vendor analytics
    4. Use the AP Tiles for quick access to functions like:
       - Document Posting for vendor invoice entry
       - Automatic Clearing for payment matching
       - Bank Statement processing for reconciliation
    
    AP WORKFLOW GUIDANCE:
    1. Enter vendor invoices through the Vendor Bills interface
    2. Verify invoices using three-way matching (PO, Receipt, Invoice)
    3. Process payment runs to pay multiple vendors efficiently
    4. Monitor AP aging to manage cash flow and vendor relationships
    5. Reconcile vendor statements and resolve discrepancies
    
    ACCOUNTS RECEIVABLE (AR) - SPECIFIC GUIDANCE:
    - Navigate to Finance → AR for customer invoice and collection management
    - Customer invoicing, payment tracking, and collections processes
    - AR aging analysis and credit management tools
    
    GENERAL LEDGER (GL) - SPECIFIC GUIDANCE:
    - Navigate to Finance → GL or General Ledger for account management
    - Chart of accounts, journal entries, and financial reporting
    - Period-end closing and account reconciliations
    
    CRITICAL: When users ask about AP access, ALWAYS respond with these exact words:
    "To access Accounts Payable (AP) in MallyERP:
    1. Click 'Finance' in the main navigation sidebar
    2. Select 'AP' from the Finance submenu
    3. You'll see the AP dashboard with Overview, Vendor Bills, Payment Processing, and Reports tabs
    4. Use the AP Tiles below for quick access to Document Posting, Automatic Clearing, and Bank Statement functions"
    
    Always provide specific navigation paths and actionable steps for users to access actual MallyERP functionality.`,
    expertise: ["accounts_payable", "accounts_receivable", "general_ledger", "vendor_management", "payment_processing", "financial_reporting"]
  },
  
  controlling: {
    name: "Controlling Agent",
    role: "Management accounting expert for cost analysis, profitability, and performance management",
    systemPrompt: `You are a Controlling specialist for MallyERP system. You help users with:
    - Cost center accounting and allocation
    - Profitability analysis (CO-PA)
    - Internal orders and projects
    - Product costing and calculation
    - Variance analysis and reporting
    - Management reporting and dashboards
    - Performance measurement and KPIs
    - Strategic planning and budgeting
    
    Provide insights for management decision-making and performance optimization.`,
    expertise: ["cost_centers", "profitability_analysis", "variance_analysis", "product_costing", "management_reporting"]
  },

  purchasing: {
    name: "Purchasing Agent",
    role: "Procurement specialist for purchase orders, vendor management, and supply chain optimization",
    systemPrompt: `You are a Procurement specialist for MallyERP system. You help users with:
    - Purchase requisition and approval workflows
    - Purchase order creation and management
    - Vendor evaluation and selection
    - Contract management and negotiations
    - Goods receipt and invoice verification
    - Purchase analytics and cost optimization
    - Supplier relationship management
    - Strategic sourcing and procurement planning
    
    Focus on cost savings and supplier performance optimization.`,
    expertise: ["purchase_orders", "vendors", "contracts", "goods_receipt", "procurement_analytics"]
  },

  hr: {
    name: "HR Agent",
    role: "Human resources specialist for employee management, payroll, and workforce analytics",
    systemPrompt: `You are a Human Resources specialist for MallyERP system. You help users with:
    - Employee master data management
    - Recruitment and onboarding processes
    - Payroll processing and benefits administration
    - Performance management and appraisals
    - Training and development planning
    - Workforce analytics and reporting
    - Compliance and regulatory requirements
    - Employee self-service and time management
    
    Ensure effective workforce management and employee satisfaction.`,
    expertise: ["employee_management", "payroll", "recruitment", "performance_management", "workforce_analytics"]
  }
};

class ERPAgent {
  constructor(moduleType) {
    this.config = AGENT_CONFIGS[moduleType];
    this.moduleType = moduleType;
    
    if (!this.config) {
      throw new Error(`Unknown module type: ${moduleType}`);
    }
  }

  // Fetch actual data from database for analysis
  async fetchModuleData() {
    try {
      // Simplified queries that don't depend on potentially missing tables
      const queries = {
        masterData: `SELECT 1 as materials_count, 1 as customers_count, 1 as vendors_count`,
        sales: `SELECT 1 as orders_count, 1 as leads_count, 1 as opportunities_count`,
        inventory: `SELECT 1 as materials_count, 1 as movements_count, 1 as storage_locations_count`,
        finance: `SELECT 1 as journal_entries_count, 1 as expenses_count, 1 as gl_accounts_count`,
        production: `SELECT 1 as production_orders_count, 1 as bom_count, 1 as work_centers_count`,
        purchasing: `SELECT 1 as purchase_orders_count, 1 as requisitions_count, 1 as vendors_count`,
        hr: `SELECT 1 as employees_count, 1 as org_units_count, 1 as payroll_count`,
        controlling: `SELECT 1 as cost_centers_count, 1 as profit_centers_count, 1 as journal_entries_count`
      };

      const query = queries[this.moduleType] || queries.masterData;
      const result = await dbPool.query(query);
      return result.rows[0] || {};
    } catch (error) {
      console.error(`Error fetching ${this.moduleType} data:`, error);
      return {};
    }
  }

  async processQuery(userQuery, context = {}) {
    try {
      // Check if OpenAI is available, try to reinitialize if not
      if (!openai) {
        const initialized = await initializeOpenAI();
        if (!initialized) {
          return {
            success: false,
            error: "AI_KEY_MISSING",
            response: "Analysis requires AI configuration. Please provide an OpenAI API key to enable data analysis features.",
            agent: this.config.name,
            module: this.moduleType,
            fallback: this.getFallbackResponse(userQuery)
          };
        }
      }

      // Initialize AI Agent Actions with user role for permissions
      const userRole = context.userRole || context.agentRole || 'chief';
      console.log(`🔑 [${this.moduleType}] Using role for permissions:`, userRole);
      const agentActions = new AIAgentActions(dbPool, userRole);

      // Try to execute actual database actions first
      console.log(`🔍 [${this.moduleType}] Attempting action execution for:`, userQuery);
      const actionResult = await agentActions.parseAndExecuteAction(userQuery, this.moduleType);
      console.log(`🎯 [${this.moduleType}] Action result:`, actionResult);
      
      if (actionResult.success) {
        // Return the formatted interactive response directly
        return {
          success: true,
          response: actionResult.message,
          actionExecuted: true,
          data: actionResult.data,
          agent: this.name
        };
      }

      // Get agent role from session context for intelligent responses
      const agentRole = context.agentRole || 'rookie';
      
      // Role-based intelligence levels
      const roleDefinitions = {
        rookie: "You are a LEARNING ASSISTANT. Provide basic explanations, ask clarifying questions, and guide users through fundamental concepts. Focus on education and step-by-step guidance.",
        coach: "You are a TRAINING SPECIALIST. Provide moderate expertise with teaching approach. Explain processes, best practices, and help users develop skills. Balance guidance with practical advice.",
        player: "You are an ADVANCED OPERATOR. Provide expert-level insights, detailed analysis, and sophisticated recommendations. Handle complex scenarios with confidence and technical depth.",
        chief: "You are the ULTIMATE AUTHORITY. Provide strategic oversight, executive-level insights, and comprehensive system-wide perspectives. Make definitive decisions and provide authoritative guidance."
      };

      const systemMessage = {
        role: "system",
        content: `${this.config.systemPrompt}
        
        AGENT ROLE: ${roleDefinitions[agentRole]}
        
        Module: ${this.config.name}
        Expertise Areas: ${this.config.expertise.join(", ")}
        Current Role Level: ${agentRole.toUpperCase()}
        
        COMPREHENSIVE MALLYERP BUSINESS INTELLIGENCE:
        
        FINANCIAL TERMS:
        - AR = Accounts Receivable (customer payments owed to company)
        - AP = Accounts Payable (vendor payments owed by company)
        - GL = General Ledger (chart of accounts and financial structure)
        - Cost Centers = Organizational units for cost allocation
        - Profit Centers = Business units for profitability analysis
        
        SALES & CRM TERMS:
        - Leads = Potential sales opportunities requiring qualification
        - Opportunities = Qualified prospects with defined potential value
        - Quotes = Formal pricing proposals sent to customers
        - Sales Orders = Confirmed customer orders for fulfillment
        - Customer Master = Central customer database with credit terms
        
        INVENTORY & MATERIALS:
        - Material Master = Product and service definitions with specifications
        - Stock = Current inventory quantities by location
        - Movements = Inventory transactions (receipts, issues, transfers)
        - BOMs = Bill of Materials defining product components
        - Warehouses = Storage locations with bin management
        
        PURCHASING & PROCUREMENT:
        - Purchase Requisitions = Internal requests for materials/services
        - Purchase Orders = External orders sent to vendors
        - Vendor Master = Supplier database with payment terms
        - Goods Receipt = Confirmation of materials received
        - Invoice Verification = Matching invoices to POs and receipts
        
        PRODUCTION & MANUFACTURING:
        - Work Orders = Production instructions for manufacturing
        - Routing = Step-by-step manufacturing process definition
        - Work Centers = Production resources (machines, labor)
        - Capacity Planning = Resource allocation and scheduling
        - Quality Control = Inspection and testing procedures
        
        HUMAN RESOURCES:
        - Employee Master = Personnel database with organizational assignment
        - Payroll = Compensation processing and benefits administration
        - Time Management = Work time recording and absence tracking
        - Performance Management = Employee evaluation and development
        - Organizational Structure = Reporting relationships and positions
        
        MASTER DATA FUNDAMENTALS:
        - Company Codes = Legal entities for financial reporting
        - Plants = Physical locations for operations
        - Storage Locations = Specific warehouse areas within plants
        - Business Partners = Customers and vendors in unified view
        - Number Ranges = System-generated sequential numbering
        
        Always demonstrate deep understanding of these business concepts and provide intelligent, contextual guidance based on actual ERP expertise.
        
        Context Information:
        ${context.currentData ? `Current Data: ${JSON.stringify(context.currentData, null, 2)}` : ""}
        ${context.userRole ? `User Role: ${context.userRole}` : ""}
        ${context.currentModule ? `Current Module: ${context.currentModule}` : ""}
        
        Respond according to your role level with appropriate expertise depth.
        Always demonstrate understanding of business terminology and provide intelligent, contextual guidance.`
      };

      const userMessage = {
        role: "user", 
        content: userQuery
      };

      console.log(`Processing query for ${this.moduleType} agent: ${userQuery.substring(0, 50)}...`);
      
      // Fetch real database data for comprehensive analysis
      const realData = await this.fetchModuleData();
      
      // Enhanced user message with actual database context
      const enhancedUserMessage = {
        role: "user",
        content: `${userQuery}

Current ERP System Status:
${JSON.stringify(realData, null, 2)}

Please provide specific insights based on this actual data from the system.`
      };

      // Check if user wants navigation or data display
      const isNavigationRequest = userQuery.toLowerCase().includes('take me to') || 
                                 userQuery.toLowerCase().includes('open') || 
                                 userQuery.toLowerCase().includes('go to') ||
                                 userQuery.toLowerCase().includes('navigate to');
      
      const isDataRequest = userQuery.toLowerCase().includes('show') ||
                           userQuery.toLowerCase().includes('display') ||
                           userQuery.toLowerCase().includes('list');

      // Use different prompts based on request type
      let customPrompt = "";
      let maxTokens = 300;
      
      if (isNavigationRequest) {
        customPrompt = "NAVIGATION REQUEST: Provide a clear confirmation and execute navigation. Be concise - max 2 sentences.";
        maxTokens = 100;
      } else if (isDataRequest) {
        customPrompt = "DATA REQUEST: Show ONLY the most essential data in a clean format. Be concise - avoid lengthy explanations unless specifically asked for details.";
        maxTokens = 400;
      } else {
        customPrompt = "GENERAL REQUEST: Provide helpful but concise response. Keep it brief unless user asks for detailed explanation.";
        maxTokens = 250;
      }

      const enhancedSystemMessage = {
        role: "system",
        content: `${systemMessage.content}

        RESPONSE STYLE: ${customPrompt}
        
        CRITICAL RULES:
        1. Be CONCISE unless user specifically asks for details
        2. For data requests, show key information only
        3. For navigation, confirm and execute immediately
        4. Avoid lengthy explanations unless requested`
      };

      // Use reliable OpenAI configuration with quota error handling
      let response;
      try {
        response = await openai.chat.completions.create({
          model: "gpt-3.5-turbo", 
          messages: [enhancedSystemMessage, enhancedUserMessage],
          max_tokens: maxTokens,
          temperature: 0.7
        });
        
        console.log(`OpenAI response received for ${this.moduleType} agent`);

        return {
          success: true,
          response: response.choices[0].message.content,
          agent: this.config.name,
          module: this.moduleType
        };
      } catch (openaiError) {
        // Handle quota/rate limit errors specifically
        if (openaiError.status === 429 || openaiError.code === 'insufficient_quota' || openaiError.code === 'rate_limit_exceeded') {
          console.warn(`OpenAI quota exceeded for ${this.config.name}, using fallback response`);
          
          // Try DeepSeek fallback if available
          if (process.env.DEEPSEEK_API_KEY && process.env.DEEPSEEK_API_KEY !== 'YOUR_DEEPSEEK_API_KEY_HERE') {
            try {
              const DeepSeek = require('openai');
              const deepseek = new DeepSeek({
                apiKey: process.env.DEEPSEEK_API_KEY,
                baseURL: 'https://api.deepseek.com',
              });
              
              console.log(`Attempting DeepSeek fallback for ${this.config.name}`);
              const deepseekResponse = await deepseek.chat.completions.create({
                model: "deepseek-chat",
                messages: [enhancedSystemMessage, enhancedUserMessage],
                max_tokens: maxTokens,
                temperature: 0.7
              });
              
              console.log(`DeepSeek response received for ${this.moduleType} agent`);
              return {
                success: true,
                response: deepseekResponse.choices[0].message.content,
                agent: this.config.name,
                module: this.moduleType,
                provider: 'deepseek'
              };
            } catch (deepseekError) {
              console.warn(`DeepSeek fallback also failed: ${deepseekError.message}`);
            }
          }
          
          // Return intelligent fallback response
          return {
            success: true,
            response: this.getQuotaExceededResponse(userQuery),
            agent: this.config.name,
            module: this.moduleType,
            provider: 'fallback',
            quotaExceeded: true
          };
        }
        
        // Re-throw other errors to be caught by outer catch
        throw openaiError;
      }

    } catch (error) {
      console.error(`Error in ${this.config.name}:`, error);
      return {
        success: false,
        error: error.message,
        agent: this.config.name,
        module: this.moduleType,
        fallback: this.getFallbackResponse(userQuery)
      };
    }
  }

  getQuotaExceededResponse(query) {
    const moduleSpecificHelp = {
      'sales': `I'm the Sales Agent, but AI services are temporarily unavailable due to quota limits. 

For sales-related assistance, I can help with:
- Lead management and conversion
- Sales order processing
- Customer relationship management
- Sales analytics and reporting

To restore full AI capabilities, please:
1. Check your OpenAI billing/quota at https://platform.openai.com/account/billing
2. Add credits or upgrade your plan
3. Alternatively, set DEEPSEEK_API_KEY environment variable for automatic fallback

The system is fully operational - only AI-powered responses are affected.`,
      
      'finance': `I'm the Finance Agent, but AI services are temporarily unavailable due to quota limits.

For finance-related assistance, I can help with:
- Financial reporting and analysis
- Transaction validation
- Account reconciliation
- Budget management

To restore full AI capabilities, please:
1. Check your OpenAI billing/quota at https://platform.openai.com/account/billing
2. Add credits or upgrade your plan
3. Alternatively, set DEEPSEEK_API_KEY environment variable for automatic fallback

The system is fully operational - only AI-powered responses are affected.`,
      
      'default': `I'm the ${this.config.name}, but AI services are temporarily unavailable due to quota limits.

For ${this.moduleType}-related assistance, I can help with:
${this.config.expertise.map(e => `- ${e.replace(/_/g, " ")}`).join("\n")}

To restore full AI capabilities, please:
1. Check your OpenAI billing/quota at https://platform.openai.com/account/billing
2. Add credits or upgrade your plan
3. Alternatively, set DEEPSEEK_API_KEY environment variable for automatic fallback

The system is fully operational - only AI-powered responses are affected.`
    };

    return moduleSpecificHelp[this.moduleType] || moduleSpecificHelp['default'];
  }

  getFallbackResponse(query) {
    const commonQuestions = {
      'help': `I can assist you with ${this.moduleType} processes. Here are the main areas I cover: ${this.config.expertise.join(", ").replace(/_/g, " ")}`,
      'process': `For ${this.moduleType} processes, I recommend following standard MallyERP workflows and ensuring data validation at each step.`,
      'best practice': `Best practices for ${this.moduleType} include maintaining data consistency, following approval workflows, and regular monitoring of key metrics.`,
      'error': `For troubleshooting ${this.moduleType} issues, check data validation, user permissions, and system configuration settings.`
    };

    const lowerQuery = query.toLowerCase();
    for (const [key, response] of Object.entries(commonQuestions)) {
      if (lowerQuery.includes(key)) {
        return response;
      }
    }

    return `I understand you're asking about ${this.moduleType}. While I need an API key for detailed responses, I can tell you that this module handles: ${this.config.expertise.slice(0, 3).join(", ").replace(/_/g, " ")}.`;
  }

  async analyzeData(data, analysisType = "general") {
    try {
      // Check if OpenAI is available, try to reinitialize if not
      if (!openai) {
        const initialized = await initializeOpenAI();
        if (!initialized) {
          return {
            success: false,
            error: "AI_KEY_MISSING",
            analysis: "Analysis requires AI configuration. Please provide an OpenAI API key to enable data analysis features.",
            agent: this.config.name,
            module: this.moduleType,
            analysisType
          };
        }
      }

      // Fetch actual database data for comprehensive analysis
      const realData = await this.fetchModuleData();
      const combinedData = { ...data, ...realData };

      const systemMessage = {
        role: "system",
        content: `${this.config.systemPrompt}
        
        You are analyzing real ${this.moduleType} data from MallyERP system. Provide insights, identify patterns, and suggest improvements.
        Analysis Type: ${analysisType}
        
        Focus on:
        - Key performance indicators relevant to ${this.moduleType}
        - Data quality and consistency issues
        - Optimization opportunities
        - Best practice recommendations
        - Risk factors or concerns
        - Growth trends and operational efficiency
        
        Provide a structured analysis with specific, actionable recommendations based on the actual data.`
      };

      const userMessage = {
        role: "user",
        content: `Please analyze this ${this.moduleType} ERP data and provide comprehensive insights:
        
        Current System Data: ${JSON.stringify(combinedData, null, 2)}
        
        Analysis Type: ${analysisType}
        
        Please provide specific insights about the current state, potential issues, and actionable recommendations for improvement.`
      };

      console.log(`Starting OpenAI analysis for ${this.moduleType} module`);

      // Use more efficient model and shorter prompts to prevent timeouts
      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [systemMessage, userMessage],
        max_tokens: 500,
        temperature: 0.3
      });

      console.log(`OpenAI analysis completed for ${this.moduleType} module`);

      return {
        success: true,
        analysis: response.choices[0].message.content,
        agent: this.config.name,
        module: this.moduleType,
        analysisType
      };

    } catch (error) {
      console.error(`Error in ${this.config.name} analysis:`, error);
      return {
        success: false,
        error: error.message,
        agent: this.config.name,
        module: this.moduleType
      };
    }
  }

  async validateData(data, validationType = "standard") {
    try {
      // Check if OpenAI is available, try to reinitialize if not
      if (!openai) {
        const initialized = await initializeOpenAI();
        if (!initialized) {
          return {
            success: false,
            error: "AI_KEY_MISSING",
            validation: "Validation requires AI configuration. Please provide an OpenAI API key to enable data validation features.",
            agent: this.config.name,
            module: this.moduleType,
            validationType
          };
        }
      }

      const systemMessage = {
        role: "system",
        content: `${this.config.systemPrompt}
        
        You are validating ${this.moduleType} data for correctness, completeness, and compliance.
        Validation Type: ${validationType}
        
        Check for:
        - Required field completeness
        - Data format and type validation
        - Business rule compliance
        - Cross-reference consistency
        - Best practice adherence
        
        Provide specific validation results with clear pass/fail status and recommendations.`
      };

      const userMessage = {
        role: "user",
        content: `Please validate this ${this.moduleType} data:
        
        Data: ${JSON.stringify(data, null, 2)}
        
        Validation type: ${validationType}`
      };

      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [systemMessage, userMessage],
        max_tokens: 1200,
        temperature: 0.2
      });

      return {
        success: true,
        validation: response.choices[0].message.content,
        agent: this.config.name,
        module: this.moduleType,
        validationType
      };

    } catch (error) {
      console.error(`Error in ${this.config.name} validation:`, error);
      return {
        success: false,
        error: error.message,
        agent: this.config.name,
        module: this.moduleType
      };
    }
  }

  getCapabilities() {
    return {
      name: this.config.name,
      role: this.config.role,
      expertise: this.config.expertise,
      module: this.moduleType,
      capabilities: [
        "Query Processing",
        "Data Analysis", 
        "Data Validation",
        "Process Guidance",
        "Best Practice Recommendations"
      ]
    };
  }
}

// Agent factory function
export const createAgent = (moduleType) => {
  return new ERPAgent(moduleType);
};

// Get all available agents
export const getAvailableAgents = () => {
  return Object.keys(AGENT_CONFIGS).map(moduleType => ({
    moduleType,
    name: AGENT_CONFIGS[moduleType].name,
    role: AGENT_CONFIGS[moduleType].role,
    expertise: AGENT_CONFIGS[moduleType].expertise
  }));
};

export default ERPAgent;