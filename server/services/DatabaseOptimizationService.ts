import { db } from "../db";
import { sql } from "drizzle-orm";

export class DatabaseOptimizationService {
  private static instance: DatabaseOptimizationService;
  private indexStatus: Map<string, boolean> = new Map();
  private performanceMetrics: any[] = [];

  static getInstance(): DatabaseOptimizationService {
    if (!DatabaseOptimizationService.instance) {
      DatabaseOptimizationService.instance = new DatabaseOptimizationService();
    }
    return DatabaseOptimizationService.instance;
  }

  async optimizeDatabase() {
    console.log("🔧 Starting database optimization...");
    
    try {
      await this.createAdvancedIndexes();
      await this.optimizeQueries();
      await this.setupPerformanceMonitoring();
      await this.configureConnectionPooling();
      
      console.log("✅ Database optimization completed");
      return { success: true, metrics: this.performanceMetrics };
    } catch (error) {
      console.error("❌ Database optimization failed:", error);
      throw error;
    }
  }

  private async createAdvancedIndexes() {
    const indexes = [
      // Company codes optimization
      {
        name: 'idx_company_codes_active_code',
        query: `CREATE INDEX IF NOT EXISTS idx_company_codes_active_code ON company_codes(active, code) WHERE active = true;`
      },
      // Sales order performance
      {
        name: 'idx_sales_orders_date_status',
        query: `CREATE INDEX IF NOT EXISTS idx_sales_orders_date_status ON sales_orders(order_date, status);`
      },
      // Purchase order optimization  
      {
        name: 'idx_purchase_orders_vendor_date',
        query: `CREATE INDEX IF NOT EXISTS idx_purchase_orders_vendor_date ON purchase_orders(vendor_id, order_date);`
      },
      // Financial transactions
      {
        name: 'idx_gl_entries_account_date',
        query: `CREATE INDEX IF NOT EXISTS idx_gl_entries_account_date ON general_ledger_entries(account_id, posting_date);`
      },
      // Inventory optimization
      {
        name: 'idx_inventory_material_plant',
        query: `CREATE INDEX IF NOT EXISTS idx_inventory_material_plant ON inventory_levels(material_id, plant_id);`
      },
      // Customer management
      {
        name: 'idx_customers_status_type',
        query: `CREATE INDEX IF NOT EXISTS idx_customers_status_type ON customers(status, customer_type);`
      },
      // Employee records
      {
        name: 'idx_employees_dept_status',
        query: `CREATE INDEX IF NOT EXISTS idx_employees_dept_status ON employees(department_id, employment_status);`
      },
      // Audit trail performance
      {
        name: 'idx_audit_logs_table_timestamp',
        query: `CREATE INDEX IF NOT EXISTS idx_audit_logs_table_timestamp ON audit_logs(table_name, created_at);`
      }
    ];

    for (const index of indexes) {
      try {
        await db.execute(sql.raw(index.query));
        this.indexStatus.set(index.name, true);
        console.log(`✅ Created index: ${index.name}`);
      } catch (error) {
        console.log(`ℹ️ Index ${index.name} already exists or failed:`, error.message);
        this.indexStatus.set(index.name, false);
      }
    }
  }

  private async optimizeQueries() {
    // Analyze slow queries and create optimized views
    const optimizedViews = [
      {
        name: 'v_active_sales_summary',
        query: `
          CREATE OR REPLACE VIEW v_active_sales_summary AS
          SELECT 
            so.id,
            so.order_number,
            so.order_date,
            so.total_amount,
            c.name as customer_name,
            c.customer_code,
            cc.name as company_name
          FROM sales_orders so
          JOIN customers c ON so.customer_id = c.id
          JOIN company_codes cc ON so.company_code_id = cc.id
          WHERE so.status IN ('open', 'processing')
          AND cc.active = true;
        `
      },
      {
        name: 'v_inventory_status',
        query: `
          CREATE OR REPLACE VIEW v_inventory_status AS
          SELECT 
            m.id,
            m.material_code,
            m.description,
            il.current_stock,
            il.reserved_stock,
            il.available_stock,
            p.name as plant_name,
            sl.description as storage_location
          FROM materials m
          JOIN inventory_levels il ON m.id = il.material_id
          JOIN plants p ON il.plant_id = p.id
          LEFT JOIN storage_locations sl ON il.storage_location_id = sl.id
          WHERE il.current_stock > 0;
        `
      },
      {
        name: 'v_financial_summary',
        query: `
          CREATE OR REPLACE VIEW v_financial_summary AS
          SELECT 
            gle.id,
            gle.document_number,
            gle.posting_date,
            gle.debit_amount,
            gle.credit_amount,
            ga.account_number,
            ga.account_name,
            cc.name as company_name
          FROM general_ledger_entries gle
          JOIN gl_accounts ga ON gle.account_id = ga.id
          JOIN company_codes cc ON gle.company_code_id = cc.id
          WHERE gle.posting_date >= CURRENT_DATE - INTERVAL '90 days';
        `
      }
    ];

    for (const view of optimizedViews) {
      try {
        await db.execute(sql.raw(view.query));
        console.log(`✅ Created optimized view: ${view.name}`);
      } catch (error) {
        console.error(`❌ Failed to create view ${view.name}:`, error);
      }
    }
  }

  private async setupPerformanceMonitoring() {
    // Create performance monitoring tables
    const monitoringTable = `
      CREATE TABLE IF NOT EXISTS performance_metrics (
        id SERIAL PRIMARY KEY,
        metric_name VARCHAR(100) NOT NULL,
        metric_value DECIMAL(10,2),
        measurement_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        table_name VARCHAR(100),
        query_type VARCHAR(50),
        execution_time_ms INTEGER
      );
    `;

    try {
      await db.execute(sql.raw(monitoringTable));
      console.log("✅ Performance monitoring table created");
    } catch (error) {
      console.log("ℹ️ Performance monitoring table already exists");
    }
  }

  private async configureConnectionPooling() {
    // Log current connection status
    try {
      const connectionStats = await db.execute(sql.raw(`
        SELECT 
          state,
          COUNT(*) as connection_count
        FROM pg_stat_activity 
        WHERE datname = current_database()
        GROUP BY state;
      `));
      
      console.log("📊 Current database connections:", connectionStats.rows);
      this.performanceMetrics.push({
        type: 'connection_stats',
        data: connectionStats.rows,
        timestamp: new Date()
      });
    } catch (error) {
      console.log("ℹ️ Could not retrieve connection stats");
    }
  }

  async getPerformanceMetrics() {
    try {
      // Query execution times for key tables
      const slowQueries = await db.execute(sql.raw(`
        SELECT 
          query,
          calls,
          total_time,
          mean_time,
          rows
        FROM pg_stat_statements 
        WHERE query LIKE '%sales_orders%' 
           OR query LIKE '%purchase_orders%'
           OR query LIKE '%inventory_levels%'
        ORDER BY mean_time DESC 
        LIMIT 10;
      `));

      return {
        indexStatus: Object.fromEntries(this.indexStatus),
        slowQueries: slowQueries.rows || [],
        lastOptimized: new Date()
      };
    } catch (error) {
      console.log("ℹ️ pg_stat_statements extension not available");
      return {
        indexStatus: Object.fromEntries(this.indexStatus),
        slowQueries: [],
        lastOptimized: new Date()
      };
    }
  }

  async optimizeTable(tableName: string) {
    try {
      // Analyze table statistics
      await db.execute(sql.raw(`ANALYZE ${tableName};`));
      
      // Vacuum if needed
      await db.execute(sql.raw(`VACUUM ANALYZE ${tableName};`));
      
      console.log(`✅ Optimized table: ${tableName}`);
      return { success: true, table: tableName };
    } catch (error) {
      console.error(`❌ Failed to optimize table ${tableName}:`, error);
      return { success: false, table: tableName, error: error.message };
    }
  }
}

export const dbOptimizer = DatabaseOptimizationService.getInstance();