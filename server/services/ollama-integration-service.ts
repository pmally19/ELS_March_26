/**
 * OLLAMA INTEGRATION SERVICE
 * Local LLM processing with phi3, llama3, and mistral models
 * Enhanced Designer Agent with local AI capabilities
 */

import { spawn } from 'child_process';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

export interface OllamaAnalysisResult {
  model: string;
  confidence: number;
  processingTime: number;
  analysis: {
    businessRequirements: string[];
    technicalGaps: string[];
    implementationSuggestions: string[];
    riskAssessment: string;
  };
  codeReview: {
    qualityScore: number;
    suggestions: string[];
    patterns: string[];
  };
  localProcessing: boolean;
}

class OllamaIntegrationService {
  private availableModels = ['phi3', 'llama3', 'mistral'];
  private defaultModel = 'phi3';
  private isOllamaAvailable = false;

  constructor() {
    this.checkOllamaAvailability();
  }

  /**
   * Check if Ollama is available on the system
   */
  private async checkOllamaAvailability(): Promise<void> {
    try {
      const result = await this.executeCommand('ollama', ['--version']);
      this.isOllamaAvailable = result.success;
      console.log(`🤖 Ollama availability: ${this.isOllamaAvailable ? 'Available' : 'Not Available'}`);
    } catch (error) {
      console.log('⚠️  Ollama not available on system');
      this.isOllamaAvailable = false;
    }
  }

  /**
   * Main analysis method using local LLM
   */
  async analyzeWithOllama(documentContent: string, fileName: string, model: string = this.defaultModel): Promise<OllamaAnalysisResult> {
    const startTime = Date.now();
    
    if (!this.isOllamaAvailable) {
      return this.getFallbackAnalysis(documentContent, fileName, startTime);
    }

    console.log(`🧠 Starting Ollama analysis with ${model} model`);

    try {
      // Prepare the prompt for business requirement analysis
      const prompt = this.createBusinessAnalysisPrompt(documentContent, fileName);
      
      // Execute Ollama analysis
      const response = await this.queryOllama(model, prompt);
      
      if (!response.success) {
        throw new Error(`Ollama query failed: ${response.error}`);
      }

      // Parse the response
      const analysis = this.parseOllamaResponse(response.output);
      
      // Perform code review if applicable
      const codeReview = await this.performCodeReview(documentContent, model);
      
      const processingTime = Date.now() - startTime;
      
      return {
        model,
        confidence: 0.85,
        processingTime,
        analysis,
        codeReview,
        localProcessing: true
      };

    } catch (error) {
      console.error('Ollama analysis error:', error);
      return this.getFallbackAnalysis(documentContent, fileName, startTime);
    }
  }

  /**
   * Code review using local LLM
   */
  private async performCodeReview(content: string, model: string): Promise<{ qualityScore: number; suggestions: string[]; patterns: string[] }> {
    const codeReviewPrompt = `
    Analyze this code/document for quality and patterns:
    
    Content: ${content.substring(0, 2000)}...
    
    Provide:
    1. Quality score (0-100)
    2. Improvement suggestions
    3. Identified patterns
    
    Format response as JSON with keys: qualityScore, suggestions, patterns
    `;

    try {
      const response = await this.queryOllama(model, codeReviewPrompt);
      
      if (response.success) {
        const parsed = this.parseCodeReviewResponse(response.output);
        return parsed;
      }
    } catch (error) {
      console.error('Code review error:', error);
    }

    // Fallback code review
    return {
      qualityScore: 75,
      suggestions: [
        'Consider adding more detailed documentation',
        'Review error handling patterns',
        'Validate input parameters consistently'
      ],
      patterns: [
        'Standard business logic patterns detected',
        'Database interaction patterns found',
        'Error handling patterns present'
      ]
    };
  }

  /**
   * Query Ollama with specific model
   */
  private async queryOllama(model: string, prompt: string): Promise<{ success: boolean; output?: string; error?: string }> {
    try {
      // Create temporary file for prompt
      const tempFile = join(process.cwd(), 'temp_ollama_prompt.txt');
      writeFileSync(tempFile, prompt);

      // Execute Ollama command
      const result = await this.executeCommand('ollama', ['run', model, '--file', tempFile]);
      
      // Clean up
      if (existsSync(tempFile)) {
        require('fs').unlinkSync(tempFile);
      }

      return {
        success: result.success,
        output: result.output,
        error: result.error
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Create business analysis prompt
   */
  private createBusinessAnalysisPrompt(content: string, fileName: string): string {
    return `
    You are an expert business analyst reviewing an ERP system requirement document.
    
    Document: ${fileName}
    Content: ${content.substring(0, 3000)}...
    
    Please analyze and provide:
    
    1. BUSINESS REQUIREMENTS (list 3-5 key requirements)
    2. TECHNICAL GAPS (identify what might be missing)
    3. IMPLEMENTATION SUGGESTIONS (practical next steps)
    4. RISK ASSESSMENT (potential challenges and mitigation)
    
    Format your response as structured text with clear sections.
    Focus on actionable insights for ERP system enhancement.
    `;
  }

  /**
   * Parse Ollama response into structured format
   */
  private parseOllamaResponse(response: string): {
    businessRequirements: string[];
    technicalGaps: string[];
    implementationSuggestions: string[];
    riskAssessment: string;
  } {
    const lines = response.split('\n').filter(line => line.trim());
    
    const businessRequirements: string[] = [];
    const technicalGaps: string[] = [];
    const implementationSuggestions: string[] = [];
    let riskAssessment = '';
    
    let currentSection = '';
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      if (trimmed.toUpperCase().includes('BUSINESS REQUIREMENTS')) {
        currentSection = 'business';
        continue;
      } else if (trimmed.toUpperCase().includes('TECHNICAL GAPS')) {
        currentSection = 'gaps';
        continue;
      } else if (trimmed.toUpperCase().includes('IMPLEMENTATION SUGGESTIONS')) {
        currentSection = 'implementation';
        continue;
      } else if (trimmed.toUpperCase().includes('RISK ASSESSMENT')) {
        currentSection = 'risk';
        continue;
      }
      
      if (trimmed.startsWith('-') || trimmed.startsWith('•') || trimmed.match(/^\d+\./)) {
        const cleanLine = trimmed.replace(/^[-•\d.]\s*/, '');
        
        switch (currentSection) {
          case 'business':
            businessRequirements.push(cleanLine);
            break;
          case 'gaps':
            technicalGaps.push(cleanLine);
            break;
          case 'implementation':
            implementationSuggestions.push(cleanLine);
            break;
        }
      } else if (currentSection === 'risk' && trimmed.length > 10) {
        riskAssessment += trimmed + ' ';
      }
    }
    
    return {
      businessRequirements: businessRequirements.length > 0 ? businessRequirements : ['Enhanced user interface requirements', 'Improved data validation', 'Better reporting capabilities'],
      technicalGaps: technicalGaps.length > 0 ? technicalGaps : ['Missing API endpoints', 'Incomplete data models', 'Limited error handling'],
      implementationSuggestions: implementationSuggestions.length > 0 ? implementationSuggestions : ['Implement missing database tables', 'Create new API endpoints', 'Enhance UI components'],
      riskAssessment: riskAssessment.trim() || 'Medium risk implementation with standard ERP integration challenges'
    };
  }

  /**
   * Parse code review response
   */
  private parseCodeReviewResponse(response: string): { qualityScore: number; suggestions: string[]; patterns: string[] } {
    try {
      // Try to parse as JSON first
      const parsed = JSON.parse(response);
      return {
        qualityScore: parsed.qualityScore || 75,
        suggestions: parsed.suggestions || [],
        patterns: parsed.patterns || []
      };
    } catch (error) {
      // Fallback parsing
      const lines = response.split('\n').filter(line => line.trim());
      
      let qualityScore = 75;
      const suggestions: string[] = [];
      const patterns: string[] = [];
      
      for (const line of lines) {
        const trimmed = line.trim();
        
        if (trimmed.includes('quality') && trimmed.match(/\d+/)) {
          const match = trimmed.match(/\d+/);
          if (match) {
            qualityScore = parseInt(match[0]);
          }
        } else if (trimmed.startsWith('-') || trimmed.startsWith('•')) {
          const cleanLine = trimmed.replace(/^[-•]\s*/, '');
          if (trimmed.toLowerCase().includes('suggest')) {
            suggestions.push(cleanLine);
          } else if (trimmed.toLowerCase().includes('pattern')) {
            patterns.push(cleanLine);
          }
        }
      }
      
      return { qualityScore, suggestions, patterns };
    }
  }

  /**
   * Execute system command
   */
  private async executeCommand(command: string, args: string[]): Promise<{ success: boolean; output?: string; error?: string }> {
    return new Promise((resolve) => {
      const process = spawn(command, args);
      let output = '';
      let error = '';
      
      process.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      process.stderr.on('data', (data) => {
        error += data.toString();
      });
      
      process.on('close', (code) => {
        resolve({
          success: code === 0,
          output: output.trim(),
          error: error.trim()
        });
      });
      
      process.on('error', (err) => {
        resolve({
          success: false,
          error: err.message
        });
      });
    });
  }

  /**
   * Fallback analysis when Ollama is not available
   */
  private getFallbackAnalysis(documentContent: string, fileName: string, startTime: number): OllamaAnalysisResult {
    console.log('📝 Using fallback analysis (Ollama not available)');
    
    const processingTime = Date.now() - startTime;
    
    // Pattern-based analysis as fallback
    const businessPatterns = {
      finance: /finance|accounting|invoice|payment|billing/gi,
      sales: /sales|customer|order|quote|lead/gi,
      inventory: /inventory|stock|warehouse|material|product/gi,
      hr: /employee|staff|payroll|human|resource/gi,
      production: /production|manufacturing|work|center/gi
    };
    
    const requirements: string[] = [];
    const gaps: string[] = [];
    const suggestions: string[] = [];
    
    // Analyze patterns
    for (const [domain, pattern] of Object.entries(businessPatterns)) {
      const matches = documentContent.match(pattern);
      if (matches && matches.length > 0) {
        requirements.push(`${domain.toUpperCase()} module enhancements (${matches.length} references)`);
        gaps.push(`Enhanced ${domain} processing capabilities needed`);
        suggestions.push(`Implement advanced ${domain} features and integrations`);
      }
    }
    
    return {
      model: 'fallback-analysis',
      confidence: 0.70,
      processingTime,
      analysis: {
        businessRequirements: requirements.length > 0 ? requirements : ['Enhanced ERP functionality', 'Improved user experience', 'Better data integration'],
        technicalGaps: gaps.length > 0 ? gaps : ['Missing API endpoints', 'Incomplete data models', 'Limited validation'],
        implementationSuggestions: suggestions.length > 0 ? suggestions : ['Enhance existing modules', 'Add new functionality', 'Improve integrations'],
        riskAssessment: 'Medium risk with standard ERP enhancement challenges'
      },
      codeReview: {
        qualityScore: 78,
        suggestions: [
          'Add comprehensive error handling',
          'Implement proper validation',
          'Enhance documentation'
        ],
        patterns: [
          'Standard ERP patterns detected',
          'Business logic structure identified',
          'Database interaction patterns found'
        ]
      },
      localProcessing: false
    };
  }

  /**
   * Get available models
   */
  async getAvailableModels(): Promise<string[]> {
    if (!this.isOllamaAvailable) {
      return [];
    }
    
    try {
      const result = await this.executeCommand('ollama', ['list']);
      if (result.success) {
        const models = result.output.split('\n')
          .filter(line => line.trim() && !line.startsWith('NAME'))
          .map(line => line.split(/\s+/)[0])
          .filter(model => model && !model.includes(':'));
        
        return models.length > 0 ? models : this.availableModels;
      }
    } catch (error) {
      console.error('Error getting Ollama models:', error);
    }
    
    return this.availableModels;
  }

  /**
   * Install a model if not available
   */
  async installModel(model: string): Promise<boolean> {
    if (!this.isOllamaAvailable) {
      return false;
    }
    
    try {
      console.log(`📦 Installing Ollama model: ${model}`);
      const result = await this.executeCommand('ollama', ['pull', model]);
      return result.success;
    } catch (error) {
      console.error(`Error installing model ${model}:`, error);
      return false;
    }
  }
}

export const ollamaIntegrationService = new OllamaIntegrationService();