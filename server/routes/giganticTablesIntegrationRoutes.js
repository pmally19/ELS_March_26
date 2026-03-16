/**
 * GIGANTIC TABLES INTEGRATION API ROUTES
 * Complete sync of Inventory/Sales/Finance with Enterprise Gigantic Tables
 */

import express from 'express';
import pkg from 'pg';
const { Pool } = pkg;
const router = express.Router();

// Database connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

/**
 * POST /api/gigantic-integration/sync-inventory
 * Sync all inventory tables with gigantic enterprise tables
 */
router.post('/sync-inventory', async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const results = {
      stockMovements: 0,
      inventoryBalances: 0,
      financialTransactions: 0,
      errors: []
    };

    // 1. Sync stock movements to material_movement_registry
    const stockMovements = await client.query(`
      SELECT document_number, material_code, plant_code, storage_location, 
             movement_type, quantity, unit_price, total_value, cost_center,
             vendor_code, customer_code, created_at
      FROM stock_movements 
      WHERE document_number NOT IN (
        SELECT originating_document FROM material_movement_registry 
        WHERE business_transaction_type LIKE 'STOCK_MOVEMENT_%'
      )
    `);

    for (const movement of stockMovements.rows) {
      try {
        const movementUuid = `MMV-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const movementCategory = getMovementCategory(movement.movement_type);
        
        await client.query(`
          INSERT INTO material_movement_registry (
            movement_uuid, movement_sequence, movement_category, movement_subcategory,
            business_transaction_type, material_identifier, material_description,
            destination_location_code, source_location_code, movement_quantity,
            base_unit_measure, unit_valuation, total_valuation,
            originating_document, business_partner_code,
            execution_date, posting_date, effective_date, created_by,
            processing_status, quality_status,
            master_data_enrichment, organizational_context,
            business_impact_rating
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
            $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
            $21, $22, $23, $24
          )
        `, [
          movementUuid,
          `SEQ-${Date.now()}`,
          movementCategory,
          'STOCK_MOVEMENT',
          `STOCK_MOVEMENT_${movement.movement_type}`,
          movement.material_code,
          movement.material_code, // Will be enhanced with description lookup
          movement.storage_location,
          movement.plant_code,
          movement.quantity.toString(),
          'EA',
          (movement.unit_price || 0).toString(),
          (movement.total_value || 0).toString(),
          movement.document_number,
          movement.vendor_code || movement.customer_code,
          movement.created_at,
          movement.created_at,
          movement.created_at,
          1,
          'COMPLETED',
          'RELEASED',
          JSON.stringify({
            plantCode: movement.plant_code,
            storageLocation: movement.storage_location,
            movementType: movement.movement_type
          }),
          JSON.stringify({
            valueStream: "INVENTORY_MANAGEMENT",
            businessArea: "MATERIALS_MANAGEMENT",
            costCenter: movement.cost_center
          }),
          calculateMaterialImpact(movement.total_value || 0)
        ]);
        
        results.stockMovements++;

        // Create corresponding financial transaction if there's value
        if (movement.total_value && movement.total_value !== 0) {
          const transactionUuid = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          const currentDate = new Date();
          const fiscalPeriod = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

          await client.query(`
            INSERT INTO enterprise_transaction_registry (
              transaction_uuid, business_entity_code, fiscal_period,
              transaction_category, source_application, reference_document,
              primary_account, offset_account, debit_amount, credit_amount,
              net_amount, currency_code, base_currency_amount,
              material_service_code, cost_center_code, profit_center_code,
              business_date, posting_date, created_by,
              processing_status, approval_status,
              gl_account_master, organizational_hierarchy,
              transaction_magnitude, risk_level, business_impact_rating
            ) VALUES (
              $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
              $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
              $21, $22, $23, $24, $25, $26
            )
          `, [
            transactionUuid,
            'MALLY-CORP',
            fiscalPeriod,
            'INVENTORY',
            'INVENTORY_MANAGEMENT',
            movement.document_number,
            '1400', // Inventory Asset
            '5000', // Cost of Goods Sold
            movement.total_value > 0 ? movement.total_value.toString() : '0.00',
            movement.total_value < 0 ? Math.abs(movement.total_value).toString() : '0.00',
            movement.total_value.toString(),
            'USD',
            movement.total_value.toString(),
            movement.material_code,
            movement.cost_center || 'CC001',
            'PC001',
            movement.created_at,
            movement.created_at,
            1,
            'ACTIVE',
            'APPROVED',
            JSON.stringify({ accountType: "ASSET", accountGroup: "INVENTORY" }),
            JSON.stringify({ businessArea: "MATERIALS_MANAGEMENT", valueStream: "INVENTORY_CONTROL" }),
            calculateTransactionMagnitude(movement.total_value),
            assessRiskLevel(movement.total_value, 'INVENTORY'),
            calculateBusinessImpact(movement.total_value)
          ]);

          results.financialTransactions++;
        }
      } catch (error) {
        results.errors.push(`Stock movement ${movement.document_number}: ${error.message}`);
      }
    }

    await client.query('COMMIT');
    
    console.log(`Gigantic tables sync completed: ${JSON.stringify(results)}`);
    res.json({
      success: true,
      message: 'Inventory integration with gigantic tables completed successfully',
      results
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error syncing to gigantic tables:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync inventory with gigantic tables',
      details: error.message
    });
  } finally {
    client.release();
  }
});

/**
 * POST /api/gigantic-integration/sync-sales-finance
 * Sync all sales and finance tables with gigantic enterprise tables
 */
router.post('/sync-sales-finance', async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const results = {
      salesOrders: 0,
      payments: 0,
      vendorInvoices: 0,
      errors: []
    };

    // 1. Sync sales orders from orders table
    const salesOrders = await client.query(`
      SELECT id as sales_order_id, customer_id as customer_code, 
             order_number, total as total_amount, 'USD' as currency, 
             date as order_date, date as created_at
      FROM orders 
      WHERE order_number NOT IN (
        SELECT reference_document FROM enterprise_transaction_registry 
        WHERE source_application = 'SALES_ORDER_MANAGEMENT'
      )
    `);

    for (const order of salesOrders.rows) {
      try {
        const transactionUuid = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const currentDate = new Date();
        const fiscalPeriod = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

        await client.query(`
          INSERT INTO enterprise_transaction_registry (
            transaction_uuid, business_entity_code, fiscal_period,
            transaction_category, source_application, reference_document,
            primary_account, offset_account, debit_amount, credit_amount,
            net_amount, currency_code, base_currency_amount,
            customer_vendor_code, cost_center_code, profit_center_code,
            business_date, posting_date, created_by,
            processing_status, approval_status,
            gl_account_master, organizational_hierarchy,
            transaction_magnitude, risk_level, business_impact_rating
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
            $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
            $21, $22, $23, $24, $25, $26
          )
        `, [
          transactionUuid,
          'MALLY-CORP',
          fiscalPeriod,
          'SALES',
          'SALES_ORDER_MANAGEMENT',
          order.order_number,
          '1300', // Accounts Receivable
          '4000', // Revenue
          order.total_amount.toString(),
          '0.00',
          order.total_amount.toString(),
          order.currency,
          order.total_amount.toString(),
          order.customer_code.toString(),
          'CC001',
          'PC001',
          order.order_date,
          order.created_at,
          1,
          'ACTIVE',
          'APPROVED',
          JSON.stringify({ accountType: "RECEIVABLE", accountGroup: "CUSTOMER" }),
          JSON.stringify({ businessArea: "SALES", valueStream: "ORDER_TO_CASH" }),
          calculateTransactionMagnitude(order.total_amount),
          assessRiskLevel(order.total_amount, 'SALES'),
          calculateBusinessImpact(order.total_amount)
        ]);

        results.salesOrders++;
      } catch (error) {
        results.errors.push(`Sales order ${order.order_number}: ${error.message}`);
      }
    }

    await client.query('COMMIT');
    
    console.log(`Sales/Finance sync completed: ${JSON.stringify(results)}`);
    res.json({
      success: true,
      message: 'Sales and finance integration with gigantic tables completed successfully',
      results
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error syncing sales/finance to gigantic tables:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to sync sales/finance with gigantic tables',
      details: error.message
    });
  } finally {
    client.release();
  }
});

/**
 * GET /api/gigantic-integration/status
 * Get current integration status between regular tables and gigantic tables
 */
router.get('/status', async (req, res) => {
  try {
    const client = await pool.connect();
    
    // Count records in gigantic tables
    const giganticStats = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM enterprise_transaction_registry) as financial_transactions,
        (SELECT COUNT(*) FROM material_movement_registry) as material_movements
    `);

    // Count records in regular tables
    const regularStats = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM stock_movements) as stock_movements,
        (SELECT COUNT(*) FROM inventory_balance) as inventory_balances,
        (SELECT COUNT(*) FROM orders) as sales_orders,
        (SELECT COUNT(*) FROM orders WHERE status = 'PAID') as payments
    `);

    // Check integration gaps
    const integrationGaps = await client.query(`
      SELECT 
        (SELECT COUNT(*) FROM stock_movements sm 
         WHERE sm.document_number NOT IN (
           SELECT originating_document FROM material_movement_registry 
           WHERE business_transaction_type LIKE 'STOCK_MOVEMENT_%'
         )) as unsynced_stock_movements,
        (SELECT COUNT(*) FROM orders so 
         WHERE so.order_number NOT IN (
           SELECT reference_document FROM enterprise_transaction_registry 
           WHERE source_application = 'SALES_ORDER_MANAGEMENT'
         )) as unsynced_sales_orders
    `);

    client.release();

    res.json({
      success: true,
      giganticTables: giganticStats.rows[0],
      regularTables: regularStats.rows[0],
      integrationGaps: integrationGaps.rows[0],
      recommendations: generateIntegrationRecommendations(integrationGaps.rows[0])
    });

  } catch (error) {
    console.error('Error getting integration status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get integration status',
      details: error.message
    });
  }
});

// Helper functions
function getMovementCategory(movementType) {
  const movementMapping = {
    "101": "RECEIPT",     // Purchase Receipt
    "102": "RECEIPT",     // Stock Receipt
    "131": "RECEIPT",     // Production Receipt
    "601": "ISSUE",       // Sales Issue
    "602": "ISSUE",       // Production Issue
    "261": "ISSUE",       // Production Issue
    "301": "TRANSFER",    // Stock Transfer
    "302": "TRANSFER",    // Transfer
    "701": "ADJUSTMENT",  // Inventory Adjustment
    "702": "ADJUSTMENT"   // Physical Inventory
  };
  return movementMapping[movementType] || "ADJUSTMENT";
}

function calculateTransactionMagnitude(amount) {
  if (Math.abs(amount) > 100000) return "LARGE";
  if (Math.abs(amount) > 10000) return "MEDIUM";
  return "SMALL";
}

function assessRiskLevel(amount, category) {
  if (Math.abs(amount) > 50000) return "HIGH";
  if (Math.abs(amount) > 10000) return "MEDIUM";
  return "LOW";
}

function calculateBusinessImpact(amount) {
  if (Math.abs(amount) > 75000) return "CRITICAL";
  if (Math.abs(amount) > 25000) return "HIGH";
  if (Math.abs(amount) > 5000) return "MEDIUM";
  return "LOW";
}

function calculateMaterialImpact(value) {
  if (value > 50000) return "CRITICAL";
  if (value > 15000) return "HIGH";
  if (value > 3000) return "MEDIUM";
  return "LOW";
}

function generateIntegrationRecommendations(gaps) {
  const recommendations = [];
  
  if (gaps.unsynced_stock_movements > 0) {
    recommendations.push(`Sync ${gaps.unsynced_stock_movements} unintegrated stock movements`);
  }
  
  if (gaps.unsynced_sales_orders > 0) {
    recommendations.push(`Sync ${gaps.unsynced_sales_orders} unintegrated sales orders`);
  }
  
  if (recommendations.length === 0) {
    recommendations.push("All tables are properly integrated with gigantic enterprise tables");
  }
  
  return recommendations;
}

export default router;