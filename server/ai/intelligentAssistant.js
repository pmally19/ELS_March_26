/**
 * Enhanced Intelligent Assistant for MallyERP
 * Integrates conversation memory, intent recognition, and workflow automation
 */

import ConversationMemory from './conversationMemory.js';
import IntentRecognition from './intentRecognition.js';
import WorkflowAutomation from './workflowAutomation.js';
import OpenAI from "openai";

class IntelligentAssistant {
  constructor() {
    this.conversationMemory = new ConversationMemory();
    this.intentRecognition = new IntentRecognition();
    this.workflowAutomation = new WorkflowAutomation();
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 30000
    });
    
    this.moduleCapabilities = {
      'sales': ['customers', 'orders', 'quotes', 'opportunities', 'pricing'],
      'finance': ['accounts', 'invoices', 'payments', 'budgets', 'reports'],
      'inventory': ['materials', 'stock', 'movements', 'warehouses', 'valuation'],
      'production': ['orders', 'boms', 'routing', 'capacity', 'scheduling'],
      'purchasing': ['vendors', 'requisitions', 'contracts', 'receipts'],
      'hr': ['employees', 'payroll', 'benefits', 'performance', 'training'],
      'controlling': ['cost-centers', 'profit-centers', 'analytics', 'variances']
    };
  }

  async processUserQuery(userInput, userId = 'default_user', sessionId = null, currentPage = '/') {
    try {
      // Generate session ID if not provided
      if (!sessionId) {
        sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }

      // Get conversation context
      const context = await this.conversationMemory.getConversationContext(userId, sessionId);
      
      // Recognize intent
      const intentResult = await this.intentRecognition.recognizeIntent(userInput);
      
      // Learn user patterns
      await this.conversationMemory.learnUserPattern(userId, 'query_pattern', {
        intent: intentResult.intent,
        entities: intentResult.entities,
        module: intentResult.module,
        page: currentPage
      });

      // Process the request based on intent
      let response;
      
      if (intentResult.intent === 'navigate') {
        response = await this.handleNavigation(intentResult, currentPage);
      } else if (intentResult.intent === 'create') {
        response = await this.handleCreation(intentResult, userId);
      } else if (intentResult.intent === 'read') {
        response = await this.handleDataRetrieval(intentResult, userId);
      } else if (intentResult.intent === 'update') {
        response = await this.handleUpdate(intentResult, userId);
      } else if (intentResult.intent === 'analyze') {
        response = await this.handleAnalysis(intentResult, userId);
      } else {
        response = await this.handleGeneralQuery(userInput, intentResult, context);
      }

      // Save conversation
      const messages = [...context.messages, {
        role: 'user',
        content: userInput,
        timestamp: new Date(),
        intent: intentResult
      }, {
        role: 'assistant',
        content: response.content,
        timestamp: new Date(),
        actions: response.actions || []
      }];

      await this.conversationMemory.saveConversation(userId, sessionId, messages, {
        currentModule: intentResult.module,
        lastIntent: intentResult.intent,
        taskContext: response.taskContext || {}
      });

      // Record AI interaction for learning
      await this.conversationMemory.recordAIInteraction(
        userInput,
        response.content,
        response.actionTaken || 'conversation',
        response.successRating || 5,
        { intent: intentResult, module: intentResult.module }
      );

      return {
        ...response,
        sessionId,
        intentAnalysis: intentResult,
        conversationContext: context
      };

    } catch (error) {
      console.error('Intelligent assistant processing failed:', error);
      return {
        success: false,
        content: "I encountered an issue processing your request. Could you please rephrase it?",
        actionTaken: 'error_handling',
        successRating: 1
      };
    }
  }

  async handleNavigation(intentResult, currentPage) {
    const { entities, parameters } = intentResult;
    
    // Smart navigation based on entities and current context
    const navigationMap = {
      'customer': '/sales/customers',
      'vendor': '/purchasing/vendors',
      'material': '/inventory/materials',
      'product': '/inventory/materials',
      'employee': '/hr/employees',
      'order': '/sales/orders',
      'invoice': '/finance/invoices',
      'report': '/reports',
      'dashboard': '/',
      'inventory': '/inventory',
      'sales': '/sales',
      'finance': '/finance',
      'production': '/production',
      'purchasing': '/purchasing',
      'hr': '/hr'
    };

    let targetRoute = '/';
    let navigationText = '';

    for (const entity of entities) {
      if (navigationMap[entity]) {
        targetRoute = navigationMap[entity];
        navigationText = `Navigating to ${entity} management`;
        break;
      }
    }

    // Execute navigation
    return {
      success: true,
      content: navigationText,
      actionTaken: 'navigation',
      actions: [{
        type: 'navigate',
        target: targetRoute,
        display: navigationText
      }],
      taskContext: {
        navigatedFrom: currentPage,
        navigatedTo: targetRoute,
        intent: 'navigation'
      },
      successRating: 5
    };
  }

  async handleCreation(intentResult, userId) {
    const { entities, module, parameters } = intentResult;
    
    try {
      // Auto-trigger workflow if applicable
      await this.workflowAutomation.processAutomationTrigger(
        module, 
        `${entities[0]}_creation_requested`, 
        { userId, parameters }
      );

      const entity = entities[0] || 'record';
      const creationInstructions = await this.generateCreationInstructions(entity, parameters);

      return {
        success: true,
        content: `I'll help you create a new ${entity}. ${creationInstructions}`,
        actionTaken: 'creation_guidance',
        actions: [{
          type: 'create_form',
          entity: entity,
          module: module,
          parameters: parameters
        }],
        taskContext: {
          creationType: entity,
          targetModule: module,
          step: 'form_display'
        },
        successRating: 4
      };
    } catch (error) {
      return {
        success: false,
        content: `I encountered an issue setting up the creation process for ${entities[0] || 'the record'}.`,
        actionTaken: 'creation_error',
        successRating: 2
      };
    }
  }

  async handleDataRetrieval(intentResult, userId) {
    const { entities, module, parameters } = intentResult;
    
    try {
      const entity = entities[0] || 'data';
      const filters = parameters.filters || {};
      
      // Execute direct database queries for immediate results
      const fullSystemIntelligence = await import('./fullSystemIntelligence.js');
      const systemIntelligence = new fullSystemIntelligence.default();
      
      // Try direct query execution first
      const directResult = await systemIntelligence.executeDirectQuery(
        `show ${entity}`, 
        { userRole: 'Chief', module }
      );
      
      if (directResult && !directResult.includes('Intent Classification')) {
        return {
          success: true,
          content: directResult,
          actionTaken: 'direct_data_retrieval',
          actions: [],
          taskContext: {
            dataType: entity,
            appliedFilters: filters,
            queryGenerated: `Direct query for ${entity}`
          },
          successRating: 5
        };
      }
      
      // Fallback to original method if direct query doesn't work
      const retrievalQuery = await this.buildDataQuery(entity, filters, module);
      
      return {
        success: true,
        content: `Here's the ${entity} data you requested. I've applied the relevant filters and sorted by priority.`,
        actionTaken: 'data_retrieval',
        actions: [{
          type: 'display_data',
          entity: entity,
          query: retrievalQuery,
          module: module
        }],
        taskContext: {
          dataType: entity,
          appliedFilters: filters,
          queryGenerated: retrievalQuery
        },
        successRating: 5
      };
    } catch (error) {
      return {
        success: false,
        content: `I couldn't retrieve the ${entities[0] || 'data'} at this moment. Please check the filters and try again.`,
        actionTaken: 'retrieval_error',
        successRating: 2
      };
    }
  }

  async handleAnalysis(intentResult, userId) {
    const { entities, module, parameters } = intentResult;
    
    try {
      const analysisPrompt = `Provide business analysis for ${entities.join(', ')} in the ${module} module. 
      Focus on actionable insights, trends, and recommendations.
      Context: ${JSON.stringify(parameters)}`;

      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: "system", content: "You are a business analyst specializing in ERP systems. Provide clear, actionable insights." },
          { role: "user", content: analysisPrompt }
        ],
        max_tokens: 800
      });

      const analysis = response.choices[0].message.content;

      return {
        success: true,
        content: analysis,
        actionTaken: 'business_analysis',
        actions: [{
          type: 'display_analysis',
          analysisType: 'business_insights',
          module: module,
          entities: entities
        }],
        taskContext: {
          analysisModule: module,
          analyzedEntities: entities,
          insightGenerated: true
        },
        successRating: 5
      };
    } catch (error) {
      return {
        success: false,
        content: `I couldn't complete the analysis at this time. Please provide more specific parameters.`,
        actionTaken: 'analysis_error',
        successRating: 2
      };
    }
  }

  async handleGeneralQuery(userInput, intentResult, context) {
    try {
      const conversationHistory = context.messages.slice(-5).map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const systemPrompt = `You are Jr., the intelligent assistant for MallyERP. You have deep knowledge of:
      - Business processes and ERP workflows
      - MallyERP modules: ${Object.keys(this.moduleCapabilities).join(', ')}
      - User patterns and preferences
      - Workflow automation and business rules
      
      Provide helpful, actionable responses. Suggest specific next steps when possible.
      Always maintain a professional but friendly tone.`;

      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: "system", content: systemPrompt },
          ...conversationHistory,
          { role: "user", content: userInput }
        ],
        max_tokens: 600,
        temperature: 0.7
      });

      const content = response.choices[0].message.content;

      return {
        success: true,
        content: content,
        actionTaken: 'general_assistance',
        actions: this.extractSuggestedActions(content),
        taskContext: {
          responseType: 'general',
          confidenceLevel: intentResult.confidence
        },
        successRating: 4
      };
    } catch (error) {
      return {
        success: false,
        content: "I'm here to help with your ERP needs. Could you tell me more about what you're looking for?",
        actionTaken: 'fallback_response',
        successRating: 3
      };
    }
  }

  async generateCreationInstructions(entity, parameters) {
    const instructions = {
      'customer': 'Please provide the customer name, contact information, and business details.',
      'vendor': 'Enter vendor company details, contact person, and payment terms.',
      'material': 'Specify material description, unit of measure, and category.',
      'employee': 'Include personal details, position, and department assignment.',
      'order': 'Select customer/vendor, add line items, and set delivery requirements.'
    };

    return instructions[entity] || `Please provide the necessary details for creating this ${entity}.`;
  }

  async buildDataQuery(entity, filters, module) {
    // Build intelligent SQL query based on entity and filters
    const baseQueries = {
      'customer': 'SELECT * FROM customers WHERE active = true',
      'vendor': 'SELECT * FROM vendors WHERE status = \'active\'',
      'material': 'SELECT * FROM materials WHERE is_active = true',
      'order': 'SELECT * FROM sales_orders WHERE status != \'cancelled\''
    };

    let query = baseQueries[entity] || `SELECT * FROM ${entity}s`;
    
    // Add dynamic filters
    for (const [field, value] of Object.entries(filters)) {
      query += ` AND ${field} = '${value}'`;
    }

    query += ' ORDER BY created_at DESC LIMIT 50';
    
    return query;
  }

  extractSuggestedActions(content) {
    const actions = [];
    
    // Simple pattern matching for action suggestions
    if (content.includes('create') || content.includes('add')) {
      actions.push({ type: 'create_suggestion', text: 'Create new record' });
    }
    
    if (content.includes('view') || content.includes('show')) {
      actions.push({ type: 'view_suggestion', text: 'View existing records' });
    }
    
    if (content.includes('report') || content.includes('analyze')) {
      actions.push({ type: 'report_suggestion', text: 'Generate report' });
    }

    return actions;
  }

  async getAssistantMetrics() {
    try {
      const learningData = await this.conversationMemory.getAILearningData(50);
      const automationMetrics = await this.workflowAutomation.getAutomationMetrics();
      
      return {
        totalInteractions: learningData.length,
        averageSuccessRating: learningData.reduce((sum, item) => sum + item.success_rating, 0) / learningData.length,
        automationMetrics: automationMetrics,
        capabilities: this.moduleCapabilities
      };
    } catch (error) {
      console.error('Failed to get assistant metrics:', error);
      return { error: 'Metrics unavailable' };
    }
  }
}

export default IntelligentAssistant;