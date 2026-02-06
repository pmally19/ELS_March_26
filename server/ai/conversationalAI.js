/**
 * Conversational AI Engine - True Interactive AI System
 * Provides human-like conversation experience with real-time understanding
 */

import OpenAI from "openai";
import pkg from 'pg';
const { Pool } = pkg;

class ConversationalAI {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 30000
    });
    
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    // Conversation context memory
    this.conversationHistory = new Map();
    this.userProfiles = new Map();
    
    // Real-time system knowledge
    this.systemState = {
      totalTables: 244,
      activeModules: ['Sales', 'Finance', 'Inventory', 'Production', 'Purchasing', 'HR', 'Controlling'],
      currentUser: 'Chief',
      lastQueries: [],
      systemHealth: 'operational'
    };
  }

  async processConversation(userMessage, userId = 'default', sessionId = null, context = {}) {
    try {
      // Initialize session if new
      if (!this.conversationHistory.has(sessionId)) {
        this.conversationHistory.set(sessionId, {
          messages: [],
          userContext: {},
          preferences: {},
          startTime: new Date()
        });
      }

      const session = this.conversationHistory.get(sessionId);
      
      // Add user message to history
      session.messages.push({
        role: 'user',
        content: userMessage,
        timestamp: new Date()
      });

      // Analyze the query for immediate actions
      const immediateResult = await this.handleImmediateQuery(userMessage, context);
      if (immediateResult) {
        const response = {
          role: 'assistant',
          content: immediateResult,
          timestamp: new Date(),
          type: 'direct_result'
        };
        
        session.messages.push(response);
        return {
          response: immediateResult,
          conversationType: 'direct_result',
          confidence: 0.95,
          sessionId
        };
      }

      // Generate conversational response with full context
      const conversationalResponse = await this.generateConversationalResponse(
        userMessage, 
        session, 
        context
      );

      // Add AI response to history
      session.messages.push({
        role: 'assistant',
        content: conversationalResponse.content,
        timestamp: new Date(),
        type: 'conversational'
      });

      return {
        response: conversationalResponse.content,
        conversationType: 'conversational',
        confidence: conversationalResponse.confidence,
        suggestions: conversationalResponse.suggestions,
        sessionId
      };

    } catch (error) {
      console.error('Conversational AI error:', error);
      return {
        response: "I apologize, but I'm having trouble processing that right now. Could you please rephrase your question?",
        conversationType: 'error',
        confidence: 0.1,
        sessionId
      };
    }
  }

  async handleImmediateQuery(query, context = {}) {
    const lowerQuery = query.toLowerCase();
    
    try {
      // Count queries - return immediate results
      if (lowerQuery.includes('how many') || lowerQuery.includes('total')) {
        if (lowerQuery.includes('purchase order')) {
          const result = await this.pool.query('SELECT COUNT(*) as count FROM purchase_orders');
          return `There are ${result.rows[0].count} purchase orders in the system.`;
        }
        
        if (lowerQuery.includes('customer')) {
          const result = await this.pool.query('SELECT COUNT(*) as count FROM customers');
          return `There are ${result.rows[0].count} customers in the system.`;
        }
        
        if (lowerQuery.includes('sales order') || (lowerQuery.includes('order') && !lowerQuery.includes('purchase'))) {
          const result = await this.pool.query('SELECT COUNT(*) as count FROM sales_orders');
          return `There are ${result.rows[0].count} sales orders in the system.`;
        }
        
        if (lowerQuery.includes('material') || lowerQuery.includes('product')) {
          const result = await this.pool.query('SELECT COUNT(*) as count FROM materials');
          return `There are ${result.rows[0].count} materials in the system.`;
        }
        
        if (lowerQuery.includes('employee')) {
          const result = await this.pool.query('SELECT COUNT(*) as count FROM employees');
          return `There are ${result.rows[0].count} employees in the system.`;
        }
        
        if (lowerQuery.includes('cost center')) {
          const result = await this.pool.query('SELECT COUNT(*) as count FROM cost_centers');
          const count = result.rows[0].count;
          if (count === 0) {
            return `No cost centers found in the system. Would you like me to help you create some cost centers or check if they might be stored under a different table name?`;
          }
          return `There are ${count} cost centers in the system.`;
        }
        
        if (lowerQuery.includes('vendor') || lowerQuery.includes('supplier')) {
          const result = await this.pool.query('SELECT COUNT(*) as count FROM vendors');
          return `There are ${result.rows[0].count} vendors in the system.`;
        }
        
        if (lowerQuery.includes('table')) {
          return `There are ${this.systemState.totalTables} tables in the database.`;
        }
      }

      // AP Enhancement specific queries
      if (lowerQuery.includes('invoice verification') || lowerQuery.includes('invoice processing')) {
        const result = await this.pool.query('SELECT COUNT(*) as count FROM ap_invoice_verification_workflow WHERE active = true');
        const workflowCount = result.rows[0].count;
        const statsResult = await this.pool.query(`
          SELECT 
            (SELECT COUNT(*) FROM ap_invoice_verification_workflow WHERE verification_status = 'PENDING' AND active = true) as pending,
            (SELECT COUNT(*) FROM ap_invoice_verification_workflow WHERE verification_status = 'APPROVED' AND active = true) as approved,
            (SELECT COUNT(*) FROM ap_invoice_verification_workflow WHERE verification_status = 'REJECTED' AND active = true) as rejected
        `);
        const stats = statsResult.rows[0];
        return `Invoice Verification System Status:
• Total Workflows: ${workflowCount}
• Pending Verification: ${stats.pending}
• Approved Invoices: ${stats.approved}
• Rejected Invoices: ${stats.rejected}

This system handles invoice validation, approval workflows, and tolerance checking. Access it via Finance → AP Tiles → Invoice Processing.`;
      }

      if (lowerQuery.includes('enhanced vendor') || lowerQuery.includes('vendor management')) {
        const result = await this.pool.query('SELECT COUNT(*) as count FROM ap_enhanced_vendor_mgmt WHERE active = true');
        const vendorCount = result.rows[0].count;
        const authResult = await this.pool.query('SELECT COUNT(*) as count FROM ap_authorization_groups WHERE active = true');
        const authGroups = authResult.rows[0].count;
        return `Enhanced Vendor Management System:
• Enhanced Vendors: ${vendorCount}
• Authorization Groups: ${authGroups}
• Features: Corporate groups, banking details, tax management, blocking controls

This system provides advanced vendor master data management beyond standard vendor setup. Access via Finance → AP Tiles → Enhanced Vendor Management.`;
      }

      if (lowerQuery.includes('document parking')) {
        const result = await this.pool.query('SELECT COUNT(*) as count FROM ap_document_parking WHERE active = true');
        const docCount = result.rows[0].count;
        const statsResult = await this.pool.query(`
          SELECT 
            (SELECT COUNT(*) FROM ap_document_parking WHERE status = 'PARKED' AND active = true) as parked,
            (SELECT COUNT(*) FROM ap_document_parking WHERE status = 'POSTED' AND active = true) as posted
        `);
        const stats = statsResult.rows[0];
        return `Document Parking System:
• Total Parked Documents: ${docCount}
• Currently Parked: ${stats.parked}
• Posted Documents: ${stats.posted}

This system allows parking incomplete invoices for later completion and posting. Access via Finance → AP Tiles → Document Parking.`;
      }

      if (lowerQuery.includes('down payment')) {
        const result = await this.pool.query('SELECT COUNT(*) as count FROM ap_down_payments WHERE active = true');
        const paymentCount = result.rows[0].count;
        const statsResult = await this.pool.query(`
          SELECT 
            (SELECT COUNT(*) FROM ap_down_payments WHERE status = 'REQUESTED' AND active = true) as pending,
            (SELECT COALESCE(SUM(down_payment_amount), 0) FROM ap_down_payments WHERE status = 'PAID' AND active = true) as total_paid
        `);
        const stats = statsResult.rows[0];
        return `Down Payment Management System:
• Total Down Payments: ${paymentCount}
• Pending Requests: ${stats.pending}
• Total Paid Amount: $${parseFloat(stats.total_paid).toFixed(2)}

This system manages vendor down payments, special GL indicators, and clearing workflows. Access via Finance → AP Tiles → Down Payment Management.`;
      }

      if (lowerQuery.includes('payment processing') || lowerQuery.includes('payment authorization')) {
        const result = await this.pool.query('SELECT COUNT(*) as count FROM payment_processing_center WHERE is_active = true');
        const paymentCount = result.rows[0].count;
        const methodResult = await this.pool.query('SELECT COUNT(*) as count FROM payment_method_config WHERE is_active = true');
        const methods = methodResult.rows[0].count;
        return `Payment Processing Center:
• Total Payment Requests: ${paymentCount}
• Active Payment Methods: ${methods}
• Features: Authorization workflows, payment blocking, multiple payment methods

This system handles payment processing, authorization, and payment method configuration. Access via Finance → AP Tiles → Payment Authorization.`;
      }

      if (lowerQuery.includes('clearing') || lowerQuery.includes('settlement')) {
        const result = await this.pool.query('SELECT COUNT(*) as count FROM ap_clearing_settlement_hub WHERE active = true');
        const clearingCount = result.rows[0].count;
        return `Clearing & Settlement System:
• Total Clearing Hubs: ${clearingCount}
• Features: Automatic clearing, difference reconciliation, line item management

This system manages AP clearing processes and settlement workflows. Access via Finance → AP Tiles → AP Workflows.`;
      }

      // List queries - return immediate data with intelligent empty state handling
      if (lowerQuery.includes('show') || lowerQuery.includes('list')) {
        if (lowerQuery.includes('customer')) {
          const result = await this.pool.query('SELECT id, name, email, status FROM customers LIMIT 5');
          if (result.rows.length === 0) {
            return 'No customers found in the system. Would you like me to help you create sample customers or check if customer data might be in a different table?';
          }
          
          let response = 'Here are the customers:\n';
          result.rows.forEach(row => {
            response += `• ${row.name} (ID: ${row.id}) - ${row.email} [${row.status}]\n`;
          });
          return response;
        }
        
        if (lowerQuery.includes('cost center')) {
          const result = await this.pool.query('SELECT id, cost_center, description, cost_center_category FROM cost_centers LIMIT 5');
          if (result.rows.length === 0) {
            // Check for related tables
            const relatedTables = await this.checkDatabaseTables('cost');
            let response = 'No cost centers available in the system. This is common for new implementations.\n\n';
            
            if (relatedTables.length > 0) {
              response += `I found these related tables: ${relatedTables.join(', ')}\n\n`;
            }
            
            response += 'I can help you:\n• Create sample cost centers\n• Check existing master data\n• Set up cost center hierarchy\n\nWhat would you like to do?';
            return response;
          }
          
          let response = 'Here are the cost centers:\n';
          result.rows.forEach(row => {
            response += `• ${row.cost_center}: ${row.description} (${row.cost_center_category})\n`;
          });
          return response;
        }
        
        if (lowerQuery.includes('material') || lowerQuery.includes('product')) {
          const result = await this.pool.query('SELECT id, material_code, description, material_type FROM materials LIMIT 5');
          if (result.rows.length === 0) return 'No materials found in the system.';
          
          let response = 'Here are the materials:\n';
          result.rows.forEach(row => {
            response += `• ${row.material_code}: ${row.description} (${row.material_type})\n`;
          });
          return response;
        }
      }

      // Status queries
      if (lowerQuery.includes('status') || lowerQuery.includes('health')) {
        return `System Status: ${this.systemState.systemHealth.toUpperCase()}\n• ${this.systemState.totalTables} database tables\n• ${this.systemState.activeModules.length} active modules\n• Current user role: ${this.systemState.currentUser}`;
      }

      // Navigation queries - return actionable navigation commands
      if (lowerQuery.includes('go to') || lowerQuery.includes('navigate') || lowerQuery.includes('open')) {
        const navigationResult = this.handleNavigation(lowerQuery);
        if (navigationResult) {
          return navigationResult;
        }
      }

    } catch (error) {
      console.error('Immediate query error:', error);
      return null;
    }

    return null;
  }

  async checkDatabaseTables(keyword) {
    try {
      // Check what tables exist that might contain the requested data
      const tableQuery = `
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name ILIKE '%${keyword}%'
        ORDER BY table_name
      `;
      const result = await this.pool.query(tableQuery);
      return result.rows.map(row => row.table_name);
    } catch (error) {
      return [];
    }
  }

  handleNavigation(userMessage) {
    const lowerMessage = userMessage.toLowerCase();
    
    // Map navigation requests to actual page routes
    const navigationMap = {
      'finance': { route: '/finance', name: 'Finance' },
      'financial': { route: '/finance', name: 'Finance' },
      'general ledger': { route: '/general-ledger', name: 'General Ledger' },
      'gl': { route: '/general-ledger', name: 'General Ledger' },
      'sales': { route: '/sales', name: 'Sales' },
      'inventory': { route: '/inventory', name: 'Inventory' },
      'purchase': { route: '/purchase', name: 'Purchase' },
      'purchasing': { route: '/purchase', name: 'Purchase' },
      'production': { route: '/production', name: 'Production' },
      'manufacturing': { route: '/production', name: 'Production' },
      'hr': { route: '/hr', name: 'HR' },
      'human resources': { route: '/hr', name: 'HR' },
      'dashboard': { route: '/', name: 'Dashboard' },
      'home': { route: '/', name: 'Dashboard' },
      'master data': { route: '/master-data', name: 'Master Data' },
      'transactions': { route: '/transactions', name: 'Transactions' },
      'controlling': { route: '/controlling', name: 'Controlling' },
      'reports': { route: '/reports', name: 'Reports' }
    };
    
    // Find matching navigation target
    for (const [keyword, config] of Object.entries(navigationMap)) {
      if (lowerMessage.includes(keyword)) {
        return {
          type: 'navigation_action',
          route: config.route,
          moduleName: config.name,
          message: `Navigating to ${config.name} page...`,
          executeNavigation: true
        };
      }
    }
    
    return null;
  }

  async generateConversationalResponse(userMessage, session, context) {
    try {
      // Build conversation context
      const recentMessages = session.messages.slice(-10);
      
      const systemPrompt = `You are Jr. Assistant - a highly intelligent, conversational AI for MallyERP. 

PERSONALITY:
- Conversational and helpful like a knowledgeable colleague
- Provide direct, actionable responses
- Understand context and remember previous conversation
- Be proactive in offering next steps

SYSTEM KNOWLEDGE:
- Complete ERP system with ${this.systemState.totalTables} database tables
- Modules: ${this.systemState.activeModules.join(', ')}
- User Role: ${this.systemState.currentUser} (full access)

CONVERSATION RULES:
- Give immediate answers when possible
- If you need to query data, be conversational about it
- Remember what we discussed earlier in this conversation
- Offer helpful suggestions based on the user's workflow
- Be natural and engaging, not robotic

Current conversation context: ${JSON.stringify(recentMessages.slice(-3))}`;

      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          ...recentMessages.map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          { role: "user", content: userMessage }
        ],
        max_tokens: 800,
        temperature: 0.7
      });

      const aiResponse = response.choices[0].message.content;

      // Generate helpful suggestions
      const suggestions = this.generateSuggestions(userMessage, aiResponse);

      return {
        content: aiResponse,
        confidence: 0.9,
        suggestions
      };

    } catch (error) {
      console.error('Conversational response error:', error);
      return {
        content: "I understand what you're asking. Let me help you with that information.",
        confidence: 0.5,
        suggestions: []
      };
    }
  }

  generateSuggestions(userMessage, aiResponse) {
    const lowerMessage = userMessage.toLowerCase();
    const suggestions = [];

    // Context-aware suggestions
    if (lowerMessage.includes('customer')) {
      suggestions.push("Show customer details", "Create new customer", "Customer reports");
    }
    
    if (lowerMessage.includes('order')) {
      suggestions.push("View order details", "Create new order", "Order status report");
    }
    
    if (lowerMessage.includes('inventory') || lowerMessage.includes('material')) {
      suggestions.push("Check stock levels", "Material movements", "Inventory valuation");
    }

    // Always offer general help
    suggestions.push("What else can you help me with?");

    return suggestions.slice(0, 4); // Limit to 4 suggestions
  }

  extractModule(query) {
    const moduleMap = {
      'sales': 'Sales',
      'customer': 'Sales', 
      'finance': 'Finance',
      'accounting': 'Finance',
      'ap': 'Finance',
      'accounts payable': 'Finance',
      'invoice verification': 'Finance',
      'invoice processing': 'Finance',
      'vendor management': 'Finance',
      'enhanced vendor': 'Finance',
      'document parking': 'Finance',
      'down payment': 'Finance',
      'payment processing': 'Finance',
      'payment authorization': 'Finance',
      'clearing': 'Finance',
      'settlement': 'Finance',
      'inventory': 'Inventory',
      'stock': 'Inventory',
      'material': 'Inventory',
      'production': 'Production',
      'manufacturing': 'Production',
      'purchase': 'Purchasing',
      'procurement': 'Purchasing',
      'vendor': 'Purchasing',
      'hr': 'HR',
      'employee': 'HR',
      'controlling': 'Controlling',
      'cost': 'Controlling'
    };

    for (const [key, module] of Object.entries(moduleMap)) {
      if (query.includes(key)) {
        return module;
      }
    }
    return null;
  }

  // Clean up old sessions
  cleanupSessions() {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    for (const [sessionId, session] of this.conversationHistory.entries()) {
      if (session.startTime < oneHourAgo) {
        this.conversationHistory.delete(sessionId);
      }
    }
  }
}

export default ConversationalAI;