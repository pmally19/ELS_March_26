import { db } from '../db';
import { eq, desc } from 'drizzle-orm';
import OpenAI from 'openai';
import fs from 'fs/promises';
import path from 'path';
import { designerDocuments, designerAnalysis } from '@shared/designer-agent-schema';
import { enhancedCompareService } from './enhanced-compare-service';
import { enhancedPreviewService } from './enhanced-preview-service';

interface DesignerWorkflowStep {
  step: number;
  name: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: any;
  error?: string;
}

interface CompleteWorkflowResult {
  success: boolean;
  steps: DesignerWorkflowStep[];
  finalResult: any;
  implementationFiles: string[];
  errors: string[];
}

export class CompleteDesignerAgent {
  private openai: OpenAI;
  private workflowSteps: DesignerWorkflowStep[] = [];

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    this.initializeWorkflow();
  }

  private initializeWorkflow() {
    this.workflowSteps = [
      { step: 1, name: 'Upload', status: 'pending' },
      { step: 2, name: 'Analysis', status: 'pending' },
      { step: 3, name: 'Compare', status: 'pending' },
      { step: 4, name: 'Preview', status: 'pending' },
      { step: 5, name: 'Changes', status: 'pending' },
      { step: 6, name: 'Final Draft', status: 'pending' },
      { step: 7, name: 'Review & Approve', status: 'pending' },
      { step: 8, name: 'Build', status: 'pending' }
    ];
  }

  async executeCompleteWorkflow(documentId: number, userInstructions?: string): Promise<CompleteWorkflowResult> {
    const result: CompleteWorkflowResult = {
      success: false,
      steps: [...this.workflowSteps],
      finalResult: null,
      implementationFiles: [],
      errors: []
    };

    try {
      // Step 1: Upload (already completed when document exists)
      result.steps[0].status = 'completed';
      result.steps[0].result = { documentId };

      // Step 2: Analysis - AI analyzes document content
      result.steps[1].status = 'processing';
      const analysisResult = await this.performDeepAnalysis(documentId);
      result.steps[1].status = 'completed';
      result.steps[1].result = analysisResult;

      // Step 3: Compare - Enhanced system comparison with integrated chat
      result.steps[2].status = 'processing';
      const compareResult = await this.performEnhancedComparison(documentId, analysisResult, userInstructions);
      result.steps[2].status = 'completed';
      result.steps[2].result = compareResult;

      // Step 4: Preview - Enhanced visual mockups with actual screenshots
      result.steps[3].status = 'processing';
      const previewResult = await this.generateEnhancedPreview(compareResult);
      result.steps[3].status = 'completed';
      result.steps[3].result = previewResult;

      // Step 5: Changes - Refine implementation
      result.steps[4].status = 'processing';
      const changesResult = await this.refineImplementation(previewResult);
      result.steps[4].status = 'completed';
      result.steps[4].result = changesResult;

      // Step 6: Final Draft - Complete technical specification
      result.steps[5].status = 'processing';
      const finalDraftResult = await this.createFinalDraft(changesResult);
      result.steps[5].status = 'completed';
      result.steps[5].result = finalDraftResult;

      // Step 7: Review & Approve - Automated quality checks
      result.steps[6].status = 'processing';
      const reviewResult = await this.performAutomatedReview(finalDraftResult);
      result.steps[6].status = 'completed';
      result.steps[6].result = reviewResult;

      // Step 8: Build - Automated code generation
      result.steps[7].status = 'processing';
      const buildResult = await this.performAutomatedBuild(reviewResult);
      result.steps[7].status = 'completed';
      result.steps[7].result = buildResult;

      result.success = true;
      result.finalResult = buildResult;
      result.implementationFiles = buildResult.filesCreated || [];

    } catch (error) {
      console.error('Complete Designer Agent workflow failed:', error);
      result.errors.push(error.message);
      
      // Mark current step as failed
      const currentStep = result.steps.find(s => s.status === 'processing');
      if (currentStep) {
        currentStep.status = 'failed';
        currentStep.error = error.message;
      }
    }

    return result;
  }

  // Step 2: Deep AI Analysis
  private async performDeepAnalysis(documentId: number) {
    const document = await db.select().from(designerDocuments).where(eq(designerDocuments.id, documentId)).limit(1);
    if (!document.length) throw new Error('Document not found');

    const doc = document[0];
    let documentContent = '';

    // Extract document content based on type
    if (doc.fileName.match(/\.(jpg|jpeg|png|gif)$/i)) {
      documentContent = await this.analyzeImageDocument(doc.fileName);
    } else if (doc.fileName.match(/\.(pdf|docx|doc|txt)$/i)) {
      documentContent = await this.extractDocumentText(doc.fileName);
    }

    // AI-powered deep analysis
    const analysisPrompt = `
    You are an expert ERP system architect analyzing a business requirement document.
    
    Document: ${doc.fileName}
    Content: ${documentContent}
    
    Perform comprehensive analysis and provide:
    
    1. BUSINESS REQUIREMENTS EXTRACTION:
    - Core business processes described
    - Data entities and relationships
    - Business rules and validations
    - Integration requirements
    
    2. TECHNICAL REQUIREMENTS:
    - Database schema needs
    - API endpoint specifications
    - UI component requirements
    - Integration points
    
    3. IMPLEMENTATION ROADMAP:
    - Priority order of development
    - Dependencies and prerequisites
    - Risk assessment
    - Effort estimation
    
    Respond with detailed JSON structure containing all analysis results.
    `;

    const response = await this.openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are an expert ERP system architect providing detailed technical analysis." },
        { role: "user", content: analysisPrompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3
    });

    const analysis = JSON.parse(response.choices[0].message.content);
    
    // Store analysis in database
    await db.insert(designerAnalysis).values({
      documentId,
      analysisType: 'deep_analysis',
      proposedTableChanges: JSON.stringify(analysis.technical_requirements?.database || {}),
      proposedUIChanges: JSON.stringify(analysis.technical_requirements?.ui || {}),
      aiRecommendations: JSON.stringify(analysis.implementation_roadmap || {}),
      status: 'completed',
      createdAt: new Date()
    });

    return analysis;
  }

  // Step 3: Enhanced System Comparison with Integrated Chat
  private async performEnhancedComparison(documentId: number, analysisResult: any, userInstructions?: string) {
    console.log('🔍 Performing enhanced system comparison...');

    // Get document content for comparison
    const document = await db.select().from(designerDocuments).where(eq(designerDocuments.id, documentId)).limit(1);
    if (!document.length) throw new Error('Document not found');

    const doc = document[0];
    let documentContent = '';
    
    // Extract document content based on type
    if (doc.fileName.match(/\.(jpg|jpeg|png|gif)$/i)) {
      documentContent = await this.analyzeImageDocument(doc.fileName);
    } else if (doc.fileName.match(/\.(pdf|docx|doc|txt)$/i)) {
      documentContent = await this.extractDocumentText(doc.fileName);
    } else {
      documentContent = `Document: ${doc.fileName} - Business requirement analysis based on file metadata and analysis results: ${JSON.stringify(analysisResult)}`;
    }

    // Perform enhanced comparison using the new service
    const { enhancedCompareService } = await import('./enhanced-compare-service');
    let comparisonResult = await enhancedCompareService.performSystemComparison(documentContent, doc.fileName);

    // Integrated Chat Determination - refine based on user instructions
    if (userInstructions && userInstructions.trim().length > 0) {
      console.log('💬 Refining comparison based on user instructions...');
      comparisonResult = await enhancedCompareService.refineRequirements(comparisonResult, userInstructions);
    }

    return {
      comparison: comparisonResult,
      documentContext: {
        fileName: doc.fileName,
        documentType: doc.documentType,
        analysisResults: analysisResult
      },
      chatRefinement: userInstructions ? 'Applied user refinements' : 'No user refinements provided'
    };
  }

  // Step 4: Enhanced Preview Generation with Screenshots
  private async generateEnhancedPreview(compareResult: any) {
    console.log('📸 Generating enhanced preview with visual mockups...');

    const { enhancedPreviewService } = await import('./enhanced-preview-service');
    
    // Generate comprehensive preview with actual screenshots and mockups
    const previewResult = await enhancedPreviewService.generatePreview(
      compareResult.comparison, 
      compareResult.documentContext.fileName
    );

    return {
      visualPreview: previewResult,
      comparisonContext: compareResult,
      userApprovalRequired: true,
      implementationReady: previewResult.userApprovalRequired !== false
    };
  }

  // Step 3: Chat Determination with AI refinement (Legacy - keeping for backward compatibility)
  private async performChatDetermination(analysisResult: any, userInstructions?: string) {
    const refinementPrompt = `
    Based on the analysis results and user input, refine the implementation approach.
    
    Analysis Results: ${JSON.stringify(analysisResult)}
    User Instructions: ${userInstructions || 'No specific instructions provided'}
    
    Provide refined approach considering:
    1. User preferences and constraints
    2. MallyERP system architecture
    3. Implementation feasibility
    4. Business value prioritization
    
    Generate optimized implementation plan with specific next steps.
    `;

    const response = await this.openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are refining implementation approach based on analysis and user input." },
        { role: "user", content: refinementPrompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3
    });

    return JSON.parse(response.choices[0].message.content);
  }

  // Step 4: Page Preview Generation
  private async generatePagePreview(chatResult: any) {
    const previewPrompt = `
    Generate detailed page mockups and UI specifications.
    
    Implementation Plan: ${JSON.stringify(chatResult)}
    
    Create comprehensive UI specifications including:
    1. Page layouts and navigation
    2. Component hierarchy
    3. Data flow and interactions
    4. Visual design guidelines
    5. Responsive behavior
    
    Focus on MallyERP design patterns and user experience.
    `;

    const response = await this.openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are generating detailed UI mockups and specifications for ERP system." },
        { role: "user", content: previewPrompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.4
    });

    return JSON.parse(response.choices[0].message.content);
  }

  // Step 5: Implementation Refinement
  private async refineImplementation(previewResult: any) {
    // AI analyzes preview and suggests improvements
    const refinementPrompt = `
    Review and refine the implementation based on preview results.
    
    Preview Results: ${JSON.stringify(previewResult)}
    
    Analyze and improve:
    1. Technical architecture decisions
    2. User experience flow
    3. Performance considerations
    4. Security and validation
    5. Integration complexity
    
    Provide refined implementation with optimizations.
    `;

    const response = await this.openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are refining implementation for optimal results." },
        { role: "user", content: refinementPrompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3
    });

    return JSON.parse(response.choices[0].message.content);
  }

  // Step 6: Final Draft Creation
  private async createFinalDraft(changesResult: any) {
    const finalDraftPrompt = `
    Create complete technical specification for implementation.
    
    Refined Implementation: ${JSON.stringify(changesResult)}
    
    Generate comprehensive final draft including:
    1. Database schema with exact SQL
    2. API endpoint specifications with TypeScript interfaces
    3. React component specifications with props and state
    4. Integration documentation
    5. Testing requirements
    6. Deployment instructions
    
    Provide production-ready technical specification.
    `;

    const response = await this.openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are creating production-ready technical specifications." },
        { role: "user", content: finalDraftPrompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.2
    });

    return JSON.parse(response.choices[0].message.content);
  }

  // Step 7: Automated Review
  private async performAutomatedReview(finalDraftResult: any) {
    const reviewPrompt = `
    Perform comprehensive quality review of the technical specification.
    
    Final Draft: ${JSON.stringify(finalDraftResult)}
    
    Review checklist:
    1. Technical accuracy and completeness
    2. MallyERP integration compatibility
    3. Security and performance considerations
    4. Code quality standards
    5. Testing coverage
    6. Documentation completeness
    
    Provide approval status and any required corrections.
    `;

    const response = await this.openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are performing quality review for implementation approval." },
        { role: "user", content: reviewPrompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.1
    });

    return JSON.parse(response.choices[0].message.content);
  }

  // Step 8: Automated Build
  private async performAutomatedBuild(reviewResult: any) {
    // Generate actual code files based on approved specification
    const buildPrompt = `
    Generate production-ready code files based on approved specification.
    
    Approved Specification: ${JSON.stringify(reviewResult)}
    
    Generate complete implementation:
    1. Database migration files
    2. TypeScript interfaces and schemas
    3. API route implementations
    4. React components with TypeScript
    5. Integration and test files
    
    Provide actual file contents ready for deployment.
    `;

    const response = await this.openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are generating production-ready code files for ERP system." },
        { role: "user", content: buildPrompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.2
    });

    const buildResult = JSON.parse(response.choices[0].message.content);
    
    // Actually create the files (simplified implementation)
    const filesCreated = await this.createImplementationFiles(buildResult);
    
    return {
      ...buildResult,
      filesCreated,
      implementationComplete: true
    };
  }

  // Helper methods
  private async analyzeImageDocument(fileName: string): Promise<string> {
    // For images, use OpenAI Vision API
    const imageAnalysisPrompt = `
    Analyze this image document and extract business requirements.
    Focus on UI mockups, process flows, or business diagrams.
    Provide detailed description of what you see.
    `;

    const response = await this.openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: imageAnalysisPrompt },
            {
              type: "image_url",
              image_url: { url: `/attached_assets/${fileName}` }
            }
          ]
        }
      ]
    });

    return response.choices[0].message.content;
  }

  private async extractDocumentText(fileName: string): Promise<string> {
    // Simplified text extraction - in production, use proper document parsers
    try {
      const filePath = path.join('attached_assets', fileName);
      const fileContent = await fs.readFile(filePath, 'utf-8');
      return fileContent;
    } catch (error) {
      return `Document: ${fileName} (content extraction needed)`;
    }
  }

  private async createImplementationFiles(buildResult: any): Promise<string[]> {
    const filesCreated: string[] = [];
    
    try {
      // Create database schema files
      if (buildResult.database_files) {
        for (const file of buildResult.database_files) {
          const filePath = path.join('shared', file.name);
          await fs.writeFile(filePath, file.content);
          filesCreated.push(filePath);
        }
      }

      // Create API route files
      if (buildResult.api_files) {
        for (const file of buildResult.api_files) {
          const filePath = path.join('server/routes', file.name);
          await fs.writeFile(filePath, file.content);
          filesCreated.push(filePath);
        }
      }

      // Create React component files
      if (buildResult.ui_files) {
        for (const file of buildResult.ui_files) {
          const filePath = path.join('client/src/components', file.name);
          await fs.writeFile(filePath, file.content);
          filesCreated.push(filePath);
        }
      }

    } catch (error) {
      console.error('File creation error:', error);
    }

    return filesCreated;
  }

  // Public method to get workflow status
  async getWorkflowStatus(documentId: number): Promise<DesignerWorkflowStep[]> {
    return this.workflowSteps;
  }

  // Public method to execute single step
  async executeSingleStep(stepNumber: number, documentId: number, context?: any): Promise<any> {
    const step = this.workflowSteps[stepNumber - 1];
    if (!step) throw new Error('Invalid step number');

    step.status = 'processing';

    try {
      let result;
      switch (stepNumber) {
        case 2: result = await this.performDeepAnalysis(documentId); break;
        case 3: result = await this.performChatDetermination(context?.analysisResult, context?.userInstructions); break;
        case 4: result = await this.generatePagePreview(context?.chatResult); break;
        case 5: result = await this.refineImplementation(context?.previewResult); break;
        case 6: result = await this.createFinalDraft(context?.changesResult); break;
        case 7: result = await this.performAutomatedReview(context?.finalDraftResult); break;
        case 8: result = await this.performAutomatedBuild(context?.reviewResult); break;
        default: throw new Error('Step not implemented');
      }

      step.status = 'completed';
      step.result = result;
      return result;

    } catch (error) {
      step.status = 'failed';
      step.error = error.message;
      throw error;
    }
  }
}

export const completeDesignerAgent = new CompleteDesignerAgent();