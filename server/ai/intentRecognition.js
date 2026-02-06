/**
 * Advanced Intent Recognition Engine for MallyERP AI
 * Understands complex business queries and extracts actionable intents
 */

import OpenAI from "openai";

class IntentRecognition {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 30000
    });
    
    // ERP-specific intents and entities
    this.businessIntents = {
      // Navigation intents
      'navigate': ['go to', 'open', 'show me', 'take me to', 'navigate to', 'visit'],
      'search': ['find', 'search', 'look for', 'locate', 'where is'],
      
      // Data operations
      'create': ['create', 'add', 'new', 'make', 'generate', 'insert'],
      'read': ['show', 'display', 'list', 'view', 'get', 'fetch'],
      'update': ['update', 'modify', 'change', 'edit', 'alter'],
      'delete': ['delete', 'remove', 'cancel', 'deactivate'],
      
      // Business processes
      'approve': ['approve', 'authorize', 'confirm', 'accept'],
      'reject': ['reject', 'deny', 'decline', 'refuse'],
      'calculate': ['calculate', 'compute', 'total', 'sum'],
      'analyze': ['analyze', 'report', 'review', 'assess'],
      'forecast': ['forecast', 'predict', 'estimate', 'project']
    };
    
    this.businessEntities = {
      // Master data
      'customer': ['customer', 'client', 'buyer', 'account'],
      'vendor': ['vendor', 'supplier', 'partner'],
      'material': ['material', 'product', 'item', 'part'],
      'employee': ['employee', 'staff', 'worker', 'person'],
      
      // Transactions
      'order': ['order', 'purchase order', 'sales order'],
      'invoice': ['invoice', 'bill', 'receipt'],
      'payment': ['payment', 'transaction', 'settlement'],
      'delivery': ['delivery', 'shipment', 'dispatch'],
      
      // Processes
      'production': ['production', 'manufacturing', 'assembly'],
      'inventory': ['inventory', 'stock', 'warehouse'],
      'finance': ['finance', 'accounting', 'budget'],
      'quality': ['quality', 'inspection', 'testing']
    };
  }

  async recognizeIntent(userInput) {
    try {
      // Use OpenAI for advanced intent recognition
      const systemPrompt = `You are an ERP AI assistant specializing in business intent recognition. 
      
      Analyze the user input and return a JSON response with:
      {
        "intent": "primary_action",
        "entities": ["business_objects"],
        "module": "target_module", 
        "confidence": 0.95,
        "parameters": {"key": "value"},
        "isComplex": false,
        "requiresClarification": false,
        "suggestedActions": ["action1", "action2"]
      }
      
      Business modules: sales, finance, inventory, production, purchasing, hr, controlling, master-data, reports
      Common intents: navigate, create, read, update, delete, search, analyze, approve, calculate
      
      Always prioritize business context and ERP workflows.`;

      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userInput }
        ],
        max_tokens: 500,
        temperature: 0.1
      });

      const aiAnalysis = JSON.parse(response.choices[0].message.content);
      
      // Enhance with local pattern matching
      const localAnalysis = this.localIntentAnalysis(userInput);
      
      // Combine AI and local analysis
      return {
        ...aiAnalysis,
        localPatterns: localAnalysis,
        timestamp: new Date().toISOString(),
        originalInput: userInput
      };
      
    } catch (error) {
      console.error('AI intent recognition failed:', error);
      return this.fallbackIntentRecognition(userInput);
    }
  }

  localIntentAnalysis(userInput) {
    const input = userInput.toLowerCase();
    const result = {
      detectedIntents: [],
      detectedEntities: [],
      confidence: 0,
      patterns: []
    };

    // Intent matching
    for (const [intent, patterns] of Object.entries(this.businessIntents)) {
      const matches = patterns.filter(pattern => input.includes(pattern));
      if (matches.length > 0) {
        result.detectedIntents.push({
          intent,
          matches,
          confidence: matches.length / patterns.length
        });
      }
    }

    // Entity matching
    for (const [entity, patterns] of Object.entries(this.businessEntities)) {
      const matches = patterns.filter(pattern => input.includes(pattern));
      if (matches.length > 0) {
        result.detectedEntities.push({
          entity,
          matches,
          confidence: matches.length / patterns.length
        });
      }
    }

    // Calculate overall confidence
    if (result.detectedIntents.length > 0 && result.detectedEntities.length > 0) {
      result.confidence = 0.8;
    } else if (result.detectedIntents.length > 0 || result.detectedEntities.length > 0) {
      result.confidence = 0.6;
    } else {
      result.confidence = 0.2;
    }

    return result;
  }

  fallbackIntentRecognition(userInput) {
    const localAnalysis = this.localIntentAnalysis(userInput);
    
    let primaryIntent = 'help';
    let targetModule = 'general';
    let entities = [];

    if (localAnalysis.detectedIntents.length > 0) {
      primaryIntent = localAnalysis.detectedIntents[0].intent;
    }

    if (localAnalysis.detectedEntities.length > 0) {
      entities = localAnalysis.detectedEntities.map(e => e.entity);
      
      // Map entities to modules
      const entityModuleMap = {
        'customer': 'sales',
        'vendor': 'purchasing', 
        'material': 'inventory',
        'employee': 'hr',
        'order': 'sales',
        'invoice': 'finance',
        'production': 'production'
      };
      
      const entity = entities[0];
      targetModule = entityModuleMap[entity] || 'general';
    }

    return {
      intent: primaryIntent,
      entities,
      module: targetModule,
      confidence: localAnalysis.confidence,
      parameters: {},
      isComplex: false,
      requiresClarification: localAnalysis.confidence < 0.6,
      suggestedActions: this.getSuggestedActions(primaryIntent, entities),
      localPatterns: localAnalysis,
      timestamp: new Date().toISOString(),
      originalInput: userInput,
      fallback: true
    };
  }

  getSuggestedActions(intent, entities) {
    const actions = [];
    
    if (intent === 'navigate' && entities.length > 0) {
      actions.push(`Open ${entities[0]} management`);
      actions.push(`View ${entities[0]} list`);
    }
    
    if (intent === 'create' && entities.length > 0) {
      actions.push(`Create new ${entities[0]}`);
      actions.push(`Add ${entities[0]} record`);
    }
    
    if (intent === 'read' && entities.length > 0) {
      actions.push(`Show all ${entities[0]}s`);
      actions.push(`Display ${entities[0]} details`);
    }

    return actions;
  }

  async extractBusinessParameters(userInput, intent, entities) {
    try {
      const systemPrompt = `Extract business parameters from the user input for ERP operations.
      
      Intent: ${intent}
      Entities: ${entities.join(', ')}
      
      Return JSON with extracted parameters like:
      {
        "filters": {"status": "active", "region": "north"},
        "dateRange": {"from": "2024-01-01", "to": "2024-12-31"},
        "quantities": {"amount": 1000, "units": "pieces"},
        "identifiers": {"id": "CUST001", "code": "MAT123"},
        "attributes": {"priority": "high", "category": "electronics"}
      }`;

      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userInput }
        ],
        max_tokens: 300,
        temperature: 0.1
      });

      return JSON.parse(response.choices[0].message.content);
    } catch (error) {
      console.error('Parameter extraction failed:', error);
      return {};
    }
  }
}

export default IntentRecognition;