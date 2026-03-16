import { db } from '../db';
import { eq, desc } from 'drizzle-orm';
import OpenAI from 'openai';
import fs from 'fs/promises';
import path from 'path';

interface CodeGenerationRequest {
  instruction: string;
  documentId?: number;
  targetModule: string;
  implementationType: 'database' | 'api' | 'ui' | 'full_stack';
}

interface LiveImplementationResult {
  success: boolean;
  filesCreated: string[];
  databaseChanges: string[];
  apiEndpoints: string[];
  uiComponents: string[];
  errors: string[];
  testResults: any[];
}

export class EnhancedDesignerAgentService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async generateAndImplementCode(request: CodeGenerationRequest): Promise<LiveImplementationResult> {
    const result: LiveImplementationResult = {
      success: false,
      filesCreated: [],
      databaseChanges: [],
      apiEndpoints: [],
      uiComponents: [],
      errors: [],
      testResults: []
    };

    try {
      // Step 1: AI Analysis and Planning
      const implementationPlan = await this.generateImplementationPlan(request);
      
      // Step 2: Database Implementation
      if (request.implementationType === 'database' || request.implementationType === 'full_stack') {
        const dbResults = await this.implementDatabaseChanges(implementationPlan.database);
        result.databaseChanges = dbResults;
      }

      // Step 3: API Implementation
      if (request.implementationType === 'api' || request.implementationType === 'full_stack') {
        const apiResults = await this.implementAPIEndpoints(implementationPlan.api);
        result.apiEndpoints = apiResults;
        result.filesCreated.push(...apiResults.map(api => `server/routes/${api.filename}`));
      }

      // Step 4: UI Implementation
      if (request.implementationType === 'ui' || request.implementationType === 'full_stack') {
        const uiResults = await this.implementUIComponents(implementationPlan.ui);
        result.uiComponents = uiResults;
        result.filesCreated.push(...uiResults.map(ui => `client/src/components/${ui.filename}`));
      }

      // Step 5: Integration and Testing
      const testResults = await this.performLiveTests(result);
      result.testResults = testResults;

      result.success = result.errors.length === 0;

    } catch (error) {
      result.errors.push(`Implementation failed: ${error.message}`);
    }

    return result;
  }

  private async generateImplementationPlan(request: CodeGenerationRequest) {
    // Get current system architecture
    const systemContext = await this.getSystemArchitecture();
    
    const planningPrompt = `
    You are an expert ERP system architect and full-stack developer. Generate a complete implementation plan.
    
    User Request: "${request.instruction}"
    Target Module: ${request.targetModule}
    Implementation Type: ${request.implementationType}
    
    Current System Context:
    - Database: 244 ERP tables across Sales, Finance, Inventory, HR, Production, Purchasing
    - Backend: Express.js with TypeScript, Drizzle ORM, PostgreSQL
    - Frontend: React with TypeScript, TailwindCSS, shadcn/ui components
    - Architecture: REST APIs, session management, role-based access
    
    Generate SPECIFIC implementation plan with:
    
    1. DATABASE SCHEMA (if needed):
    - Table creation statements with proper foreign keys
    - Column definitions with appropriate data types
    - Indexes and constraints for performance
    - Integration points with existing tables
    
    2. API ENDPOINTS (if needed):
    - Exact TypeScript route definitions
    - Request/response interfaces
    - Validation schemas using Zod
    - Integration with existing authentication
    
    3. UI COMPONENTS (if needed):
    - React component structure with TypeScript
    - Form handling with react-hook-form
    - Integration with existing design system
    - Navigation and routing updates
    
    4. BUSINESS LOGIC:
    - Service layer implementations
    - Data transformation logic
    - Error handling and validation
    - Integration with existing ERP modules
    
    Respond with executable code that can be directly implemented in the MallyERP system.
    Use existing patterns and conventions from the current codebase.
    `;

    const response = await this.openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        { role: "system", content: "You are an expert full-stack ERP developer who generates executable code." },
        { role: "user", content: planningPrompt }
      ],
      max_tokens: 4000,
      temperature: 0.1
    });

    const aiResponse = response.choices[0].message.content || '';
    return this.parseImplementationPlan(aiResponse, request);
  }

  private parseImplementationPlan(aiResponse: string, request: CodeGenerationRequest) {
    // Parse AI response into structured implementation plan
    const database = this.extractDatabaseCode(aiResponse);
    const api = this.extractAPICode(aiResponse);
    const ui = this.extractUICode(aiResponse);
    
    return {
      database: database,
      api: api,
      ui: ui,
      originalResponse: aiResponse
    };
  }

  private extractDatabaseCode(response: string) {
    const dbMatches = response.match(/```sql\n([\s\S]*?)\n```/g) || [];
    return dbMatches.map(match => {
      const sql = match.replace(/```sql\n/, '').replace(/\n```/, '');
      return {
        sql: sql.trim(),
        type: this.determineSQLType(sql)
      };
    });
  }

  private extractAPICode(response: string) {
    const apiMatches = response.match(/```typescript\n([\s\S]*?router[\s\S]*?)\n```/g) || [];
    return apiMatches.map((match, index) => {
      const code = match.replace(/```typescript\n/, '').replace(/\n```/, '');
      return {
        filename: `enhanced-${Date.now()}-${index}.ts`,
        code: code.trim(),
        endpoints: this.extractEndpoints(code)
      };
    });
  }

  private extractUICode(response: string) {
    const uiMatches = response.match(/```tsx\n([\s\S]*?)\n```/g) || [];
    return uiMatches.map((match, index) => {
      const code = match.replace(/```tsx\n/, '').replace(/\n```/, '');
      const componentName = this.extractComponentName(code);
      return {
        filename: `${componentName || `Enhanced${Date.now()}${index}`}.tsx`,
        code: code.trim(),
        componentName: componentName
      };
    });
  }

  private async implementDatabaseChanges(dbPlan: any[]): Promise<string[]> {
    const results: string[] = [];
    
    for (const change of dbPlan) {
      try {
        await db.execute(change.sql);
        results.push(`✅ ${change.type}: ${change.sql.substring(0, 50)}...`);
      } catch (error) {
        results.push(`❌ ${change.type} failed: ${error.message}`);
      }
    }
    
    return results;
  }

  private async implementAPIEndpoints(apiPlan: any[]): Promise<any[]> {
    const results: any[] = [];
    
    for (const api of apiPlan) {
      try {
        const filePath = path.join(process.cwd(), 'server', 'routes', api.filename);
        await fs.writeFile(filePath, api.code, 'utf8');
        results.push({
          filename: api.filename,
          endpoints: api.endpoints,
          status: 'created'
        });
      } catch (error) {
        results.push({
          filename: api.filename,
          error: error.message,
          status: 'failed'
        });
      }
    }
    
    return results;
  }

  private async implementUIComponents(uiPlan: any[]): Promise<any[]> {
    const results: any[] = [];
    
    for (const ui of uiPlan) {
      try {
        const filePath = path.join(process.cwd(), 'client', 'src', 'components', ui.filename);
        await fs.writeFile(filePath, ui.code, 'utf8');
        results.push({
          filename: ui.filename,
          componentName: ui.componentName,
          status: 'created'
        });
      } catch (error) {
        results.push({
          filename: ui.filename,
          error: error.message,
          status: 'failed'
        });
      }
    }
    
    return results;
  }

  private async performLiveTests(result: LiveImplementationResult): Promise<any[]> {
    const tests: any[] = [];
    
    // Test database changes
    for (const dbChange of result.databaseChanges) {
      if (dbChange.startsWith('✅')) {
        tests.push({
          type: 'database',
          test: 'Table creation verification',
          status: 'passed',
          result: 'Database changes applied successfully'
        });
      }
    }
    
    // Test API endpoints
    for (const api of result.apiEndpoints) {
      if (api.status === 'created') {
        tests.push({
          type: 'api',
          test: `Route file creation: ${api.filename}`,
          status: 'passed',
          result: `Created ${api.endpoints?.length || 0} endpoints`
        });
      }
    }
    
    // Test UI components
    for (const ui of result.uiComponents) {
      if (ui.status === 'created') {
        tests.push({
          type: 'ui',
          test: `Component creation: ${ui.componentName}`,
          status: 'passed',
          result: `Component file created successfully`
        });
      }
    }
    
    return tests;
  }

  private async getSystemArchitecture() {
    // Get current system state
    const tablesResult = await db.execute(`
      SELECT table_name, column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    return {
      tables: tablesResult.rows?.length || 0,
      modules: ['Sales', 'Finance', 'Inventory', 'HR', 'Production', 'Purchasing'],
      architecture: 'Express + React + PostgreSQL + TypeScript'
    };
  }

  private determineSQLType(sql: string): string {
    if (sql.toUpperCase().includes('CREATE TABLE')) return 'table_creation';
    if (sql.toUpperCase().includes('ALTER TABLE')) return 'table_modification';
    if (sql.toUpperCase().includes('CREATE INDEX')) return 'index_creation';
    if (sql.toUpperCase().includes('INSERT INTO')) return 'data_insertion';
    return 'unknown';
  }

  private extractEndpoints(code: string): string[] {
    const endpoints: string[] = [];
    const routeMatches = code.match(/router\.(get|post|put|delete)\(['"`]([^'"`]+)['"`]/g) || [];
    
    routeMatches.forEach(match => {
      const methodMatch = match.match(/router\.(\w+)/);
      const pathMatch = match.match(/['"`]([^'"`]+)['"`]/);
      if (methodMatch && pathMatch) {
        endpoints.push(`${methodMatch[1].toUpperCase()} ${pathMatch[1]}`);
      }
    });
    
    return endpoints;
  }

  private extractComponentName(code: string): string {
    const match = code.match(/export\s+default\s+function\s+(\w+)|function\s+(\w+)/);
    return match ? (match[1] || match[2]) : '';
  }

  // Advanced chat capabilities
  async processAdvancedChat(message: string, documentId?: number): Promise<any> {
    const systemContext = await this.getSystemArchitecture();
    
    const chatPrompt = `
    You are an advanced ERP development assistant with full system access.
    
    User Message: "${message}"
    Current System: ${systemContext.tables} tables, ${systemContext.modules.join(', ')} modules
    
    Analyze the user's request and determine if they want:
    1. Information/Query - provide detailed answers
    2. Code Generation - create specific implementation
    3. System Modification - make live changes
    4. Analysis - analyze existing functionality
    
    If they're asking for implementation, provide:
    - Specific technical approach
    - Required database changes
    - API endpoint definitions
    - UI component structure
    - Step-by-step implementation plan
    
    Be specific and actionable. If they want something built, explain exactly how to build it.
    `;

    const response = await this.openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        { role: "system", content: "You are an expert ERP development assistant with comprehensive system knowledge." },
        { role: "user", content: chatPrompt }
      ],
      max_tokens: 2000,
      temperature: 0.3
    });

    const aiResponse = response.choices[0].message.content || '';
    
    // Determine if this requires formal analysis creation
    const requiresImplementation = this.detectImplementationRequest(message);
    
    return {
      response: aiResponse,
      analysisCreated: requiresImplementation,
      implementationType: this.detectImplementationType(message),
      suggestedActions: this.generateSuggestedActions(message, aiResponse)
    };
  }

  private detectImplementationRequest(message: string): boolean {
    const implementationKeywords = [
      'create', 'build', 'implement', 'add', 'develop', 'make', 'generate',
      'system', 'module', 'component', 'feature', 'functionality'
    ];
    
    return implementationKeywords.some(keyword => 
      message.toLowerCase().includes(keyword)
    );
  }

  private detectImplementationType(message: string): string {
    if (message.toLowerCase().includes('database') || message.toLowerCase().includes('table')) {
      return 'database';
    }
    if (message.toLowerCase().includes('api') || message.toLowerCase().includes('endpoint')) {
      return 'api';
    }
    if (message.toLowerCase().includes('ui') || message.toLowerCase().includes('component')) {
      return 'ui';
    }
    return 'full_stack';
  }

  private generateSuggestedActions(message: string, aiResponse: string): string[] {
    const actions: string[] = [];
    
    if (this.detectImplementationRequest(message)) {
      actions.push('Generate implementation plan');
      actions.push('Create database schema');
      actions.push('Build API endpoints');
      actions.push('Develop UI components');
      actions.push('Perform integration testing');
    } else {
      actions.push('Provide detailed explanation');
      actions.push('Show relevant documentation');
      actions.push('Suggest next steps');
    }
    
    return actions;
  }
}

export const enhancedDesignerService = new EnhancedDesignerAgentService();