/**
 * Data Integrity Policy Engine
 * 
 * Strict policy enforcement:
 * 1. NEVER modify user-entered data
 * 2. Only fix technical infrastructure issues
 * 3. Always report data validation errors to users
 * 4. Maintain complete audit trail of all actions
 */

export interface DataIntegrityViolation {
  type: 'USER_DATA' | 'INFRASTRUCTURE' | 'VALIDATION';
  field: string;
  value: any;
  expectedFormat?: string;
  canAutoFix: boolean;
  userActionRequired: boolean;
  message: string;
}

export class DataIntegrityPolicy {
  
  /**
   * Determines if an issue can be automatically resolved without touching user data
   */
  static canAutoResolve(errorMessage: string, category: string, context: any): boolean {
    // NEVER auto-resolve these - always report to user
    const userDataIssues = [
      'invalid format',
      'required field missing',
      'data validation failed',
      'invalid value',
      'format error',
      'missing required',
      'validation error',
      'business rule violation',
      'data entry error'
    ];

    // Check if this is a user data issue
    const isUserDataIssue = userDataIssues.some(pattern => 
      errorMessage.toLowerCase().includes(pattern)
    );

    if (isUserDataIssue) {
      return false; // Always report to user
    }

    // Only auto-resolve infrastructure issues
    const autoResolvableInfrastructure = [
      'foreign key constraint',
      'table does not exist',
      'column does not exist',
      'sequence conflict',
      'connection timeout',
      'deadlock detected',
      'constraint violation (non-data)',
      'index missing',
      'schema mismatch'
    ];

    return autoResolvableInfrastructure.some(pattern => 
      errorMessage.toLowerCase().includes(pattern)
    );
  }

  /**
   * Categorizes error for appropriate handling
   */
  static categorizeDataIssue(errorMessage: string, context: any): DataIntegrityViolation {
    const message = errorMessage.toLowerCase();
    
    // User data validation issues - NEVER auto-fix
    if (message.includes('invalid format') || 
        message.includes('required field') || 
        message.includes('validation failed')) {
      return {
        type: 'USER_DATA',
        field: context.field || 'unknown',
        value: context.value,
        canAutoFix: false,
        userActionRequired: true,
        message: 'Data validation error requires user correction'
      };
    }

    // Infrastructure issues - can auto-fix
    if (message.includes('foreign key') || 
        message.includes('table does not exist') ||
        message.includes('constraint violation')) {
      return {
        type: 'INFRASTRUCTURE',
        field: context.field || 'unknown',
        value: context.value,
        canAutoFix: true,
        userActionRequired: false,
        message: 'Infrastructure issue can be automatically resolved'
      };
    }

    // Business validation - report to user
    return {
      type: 'VALIDATION',
      field: context.field || 'unknown',
      value: context.value,
      canAutoFix: false,
      userActionRequired: true,
      message: 'Business validation requires user review'
    };
  }

  /**
   * Infrastructure fixes that are safe to perform automatically
   */
  static getInfrastructureFixes(errorMessage: string): string[] {
    const fixes: string[] = [];
    const message = errorMessage.toLowerCase();

    if (message.includes('foreign key')) {
      fixes.push('Create missing reference table entries');
      fixes.push('Add foreign key constraint if missing');
    }

    if (message.includes('table does not exist')) {
      fixes.push('Create missing table with proper schema');
      fixes.push('Add necessary indexes and constraints');
    }

    if (message.includes('column does not exist')) {
      fixes.push('Add missing column to table schema');
      fixes.push('Update table structure safely');
    }

    if (message.includes('sequence')) {
      fixes.push('Reset sequence to correct value');
      fixes.push('Resolve sequence conflicts');
    }

    if (message.includes('constraint violation') && !message.includes('data')) {
      fixes.push('Adjust constraint definitions');
      fixes.push('Fix constraint logic');
    }

    return fixes;
  }

  /**
   * Generate user-friendly error report for data issues
   */
  static generateUserReport(violation: DataIntegrityViolation): {
    title: string;
    description: string;
    actionRequired: string;
    field: string;
    suggestedFix: string;
  } {
    return {
      title: `Data Validation Error`,
      description: `The value entered for "${violation.field}" does not meet the required format or business rules.`,
      actionRequired: 'Please review and correct the data entry',
      field: violation.field,
      suggestedFix: violation.expectedFormat 
        ? `Expected format: ${violation.expectedFormat}` 
        : 'Please check the field requirements and enter valid data'
    };
  }

  /**
   * Validates that no user data is being modified in auto-resolution
   */
  static validateNoUserDataModification(operation: string, data: any): boolean {
    const forbiddenOperations = [
      'UPDATE user_entered_data',
      'MODIFY field_values',
      'CHANGE user_input',
      'ALTER submitted_data',
      'TRANSFORM user_values'
    ];

    return !forbiddenOperations.some(forbidden => 
      operation.toLowerCase().includes(forbidden.toLowerCase())
    );
  }

  /**
   * Logs policy enforcement actions
   */
  static logPolicyEnforcement(action: string, reason: string, context: any): void {
    console.log(`[DATA INTEGRITY POLICY] ${action}: ${reason}`, {
      timestamp: new Date().toISOString(),
      context: context,
      policyLevel: 'STRICT_NO_DATA_MODIFICATION'
    });
  }
}

/**
 * Middleware to enforce data integrity policy
 */
export function enforceDataIntegrityPolicy(req: any, res: any, next: any) {
  // Attach policy checker to request
  req.dataIntegrityPolicy = DataIntegrityPolicy;
  
  // Log all data modification attempts
  if (req.method in ['POST', 'PUT', 'PATCH']) {
    DataIntegrityPolicy.logPolicyEnforcement(
      'DATA_MODIFICATION_ATTEMPT',
      `${req.method} request to ${req.path}`,
      { body: req.body, user: req.user }
    );
  }
  
  next();
}