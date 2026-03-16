/**
 * Error Analysis Agent - Comprehensive Error Detection and Reporting
 * Analyzes data integrity issues, UI-database synchronization problems, and generates fix recommendations
 */

const { pool } = require('../db');

class ErrorAnalysisAgent {
  constructor() {
    this.errorCategories = {
      DATA_INTEGRITY: 'data_integrity',
      UI_DATABASE_SYNC: 'ui_database_sync',
      TABLE_STRUCTURE: 'table_structure',
      BUSINESS_LOGIC: 'business_logic',
      CONFIGURATION: 'configuration'
    };
  }

  /**
   * Comprehensive error analysis for a company's data
   */
  async analyzeCompanyErrors(companyId) {
    console.log(`🔍 Starting comprehensive error analysis for company ${companyId}...`);
    
    const analysis = {
      companyId,
      timestamp: new Date().toISOString(),
      errors: [],
      warnings: [],
      recommendations: [],
      fixableIssues: [],
      criticalIssues: []
    };

    try {
      // Get company information
      const companyResult = await pool.query('SELECT * FROM company_codes WHERE id = $1', [companyId]);
      if (companyResult.rows.length === 0) {
        analysis.criticalIssues.push({
          category: this.errorCategories.DATA_INTEGRITY,
          severity: 'CRITICAL',
          issue: 'Company not found',
          description: `Company ID ${companyId} does not exist in the database`,
          fixable: false,
          recommendation: 'Verify company ID or create company record'
        });
        return analysis;
      }

      const company = companyResult.rows[0];
      analysis.companyInfo = company;

      // 1. Data Integrity Checks
      await this.checkDataIntegrity(analysis, company);

      // 2. UI-Database Synchronization Checks  
      await this.checkUIDatabaseSync(analysis, company);

      // 3. Table Structure Validation
      await this.checkTableStructure(analysis, company);

      // 4. Business Logic Validation
      await this.checkBusinessLogic(analysis, company);

      // 5. Configuration Validation
      await this.checkConfiguration(analysis, company);

      // Generate fix recommendations
      this.generateFixRecommendations(analysis);

      console.log(`✅ Error analysis completed. Found ${analysis.errors.length} errors, ${analysis.warnings.length} warnings`);
      return analysis;

    } catch (error) {
      console.error('Error during analysis:', error);
      analysis.criticalIssues.push({
        category: 'SYSTEM_ERROR',
        severity: 'CRITICAL',
        issue: 'Analysis system failure',
        description: error.message,
        fixable: false
      });
      return analysis;
    }
  }

  /**
   * Check data integrity across related tables
   */
  async checkDataIntegrity(analysis, company) {
    const checks = [
      {
        name: 'Vendor Master Data',
        query: `SELECT COUNT(*) as count FROM benjamin_vendors WHERE company_code = $1`,
        params: [company.code],
        expectedMin: 1,
        table: 'benjamin_vendors'
      },
      {
        name: 'Plant Data',
        query: `SELECT COUNT(*) as count FROM plants WHERE company_code_id = $1`,
        params: [company.id],
        expectedMin: 1,
        table: 'plants'
      },
      {
        name: 'Customer Data',
        query: `SELECT COUNT(*) as count FROM customers WHERE company_code_id = $1`,
        params: [company.id],
        expectedMin: 1,
        table: 'customers'
      },
      {
        name: 'Chart of Accounts',
        query: `SELECT COUNT(*) as count FROM chart_of_accounts WHERE company_code_id = $1`,
        params: [company.id],
        expectedMin: 5,
        table: 'chart_of_accounts'
      }
    ];

    for (const check of checks) {
      try {
        const result = await pool.query(check.query, check.params);
        const count = parseInt(result.rows[0].count);
        
        if (count < check.expectedMin) {
          analysis.errors.push({
            category: this.errorCategories.DATA_INTEGRITY,
            severity: count === 0 ? 'HIGH' : 'MEDIUM',
            issue: `Insufficient ${check.name}`,
            description: `Found ${count} records, expected at least ${check.expectedMin}`,
            table: check.table,
            fixable: true,
            autoFixAction: 'POPULATE_MASTER_DATA'
          });
        }
      } catch (error) {
        analysis.errors.push({
          category: this.errorCategories.TABLE_STRUCTURE,
          severity: 'HIGH',
          issue: `Table access failure: ${check.table}`,
          description: error.message,
          table: check.table,
          fixable: true,
          autoFixAction: 'CREATE_MISSING_TABLE'
        });
      }
    }
  }

  /**
   * Check UI-Database synchronization
   */
  async checkUIDatabaseSync(analysis, company) {
    const uiExpectedCounts = {
      'benjamin_vendors': { screen: 'Vendor Master', path: '/master-data/vendors' },
      'plants': { screen: 'Plant Management', path: '/master-data/plants' },
      'customers': { screen: 'Customer Master', path: '/master-data/customers' },
      'chart_of_accounts': { screen: 'Chart of Accounts', path: '/finance/gl' }
    };

    for (const [tableName, uiInfo] of Object.entries(uiExpectedCounts)) {
      try {
        let query, params;
        if (tableName === 'benjamin_vendors') {
          query = `SELECT COUNT(*) as count FROM ${tableName} WHERE company_code = $1`;
          params = [company.code];
        } else {
          query = `SELECT COUNT(*) as count FROM ${tableName} WHERE company_code_id = $1`;
          params = [company.id];
        }

        const result = await pool.query(query, params);
        const dbCount = parseInt(result.rows[0].count);
        
        // Simulate UI check (in real implementation, this would call UI endpoints)
        const uiAccessible = true; // Mock UI accessibility check
        
        if (!uiAccessible) {
          analysis.errors.push({
            category: this.errorCategories.UI_DATABASE_SYNC,
            severity: 'HIGH',
            issue: `UI screen not accessible: ${uiInfo.screen}`,
            description: `Cannot access ${uiInfo.path} - UI component may be broken`,
            table: tableName,
            fixable: true,
            autoFixAction: 'FIX_UI_ROUTING'
          });
        }

        if (dbCount > 0 && !uiAccessible) {
          analysis.warnings.push({
            category: this.errorCategories.UI_DATABASE_SYNC,
            severity: 'MEDIUM',
            issue: `Data exists but UI not accessible`,
            description: `${dbCount} records in ${tableName} but UI screen ${uiInfo.screen} not working`,
            table: tableName,
            fixable: true
          });
        }
      } catch (error) {
        analysis.errors.push({
          category: this.errorCategories.UI_DATABASE_SYNC,
          severity: 'HIGH',
          issue: `Sync check failed for ${tableName}`,
          description: error.message,
          table: tableName,
          fixable: false
        });
      }
    }
  }

  /**
   * Check table structure consistency
   */
  async checkTableStructure(analysis, company) {
    const requiredTables = [
      'benjamin_vendors', 'plants', 'customers', 'chart_of_accounts',
      'company_codes', 'accounts_receivable', 'accounts_payable'
    ];

    for (const tableName of requiredTables) {
      try {
        const structureResult = await pool.query(`
          SELECT column_name, data_type, is_nullable 
          FROM information_schema.columns 
          WHERE table_name = $1
        `, [tableName]);

        if (structureResult.rows.length === 0) {
          analysis.errors.push({
            category: this.errorCategories.TABLE_STRUCTURE,
            severity: 'CRITICAL',
            issue: `Missing table: ${tableName}`,
            description: `Required table ${tableName} does not exist`,
            table: tableName,
            fixable: true,
            autoFixAction: 'CREATE_TABLE'
          });
        } else {
          // Check for required columns based on table type
          const columns = structureResult.rows.map(row => row.column_name);
          
          if (tableName === 'benjamin_vendors' && !columns.includes('company_code')) {
            analysis.errors.push({
              category: this.errorCategories.TABLE_STRUCTURE,
              severity: 'HIGH',
              issue: `Missing required column in ${tableName}`,
              description: 'company_code column missing from benjamin_vendors table',
              table: tableName,
              fixable: true,
              autoFixAction: 'ADD_COLUMN'
            });
          }
        }
      } catch (error) {
        analysis.errors.push({
          category: this.errorCategories.TABLE_STRUCTURE,
          severity: 'HIGH',
          issue: `Structure check failed for ${tableName}`,
          description: error.message,
          table: tableName,
          fixable: false
        });
      }
    }
  }

  /**
   * Check business logic consistency
   */
  async checkBusinessLogic(analysis, company) {
    // Check for orphaned records
    try {
      const orphanChecks = [
        {
          name: 'Vendors without company',
          query: `SELECT COUNT(*) as count FROM benjamin_vendors WHERE company_code NOT IN (SELECT code FROM company_codes)`
        },
        {
          name: 'Plants without company',
          query: `SELECT COUNT(*) as count FROM plants WHERE company_code_id NOT IN (SELECT id FROM company_codes)`
        }
      ];

      for (const check of orphanChecks) {
        const result = await pool.query(check.query);
        const count = parseInt(result.rows[0].count);
        
        if (count > 0) {
          analysis.warnings.push({
            category: this.errorCategories.BUSINESS_LOGIC,
            severity: 'MEDIUM',
            issue: check.name,
            description: `Found ${count} orphaned records`,
            fixable: true,
            autoFixAction: 'CLEAN_ORPHANED_RECORDS'
          });
        }
      }
    } catch (error) {
      analysis.warnings.push({
        category: this.errorCategories.BUSINESS_LOGIC,
        severity: 'LOW',
        issue: 'Business logic check failed',
        description: error.message,
        fixable: false
      });
    }
  }

  /**
   * Check system configuration
   */
  async checkConfiguration(analysis, company) {
    // Check if company has proper configuration
    const requiredConfig = ['currency', 'country'];
    
    for (const field of requiredConfig) {
      if (!company[field] || company[field].trim() === '') {
        analysis.warnings.push({
          category: this.errorCategories.CONFIGURATION,
          severity: 'LOW',
          issue: `Missing ${field} configuration`,
          description: `Company ${company.code} missing ${field} setting`,
          fixable: true,
          autoFixAction: 'UPDATE_COMPANY_CONFIG'
        });
      }
    }
  }

  /**
   * Generate fix recommendations and prioritize fixable issues
   */
  generateFixRecommendations(analysis) {
    // Separate fixable from non-fixable issues
    analysis.fixableIssues = [...analysis.errors, ...analysis.warnings].filter(issue => issue.fixable);
    
    // Generate specific fix recommendations
    const fixActions = {
      'POPULATE_MASTER_DATA': 'Run master data population script',
      'CREATE_MISSING_TABLE': 'Execute table creation migration',
      'FIX_UI_ROUTING': 'Repair UI component routing',
      'ADD_COLUMN': 'Alter table to add missing columns',
      'CREATE_TABLE': 'Create missing database table',
      'CLEAN_ORPHANED_RECORDS': 'Remove or fix orphaned data records',
      'UPDATE_COMPANY_CONFIG': 'Update company configuration settings'
    };

    const fixGroups = {};
    analysis.fixableIssues.forEach(issue => {
      const action = issue.autoFixAction;
      if (action && fixActions[action]) {
        if (!fixGroups[action]) {
          fixGroups[action] = {
            action: fixActions[action],
            issues: [],
            priority: this.getFixPriority(action),
            estimatedTime: this.getEstimatedFixTime(action)
          };
        }
        fixGroups[action].issues.push(issue);
      }
    });

    analysis.recommendations = Object.values(fixGroups).sort((a, b) => b.priority - a.priority);
  }

  getFixPriority(action) {
    const priorities = {
      'CREATE_TABLE': 10,
      'CREATE_MISSING_TABLE': 9,
      'ADD_COLUMN': 8,
      'POPULATE_MASTER_DATA': 7,
      'FIX_UI_ROUTING': 6,
      'UPDATE_COMPANY_CONFIG': 5,
      'CLEAN_ORPHANED_RECORDS': 4
    };
    return priorities[action] || 1;
  }

  getEstimatedFixTime(action) {
    const times = {
      'CREATE_TABLE': '2-3 minutes',
      'CREATE_MISSING_TABLE': '2-3 minutes',
      'ADD_COLUMN': '1 minute',
      'POPULATE_MASTER_DATA': '3-5 minutes',
      'FIX_UI_ROUTING': '5-10 minutes',
      'UPDATE_COMPANY_CONFIG': '1 minute',
      'CLEAN_ORPHANED_RECORDS': '2 minutes'
    };
    return times[action] || 'Unknown';
  }

  /**
   * Generate detailed error report
   */
  generateErrorReport(analysis) {
    const report = {
      summary: {
        companyId: analysis.companyId,
        companyCode: analysis.companyInfo?.code,
        companyName: analysis.companyInfo?.name,
        analysisTimestamp: analysis.timestamp,
        totalErrors: analysis.errors.length,
        totalWarnings: analysis.warnings.length,
        fixableIssues: analysis.fixableIssues.length,
        criticalIssues: analysis.criticalIssues.length
      },
      errorBreakdown: {
        byCategory: this.groupByCategory(analysis.errors),
        bySeverity: this.groupBySeverity(analysis.errors),
        byTable: this.groupByTable(analysis.errors)
      },
      fixRecommendations: analysis.recommendations,
      nextSteps: this.generateNextSteps(analysis)
    };

    return report;
  }

  groupByCategory(issues) {
    return issues.reduce((acc, issue) => {
      acc[issue.category] = (acc[issue.category] || 0) + 1;
      return acc;
    }, {});
  }

  groupBySeverity(issues) {
    return issues.reduce((acc, issue) => {
      acc[issue.severity] = (acc[issue.severity] || 0) + 1;
      return acc;
    }, {});
  }

  groupByTable(issues) {
    return issues.reduce((acc, issue) => {
      if (issue.table) {
        acc[issue.table] = (acc[issue.table] || 0) + 1;
      }
      return acc;
    }, {});
  }

  generateNextSteps(analysis) {
    const steps = [];
    
    if (analysis.criticalIssues.length > 0) {
      steps.push('1. Address critical issues immediately - system may be unstable');
    }
    
    if (analysis.fixableIssues.length > 0) {
      steps.push('2. Execute FixAgent auto-remediation for fixable issues');
    }
    
    if (analysis.errors.filter(e => !e.fixable).length > 0) {
      steps.push('3. Manual intervention required for non-fixable errors');
    }
    
    if (analysis.warnings.length > 0) {
      steps.push('4. Review and address warnings to prevent future issues');
    }
    
    steps.push('5. Re-run analysis to verify fixes');
    
    return steps;
  }
}

module.exports = { ErrorAnalysisAgent };