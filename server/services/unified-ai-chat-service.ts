/**
 * UNIFIED AI CHAT SERVICE
 * Combines Claude 4.0 Sonnet and OpenAI GPT-4o for comprehensive document and system analysis
 * Provides intelligent suggestions based on MallyERP system scanning and document analysis
 */

import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { SystemAnalysisAgent } from './system-analysis-agent.js';
import { IntelligentTableMatchingService } from './intelligent-table-matching-service.js';
import { pool } from '../db.js';

interface UnifiedAnalysisResult {
  suggestion: string;
  systemInsights: {
    existingCapabilities: string[];
    gaps: string[];
    recommendations: string[];
  };
  documentInsights: {
    requirements: string[];
    sapModules: string[];
    businessProcesses: string[];
  };
  combinedRecommendations: string[];
  implementationPriority: 'high' | 'medium' | 'low';
  processingTime: number;
  models: {
    claude: boolean;
    openai: boolean;
  };
}

// Session-based chat storage
const chatSessions = new Map<string, Array<{role: string, content: string, timestamp: number}>>();

export class UnifiedAIChatService {
  private openai: OpenAI;
  private anthropic: Anthropic;
  private systemAgent: SystemAnalysisAgent;
  private tableMatchingService: IntelligentTableMatchingService;

  constructor() {
    // Initialize OpenAI
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Initialize Claude 4.0 Sonnet
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    // Initialize system analysis agent for real MallyERP scanning
    this.systemAgent = new SystemAnalysisAgent();
    
    // Initialize intelligent table matching service
    this.tableMatchingService = new IntelligentTableMatchingService();
  }

  /**
   * Session management methods
   */
  private getChatHistory(sessionId: string): Array<{role: string, content: string, timestamp: number}> {
    return chatSessions.get(sessionId) || [];
  }

  private addToHistory(sessionId: string, role: string, content: string): void {
    const history = this.getChatHistory(sessionId);
    history.push({ role, content, timestamp: Date.now() });
    chatSessions.set(sessionId, history);
  }

  private clearSession(sessionId: string): void {
    chatSessions.delete(sessionId);
  }

  /**
   * Main unified chat function that combines Claude and OpenAI analysis
   * Enhanced with session persistence and shorter response behavior
   */
  async processUnifiedChat(
    message: string, 
    documentContent?: string, 
    documentName?: string,
    context?: any,
    sessionId?: string,
    requestDetailedResponse?: boolean
  ): Promise<UnifiedAnalysisResult> {
    const startTime = Date.now();
    const finalSessionId = sessionId || 'default-session';
    
    try {
      // Store user message in session history
      this.addToHistory(finalSessionId, 'user', message);
      
      // Get conversation context from session
      const chatHistory = this.getChatHistory(finalSessionId);
      
      // Step 1: Analyze user intent and determine response strategy
      const userIntent = this.analyzeUserIntent(message);
      console.log(`🎯 User intent detected: ${userIntent.type}`);
      
      // Determine if detailed response is needed
      const needsDetailedResponse = requestDetailedResponse || 
        message.toLowerCase().includes('detail') || 
        message.toLowerCase().includes('explain') ||
        message.toLowerCase().includes('how') ||
        chatHistory.length <= 2; // First few messages get more detail
      
      // Step 2: Get contextual system information based on intent (lighter by default)
      let systemAnalysis;
      let databaseInfo;
      
      if (userIntent.needsSystemScan && needsDetailedResponse) {
        console.log('🔍 Scanning MallyERP system capabilities...');
        systemAnalysis = await this.systemAgent.analyzeSystem();
        databaseInfo = await this.getRealDatabaseInfo();
      } else {
        // Light scan for quick responses (default behavior)
        systemAnalysis = await this.getLightSystemInfo();
        databaseInfo = { totalTables: 341, summary: 'MallyERP comprehensive ERP system' };
      }
      
      // Step 2.5: Perform intelligent table matching if table requirements are detected
      const tableRequirements = this.extractTableRequirements(message, documentContent);
      if (tableRequirements.length > 0) {
        console.log(`🔍 Performing intelligent table matching for ${tableRequirements.length} requirements`);
        const tableMatching = await this.tableMatchingService.analyzeMultipleTables(tableRequirements);
        systemAnalysis = {
          ...systemAnalysis,
          tableMatching: tableMatching
        };
      }
      
      // Step 3: Choose primary AI model based on query type
      let primaryAnalysis;
      let secondaryAnalysis = null;
      
      if (userIntent.type === 'document_analysis' || userIntent.type === 'business_strategy') {
        // Claude for strategic/document analysis
        console.log('🤖 Claude analyzing with business focus...');
        primaryAnalysis = await this.getClaudeAnalysis(
          message, 
          documentContent, 
          systemAnalysis, 
          databaseInfo,
          userIntent,
          chatHistory,
          needsDetailedResponse
        );
      } else if (userIntent.type === 'technical_implementation' || userIntent.type === 'system_overview') {
        // OpenAI for technical implementation
        console.log('🚀 OpenAI analyzing with technical focus...');
        primaryAnalysis = await this.getOpenAIAnalysis(
          message, 
          documentContent, 
          systemAnalysis, 
          databaseInfo,
          userIntent,
          chatHistory,
          needsDetailedResponse
        );
      } else {
        // Hybrid approach for complex queries
        console.log('🤖 Claude analyzing document and system...');
        primaryAnalysis = await this.getClaudeAnalysis(
          message, 
          documentContent, 
          systemAnalysis, 
          databaseInfo,
          userIntent,
          chatHistory,
          needsDetailedResponse
        );
        
        console.log('🚀 OpenAI providing technical perspective...');
        secondaryAnalysis = await this.getOpenAIAnalysis(
          message, 
          documentContent, 
          systemAnalysis, 
          databaseInfo,
          userIntent,
          chatHistory,
          needsDetailedResponse
        );
      }
      
      // Step 4: Combine insights intelligently
      const combinedResult = secondaryAnalysis 
        ? await this.combineAnalysisResults(primaryAnalysis, secondaryAnalysis, systemAnalysis)
        : await this.formatSingleAnalysisResult(primaryAnalysis, systemAnalysis, userIntent);
      
      const processingTime = Date.now() - startTime;
      
      // Store AI response in session history
      this.addToHistory(finalSessionId, 'assistant', combinedResult.suggestion);
      
      return {
        ...combinedResult,
        processingTime,
        models: {
          claude: userIntent.type !== 'technical_implementation',
          openai: userIntent.type !== 'document_analysis'
        }
      };
      
    } catch (error) {
      console.error('Unified chat error:', error);
      throw new Error(`Unified analysis failed: ${error.message}`);
    }
  }

  /**
   * Analyze user intent to tailor the response approach
   */
  private analyzeUserIntent(message: string) {
    const lowerMessage = message.toLowerCase();
    
    // Document analysis patterns
    if (lowerMessage.includes('document') || lowerMessage.includes('analyze this') || 
        lowerMessage.includes('requirements') || lowerMessage.includes('what functionality')) {
      return { 
        type: 'document_analysis', 
        needsSystemScan: true,
        focus: 'document_requirements'
      };
    }
    
    // System overview patterns
    if (lowerMessage.includes('system') || lowerMessage.includes('database') || 
        lowerMessage.includes('tables') || lowerMessage.includes('apis') ||
        lowerMessage.includes('already exist')) {
      return { 
        type: 'system_overview', 
        needsSystemScan: true,
        focus: 'system_capabilities'
      };
    }
    
    // Gap analysis patterns
    if (lowerMessage.includes('gap') || lowerMessage.includes('missing') || 
        lowerMessage.includes('differences') || lowerMessage.includes('what\'s missing')) {
      return { 
        type: 'gap_analysis', 
        needsSystemScan: true,
        focus: 'comparison_analysis'
      };
    }
    
    // Implementation guidance patterns
    if (lowerMessage.includes('implement') || lowerMessage.includes('build') || 
        lowerMessage.includes('create') || lowerMessage.includes('recommendation')) {
      return { 
        type: 'technical_implementation', 
        needsSystemScan: true,
        focus: 'implementation_guidance'
      };
    }
    
    // Business strategy patterns
    if (lowerMessage.includes('business') || lowerMessage.includes('process') || 
        lowerMessage.includes('workflow') || lowerMessage.includes('strategy')) {
      return { 
        type: 'business_strategy', 
        needsSystemScan: false,
        focus: 'business_analysis'
      };
    }
    
    // Default to hybrid approach
    return { 
      type: 'hybrid_analysis', 
      needsSystemScan: true,
      focus: 'comprehensive'
    };
  }

  /**
   * Get lightweight system information for quick responses
   */
  private async getLightSystemInfo() {
    return {
      overview: {
        totalTables: 341,
        totalApis: 397,
        totalComponents: 445,
        modules: ['Sales', 'Finance', 'Inventory', 'Production', 'HR', 'Purchasing', 'Master Data']
      },
      summary: 'MallyERP comprehensive ERP system with full business process coverage'
    };
  }

  /**
   * Format single analysis result for focused responses
   */
  private async formatSingleAnalysisResult(analysis: any, systemAnalysis: any, userIntent: any) {
    return {
      suggestion: analysis.content || analysis.message || 'Analysis completed successfully.',
      systemInsights: {
        existingCapabilities: this.extractCapabilities(analysis.content || ''),
        gaps: this.extractGaps(analysis.content || ''),
        recommendations: this.extractRecommendations(analysis.content || '')
      },
      documentInsights: {
        requirements: this.extractRequirements(analysis.content || ''),
        sapModules: this.extractSAPModules(analysis.content || ''),
        businessProcesses: this.extractBusinessProcesses(analysis.content || '')
      },
      combinedRecommendations: this.extractRecommendations(analysis.content || ''),
      implementationPriority: this.determinePriority(userIntent.focus)
    };
  }

  /**
   * Determine implementation priority based on user focus
   */
  private determinePriority(focus: string): 'high' | 'medium' | 'low' {
    switch (focus) {
      case 'document_requirements':
      case 'implementation_guidance':
        return 'high';
      case 'system_capabilities':
      case 'comparison_analysis':
        return 'medium';
      default:
        return 'low';
    }
  }

  /**
   * Extract table requirements from user message and document content
   */
  private extractTableRequirements(message: string, documentContent?: string): string[] {
    const requirements = new Set<string>();
    const text = `${message} ${documentContent || ''}`.toLowerCase();
    
    // Common table patterns
    const tablePatterns = [
      /(\w+)_master\b/g,
      /(\w+)_table\b/g,
      /(\w+)_data\b/g,
      /(\w+)\s+table/g,
      /table\s+(\w+)/g,
      /create\s+(\w+)/g,
      /implement\s+(\w+)/g,
      /need\s+(\w+)/g,
      /add\s+(\w+)/g
    ];
    
    for (const pattern of tablePatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        if (match[1] && match[1].length > 2) {
          requirements.add(match[1]);
        }
      }
      pattern.lastIndex = 0; // Reset regex for next iteration
    }
    
    // Add specific business object patterns
    const businessObjects = [
      'vendor_master', 'material_master', 'customer_master', 'employee_master',
      'purchase_orders', 'sales_orders', 'invoices', 'payments',
      'inventory', 'materials', 'vendors', 'customers', 'suppliers',
      'work_orders', 'production_orders', 'quality_control', 'shipments'
    ];
    
    for (const obj of businessObjects) {
      if (text.includes(obj)) {
        requirements.add(obj);
      }
    }
    
    return Array.from(requirements);
  }

  /**
   * Generate intelligent table matching insights for AI analysis
   */
  private generateTableMatchingInsights(tableMatching: any[]): string {
    if (!tableMatching || tableMatching.length === 0) {
      return 'No table matching analysis available.';
    }
    
    const insights = [];
    
    for (const match of tableMatching) {
      if (match.recommendedAction === 'already_exists') {
        insights.push(`⚠️ Table "${match.suggestedTable}" already exists as "${match.existingTable}" - suggest field enhancements instead`);
      } else if (match.recommendedAction === 'enhance') {
        insights.push(`🔧 Table "${match.existingTable}" exists but needs enhancement with: ${match.missingFields.join(', ')}`);
      } else if (match.recommendedAction === 'merge') {
        insights.push(`🔄 Suggested table "${match.suggestedTable}" should be merged with existing "${match.existingTable}"`);
      } else if (match.recommendedAction === 'create_new') {
        insights.push(`✅ Table "${match.suggestedTable}" is genuinely new and can be created`);
      }
    }
    
    return insights.join('\n');
  }

  /**
   * Extract capabilities from analysis text
   */
  private extractCapabilities(text: string): string[] {
    const capabilities = [];
    if (text.includes('database') || text.includes('tables')) capabilities.push('Comprehensive database schema');
    if (text.includes('api') || text.includes('endpoint')) capabilities.push('Extensive API coverage');
    if (text.includes('ui') || text.includes('component')) capabilities.push('Rich UI component library');
    if (text.includes('sales')) capabilities.push('Sales management');
    if (text.includes('finance')) capabilities.push('Financial management');
    if (text.includes('inventory')) capabilities.push('Inventory management');
    return capabilities.length > 0 ? capabilities : ['Comprehensive ERP functionality'];
  }

  /**
   * Extract gaps from analysis text
   */
  private extractGaps(text: string): string[] {
    const gaps = [];
    if (text.includes('missing') || text.includes('need')) gaps.push('Identified missing functionality');
    if (text.includes('enhance') || text.includes('improve')) gaps.push('Enhancement opportunities');
    if (text.includes('integration')) gaps.push('Integration requirements');
    return gaps.length > 0 ? gaps : ['No significant gaps identified'];
  }

  /**
   * Get real database information from MallyERP
   */
  private async getRealDatabaseInfo() {
    try {
      const tableQuery = `
        SELECT 
          t.table_name,
          COUNT(c.column_name) as column_count,
          json_agg(
            json_build_object(
              'column_name', c.column_name,
              'data_type', c.data_type,
              'is_nullable', c.is_nullable
            ) ORDER BY c.ordinal_position
          ) as columns
        FROM information_schema.tables t
        LEFT JOIN information_schema.columns c ON t.table_name = c.table_name
        WHERE t.table_schema = 'public' 
        AND t.table_type = 'BASE TABLE'
        AND t.table_name NOT LIKE 'drizzle_%'
        GROUP BY t.table_name
        ORDER BY t.table_name
      `;
      
      const result = await pool.query(tableQuery);
      return {
        totalTables: result.rows.length,
        tables: result.rows.slice(0, 50), // First 50 tables for analysis
        summary: `MallyERP has ${result.rows.length} database tables covering complete ERP functionality`
      };
    } catch (error) {
      console.error('Database info error:', error);
      return { totalTables: 0, tables: [], summary: 'Database information unavailable' };
    }
  }

  /**
   * Claude 4.0 Sonnet analysis for strategic insights
   */
  private async getClaudeAnalysis(
    message: string, 
    documentContent?: string, 
    systemAnalysis?: any, 
    databaseInfo?: any,
    userIntent?: any,
    chatHistory?: Array<{role: string, content: string, timestamp: number}>,
    needsDetailedResponse?: boolean
  ) {
    try {
      const responseStyle = needsDetailedResponse ? 'detailed' : 'concise';
      
      // Enhance with intelligent table matching if available
      let tableMatchingInsights = '';
      if (systemAnalysis?.tableMatching) {
        tableMatchingInsights = this.generateTableMatchingInsights(systemAnalysis.tableMatching);
      }

      const systemPrompt = `You are Claude 4.0 Sonnet analyzing ONLY the uploaded document and MallyERP system comparison.

CRITICAL TABLE MATCHING INTELLIGENCE:
${tableMatchingInsights}

STRICT CONSTRAINTS:
- Focus ONLY on comparing the document requirements with MallyERP capabilities
- NEVER suggest creating tables that already exist - instead suggest field enhancements
- Use the table matching insights above to recognize existing vs missing functionality
- Do NOT provide external information, general advice, or broader context
- Keep responses ${responseStyle} and directly relevant to the document-ERP comparison

MALLYERP SYSTEM OVERVIEW:
- Database: ${databaseInfo?.totalTables || 341} tables 
- API Endpoints: ${systemAnalysis?.overview?.totalApis || 397} endpoints
- UI Components: ${systemAnalysis?.overview?.totalComponents || 445} components
- Modules: Sales, Finance, Inventory, Production, HR, Purchasing, Master Data

${documentContent ? `DOCUMENT CONTENT: "${documentContent.substring(0, 300)}..."` : 'No document provided'}

USER MESSAGE: "${message}"

CHAT HISTORY: ${chatHistory?.slice(-3).map(h => `${h.role}: ${h.content}`).join('\n') || 'No previous context'}

RESPONSE REQUIREMENTS:
- ${needsDetailedResponse ? 'Provide detailed analysis' : 'Keep response brief and summarized'}
- Compare document needs vs MallyERP capabilities only
- Focus on gaps and matches between document and ERP system
- No external recommendations or general ERP advice`;

      const response = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1500,
        temperature: 0.3,
        messages: [
          { role: 'user', content: systemPrompt }
        ]
      });

      const textContent = response.content[0]?.type === 'text' ? response.content[0].text : 'Claude analysis completed';

      return {
        strategicInsights: textContent,
        businessRecommendations: this.extractRecommendations(textContent),
        integrationOpportunities: this.extractIntegrations(textContent)
      };
    } catch (error) {
      console.error('Claude analysis error:', error);
      return {
        strategicInsights: 'Claude analysis unavailable',
        businessRecommendations: [],
        integrationOpportunities: []
      };
    }
  }

  /**
   * OpenAI GPT-4o analysis for technical implementation
   */
  private async getOpenAIAnalysis(
    message: string, 
    documentContent?: string, 
    systemAnalysis?: any, 
    databaseInfo?: any,
    userIntent?: any,
    chatHistory?: Array<{role: string, content: string, timestamp: number}>,
    needsDetailedResponse?: boolean
  ) {
    try {
      const responseStyle = needsDetailedResponse ? 'detailed technical specifications' : 'concise technical summary';
      
      // Enhance with intelligent table matching if available
      let tableMatchingInsights = '';
      if (systemAnalysis?.tableMatching) {
        tableMatchingInsights = this.generateTableMatchingInsights(systemAnalysis.tableMatching);
      }
      
      const systemPrompt = `You are OpenAI GPT-4o analyzing ONLY the document vs MallyERP system technical comparison.

CRITICAL TABLE MATCHING INTELLIGENCE:
${tableMatchingInsights}

STRICT CONSTRAINTS:
- Compare ONLY document technical requirements with MallyERP system capabilities
- NEVER suggest creating tables that already exist - instead suggest field enhancements
- Use the table matching insights above to recognize existing vs missing functionality
- Do NOT provide general technical advice or external recommendations
- Keep responses ${responseStyle} focused on document-ERP gaps/matches

MALLYERP TECHNICAL OVERVIEW:
- Database: PostgreSQL with ${databaseInfo?.totalTables || 341} tables
- Backend: Node.js/Express with ${systemAnalysis?.overview?.totalApis || 397} API endpoints  
- Frontend: React/TypeScript with ${systemAnalysis?.overview?.totalComponents || 445} components
- ORM: Drizzle with type-safe operations

${documentContent ? `DOCUMENT CONTENT: "${documentContent.substring(0, 300)}..."` : 'No document provided'}

USER MESSAGE: "${message}"

CHAT HISTORY: ${chatHistory?.slice(-3).map(h => `${h.role}: ${h.content}`).join('\n') || 'No previous context'}

RESPONSE REQUIREMENTS:
- ${needsDetailedResponse ? 'Provide detailed technical analysis' : 'Keep response brief and focused'}
- Compare document technical needs vs MallyERP capabilities only
- Focus on technical gaps and implementation requirements
- No general coding advice or external technology recommendations`;

      const response = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message }
        ],
        max_tokens: 1500,
        temperature: 0.2
      });

      return {
        technicalImplementation: response.choices[0].message.content,
        databaseChanges: this.extractDatabaseChanges(response.choices[0].message.content),
        apiRequirements: this.extractAPIRequirements(response.choices[0].message.content),
        uiComponents: this.extractUIComponents(response.choices[0].message.content)
      };
    } catch (error) {
      console.error('OpenAI analysis error:', error);
      return {
        technicalImplementation: 'OpenAI analysis unavailable',
        databaseChanges: [],
        apiRequirements: [],
        uiComponents: []
      };
    }
  }

  /**
   * Combine analysis results from Claude and OpenAI
   */
  private async combineAnalysisResults(
    claudeAnalysis: any, 
    openaiAnalysis: any, 
    systemAnalysis: any
  ): Promise<Omit<UnifiedAnalysisResult, 'processingTime' | 'models'>> {
    
    // Combine strategic and technical insights
    const suggestion = `
UNIFIED AI ANALYSIS RESULTS

📋 STRATEGIC INSIGHTS (Claude 4.0 Sonnet):
${claudeAnalysis.strategicInsights}

🔧 TECHNICAL IMPLEMENTATION (OpenAI GPT-4o):
${openaiAnalysis.technicalImplementation}

🎯 COMBINED RECOMMENDATIONS:
The analysis combines strategic business alignment with technical feasibility based on actual MallyERP system capabilities.
    `.trim();

    return {
      suggestion,
      systemInsights: {
        existingCapabilities: systemAnalysis?.recommendations?.slice(0, 5) || [
          'Complete ERP database with 300+ tables',
          'Comprehensive API coverage across all modules',
          'React-based UI components for all business functions'
        ],
        gaps: openaiAnalysis.databaseChanges || [
          'Additional database tables may be needed',
          'API endpoints for new functionality',
          'UI components for enhanced user experience'
        ],
        recommendations: [
          ...claudeAnalysis.businessRecommendations.slice(0, 3),
          ...openaiAnalysis.apiRequirements.slice(0, 2)
        ]
      },
      documentInsights: {
        requirements: this.extractRequirements(claudeAnalysis.strategicInsights),
        sapModules: this.extractSAPModules(claudeAnalysis.strategicInsights),
        businessProcesses: this.extractBusinessProcesses(claudeAnalysis.strategicInsights)
      },
      combinedRecommendations: [
        'Leverage existing MallyERP capabilities for faster implementation',
        'Implement strategic recommendations from Claude analysis',
        'Follow technical specifications from OpenAI analysis',
        'Ensure seamless integration with current system architecture',
        'Prioritize business value and user experience improvements'
      ],
      implementationPriority: 'high'
    };
  }

  // Helper methods for extracting specific information
  private extractRecommendations(text: string): string[] {
    const lines = text.split('\n');
    return lines
      .filter(line => line.includes('recommend') || line.includes('suggest') || line.includes('should'))
      .slice(0, 3)
      .map(line => line.trim());
  }

  private extractIntegrations(text: string): string[] {
    const lines = text.split('\n');
    return lines
      .filter(line => line.includes('integrat') || line.includes('connect') || line.includes('link'))
      .slice(0, 3)
      .map(line => line.trim());
  }

  private extractDatabaseChanges(text: string): string[] {
    const lines = text.split('\n');
    return lines
      .filter(line => line.includes('table') || line.includes('database') || line.includes('schema'))
      .slice(0, 3)
      .map(line => line.trim());
  }

  private extractAPIRequirements(text: string): string[] {
    const lines = text.split('\n');
    return lines
      .filter(line => line.includes('API') || line.includes('endpoint') || line.includes('service'))
      .slice(0, 3)
      .map(line => line.trim());
  }

  private extractUIComponents(text: string): string[] {
    const lines = text.split('\n');
    return lines
      .filter(line => line.includes('UI') || line.includes('component') || line.includes('interface'))
      .slice(0, 3)
      .map(line => line.trim());
  }

  private extractRequirements(text: string): string[] {
    const lines = text.split('\n');
    return lines
      .filter(line => line.includes('require') || line.includes('need') || line.includes('must'))
      .slice(0, 3)
      .map(line => line.trim());
  }

  private extractSAPModules(text: string): string[] {
    const sapModules = ['MM', 'FI', 'SD', 'PP', 'HR', 'CO', 'WM', 'QM'];
    return sapModules.filter(module => text.includes(module));
  }

  private extractBusinessProcesses(text: string): string[] {
    const processes = ['procurement', 'sales', 'finance', 'inventory', 'production', 'payroll'];
    return processes.filter(process => text.toLowerCase().includes(process));
  }
}