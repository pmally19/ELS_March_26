import { pool } from "../db";
import { db } from "../db";
import { eq, and, gte, lte, desc, asc } from "drizzle-orm";
import { 
  mrpControllers, 
  mrpElements, 
  materialMrpData, 
  mrpRunHistory,
  costComponentStructure,
  manufacturingVariances,
  inventoryValuation,
  mrpAccountDetermination,
  materials,
  plants,
  costCenters,
  InsertMrpController,
  InsertMrpElement,
  InsertMaterialMrpData,
  InsertCostComponentStructure,
  InsertManufacturingVariance,
  InsertInventoryValuation
} from "@shared/schema";

// Using imported pool connection from db module

export class MRPIntegrationService {
  
  /**
   * Execute full MRP run with accounting integration
   */
  async executeMrpRun(params: {
    plantId?: number;
    mrpArea?: string;
    planningHorizon?: number;
    runType?: 'TOTAL' | 'NET' | 'REGEN';
  }) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const runNumber = `MRP-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
      const runStartTime = new Date();
      
      // 1. Initialize MRP run record
      const runResult = await client.query(`
        INSERT INTO mrp_run_history (
          run_number, run_date, run_start_time, plant_id, mrp_area, 
          planning_horizon, run_type, executed_by, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id
      `, [
        runNumber,
        new Date().toISOString().split('T')[0],
        runStartTime.toISOString(),
        params.plantId || null,
        params.mrpArea || 'ALL',
        params.planningHorizon || 365,
        params.runType || 'TOTAL',
        'MRP_SYSTEM',
        'RUNNING'
      ]);
      
      const runId = runResult.rows[0].id;
      
      // 2. Clear existing MRP elements for replanning
      if (params.runType === 'TOTAL') {
        await client.query(`
          DELETE FROM mrp_elements 
          WHERE plant_id = $1 AND status != 'CONVERTED'
        `, [params.plantId || 1]);
      }
      
      // 3. Get materials requiring MRP planning
      const materialsQuery = `
        SELECT DISTINCT
          m.id as material_id,
          m.material_code,
          m.description,
          mmd.plant_id,
          mmd.mrp_controller,
          mmd.planning_strategy,
          mmd.lot_size_key,
          mmd.minimum_lot_size,
          mmd.reorder_point,
          mmd.safety_stock,
          mmd.procurement_type,
          mmd.planned_delivery_time,
          mmd.standard_cost,
          mmd.moving_average_cost
        FROM materials m
        INNER JOIN material_mrp_data mmd ON m.id = mmd.material_id
        INNER JOIN mrp_types mt ON mmd.mrp_type = mt.code
        WHERE mt.planning_indicator = true
          AND mmd.is_active = true
          AND mt.is_active = true
          AND ($1 IS NULL OR mmd.plant_id = $1)
      `;
      
      const materialsResult = await client.query(materialsQuery, [params.plantId || null]);
      const materialsProcessed = materialsResult.rows.length;
      
      // 4. Process each material through MRP logic
      for (const material of materialsResult.rows) {
        await this.processMaterialRequirements(client, material, params.planningHorizon || 365);
      }
      
      // 5. Generate purchase requisitions from MRP elements
      const purchaseReqCount = await this.generatePurchaseRequisitions(client, params.plantId);
      
      // 6. Create planned orders for in-house production
      const plannedOrderCount = await this.generatePlannedOrders(client, params.plantId);
      
      // 7. Update inventory valuations and cost postings
      await this.updateInventoryValuations(client, params.plantId);
      
      // 8. Complete MRP run
      const runEndTime = new Date();
      const planningResults = {
        materialsProcessed,
        purchaseRequisitionsGenerated: purchaseReqCount,
        plannedOrdersGenerated: plannedOrderCount,
        processingTime: runEndTime.getTime() - runStartTime.getTime()
      };
      
      await client.query(`
        UPDATE mrp_run_history 
        SET run_end_time = $1, materials_processed = $2, 
            planning_run_results = $3, status = 'COMPLETED'
        WHERE id = $4
      `, [
        runEndTime.toISOString(),
        materialsProcessed,
        JSON.stringify(planningResults),
        runId
      ]);
      
      await client.query('COMMIT');
      
      return {
        success: true,
        runNumber,
        results: planningResults
      };
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('MRP Run failed:', error);
      throw error;
    } finally {
      client.release();
    }
  }
  
  /**
   * Process material requirements for a single material
   */
  private async processMaterialRequirements(client: any, material: any, planningHorizon: number) {
    const currentDate = new Date();
    const horizonDate = new Date();
    horizonDate.setDate(currentDate.getDate() + planningHorizon);
    
    // 1. Get current stock position
    const stockQuery = `
      SELECT COALESCE(SUM(stock_quantity), 0) as current_stock
      FROM inventory_valuation 
      WHERE material_id = $1 AND plant_id = $2
    `;
    const stockResult = await client.query(stockQuery, [material.material_id, material.plant_id]);
    const currentStock = parseFloat(stockResult.rows[0]?.current_stock || '0');
    
    // 2. Get outstanding requirements (sales orders, production orders)
    const requirementsQuery = `
      SELECT 
        'SALES' as source_type,
        so.order_number as source_number,
        soi.quantity as required_quantity,
        so.delivery_date as requirement_date
      FROM sales_orders so
      INNER JOIN sales_order_items soi ON so.id = soi.sales_order_id
      WHERE soi.material_id = $1 
        AND so.status = 'open'
        AND so.delivery_date BETWEEN $2 AND $3
      
      UNION ALL
      
      SELECT 
        'PRODUCTION' as source_type,
        po.order_number as source_number,
        poi.quantity as required_quantity,
        po.planned_start_date as requirement_date
      FROM production_orders po
      INNER JOIN production_order_items poi ON po.id = poi.production_order_id
      WHERE poi.material_id = $1 
        AND po.status IN ('planned', 'released')
        AND po.planned_start_date BETWEEN $2 AND $3
      
      ORDER BY requirement_date
    `;
    
    const requirementsResult = await client.query(requirementsQuery, [
      material.material_id,
      currentDate.toISOString(),
      horizonDate.toISOString()
    ]);
    
    // 3. Calculate net requirements and create MRP elements
    let runningStock = currentStock;
    
    for (const requirement of requirementsResult.rows) {
      const requiredQty = parseFloat(requirement.required_quantity);
      runningStock -= requiredQty;
      
      // Check if stock falls below safety stock + reorder point
      const safetyStock = parseFloat(material.safety_stock || '0');
      const reorderPoint = parseFloat(material.reorder_point || '0');
      
      if (runningStock < (safetyStock + reorderPoint)) {
        const shortfall = (safetyStock + reorderPoint) - runningStock;
        const orderQuantity = this.calculateOrderQuantity(shortfall, material);
        
        // Create MRP element
        const elementType = material.procurement_type === 'E' ? 'PORD' : 'PREQ';
        const elementNumber = `${elementType}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        
        const requirementDate = new Date(requirement.requirement_date);
        const availableDate = new Date(requirementDate);
        availableDate.setDate(requirementDate.getDate() - (material.planned_delivery_time || 0));
        
        await client.query(`
          INSERT INTO mrp_elements (
            material_id, plant_id, element_type, element_number,
            requirement_date, available_date, quantity, unit_of_measure,
            mrp_controller, source, source_number, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        `, [
          material.material_id,
          material.plant_id,
          elementType,
          elementNumber,
          requirementDate.toISOString().split('T')[0],
          availableDate.toISOString().split('T')[0],
          orderQuantity,
          'EA',
          material.mrp_controller,
          requirement.source_type,
          requirement.source_number,
          'NEW'
        ]);
        
        runningStock += orderQuantity;
      }
    }
  }
  
  /**
   * Calculate order quantity based on lot sizing rules
   */
  private calculateOrderQuantity(netRequirement: number, material: any): number {
    const minLotSize = parseFloat(material.minimum_lot_size || '1');
    const lotSizeKey = material.lot_size_key || 'EX';
    
    switch (lotSizeKey) {
      case 'EX': // Exact lot size
        return Math.max(netRequirement, minLotSize);
      case 'FX': // Fixed lot size
        return minLotSize;
      case 'EO': // Economic order quantity (simplified)
        return Math.max(Math.ceil(netRequirement / minLotSize) * minLotSize, minLotSize);
      default:
        return Math.max(netRequirement, minLotSize);
    }
  }
  
  /**
   * Generate purchase requisitions from MRP elements
   */
  private async generatePurchaseRequisitions(client: any, plantId?: number): Promise<number> {
    const query = `
      SELECT me.*, m.description, m.material_code
      FROM mrp_elements me
      INNER JOIN materials m ON me.material_id = m.id
      WHERE me.element_type = 'PREQ' 
        AND me.status = 'NEW'
        AND ($1 IS NULL OR me.plant_id = $1)
    `;
    
    const result = await client.query(query, [plantId || null]);
    let generatedCount = 0;
    
    for (const element of result.rows) {
      const reqNumber = `REQ-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
      
      await client.query(`
        INSERT INTO purchase_requisitions (
          requisition_number, requestor_name, request_date, required_date,
          plant_name, priority, status, approval_status,
          total_estimated_value, currency, business_justification, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `, [
        reqNumber,
        'MRP System',
        new Date().toISOString().split('T')[0],
        element.requirement_date,
        'Manufacturing Plant',
        'normal',
        'open',
        'pending',
        (parseFloat(element.quantity) * 100).toFixed(2), // Estimated cost
        'USD',
        `MRP requirement for ${element.description} (${element.material_code})`,
        'MRP_SYSTEM'
      ]);
      
      // Update MRP element status
      await client.query(`
        UPDATE mrp_elements SET status = 'CONVERTED' WHERE id = $1
      `, [element.id]);
      
      generatedCount++;
    }
    
    return generatedCount;
  }
  
  /**
   * Generate planned orders for in-house production
   */
  private async generatePlannedOrders(client: any, plantId?: number): Promise<number> {
    const query = `
      SELECT me.*, m.description, m.material_code, p.plant_name
      FROM mrp_elements me
      INNER JOIN materials m ON me.material_id = m.id
      INNER JOIN plants p ON me.plant_id = p.id
      WHERE me.element_type = 'PORD' 
        AND me.status = 'NEW'
        AND ($1 IS NULL OR me.plant_id = $1)
    `;
    
    const result = await client.query(query, [plantId || null]);
    let generatedCount = 0;
    
    for (const element of result.rows) {
      const orderNumber = `PO-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
      
      await client.query(`
        INSERT INTO planned_orders (
          order_number, material_id, material_description, plant_id, plant_name,
          planned_quantity, unit_of_measure, planned_start_date, planned_finish_date,
          requirement_date, order_type, conversion_status, mrp_controller,
          planning_strategy, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      `, [
        orderNumber,
        element.material_id,
        element.description,
        element.plant_id,
        element.plant_name,
        element.quantity,
        element.unit_of_measure,
        element.available_date,
        element.requirement_date,
        element.requirement_date,
        'Production',
        'open',
        element.mrp_controller,
        '10',
        'MRP_SYSTEM'
      ]);
      
      // Update MRP element status
      await client.query(`
        UPDATE mrp_elements SET status = 'CONVERTED' WHERE id = $1
      `, [element.id]);
      
      generatedCount++;
    }
    
    return generatedCount;
  }
  
  /**
   * Update inventory valuations with current costs
   */
  private async updateInventoryValuations(client: any, plantId?: number) {
    const query = `
      UPDATE inventory_valuation iv
      SET unit_price = COALESCE(
        (SELECT standard_cost FROM material_mrp_data mmd 
         WHERE mmd.material_id = iv.material_id AND mmd.plant_id = iv.plant_id),
        iv.unit_price
      ),
      stock_value = stock_quantity * COALESCE(
        (SELECT standard_cost FROM material_mrp_data mmd 
         WHERE mmd.material_id = iv.material_id AND mmd.plant_id = iv.plant_id),
        iv.unit_price
      )
      WHERE ($1 IS NULL OR iv.plant_id = $1)
    `;
    
    await client.query(query, [plantId || null]);
  }
  
  /**
   * Get MRP Controllers
   */
  async getMrpControllers(plantId?: number) {
    try {
      // MRP Controllers are not plant-specific, they're global
      // Simply return all active controllers
      return await db.select()
        .from(mrpControllers)
        .where(eq(mrpControllers.isActive, true));
    } catch (error) {
      console.error('Error fetching MRP controllers:', error);
      throw error;
    }
  }
  
  /**
   * Get Material MRP Data
   */
  async getMaterialMrpData(materialId?: number, plantId?: number) {
    try {
      let query = db.select()
        .from(materialMrpData)
        .innerJoin(materials, eq(materialMrpData.materialId, materials.id))
        .innerJoin(plants, eq(materialMrpData.plantId, plants.id));
      
      if (materialId && plantId) {
        query = query.where(
          and(
            eq(materialMrpData.materialId, materialId),
            eq(materialMrpData.plantId, plantId)
          )
        );
      } else if (materialId) {
        query = query.where(eq(materialMrpData.materialId, materialId));
      } else if (plantId) {
        query = query.where(eq(materialMrpData.plantId, plantId));
      }
      
      return await query;
    } catch (error) {
      console.error('Error fetching material MRP data:', error);
      throw error;
    }
  }
  
  /**
   * Get Manufacturing Variances with analysis
   */
  async getManufacturingVariances(params: {
    plantId?: number;
    materialId?: number;
    varianceType?: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    const client = await pool.connect();
    
    try {
      let whereConditions = [];
      let queryParams = [];
      let paramIndex = 1;
      
      if (params.plantId) {
        whereConditions.push(`mv.plant_id = $${paramIndex++}`);
        queryParams.push(params.plantId);
      }
      
      if (params.materialId) {
        whereConditions.push(`mv.material_id = $${paramIndex++}`);
        queryParams.push(params.materialId);
      }
      
      if (params.varianceType) {
        whereConditions.push(`mv.variance_type = $${paramIndex++}`);
        queryParams.push(params.varianceType);
      }
      
      if (params.dateFrom) {
        whereConditions.push(`mv.posting_date >= $${paramIndex++}`);
        queryParams.push(params.dateFrom);
      }
      
      if (params.dateTo) {
        whereConditions.push(`mv.posting_date <= $${paramIndex++}`);
        queryParams.push(params.dateTo);
      }
      
      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
      
      const query = `
        SELECT 
          mv.*,
          m.material_code,
          m.description as material_description,
          p.plant_name,
          cc.cost_center_code,
          cc.description as cost_center_description
        FROM manufacturing_variances mv
        INNER JOIN materials m ON mv.material_id = m.id
        INNER JOIN plants p ON mv.plant_id = p.id
        LEFT JOIN cost_centers cc ON mv.cost_center_id = cc.id
        ${whereClause}
        ORDER BY mv.posting_date DESC, mv.variance_amount DESC
      `;
      
      const result = await client.query(query, queryParams);
      return result.rows;
    } finally {
      client.release();
    }
  }
  
  /**
   * Get Cost Component Structure
   */
  async getCostComponentStructure(materialId: number, plantId: number) {
    try {
      return await db.select()
        .from(costComponentStructure)
        .innerJoin(materials, eq(costComponentStructure.materialId, materials.id))
        .innerJoin(plants, eq(costComponentStructure.plantId, plants.id))
        .where(
          and(
            eq(costComponentStructure.materialId, materialId),
            eq(costComponentStructure.plantId, plantId),
            eq(costComponentStructure.isActive, true)
          )
        )
        .orderBy(desc(costComponentStructure.validFrom));
    } catch (error) {
      console.error('Error fetching cost component structure:', error);
      throw error;
    }
  }
  
  /**
   * Get MRP Run History
   */
  async getMrpRunHistory(limit: number = 10) {
    const client = await pool.connect();
    
    try {
      const query = `
        SELECT 
          mrh.*,
          p.plant_name
        FROM mrp_run_history mrh
        LEFT JOIN plants p ON mrh.plant_id = p.id
        ORDER BY mrh.run_start_time DESC
        LIMIT $1
      `;
      
      const result = await client.query(query, [limit]);
      return result.rows;
    } finally {
      client.release();
    }
  }
  
  /**
   * Get inventory valuation with material details
   */
  async getInventoryValuation(plantId?: number) {
    const client = await pool.connect();
    
    try {
      let whereClause = '';
      let queryParams = [];
      
      if (plantId) {
        whereClause = 'WHERE iv.plant_id = $1';
        queryParams.push(plantId);
      }
      
      const query = `
        SELECT 
          iv.*,
          m.material_code,
          m.description as material_description,
          p.plant_name
        FROM inventory_valuation iv
        INNER JOIN materials m ON iv.material_id = m.id
        INNER JOIN plants p ON iv.plant_id = p.id
        ${whereClause}
        ORDER BY iv.stock_value DESC
      `;
      
      const result = await client.query(query, queryParams);
      return result.rows;
    } finally {
      client.release();
    }
  }
}

export const mrpIntegrationService = new MRPIntegrationService();