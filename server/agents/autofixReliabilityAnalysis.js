/**
 * AutoFix Reliability Analysis - Comprehensive safety and fallback procedures
 * Analyzes autofix success probability and provides detailed fallback strategies
 */

const { pool } = require('../db');

class AutoFixReliabilityAnalysis {
  
  /**
   * Analyze autofix reliability for specific issues
   */
  static async analyzeAPARIssues(companyId) {
    console.log(`🔍 Analyzing AP/AR autofix reliability for company ${companyId}...`);
    
    const analysis = {
      companyId,
      timestamp: new Date().toISOString(),
      apAnalysis: null,
      arAnalysis: null,
      autofixReliability: {},
      fallbackProcedures: {},
      riskAssessment: {},
      recommendations: []
    };

    try {
      // Analyze AP (Accounts Payable) Issues
      analysis.apAnalysis = await this.analyzeAPIssues(companyId);
      
      // Analyze AR (Accounts Receivable) Issues
      analysis.arAnalysis = await this.analyzeARIssues(companyId);
      
      // Assess autofix reliability
      analysis.autofixReliability = this.assessAutofixReliability(analysis.apAnalysis, analysis.arAnalysis);
      
      // Define fallback procedures
      analysis.fallbackProcedures = this.defineFallbackProcedures();
      
      // Risk assessment
      analysis.riskAssessment = this.assessRisks(analysis.apAnalysis, analysis.arAnalysis);
      
      // Generate recommendations
      analysis.recommendations = this.generateRecommendations(analysis);
      
      return analysis;
      
    } catch (error) {
      console.error('AutoFix reliability analysis failed:', error);
      analysis.error = error.message;
      return analysis;
    }
  }

  /**
   * Analyze Accounts Payable issues
   */
  static async analyzeAPIssues(companyId) {
    const apAnalysis = {
      tableExists: false,
      hasData: false,
      dataCount: 0,
      structureValid: false,
      requiredColumns: ['vendor_code', 'invoice_number', 'amount', 'due_date', 'status'],
      missingColumns: [],
      issues: [],
      autofixPossible: false,
      riskLevel: 'LOW'
    };

    try {
      // Check if AP table exists
      const tableCheck = await pool.query(`
        SELECT table_name FROM information_schema.tables 
        WHERE table_name = 'accounts_payable'
      `);
      
      apAnalysis.tableExists = tableCheck.rows.length > 0;
      
      if (apAnalysis.tableExists) {
        // Check data count
        const countResult = await pool.query(`
          SELECT COUNT(*) as count FROM accounts_payable WHERE company_code_id = $1
        `, [companyId]);
        
        apAnalysis.dataCount = parseInt(countResult.rows[0].count);
        apAnalysis.hasData = apAnalysis.dataCount > 0;
        
        // Check table structure
        const structureResult = await pool.query(`
          SELECT column_name FROM information_schema.columns 
          WHERE table_name = 'accounts_payable'
        `);
        
        const existingColumns = structureResult.rows.map(row => row.column_name);
        apAnalysis.missingColumns = apAnalysis.requiredColumns.filter(col => !existingColumns.includes(col));
        apAnalysis.structureValid = apAnalysis.missingColumns.length === 0;
        
        // Determine issues
        if (!apAnalysis.hasData) {
          apAnalysis.issues.push('No AP data for company');
          apAnalysis.autofixPossible = true;
          apAnalysis.riskLevel = 'LOW';
        }
        
        if (!apAnalysis.structureValid) {
          apAnalysis.issues.push(`Missing columns: ${apAnalysis.missingColumns.join(', ')}`);
          apAnalysis.autofixPossible = true;
          apAnalysis.riskLevel = 'MEDIUM';
        }
        
      } else {
        apAnalysis.issues.push('AP table does not exist');
        apAnalysis.autofixPossible = true;
        apAnalysis.riskLevel = 'HIGH';
      }
      
    } catch (error) {
      apAnalysis.issues.push(`AP analysis failed: ${error.message}`);
      apAnalysis.autofixPossible = false;
      apAnalysis.riskLevel = 'CRITICAL';
    }

    return apAnalysis;
  }

  /**
   * Analyze Accounts Receivable issues
   */
  static async analyzeARIssues(companyId) {
    const arAnalysis = {
      tableExists: false,
      hasData: false,
      dataCount: 0,
      structureValid: false,
      requiredColumns: ['customer_code', 'invoice_number', 'amount', 'due_date', 'status'],
      missingColumns: [],
      issues: [],
      autofixPossible: false,
      riskLevel: 'LOW'
    };

    try {
      // Check if AR table exists
      const tableCheck = await pool.query(`
        SELECT table_name FROM information_schema.tables 
        WHERE table_name = 'accounts_receivable'
      `);
      
      arAnalysis.tableExists = tableCheck.rows.length > 0;
      
      if (arAnalysis.tableExists) {
        // Check data count
        const countResult = await pool.query(`
          SELECT COUNT(*) as count FROM accounts_receivable WHERE company_code_id = $1
        `, [companyId]);
        
        arAnalysis.dataCount = parseInt(countResult.rows[0].count);
        arAnalysis.hasData = arAnalysis.dataCount > 0;
        
        // Check table structure
        const structureResult = await pool.query(`
          SELECT column_name FROM information_schema.columns 
          WHERE table_name = 'accounts_receivable'
        `);
        
        const existingColumns = structureResult.rows.map(row => row.column_name);
        arAnalysis.missingColumns = arAnalysis.requiredColumns.filter(col => !existingColumns.includes(col));
        arAnalysis.structureValid = arAnalysis.missingColumns.length === 0;
        
        // Determine issues
        if (!arAnalysis.hasData) {
          arAnalysis.issues.push('No AR data for company');
          arAnalysis.autofixPossible = true;
          arAnalysis.riskLevel = 'LOW';
        }
        
        if (!arAnalysis.structureValid) {
          arAnalysis.issues.push(`Missing columns: ${arAnalysis.missingColumns.join(', ')}`);
          arAnalysis.autofixPossible = true;
          arAnalysis.riskLevel = 'MEDIUM';
        }
        
      } else {
        arAnalysis.issues.push('AR table does not exist');
        arAnalysis.autofixPossible = true;
        arAnalysis.riskLevel = 'HIGH';
      }
      
    } catch (error) {
      arAnalysis.issues.push(`AR analysis failed: ${error.message}`);
      arAnalysis.autofixPossible = false;
      arAnalysis.riskLevel = 'CRITICAL';
    }

    return arAnalysis;
  }

  /**
   * Assess autofix reliability percentage and success probability
   */
  static assessAutofixReliability(apAnalysis, arAnalysis) {
    const reliability = {
      apReliability: this.calculateReliability(apAnalysis),
      arReliability: this.calculateReliability(arAnalysis),
      overallReliability: 0,
      successProbability: '',
      riskFactors: [],
      mitigationStrategies: []
    };

    // Calculate overall reliability
    reliability.overallReliability = Math.round((reliability.apReliability + reliability.arReliability) / 2);
    
    // Determine success probability
    if (reliability.overallReliability >= 90) {
      reliability.successProbability = 'VERY HIGH (90%+)';
    } else if (reliability.overallReliability >= 75) {
      reliability.successProbability = 'HIGH (75-89%)';
    } else if (reliability.overallReliability >= 50) {
      reliability.successProbability = 'MEDIUM (50-74%)';
    } else {
      reliability.successProbability = 'LOW (<50%)';
    }

    // Identify risk factors
    if (apAnalysis.riskLevel === 'CRITICAL' || arAnalysis.riskLevel === 'CRITICAL') {
      reliability.riskFactors.push('Critical system errors detected');
    }
    
    if (!apAnalysis.tableExists || !arAnalysis.tableExists) {
      reliability.riskFactors.push('Missing core financial tables');
    }
    
    if (!apAnalysis.structureValid || !arAnalysis.structureValid) {
      reliability.riskFactors.push('Table structure inconsistencies');
    }

    // Define mitigation strategies
    reliability.mitigationStrategies = [
      'Create database backup before autofix execution',
      'Execute fixes incrementally with validation checkpoints',
      'Maintain transaction rollback capability',
      'Generate detailed fix logs for audit trail',
      'Implement post-fix validation tests'
    ];

    return reliability;
  }

  /**
   * Calculate reliability percentage for individual module
   */
  static calculateReliability(moduleAnalysis) {
    let reliability = 100;

    // Deduct points based on issues
    if (!moduleAnalysis.tableExists) reliability -= 40;
    if (!moduleAnalysis.structureValid) reliability -= 20;
    if (!moduleAnalysis.hasData) reliability -= 10;
    if (moduleAnalysis.riskLevel === 'CRITICAL') reliability -= 30;
    if (moduleAnalysis.riskLevel === 'HIGH') reliability -= 20;
    if (moduleAnalysis.riskLevel === 'MEDIUM') reliability -= 10;

    return Math.max(0, reliability);
  }

  /**
   * Define comprehensive fallback procedures
   */
  static defineFallbackProcedures() {
    return {
      automaticFallbacks: {
        'TABLE_CREATION_FAILS': {
          action: 'Use manual SQL script execution',
          fallback: 'Generate CREATE TABLE scripts for manual execution',
          rollback: 'No rollback needed - table creation is atomic',
          risk: 'LOW'
        },
        'DATA_POPULATION_FAILS': {
          action: 'Partial data insertion with error logging',
          fallback: 'Insert valid records, log failed records for manual review',
          rollback: 'DELETE inserted records using transaction timestamps',
          risk: 'LOW'
        },
        'COLUMN_ADDITION_FAILS': {
          action: 'Create new table with correct structure',
          fallback: 'Migrate data to new table, drop old table',
          rollback: 'Restore from pre-fix backup',
          risk: 'MEDIUM'
        }
      },
      manualInterventions: {
        'SYSTEM_CONNECTION_LOST': {
          action: 'Manual database connection restoration',
          steps: [
            'Check database server status',
            'Verify connection credentials',
            'Restart database service if needed',
            'Re-execute failed autofix operations'
          ],
          estimatedTime: '5-15 minutes'
        },
        'CONSTRAINT_VIOLATIONS': {
          action: 'Manual data cleaning and constraint resolution',
          steps: [
            'Identify violating records',
            'Clean or remove invalid data',
            'Update foreign key relationships',
            'Re-run autofix with clean data'
          ],
          estimatedTime: '10-30 minutes'
        },
        'PERMISSIONS_DENIED': {
          action: 'Manual privilege escalation',
          steps: [
            'Grant necessary database permissions',
            'Verify user has DDL/DML rights',
            'Re-execute autofix with proper permissions'
          ],
          estimatedTime: '2-5 minutes'
        }
      },
      emergencyProcedures: {
        'DATA_CORRUPTION_DETECTED': {
          action: 'IMMEDIATE STOP - Restore from backup',
          steps: [
            'STOP all autofix operations immediately',
            'Restore database from pre-fix backup',
            'Analyze corruption cause',
            'Design manual fix strategy',
            'Execute fixes with enhanced validation'
          ],
          critical: true
        },
        'SYSTEM_CRASH_DURING_FIX': {
          action: 'System recovery and transaction rollback',
          steps: [
            'Restart database system',
            'Check transaction log for uncommitted changes',
            'Rollback partial transactions',
            'Verify data integrity',
            'Re-execute autofix from clean state'
          ],
          critical: true
        }
      }
    };
  }

  /**
   * Assess risks of autofix execution
   */
  static assessRisks(apAnalysis, arAnalysis) {
    const risks = {
      dataLossRisk: 'LOW',
      systemDowntimeRisk: 'LOW',
      businessImpactRisk: 'LOW',
      rollbackComplexity: 'LOW',
      specificRisks: [],
      mitigationRequired: false
    };

    // Assess data loss risk
    if (!apAnalysis.tableExists || !arAnalysis.tableExists) {
      risks.dataLossRisk = 'MEDIUM';
      risks.specificRisks.push('Creating new tables may affect existing integrations');
    }

    // Assess system downtime risk
    if (apAnalysis.riskLevel === 'HIGH' || arAnalysis.riskLevel === 'HIGH') {
      risks.systemDowntimeRisk = 'MEDIUM';
      risks.specificRisks.push('Major structural changes may require system restart');
    }

    // Assess business impact risk
    if (!apAnalysis.hasData && !arAnalysis.hasData) {
      risks.businessImpactRisk = 'LOW';
      risks.specificRisks.push('No existing financial data to disrupt');
    } else {
      risks.businessImpactRisk = 'MEDIUM';
      risks.specificRisks.push('Existing financial transactions may be affected');
    }

    // Assess rollback complexity
    const highRiskOperations = [
      !apAnalysis.tableExists,
      !arAnalysis.tableExists,
      !apAnalysis.structureValid,
      !arAnalysis.structureValid
    ].filter(Boolean).length;

    if (highRiskOperations > 2) {
      risks.rollbackComplexity = 'HIGH';
      risks.mitigationRequired = true;
    } else if (highRiskOperations > 0) {
      risks.rollbackComplexity = 'MEDIUM';
    }

    return risks;
  }

  /**
   * Generate specific recommendations
   */
  static generateRecommendations(analysis) {
    const recommendations = [];

    // Reliability-based recommendations
    if (analysis.autofixReliability.overallReliability >= 75) {
      recommendations.push({
        type: 'PROCEED',
        action: 'Execute autofix with standard precautions',
        reasoning: 'High reliability score indicates low risk',
        precautions: ['Create backup', 'Enable detailed logging']
      });
    } else if (analysis.autofixReliability.overallReliability >= 50) {
      recommendations.push({
        type: 'PROCEED_WITH_CAUTION',
        action: 'Execute autofix with enhanced monitoring',
        reasoning: 'Medium reliability requires additional safeguards',
        precautions: ['Create backup', 'Execute in stages', 'Validate after each stage']
      });
    } else {
      recommendations.push({
        type: 'MANUAL_INTERVENTION',
        action: 'Perform manual fixes instead of autofix',
        reasoning: 'Low reliability indicates high failure probability',
        alternatives: ['Manual SQL execution', 'Staged data migration', 'Custom fix scripts']
      });
    }

    // Risk-based recommendations
    if (analysis.riskAssessment.mitigationRequired) {
      recommendations.push({
        type: 'RISK_MITIGATION',
        action: 'Implement additional safeguards before autofix',
        safeguards: [
          'Schedule during maintenance window',
          'Notify stakeholders of potential downtime',
          'Prepare manual rollback procedures',
          'Test autofix on staging environment first'
        ]
      });
    }

    // Issue-specific recommendations
    if (!analysis.apAnalysis.tableExists || !analysis.arAnalysis.tableExists) {
      recommendations.push({
        type: 'INFRASTRUCTURE',
        action: 'Create missing financial tables with proper constraints',
        details: 'Missing AP/AR tables indicate incomplete ERP setup'
      });
    }

    return recommendations;
  }
}

module.exports = { AutoFixReliabilityAnalysis };