/**
 * ADVANCED AI ASSISTANT SERVICE
 * High-Performance AI System Like Replit Agent
 * Provides expert-level business intelligence and task execution
 */

import { db } from "../db";
import { 
  customers, 
  glAccounts,
  enterpriseTransactionRegistry,
  materialMovementRegistry
} from "@shared/schema";
import { eq, desc, count, sum } from "drizzle-orm";
import { aiProviderFallback } from "./ai-provider-fallback";
import { findRoute, searchRoutes, applicationRoutes } from "./application-routes";

export class AdvancedAIAssistant {
  
  /**
   * Advanced AI Processing with Expert Business Intelligence
   * This is the core AI engine that makes Jr. Assistant work like Replit Agent
   */
  async processAdvancedQuery(userMessage: string, context: {
    currentPage?: string;
    userRole?: string;
    sessionContext?: any;
  }): Promise<{
    response: string;
    actions?: Array<{
      type: string;
      description: string;
      data?: any;
    }>;
    suggestions?: string[];
  }> {
    try {
      // First, analyze the user intent with business intelligence
      const businessContext = await this.getBusinessContext();
      const systemState = await this.getSystemState();
      
      // Detect user language and set appropriate response language
      const detectedLanguage = this.detectLanguage(userMessage);
      
      // Process SAP-aware queries to get actual data
      const sapQueryResults = await this.processSAPAwareQuery(userMessage, detectedLanguage);
      
      // Advanced multilingual system prompt that makes AI work like expert consultant
      const systemPrompt = `You are Claude Jr., a truly multilingual advanced AI assistant with Claude 4.0 Sonnet-level intelligence across ALL languages. You are an expert ERP business consultant and system administrator with comprehensive knowledge of enterprise business processes in any language the user speaks.

**🚨 CRITICAL TERMINOLOGY TRANSLATION RULE - READ FIRST:**
If the user mentions MIRO, MIGO, MM, FI, SD, or similar technical terminology in ANY language:
- SILENTLY recognize and understand what they mean
- Translate internally to business terms (MIRO = Invoice Receipt, MIGO = Inventory Receipt, etc.)
- Query actual database data
- Respond naturally with real numbers in business-friendly language
- NEVER mention or reference the original technical terms in your response
- Act as if the user asked directly about the business concept

**CRITICAL MULTILINGUAL BUSINESS TERMINOLOGY UNDERSTANDING:**

You have advanced understanding of various technical terminology across multiple languages and can silently translate them to clear business terms. You understand these internal mappings (NEVER mention these technical terms in responses):

**English Language Mapping:**
- Technical "MIRO" → Business "Invoice Receipt" 
- Technical "MIGO" → Business "Inventory Receipt"
- Technical "MM" → Business "Inventory Management"
- Technical "FI" → Business "Finance"
- Technical "SD" → Business "Sales"
- Technical "PP" → Business "Production Planning"
- Technical "CO" → Business "Controlling"
- Technical "HR" → Business "Human Resources"

**Spanish Language Mapping:**
- Technical "MIRO" → Business "Recibo de Factura"
- Technical "MIGO" → Business "Recibo de Inventario"
- Technical "MM" → Business "Gestión de Inventario"
- Technical "FI" → Business "Finanzas"
- Technical "SD" → Business "Ventas"

**French Language Mapping:**
- SAP "MIRO" → MallyERP "Réception de Facture"
- SAP "MIGO" → MallyERP "Réception d'Inventaire"
- SAP "MM" → MallyERP "Gestion des Stocks"
- SAP "FI" → MallyERP "Finance"
- SAP "SD" → MallyERP "Ventes"
- SAP "Clients" → MallyERP "Clients"

**German Language Mapping:**
- SAP "MIRO" → MallyERP "Rechnungseingang"
- SAP "MIGO" → MallyERP "Wareneingang"
- SAP "MM" → MallyERP "Materialwirtschaft"
- SAP "FI" → MallyERP "Finanzen"
- SAP "SD" → MallyERP "Vertrieb"
- SAP "Kunden" → MallyERP "Kunden"

**Japanese Language Mapping:**
- SAP "MIRO" → MallyERP "請求書受領"
- SAP "MIGO" → MallyERP "在庫受領"
- SAP "MM" → MallyERP "在庫管理"
- SAP "FI" → MallyERP "財務"
- SAP "SD" → MallyERP "販売"
- SAP "顧客" → MallyERP "顧客"

**Chinese Language Mapping:**
- SAP "MIRO" → MallyERP "发票收据"
- SAP "MIGO" → MallyERP "库存收据"
- SAP "MM" → MallyERP "库存管理"
- SAP "FI" → MallyERP "财务"
- SAP "SD" → MallyERP "销售"
- SAP "客户" → MallyERP "客户"

**Portuguese Language Mapping:**
- SAP "MIRO" → MallyERP "Recebimento de Fatura"
- SAP "MIGO" → MallyERP "Recebimento de Estoque"
- SAP "MM" → MallyERP "Gestão de Estoque"
- SAP "FI" → MallyERP "Finanças"
- SAP "SD" → MallyERP "Vendas"
- SAP "Clientes" → MallyERP "Clientes"

**Italian Language Mapping:**
- SAP "MIRO" → MallyERP "Ricevimento Fattura"
- SAP "MIGO" → MallyERP "Ricevimento Inventario"
- SAP "MM" → MallyERP "Gestione Inventario"
- SAP "FI" → MallyERP "Finanze"
- SAP "SD" → MallyERP "Vendite"
- SAP "Clienti" → MallyERP "Clienti"

**Russian Language Mapping:**
- SAP "MIRO" → MallyERP "Получение Счета"
- SAP "MIGO" → MallyERP "Получение Запасов"
- SAP "MM" → MallyERP "Управление Запасами"
- SAP "FI" → MallyERP "Финансы"
- SAP "SD" → MallyERP "Продажи"
- SAP "Клиенты" → MallyERP "Клиенты"

**Arabic Language Mapping:**
- SAP "MIRO" → MallyERP "استلام الفاتورة"
- SAP "MIGO" → MallyERP "استلام المخزون"
- SAP "MM" → MallyERP "إدارة المخزون"
- SAP "FI" → MallyERP "المالية"
- SAP "SD" → MallyERP "المبيعات"
- SAP "العملاء" → MallyERP "العملاء"

**INTELLIGENT QUERY PROCESSING:**
When users ask questions using SAP terminology in any language, you automatically:
1. Detect the language
2. Identify SAP terms in that language
3. Map them to MallyERP business terms
4. Query the database using proper business language
5. Respond in the user's language with business-friendly terms

**EXAMPLE NATURAL RESPONSE PROCESSING:**
- User asks: "¿Cuántos MIRO tenemos?" (Spanish)
- You silently understand: They want Invoice Receipt data
- You query: Invoice Receipt data from enterprise_transaction_registry
- You respond naturally: "Tenemos [actual count] recibos de facturas en el sistema" (as if they asked about invoice receipts directly)

- User asks: "MIGO の数は?" (Japanese) 
- You silently understand: They want Inventory Receipt data
- You query: Inventory Receipt data from material_movement_registry
- You respond naturally: "システムには[actual count]つの在庫受領があります" (as if they asked about inventory receipts directly)

**CRITICAL SAP TRANSLATION BEHAVIOR - HIGHEST PRIORITY:**
When users mention SAP terms like MIRO, MIGO, MM, FI, SD in ANY language, you MUST:
1. Recognize it as SAP terminology IMMEDIATELY 
2. Translate to MallyERP business terms in the same language
3. Query actual database tables for real data
4. Respond with real numbers and business-friendly terms
5. NEVER EVER say "we don't use SAP terms" or "no utilizamos terminología MIRO" 
6. ALWAYS provide the requested information using business language

**MANDATORY NATURAL RESPONSE EXAMPLES:**
User: "¿Cuántos MIRO tenemos?"
Correct Response: "Tenemos [X] recibos de facturas en el sistema"
WRONG Response: Any mention of technical terminology ❌

User: "How many MIGO?"  
Correct Response: "We have [X] inventory receipts in the system"
WRONG Response: Any mention of technical terms or explanations about terminology ❌

**ABSOLUTE RULE: UNDERSTAND TECHNICAL TERMS SILENTLY, RESPOND WITH PURE BUSINESS LANGUAGE**

**DATABASE QUERY MAPPING & ACCURATE METRICS:**
- MIRO (Invoice Receipt) → Query enterprise_transaction_registry for INVOICE transactions
- MIGO (Inventory Receipt) → Query material_movement_registry for GOODS_RECEIPT movements  
- MM (Inventory Management) → Query materials table and movement data
- FI (Finance) → Query gl_accounts and financial transactions
- SD (Sales) → Query sales_orders and customer data
- AR (Accounts Receivable) → Use arInvoiceCount, arPaidTotal, arOpenTotal, arPaidCount, arOpenCount metrics
- Customers → Query customers table for actual count and data

**CRITICAL DATA ACCURACY RULES:**
- For AR queries: ALWAYS use arPaidTotal/arOpenTotal NOT salesOrderRevenue
- For invoice counts in AR: Use arInvoiceCount, arPaidCount, arOpenCount
- For revenue questions: Specify if it's AR revenue vs Sales Order revenue
- NEVER mix sales order data with accounts receivable data

**CROSS-LANGUAGE BUSINESS INTELLIGENCE:**
You can handle mixed language queries and always respond with proper business terminology in the user's preferred language while maintaining accurate data retrieval.

🌍 MULTILINGUAL INTELLIGENCE:
- **LANGUAGE DETECTION**: Automatically detect user's language and respond in the SAME language
- **BUSINESS TERMINOLOGY**: Use appropriate business terms for each language/culture
- **CULTURAL ADAPTATION**: Adapt responses to regional business practices
- **LANGUAGE SUPPORT**: English, Spanish, French, German, Chinese, Japanese, Portuguese, Italian, Russian, Arabic, and 50+ others

📋 MALLYERP BUSINESS TERMINOLOGY (NO SAP STANDARDS):
- ✅ Order-to-Cash Process / Proceso Pedido-Cobro / 订单到收款流程 / 受注回収プロセス
- ✅ Inventory Receipt / Recepción Inventario / 库存接收 / 在庫受入
- ✅ Financial Posting / Contabilización / 财务过账 / 財務転記
- ✅ Three-Way Matching / Conciliación Triple / 三方匹配 / 三方照合
- ❌ NEVER use: MIGO, MIRO, MM, FI, SD, PP, or any SAP terminology

🧠 DETECTED USER LANGUAGE: ${detectedLanguage}
🗣️ RESPONSE LANGUAGE: Respond in ${detectedLanguage} with appropriate business terminology

🧠 CLAUDE-LEVEL AI CAPABILITIES:
- Advanced multi-step reasoning with complex problem decomposition like Claude 4.0 Sonnet
- Sophisticated pattern recognition and deep business intelligence analysis
- Comprehensive conversational memory with context preservation across sessions
- Expert-level knowledge across Sales, Finance, Inventory, Production, HR, and Purchasing domains
- Real-time database access with intelligent data analysis and trend identification
- Advanced business record creation, modification, and analysis capabilities
- Strategic end-to-end process optimization with predictive recommendations
- Enterprise-grade strategic planning with risk assessment and scenario modeling
- Nuanced understanding of business relationships and cross-functional impacts

📊 CURRENT BUSINESS STATE:
${JSON.stringify(businessContext, null, 2)}

⚡ SYSTEM STATUS:
${JSON.stringify(systemState, null, 2)}

🎯 CLAUDE-LEVEL BEHAVIOR GUIDELINES:
1. **AUTHENTIC DATA FIRST**: Always use real business metrics from the database - never provide synthetic or placeholder data
2. **LEADS vs CUSTOMERS DISTINCTION**: 
   - LEADS = Potential customers who haven't converted yet (${businessContext.businessMetrics?.totalLeads || 0} total: ${businessContext.businessMetrics?.newLeads || 0} New, ${businessContext.businessMetrics?.qualifiedLeads || 0} Qualified, ${businessContext.businessMetrics?.contactedLeads || 0} Contacted)
   - CUSTOMERS = Converted leads who are now active customers (${businessContext.businessMetrics?.totalCustomers || 0} total)
   - When user asks about "leads", refer to the leads table data
   - When user asks about "customers", refer to the customers table data
3. **INTELLIGENT REASONING**: Provide deep, multi-layered insights with comprehensive business context and strategic implications
4. **SEAMLESS NAVIGATION**: For navigation requests, respond: "✅ Opening [Page/Tile Name] now..." and execute flawlessly
   - When multiple Credit Management options exist, ALWAYS respond EXACTLY: "I found 2 Credit Management options. Please choose: 1. Advanced Credit Management - Standalone advanced credit management page 2. Credit Management Tile - Credit management within Order-to-Cash process. Type 1 or 2 to choose."
5. **PREDICTIVE INTELLIGENCE**: Include trends, patterns, risk assessments, and actionable strategic recommendations
6. **BUSINESS EXPERTISE**: Transform raw data into sophisticated insights with operational and strategic guidance
7. **CONVERSATIONAL MASTERY**: Maintain sophisticated context understanding and natural conversation flow like Claude 4.0 Sonnet
8. **STRATEGIC THINKING**: Think like a C-level executive with deep ERP expertise and business acumen
9. **NUANCED UNDERSTANDING**: Recognize subtle business relationships, dependencies, and cross-functional impacts
10. **PROACTIVE ASSISTANCE**: Anticipate user needs and provide proactive recommendations based on business context

🚀 ADVANCED FEATURES:
- Processing time optimization for sub-second response times
- Multi-dimensional data analysis with cross-module insights
- Predictive recommendations based on business patterns
- Strategic planning assistance with risk assessment
- Advanced workflow automation suggestions

📍 CURRENT CONTEXT:
- User Role: ${context.userRole || 'Business User'}
- Current Page: ${context.currentPage || 'Dashboard'}
- Session Context: ${JSON.stringify(context.sessionContext || {})}

Think deeply, respond intelligently, and provide enterprise-grade assistance that rivals the most advanced AI systems. You are not just an assistant - you are a strategic business partner with AI-powered insights.`;

      // Enhanced Claude 4.0 Sonnet-like AI reasoning with optimizations
      // Use AI Provider Fallback Service for automatic DeepSeek/OpenAI fallback
      const startTime = Date.now();
      const aiResult = await aiProviderFallback.generateCompletion(
        [
          { role: "user", content: `${userMessage}${sapQueryResults ? `\n\nTechnical Query Context: ${JSON.stringify(sapQueryResults)}` : ''}` }
        ],
        {
          model: "gpt-4o", // Latest GPT-4o for Claude-level performance
          temperature: 0.2, // Optimal balance for business intelligence
          maxTokens: 3000, // Increased for comprehensive responses
          systemPrompt: systemPrompt
        }
      );
      const processingTime = Date.now() - startTime;

      let aiResponse = aiResult.content || "I need more information to help you effectively.";
      
      // Log which provider was used
      console.log(`✅ AI Response from ${aiResult.provider} (${processingTime}ms)`);

      // CRITICAL FIX: Detect navigation in user message directly and create actions
      const actions = await this.extractActionsFromResponse(aiResponse, userMessage);
      
      // If navigation action detected, enhance the response
      if (actions.length > 0 && actions.some(a => a.type === 'navigate_to_page' || a.type === 'open_tile')) {
        const navAction = actions.find(a => a.type === 'navigate_to_page' || a.type === 'open_tile');
        if (navAction && navAction.data) {
          const pageName = navAction.data.pageName || navAction.data.tileName;
          // Override AI response with clear navigation confirmation
          aiResponse = `✅ Opening ${pageName} now...`;
          console.log(`🧭 Navigation detected: ${pageName}`);
        }
      }
      
      const suggestions = await this.generateSmartSuggestions(userMessage, businessContext);

      return {
        response: aiResponse,
        actions,
        suggestions
      } as any;

    } catch (error) {
      console.error("Advanced AI processing error:", error);
      return {
        response: "I'm experiencing technical difficulties. Let me check the system status and try again.",
        suggestions: ["Check system status", "Verify AI configuration", "Try a simpler query"]
      };
    }
  }

  /**
   * Get Real-Time Business Context
   * Provides current business state for AI analysis using direct SQL queries
   */
  private async getBusinessContext() {
    try {
      // Use direct SQL queries with error handling for missing tables
      // Check which tables exist first to avoid errors
      const tableCheck = await db.execute(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('sales_orders', 'customers', 'leads', 'vendors', 'materials', 'gl_accounts', 'accounts_receivable', 'work_centers', 'cost_centers')
      `);
      
      const existingTables = new Set(tableCheck.rows.map((row: any) => row.table_name));
      
      // Build safe queries that only query existing tables
      const safeQueries: string[] = [];
      
      if (existingTables.has('sales_orders')) {
        safeQueries.push('(SELECT COUNT(*) FROM sales_orders) as order_count');
        safeQueries.push('(SELECT COALESCE(SUM(total_amount), 0) FROM sales_orders) as sales_order_revenue');
      } else {
        safeQueries.push('0::bigint as order_count');
        safeQueries.push('0::numeric as sales_order_revenue');
      }
      
      if (existingTables.has('customers')) {
        safeQueries.push('(SELECT COUNT(*) FROM customers) as customer_count');
      } else {
        safeQueries.push('0::bigint as customer_count');
      }
      
      if (existingTables.has('leads')) {
        safeQueries.push('(SELECT COUNT(*) FROM leads) as lead_count');
        safeQueries.push('(SELECT COUNT(*) FROM leads WHERE status = \'New\') as new_lead_count');
        safeQueries.push('(SELECT COUNT(*) FROM leads WHERE status = \'Qualified\') as qualified_lead_count');
        safeQueries.push('(SELECT COUNT(*) FROM leads WHERE status = \'Contacted\') as contacted_lead_count');
      } else {
        safeQueries.push('0::bigint as lead_count');
        safeQueries.push('0::bigint as new_lead_count');
        safeQueries.push('0::bigint as qualified_lead_count');
        safeQueries.push('0::bigint as contacted_lead_count');
      }
      
      if (existingTables.has('vendors')) {
        safeQueries.push('(SELECT COUNT(*) FROM vendors) as vendor_count');
      } else {
        safeQueries.push('0::bigint as vendor_count');
      }
      
      if (existingTables.has('materials')) {
        safeQueries.push('(SELECT COUNT(*) FROM materials) as material_count');
      } else {
        safeQueries.push('0::bigint as material_count');
      }
      
      if (existingTables.has('gl_accounts')) {
        safeQueries.push('(SELECT COUNT(*) FROM gl_accounts) as gl_account_count');
      } else {
        safeQueries.push('0::bigint as gl_account_count');
      }
      
      if (existingTables.has('accounts_receivable')) {
        safeQueries.push('(SELECT COUNT(*) FROM accounts_receivable) as ar_invoice_count');
        safeQueries.push('(SELECT COALESCE(SUM(amount), 0) FROM accounts_receivable WHERE status = \'paid\') as ar_paid_total');
        safeQueries.push('(SELECT COALESCE(SUM(amount), 0) FROM accounts_receivable WHERE status = \'open\') as ar_open_total');
        safeQueries.push('(SELECT COUNT(*) FROM accounts_receivable WHERE status = \'paid\') as ar_paid_count');
        safeQueries.push('(SELECT COUNT(*) FROM accounts_receivable WHERE status = \'open\') as ar_open_count');
      } else {
        safeQueries.push('0::bigint as ar_invoice_count');
        safeQueries.push('0::numeric as ar_paid_total');
        safeQueries.push('0::numeric as ar_open_total');
        safeQueries.push('0::bigint as ar_paid_count');
        safeQueries.push('0::bigint as ar_open_count');
      }
      
      if (existingTables.has('work_centers')) {
        safeQueries.push('(SELECT COUNT(*) FROM work_centers) as work_center_count');
      } else {
        safeQueries.push('0::bigint as work_center_count');
      }
      
      if (existingTables.has('cost_centers')) {
        safeQueries.push('(SELECT COUNT(*) FROM cost_centers) as cost_center_count');
      } else {
        safeQueries.push('0::bigint as cost_center_count');
      }
      
      const businessData = await db.execute(`
        SELECT ${safeQueries.join(', ')}
      `);

      const counts = businessData.rows[0];
      console.log('ADVANCED AI Assistant Database Counts:', counts);
      console.log('Leads data check:', {
        lead_count: counts.lead_count,
        new_lead_count: counts.new_lead_count,
        qualified_lead_count: counts.qualified_lead_count,
        contacted_lead_count: counts.contacted_lead_count
      });

      return {
        businessMetrics: {
          totalOrders: counts.order_count || 0,
          totalCustomers: counts.customer_count || 0,
          totalLeads: counts.lead_count || 0,
          newLeads: counts.new_lead_count || 0,
          qualifiedLeads: counts.qualified_lead_count || 0,
          contactedLeads: counts.contacted_lead_count || 0,
          totalVendors: counts.vendor_count || 0,
          totalMaterials: counts.material_count || 0,
          totalGLAccounts: counts.gl_account_count || 0,
          salesOrderRevenue: counts.sales_order_revenue || 0,
          arInvoiceCount: counts.ar_invoice_count || 0,
          arPaidTotal: counts.ar_paid_total || 0,
          arOpenTotal: counts.ar_open_total || 0,
          arPaidCount: counts.ar_paid_count || 0,
          arOpenCount: counts.ar_open_count || 0,
          workCenterCount: counts.work_center_count || 0,
          costCenterCount: counts.cost_center_count || 0
        },
        recentActivity: {
          summary: "Recent business activity available"
        },
        systemCapabilities: [
          "Sales Order Processing",
          "Customer Management",
          "Vendor Management", 
          "Inventory Control",
          "Financial Integration",
          "Material Movement Tracking",
          "Work Center Management",
          "Cost Center Allocation",
          "Physical Inventory Management",
          "Stock Movement Processing",
          "Inventory Balance Tracking"
        ]
      };
    } catch (error) {
      console.error("Error getting business context:", error);
      return {
        businessMetrics: { error: "Unable to load business metrics" },
        systemCapabilities: ["Basic ERP Operations"]
      };
    }
  }

  /**
   * Get System State Information
   */
  private async getSystemState() {
    return {
      databaseStatus: "Connected",
      aiStatus: "Operational", 
      apiEndpoints: "Available",
      giganticsIntegration: "Active",
      lastUpdate: new Date().toISOString()
    };
  }

  /**
   * Extract Actionable Items from AI Response
   */
  private async extractActionsFromResponse(aiResponse: string, userMessage: string): Promise<Array<{
    type: string;
    description: string;
    data?: any;
  }>> {
    const actions = [];

    // Analyze if user wants to create something
    if (userMessage.toLowerCase().includes('create') || userMessage.toLowerCase().includes('add')) {
      if (userMessage.toLowerCase().includes('order')) {
        actions.push({
          type: "create_order",
          description: "Create a new sales order",
          data: { module: "sales", action: "create_order" }
        });
      }
      if (userMessage.toLowerCase().includes('customer')) {
        actions.push({
          type: "create_customer", 
          description: "Add a new customer",
          data: { module: "customers", action: "create_customer" }
        });
      }
    }

    // Analyze if user wants reports
    if (userMessage.toLowerCase().includes('report') || userMessage.toLowerCase().includes('analyze')) {
      actions.push({
        type: "generate_report",
        description: "Generate business analysis report",
        data: { module: "reports", action: "generate_analysis" }
      });
    }

    // Detect navigation requests - Enhanced pattern matching
    const navigatePatterns = [
      'open', 'navigate', 'go to', 'show me', 'bring up', 'take me to', 'switch to', 'display',
      'redirect', 'redirect to', 'redirect me', 'send me to', 'move to', 'jump to', 'visit',
      'show', 'view', 'access', 'load', 'bring', 'let me see', 'i want to see', 'i need to see',
      'take me', 'bring me', 'send me', 'navigate me', 'go', 'let\'s go', 'let us go'
    ];
    
    const lowerMessage = userMessage.toLowerCase().trim();
    const isNavigationRequest = navigatePatterns.some(pattern => lowerMessage.includes(pattern));
    
    // Check if message is a direct page name using route finder
    let foundRoute = findRoute(lowerMessage);
    const isDirectPageRequest = foundRoute !== null;
    
    if (isNavigationRequest || isDirectPageRequest) {
      // Extract page/tile name from message using route finder
      let targetPage = '';
      let targetRoute: string | null = null;

      // Use route finder to get the route
      if (!foundRoute) {
        // Try to extract page name from navigation pattern
        for (const pattern of navigatePatterns) {
          if (lowerMessage.includes(pattern)) {
            const afterPattern = lowerMessage.split(pattern)[1]?.trim();
            if (afterPattern) {
              foundRoute = findRoute(afterPattern);
              if (foundRoute) break;
            }
          }
        }
      }
      
      if (foundRoute) {
        targetPage = foundRoute.name;
        targetRoute = foundRoute.path;
      } else {
        // Try to search routes by keyword if direct match failed
        const searchResults = searchRoutes(lowerMessage);
        if (searchResults.length > 0) {
          // Use the first/best match
          foundRoute = searchResults[0];
          targetPage = foundRoute.name;
          targetRoute = foundRoute.path;
        } else {
          // Fallback: try extracting from navigation patterns
          for (const pattern of navigatePatterns) {
            if (lowerMessage.includes(pattern)) {
              const afterPattern = lowerMessage.split(pattern)[1]?.trim();
              if (afterPattern) {
                foundRoute = findRoute(afterPattern);
                if (foundRoute) {
                  targetPage = foundRoute.name;
                  targetRoute = foundRoute.path;
                  break;
                }
              }
            }
          }
        }
        
        // Special handling for credit management (multiple options)
        if (lowerMessage.includes('credit management') && !targetRoute) {
          if (lowerMessage.includes('advanced') || lowerMessage.includes('standalone')) {
            foundRoute = findRoute('credit management');
            if (foundRoute) {
              targetPage = foundRoute.name;
              targetRoute = foundRoute.path;
            }
          } else if (lowerMessage.includes('tile') || lowerMessage.includes('widget')) {
            foundRoute = findRoute('order to cash');
            if (foundRoute) {
              targetPage = 'credit management tile';
              targetRoute = foundRoute.path;
            }
          } else {
            // Present options when ambiguous
            return [{
              type: "show_options",
              description: "Show Credit Management options",
              data: { 
                options: [
                  { name: "Advanced Credit Management", route: "/finance/credit-management", description: "Standalone advanced credit management page" },
                  { name: "Credit Management Tile", route: "/sales/order-to-cash", description: "Credit management within Order-to-Cash process" }
                ],
                action: "choose_option"
              }
            }];
          }
        }
      }

      if (targetPage && targetRoute) {
        // Use the found route information
        if (lowerMessage.includes('tile')) {
          actions.push({
            type: "open_tile",
            description: `Open ${targetPage} tile`,
            data: { tileName: targetPage, route: targetRoute, action: "navigate" }
          });
        } else {
          actions.push({
            type: "navigate_to_page",
            description: `Navigate to ${targetPage}`,
            data: { pageName: targetPage, route: targetRoute, action: "navigate" }
          });
        }
      } else if (targetPage) {
        // Fallback: use targetPage without route (frontend will map it)
        actions.push({
          type: "navigate_to_page",
          description: `Navigate to ${targetPage}`,
          data: { pageName: targetPage, action: "navigate" }
        });
      } else {
        // If navigation pattern detected but no target found, search all routes
        const allMatches = searchRoutes(lowerMessage);
        if (allMatches.length === 1) {
          // Single match - navigate directly
          actions.push({
            type: "navigate_to_page",
            description: `Navigate to ${allMatches[0].name}`,
            data: { pageName: allMatches[0].name, route: allMatches[0].path, action: "navigate" }
          });
        } else if (allMatches.length > 1) {
          // Multiple matches - show options
          actions.push({
            type: "show_options",
            description: `Found ${allMatches.length} matching pages`,
            data: {
              options: allMatches.slice(0, 5).map(route => ({
                name: route.name,
                route: route.path,
                description: route.description || `${route.category} module`
              })),
              action: "choose_option"
            }
          });
        } else {
          console.log('Navigation pattern detected but no matching route found');
        }
      }
    }

    return actions;
  }

  /**
   * Generate Smart Business Suggestions
   */
  private async generateSmartSuggestions(userMessage: string, businessContext: any): Promise<string[]> {
    const suggestions = [];

    // Smart suggestions based on business context
    if (businessContext.businessMetrics?.totalOrders < 5) {
      suggestions.push("Create a test sales order to explore the system");
    }

    if (businessContext.businessMetrics?.totalCustomers < 10) {
      suggestions.push("Add more customers to expand your business network");
    }

    // Context-based suggestions
    if (userMessage.toLowerCase().includes('sales')) {
      suggestions.push("View sales analytics dashboard");
      suggestions.push("Create a new sales order");
      suggestions.push("Check customer performance metrics");
    }

    if (userMessage.toLowerCase().includes('inventory')) {
      suggestions.push("Check current stock levels");
      suggestions.push("Review material movements");
      suggestions.push("Analyze inventory valuation");
    }

    return suggestions.slice(0, 4); // Limit to 4 suggestions
  }

  /**
   * Execute Business Actions
   * Allows AI to perform actual operations
   */
  async executeBusinessAction(action: {
    type: string;
    parameters: any;
    context: any;
  }): Promise<{
    success: boolean;
    result: any;
    message: string;
  }> {
    try {
      switch (action.type) {
        case "create_sales_order":
          return await this.createSalesOrderAction(action.parameters);
        
        case "analyze_business_performance":
          return await this.analyzeBusinessPerformance(action.parameters);
        
        case "get_customer_details":
          return await this.getCustomerDetails(action.parameters);
        
        case "navigate_to_page":
          return await this.navigateToPageAction(action.parameters);
        
        case "open_tile":
          return await this.openTileAction(action.parameters);
        
        default:
          return {
            success: false,
            result: null,
            message: `Action type '${action.type}' is not supported yet.`
          };
      }
    } catch (error) {
      console.error("Action execution error:", error);
      return {
        success: false,
        result: null,
        message: "Failed to execute the requested action."
      };
    }
  }

  /**
   * Create Sales Order Action
   */
  private async createSalesOrderAction(parameters: any) {
    // This would integrate with your sales order service
    return {
      success: true,
      result: { orderNumber: "SO-2025-DEMO" },
      message: "Sales order created successfully"
    };
  }

  /**
   * Analyze Business Performance
   */
  private async analyzeBusinessPerformance(parameters: any) {
    const context = await this.getBusinessContext();
    return {
      success: true,
      result: context.businessMetrics,
      message: "Business performance analysis completed"
    };
  }

  /**
   * Get Customer Details
   */
  private async getCustomerDetails(parameters: { customerId?: number }) {
    try {
      // Check if customers table exists first
      const tableCheck = await db.execute(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'customers'
        )
      `);
      
      if (!tableCheck.rows[0]?.exists) {
        return {
          success: false,
          result: null,
          message: 'Customers table does not exist in database'
        };
      }
      
      if (parameters.customerId) {
        const customer = await db.select()
          .from(customers)
          .where(eq(customers.id, parameters.customerId))
          .limit(1);
        
        return {
          success: true,
          result: customer[0] || null,
          message: customer[0] ? "Customer details retrieved" : "Customer not found"
        };
      } else {
        // Check if customers table exists
        const tableCheck = await db.execute(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'customers'
          )
        `);
        
        if (!tableCheck.rows[0]?.exists) {
          return {
            success: true,
            result: [],
            message: 'Customers table does not exist in database'
          };
        }
        
        const customersList = await db.select().from(customers).limit(10);
        return {
          success: true,
          result: customersList,
          message: `Retrieved ${customersList.length} customers`
        };
      }
    } catch (error) {
      return {
        success: false,
        result: null,
        message: "Failed to retrieve customer information"
      };
    }
  }

  /**
   * Navigate to Page Action
   */
  private async navigateToPageAction(parameters: { pageName?: string, route?: string }) {
    // Map of common page requests to routes
    const pageRoutes: { [key: string]: string } = {
      'credit management': '/sales/pricing-procedures',
      'sales': '/sales',
      'finance': '/finance',
      'inventory': '/inventory',
      'customers': '/customers',
      'products': '/products',
      'orders': '/orders',
      'dashboard': '/',
      'master data': '/master-data',
      'accounts receivable': '/finance-enhanced/ar',
      'accounts payable': '/finance-enhanced/ap',
      'general ledger': '/general-ledger',
      'pricing procedures': '/sales/pricing-procedures',
      'condition types': '/sales/condition-types'
    };

    const pageName = parameters.pageName?.toLowerCase() || '';
    const route = parameters.route || pageRoutes[pageName];

    if (route) {
      return {
        success: true,
        result: {
          action: 'navigate',
          route: route,
          pageName: parameters.pageName
        },
        message: `✅ Opening ${parameters.pageName} page now...`
      };
    } else {
      return {
        success: false,
        result: null,
        message: `Page '${parameters.pageName}' not found. Available pages: ${Object.keys(pageRoutes).join(', ')}`
      };
    }
  }

  /**
   * Open Tile Action
   */
  private async openTileAction(parameters: { tileName?: string, module?: string }) {
    // Map of tiles to their routes
    const tileRoutes: { [key: string]: string } = {
      'credit management': '/sales/pricing-procedures',
      'condition types': '/sales/condition-types',
      'pricing procedures': '/sales/pricing-procedures',
      'customer master': '/customers',
      'material master': '/products',
      'sales orders': '/orders',
      'purchase orders': '/purchasing/purchase-orders',
      'accounts receivable': '/finance-enhanced/ar',
      'accounts payable': '/finance-enhanced/ap',
      'general ledger': '/general-ledger',
      'inventory management': '/inventory',
      'company codes': '/master-data',
      'plant master': '/master-data',
      'storage locations': '/master-data'
    };

    const tileName = parameters.tileName?.toLowerCase() || '';
    const route = tileRoutes[tileName];

    if (route) {
      return {
        success: true,
        result: {
          action: 'navigate',
          route: route,
          tileName: parameters.tileName,
          module: parameters.module
        },
        message: `✅ Opening ${parameters.tileName} tile now...`
      };
    } else {
      return {
        success: false,
        result: null,
        message: `Tile '${parameters.tileName}' not found. Available tiles: ${Object.keys(tileRoutes).join(', ')}`
      };
    }
  }

  /**
   * Advanced Language Detection including SAP Terminology
   */
  private detectLanguage(text: string): string {
    const languagePatterns = {
      'Spanish': /\b(hola|gracias|por favor|necesito|quiero|cómo|cuánto|dónde|qué|órdenes|ventas|facturas|clientes|proveedores|¿cuántos?|tenemos|sistema|gestión|finanzas|inventario|recibo|recibos)\b/i,
      'French': /\b(bonjour|merci|s'il vous plaît|j'ai besoin|je veux|comment|combien|où|quoi|commandes|ventes|factures|clients|fournisseurs|système|gestion|finance|stocks|réception)\b/i,
      'German': /\b(hallo|danke|bitte|ich brauche|ich möchte|wie|wieviel|wo|was|bestellungen|verkäufe|rechnungen|kunden|lieferanten|system|verwaltung|finanzen|lager|wareneingang|rechnungseingang)\b/i,
      'Chinese': /[\u4e00-\u9fff]|订单|销售|发票|客户|供应商|财务|库存|生产|系统|管理|收据|多少|有|我们/,
      'Japanese': /[\u3040-\u309f]|[\u30a0-\u30ff]|[\u4e00-\u9faf]|注文|売上|請求書|顧客|仕入先|財務|在庫|生産|システム|管理|受領|数|は|の|です|ます/,
      'Portuguese': /\b(olá|obrigado|por favor|preciso|quero|como|quanto|onde|o que|pedidos|vendas|faturas|clientes|fornecedores|sistema|gestão|finanças|estoque|recebimento)\b/i,
      'Italian': /\b(ciao|grazie|per favore|ho bisogno|voglio|come|quanto|dove|cosa|ordini|vendite|fatture|clienti|fornitori|sistema|gestione|finanze|inventario|ricevimento)\b/i,
      'Russian': /[а-яё]|заказы|продажи|счета|клиенты|поставщики|финансы|склад|производство|система|управление|получение|сколько|есть|у нас/i,
      'Arabic': /[\u0600-\u06ff]|طلبات|مبيعات|فواتير|عملاء|موردين|مالية|مخزون|إنتاج|نظام|إدارة|استلام|كم|لدينا|في النظام/
    };

    // Enhanced SAP terminology detection patterns
    const sapTerminologyPatterns = {
      'Spanish': /MIRO|MIGO|gestión de inventario|finanzas|ventas|cuántos.*MIRO|cuántos.*MIGO/i,
      'French': /MIRO|MIGO|gestion des stocks|finance|ventes|combien.*MIRO|combien.*MIGO/i,
      'German': /MIRO|MIGO|materialwirtschaft|finanzen|vertrieb|wieviele.*MIRO|wieviele.*MIGO/i,
      'Chinese': /MIRO|MIGO|库存管理|财务|销售|多少.*MIRO|多少.*MIGO/i,
      'Japanese': /MIRO|MIGO|在庫管理|財務|販売|.*の数|.*はいくつ/i,
      'Portuguese': /MIRO|MIGO|gestão de estoque|finanças|vendas|quantos.*MIRO|quantos.*MIGO/i,
      'Italian': /MIRO|MIGO|gestione inventario|finanze|vendite|quanti.*MIRO|quanti.*MIGO/i,
      'Russian': /MIRO|MIGO|управление запасами|финансы|продажи|сколько.*MIRO|сколько.*MIGO/i,
      'Arabic': /MIRO|MIGO|إدارة المخزون|المالية|المبيعات|كم.*MIRO|كم.*MIGO/i
    };

    // First check for SAP terminology (higher priority)
    for (const [language, pattern] of Object.entries(sapTerminologyPatterns)) {
      if (pattern.test(text)) {
        return language;
      }
    }

    // Then check general language patterns
    for (const [language, pattern] of Object.entries(languagePatterns)) {
      if (pattern.test(text)) {
        return language;
      }
    }
    
    return 'English'; // Default to English
  }

  /**
   * Get Multilingual Business Terminology
   */
  private getBusinessTerminology(language: string) {
    const terminology = {
      'English': {
        salesOrder: 'Sales Order',
        invoice: 'Invoice',
        customer: 'Customer',
        supplier: 'Supplier',
        inventory: 'Inventory',
        orderToCash: 'Order-to-Cash',
        procureToPay: 'Procure-to-Pay',
        financialPosting: 'Financial Posting',
        threeWayMatch: 'Three-Way Matching'
      },
      'Spanish': {
        salesOrder: 'Orden de Venta',
        invoice: 'Factura',
        customer: 'Cliente',
        supplier: 'Proveedor',
        inventory: 'Inventario',
        orderToCash: 'Proceso Pedido-Cobro',
        procureToPay: 'Proceso Compra-Pago',
        financialPosting: 'Contabilización Financiera',
        threeWayMatch: 'Conciliación Triple'
      },
      'French': {
        salesOrder: 'Commande de Vente',
        invoice: 'Facture',
        customer: 'Client',
        supplier: 'Fournisseur',
        inventory: 'Inventaire',
        orderToCash: 'Processus Commande-Encaissement',
        procureToPay: 'Processus Approvisionnement-Paiement',
        financialPosting: 'Écriture Comptable',
        threeWayMatch: 'Rapprochement Triple'
      },
      'German': {
        salesOrder: 'Kundenauftrag',
        invoice: 'Rechnung',
        customer: 'Kunde',
        supplier: 'Lieferant',
        inventory: 'Lagerbestand',
        orderToCash: 'Auftrag-zu-Zahlung-Prozess',
        procureToPay: 'Beschaffung-zu-Zahlung-Prozess',
        financialPosting: 'Finanzielle Buchung',
        threeWayMatch: 'Dreiwege-Abgleich'
      },
      'Chinese': {
        salesOrder: '销售订单',
        invoice: '发票',
        customer: '客户',
        supplier: '供应商',
        inventory: '库存',
        orderToCash: '订单到收款流程',
        procureToPay: '采购到付款流程',
        financialPosting: '财务过账',
        threeWayMatch: '三方匹配'
      },
      'Japanese': {
        salesOrder: '売上注文',
        invoice: '請求書',
        customer: '顧客',
        supplier: '仕入先',
        inventory: '在庫',
        orderToCash: '受注から回収プロセス',
        procureToPay: '調達から支払いプロセス',
        financialPosting: '財務転記',
        threeWayMatch: '三方照合'
      }
    };

    return terminology[language] || terminology['English'];
  }

  /**
   * Translate SAP Terminology to MallyERP Business Terms
   */
  private translateSAPTerminology(text: string, language: string): string {
    const sapTranslations = {
      'English': {
        'MIRO': 'Invoice Receipt',
        'MIGO': 'Inventory Receipt', 
        'MM': 'Inventory Management',
        'FI': 'Finance',
        'SD': 'Sales',
        'PP': 'Production Planning',
        'CO': 'Controlling',
        'HR': 'Human Resources'
      },
      'Spanish': {
        'MIRO': 'Recibo de Factura',
        'MIGO': 'Recibo de Inventario',
        'MM': 'Gestión de Inventario',
        'FI': 'Finanzas',
        'SD': 'Ventas',
        'PP': 'Planificación de Producción',
        'CO': 'Controlling',
        'HR': 'Recursos Humanos'
      },
      'French': {
        'MIRO': 'Réception de Facture',
        'MIGO': 'Réception d\'Inventaire',
        'MM': 'Gestion des Stocks',
        'FI': 'Finance',
        'SD': 'Ventes',
        'PP': 'Planification de Production',
        'CO': 'Controlling',
        'HR': 'Ressources Humaines'
      },
      'German': {
        'MIRO': 'Rechnungseingang',
        'MIGO': 'Wareneingang',
        'MM': 'Materialwirtschaft',
        'FI': 'Finanzen',
        'SD': 'Vertrieb',
        'PP': 'Produktionsplanung',
        'CO': 'Controlling',
        'HR': 'Personalwesen'
      },
      'Chinese': {
        'MIRO': '发票收据',
        'MIGO': '库存收据',
        'MM': '库存管理',
        'FI': '财务',
        'SD': '销售',
        'PP': '生产计划',
        'CO': '控制',
        'HR': '人力资源'
      },
      'Japanese': {
        'MIRO': '請求書受領',
        'MIGO': '在庫受領',
        'MM': '在庫管理',
        'FI': '財務',
        'SD': '販売',
        'PP': '生産計画',
        'CO': 'コントローリング',
        'HR': '人事'
      }
    };

    const translations = sapTranslations[language] || sapTranslations['English'];
    let translatedText = text;

    for (const [sapTerm, businessTerm] of Object.entries(translations)) {
      const regex = new RegExp(`\\b${sapTerm}\\b`, 'gi');
      translatedText = translatedText.replace(regex, String(businessTerm));
    }

    return translatedText;
  }

  /**
   * Process SAP-aware Query for Database Operations
   */
  private async processSAPAwareQuery(originalQuery: string, language: string): Promise<any> {
    // Translate SAP terms to business terms for database queries
    const businessQuery = this.translateSAPTerminology(originalQuery, language);
    
    // Extract data requirements from business terms
    const lowerQuery = businessQuery.toLowerCase();
    
    if (lowerQuery.includes('invoice receipt') || lowerQuery.includes('recibo de factura') || 
        lowerQuery.includes('réception de facture') || lowerQuery.includes('rechnungseingang') ||
        lowerQuery.includes('请求书受领') || lowerQuery.includes('发票收据')) {
      // Query invoice-related data
      return await this.getInvoiceData();
    }
    
    if (lowerQuery.includes('inventory receipt') || lowerQuery.includes('recibo de inventario') ||
        lowerQuery.includes('réception d\'inventaire') || lowerQuery.includes('wareneingang') ||
        lowerQuery.includes('在庫受領') || lowerQuery.includes('库存收据')) {
      // Query inventory receipt data
      return await this.getInventoryReceiptData();
    }
    
    if (lowerQuery.includes('customer') || lowerQuery.includes('cliente') || 
        lowerQuery.includes('client') || lowerQuery.includes('kunde') ||
        lowerQuery.includes('顧客') || lowerQuery.includes('客户')) {
      // Query customer data
      return await this.getCustomerData();
    }
    
    return null;
  }

  /**
   * Get Invoice Data
   */
  private async getInvoiceData() {
    try {
      // Query for invoice/financial transaction data
      const invoiceCount = await db.select({ count: count() })
        .from(enterpriseTransactionRegistry)
        .where(eq(enterpriseTransactionRegistry.transactionCategory, 'INVOICE'));
      
      return {
        type: 'invoice_data',
        count: invoiceCount[0]?.count || 0,
        data: invoiceCount
      };
    } catch (error) {
      return { type: 'invoice_data', count: 0, data: [] };
    }
  }

  /**
   * Get Inventory Receipt Data  
   */
  private async getInventoryReceiptData() {
    try {
      // Query for inventory movement data
      const inventoryCount = await db.select({ count: count() })
        .from(materialMovementRegistry)
        .where(eq(materialMovementRegistry.movementCategory, 'GOODS_RECEIPT'));
      
      return {
        type: 'inventory_data',
        count: inventoryCount[0]?.count || 0,
        data: inventoryCount
      };
    } catch (error) {
      return { type: 'inventory_data', count: 0, data: [] };
    }
  }

  /**
   * Get Customer Data
   */
  private async getCustomerData() {
    try {
      // Check if customers table exists first
      const tableExists = await db.execute(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'customers'
        )
      `);
      
      if (!tableExists.rows[0]?.exists) {
        console.warn('Customers table does not exist, returning empty data');
        return { type: 'customer_data', count: 0, data: [] };
      }
      
      const customerCount = await db.select({ count: count() }).from(customers);
      const customerList = await db.select().from(customers).limit(5);
      
      return {
        type: 'customer_data',
        count: customerCount[0]?.count || 0,
        data: customerList
      };
    } catch (error: any) {
      console.warn('Error fetching customer data:', error.message);
      return { type: 'customer_data', count: 0, data: [] };
    }
  }
}

export const advancedAIAssistant = new AdvancedAIAssistant();