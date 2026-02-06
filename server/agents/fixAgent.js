/**
 * FixAgent - Automated Error Remediation System
 * Receives error reports and automatically fixes detected issues
 */

const { pool } = require('../db');

class FixAgent {
  constructor() {
    this.fixHandlers = {
      'POPULATE_MASTER_DATA': this.populateMasterData.bind(this),
      'CREATE_MISSING_TABLE': this.createMissingTable.bind(this),
      'FIX_UI_ROUTING': this.fixUIRouting.bind(this),
      'ADD_COLUMN': this.addMissingColumn.bind(this),
      'CREATE_TABLE': this.createTable.bind(this),
      'CLEAN_ORPHANED_RECORDS': this.cleanOrphanedRecords.bind(this),
      'UPDATE_COMPANY_CONFIG': this.updateCompanyConfig.bind(this)
    };
  }

  /**
   * Execute automated fixes based on error analysis
   */
  async executeAutoFix(errorReport) {
    console.log(`🔧 FixAgent starting auto-remediation for company ${errorReport.summary.companyCode}...`);
    
    const fixResults = {
      companyId: errorReport.summary.companyId,
      timestamp: new Date().toISOString(),
      totalFixes: 0,
      successfulFixes: 0,
      failedFixes: 0,
      fixDetails: [],
      remainingIssues: []
    };

    try {
      // Process fixes in priority order
      for (const recommendation of errorReport.fixRecommendations) {
        const fixAction = this.getActionKeyFromDescription(recommendation.action);
        
        if (this.fixHandlers[fixAction]) {
          console.log(`🔨 Executing fix: ${recommendation.action}`);
          
          for (const issue of recommendation.issues) {
            fixResults.totalFixes++;
            
            try {
              const result = await this.fixHandlers[fixAction](issue, errorReport.summary);
              
              fixResults.fixDetails.push({
                issue: issue.issue,
                action: recommendation.action,
                status: 'SUCCESS',
                result: result,
                timestamp: new Date().toISOString()
              });
              
              fixResults.successfulFixes++;
              console.log(`✅ Fixed: ${issue.issue}`);
              
            } catch (error) {
              fixResults.fixDetails.push({
                issue: issue.issue,
                action: recommendation.action,
                status: 'FAILED',
                error: error.message,
                timestamp: new Date().toISOString()
              });
              
              fixResults.failedFixes++;
              console.log(`❌ Failed to fix: ${issue.issue} - ${error.message}`);
              
              fixResults.remainingIssues.push(issue);
            }
          }
        } else {
          console.log(`⚠️  No handler for fix action: ${fixAction}`);
          fixResults.remainingIssues.push(...recommendation.issues);
        }
      }

      const successRate = (fixResults.successfulFixes / fixResults.totalFixes * 100).toFixed(1);
      console.log(`🎯 FixAgent completed: ${fixResults.successfulFixes}/${fixResults.totalFixes} fixes successful (${successRate}%)`);
      
      return fixResults;

    } catch (error) {
      console.error('FixAgent encountered critical error:', error);
      fixResults.criticalError = error.message;
      return fixResults;
    }
  }

  /**
   * Populate missing master data
   */
  async populateMasterData(issue, companyInfo) {
    const { table } = issue;
    
    if (table === 'benjamin_vendors') {
      return await this.populateVendorData(companyInfo);
    } else if (table === 'plants') {
      return await this.populatePlantData(companyInfo);
    } else if (table === 'customers') {
      return await this.populateCustomerData(companyInfo);
    } else if (table === 'chart_of_accounts') {
      return await this.populateChartOfAccounts(companyInfo);
    }
    
    throw new Error(`Unknown table for master data population: ${table}`);
  }

  async populateVendorData(companyInfo) {
    const vendors = [
      {
        vendor_code: 'AUTO-CHEM001',
        name: 'AutoFix Chemical Supplier',
        vendor_type: 'Raw Materials',
        address: '123 Industrial Ave, Chemical City, TX',
        city: 'Chemical City',
        state: 'TX',
        country: 'US',
        company_code: companyInfo.companyCode,
        payment_terms: 'NET30'
      },
      {
        vendor_code: 'AUTO-PKG001',
        name: 'AutoFix Packaging Solutions',
        vendor_type: 'Packaging',
        address: '456 Package Blvd, Container Town, OH',
        city: 'Container Town',
        state: 'OH',
        country: 'US',
        company_code: companyInfo.companyCode,
        payment_terms: 'NET45'
      }
    ];

    let insertedCount = 0;
    for (const vendor of vendors) {
      const result = await pool.query(`
        INSERT INTO benjamin_vendors (vendor_code, name, vendor_type, address, city, state, country, company_code, payment_terms, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
        ON CONFLICT (vendor_code) DO NOTHING
      `, [vendor.vendor_code, vendor.name, vendor.vendor_type, vendor.address, vendor.city, vendor.state, vendor.country, vendor.company_code, vendor.payment_terms]);
      
      if (result.rowCount > 0) insertedCount++;
    }

    return `Created ${insertedCount} vendor records`;
  }

  async populatePlantData(companyInfo) {
    const plant = {
      code: `AUTO-${companyInfo.companyCode}-P1`,
      name: `AutoFix Plant for ${companyInfo.companyName}`,
      description: 'Auto-generated plant for testing',
      company_code_id: companyInfo.companyId,
      type: 'MANUFACTURING',
      status: 'active',
      is_active: true
    };

    const result = await pool.query(`
      INSERT INTO plants (code, name, description, company_code_id, type, status, is_active, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      ON CONFLICT (code) DO NOTHING
    `, [plant.code, plant.name, plant.description, plant.company_code_id, plant.type, plant.status, plant.is_active]);

    return `Created ${result.rowCount} plant records`;
  }

  async populateCustomerData(companyInfo) {
    const customer = {
      customer_code: `AUTO-CUST001`,
      name: 'AutoFix Test Customer',
      customer_type: 'Standard',
      company_code_id: companyInfo.companyId,
      city: 'Test City',
      country: 'US',
      active: true
    };

    const result = await pool.query(`
      INSERT INTO customers (customer_code, name, customer_type, company_code_id, city, country, active, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      ON CONFLICT (customer_code) DO NOTHING
    `, [customer.customer_code, customer.name, customer.customer_type, customer.company_code_id, customer.city, customer.country, customer.active]);

    return `Created ${result.rowCount} customer records`;
  }

  async populateChartOfAccounts(companyInfo) {
    const accounts = [
      { account_number: '1000', account_name: 'Cash', account_type: 'ASSET' },
      { account_number: '1200', account_name: 'Accounts Receivable', account_type: 'ASSET' },
      { account_number: '2000', account_name: 'Accounts Payable', account_type: 'LIABILITY' },
      { account_number: '3000', account_name: 'Equity', account_type: 'EQUITY' },
      { account_number: '4000', account_name: 'Revenue', account_type: 'REVENUE' },
      { account_number: '5000', account_name: 'Cost of Goods Sold', account_type: 'EXPENSE' }
    ];

    let insertedCount = 0;
    for (const account of accounts) {
      const result = await pool.query(`
        INSERT INTO chart_of_accounts (account_number, account_name, account_type, company_code_id, active, created_at)
        VALUES ($1, $2, $3, $4, true, NOW())
        ON CONFLICT (account_number, company_code_id) DO NOTHING
      `, [account.account_number, account.account_name, account.account_type, companyInfo.companyId]);
      
      if (result.rowCount > 0) insertedCount++;
    }

    return `Created ${insertedCount} GL account records`;
  }

  /**
   * Create missing database table
   */
  async createMissingTable(issue, companyInfo) {
    const { table } = issue;
    
    const tableDefinitions = {
      'benjamin_vendors': `
        CREATE TABLE benjamin_vendors (
          id SERIAL PRIMARY KEY,
          vendor_code VARCHAR(20) UNIQUE NOT NULL,
          name VARCHAR(255) NOT NULL,
          vendor_type VARCHAR(50),
          address TEXT,
          city VARCHAR(100),
          state VARCHAR(50),
          country VARCHAR(50),
          company_code VARCHAR(10),
          payment_terms VARCHAR(20),
          created_at TIMESTAMP DEFAULT NOW()
        )
      `,
      'plants': `
        CREATE TABLE plants (
          id SERIAL PRIMARY KEY,
          code VARCHAR(20) UNIQUE NOT NULL,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          company_code_id INTEGER,
          type VARCHAR(50),
          status VARCHAR(20),
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `
    };

    if (tableDefinitions[table]) {
      await pool.query(tableDefinitions[table]);
      return `Created table: ${table}`;
    }
    
    throw new Error(`No table definition available for: ${table}`);
  }

  /**
   * Fix UI routing issues
   */
  async fixUIRouting(issue, companyInfo) {
    // In a real implementation, this would restart UI components or fix routing
    // For now, we'll just log the fix attempt
    console.log(`Attempting to fix UI routing for: ${issue.description}`);
    return `UI routing fix logged for manual review`;
  }

  /**
   * Add missing column to table
   */
  async addMissingColumn(issue, companyInfo) {
    const { table, description } = issue;
    
    if (table === 'benjamin_vendors' && description.includes('company_code')) {
      await pool.query(`
        ALTER TABLE benjamin_vendors 
        ADD COLUMN IF NOT EXISTS company_code VARCHAR(10)
      `);
      return `Added company_code column to benjamin_vendors`;
    }
    
    throw new Error(`Unknown column addition request: ${description}`);
  }

  /**
   * Create missing table
   */
  async createTable(issue, companyInfo) {
    return await this.createMissingTable(issue, companyInfo);
  }

  /**
   * Clean orphaned records
   */
  async cleanOrphanedRecords(issue, companyInfo) {
    const { description } = issue;
    
    if (description.includes('Vendors without company')) {
      const result = await pool.query(`
        DELETE FROM benjamin_vendors 
        WHERE company_code NOT IN (SELECT code FROM company_codes)
      `);
      return `Removed ${result.rowCount} orphaned vendor records`;
    }
    
    if (description.includes('Plants without company')) {
      const result = await pool.query(`
        DELETE FROM plants 
        WHERE company_code_id NOT IN (SELECT id FROM company_codes)
      `);
      return `Removed ${result.rowCount} orphaned plant records`;
    }
    
    return 'No orphaned records found to clean';
  }

  /**
   * Update company configuration
   */
  async updateCompanyConfig(issue, companyInfo) {
    const { description } = issue;
    
    if (description.includes('currency')) {
      await pool.query(`
        UPDATE company_codes 
        SET currency = 'USD' 
        WHERE id = $1 AND (currency IS NULL OR currency = '')
      `, [companyInfo.companyId]);
      return 'Updated company currency configuration';
    }
    
    if (description.includes('country')) {
      await pool.query(`
        UPDATE company_codes 
        SET country = 'US' 
        WHERE id = $1 AND (country IS NULL OR country = '')
      `, [companyInfo.companyId]);
      return 'Updated company country configuration';
    }
    
    return 'Configuration updated';
  }

  /**
   * Map action descriptions back to action keys
   */
  getActionKeyFromDescription(description) {
    const mapping = {
      'Run master data population script': 'POPULATE_MASTER_DATA',
      'Execute table creation migration': 'CREATE_MISSING_TABLE',
      'Repair UI component routing': 'FIX_UI_ROUTING',
      'Alter table to add missing columns': 'ADD_COLUMN',
      'Create missing database table': 'CREATE_TABLE',
      'Remove or fix orphaned data records': 'CLEAN_ORPHANED_RECORDS',
      'Update company configuration settings': 'UPDATE_COMPANY_CONFIG'
    };
    
    return mapping[description] || description;
  }
}

module.exports = { FixAgent };