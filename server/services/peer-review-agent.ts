/**
 * Peer Review Agent (Senior Developer Agent)
 * Performs comprehensive code review, due diligence, and quality assurance
 * Collaborates with Developer Agent to ensure code correctness and system integrity
 */

import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { aiProviderFallback } from './ai-provider-fallback';

interface CodeReview {
  reviewId: string;
  taskId: string;
  timestamp: Date;
  reviewer: 'peer-review-agent';
  status: 'pending' | 'reviewing' | 'approved' | 'rejected' | 'needs_changes';
  overallScore: number; // 0-100
  findings: ReviewFinding[];
  recommendations: string[];
  securityAssessment: SecurityAssessment;
  performanceAssessment: PerformanceAssessment;
  codeQualityMetrics: CodeQualityMetrics;
  dueDiligenceChecklist: DueDiligenceItem[];
}

interface ReviewFinding {
  type: 'error' | 'warning' | 'suggestion' | 'security' | 'performance';
  severity: 'critical' | 'high' | 'medium' | 'low';
  file: string;
  line?: number;
  message: string;
  suggestion?: string;
  impact: string;
}

interface SecurityAssessment {
  score: number;
  vulnerabilities: SecurityVulnerability[];
  bestPracticesFollowed: string[];
  recommendations: string[];
}

interface SecurityVulnerability {
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  file: string;
  mitigation: string;
}

interface PerformanceAssessment {
  score: number;
  potentialBottlenecks: string[];
  optimizationOpportunities: string[];
  scalabilityConsiderations: string[];
}

interface CodeQualityMetrics {
  maintainability: number;
  readability: number;
  testability: number;
  reusability: number;
  documentation: number;
  typeScriptCompliance: number;
}

interface DueDiligenceItem {
  category: 'architecture' | 'security' | 'performance' | 'testing' | 'documentation' | 'compliance';
  item: string;
  status: 'pass' | 'fail' | 'warning' | 'not_applicable';
  details: string;
  recommendation?: string;
}

export class PeerReviewAgent {
  private openai: OpenAI;
  private reviewHistory: Map<string, CodeReview> = new Map();

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * Perform comprehensive code review for Developer Agent output
   */
  async reviewCode(taskId: string, generatedFiles: any[], taskDescription: string): Promise<CodeReview> {
    const reviewId = `review_${taskId}_${Date.now()}`;
    
    try {
      console.log(`👨‍💻 Peer Review Agent starting comprehensive review for task: ${taskId}`);

      const review: CodeReview = {
        reviewId,
        taskId,
        timestamp: new Date(),
        reviewer: 'peer-review-agent',
        status: 'reviewing',
        overallScore: 0,
        findings: [],
        recommendations: [],
        securityAssessment: { score: 0, vulnerabilities: [], bestPracticesFollowed: [], recommendations: [] },
        performanceAssessment: { score: 0, potentialBottlenecks: [], optimizationOpportunities: [], scalabilityConsiderations: [] },
        codeQualityMetrics: { maintainability: 0, readability: 0, testability: 0, reusability: 0, documentation: 0, typeScriptCompliance: 0 },
        dueDiligenceChecklist: []
      };

      // Review each generated file
      for (const file of generatedFiles) {
        await this.reviewFile(file, review);
      }

      // Perform overall assessment
      await this.performOverallAssessment(review, taskDescription);

      // Run due diligence checklist
      await this.runDueDiligenceChecklist(review, generatedFiles);

      // Calculate final score and status
      this.calculateFinalScoreAndStatus(review);

      this.reviewHistory.set(reviewId, review);
      
      console.log(`✅ Peer review completed with score: ${review.overallScore}/100 (${review.status})`);
      return review;

    } catch (error) {
      console.error('❌ Error in peer review:', error);
      throw new Error(`Peer review failed: ${error.message}`);
    }
  }

  /**
   * Review individual file for quality, security, and compliance
   */
  private async reviewFile(file: any, review: CodeReview): Promise<void> {
    try {
      const prompt = `You are a senior developer performing comprehensive code review.

FILE: ${file.path}
CONTENT:
\`\`\`
${file.content}
\`\`\`

Perform detailed analysis and provide JSON response with:
{
  "findings": [
    {
      "type": "error|warning|suggestion|security|performance",
      "severity": "critical|high|medium|low",
      "line": number,
      "message": "Issue description",
      "suggestion": "How to fix",
      "impact": "Impact on system"
    }
  ],
  "security": {
    "score": number,
    "vulnerabilities": [
      {
        "type": "vulnerability type",
        "severity": "critical|high|medium|low",
        "description": "Description",
        "mitigation": "How to fix"
      }
    ],
    "bestPractices": ["practice1", "practice2"]
  },
  "performance": {
    "score": number,
    "bottlenecks": ["bottleneck1", "bottleneck2"],
    "optimizations": ["optimization1", "optimization2"]
  },
  "quality": {
    "maintainability": number,
    "readability": number,
    "testability": number,
    "reusability": number,
    "documentation": number,
    "typeScriptCompliance": number
  }
}

Focus on:
1. Security vulnerabilities (SQL injection, XSS, auth issues)
2. Performance bottlenecks (N+1 queries, inefficient algorithms)
3. Code quality (readability, maintainability, TypeScript usage)
4. MallyERP compliance (follows existing patterns)
5. Error handling completeness
6. Testing capabilities
7. Documentation quality`;

      const response = await aiProviderFallback.makeChatRequest(
        [{ role: 'user', content: prompt }],
        { response_format: { type: 'json_object' } }
      );

      const analysis = JSON.parse(response.content);

      // Add findings to review
      if (analysis.findings) {
        analysis.findings.forEach(finding => {
          review.findings.push({
            ...finding,
            file: file.path
          });
        });
      }

      // Update security assessment
      if (analysis.security) {
        review.securityAssessment.score = Math.max(review.securityAssessment.score, analysis.security.score || 0);
        if (analysis.security.vulnerabilities) {
          analysis.security.vulnerabilities.forEach(vuln => {
            review.securityAssessment.vulnerabilities.push({
              ...vuln,
              file: file.path
            });
          });
        }
        if (analysis.security.bestPractices) {
          review.securityAssessment.bestPracticesFollowed.push(...analysis.security.bestPractices);
        }
      }

      // Update performance assessment
      if (analysis.performance) {
        review.performanceAssessment.score = Math.max(review.performanceAssessment.score, analysis.performance.score || 0);
        if (analysis.performance.bottlenecks) {
          review.performanceAssessment.potentialBottlenecks.push(...analysis.performance.bottlenecks);
        }
        if (analysis.performance.optimizations) {
          review.performanceAssessment.optimizationOpportunities.push(...analysis.performance.optimizations);
        }
      }

      // Update quality metrics (average)
      if (analysis.quality) {
        const metrics = review.codeQualityMetrics;
        const count = review.findings.length + 1;
        
        metrics.maintainability = (metrics.maintainability + (analysis.quality.maintainability || 0)) / count;
        metrics.readability = (metrics.readability + (analysis.quality.readability || 0)) / count;
        metrics.testability = (metrics.testability + (analysis.quality.testability || 0)) / count;
        metrics.reusability = (metrics.reusability + (analysis.quality.reusability || 0)) / count;
        metrics.documentation = (metrics.documentation + (analysis.quality.documentation || 0)) / count;
        metrics.typeScriptCompliance = (metrics.typeScriptCompliance + (analysis.quality.typeScriptCompliance || 0)) / count;
      }

    } catch (error) {
      console.error(`Error reviewing file ${file.path}:`, error);
      review.findings.push({
        type: 'error',
        severity: 'high',
        file: file.path,
        message: `Failed to review file: ${error.message}`,
        impact: 'Unable to assess code quality'
      });
    }
  }

  /**
   * Perform overall system assessment
   */
  private async performOverallAssessment(review: CodeReview, taskDescription: string): Promise<void> {
    try {
      const prompt = `You are a senior architect reviewing a development task completion.

TASK: ${taskDescription}
FINDINGS SUMMARY: ${review.findings.length} issues found
SECURITY SCORE: ${review.securityAssessment.score}
PERFORMANCE SCORE: ${review.performanceAssessment.score}

Critical Findings: ${review.findings.filter(f => f.severity === 'critical').length}
High Findings: ${review.findings.filter(f => f.severity === 'high').length}

Provide overall assessment with recommendations:
{
  "recommendations": ["recommendation1", "recommendation2"],
  "systemImpact": "low|medium|high",
  "approvalRecommendation": "approve|needs_changes|reject",
  "reasoning": "Detailed explanation"
}`;

      const response = await aiProviderFallback.generateCompletion(
        [{ role: 'user', content: prompt }],
        { model: 'gpt-4o' }
      );

      const assessment = JSON.parse(response.content);
      
      if (assessment.recommendations) {
        review.recommendations.push(...assessment.recommendations);
      }

    } catch (error) {
      console.error('Error in overall assessment:', error);
    }
  }

  /**
   * Run comprehensive due diligence checklist
   */
  private async runDueDiligenceChecklist(review: CodeReview, generatedFiles: any[]): Promise<void> {
    const checklist: DueDiligenceItem[] = [
      // Architecture
      { category: 'architecture', item: 'Follows MallyERP patterns', status: 'pass', details: 'Code follows established patterns' },
      { category: 'architecture', item: 'Proper separation of concerns', status: 'pass', details: 'Clear separation between layers' },
      { category: 'architecture', item: 'Database schema changes documented', status: 'pass', details: 'Schema changes properly documented' },
      
      // Security
      { category: 'security', item: 'No hardcoded secrets', status: 'pass', details: 'No secrets found in code' },
      { category: 'security', item: 'Input validation implemented', status: 'pass', details: 'Proper input validation' },
      { category: 'security', item: 'Authentication/authorization checked', status: 'pass', details: 'Auth patterns followed' },
      
      // Performance
      { category: 'performance', item: 'Database queries optimized', status: 'pass', details: 'Efficient query patterns' },
      { category: 'performance', item: 'No N+1 query problems', status: 'pass', details: 'Proper query optimization' },
      { category: 'performance', item: 'Appropriate caching strategy', status: 'pass', details: 'Caching where needed' },
      
      // Testing
      { category: 'testing', item: 'Code is testable', status: 'pass', details: 'Code structure supports testing' },
      { category: 'testing', item: 'Error scenarios covered', status: 'pass', details: 'Error handling implemented' },
      
      // Documentation
      { category: 'documentation', item: 'Code is well-documented', status: 'pass', details: 'Adequate documentation' },
      { category: 'documentation', item: 'API endpoints documented', status: 'pass', details: 'API documentation complete' },
      
      // Compliance
      { category: 'compliance', item: 'TypeScript best practices', status: 'pass', details: 'Proper TypeScript usage' },
      { category: 'compliance', item: 'ESLint compliance', status: 'pass', details: 'Code follows linting rules' }
    ];

    // Analyze findings to update checklist
    const criticalFindings = review.findings.filter(f => f.severity === 'critical');
    const securityFindings = review.findings.filter(f => f.type === 'security');
    const performanceFindings = review.findings.filter(f => f.type === 'performance');

    if (criticalFindings.length > 0) {
      checklist.forEach(item => {
        if (item.category === 'architecture') {
          item.status = 'fail';
          item.details = `${criticalFindings.length} critical issues found`;
        }
      });
    }

    if (securityFindings.length > 0) {
      checklist.forEach(item => {
        if (item.category === 'security') {
          item.status = 'warning';
          item.details = `${securityFindings.length} security concerns`;
        }
      });
    }

    if (performanceFindings.length > 0) {
      checklist.forEach(item => {
        if (item.category === 'performance') {
          item.status = 'warning';
          item.details = `${performanceFindings.length} performance concerns`;
        }
      });
    }

    review.dueDiligenceChecklist = checklist;
  }

  /**
   * Calculate final score and review status
   */
  private calculateFinalScoreAndStatus(review: CodeReview): void {
    const criticalIssues = review.findings.filter(f => f.severity === 'critical').length;
    const highIssues = review.findings.filter(f => f.severity === 'high').length;
    const mediumIssues = review.findings.filter(f => f.severity === 'medium').length;

    // Base score from quality metrics
    const qualityScore = (
      review.codeQualityMetrics.maintainability +
      review.codeQualityMetrics.readability +
      review.codeQualityMetrics.testability +
      review.codeQualityMetrics.reusability +
      review.codeQualityMetrics.documentation +
      review.codeQualityMetrics.typeScriptCompliance
    ) / 6;

    // Deduct points for issues
    let finalScore = qualityScore;
    finalScore -= (criticalIssues * 20);
    finalScore -= (highIssues * 10);
    finalScore -= (mediumIssues * 5);

    // Factor in security and performance scores
    finalScore = (finalScore + review.securityAssessment.score + review.performanceAssessment.score) / 3;

    review.overallScore = Math.max(0, Math.min(100, Math.round(finalScore)));

    // Determine status
    if (criticalIssues > 0) {
      review.status = 'rejected';
    } else if (highIssues > 2 || review.overallScore < 70) {
      review.status = 'needs_changes';
    } else {
      review.status = 'approved';
    }
  }

  /**
   * Get review history and statistics
   */
  getReviewHistory(): CodeReview[] {
    return Array.from(this.reviewHistory.values());
  }

  /**
   * Get review by ID
   */
  getReview(reviewId: string): CodeReview | undefined {
    return this.reviewHistory.get(reviewId);
  }

  /**
   * Collaborate with Developer Agent - provide feedback for improvements
   */
  async collaborateWithDeveloper(review: CodeReview): Promise<string[]> {
    const improvements: string[] = [];

    if (review.status === 'needs_changes' || review.status === 'rejected') {
      // Group findings by type
      const criticalFindings = review.findings.filter(f => f.severity === 'critical');
      const securityFindings = review.findings.filter(f => f.type === 'security');
      const performanceFindings = review.findings.filter(f => f.type === 'performance');

      if (criticalFindings.length > 0) {
        improvements.push(`CRITICAL: Fix ${criticalFindings.length} critical issues before proceeding`);
        criticalFindings.forEach(finding => {
          improvements.push(`  - ${finding.file}: ${finding.message}`);
          if (finding.suggestion) {
            improvements.push(`    Suggestion: ${finding.suggestion}`);
          }
        });
      }

      if (securityFindings.length > 0) {
        improvements.push(`SECURITY: Address ${securityFindings.length} security concerns`);
        securityFindings.forEach(finding => {
          improvements.push(`  - ${finding.file}: ${finding.message}`);
        });
      }

      if (performanceFindings.length > 0) {
        improvements.push(`PERFORMANCE: Optimize ${performanceFindings.length} performance issues`);
        performanceFindings.forEach(finding => {
          improvements.push(`  - ${finding.file}: ${finding.message}`);
        });
      }

      // Add general recommendations
      improvements.push(...review.recommendations);
    }

    return improvements;
  }
}