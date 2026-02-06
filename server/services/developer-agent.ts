/**
 * Developer Agent - Automated Code Generation and Implementation
 * Takes Designer Agent analysis and automatically generates code, creates files, and implements changes
 * Works collaboratively with Peer Review Agent for quality assurance
 */

import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { aiProviderFallback } from './ai-provider-fallback';

interface DeveloperTask {
  id: string;
  type: 'component' | 'api' | 'schema' | 'route' | 'service';
  name: string;
  description: string;
  requirements: string[];
  files: GeneratedFile[];
  status: 'pending' | 'generating' | 'generated' | 'reviewed' | 'implemented' | 'error';
  priority: 'high' | 'medium' | 'low';
}

interface GeneratedFile {
  path: string;
  content: string;
  type: 'create' | 'modify' | 'update';
  dependencies: string[];
  testCoverage?: string;
}

interface DevelopmentPlan {
  tasks: DeveloperTask[];
  implementationOrder: string[];
  estimatedComplexity: 'low' | 'medium' | 'high';
  riskAssessment: string[];
  dependencies: Record<string, string[]>;
}

export class DeveloperAgent {
  private openai: OpenAI;
  private baseDir: string;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.baseDir = process.cwd();
  }

  /**
   * Create development plan from Designer Agent analysis
   */
  async createDevelopmentPlan(designerAnalysis: any): Promise<DevelopmentPlan> {
    try {
      console.log('🔧 Developer Agent creating development plan...');

      const prompt = `You are an expert full-stack developer creating an implementation plan.

DESIGNER AGENT ANALYSIS:
${JSON.stringify(designerAnalysis, null, 2)}

Create a detailed development plan with these tasks:

1. Database Schema Changes (if needed)
2. API Endpoint Creation
3. Service Layer Implementation  
4. Frontend Component Development
5. Route Integration
6. Testing Implementation

For each task, specify:
- Exact file paths following MallyERP structure
- Implementation priority (high/medium/low)
- Dependencies between tasks
- Risk assessment

Respond in JSON format with this structure:
{
  "tasks": [
    {
      "id": "unique_task_id",
      "type": "component|api|schema|route|service",
      "name": "Task Name",
      "description": "Detailed description",
      "requirements": ["requirement1", "requirement2"],
      "files": [
        {
          "path": "relative/path/to/file.ts",
          "type": "create|modify|update",
          "dependencies": ["dependency1", "dependency2"]
        }
      ],
      "priority": "high|medium|low"
    }
  ],
  "implementationOrder": ["task_id_1", "task_id_2"],
  "estimatedComplexity": "low|medium|high",
  "riskAssessment": ["risk1", "risk2"],
  "dependencies": {
    "task_id": ["dependency_task_id"]
  }
}`;

      const response = await aiProviderFallback.generateCompletion(
        [{ role: 'user', content: prompt }],
        { model: 'gpt-4o' }
      );

      const plan = JSON.parse(response.content);
      
      // Initialize all tasks as pending
      plan.tasks.forEach(task => {
        task.status = 'pending';
        task.files = task.files.map(file => ({
          ...file,
          content: '', // Will be generated later
          dependencies: file.dependencies || []
        }));
      });

      console.log(`✅ Development plan created with ${plan.tasks.length} tasks`);
      return plan;

    } catch (error) {
      console.error('❌ Error creating development plan:', error);
      throw new Error(`Development planning failed: ${error.message}`);
    }
  }

  /**
   * Generate code for a specific task
   */
  async generateCode(task: DeveloperTask, existingCode?: string): Promise<DeveloperTask> {
    try {
      console.log(`🔧 Generating code for task: ${task.name}`);
      task.status = 'generating';

      for (const file of task.files) {
        const codeContent = await this.generateFileContent(task, file, existingCode);
        file.content = codeContent;
      }

      task.status = 'generated';
      console.log(`✅ Code generated for task: ${task.name}`);
      return task;

    } catch (error) {
      console.error(`❌ Error generating code for task ${task.name}:`, error);
      task.status = 'error';
      throw error;
    }
  }

  /**
   * Generate content for a specific file
   */
  private async generateFileContent(task: DeveloperTask, file: GeneratedFile, existingCode?: string): Promise<string> {
    const isTypeScript = file.path.endsWith('.ts') || file.path.endsWith('.tsx');
    const isComponent = file.path.includes('components') || file.path.includes('pages');
    const isAPI = file.path.includes('routes') || file.path.includes('api');
    const isService = file.path.includes('services');
    const isSchema = file.path.includes('schema');

    let prompt = `You are an expert developer implementing MallyERP functionality.

TASK: ${task.name}
DESCRIPTION: ${task.description}
REQUIREMENTS: ${task.requirements.join(', ')}
FILE: ${file.path}
FILE TYPE: ${file.type}

`;

    if (existingCode) {
      prompt += `EXISTING CODE TO MODIFY:
\`\`\`
${existingCode}
\`\`\`

`;
    }

    // Add specific instructions based on file type
    if (isComponent) {
      prompt += `Generate a React TypeScript component following MallyERP patterns:
- Use shadcn/ui components (@/components/ui/*)
- Implement proper TypeScript interfaces
- Use React Query for data fetching
- Include proper error handling and loading states
- Follow existing component structure
- Use Lucide React icons
- Implement responsive design with Tailwind CSS

`;
    } else if (isAPI) {
      prompt += `Generate Express.js API routes following MallyERP patterns:
- Use proper TypeScript types from shared/schema.ts
- Implement comprehensive error handling
- Use database queries with Drizzle ORM
- Include proper validation
- Follow existing API patterns
- Add appropriate HTTP status codes

`;
    } else if (isService) {
      prompt += `Generate a service class following MallyERP patterns:
- Use proper TypeScript interfaces
- Implement comprehensive error handling
- Include proper logging
- Follow existing service patterns
- Add proper documentation

`;
    } else if (isSchema) {
      prompt += `Generate Drizzle ORM schema following MallyERP patterns:
- Use proper Drizzle schema syntax
- Include proper relationships
- Add appropriate constraints
- Follow existing schema patterns
- Include Zod validation schemas

`;
    }

    prompt += `
IMPORTANT REQUIREMENTS:
1. Follow MallyERP coding standards and patterns
2. Use existing imports and dependencies where possible
3. Implement proper error handling
4. Add comprehensive TypeScript types
5. Include proper documentation
6. Ensure code is production-ready
7. Follow security best practices

Generate ONLY the code content, no explanations or markdown formatting.`;

    const response = await aiProviderFallback.generateCompletion(
      [{ role: 'user', content: prompt }],
      { model: 'gpt-4o', maxTokens: 3000 }
    );

    return response.content;
  }

  /**
   * Implement generated code (write files to filesystem)
   */
  async implementCode(task: DeveloperTask, dryRun: boolean = true): Promise<{ success: boolean; changes: string[] }> {
    const changes: string[] = [];
    
    try {
      console.log(`🚀 ${dryRun ? 'Simulating' : 'Implementing'} code for task: ${task.name}`);

      for (const file of task.files) {
        const fullPath = path.join(this.baseDir, file.path);
        const dir = path.dirname(fullPath);

        if (file.type === 'create') {
          if (!dryRun) {
            // Ensure directory exists
            if (!fs.existsSync(dir)) {
              fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(fullPath, file.content, 'utf8');
          }
          changes.push(`CREATE: ${file.path}`);
          
        } else if (file.type === 'modify' || file.type === 'update') {
          if (fs.existsSync(fullPath)) {
            if (!dryRun) {
              // Create backup
              const backupPath = `${fullPath}.backup.${Date.now()}`;
              fs.copyFileSync(fullPath, backupPath);
              fs.writeFileSync(fullPath, file.content, 'utf8');
            }
            changes.push(`MODIFY: ${file.path}`);
          } else {
            changes.push(`CREATE: ${file.path} (file didn't exist)`);
            if (!dryRun) {
              if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
              }
              fs.writeFileSync(fullPath, file.content, 'utf8');
            }
          }
        }
      }

      if (!dryRun) {
        task.status = 'implemented';
      }

      console.log(`✅ ${dryRun ? 'Simulation' : 'Implementation'} completed for task: ${task.name}`);
      return { success: true, changes };

    } catch (error) {
      console.error(`❌ Error ${dryRun ? 'simulating' : 'implementing'} task ${task.name}:`, error);
      return { success: false, changes };
    }
  }

  /**
   * Get current system context for better code generation
   */
  async getSystemContext(): Promise<any> {
    try {
      // Scan existing components, services, and API routes
      const context = {
        components: this.scanDirectory('client/src/components'),
        pages: this.scanDirectory('client/src/pages'),
        services: this.scanDirectory('server/services'),
        routes: this.scanDirectory('server/routes'),
        schemas: this.scanDirectory('shared')
      };

      return context;
    } catch (error) {
      console.error('Error getting system context:', error);
      return {};
    }
  }

  private scanDirectory(dirPath: string): string[] {
    try {
      const fullPath = path.join(this.baseDir, dirPath);
      if (!fs.existsSync(fullPath)) return [];

      return fs.readdirSync(fullPath)
        .filter(file => file.endsWith('.ts') || file.endsWith('.tsx'))
        .map(file => path.join(dirPath, file));
    } catch (error) {
      return [];
    }
  }
}