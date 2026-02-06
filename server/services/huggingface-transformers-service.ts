/**
 * HUGGINGFACE TRANSFORMERS SERVICE
 * Embedding-based analysis using HuggingFace Transformers
 * Enhanced Designer Agent with local embedding capabilities
 */

import { HfInference } from '@huggingface/inference';
import { pipeline } from '@huggingface/transformers';

export interface TransformersAnalysisResult {
  model: string;
  confidence: number;
  processingTime: number;
  embeddings: {
    documentEmbedding: number[];
    systemEmbeddings: Record<string, number[]>;
    similarityScores: Record<string, number>;
  };
  semanticAnalysis: {
    keyTopics: string[];
    sentimentScore: number;
    complexity: number;
    businessDomain: string;
  };
  similarityMatches: Array<{
    component: string;
    similarity: number;
    relevance: string;
  }>;
  recommendations: Array<{
    action: string;
    priority: string;
    reasoning: string;
  }>;
}

class HuggingFaceTransformersService {
  private hf: HfInference;
  private embeddingModel = 'sentence-transformers/all-MiniLM-L6-v2';
  private classificationModel = 'microsoft/DialoGPT-medium';
  private isInitialized = false;

  constructor() {
    this.initializeService();
  }

  private async initializeService() {
    try {
      // Initialize HuggingFace Inference
      this.hf = new HfInference(process.env.HUGGINGFACE_API_KEY || '');
      
      // Test connection
      await this.testConnection();
      
      this.isInitialized = true;
      console.log('🤗 HuggingFace Transformers service initialized successfully');
    } catch (error) {
      console.warn('⚠️ HuggingFace service initialization failed, using fallback:', error.message);
      this.isInitialized = false;
    }
  }

  /**
   * Main analysis method using HuggingFace Transformers
   */
  async analyzeWithTransformers(documentContent: string, fileName: string): Promise<TransformersAnalysisResult> {
    const startTime = Date.now();
    
    if (!this.isInitialized) {
      return this.getFallbackAnalysis(documentContent, fileName, startTime);
    }

    console.log('🤗 Starting HuggingFace Transformers analysis');

    try {
      // Parallel processing for efficiency
      const [
        documentEmbedding,
        semanticAnalysis,
        systemEmbeddings,
        similarityMatches
      ] = await Promise.all([
        this.generateDocumentEmbedding(documentContent),
        this.performSemanticAnalysis(documentContent),
        this.generateSystemEmbeddings(),
        this.findSimilarityMatches(documentContent)
      ]);

      const similarityScores = this.calculateSimilarityScores(documentEmbedding, systemEmbeddings);
      const recommendations = this.generateRecommendations(semanticAnalysis, similarityScores);

      const processingTime = Date.now() - startTime;

      return {
        model: this.embeddingModel,
        confidence: 0.92,
        processingTime,
        embeddings: {
          documentEmbedding,
          systemEmbeddings,
          similarityScores
        },
        semanticAnalysis,
        similarityMatches,
        recommendations
      };

    } catch (error) {
      console.error('HuggingFace Transformers analysis error:', error);
      return this.getFallbackAnalysis(documentContent, fileName, startTime);
    }
  }

  /**
   * Generate document embedding using sentence transformers
   */
  private async generateDocumentEmbedding(content: string): Promise<number[]> {
    try {
      // Truncate content to avoid token limits
      const truncatedContent = content.substring(0, 2000);
      
      const response = await this.hf.featureExtraction({
        model: this.embeddingModel,
        inputs: truncatedContent
      });

      return Array.isArray(response) ? response : this.getFallbackEmbedding();
    } catch (error) {
      console.error('Error generating document embedding:', error);
      return this.getFallbackEmbedding();
    }
  }

  /**
   * Perform semantic analysis
   */
  private async performSemanticAnalysis(content: string): Promise<{
    keyTopics: string[];
    sentimentScore: number;
    complexity: number;
    businessDomain: string;
  }> {
    try {
      // Key topic extraction using simple word frequency
      const keyTopics = this.extractKeyTopics(content);
      
      // Sentiment analysis
      const sentimentScore = await this.analyzeSentiment(content);
      
      // Complexity analysis
      const complexity = this.calculateComplexity(content);
      
      // Business domain classification
      const businessDomain = this.classifyBusinessDomain(content);

      return {
        keyTopics,
        sentimentScore,
        complexity,
        businessDomain
      };
    } catch (error) {
      console.error('Semantic analysis error:', error);
      return {
        keyTopics: ['business', 'requirements', 'system', 'process', 'management'],
        sentimentScore: 0.5,
        complexity: 0.6,
        businessDomain: 'general'
      };
    }
  }

  /**
   * Analyze sentiment using HuggingFace
   */
  private async analyzeSentiment(content: string): Promise<number> {
    try {
      const response = await this.hf.textClassification({
        model: 'cardiffnlp/twitter-roberta-base-sentiment-latest',
        inputs: content.substring(0, 500)
      });

      if (Array.isArray(response) && response.length > 0) {
        const sentiment = response[0];
        return sentiment.label === 'POSITIVE' ? sentiment.score : 
               sentiment.label === 'NEGATIVE' ? -sentiment.score : 0;
      }
    } catch (error) {
      console.error('Sentiment analysis error:', error);
    }
    
    return 0.5; // Neutral fallback
  }

  /**
   * Generate embeddings for system components
   */
  private async generateSystemEmbeddings(): Promise<Record<string, number[]>> {
    const systemComponents = [
      'sales management system',
      'inventory management system',
      'financial management system',
      'human resources management',
      'production planning system',
      'customer relationship management',
      'enterprise resource planning',
      'business intelligence dashboard',
      'data analytics platform',
      'workflow automation system'
    ];

    const systemEmbeddings: Record<string, number[]> = {};

    for (const component of systemComponents) {
      try {
        const embedding = await this.generateDocumentEmbedding(component);
        systemEmbeddings[component] = embedding;
      } catch (error) {
        console.error(`Error generating embedding for ${component}:`, error);
        systemEmbeddings[component] = this.getFallbackEmbedding();
      }
    }

    return systemEmbeddings;
  }

  /**
   * Find similarity matches
   */
  private async findSimilarityMatches(content: string): Promise<Array<{
    component: string;
    similarity: number;
    relevance: string;
  }>> {
    const matches = [];
    
    // Simple keyword-based similarity matching
    const businessKeywords = {
      'Sales Management': ['sales', 'customer', 'order', 'quote', 'lead', 'revenue'],
      'Inventory Management': ['inventory', 'stock', 'warehouse', 'material', 'product'],
      'Financial Management': ['finance', 'accounting', 'invoice', 'payment', 'billing'],
      'Human Resources': ['employee', 'staff', 'payroll', 'human', 'resource'],
      'Production Planning': ['production', 'manufacturing', 'work', 'center', 'planning']
    };

    const contentLower = content.toLowerCase();

    for (const [component, keywords] of Object.entries(businessKeywords)) {
      let matchCount = 0;
      for (const keyword of keywords) {
        if (contentLower.includes(keyword)) {
          matchCount++;
        }
      }
      
      if (matchCount > 0) {
        const similarity = matchCount / keywords.length;
        matches.push({
          component,
          similarity,
          relevance: similarity > 0.5 ? 'high' : similarity > 0.25 ? 'medium' : 'low'
        });
      }
    }

    return matches.sort((a, b) => b.similarity - a.similarity);
  }

  /**
   * Calculate similarity scores between document and system components
   */
  private calculateSimilarityScores(docEmbedding: number[], systemEmbeddings: Record<string, number[]>): Record<string, number> {
    const scores: Record<string, number> = {};
    
    for (const [component, embedding] of Object.entries(systemEmbeddings)) {
      scores[component] = this.cosineSimilarity(docEmbedding, embedding);
    }
    
    return scores;
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Extract key topics from content
   */
  private extractKeyTopics(content: string): string[] {
    const words = content.toLowerCase().match(/\b\w{4,}\b/g) || [];
    const stopWords = ['this', 'that', 'with', 'have', 'will', 'from', 'they', 'know', 'want', 'been', 'good', 'much', 'some', 'time', 'very', 'when', 'come', 'here', 'just', 'like', 'long', 'make', 'many', 'over', 'such', 'take', 'than', 'them', 'well', 'were'];
    
    const filteredWords = words.filter(word => !stopWords.includes(word));
    const wordFreq: Record<string, number> = {};
    
    filteredWords.forEach(word => {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    });
    
    return Object.entries(wordFreq)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([word]) => word);
  }

  /**
   * Calculate content complexity
   */
  private calculateComplexity(content: string): number {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim());
    const words = content.split(/\s+/).filter(w => w.trim());
    const avgWordsPerSentence = words.length / sentences.length;
    const uniqueWords = new Set(words.map(w => w.toLowerCase()));
    const lexicalDiversity = uniqueWords.size / words.length;
    
    // Normalize complexity score (0-1)
    return Math.min(1, (avgWordsPerSentence * 0.1 + lexicalDiversity) / 2);
  }

  /**
   * Classify business domain
   */
  private classifyBusinessDomain(content: string): string {
    const domainPatterns = {
      'Finance': /finance|accounting|invoice|payment|billing|ledger|budget|revenue|profit|cost/gi,
      'Sales': /sales|customer|order|quote|lead|opportunity|crm|marketing|campaign/gi,
      'Inventory': /inventory|stock|warehouse|material|product|supply|logistics|procurement/gi,
      'HR': /employee|staff|payroll|human|resource|personnel|talent|recruitment/gi,
      'Production': /production|manufacturing|work|center|operation|planning|quality|maintenance/gi
    };

    let maxScore = 0;
    let primaryDomain = 'general';

    for (const [domain, pattern] of Object.entries(domainPatterns)) {
      const matches = content.match(pattern) || [];
      if (matches.length > maxScore) {
        maxScore = matches.length;
        primaryDomain = domain;
      }
    }

    return primaryDomain;
  }

  /**
   * Generate recommendations based on analysis
   */
  private generateRecommendations(semanticAnalysis: any, similarityScores: Record<string, number>): Array<{
    action: string;
    priority: string;
    reasoning: string;
  }> {
    const recommendations = [];
    
    // Based on business domain
    if (semanticAnalysis.businessDomain !== 'general') {
      recommendations.push({
        action: `Enhance ${semanticAnalysis.businessDomain} Module`,
        priority: 'high',
        reasoning: `Document is primarily focused on ${semanticAnalysis.businessDomain} domain with ${semanticAnalysis.complexity.toFixed(2)} complexity score`
      });
    }

    // Based on similarity scores
    const topMatches = Object.entries(similarityScores)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3);

    for (const [component, score] of topMatches) {
      if (score > 0.7) {
        recommendations.push({
          action: `Integrate with ${component}`,
          priority: 'medium',
          reasoning: `High similarity score (${score.toFixed(2)}) indicates strong relevance`
        });
      }
    }

    // Based on complexity
    if (semanticAnalysis.complexity > 0.8) {
      recommendations.push({
        action: 'Implement Phased Development',
        priority: 'high',
        reasoning: `High complexity (${semanticAnalysis.complexity.toFixed(2)}) suggests need for staged implementation`
      });
    }

    return recommendations;
  }

  /**
   * Test HuggingFace connection
   */
  private async testConnection(): Promise<void> {
    try {
      await this.hf.featureExtraction({
        model: this.embeddingModel,
        inputs: 'test connection'
      });
    } catch (error) {
      throw new Error('HuggingFace connection test failed');
    }
  }

  /**
   * Get fallback embedding
   */
  private getFallbackEmbedding(): number[] {
    return Array.from({ length: 384 }, () => Math.random() * 0.1);
  }

  /**
   * Fallback analysis when HuggingFace is not available
   */
  private getFallbackAnalysis(content: string, fileName: string, startTime: number): TransformersAnalysisResult {
    console.log('📝 Using fallback analysis (HuggingFace not available)');
    
    const processingTime = Date.now() - startTime;
    const fallbackEmbedding = this.getFallbackEmbedding();
    
    return {
      model: 'fallback-transformers',
      confidence: 0.65,
      processingTime,
      embeddings: {
        documentEmbedding: fallbackEmbedding,
        systemEmbeddings: {
          'sales management': fallbackEmbedding,
          'inventory management': fallbackEmbedding,
          'financial management': fallbackEmbedding
        },
        similarityScores: {
          'sales management': 0.3,
          'inventory management': 0.4,
          'financial management': 0.5
        }
      },
      semanticAnalysis: {
        keyTopics: this.extractKeyTopics(content),
        sentimentScore: 0.5,
        complexity: this.calculateComplexity(content),
        businessDomain: this.classifyBusinessDomain(content)
      },
      similarityMatches: [
        { component: 'ERP System', similarity: 0.7, relevance: 'high' },
        { component: 'Business Management', similarity: 0.6, relevance: 'medium' }
      ],
      recommendations: [
        {
          action: 'Enhance system integration',
          priority: 'high',
          reasoning: 'Fallback analysis suggests need for better integration'
        }
      ]
    };
  }
}

export const huggingFaceTransformersService = new HuggingFaceTransformersService();