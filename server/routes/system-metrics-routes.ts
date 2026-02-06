/**
 * System Metrics API Routes
 * Provides comprehensive system performance metrics and statistics
 */

import { Router, Request, Response } from 'express';
import { pool } from '../db';
import { ensureActivePool } from '../database';

const router = Router();

/**
 * GET /api/system-metrics/overview
 * Get comprehensive system metrics overview
 */
router.get('/overview', async (req: Request, res: Response) => {
  try {
    const activePool = ensureActivePool();
    
    // Database Statistics
    const dbStats = await activePool.query(`
      SELECT 
        (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public') as total_tables,
        (SELECT COUNT(*) FROM information_schema.views WHERE table_schema = 'public') as total_views,
        (SELECT pg_database_size(current_database())) as database_size_bytes
    `);

    // Master Data Statistics
    const masterDataStats = await activePool.query(`
      SELECT 
        (SELECT COUNT(*) FROM company_codes WHERE active = true) as active_company_codes,
        (SELECT COUNT(*) FROM erp_customers WHERE is_active = true OR active = true) as active_customers,
        (SELECT COUNT(*) FROM erp_vendors WHERE is_active = true OR active = true) as active_vendors,
        (SELECT COUNT(*) FROM materials WHERE is_active = true) as active_materials,
        (SELECT COUNT(*) FROM plants WHERE is_active = true OR active = true) as active_plants,
        (SELECT COUNT(*) FROM storage_locations WHERE is_active = true OR active = true) as active_storage_locations
    `);

    // Transaction Statistics
    const transactionStats = await activePool.query(`
      SELECT 
        (SELECT COUNT(*) FROM sales_orders WHERE status != 'Cancelled') as total_sales_orders,
        (SELECT COUNT(*) FROM purchase_orders WHERE status != 'Cancelled') as total_purchase_orders,
        (SELECT COUNT(*) FROM gl_document_headers WHERE status = 'Posted') as posted_gl_documents,
        (SELECT COALESCE(SUM(total_amount), 0) FROM gl_document_headers WHERE status = 'Posted') as total_posted_amount
    `);

    // Financial Statistics
    const financialStats = await activePool.query(`
      SELECT 
        (SELECT COUNT(*) FROM gl_accounts WHERE is_active = true) as active_gl_accounts,
        (SELECT COUNT(*) FROM ar_open_items WHERE active = true) as open_ar_items,
        (SELECT COALESCE(SUM(outstanding_amount), 0) FROM ar_open_items WHERE active = true) as total_ar_outstanding,
        (SELECT COUNT(*) FROM ap_open_items WHERE active = true) as open_ap_items,
        (SELECT COALESCE(SUM(outstanding_amount), 0) FROM ap_open_items WHERE active = true) as total_ap_outstanding
    `);

    // Asset Management Statistics
    const assetStats = await activePool.query(`
      SELECT 
        (SELECT COUNT(*) FROM asset_master WHERE (is_active = true OR active = true)) as total_assets,
        (SELECT COUNT(*) FROM asset_master WHERE UPPER(TRIM(COALESCE(status, 'Active'))) = 'ACTIVE' AND (is_active = true OR active = true)) as active_assets,
        (SELECT COALESCE(SUM(acquisition_cost), 0) FROM asset_master WHERE (is_active = true OR active = true)) as total_acquisition_value,
        (SELECT COUNT(*) FROM asset_depreciation_runs WHERE status = 'COMPLETED') as completed_depreciation_runs
    `);

    // Inventory Statistics
    const inventoryStats = await activePool.query(`
      SELECT 
        (SELECT COUNT(DISTINCT material_code) FROM inventory_balance WHERE quantity > 0) as materials_with_stock,
        (SELECT COALESCE(SUM(quantity), 0) FROM inventory_balance) as total_quantity,
        (SELECT COUNT(*) FROM stock_movements WHERE created_at >= NOW() - INTERVAL '30 days') as movements_last_30_days
    `);

    // Production Statistics
    const productionStats = await activePool.query(`
      SELECT 
        (SELECT COUNT(*) FROM production_orders WHERE status IN ('Released', 'In Process')) as active_production_orders,
        (SELECT COUNT(*) FROM work_centers WHERE is_active = true) as active_work_centers,
        (SELECT COUNT(*) FROM boms WHERE is_active = true) as active_boms
    `);

    // User Activity Statistics (if users table exists)
    let userStats = { total_users: 0, active_users: 0 };
    try {
      const userResult = await activePool.query(`
        SELECT 
          COUNT(*) as total_users,
          COUNT(CASE WHEN last_login >= NOW() - INTERVAL '30 days' THEN 1 END) as active_users
        FROM users
      `);
      if (userResult.rows.length > 0) {
        userStats = userResult.rows[0];
      }
    } catch (error) {
      // Users table might not exist, ignore
      console.log('Users table not found, skipping user statistics');
    }

    // System Health Metrics
    const healthMetrics = await activePool.query(`
      SELECT 
        (SELECT COUNT(*) FROM error_logs WHERE created_at >= NOW() - INTERVAL '24 hours') as errors_last_24h,
        (SELECT COUNT(*) FROM error_logs WHERE created_at >= NOW() - INTERVAL '7 days') as errors_last_7d
    `);

    const overview = {
      timestamp: new Date().toISOString(),
      database: {
        totalTables: parseInt(dbStats.rows[0]?.total_tables || '0'),
        totalViews: parseInt(dbStats.rows[0]?.total_views || '0'),
        databaseSizeBytes: parseInt(dbStats.rows[0]?.database_size_bytes || '0'),
        databaseSizeMB: Math.round(parseInt(dbStats.rows[0]?.database_size_bytes || '0') / 1024 / 1024)
      },
      masterData: {
        companyCodes: parseInt(masterDataStats.rows[0]?.active_company_codes || '0'),
        customers: parseInt(masterDataStats.rows[0]?.active_customers || '0'),
        vendors: parseInt(masterDataStats.rows[0]?.active_vendors || '0'),
        materials: parseInt(masterDataStats.rows[0]?.active_materials || '0'),
        plants: parseInt(masterDataStats.rows[0]?.active_plants || '0'),
        storageLocations: parseInt(masterDataStats.rows[0]?.active_storage_locations || '0')
      },
      transactions: {
        salesOrders: parseInt(transactionStats.rows[0]?.total_sales_orders || '0'),
        purchaseOrders: parseInt(transactionStats.rows[0]?.total_purchase_orders || '0'),
        postedGLDocuments: parseInt(transactionStats.rows[0]?.posted_gl_documents || '0'),
        totalPostedAmount: parseFloat(transactionStats.rows[0]?.total_posted_amount || '0')
      },
      financial: {
        glAccounts: parseInt(financialStats.rows[0]?.active_gl_accounts || '0'),
        openARItems: parseInt(financialStats.rows[0]?.open_ar_items || '0'),
        totalAROutstanding: parseFloat(financialStats.rows[0]?.total_ar_outstanding || '0'),
        openAPItems: parseInt(financialStats.rows[0]?.open_ap_items || '0'),
        totalAPOutstanding: parseFloat(financialStats.rows[0]?.total_ap_outstanding || '0')
      },
      assets: {
        totalAssets: parseInt(assetStats.rows[0]?.total_assets || '0'),
        activeAssets: parseInt(assetStats.rows[0]?.active_assets || '0'),
        totalAcquisitionValue: parseFloat(assetStats.rows[0]?.total_acquisition_value || '0'),
        completedDepreciationRuns: parseInt(assetStats.rows[0]?.completed_depreciation_runs || '0')
      },
      inventory: {
        materialsWithStock: parseInt(inventoryStats.rows[0]?.materials_with_stock || '0'),
        totalQuantity: parseFloat(inventoryStats.rows[0]?.total_quantity || '0'),
        movementsLast30Days: parseInt(inventoryStats.rows[0]?.movements_last_30_days || '0')
      },
      production: {
        activeProductionOrders: parseInt(productionStats.rows[0]?.active_production_orders || '0'),
        activeWorkCenters: parseInt(productionStats.rows[0]?.active_work_centers || '0'),
        activeBOMs: parseInt(productionStats.rows[0]?.active_boms || '0')
      },
      users: userStats,
      systemHealth: {
        errorsLast24h: parseInt(healthMetrics.rows[0]?.errors_last_24h || '0'),
        errorsLast7d: parseInt(healthMetrics.rows[0]?.errors_last_7d || '0')
      }
    };

    res.json({
      success: true,
      data: overview,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching system metrics overview:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch system metrics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/system-metrics/module/:moduleName
 * Get metrics for a specific module
 */
router.get('/module/:moduleName', async (req: Request, res: Response) => {
  try {
    const { moduleName } = req.params;
    const activePool = ensureActivePool();
    
    let moduleMetrics: any = {};

    switch (moduleName.toLowerCase()) {
      case 'sales':
        const salesResult = await activePool.query(`
          SELECT 
            COUNT(*) as total_orders,
            COUNT(CASE WHEN status = 'Completed' THEN 1 END) as completed_orders,
            COUNT(CASE WHEN status = 'Pending' THEN 1 END) as pending_orders,
            COALESCE(SUM(total_amount), 0) as total_revenue
          FROM sales_orders
          WHERE status != 'Cancelled'
        `);
        moduleMetrics = salesResult.rows[0];
        break;

      case 'inventory':
        const inventoryResult = await activePool.query(`
          SELECT 
            COUNT(DISTINCT material_code) as unique_materials,
            COALESCE(SUM(quantity), 0) as total_quantity,
            COUNT(CASE WHEN quantity < 0 THEN 1 END) as negative_balances,
            COUNT(CASE WHEN quantity = 0 THEN 1 END) as zero_balances
          FROM inventory_balance
        `);
        moduleMetrics = inventoryResult.rows[0];
        break;

      case 'finance':
        const financeResult = await activePool.query(`
          SELECT 
            (SELECT COUNT(*) FROM gl_accounts WHERE is_active = true) as active_accounts,
            (SELECT COUNT(*) FROM gl_document_headers WHERE status = 'Posted') as posted_documents,
            (SELECT COALESCE(SUM(total_amount), 0) FROM gl_document_headers WHERE status = 'Posted') as total_posted_amount
        `);
        moduleMetrics = financeResult.rows[0];
        break;

      case 'assets':
        const assetsResult = await activePool.query(`
          SELECT 
            COUNT(*) as total_assets,
            COUNT(CASE WHEN UPPER(TRIM(COALESCE(status, 'Active'))) = 'ACTIVE' THEN 1 END) as active_assets,
            COALESCE(SUM(acquisition_cost), 0) as total_value,
            COUNT(*) FILTER (WHERE depreciation_method_id IS NOT NULL) as assets_with_depreciation
          FROM asset_master
          WHERE (is_active = true OR active = true)
        `);
        moduleMetrics = assetsResult.rows[0];
        break;

      default:
        return res.status(404).json({
          success: false,
          error: `Module '${moduleName}' not found`
        });
    }

    res.json({
      success: true,
      module: moduleName,
      data: moduleMetrics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(`Error fetching metrics for module ${req.params.moduleName}:`, error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch module metrics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;

