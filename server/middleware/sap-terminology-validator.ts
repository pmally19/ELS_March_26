import { Request, Response, NextFunction } from 'express';

// Prohibited SAP terminology that should never appear in MallyERP
const prohibitedTerms = [
  'sap', 'company code', 'plant', 'movement type', 'material master',
  'vendor master', 'customer master', 'purchase organization', 
  'sales organization', 'cost center', 'profit center', 'work center',
  'routing', 'bom', 'bill of material', 'mrp', 'goods receipt',
  'goods issue', 'transfer posting', 'physical inventory',
  'posting key', 'document type', 'number range', 'field status',
  'tolerance group', 'authorization object', 'user exit',
  'enhancement', 'customizing', 'client', 'transport',
  'change request', 'mara', 'marc', 'mard', 'kna1', 'knvv',
  'lfa1', 'lfm1', 'ekko', 'ekpo', 'vbak', 'vbap', 'bkpf', 'bseg'
];

// MallyERP approved alternatives
const approvedAlternatives = {
  'company code': 'business entity',
  'plant': 'facility',
  'movement type': 'transaction type',
  'material master': 'product catalog',
  'vendor master': 'supplier directory',
  'customer master': 'client database',
  'purchase organization': 'procurement division',
  'sales organization': 'sales division',
  'cost center': 'budget center',
  'profit center': 'revenue center',
  'work center': 'production unit',
  'routing': 'process flow',
  'bill of material': 'component list',
  'bom': 'component list',
  'mrp': 'demand planning',
  'goods receipt': 'inventory receipt',
  'goods issue': 'inventory issue',
  'transfer posting': 'stock transfer',
  'physical inventory': 'stock count',
  'posting key': 'transaction code',
  'document type': 'record type',
  'number range': 'id sequence'
};

/**
 * Middleware to validate that no SAP terminology is used in API requests
 * This enforces the MallyERP brand identity and business requirements
 */
export function validateNoSAPTerminology(req: Request, res: Response, next: NextFunction) {
  const requestBody = JSON.stringify(req.body).toLowerCase();
  const requestQuery = JSON.stringify(req.query).toLowerCase();
  const requestPath = req.path.toLowerCase();
  
  // Check for prohibited terms in request data
  for (const term of prohibitedTerms) {
    if (requestBody.includes(term.toLowerCase()) || 
        requestQuery.includes(term.toLowerCase()) || 
        requestPath.includes(term.toLowerCase())) {
      
      const alternative = approvedAlternatives[term] || 'MallyERP business terminology';
      
      return res.status(400).json({
        error: 'SAP Terminology Violation',
        message: `The term "${term}" is prohibited in MallyERP. Use "${alternative}" instead.`,
        violationType: 'SAP_TERMINOLOGY_FORBIDDEN',
        suggestedAlternative: alternative,
        compliance: 'This violates MallyERP brand identity requirements'
      });
    }
  }
  
  next();
}

/**
 * Validate database table and column names for SAP terminology
 */
export function validateDatabaseNaming(tableName: string, columns?: string[]): boolean {
  const nameToCheck = tableName.toLowerCase();
  
  // Check table name
  for (const term of prohibitedTerms) {
    if (nameToCheck.includes(term.toLowerCase())) {
      console.warn(`SAP Terminology Warning: Table name "${tableName}" contains prohibited term "${term}"`);
      return false;
    }
  }
  
  // Check column names if provided
  if (columns) {
    for (const column of columns) {
      const columnNameToCheck = column.toLowerCase();
      for (const term of prohibitedTerms) {
        if (columnNameToCheck.includes(term.toLowerCase())) {
          console.warn(`SAP Terminology Warning: Column name "${column}" contains prohibited term "${term}"`);
          return false;
        }
      }
    }
  }
  
  return true;
}

/**
 * Clean text content of SAP terminology and replace with MallyERP alternatives
 */
export function cleanSAPTerminology(text: string): string {
  let cleanedText = text;
  
  for (const [sapTerm, mallyAlternative] of Object.entries(approvedAlternatives)) {
    const regex = new RegExp(sapTerm, 'gi');
    cleanedText = cleanedText.replace(regex, mallyAlternative);
  }
  
  return cleanedText;
}

/**
 * AI Agent compliance checker
 */
export function validateAIAgentCompliance(agentOutput: any): {
  compliant: boolean;
  violations: string[];
  suggestions: string[];
} {
  const violations: string[] = [];
  const suggestions: string[] = [];
  const outputText = JSON.stringify(agentOutput).toLowerCase();
  
  for (const term of prohibitedTerms) {
    if (outputText.includes(term.toLowerCase())) {
      violations.push(term);
      const alternative = approvedAlternatives[term];
      if (alternative) {
        suggestions.push(`Replace "${term}" with "${alternative}"`);
      }
    }
  }
  
  return {
    compliant: violations.length === 0,
    violations,
    suggestions
  };
}