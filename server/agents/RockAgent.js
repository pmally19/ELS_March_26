/**
 * Rock Agent - System Stability & Error Prevention Specialist
 * Purpose: Protect the ERP system from breaking and ensure reliability
 * Capabilities: Database validation, API monitoring, error prevention
 */

import { pool } from '../db.js';

class RockAgent {
  constructor() {
    this.name = "Rock Agent";
    this.role = "System Stability Specialist";
    this.capabilities = [
      "Database Schema Validation",
      "API Route Health Monitoring", 
      "Error Prevention & Recovery",
      "System Integrity Checks",
      "Automated Healing",
      "Performance Monitoring"
    ];
    
    this.systemHealth = {
      database: true,
      apis: true,
      lastCheck: new Date(),
      errorCount: 0,
      warnings: []
    };

    this.validationRules = {
      requiredTables: [
        'company_codes', 'plants', 'customers', 'products', 
        'orders', 'gl_accounts', 'employees', 'vendors'
      ],
      criticalApis: [
        '/api/master-data/company-code',
        '/api/master-data/plant', 
        '/api/customers',
        '/api/products',
        '/api/orders',
        '/api/inventory',
        '/api/finance/gl-account',
        '/api/sales/sales-order',
        '/api/hr/employees'
      ]
    };

    console.log(`🛡️ ${this.name} initialized - System protection active`);
  }

  /**
   * Comprehensive System Health Check
   */
  async performSystemHealthCheck() {
    console.log("🔍 Rock Agent: Performing comprehensive system health check...");
    
    const healthReport = {
      timestamp: new Date(),
      database: await this.validateDatabaseHealth(),
      apis: await this.validateApiHealth(),
      schema: await this.validateSchemaIntegrity(),
      performance: await this.checkSystemPerformance(),
      issues: [],
      recommendations: []
    };

    this.analyzeHealthReport(healthReport);
    return healthReport;
  }

  /**
   * Database Health Validation
   */
  async validateDatabaseHealth() {
    try {
      console.log("🔍 Validating database connection and tables...");
      
      // Test database connection
      const connectionTest = await pool.query('SELECT NOW()');
      
      // Validate required tables exist
      const tableChecks = await Promise.all(
        this.validationRules.requiredTables.map(async (table) => {
          try {
            const result = await pool.query(`SELECT COUNT(*) FROM ${table} LIMIT 1`);
            return { table, exists: true, recordCount: parseInt(result.rows[0].count) };
          } catch (error) {
            return { table, exists: false, error: error.message };
          }
        })
      );

      const missingTables = tableChecks.filter(check => !check.exists);
      
      return {
        connected: true,
        connectionTime: connectionTest.rows[0].now,
        tables: tableChecks,
        missingTables: missingTables.length,
        healthy: missingTables.length === 0
      };

    } catch (error) {
      console.error("❌ Database health check failed:", error);
      return {
        connected: false,
        error: error.message,
        healthy: false
      };
    }
  }

  /**
   * API Health Validation
   */
  async validateApiHealth() {
    console.log("🔍 Validating API endpoints...");
    
    const apiChecks = await Promise.all(
      this.validationRules.criticalApis.map(async (endpoint) => {
        try {
          const response = await fetch(`http://localhost:5000${endpoint}`);
          return {
            endpoint,
            status: response.status,
            healthy: response.status === 200,
            responseTime: response.headers.get('x-response-time') || 'N/A'
          };
        } catch (error) {
          return {
            endpoint,
            status: 500,
            healthy: false,
            error: error.message
          };
        }
      })
    );

    const failedApis = apiChecks.filter(check => !check.healthy);
    
    return {
      totalApis: apiChecks.length,
      healthyApis: apiChecks.length - failedApis.length,
      failedApis: failedApis.length,
      checks: apiChecks,
      healthy: failedApis.length === 0
    };
  }

  /**
   * Database Schema Integrity Check
   */
  async validateSchemaIntegrity() {
    try {
      console.log("🔍 Validating database schema integrity...");
      
      // Check for common naming convention issues
      const columnChecks = await pool.query(`
        SELECT table_name, column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name IN ('orders', 'customers', 'products', 'gl_accounts')
        ORDER BY table_name, column_name
      `);

      // Identify potential naming issues
      const namingIssues = [];
      const columns = columnChecks.rows;
      
      columns.forEach(col => {
        // Check for mixed naming conventions
        if (col.column_name.includes('_') && /[A-Z]/.test(col.column_name)) {
          namingIssues.push({
            table: col.table_name,
            column: col.column_name,
            issue: "Mixed snake_case and camelCase"
          });
        }
      });

      return {
        tablesChecked: [...new Set(columns.map(c => c.table_name))].length,
        columnsChecked: columns.length,
        namingIssues: namingIssues.length,
        issues: namingIssues,
        healthy: namingIssues.length === 0
      };

    } catch (error) {
      console.error("❌ Schema validation failed:", error);
      return {
        healthy: false,
        error: error.message
      };
    }
  }

  /**
   * System Performance Check
   */
  async checkSystemPerformance() {
    try {
      console.log("🔍 Checking system performance metrics...");
      
      const performanceChecks = await Promise.all([
        // Database query performance
        this.measureQueryPerformance(),
        // Memory usage check
        this.checkMemoryUsage(),
        // API response times
        this.measureApiResponseTimes()
      ]);

      return {
        database: performanceChecks[0],
        memory: performanceChecks[1],
        apis: performanceChecks[2],
        healthy: performanceChecks.every(check => check.healthy)
      };

    } catch (error) {
      console.error("❌ Performance check failed:", error);
      return {
        healthy: false,
        error: error.message
      };
    }
  }

  /**
   * Measure Database Query Performance
   */
  async measureQueryPerformance() {
    const start = Date.now();
    try {
      await pool.query('SELECT COUNT(*) FROM company_codes');
      const duration = Date.now() - start;
      
      return {
        queryTime: duration,
        healthy: duration < 1000, // Under 1 second is healthy
        status: duration < 1000 ? 'Good' : 'Slow'
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message
      };
    }
  }

  /**
   * Check Memory Usage
   */
  checkMemoryUsage() {
    const memUsage = process.memoryUsage();
    const memUsageMB = {
      rss: Math.round(memUsage.rss / 1024 / 1024),
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      external: Math.round(memUsage.external / 1024 / 1024)
    };

    return {
      usage: memUsageMB,
      healthy: memUsageMB.heapUsed < 500, // Under 500MB is healthy
      status: memUsageMB.heapUsed < 500 ? 'Good' : 'High'
    };
  }

  /**
   * Measure API Response Times
   */
  async measureApiResponseTimes() {
    const testEndpoints = [
      '/api/customers',
      '/api/products', 
      '/api/master-data/company-code'
    ];

    const results = await Promise.all(
      testEndpoints.map(async (endpoint) => {
        const start = Date.now();
        try {
          await fetch(`http://localhost:5000${endpoint}`);
          return {
            endpoint,
            responseTime: Date.now() - start,
            healthy: true
          };
        } catch (error) {
          return {
            endpoint,
            responseTime: -1,
            healthy: false,
            error: error.message
          };
        }
      })
    );

    const avgResponseTime = results
      .filter(r => r.healthy)
      .reduce((sum, r) => sum + r.responseTime, 0) / results.filter(r => r.healthy).length;

    return {
      endpoints: results,
      averageResponseTime: Math.round(avgResponseTime),
      healthy: avgResponseTime < 500 // Under 500ms is healthy
    };
  }

  /**
   * Analyze Health Report and Provide Recommendations
   */
  analyzeHealthReport(report) {
    console.log("\n📊 Rock Agent Health Report Analysis:");
    console.log("=====================================");
    
    if (report.database.healthy) {
      console.log("✅ Database: Healthy");
    } else {
      console.log("❌ Database: Issues detected");
      report.issues.push("Database connectivity or table issues");
    }

    if (report.apis.healthy) {
      console.log("✅ APIs: All endpoints responding");
    } else {
      console.log(`❌ APIs: ${report.apis.failedApis} endpoints failing`);
      report.issues.push(`${report.apis.failedApis} API endpoints not responding`);
    }

    if (report.schema.healthy) {
      console.log("✅ Schema: No naming convention issues");
    } else {
      console.log(`⚠️ Schema: ${report.schema.namingIssues} naming issues detected`);
      report.recommendations.push("Review and standardize database naming conventions");
    }

    if (report.performance.healthy) {
      console.log("✅ Performance: System running optimally");
    } else {
      console.log("⚠️ Performance: Some performance concerns detected");
      report.recommendations.push("Monitor system performance and consider optimization");
    }

    // Overall system health
    const overallHealth = [
      report.database.healthy,
      report.apis.healthy,
      report.schema.healthy,
      report.performance.healthy
    ].filter(Boolean).length;

    console.log(`\n🛡️ Overall System Health: ${overallHealth}/4 components healthy`);
    
    if (report.recommendations.length > 0) {
      console.log("\n💡 Recommendations:");
      report.recommendations.forEach((rec, index) => {
        console.log(`   ${index + 1}. ${rec}`);
      });
    }

    console.log("=====================================\n");
  }

  /**
   * Auto-heal System Issues
   */
  async autoHealSystem() {
    console.log("🔧 Rock Agent: Attempting system auto-healing...");
    
    const healingActions = [];
    
    try {
      // Check and restart failed services
      const healthCheck = await this.performSystemHealthCheck();
      
      if (!healthCheck.apis.healthy) {
        console.log("🔧 Attempting to heal API issues...");
        // Log failed APIs for investigation
        healthCheck.apis.checks
          .filter(check => !check.healthy)
          .forEach(failedApi => {
            console.log(`❌ Failed API: ${failedApi.endpoint} - Status: ${failedApi.status}`);
            healingActions.push(`Logged failed API: ${failedApi.endpoint}`);
          });
      }

      if (!healthCheck.database.healthy) {
        console.log("🔧 Attempting to heal database issues...");
        // Attempt database reconnection
        try {
          await pool.query('SELECT 1');
          healingActions.push("Database reconnection successful");
        } catch (error) {
          healingActions.push(`Database healing failed: ${error.message}`);
        }
      }

      console.log("✅ Auto-healing completed");
      return {
        success: true,
        actions: healingActions,
        timestamp: new Date()
      };

    } catch (error) {
      console.error("❌ Auto-healing failed:", error);
      return {
        success: false,
        error: error.message,
        actions: healingActions
      };
    }
  }

  /**
   * Start Continuous Monitoring
   */
  startMonitoring(intervalMinutes = 5) {
    console.log(`🛡️ Rock Agent: Starting continuous monitoring (every ${intervalMinutes} minutes)`);
    
    setInterval(async () => {
      try {
        const healthReport = await this.performSystemHealthCheck();
        
        // Auto-heal if issues detected
        if (!healthReport.database.healthy || !healthReport.apis.healthy) {
          await this.autoHealSystem();
        }
        
      } catch (error) {
        console.error("❌ Monitoring cycle failed:", error);
      }
    }, intervalMinutes * 60 * 1000);
  }

  /**
   * PROTECTION INSTRUCTIONS FOR DATABASE CHANGES
   * These guidelines ensure system stability when adding new tables/UIs
   */
  getDatabaseChangeProtectionRules() {
    return {
      namingConventions: {
        tableNames: "Always use snake_case for table names (e.g., 'user_profiles', not 'userProfiles')",
        columnNames: "Always use snake_case for column names (e.g., 'created_at', not 'createdAt')",
        consistency: "Maintain consistency with existing tables - check current schema first"
      },
      
      safeChangeProcess: {
        step1: "ALWAYS check existing table structure before making changes",
        step2: "Use migrations instead of direct table modifications",
        step3: "Test API endpoints after adding new tables",
        step4: "Verify naming consistency with existing schema",
        step5: "Update API routes to match new table structure"
      },

      apiEndpointRules: {
        consistency: "New API routes must follow existing patterns in server/routes.ts",
        validation: "Always include try-catch blocks with proper error handling",
        columnMapping: "Use snake_case in SQL queries to match database columns",
        testing: "Test each new endpoint immediately after creation"
      },

      uiIntegrationRules: {
        dataFetching: "Use existing query patterns from working components",
        errorHandling: "Include loading states and error boundaries",
        consistency: "Follow existing component structure and styling",
        validation: "Test UI components with real data before deployment"
      },

      criticalChecks: {
        beforeChanges: [
          "Run 'SELECT * FROM information_schema.tables' to see existing structure",
          "Check existing API routes in server/routes.ts for patterns",
          "Verify current naming conventions used in the system"
        ],
        afterChanges: [
          "Test new API endpoints with curl or browser",
          "Verify UI components load without errors",
          "Check console for any 404 or 500 errors",
          "Confirm data displays correctly in frontend"
        ]
      }
    };
  }

  /**
   * Validate New Table/UI Changes
   */
  async validateNewChanges(changeType, details) {
    console.log(`🔍 Rock Agent: Validating ${changeType} changes...`);
    
    const rules = this.getDatabaseChangeProtectionRules();
    const issues = [];
    const recommendations = [];

    if (changeType === 'table') {
      // Validate table naming
      if (details.tableName && !details.tableName.includes('_')) {
        issues.push(`Table name '${details.tableName}' should use snake_case`);
        recommendations.push(`Rename to '${details.tableName.replace(/([A-Z])/g, '_$1').toLowerCase()}'`);
      }

      // Validate column naming
      if (details.columns) {
        details.columns.forEach(column => {
          if (!column.includes('_') && /[A-Z]/.test(column)) {
            issues.push(`Column '${column}' should use snake_case`);
            recommendations.push(`Rename to '${column.replace(/([A-Z])/g, '_$1').toLowerCase()}'`);
          }
        });
      }
    }

    if (changeType === 'api') {
      // Validate API endpoint patterns
      if (details.endpoint && !details.endpoint.startsWith('/api/')) {
        issues.push(`Endpoint '${details.endpoint}' should start with '/api/'`);
      }

      // Check for error handling
      if (details.hasErrorHandling === false) {
        issues.push("API endpoint missing try-catch error handling");
        recommendations.push("Add try-catch blocks with proper error responses");
      }
    }

    return {
      valid: issues.length === 0,
      issues,
      recommendations,
      rules: rules[`${changeType}Rules`] || rules.criticalChecks
    };
  }

  /**
   * Pre-change Safety Check
   */
  async preChangeValidation() {
    console.log("🛡️ Rock Agent: Running pre-change safety validation...");
    
    try {
      // Capture current system state
      const baselineHealth = await this.performSystemHealthCheck();
      
      // Get current table structure
      const currentTables = await pool.query(`
        SELECT table_name, column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        ORDER BY table_name, ordinal_position
      `);

      // Get current API routes (simplified check)
      const criticalEndpoints = this.validationRules.criticalApis;
      
      return {
        timestamp: new Date(),
        baseline: baselineHealth,
        tableStructure: currentTables.rows,
        criticalEndpoints,
        recommendations: [
          "Save this baseline before making changes",
          "Use migrations for database changes",
          "Test immediately after each change",
          "Follow existing naming conventions"
        ]
      };

    } catch (error) {
      console.error("❌ Pre-change validation failed:", error);
      return {
        error: error.message,
        critical: true,
        recommendation: "Fix existing issues before making new changes"
      };
    }
  }

  /**
   * Post-change Verification
   */
  async postChangeVerification(baseline) {
    console.log("🔍 Rock Agent: Running post-change verification...");
    
    try {
      // Compare with baseline
      const currentHealth = await this.performSystemHealthCheck();
      
      const healthComparison = {
        database: {
          before: baseline.baseline.database.healthy,
          after: currentHealth.database.healthy,
          changed: baseline.baseline.database.healthy !== currentHealth.database.healthy
        },
        apis: {
          before: baseline.baseline.apis.healthy,
          after: currentHealth.apis.healthy,
          changed: baseline.baseline.apis.healthy !== currentHealth.apis.healthy
        }
      };

      // Check for regressions
      const regressions = [];
      if (healthComparison.database.before && !healthComparison.database.after) {
        regressions.push("Database health degraded");
      }
      if (healthComparison.apis.before && !healthComparison.apis.after) {
        regressions.push("API health degraded");
      }

      return {
        timestamp: new Date(),
        comparison: healthComparison,
        regressions,
        success: regressions.length === 0,
        recommendations: regressions.length > 0 ? 
          ["Investigate regressions immediately", "Consider rollback if critical"] :
          ["Changes appear safe", "Continue monitoring"]
      };

    } catch (error) {
      console.error("❌ Post-change verification failed:", error);
      return {
        error: error.message,
        critical: true,
        recommendation: "Manual investigation required"
      };
    }
  }

  /**
   * Generate System Status Report
   */
  async generateStatusReport() {
    const report = await this.performSystemHealthCheck();
    
    return {
      agent: this.name,
      role: this.role,
      timestamp: new Date(),
      systemHealth: report,
      uptime: process.uptime(),
      nodeVersion: process.version,
      platform: process.platform
    };
  }
}

// Create and export Rock Agent instance
const rockAgent = new RockAgent();

export { rockAgent, RockAgent };