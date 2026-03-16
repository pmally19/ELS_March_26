import { db, pool } from "../db";
import {
  plannedOrders,
  purchaseRequisitions,
  purchaseRequisitionItems,
  mrpAreas,
  mrpRuns,
  productionPlanningScenarios,
  type InsertPlannedOrder,
  type InsertPurchaseRequisition,
  type InsertPurchaseRequisitionItem,
  type InsertMrpArea,
  type InsertMrpRun,
  type InsertProductionPlanningScenario
} from "@shared/schema";
import { eq, and, desc, asc, gte, lte, sql } from "drizzle-orm";

export class ProductionPlanningService {

  // ===================================================================
  // PLANNED ORDERS MANAGEMENT
  // ===================================================================

  async getPlannedOrders(filters?: {
    plantId?: number;
    materialId?: number;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    // Use direct SQL with actual database column names
    let sqlQuery = `
      SELECT 
        po.id,
        po.order_number as "orderNumber",
        po.material_id as "materialId",
        m.code as "materialCode",
        COALESCE(m.name, m.description, m.code) as "materialDescription",
        po.plant_id as "plantId",
        p.name as "plantName",
        p.code as "plantCode",
        po.planned_quantity::text as "plannedQuantity",
        COALESCE(m.base_uom, 'EA') as "unitOfMeasure",
        po.required_date::text as "plannedStartDate",
        (po.required_date + INTERVAL '7 days')::text as "plannedFinishDate",
        po.required_date::text as "requirementDate",
        po.order_type as "orderType",
        CASE 
          WHEN COALESCE(po.status, 'PLANNED') = 'PLANNED' THEN 'open'
          WHEN COALESCE(po.status, 'PLANNED') = 'CONVERTED' THEN 'converted'
          ELSE LOWER(COALESCE(po.status, 'PLANNED'))
        END as "conversionStatus",
        NULL as "mrpController",
        'make_to_stock' as "planningStrategy",
        'SYSTEM' as "createdBy",
        po.created_at::text as "createdAt"
      FROM planned_orders po
      LEFT JOIN materials m ON po.material_id = m.id
      LEFT JOIN plants p ON po.plant_id = p.id
      WHERE 1=1
    `;

    const queryParams: any[] = [];
    let paramIndex = 1;

    if (filters?.plantId) {
      sqlQuery += ` AND po.plant_id = $${paramIndex}`;
      queryParams.push(filters.plantId);
      paramIndex++;
    }
    if (filters?.materialId) {
      sqlQuery += ` AND po.material_id = $${paramIndex}`;
      queryParams.push(filters.materialId);
      paramIndex++;
    }
    if (filters?.status) {
      sqlQuery += ` AND COALESCE(po.status, 'PLANNED') = $${paramIndex}`;
      queryParams.push(filters.status);
      paramIndex++;
    }
    if (filters?.dateFrom) {
      sqlQuery += ` AND po.required_date >= $${paramIndex}`;
      queryParams.push(filters.dateFrom);
      paramIndex++;
    }
    if (filters?.dateTo) {
      sqlQuery += ` AND po.required_date <= $${paramIndex}`;
      queryParams.push(filters.dateTo);
      paramIndex++;
    }

    sqlQuery += ` ORDER BY po.created_at DESC`;

    const result = await pool.query(sqlQuery, queryParams);
    return result.rows;
  }

  async createPlannedOrder(plannedOrderData: InsertPlannedOrder) {
    // Generate planned order number
    const orderNumber = await this.generatePlannedOrderNumber(plannedOrderData.plantId);

    // Use raw SQL with actual database column names
    const result = await pool.query(`
      INSERT INTO planned_orders (
        order_number,
        material_id,
        plant_id,
        planned_quantity,
        required_date,
        order_type,
        status,
        mrp_run_id,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
    `, [
      orderNumber,
      plannedOrderData.materialId,
      plannedOrderData.plantId,
      plannedOrderData.plannedQuantity || '0',
      plannedOrderData.requirementDate || plannedOrderData.plannedStartDate || new Date().toISOString().split('T')[0],
      plannedOrderData.orderType || 'PRODUCTION',
      'PLANNED',
      (plannedOrderData.businessContext as any)?.mrpRunId || null
    ]);

    // Return formatted data matching frontend expectations
    const newOrder = result.rows[0];
    const materialResult = await pool.query('SELECT code, name, description, base_uom FROM materials WHERE id = $1', [plannedOrderData.materialId]);
    const material = materialResult.rows[0] || {};
    const plantResult = await pool.query('SELECT name, code FROM plants WHERE id = $1', [plannedOrderData.plantId]);
    const plant = plantResult.rows[0] || {};

    return {
      id: newOrder.id,
      orderNumber: newOrder.order_number,
      materialId: newOrder.material_id,
      materialDescription: material.name || material.description || material.code || 'Unknown',
      plantId: newOrder.plant_id,
      plantName: plant.name || 'Unknown',
      plannedQuantity: newOrder.planned_quantity?.toString() || '0',
      unitOfMeasure: plannedOrderData.unitOfMeasure || material.base_uom || 'EA',
      plannedStartDate: plannedOrderData.plannedStartDate || newOrder.required_date?.toString(),
      plannedFinishDate: plannedOrderData.plannedFinishDate || null,
      requirementDate: newOrder.required_date?.toString() || null,
      orderType: newOrder.order_type,
      conversionStatus: newOrder.status || 'PLANNED',
      mrpController: null,
      planningStrategy: 'make_to_stock',
      createdBy: 'SYSTEM',
      createdAt: newOrder.created_at?.toString() || new Date().toISOString()
    };
  }

  async convertPlannedOrderToProduction(plannedOrderId: number, convertedOrderId: number) {
    // Use actual database column name (status instead of conversion_status)
    const result = await pool.query(`
      UPDATE planned_orders
      SET status = 'CONVERTED',
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `, [plannedOrderId]);

    return result.rows[0];
  }

  async convertPlannedOrderToPurchaseRequisition(plannedOrderId: number, requisitionId: number) {
    // Use actual database column name (status instead of conversion_status)
    const result = await pool.query(`
      UPDATE planned_orders
      SET status = 'CONVERTED',
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `, [plannedOrderId]);

    return result.rows[0];
  }

  // ===================================================================
  // PURCHASE REQUISITIONS MANAGEMENT
  // ===================================================================

  async getPurchaseRequisitions(filters?: {
    status?: string;
    requestorId?: number;
    plantId?: number;
    priority?: string;
  }) {
    // Use direct SQL with actual database column names
    let sqlQuery = `
      SELECT 
        pr.id,
        pr.requisition_number,
        pr.requested_by as "requestor_name",
        pr.requisition_date as "request_date",
        pr.requisition_date as "required_date",
        pr.cost_center_id,
        (SELECT cost_center FROM cost_centers WHERE id = pr.cost_center_id) as plant_code,
        NULL as "plant_name",
        'normal' as priority,
        COALESCE(pr.status, 'O') as status,
        CASE WHEN COALESCE(pr.status, 'O') = 'O' THEN 'pending' ELSE 'approved' END as "approval_status",
        COALESCE(pr.total_value, 0)::text as "total_estimated_value",
        COALESCE(pr.currency_code, 'USD') as currency,
        NULL as "business_justification",
        'SYSTEM' as "created_by",
        pr.created_at::text as "created_at"
      FROM purchase_requisitions pr
      WHERE 1=1
    `;

    const queryParams: any[] = [];
    let paramIndex = 1;

    if (filters?.status) {
      sqlQuery += ` AND COALESCE(pr.status, 'O') = $${paramIndex}`;
      queryParams.push(filters.status);
      paramIndex++;
    }

    sqlQuery += ` ORDER BY pr.created_at DESC`;

    const result = await pool.query(sqlQuery, queryParams);
    return result.rows;
  }

  async createPurchaseRequisition(requisitionData: InsertPurchaseRequisition, items: InsertPurchaseRequisitionItem[]) {
    return await db.transaction(async (tx) => {
      // Generate requisition number
      const requisitionNumber = await this.generateRequisitionNumber(requisitionData.plantId);

      // Calculate total estimated value
      const totalValue = items.reduce((sum, item) => {
        const lineValue = Number(item.totalLineValue || 0);
        return sum + lineValue;
      }, 0);

      // Create requisition header
      const [newRequisition] = await tx
        .insert(purchaseRequisitions)
        .values({
          ...requisitionData,
          requisitionNumber,
          totalEstimatedValue: totalValue.toString(),
        })
        .returning();

      // Create requisition items
      const requisitionItems = await Promise.all(
        items.map(async (item, index) => {
          const [newItem] = await tx
            .insert(purchaseRequisitionItems)
            .values({
              ...item,
              requisitionId: newRequisition.id,
              lineNumber: index + 1,
            })
            .returning();
          return newItem;
        })
      );

      return {
        requisition: newRequisition,
        items: requisitionItems,
      };
    });
  }

  async approvePurchaseRequisition(requisitionId: number, approvedBy: string) {
    const result = await pool.query(`
      UPDATE purchase_requisitions
      SET approval_status = 'approved',
          status = 'approved',
          approved_by = $1,
          approved_date = CURRENT_DATE,
          updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [approvedBy, requisitionId]);

    return result.rows[0];
  }

  async convertRequisitionToPurchaseOrder(requisitionId: number, poNumber: string) {
    const result = await pool.query(`
      UPDATE purchase_requisitions
      SET status = 'converted',
          converted_po_number = $1,
          updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [poNumber, requisitionId]);

    return result.rows[0];
  }

  // ===================================================================
  // MATERIAL PLANNING ENGINE
  // ===================================================================

  async runMrpPlanning(plantId: number, mrpArea?: string, planningHorizon?: number) {
    const runNumber = await this.generateMrpRunNumber();

    // Get executedBy from document_settings
    const systemUserResult = await pool.query(
      `SELECT setting_value FROM document_settings WHERE setting_key = 'system_user' LIMIT 1`
    );
    const executedBy = systemUserResult.rows.length > 0
      ? systemUserResult.rows[0].setting_value
      : 'SYSTEM';

    // Get planning type and processing key from document_settings or use defaults from database
    const planningTypeResult = await pool.query(
      `SELECT setting_value FROM document_settings WHERE setting_key = 'planning_type' LIMIT 1`
    );
    const planningType = planningTypeResult.rows.length > 0
      ? planningTypeResult.rows[0].setting_value
      : 'TOTAL';

    const processingKeyResult = await pool.query(
      `SELECT setting_value FROM document_settings WHERE setting_key = 'processing_key' LIMIT 1`
    );
    const processingKey = processingKeyResult.rows.length > 0
      ? processingKeyResult.rows[0].setting_value
      : 'NETCH';

    // Create planning run record
    const mrpRunData = {
      run_number: runNumber,
      plant_id: plantId,
      run_date: new Date().toISOString().split('T')[0],
      mrp_type: planningType,
      processing_key: processingKey,
      create_purchase_req: true,
      create_planned_orders: true,
      run_status: 'OPEN',
      total_materials: 0,
      created_by: executedBy
    };

    // Use direct SQL with correct column names matching the actual table structure
    const result = await pool.query(`
      INSERT INTO mrp_runs (run_number, plant_id, run_type, start_time, status, records_processed, planned_orders_created, purchase_requisitions_created, created_by, mrp_area, planning_horizon)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [
      mrpRunData.run_number,
      mrpRunData.plant_id,
      mrpRunData.mrp_type || planningType || 'TOTAL',
      new Date(), // start_time
      'RUNNING', // status
      0, // records_processed
      0, // planned_orders_created
      0, // purchase_requisitions_created
      mrpRunData.created_by,
      mrpArea || null,
      planningHorizon || null
    ]);

    const mrpRun = result.rows[0];

    // Get planning parameters from document_settings
    const planningHorizonSetting = await pool.query(
      `SELECT setting_value FROM document_settings WHERE setting_key = 'planning_horizon_days' LIMIT 1`
    );
    const defaultPlanningHorizon = planningHorizonSetting.rows.length > 0
      ? parseInt(planningHorizonSetting.rows[0].setting_value)
      : null;

    const actualPlanningHorizon = planningHorizon || defaultPlanningHorizon;

    const includeFixedLotSizeResult = await pool.query(
      `SELECT setting_value FROM document_settings WHERE setting_key = 'include_fixed_lot_size' LIMIT 1`
    );
    const includeFixedLotSize = includeFixedLotSizeResult.rows.length > 0
      ? includeFixedLotSizeResult.rows[0].setting_value === 'true'
      : true;

    const includeSafetyStockResult = await pool.query(
      `SELECT setting_value FROM document_settings WHERE setting_key = 'include_safety_stock' LIMIT 1`
    );
    const includeSafetyStock = includeSafetyStockResult.rows.length > 0
      ? includeSafetyStockResult.rows[0].setting_value === 'true'
      : true;

    const runParameters = {
      planningHorizon: actualPlanningHorizon,
      includeFixedLotSize,
      includeSafetyStock,
    };

    try {
      // Execute material planning calculations
      await this.processMrpCalculations(mrpRun.id, plantId, mrpArea, actualPlanningHorizon);

      // Get actual counts from database
      const plannedOrdersCountResult = await pool.query(
        `SELECT COUNT(*) as count FROM planned_orders WHERE business_context->>'mrpRunId' = $1::text`,
        [mrpRun.id.toString()]
      );
      const plannedOrdersCreated = parseInt(plannedOrdersCountResult.rows[0]?.count || '0');
      const materialsCount = plannedOrdersCreated; // Materials processed equals planned orders created

      const requisitionsCountResult = await pool.query(
        `SELECT COUNT(*) as count FROM purchase_requisitions WHERE business_context->>'mrpRunId' = $1::text`,
        [mrpRun.id.toString()]
      );
      const purchaseRequisitionsCreated = parseInt(requisitionsCountResult.rows[0]?.count || '0');

      // Update planning run as completed using direct SQL
      const updateResult = await pool.query(`
        UPDATE mrp_runs 
        SET run_status = 'COMPLETED', total_materials = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING *
      `, [materialsCount, mrpRun.id]);

      const startTime = new Date(mrpRun.start_time);
      const endTime = new Date();
      const processingTimeMs = endTime.getTime() - startTime.getTime();
      const processingTimeMinutes = (processingTimeMs / 1000 / 60).toFixed(1);

      return {
        success: true,
        data: updateResult.rows[0],
        message: "Material planning run completed successfully",
        statistics: {
          materialsProcessed: materialsCount,
          plannedOrdersCreated,
          purchaseRequisitionsCreated,
          processingTime: `${processingTimeMinutes} minutes`,
        }
      };
    } catch (error) {
      // Update planning run with error using direct SQL with correct column names
      await pool.query(`
        UPDATE mrp_runs
        SET status = 'ERROR',
            end_time = CURRENT_TIMESTAMP
        WHERE id = $1
      `, [mrpRun.id]);

      throw error;
    }
  }

  private async processMrpCalculations(mrpRunId: number, plantId: number, mrpArea?: string, planningHorizon?: number) {
    // Material planning calculation logic
    // Query materials and stock levels to determine requirements

    const startDate = new Date();
    const planDate = new Date(startDate);
    planDate.setDate(planDate.getDate() + 30);

    // Get planning controller from plant settings (mrp_areas table doesn't exist)
    let planningController: string | null = null;
    const plantSettingsResult = await pool.query(
      `SELECT setting_value FROM document_settings WHERE setting_key = 'default_planning_controller' AND plant_id = $1 LIMIT 1`,
      [plantId]
    ).catch(() => ({ rows: [] }));
    if (plantSettingsResult.rows.length > 0) {
      planningController = plantSettingsResult.rows[0].setting_value;
    }

    // Get createdBy from system settings or use default
    const systemUserResult = await pool.query(
      `SELECT setting_value FROM document_settings WHERE setting_key = 'system_user' LIMIT 1`
    );
    const createdBy = systemUserResult.rows.length > 0
      ? systemUserResult.rows[0].setting_value
      : 'SYSTEM';

    // Get materials for the plant with stock levels
    const materialsResult = await pool.query(`
      SELECT 
        m.id,
        m.code,
        m.name,
        m.base_uom as "baseUnitOfMeasure",
        COALESCE(sb.quantity, 0) as current_stock,
        COALESCE(m.min_stock_level, 0) as min_stock
      FROM materials m
      LEFT JOIN stock_balances sb ON m.code = sb.material_code AND sb.plant_code = (SELECT code FROM plants WHERE id = $1)
      WHERE m.is_active = true
      AND (m.plant_id = $1 OR m.plant_id IS NULL)
      LIMIT 100
    `, [plantId]);

    const plantMaterials = materialsResult.rows;

    // Create planned orders for materials with requirements
    for (const material of plantMaterials) {
      const currentStock = parseFloat(material.current_stock || 0);
      const minStock = parseFloat(material.min_stock || 0);

      // Only create planned order if stock is below minimum
      if (currentStock < minStock) {
        const orderType = material.type === 'FERT' || material.type === 'FINISHED_GOOD' ? "production" : "purchase";
        const quantity = Math.max(minStock - currentStock, 0);

        await this.createPlannedOrder({
          materialId: material.id,
          plantId,
          plannedQuantity: quantity.toString(),
          unitOfMeasure: material.baseUnitOfMeasure || 'EA',
          plannedStartDate: planDate.toISOString().split('T')[0],
          plannedFinishDate: new Date(planDate.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          requirementDate: new Date(planDate.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          orderType,
          mrpController: planningController || null,
          createdBy: createdBy,
          businessContext: {
            mrpRunId,
            calculationMethod: "net_requirements",
            leadTime: orderType === "production" ? 7 : 14,
            currentStock,
            minStock,
          },
        });
      }
    }

    return true;
  }

  // ===================================================================
  // PLANNING AREAS MANAGEMENT
  // ===================================================================

  async getMrpAreas(plantId?: number) {
    // mrp_areas table doesn't exist, return empty array or create default areas from plants
    // For now, return empty array to avoid errors
    // TODO: Create mrp_areas table or use alternative approach
    return [];
  }

  async createMrpArea(mrpAreaData: InsertMrpArea) {
    // mrp_areas table doesn't exist, throw error or create table first
    // For now, return a mock object to avoid breaking the API
    throw new Error('MRP Areas table does not exist. Please create the mrp_areas table first.');
  }

  // ===================================================================
  // ANALYTICS AND REPORTING
  // ===================================================================

  async getProductionPlanningAnalytics(plantId?: number) {
    // Use direct SQL queries for analytics to ensure accuracy
    let plannedOrdersQuery = `
      SELECT COUNT(*) as count FROM planned_orders WHERE 1=1
    `;
    // Note: purchase_requisitions doesn't have plant_id, filter by cost_center's plant_id
    let requisitionsQuery = `
      SELECT COUNT(*) as count FROM purchase_requisitions pr
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramIndex = 1;

    if (plantId) {
      plannedOrdersQuery += ` AND plant_id = $${paramIndex}`;
      // Note: cost_centers doesn't have plant_id, so we can't filter requisitions by plant
      // requisitionsQuery += ` AND EXISTS (
      //   SELECT 1 FROM cost_centers cc 
      //   WHERE cc.id = pr.cost_center_id AND cc.plant_id = $${paramIndex}
      // )`;
      params.push(plantId);
      paramIndex++;
    }

    // Total planned orders
    const totalPlannedOrdersResult = await pool.query(plannedOrdersQuery, params);
    const totalPlannedOrders = parseInt(totalPlannedOrdersResult.rows[0]?.count || '0');

    // Open planned orders (status != 'CONVERTED')
    const openPlannedOrdersQuery = plannedOrdersQuery + ` AND COALESCE(status, 'PLANNED') != $${paramIndex}`;
    const openPlannedOrdersParams = [...params, 'CONVERTED'];
    const openPlannedOrdersResult = await pool.query(openPlannedOrdersQuery, openPlannedOrdersParams);
    const openPlannedOrders = parseInt(openPlannedOrdersResult.rows[0]?.count || '0');

    // Total requisitions
    const totalRequisitionsResult = await pool.query(requisitionsQuery, params);
    const totalRequisitions = parseInt(totalRequisitionsResult.rows[0]?.count || '0');

    // Pending requisitions (status = 'O' which means open/pending)
    const pendingRequisitionsQuery = requisitionsQuery + ` AND COALESCE(status, 'O') = $${paramIndex}`;
    const pendingRequisitionsParams = [...params, 'O'];
    const pendingRequisitionsResult = await pool.query(pendingRequisitionsQuery, pendingRequisitionsParams);
    const pendingRequisitions = parseInt(pendingRequisitionsResult.rows[0]?.count || '0');

    return {
      totalPlannedOrders,
      totalRequisitions,
      openPlannedOrders,
      pendingRequisitions,
    };
  }

  // ===================================================================
  // UTILITY METHODS
  // ===================================================================

  private async generatePlannedOrderNumber(plantId: number): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `PLO-${year}`;

    // Use raw SQL with actual column name
    const lastOrder = await pool.query(
      `SELECT order_number FROM planned_orders WHERE order_number LIKE $1 ORDER BY order_number DESC LIMIT 1`,
      [`${prefix}%`]
    );

    let nextNumber = 1;
    if (lastOrder.rows.length > 0) {
      const lastOrderNumber = lastOrder.rows[0].order_number;
      const parts = lastOrderNumber.split('-');
      if (parts.length >= 3) {
        const lastNumber = parseInt(parts[2]) || 0;
        nextNumber = lastNumber + 1;
      }
    }

    return `${prefix}-${nextNumber.toString().padStart(6, '0')}`;
  }

  private async generateRequisitionNumber(plantId: number): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `REQ-${year}`;

    // Use raw SQL with actual column name
    const lastRequisition = await pool.query(
      `SELECT requisition_number FROM purchase_requisitions WHERE requisition_number LIKE $1 ORDER BY requisition_number DESC LIMIT 1`,
      [`${prefix}%`]
    );

    let nextNumber = 1;
    if (lastRequisition.rows.length > 0) {
      const lastRequisitionNumber = lastRequisition.rows[0].requisition_number;
      const parts = lastRequisitionNumber.split('-');
      if (parts.length >= 3) {
        const lastNumber = parseInt(parts[2]) || 0;
        nextNumber = lastNumber + 1;
      }
    }

    return `${prefix}-${nextNumber.toString().padStart(6, '0')}`;
  }

  private async generateMrpRunNumber(): Promise<string> {
    // Get prefix from document_settings or use default
    const prefixResult = await pool.query(
      `SELECT setting_value FROM document_settings WHERE setting_key = 'planning_run_number_prefix' LIMIT 1`
    );
    const defaultPrefix = prefixResult.rows.length > 0
      ? prefixResult.rows[0].setting_value
      : 'PLAN';

    const year = new Date().getFullYear();
    const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
    const prefix = `${defaultPrefix}-${year}${month}`;

    const lastRun = await db
      .select({ runNumber: mrpRuns.runNumber })
      .from(mrpRuns)
      .where(sql`${mrpRuns.runNumber} LIKE ${prefix + '%'}`)
      .orderBy(desc(mrpRuns.runNumber))
      .limit(1);

    let nextNumber = 1;
    if (lastRun.length > 0) {
      const lastNumber = parseInt(lastRun[0].runNumber.split('-')[2]);
      nextNumber = lastNumber + 1;
    }

    return `${prefix}-${nextNumber.toString().padStart(4, '0')}`;
  }
}

export const productionPlanningService = new ProductionPlanningService();