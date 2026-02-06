import { Router } from "express";
import { mrpIntegrationService } from "../services/mrpIntegrationService";
import { pool } from "../db";

const router = Router();

// Using imported pool connection from db module

/**
 * Execute MRP Run with full accounting integration
 * POST /api/mrp-integration/execute-mrp
 */
router.post("/execute-mrp", async (req, res) => {
  try {
    const { plantId, mrpArea, planningHorizon, runType } = req.body;
    
    const result = await mrpIntegrationService.executeMrpRun({
      plantId: plantId ? parseInt(plantId) : undefined,
      mrpArea,
      planningHorizon: planningHorizon ? parseInt(planningHorizon) : 365,
      runType: runType || 'TOTAL'
    });
    
    res.json({
      success: true,
      data: result,
      message: "MRP run completed successfully"
    });
  } catch (error) {
    console.error('MRP execution error:', error);
    res.status(500).json({
      success: false,
      error: "Failed to execute MRP run",
      details: error.message
    });
  }
});

/**
 * Get MRP Controllers with plant information
 * GET /api/mrp-integration/controllers
 */
router.get("/controllers", async (req, res) => {
  try {
    const { plantId } = req.query;
    
    const controllers = await mrpIntegrationService.getMrpControllers(
      plantId ? parseInt(plantId as string) : undefined
    );
    
    res.json({
      success: true,
      data: controllers
    });
  } catch (error) {
    console.error('Error fetching MRP controllers:', error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch MRP controllers"
    });
  }
});

/**
 * Get Material MRP Data with master data integration
 * GET /api/mrp-integration/material-mrp-data
 */
router.get("/material-mrp-data", async (req, res) => {
  try {
    const { materialId, plantId } = req.query;
    
    const mrpData = await mrpIntegrationService.getMaterialMrpData(
      materialId ? parseInt(materialId as string) : undefined,
      plantId ? parseInt(plantId as string) : undefined
    );
    
    res.json({
      success: true,
      data: mrpData
    });
  } catch (error) {
    console.error('Error fetching material MRP data:', error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch material MRP data"
    });
  }
});

/**
 * Get Manufacturing Variances with detailed analysis
 * GET /api/mrp-integration/manufacturing-variances
 */
router.get("/manufacturing-variances", async (req, res) => {
  try {
    const { plantId, materialId, varianceType, dateFrom, dateTo } = req.query;
    
    const variances = await mrpIntegrationService.getManufacturingVariances({
      plantId: plantId ? parseInt(plantId as string) : undefined,
      materialId: materialId ? parseInt(materialId as string) : undefined,
      varianceType: varianceType as string,
      dateFrom: dateFrom as string,
      dateTo: dateTo as string
    });
    
    res.json({
      success: true,
      data: variances
    });
  } catch (error) {
    console.error('Error fetching manufacturing variances:', error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch manufacturing variances"
    });
  }
});

/**
 * Get Cost Component Structure for materials
 * GET /api/mrp-integration/cost-components/:materialId/:plantId
 */
router.get("/cost-components/:materialId/:plantId", async (req, res) => {
  try {
    const { materialId, plantId } = req.params;
    
    const costComponents = await mrpIntegrationService.getCostComponentStructure(
      parseInt(materialId),
      parseInt(plantId)
    );
    
    res.json({
      success: true,
      data: costComponents
    });
  } catch (error) {
    console.error('Error fetching cost component structure:', error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch cost component structure"
    });
  }
});

/**
 * Get MRP Run History
 * GET /api/mrp-integration/run-history
 */
router.get("/run-history", async (req, res) => {
  try {
    const { limit } = req.query;
    
    const history = await mrpIntegrationService.getMrpRunHistory(
      limit ? parseInt(limit as string) : 10
    );
    
    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error('Error fetching MRP run history:', error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch MRP run history"
    });
  }
});

/**
 * Get Inventory Valuation with accounting details
 * GET /api/mrp-integration/inventory-valuation
 */
router.get("/inventory-valuation", async (req, res) => {
  try {
    const { plantId } = req.query;
    
    const valuation = await mrpIntegrationService.getInventoryValuation(
      plantId ? parseInt(plantId as string) : undefined
    );
    
    res.json({
      success: true,
      data: valuation
    });
  } catch (error) {
    console.error('Error fetching inventory valuation:', error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch inventory valuation"
    });
  }
});

/**
 * Initialize MRP Master Data with sample data
 * POST /api/mrp-integration/initialize-master-data
 */
router.post("/initialize-master-data", async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // 1. MRP Controllers should be created via master data API
    // No hardcoded initialization - use POST /api/master-data/mrp-controllers
    // This ensures proper validation and no default values
    
    // 2. Create Material MRP Data for existing materials
    // NOTE: This initialization route should not be used in production
    // MRP type must be explicitly provided when creating material_mrp_data
    // This is kept for backward compatibility but should be removed
    // await client.query(`
    //   INSERT INTO material_mrp_data (
    //     material_id, plant_id, mrp_type, mrp_controller, planning_strategy,
    //     lot_size_key, minimum_lot_size, reorder_point, safety_stock,
    //     procurement_type, planned_delivery_time, standard_cost, 
    //     moving_average_cost, valuation_class, price_control, is_active
    //   )
    //   SELECT 
    //     m.id,
    //     1 as plant_id,
    //     -- MRP type must be explicitly provided, no default
    //     '001' as mrp_controller,
    //     '10' as planning_strategy,
    //     'EX' as lot_size_key,
    //     1.000 as minimum_lot_size,
    //     10.000 as reorder_point,
    //     5.000 as safety_stock,
    //     CASE WHEN m.material_type = 'FERT' THEN 'E' ELSE 'F' END as procurement_type,
    //     CASE WHEN m.material_type = 'FERT' THEN 5 ELSE 14 END as planned_delivery_time,
    //     COALESCE(m.base_price, 100.00) as standard_cost,
    //     COALESCE(m.base_price, 100.00) as moving_average_cost,
    //     '3000' as valuation_class,
    //     'S' as price_control,
    //     true as is_active
    //   FROM materials m
    //   WHERE NOT EXISTS (
    //     SELECT 1 FROM material_mrp_data mmd 
    //     WHERE mmd.material_id = m.id AND mmd.plant_id = 1
    //   )
    // `);
    
    // 3. Create Cost Component Structure
    await client.query(`
      INSERT INTO cost_component_structure (
        material_id, plant_id, costing_variant, valid_from,
        material_cost, labor_cost, machine_cost, variable_overhead,
        fixed_overhead, total_standard_cost, currency, costing_lot_size, is_active
      )
      SELECT 
        m.id,
        1 as plant_id,
        'PPC1' as costing_variant,
        CURRENT_DATE as valid_from,
        COALESCE(m.base_price * 0.6, 60.00) as material_cost,
        COALESCE(m.base_price * 0.2, 20.00) as labor_cost,
        COALESCE(m.base_price * 0.1, 10.00) as machine_cost,
        COALESCE(m.base_price * 0.05, 5.00) as variable_overhead,
        COALESCE(m.base_price * 0.05, 5.00) as fixed_overhead,
        COALESCE(m.base_price, 100.00) as total_standard_cost,
        'USD' as currency,
        1.000 as costing_lot_size,
        true as is_active
      FROM materials m
      WHERE NOT EXISTS (
        SELECT 1 FROM cost_component_structure ccs 
        WHERE ccs.material_id = m.id AND ccs.plant_id = 1
      )
    `);
    
    // 4. Create Account Determination for MRP postings
    await client.query(`
      INSERT INTO mrp_account_determination (
        valuation_class, account_category, debit_credit, gl_account, 
        description, company_code, is_active
      ) VALUES 
      ('3000', 'BSX', 'D', '1400001', 'Inventory - Raw Materials', 'MALY', true),
      ('3000', 'PRD', 'C', '1400001', 'Inventory - Production', 'MALY', true),
      ('3000', 'GBB', 'D', '5000001', 'Cost of Goods Sold', 'MALY', true),
      ('3000', 'WIP', 'D', '1300001', 'Work in Process', 'MALY', true)
      ON CONFLICT (valuation_class, account_category, debit_credit) DO NOTHING
    `);
    
    // 5. Create sample Manufacturing Variances
    await client.query(`
      INSERT INTO manufacturing_variances (
        variance_number, material_id, plant_id, cost_center_id,
        variance_type, variance_category, standard_cost, actual_cost,
        variance_amount, standard_quantity, actual_quantity, currency,
        posting_date, fiscal_year, fiscal_period, reason_code, reason_text,
        gl_account, responsible_person, is_posted
      )
      SELECT 
        'VAR-' || m.id || '-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') as variance_number,
        m.id,
        1 as plant_id,
        1 as cost_center_id,
        'Material' as variance_type,
        'Price' as variance_category,
        COALESCE(m.base_price, 100.00) as standard_cost,
        COALESCE(m.base_price * (1 + (RANDOM() - 0.5) * 0.2), 100.00) as actual_cost,
        COALESCE(m.base_price * (RANDOM() - 0.5) * 0.2, 0.00) as variance_amount,
        10.000 as standard_quantity,
        10.000 as actual_quantity,
        'USD' as currency,
        CURRENT_DATE as posting_date,
        TO_CHAR(CURRENT_DATE, 'YYYY') as fiscal_year,
        TO_CHAR(CURRENT_DATE, 'MM') as fiscal_period,
        'M001' as reason_code,
        'Material price variance due to market fluctuation' as reason_text,
        '5000001' as gl_account,
        'John Smith' as responsible_person,
        true as is_posted
      FROM materials m
      WHERE NOT EXISTS (
        SELECT 1 FROM manufacturing_variances mv 
        WHERE mv.material_id = m.id
      )
      LIMIT 5
    `);
    
    // 6. Create Inventory Valuation records
    await client.query(`
      INSERT INTO inventory_valuation (
        material_id, plant_id, storage_location, valuation_type,
        stock_quantity, stock_value, unit_price, currency,
        valuation_class, movement_type, last_movement_date,
        fiscal_year, fiscal_period, gl_account
      )
      SELECT 
        m.id,
        1 as plant_id,
        '0001' as storage_location,
        'Unrestricted' as valuation_type,
        (50 + RANDOM() * 200) as stock_quantity,
        (50 + RANDOM() * 200) * COALESCE(m.base_price, 100.00) as stock_value,
        COALESCE(m.base_price, 100.00) as unit_price,
        'USD' as currency,
        '3000' as valuation_class,
        '101' as movement_type,
        CURRENT_DATE as last_movement_date,
        TO_CHAR(CURRENT_DATE, 'YYYY') as fiscal_year,
        TO_CHAR(CURRENT_DATE, 'MM') as fiscal_period,
        '1400001' as gl_account
      FROM materials m
      WHERE NOT EXISTS (
        SELECT 1 FROM inventory_valuation iv 
        WHERE iv.material_id = m.id AND iv.plant_id = 1
      )
    `);
    
    await client.query('COMMIT');
    
    res.json({
      success: true,
      message: "MRP Master Data initialized successfully",
      data: {
        mrpControllers: 3,
        materialMrpData: "All materials configured",
        costComponents: "Cost structures created",
        accountDetermination: "GL accounts configured",
        sampleVariances: 5,
        inventoryValuation: "Current stock valuations created"
      }
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error initializing MRP master data:', error);
    res.status(500).json({
      success: false,
      error: "Failed to initialize MRP master data",
      details: error.message
    });
  } finally {
    client.release();
  }
});

/**
 * Get MRP Dashboard Analytics
 * GET /api/mrp-integration/dashboard-analytics
 */
router.get("/dashboard-analytics", async (req, res) => {
  const client = await pool.connect();
  
  try {
    // Get comprehensive MRP analytics
    const analytics = await client.query(`
      SELECT 
        -- Material Coverage
        (SELECT COUNT(*) FROM material_mrp_data WHERE is_active = true) as materials_under_mrp,
        (SELECT COUNT(*) FROM materials) as total_materials,
        
        -- Current Stock Status
        (SELECT COUNT(*) FROM inventory_valuation WHERE stock_quantity > 0) as materials_in_stock,
        (SELECT COALESCE(SUM(stock_value), 0) FROM inventory_valuation) as total_inventory_value,
        
        -- MRP Elements
        (SELECT COUNT(*) FROM mrp_elements WHERE status = 'NEW') as open_mrp_elements,
        (SELECT COUNT(*) FROM mrp_elements WHERE element_type = 'PREQ' AND status = 'NEW') as purchase_requisitions_needed,
        (SELECT COUNT(*) FROM mrp_elements WHERE element_type = 'PORD' AND status = 'NEW') as planned_orders_needed,
        
        -- Variance Analysis
        (SELECT COUNT(*) FROM manufacturing_variances WHERE ABS(variance_amount) > 100) as significant_variances,
        (SELECT COALESCE(SUM(ABS(variance_amount)), 0) FROM manufacturing_variances WHERE posting_date >= CURRENT_DATE - INTERVAL '30 days') as monthly_variance_total,
        
        -- Recent MRP Activity
        (SELECT COUNT(*) FROM mrp_run_history WHERE run_date >= CURRENT_DATE - INTERVAL '7 days') as recent_mrp_runs,
        (SELECT MAX(run_start_time) FROM mrp_run_history) as last_mrp_run
    `);
    
    // Get top materials by value
    const topMaterials = await client.query(`
      SELECT 
        m.material_code,
        m.description,
        iv.stock_quantity,
        iv.stock_value,
        iv.unit_price
      FROM inventory_valuation iv
      INNER JOIN materials m ON iv.material_id = m.id
      ORDER BY iv.stock_value DESC
      LIMIT 10
    `);
    
    // Get variance analysis by type
    const varianceAnalysis = await client.query(`
      SELECT 
        variance_type,
        variance_category,
        COUNT(*) as variance_count,
        SUM(variance_amount) as total_variance,
        AVG(variance_amount) as avg_variance
      FROM manufacturing_variances
      WHERE posting_date >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY variance_type, variance_category
      ORDER BY ABS(SUM(variance_amount)) DESC
    `);
    
    res.json({
      success: true,
      data: {
        overview: analytics.rows[0],
        topMaterials: topMaterials.rows,
        varianceAnalysis: varianceAnalysis.rows
      }
    });
    
  } catch (error) {
    console.error('Error fetching MRP dashboard analytics:', error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch MRP dashboard analytics"
    });
  } finally {
    client.release();
  }
});

/**
 * Create manufacturing variance
 * POST /api/mrp-integration/create-variance
 */
router.post("/create-variance", async (req, res) => {
  const client = await pool.connect();
  
  try {
    const {
      materialId,
      plantId,
      costCenterId,
      varianceType,
      varianceCategory,
      standardCost,
      actualCost,
      standardQuantity,
      actualQuantity,
      reasonCode,
      reasonText,
      responsiblePerson
    } = req.body;
    
    const varianceAmount = (parseFloat(actualCost) - parseFloat(standardCost)) * parseFloat(actualQuantity);
    const varianceNumber = `VAR-${materialId}-${Date.now()}`;
    
    await client.query(`
      INSERT INTO manufacturing_variances (
        variance_number, material_id, plant_id, cost_center_id,
        variance_type, variance_category, standard_cost, actual_cost,
        variance_amount, standard_quantity, actual_quantity, currency,
        posting_date, fiscal_year, fiscal_period, reason_code, reason_text,
        gl_account, responsible_person, is_posted
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
    `, [
      varianceNumber,
      materialId,
      plantId,
      costCenterId,
      varianceType,
      varianceCategory,
      standardCost,
      actualCost,
      varianceAmount,
      standardQuantity,
      actualQuantity,
      'USD',
      new Date().toISOString().split('T')[0],
      new Date().getFullYear().toString(),
      String(new Date().getMonth() + 1).padStart(2, '0'),
      reasonCode,
      reasonText,
      '5000001', // COGS account
      responsiblePerson,
      false
    ]);
    
    res.json({
      success: true,
      message: "Manufacturing variance created successfully",
      data: {
        varianceNumber,
        varianceAmount
      }
    });
    
  } catch (error) {
    console.error('Error creating manufacturing variance:', error);
    res.status(500).json({
      success: false,
      error: "Failed to create manufacturing variance"
    });
  } finally {
    client.release();
  }
});

/**
 * Get all MRP Areas
 * GET /api/mrp-integration/areas
 */
router.get("/areas", async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query(`
      SELECT 
        id,
        plant_id,
        mrp_area,
        description,
        mrp_controller,
        created_at,
        updated_at
      FROM mrp_areas 
      ORDER BY mrp_area
    `);
    client.release();
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Error fetching MRP areas:', error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch MRP areas"
    });
  }
});

/**
 * Get MRP Area by ID
 * GET /api/mrp-integration/areas/:id
 */
router.get("/areas/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const client = await pool.connect();
    const result = await client.query(`
      SELECT 
        id,
        plant_id,
        mrp_area,
        description,
        mrp_controller,
        created_at,
        updated_at
      FROM mrp_areas 
      WHERE id = $1
    `, [id]);
    client.release();
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "MRP area not found"
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching MRP area:', error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch MRP area"
    });
  }
});

/**
 * Create new MRP Area
 * POST /api/mrp-integration/areas
 */
router.post("/areas", async (req, res) => {
  try {
    const { plant_id, mrp_area, description, mrp_controller } = req.body;
    const client = await pool.connect();
    const result = await client.query(`
      INSERT INTO mrp_areas (plant_id, mrp_area, description, mrp_controller)
      VALUES ($1, $2, $3, $4)
      RETURNING id, plant_id, mrp_area, description, mrp_controller, created_at, updated_at
    `, [plant_id, mrp_area, description, mrp_controller]);
    client.release();
    
    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating MRP area:', error);
    res.status(500).json({
      success: false,
      error: "Failed to create MRP area"
    });
  }
});

/**
 * Update MRP Area
 * PUT /api/mrp-integration/areas/:id
 */
router.put("/areas/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { plant_id, mrp_area, description, mrp_controller } = req.body;
    const client = await pool.connect();
    const result = await client.query(`
      UPDATE mrp_areas 
      SET plant_id = $1, mrp_area = $2, description = $3, mrp_controller = $4, updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING id, plant_id, mrp_area, description, mrp_controller, created_at, updated_at
    `, [plant_id, mrp_area, description, mrp_controller, id]);
    client.release();
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "MRP area not found"
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating MRP area:', error);
    res.status(500).json({
      success: false,
      error: "Failed to update MRP area"
    });
  }
});

/**
 * Delete MRP Area
 * DELETE /api/mrp-integration/areas/:id
 */
router.delete("/areas/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const client = await pool.connect();
    const result = await client.query(`
      DELETE FROM mrp_areas WHERE id = $1
      RETURNING id
    `, [id]);
    client.release();
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "MRP area not found"
      });
    }
    
    res.json({
      success: true,
      message: "MRP area deleted successfully"
    });
  } catch (error) {
    console.error('Error deleting MRP area:', error);
    res.status(500).json({
      success: false,
      error: "Failed to delete MRP area"
    });
  }
});

export default router;