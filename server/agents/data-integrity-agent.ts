/**
 * Data Integrity and UI Synchronization Agent
 * Checks database tables vs UI screens for Master Data, Transactions, and Business Domain
 * Identifies missing codes, sync issues, and data consistency problems
 */

import { pool } from "../db";

interface IntegrityIssue {
  category: 'MASTER_DATA' | 'TRANSACTIONS' | 'BUSINESS_DOMAIN';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  type: 'MISSING_DATA' | 'UI_SYNC' | 'FOREIGN_KEY' | 'CONSTRAINT' | 'ORPHANED_DATA';
  table: string;
  issue: string;
  recommendation: string;
  affectedRecords?: number;
  details?: any;
}

class DataIntegrityAgent {
  private issues: IntegrityIssue[] = [];

  async performComprehensiveCheck(): Promise<{
    summary: {
      masterData: number;
      transactions: number;
      businessDomain: number;
      totalIssues: number;
    };
    issues: IntegrityIssue[];
    recommendations: string[];
  }> {
    console.log("🔍 Starting comprehensive data integrity check...");
    
    this.issues = [];
    
    // Check Master Data integrity
    await this.checkMasterDataIntegrity();
    
    // Check Transaction data integrity
    await this.checkTransactionIntegrity();
    
    // Check Business Domain integrity
    await this.checkBusinessDomainIntegrity();
    
    return this.generateReport();
  }

  private async checkMasterDataIntegrity() {
    console.log("📊 Checking Master Data integrity...");
    
    // Check Company Codes
    await this.checkTable('company_codes', 'MASTER_DATA', {
      requiredFields: ['code', 'name'],
      uniqueConstraints: ['code'],
      foreignKeys: []
    });

    // Check Plants
    await this.checkTable('plants', 'MASTER_DATA', {
      requiredFields: ['code', 'name', 'company_code_id'],
      uniqueConstraints: ['code'],
      foreignKeys: [{ field: 'company_code_id', refTable: 'company_codes', refField: 'id' }]
    });

    // Check Storage Locations
    await this.checkTable('storage_locations', 'MASTER_DATA', {
      requiredFields: ['location_code', 'name'],
      uniqueConstraints: ['location_code'],
      foreignKeys: []
    });

    // Check Customers
    await this.checkTable('customers', 'MASTER_DATA', {
      requiredFields: ['name', 'code'],
      uniqueConstraints: ['code'],
      foreignKeys: [{ field: 'company_code_id', refTable: 'company_codes', refField: 'id' }]
    });

    // Check Materials
    await this.checkTable('materials', 'MASTER_DATA', {
      requiredFields: ['code', 'name', 'type'],
      uniqueConstraints: ['code'],
      foreignKeys: []
    });

    // Check GL Accounts
    await this.checkTable('general_ledger_accounts', 'MASTER_DATA', {
      requiredFields: ['account_number', 'account_name', 'account_type'],
      uniqueConstraints: [],
      foreignKeys: [{ field: 'company_code_id', refTable: 'company_codes', refField: 'id' }]
    });

    // Check Benjamin Moore specific data
    await this.checkBenjaminMooreIntegrity();
  }

  private async checkTransactionIntegrity() {
    console.log("💼 Checking Transaction data integrity...");
    
    // Check Sales Orders
    await this.checkTable('sales_orders', 'TRANSACTIONS', {
      requiredFields: ['order_number', 'customer_id'],
      uniqueConstraints: ['order_number'],
      foreignKeys: [{ field: 'customer_id', refTable: 'customers', refField: 'id' }]
    });

    // Check Invoices
    await this.checkTable('invoices', 'TRANSACTIONS', {
      requiredFields: ['invoice_number'],
      uniqueConstraints: ['invoice_number'],
      foreignKeys: [{ field: 'customer_id', refTable: 'customers', refField: 'id' }]
    });

    // Check Purchase Orders
    await this.checkTable('purchase_orders', 'TRANSACTIONS', {
      requiredFields: ['po_number'],
      uniqueConstraints: ['po_number'],
      foreignKeys: []
    });

    // Check Financial Transactions
    await this.checkFinancialTransactions();
  }

  private async checkBusinessDomainIntegrity() {
    console.log("🏢 Checking Business Domain integrity...");
    
    // Check organizational hierarchy
    await this.checkOrganizationalHierarchy();
    
    // Check data consistency across modules
    await this.checkCrossModuleConsistency();
    
    // Check UI endpoint data availability
    await this.checkUIEndpointConsistency();
  }

  private async checkTable(tableName: string, category: IntegrityIssue['category'], config: {
    requiredFields: string[];
    uniqueConstraints: string[];
    foreignKeys: { field: string; refTable: string; refField: string; }[];
  }) {
    try {
      // Check if table exists
      const tableExists = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        );
      `, [tableName]);

      if (!tableExists.rows[0].exists) {
        this.issues.push({
          category,
          severity: 'CRITICAL',
          type: 'MISSING_DATA',
          table: tableName,
          issue: `Table '${tableName}' does not exist`,
          recommendation: `Create ${tableName} table with proper schema`
        });
        return;
      }

      // Check record count
      const countResult = await pool.query(`SELECT COUNT(*) as count FROM ${tableName}`);
      const recordCount = parseInt(countResult.rows[0].count);

      if (recordCount === 0) {
        this.issues.push({
          category,
          severity: 'HIGH',
          type: 'MISSING_DATA',
          table: tableName,
          issue: `Table '${tableName}' has no data`,
          recommendation: `Populate ${tableName} with master data`,
          affectedRecords: 0
        });
      }

      // Check required fields for null values
      for (const field of config.requiredFields) {
        try {
          const nullCheck = await pool.query(`
            SELECT COUNT(*) as null_count 
            FROM ${tableName} 
            WHERE ${field} IS NULL OR ${field} = ''
          `);
          
          const nullCount = parseInt(nullCheck.rows[0].null_count);
          if (nullCount > 0) {
            this.issues.push({
              category,
              severity: 'HIGH',
              type: 'MISSING_DATA',
              table: tableName,
              issue: `${nullCount} records have null/empty ${field}`,
              recommendation: `Update ${field} values in ${tableName}`,
              affectedRecords: nullCount
            });
          }
        } catch (error) {
          // Field might not exist
          this.issues.push({
            category,
            severity: 'MEDIUM',
            type: 'CONSTRAINT',
            table: tableName,
            issue: `Field '${field}' does not exist in ${tableName}`,
            recommendation: `Add ${field} column to ${tableName}`
          });
        }
      }

      // Check foreign key integrity
      for (const fk of config.foreignKeys) {
        try {
          const orphanCheck = await pool.query(`
            SELECT COUNT(*) as orphan_count
            FROM ${tableName} t
            LEFT JOIN ${fk.refTable} r ON t.${fk.field} = r.${fk.refField}
            WHERE t.${fk.field} IS NOT NULL AND r.${fk.refField} IS NULL
          `);
          
          const orphanCount = parseInt(orphanCheck.rows[0].orphan_count);
          if (orphanCount > 0) {
            this.issues.push({
              category,
              severity: 'CRITICAL',
              type: 'ORPHANED_DATA',
              table: tableName,
              issue: `${orphanCount} records have invalid ${fk.field} references`,
              recommendation: `Fix foreign key references in ${tableName}.${fk.field}`,
              affectedRecords: orphanCount
            });
          }
        } catch (error) {
          // Referenced table might not exist
        }
      }

    } catch (error) {
      this.issues.push({
        category,
        severity: 'CRITICAL',
        type: 'CONSTRAINT',
        table: tableName,
        issue: `Error checking table: ${error.message}`,
        recommendation: `Investigate table structure for ${tableName}`
      });
    }
  }

  private async checkBenjaminMooreIntegrity() {
    try {
      // Check if Benjamin Moore company exists
      const bmCompany = await pool.query(`
        SELECT COUNT(*) as count FROM company_codes WHERE code = 'BMUS'
      `);
      
      if (parseInt(bmCompany.rows[0].count) === 0) {
        this.issues.push({
          category: 'MASTER_DATA',
          severity: 'HIGH',
          type: 'MISSING_DATA',
          table: 'company_codes',
          issue: 'Benjamin Moore company code (BMUS) missing',
          recommendation: 'Create BMUS company code'
        });
        return;
      }

      // Check Benjamin Moore plant
      const bmPlant = await pool.query(`
        SELECT COUNT(*) as count FROM plants WHERE code = 'BM-PLANT-NJ'
      `);
      
      if (parseInt(bmPlant.rows[0].count) === 0) {
        this.issues.push({
          category: 'MASTER_DATA',
          severity: 'HIGH',
          type: 'MISSING_DATA',
          table: 'plants',
          issue: 'Benjamin Moore plant (BM-PLANT-NJ) missing',
          recommendation: 'Create BM-PLANT-NJ plant'
        });
      }

      // Check Benjamin Moore customers
      const bmCustomers = await pool.query(`
        SELECT COUNT(*) as count FROM customers WHERE code LIKE 'C-%'
      `);
      
      if (parseInt(bmCustomers.rows[0].count) === 0) {
        this.issues.push({
          category: 'MASTER_DATA',
          severity: 'MEDIUM',
          type: 'MISSING_DATA',
          table: 'customers',
          issue: 'No Benjamin Moore customers found',
          recommendation: 'Create paint industry customers (PaintMart, etc.)'
        });
      }

      // Check Benjamin Moore GL accounts
      const bmAccounts = await pool.query(`
        SELECT COUNT(*) as count FROM general_ledger_accounts WHERE company_code_id = 7
      `);
      
      if (parseInt(bmAccounts.rows[0].count) === 0) {
        this.issues.push({
          category: 'MASTER_DATA',
          severity: 'HIGH',
          type: 'MISSING_DATA',
          table: 'general_ledger_accounts',
          issue: 'No GL accounts for Benjamin Moore',
          recommendation: 'Create paint industry chart of accounts'
        });
      }

    } catch (error) {
      this.issues.push({
        category: 'MASTER_DATA',
        severity: 'MEDIUM',
        type: 'CONSTRAINT',
        table: 'multiple',
        issue: `Error checking Benjamin Moore data: ${error.message}`,
        recommendation: 'Investigate Benjamin Moore data structure'
      });
    }
  }

  private async checkFinancialTransactions() {
    // Check AR/AP items
    const tables = ['ar_items', 'ap_items'];
    
    for (const table of tables) {
      try {
        const result = await pool.query(`
          SELECT COUNT(*) as count FROM ${table}
        `);
        
        if (parseInt(result.rows[0].count) === 0) {
          this.issues.push({
            category: 'TRANSACTIONS',
            severity: 'MEDIUM',
            type: 'MISSING_DATA',
            table,
            issue: `No ${table.replace('_', ' ')} transactions found`,
            recommendation: `Create sample ${table} for testing`
          });
        }
      } catch (error) {
        this.issues.push({
          category: 'TRANSACTIONS',
          severity: 'LOW',
          type: 'MISSING_DATA',
          table,
          issue: `Table ${table} does not exist`,
          recommendation: `Create ${table} table if needed`
        });
      }
    }
  }

  private async checkOrganizationalHierarchy() {
    try {
      // Check company -> plant hierarchy
      const hierarchyCheck = await pool.query(`
        SELECT 
          cc.code as company_code,
          COUNT(p.id) as plant_count
        FROM company_codes cc
        LEFT JOIN plants p ON cc.id = p.company_code_id
        GROUP BY cc.id, cc.code
        HAVING COUNT(p.id) = 0
      `);

      for (const row of hierarchyCheck.rows) {
        this.issues.push({
          category: 'BUSINESS_DOMAIN',
          severity: 'MEDIUM',
          type: 'MISSING_DATA',
          table: 'plants',
          issue: `Company ${row.company_code} has no plants`,
          recommendation: `Create plants for company ${row.company_code}`
        });
      }

    } catch (error) {
      this.issues.push({
        category: 'BUSINESS_DOMAIN',
        severity: 'LOW',
        type: 'CONSTRAINT',
        table: 'organizational',
        issue: `Error checking hierarchy: ${error.message}`,
        recommendation: 'Check organizational table relationships'
      });
    }
  }

  private async checkCrossModuleConsistency() {
    try {
      // Check customer consistency across sales and finance
      const customerConsistency = await pool.query(`
        SELECT c.code, c.name,
               COUNT(so.id) as sales_orders,
               COUNT(ar.id) as ar_items
        FROM customers c
        LEFT JOIN sales_orders so ON c.id = so.customer_id
        LEFT JOIN ar_items ar ON c.id = ar.customer_id
        WHERE c.code LIKE 'C-%'
        GROUP BY c.id, c.code, c.name
      `);

      for (const row of customerConsistency.rows) {
        if (row.sales_orders === '0' && row.ar_items === '0') {
          this.issues.push({
            category: 'BUSINESS_DOMAIN',
            severity: 'LOW',
            type: 'MISSING_DATA',
            table: 'multiple',
            issue: `Customer ${row.code} has no transactions`,
            recommendation: `Create test transactions for ${row.name}`
          });
        }
      }

    } catch (error) {
      // Tables might not exist - this is informational
    }
  }

  private async checkUIEndpointConsistency() {
    // List of critical UI endpoints that should have data
    const endpoints = [
      { path: '/api/master-data/company-code', table: 'company_codes' },
      { path: '/api/master-data/plant', table: 'plants' },
      { path: '/api/master-data/storage-location', table: 'storage_locations' },
      { path: '/api/master-data/customer', table: 'customers' },
      { path: '/api/master-data/material', table: 'materials' }
    ];

    for (const endpoint of endpoints) {
      try {
        const result = await pool.query(`SELECT COUNT(*) as count FROM ${endpoint.table}`);
        const count = parseInt(result.rows[0].count);
        
        if (count === 0) {
          this.issues.push({
            category: 'BUSINESS_DOMAIN',
            severity: 'HIGH',
            type: 'UI_SYNC',
            table: endpoint.table,
            issue: `UI endpoint ${endpoint.path} will show empty data`,
            recommendation: `Populate ${endpoint.table} to display in UI`
          });
        }
      } catch (error) {
        this.issues.push({
          category: 'BUSINESS_DOMAIN',
          severity: 'CRITICAL',
          type: 'UI_SYNC',
          table: endpoint.table,
          issue: `UI endpoint ${endpoint.path} will fail - table missing`,
          recommendation: `Create ${endpoint.table} table`
        });
      }
    }
  }

  private generateReport() {
    const summary = {
      masterData: this.issues.filter(i => i.category === 'MASTER_DATA').length,
      transactions: this.issues.filter(i => i.category === 'TRANSACTIONS').length,
      businessDomain: this.issues.filter(i => i.category === 'BUSINESS_DOMAIN').length,
      totalIssues: this.issues.length
    };

    const recommendations = [
      "Fix CRITICAL severity issues first to maintain data integrity",
      "Populate missing master data tables for complete ERP functionality",
      "Verify UI endpoints return expected data",
      "Test Benjamin Moore paint company workflows end-to-end",
      "Create sample transactions for testing business processes"
    ];

    return { summary, issues: this.issues, recommendations };
  }
}

// Export the class
export { DataIntegrityAgent };

// Default export for backward compatibility
export default new DataIntegrityAgent();

export const dataIntegrityAgent = new DataIntegrityAgent();