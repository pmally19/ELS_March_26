import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

interface DuplicateAnalysis {
  componentName: string;
  filePath: string;
  codeHash: string;
  duplicatePattern: string;
  specificIssues: string[];
  businessLogicMissing: string[];
  recommendedFix: string;
}

export class TransactionDuplicateAnalyzer {
  private transactionDir = 'client/src/pages/transactions';
  private duplicates: Map<string, DuplicateAnalysis[]> = new Map();
  private codePatterns: Map<string, string[]> = new Map();

  async analyzeAllTransactions(): Promise<{
    duplicateGroups: Map<string, DuplicateAnalysis[]>,
    totalDuplicates: number,
    uniqueComponents: number,
    criticalIssues: string[]
  }> {
    console.log('🔍 Analyzing transaction components for duplicates...');
    
    const files = fs.readdirSync(this.transactionDir)
      .filter(f => f.endsWith('.tsx') && !f.includes('-corrupted'));

    const analyses: DuplicateAnalysis[] = [];
    
    for (const file of files) {
      const analysis = await this.analyzeComponent(file);
      analyses.push(analysis);
    }

    // Group by duplicate patterns
    this.groupDuplicates(analyses);
    
    const criticalIssues = this.identifyCriticalIssues();
    
    return {
      duplicateGroups: this.duplicates,
      totalDuplicates: analyses.length - this.duplicates.size,
      uniqueComponents: this.duplicates.size,
      criticalIssues
    };
  }

  private async analyzeComponent(fileName: string): Promise<DuplicateAnalysis> {
    const filePath = path.join(this.transactionDir, fileName);
    const componentName = fileName.replace('.tsx', '');
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Generate hash for structural similarity
    const structuralCode = this.extractStructuralCode(content);
    const codeHash = crypto.createHash('md5').update(structuralCode).digest('hex');
    
    // Analyze specific issues
    const specificIssues = this.identifySpecificIssues(content, componentName);
    const businessLogicMissing = this.identifyMissingBusinessLogic(content, componentName);
    const duplicatePattern = this.identifyDuplicatePattern(content);
    
    return {
      componentName,
      filePath,
      codeHash,
      duplicatePattern,
      specificIssues,
      businessLogicMissing,
      recommendedFix: this.generateRecommendedFix(componentName, specificIssues, businessLogicMissing)
    };
  }

  private extractStructuralCode(content: string): string {
    // Remove component-specific text but keep structure
    return content
      .replace(/\b[A-Z][a-z]+[A-Z][a-zA-Z]*\b/g, 'COMPONENT_NAME') // Component names
      .replace(/'[^']*'/g, "'STRING'") // String literals
      .replace(/\d+/g, 'NUMBER') // Numbers
      .replace(/\/\*[\s\S]*?\*\//g, '') // Comments
      .replace(/\/\/.*$/gm, '') // Line comments
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  }

  private identifySpecificIssues(content: string, componentName: string): string[] {
    const issues: string[] = [];
    
    // Check for generic sample data
    if (content.includes('Transaction Record 001') || content.includes('Sample ' + componentName.toLowerCase())) {
      issues.push('Using generic sample data instead of business-specific data');
    }
    
    // Check for identical API patterns
    if (content.includes('REF-' + Date.now())) {
      issues.push('Generic reference number generation instead of business-specific format');
    }
    
    // Check for missing business validation
    if (!content.includes('validate') && !content.includes('business rules')) {
      issues.push('Missing business-specific validation logic');
    }
    
    // Check for generic status handling
    if (content.includes("'active' | 'pending' | 'completed' | 'cancelled'") && 
        !this.hasBusinessSpecificStatuses(content, componentName)) {
      issues.push('Generic status model instead of business-specific workflow states');
    }
    
    // Check for missing integration points
    if (!this.hasProperIntegration(content, componentName)) {
      issues.push('Missing integration with related ERP modules');
    }
    
    // Check for identical UI structure
    if (this.hasGenericUIStructure(content)) {
      issues.push('Generic UI template instead of business-specific interface');
    }
    
    return issues;
  }

  private identifyMissingBusinessLogic(content: string, componentName: string): string[] {
    const missing: string[] = [];
    
    const businessLogicMap = {
      'CashManagement': [
        'Bank account reconciliation',
        'Cash flow forecasting',
        'Liquidity planning',
        'Bank statement import',
        'Payment method configuration'
      ],
      'TaxReporting': [
        'Tax calculation engine',
        'Tax jurisdiction handling',
        'VAT processing',
        'Tax return generation',
        'Compliance validation'
      ],
      'IntercompanyTransactions': [
        'Transfer pricing rules',
        'Currency conversion',
        'Elimination entries',
        'Intercompany matching',
        'Consolidation logic'
      ],
      'AccountsPayable': [
        'Vendor invoice matching',
        'Three-way matching',
        'Payment terms calculation',
        'Early payment discounts',
        'Vendor aging analysis'
      ],
      'AccountsReceivable': [
        'Customer credit checks',
        'Invoice generation',
        'Payment allocation',
        'Dunning procedures',
        'Bad debt provisions'
      ]
    };
    
    const expectedLogic = businessLogicMap[componentName] || [];
    
    for (const logic of expectedLogic) {
      if (!content.toLowerCase().includes(logic.toLowerCase().replace(/\s+/g, ''))) {
        missing.push(logic);
      }
    }
    
    return missing;
  }

  private identifyDuplicatePattern(content: string): string {
    if (content.includes('TransactionRecord[]') && content.includes('handleRefresh')) {
      return 'GENERIC_TRANSACTION_TEMPLATE';
    }
    if (content.includes('sampleData: TransactionRecord[]')) {
      return 'SAMPLE_DATA_TEMPLATE';
    }
    if (content.includes('setLoading(true)') && content.includes('setTimeout')) {
      return 'MOCK_LOADING_TEMPLATE';
    }
    return 'UNKNOWN_PATTERN';
  }

  private hasBusinessSpecificStatuses(content: string, componentName: string): boolean {
    const businessStatusMap = {
      'CashManagement': ['reconciled', 'unreconciled', 'cleared'],
      'TaxReporting': ['calculated', 'filed', 'paid', 'audited'],
      'IntercompanyTransactions': ['matched', 'unmatched', 'eliminated']
    };
    
    const expectedStatuses = businessStatusMap[componentName] || [];
    return expectedStatuses.some(status => content.includes(status));
  }

  private hasProperIntegration(content: string, componentName: string): boolean {
    const integrationMap = {
      'CashManagement': ['bank', 'gl_account', 'payment'],
      'TaxReporting': ['gl_entries', 'tax_codes', 'vendor'],
      'IntercompanyTransactions': ['company_codes', 'currency', 'elimination']
    };
    
    const expectedIntegrations = integrationMap[componentName] || [];
    return expectedIntegrations.some(integration => content.includes(integration));
  }

  private hasGenericUIStructure(content: string): boolean {
    const genericPatterns = [
      'Transaction Record 001',
      'Sample transaction',
      'Pending process',
      'Completed entry'
    ];
    
    return genericPatterns.some(pattern => content.includes(pattern));
  }

  private groupDuplicates(analyses: DuplicateAnalysis[]): void {
    const hashGroups: Map<string, DuplicateAnalysis[]> = new Map();
    
    for (const analysis of analyses) {
      if (!hashGroups.has(analysis.codeHash)) {
        hashGroups.set(analysis.codeHash, []);
      }
      hashGroups.get(analysis.codeHash)!.push(analysis);
    }
    
    // Only keep groups with duplicates
    for (const [hash, group] of hashGroups) {
      if (group.length > 1) {
        this.duplicates.set(hash, group);
      }
    }
  }

  private identifyCriticalIssues(): string[] {
    const issues: string[] = [];
    
    // Check for widespread duplication
    for (const [hash, group] of this.duplicates) {
      if (group.length > 5) {
        issues.push(`Critical: ${group.length} components share identical code structure`);
      }
    }
    
    // Check for missing business logic across components
    const componentsWithMissingLogic = Array.from(this.duplicates.values())
      .flat()
      .filter(analysis => analysis.businessLogicMissing.length > 3)
      .length;
    
    if (componentsWithMissingLogic > 10) {
      issues.push(`Critical: ${componentsWithMissingLogic} components missing essential business logic`);
    }
    
    return issues;
  }

  private generateRecommendedFix(componentName: string, issues: string[], missing: string[]): string {
    const fixes: string[] = [];
    
    fixes.push(`1. Replace generic data with ${componentName}-specific business data`);
    fixes.push(`2. Implement proper ${componentName} business validation rules`);
    fixes.push(`3. Add integration with related ERP modules`);
    
    if (missing.length > 0) {
      fixes.push(`4. Implement missing business logic: ${missing.slice(0, 3).join(', ')}`);
    }
    
    fixes.push(`5. Create ${componentName}-specific UI components and workflows`);
    
    return fixes.join('\n');
  }

  async generateDetailedReport(): Promise<string> {
    const analysis = await this.analyzeAllTransactions();
    
    let report = `# Transaction Components Duplicate Analysis Report\n\n`;
    report += `## Summary\n`;
    report += `- Total Components Analyzed: ${analysis.totalDuplicates + analysis.uniqueComponents}\n`;
    report += `- Unique Components: ${analysis.uniqueComponents}\n`;
    report += `- Duplicate Components: ${analysis.totalDuplicates}\n`;
    report += `- Critical Issues: ${analysis.criticalIssues.length}\n\n`;
    
    if (analysis.criticalIssues.length > 0) {
      report += `## Critical Issues\n`;
      analysis.criticalIssues.forEach(issue => {
        report += `- ❌ ${issue}\n`;
      });
      report += `\n`;
    }
    
    report += `## Duplicate Groups\n\n`;
    
    let groupIndex = 1;
    for (const [hash, group] of analysis.duplicateGroups) {
      report += `### Group ${groupIndex} (${group.length} identical components)\n`;
      report += `**Components:** ${group.map(g => g.componentName).join(', ')}\n`;
      report += `**Pattern:** ${group[0].duplicatePattern}\n\n`;
      
      report += `**Common Issues:**\n`;
      const commonIssues = group[0].specificIssues;
      commonIssues.forEach(issue => {
        report += `- ${issue}\n`;
      });
      
      report += `\n**Missing Business Logic:**\n`;
      group.forEach(component => {
        if (component.businessLogicMissing.length > 0) {
          report += `- **${component.componentName}:** ${component.businessLogicMissing.join(', ')}\n`;
        }
      });
      
      report += `\n**Recommended Fix:**\n${group[0].recommendedFix}\n\n`;
      report += `---\n\n`;
      groupIndex++;
    }
    
    return report;
  }
}

export const transactionAnalyzer = new TransactionDuplicateAnalyzer();