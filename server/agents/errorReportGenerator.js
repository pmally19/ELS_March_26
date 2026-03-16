/**
 * Error Report Generator - Creates comprehensive error analysis reports
 * Generates detailed documentation for system administrators and FixAgent
 */

class ErrorReportGenerator {
  
  /**
   * Generate comprehensive system health report
   */
  static generateSystemHealthReport(errorReport, fixResults = null) {
    const timestamp = new Date().toISOString();
    
    let report = `
# MallyERP System Health Report
Generated: ${timestamp}
Company: ${errorReport.summary.companyName} (${errorReport.summary.companyCode})

## Executive Summary
- **Total Errors**: ${errorReport.summary.totalErrors}
- **Total Warnings**: ${errorReport.summary.totalWarnings}
- **Fixable Issues**: ${errorReport.summary.fixableIssues}
- **Critical Issues**: ${errorReport.summary.criticalIssues}

## Error Breakdown

### By Category
${Object.entries(errorReport.errorBreakdown.byCategory).map(([category, count]) => 
  `- ${category}: ${count} issues`).join('\n')}

### By Severity
${Object.entries(errorReport.errorBreakdown.bySeverity).map(([severity, count]) => 
  `- ${severity}: ${count} issues`).join('\n')}

### By Table
${Object.entries(errorReport.errorBreakdown.byTable).map(([table, count]) => 
  `- ${table}: ${count} issues`).join('\n')}

## Fix Recommendations
${errorReport.fixRecommendations.map((rec, idx) => `
${idx + 1}. **${rec.action}** (Priority: ${rec.priority}/10)
   - Estimated Time: ${rec.estimatedTime}
   - Issues: ${rec.issues.length}
   - Details: ${rec.issues.map(issue => issue.issue).join(', ')}
`).join('')}

## Decision Framework

### Data Errors (Show Specific Issues)
When errors relate to missing or inconsistent data:
- Display specific table and record issues
- Show expected vs actual data counts
- Highlight business impact

### Application Errors (Trigger FixAgent)
When errors relate to system functionality:
- Execute automated remediation
- Log fix attempts and results
- Verify fixes through re-analysis

### System Errors (Generate Reports)
When errors require manual intervention:
- Generate detailed technical reports
- Escalate to system administrators
- Document for future prevention

## Next Steps
${errorReport.nextSteps.map((step, idx) => `${idx + 1}. ${step}`).join('\n')}
`;

    if (fixResults) {
      report += `

## Auto-Fix Results
- **Total Fixes Attempted**: ${fixResults.totalFixes}
- **Successful Fixes**: ${fixResults.successfulFixes}
- **Failed Fixes**: ${fixResults.failedFixes}
- **Success Rate**: ${((fixResults.successfulFixes / fixResults.totalFixes) * 100).toFixed(1)}%

### Fix Details
${fixResults.fixDetails.map((fix, idx) => `
${idx + 1}. **${fix.issue}**
   - Action: ${fix.action}
   - Status: ${fix.status}
   - Result: ${fix.result || fix.error}
   - Time: ${fix.timestamp}
`).join('')}

### Remaining Issues
${fixResults.remainingIssues.length > 0 ? 
  fixResults.remainingIssues.map(issue => `- ${issue.issue}: ${issue.description}`).join('\n') :
  'All fixable issues have been resolved.'}
`;
    }

    return report;
  }

  /**
   * Generate FixAgent instruction set
   */
  static generateFixInstructions(errorReport) {
    const instructions = {
      companyId: errorReport.summary.companyId,
      companyCode: errorReport.summary.companyCode,
      prioritizedFixes: errorReport.fixRecommendations.map(rec => ({
        action: rec.action,
        priority: rec.priority,
        estimatedTime: rec.estimatedTime,
        issues: rec.issues.map(issue => ({
          category: issue.category,
          severity: issue.severity,
          table: issue.table,
          description: issue.description,
          autoFixAction: issue.autoFixAction
        }))
      })),
      decisionMatrix: {
        criticalIssues: 'Immediate manual intervention required',
        highSeverity: 'Auto-fix with verification',
        mediumSeverity: 'Auto-fix with logging',
        lowSeverity: 'Auto-fix silently'
      },
      rollbackPlan: 'Re-run analysis after each fix batch to verify improvements'
    };

    return instructions;
  }

  /**
   * Generate user-friendly error communication
   */
  static generateUserCommunication(errorReport, fixResults = null) {
    const communication = {
      title: `System Analysis: ${errorReport.summary.companyName}`,
      summary: this.getUserFriendlySummary(errorReport),
      recommendations: this.getUserRecommendations(errorReport),
      nextActions: this.getNextActions(errorReport, fixResults)
    };

    return communication;
  }

  static getUserFriendlySummary(errorReport) {
    const { totalErrors, totalWarnings, fixableIssues } = errorReport.summary;
    
    if (totalErrors === 0 && totalWarnings === 0) {
      return "System is healthy with no issues detected.";
    }
    
    if (totalErrors > 0) {
      return `Found ${totalErrors} errors and ${totalWarnings} warnings. ${fixableIssues} issues can be fixed automatically.`;
    }
    
    return `Found ${totalWarnings} warnings that should be addressed to prevent future issues.`;
  }

  static getUserRecommendations(errorReport) {
    const recs = errorReport.fixRecommendations.slice(0, 3).map(rec => 
      `${rec.action} (${rec.estimatedTime})`
    );
    
    return recs.length > 0 ? recs : ['System appears to be functioning correctly'];
  }

  static getNextActions(errorReport, fixResults) {
    if (fixResults) {
      if (fixResults.successfulFixes === fixResults.totalFixes) {
        return ['All issues have been automatically resolved', 'System is now healthy'];
      } else {
        return [
          `${fixResults.successfulFixes} issues fixed automatically`,
          `${fixResults.failedFixes} issues require manual attention`,
          'Review remaining issues for manual resolution'
        ];
      }
    }
    
    if (errorReport.summary.fixableIssues > 0) {
      return ['Click Auto-Fix to resolve issues automatically', 'Monitor system after fixes'];
    }
    
    return ['No immediate action required', 'Consider running periodic health checks'];
  }
}

module.exports = { ErrorReportGenerator };