// Lightweight analysis service - provides heuristic analysis without external AI

function extractKeywords(content: string): string[] {
  const words = (content || '').toLowerCase();
  const flags = [
    'purchase returns', 'credit note', 'loyalty', 'points', 'performance review', 'ap payments',
    'general ledger', 'sales', 'inventory', 'vendor', 'customer', 'materials'
  ];
  return flags.filter(f => words.includes(f));
}

export const lightweightAnalysisService = {
  async performLightweightAnalysis(content: string, fileName: string) {
    const detected = extractKeywords(content);

    const existingComponents = [
      { name: 'Finance Dashboard', route: '/finance' },
      { name: 'Sales Management', route: '/sales' },
      { name: 'Inventory Control', route: '/inventory' }
    ];

    const recommendations = [] as string[];
    const missingComponents = [] as string[];

    if (detected.includes('purchase returns') || detected.includes('credit note')) {
      recommendations.push('Add purchase_returns and purchase_return_items tables');
      missingComponents.push('PurchaseReturns Wizard UI');
    }
    if (detected.includes('loyalty') || detected.includes('points')) {
      recommendations.push('Add loyalty_points_ledger and loyalty_rules tables');
      missingComponents.push('Loyalty Dashboard and Customer Panel');
    }

    const codebaseAnalysis = {
      fileAnalyzed: fileName,
      keywordsDetected: detected,
      analysisMethod: 'lightweight-heuristic'
    };

    return {
      success: true,
      analysisMethod: 'lightweight',
      confidence: 0.6,
      existingComponents,
      recommendations,
      missingComponents,
      codebaseAnalysis
    };
  }
};

export type LightweightAnalysisService = typeof lightweightAnalysisService;

/**
 * LIGHTWEIGHT ANALYSIS SERVICE
 * Enhanced Designer Agent with multiple lightweight review options
 * Options: LLM-based (Ollama), Embedding-based (HuggingFace), Static Analysis, Diffing Tools
 */

import { db } from '../db';
import { readFileSync } from 'fs';
import { join } from 'path';

export interface LightweightAnalysisResult {
  analysisMethod: string;
  confidence: number;
  existingComponents: Array<{
    name: string;
    type: string;
    matchScore: number;
    location: string;
  }>;
  missingComponents: Array<{
    name: string;
    type: string;
    priority: string;
    description: string;
  }>;
  recommendations: Array<{
    action: string;
    priority: string;
    effort: string;
    description: string;
  }>;
  codebaseAnalysis: {
    tablesScanned: number;
    componentsAnalyzed: number;
    apiEndpointsFound: number;
    duplicatePatterns: string[];
  };
  staticAnalysis?: {
    lintingResults: string[];
    codeQualityScore: number;
    securityIssues: string[];
  };
  embeddingAnalysis?: {
    similarityScores: Record<string, number>;
    semanticMatches: string[];
    contextualRelevance: number;
  };
}

class LightweightAnalysisService {
  private systemTables: string[] = [];
  private systemComponents: string[] = [];
  private systemAPIs: string[] = [];

  constructor() {
    this.initializeSystemData();
  }

  private async initializeSystemData() {
    try {
      // Load system tables
      const tablesResult = await db.execute(`
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name
      `);
      this.systemTables = tablesResult.rows.map(row => row.table_name);

      // Load system components (from filesystem)
      this.systemComponents = await this.scanForComponents();

      // Load system APIs (from routes)
      this.systemAPIs = await this.scanForAPIs();

      console.log(`📊 System initialized: ${this.systemTables.length} tables, ${this.systemComponents.length} components, ${this.systemAPIs.length} APIs`);
    } catch (error) {
      console.error('System initialization error:', error);
    }
  }

  /**
   * Main lightweight analysis method - Enhanced with all 4 options
   */
  async performLightweightAnalysis(documentContent: string, fileName: string): Promise<LightweightAnalysisResult> {
    console.log(`🔍 Starting enhanced lightweight analysis for: ${fileName}`);

    try {
      // Import enhanced services
      const { ollamaIntegrationService } = await import('./ollama-integration-service');
      const { huggingFaceTransformersService } = await import('./huggingface-transformers-service');
      const { staticAnalysisService } = await import('./static-analysis-service');

      // Run all analysis methods in parallel for maximum efficiency
      const [
        staticAnalysis,
        patternAnalysis,
        embeddingAnalysis,
        diffAnalysis,
        ollamaAnalysis,
        transformersAnalysis,
        eslintAnalysis
      ] = await Promise.all([
        this.performStaticAnalysis(documentContent, fileName),
        this.performPatternAnalysis(documentContent, fileName),
        this.performEmbeddingAnalysis(documentContent, fileName),
        this.performDiffAnalysis(documentContent, fileName),
        ollamaIntegrationService.analyzeWithOllama(documentContent, fileName).catch(() => null),
        huggingFaceTransformersService.analyzeWithTransformers(documentContent, fileName).catch(() => null),
        staticAnalysisService.performStaticAnalysis(documentContent, fileName).catch(() => null)
      ]);

      // Enhanced confidence calculation based on available analysis methods
      const analysisCount = [ollamaAnalysis, transformersAnalysis, eslintAnalysis].filter(Boolean).length;
      const confidence = 0.75 + (analysisCount * 0.05); // Higher confidence with more analysis methods

      // Combine all results
      const result: LightweightAnalysisResult = {
        analysisMethod: `Enhanced Multi-Modal Analysis (${3 + analysisCount} methods)`,
        confidence,
        existingComponents: [
          ...staticAnalysis.existingComponents,
          ...patternAnalysis.existingComponents,
          ...embeddingAnalysis.existingComponents
        ],
        missingComponents: [
          ...staticAnalysis.missingComponents,
          ...patternAnalysis.missingComponents,
          ...embeddingAnalysis.missingComponents
        ],
        recommendations: [
          ...staticAnalysis.recommendations,
          ...patternAnalysis.recommendations,
          ...embeddingAnalysis.recommendations,
          // Add enhanced recommendations from additional analysis
          ...(ollamaAnalysis ? [{
            action: 'Local LLM Analysis Available',
            priority: 'high',
            effort: 'low',
            description: `Ollama analysis with ${ollamaAnalysis.model} model (${ollamaAnalysis.confidence} confidence)`
          }] : []),
          ...(transformersAnalysis ? [{
            action: 'Semantic Analysis Available',
            priority: 'medium',
            effort: 'low',
            description: `HuggingFace analysis with ${transformersAnalysis.confidence} confidence`
          }] : []),
          ...(eslintAnalysis ? [{
            action: 'Code Quality Analysis Available',
            priority: 'medium',
            effort: 'low',
            description: `Static analysis with ${eslintAnalysis.codeQuality.score}/100 quality score`
          }] : [])
        ],
        codebaseAnalysis: {
          tablesScanned: this.systemTables.length,
          componentsAnalyzed: this.systemComponents.length,
          apiEndpointsFound: this.systemAPIs.length,
          duplicatePatterns: diffAnalysis.duplicatePatterns
        },
        staticAnalysis: staticAnalysis.staticAnalysis,
        embeddingAnalysis: embeddingAnalysis.embeddingAnalysis,
        // Add enhanced analysis results
        enhancedAnalysis: {
          ollamaAvailable: !!ollamaAnalysis,
          transformersAvailable: !!transformersAnalysis,
          staticAnalysisAvailable: !!eslintAnalysis,
          totalAnalysisMethods: 3 + analysisCount
        }
      };

      console.log(`✅ Enhanced lightweight analysis completed with ${result.confidence} confidence using ${result.analysisMethod}`);
      return result;
    } catch (error) {
      console.error('Enhanced lightweight analysis error:', error);
      // Fallback to basic analysis
      return this.performBasicAnalysis(documentContent, fileName);
    }
  }

  /**
   * Basic analysis fallback method
   */
  private async performBasicAnalysis(documentContent: string, fileName: string): Promise<LightweightAnalysisResult> {
    // Option 1: Static Analysis (Always available)
    const staticAnalysis = await this.performStaticAnalysis(documentContent, fileName);

    // Option 2: Pattern-based Analysis (Lightweight LLM alternative)
    const patternAnalysis = await this.performPatternAnalysis(documentContent, fileName);

    // Option 3: Embedding-based Analysis (Similarity matching)
    const embeddingAnalysis = await this.performEmbeddingAnalysis(documentContent, fileName);

    // Option 4: Diffing Analysis (Compare with existing structure)
    const diffAnalysis = await this.performDiffAnalysis(documentContent, fileName);

    // Combine results
    const result: LightweightAnalysisResult = {
      analysisMethod: 'Basic Multi-Modal Analysis',
      confidence: 0.75,
      existingComponents: [
        ...staticAnalysis.existingComponents,
        ...patternAnalysis.existingComponents,
        ...embeddingAnalysis.existingComponents
      ],
      missingComponents: [
        ...staticAnalysis.missingComponents,
        ...patternAnalysis.missingComponents,
        ...embeddingAnalysis.missingComponents
      ],
      recommendations: [
        ...staticAnalysis.recommendations,
        ...patternAnalysis.recommendations,
        ...embeddingAnalysis.recommendations
      ],
      codebaseAnalysis: {
        tablesScanned: this.systemTables.length,
        componentsAnalyzed: this.systemComponents.length,
        apiEndpointsFound: this.systemAPIs.length,
        duplicatePatterns: diffAnalysis.duplicatePatterns
      },
      staticAnalysis: staticAnalysis.staticAnalysis,
      embeddingAnalysis: embeddingAnalysis.embeddingAnalysis
    };

    console.log(`✅ Basic lightweight analysis completed with ${result.confidence} confidence`);
    return result;
  }

  /**
   * Option 1: Static Analysis (ESLint-style code analysis)
   */
  private async performStaticAnalysis(content: string, fileName: string): Promise<Partial<LightweightAnalysisResult>> {
    const existingComponents = [];
    const missingComponents = [];
    const recommendations = [];

    // Analyze document patterns
    const patterns = {
      tableReferences: content.match(/table|database|schema|entity/gi) || [],
      componentReferences: content.match(/component|interface|screen|page/gi) || [],
      apiReferences: content.match(/api|endpoint|service|route/gi) || [],
      businessLogic: content.match(/business|logic|rule|process|workflow/gi) || []
    };

    // Check against existing system
    for (const table of this.systemTables) {
      if (content.toLowerCase().includes(table.toLowerCase())) {
        existingComponents.push({
          name: table,
          type: 'database_table',
          matchScore: 0.9,
          location: 'Database Schema'
        });
      }
    }

    // Identify missing components based on patterns
    if (patterns.tableReferences.length > existingComponents.length) {
      missingComponents.push({
        name: 'Additional Database Tables',
        type: 'database_schema',
        priority: 'high',
        description: `Document references ${patterns.tableReferences.length} table concepts, but only ${existingComponents.length} matches found`
      });
    }

    if (patterns.componentReferences.length > 0) {
      missingComponents.push({
        name: 'UI Components',
        type: 'frontend_component',
        priority: 'medium',
        description: `Document mentions ${patterns.componentReferences.length} UI components that may need implementation`
      });
    }

    recommendations.push({
      action: 'Review Database Schema',
      priority: 'high',
      effort: 'medium',
      description: 'Verify existing tables match document requirements'
    });

    return {
      existingComponents,
      missingComponents,
      recommendations,
      staticAnalysis: {
        lintingResults: [
          `Found ${patterns.tableReferences.length} table references`,
          `Found ${patterns.componentReferences.length} component references`,
          `Found ${patterns.apiReferences.length} API references`
        ],
        codeQualityScore: 0.8,
        securityIssues: []
      }
    };
  }

  /**
   * Option 2: Pattern-based Analysis (Lightweight LLM alternative)
   */
  private async performPatternAnalysis(content: string, fileName: string): Promise<Partial<LightweightAnalysisResult>> {
    const existingComponents = [];
    const missingComponents = [];
    const recommendations = [];

    // Business domain pattern recognition
    const businessPatterns = {
      finance: /finance|accounting|invoice|payment|billing|ledger|budget/gi,
      sales: /sales|customer|order|quote|lead|opportunity|revenue/gi,
      inventory: /inventory|stock|warehouse|material|product|item|goods/gi,
      hr: /employee|staff|payroll|human|resource|personnel/gi,
      production: /production|manufacturing|work|center|operation|planning/gi
    };

    // Analyze document domain
    let primaryDomain = 'general';
    let maxMatches = 0;

    for (const [domain, pattern] of Object.entries(businessPatterns)) {
      const matches = content.match(pattern) || [];
      if (matches.length > maxMatches) {
        maxMatches = matches.length;
        primaryDomain = domain;
      }
    }

    // Check for existing components in this domain
    const domainTables = this.systemTables.filter(table => 
      table.toLowerCase().includes(primaryDomain) || 
      table.toLowerCase().includes('erp_' + primaryDomain)
    );

    domainTables.forEach(table => {
      existingComponents.push({
        name: table,
        type: 'domain_table',
        matchScore: 0.8,
        location: `${primaryDomain.toUpperCase()} Domain`
      });
    });

    // Pattern-based gap analysis
    const commonPatterns = {
      'user management': /user|login|auth|permission|role/gi,
      'data validation': /validate|check|verify|confirm/gi,
      'reporting': /report|dashboard|analytics|chart|graph/gi,
      'workflow': /workflow|process|step|stage|approval/gi
    };

    for (const [pattern, regex] of Object.entries(commonPatterns)) {
      const matches = content.match(regex) || [];
      if (matches.length > 0) {
        missingComponents.push({
          name: pattern.replace(/^\w/, c => c.toUpperCase()),
          type: 'business_logic',
          priority: 'medium',
          description: `Document mentions ${matches.length} references to ${pattern}`
        });
      }
    }

    recommendations.push({
      action: `Focus on ${primaryDomain.toUpperCase()} Domain`,
      priority: 'high',
      effort: 'low',
      description: `Document is primarily ${primaryDomain}-focused with ${maxMatches} related terms`
    });

    return {
      existingComponents,
      missingComponents,
      recommendations
    };
  }

  /**
   * Option 3: Embedding-based Analysis (Similarity matching)
   */
  private async performEmbeddingAnalysis(content: string, fileName: string): Promise<Partial<LightweightAnalysisResult>> {
    const existingComponents = [];
    const missingComponents = [];
    const recommendations = [];

    // Simple similarity scoring based on keywords
    const documentKeywords = this.extractKeywords(content);
    const similarityScores: Record<string, number> = {};
    const semanticMatches: string[] = [];

    // Compare with existing system components
    for (const table of this.systemTables) {
      const tableKeywords = table.split('_').concat(table.split(/(?=[A-Z])/));
      const similarity = this.calculateSimilarity(documentKeywords, tableKeywords);
      
      if (similarity > 0.3) {
        similarityScores[table] = similarity;
        semanticMatches.push(table);
        
        existingComponents.push({
          name: table,
          type: 'semantic_match',
          matchScore: similarity,
          location: 'Semantic Analysis'
        });
      }
    }

    // Contextual relevance scoring
    const contextualRelevance = semanticMatches.length / Math.max(documentKeywords.length, 1);

    // Generate recommendations based on similarity gaps
    if (contextualRelevance < 0.5) {
      recommendations.push({
        action: 'Enhance Semantic Matching',
        priority: 'medium',
        effort: 'medium',
        description: `Low contextual relevance (${(contextualRelevance * 100).toFixed(1)}%) suggests need for new components`
      });
    }

    return {
      existingComponents,
      missingComponents,
      recommendations,
      embeddingAnalysis: {
        similarityScores,
        semanticMatches,
        contextualRelevance
      }
    };
  }

  /**
   * Option 4: Diffing Analysis (Compare with existing structure)
   */
  private async performDiffAnalysis(content: string, fileName: string): Promise<{ duplicatePatterns: string[] }> {
    const duplicatePatterns: string[] = [];

    // Simple pattern detection for duplicates
    const contentLines = content.split('\n');
    const systemPatterns = [
      ...this.systemTables.map(t => t.toLowerCase()),
      ...this.systemComponents.map(c => c.toLowerCase())
    ];

    for (const line of contentLines) {
      const lineLower = line.toLowerCase();
      for (const pattern of systemPatterns) {
        if (lineLower.includes(pattern)) {
          duplicatePatterns.push(`Potential duplicate: ${pattern} (existing in system)`);
        }
      }
    }

    return { duplicatePatterns };
  }

  /**
   * Helper methods
   */
  private async scanForComponents(): Promise<string[]> {
    // Simplified component scanning
    return [
      'DashboardComponent', 'SalesComponent', 'InventoryComponent',
      'FinanceComponent', 'UserManagementComponent', 'ReportingComponent'
    ];
  }

  private async scanForAPIs(): Promise<string[]> {
    // Simplified API scanning
    return [
      '/api/sales', '/api/inventory', '/api/finance',
      '/api/users', '/api/reports', '/api/dashboard'
    ];
  }

  private extractKeywords(content: string): string[] {
    // Simple keyword extraction
    const words = content.toLowerCase().match(/\b\w{3,}\b/g) || [];
    const stopWords = ['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'has', 'let', 'put', 'say', 'she', 'too', 'use'];
    
    return words.filter(word => !stopWords.includes(word) && word.length > 3);
  }

  private calculateSimilarity(words1: string[], words2: string[]): number {
    if (words1.length === 0 || words2.length === 0) return 0;
    
    const intersection = words1.filter(word => words2.includes(word));
    const union = [...new Set([...words1, ...words2])];
    
    return intersection.length / union.length;
  }
}

// Export the class instance instead of the object
export const lightweightAnalysisServiceInstance = new LightweightAnalysisService();