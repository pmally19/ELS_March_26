import pkg from 'pg';
const { Pool } = pkg;

interface MRPRequirement {
  id?: number;
  materialId: string;
  plantId: number;
  requirementType: string;
  requirementClass: string;
  requiredQuantity: number;
  requiredDate: string;
  sourceDocumentType: string;
  sourceDocumentNumber: string;
  stockAvailable?: number;
  shortfallQuantity?: number;
  procurementAction?: string;
}

interface StockCheckResult {
  materialId: string;
  plantId: number;
  availableStock: number;
  allocatedStock: number;
  freeStock: number;
  safetyStock: number;
  stockSufficient: boolean;
  shortfallQuantity: number;
}

export class MRPRequirementsService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Process MRP Requirements as shown in the flow diagram
   * 1. Check stock availability for finished goods (FG)
   * 2. If insufficient, check raw material (RM) stock
   * 3. Create planned orders or purchase requisitions as needed
   */
  async processMRPRequirements(plantId?: number): Promise<{
    requirementsProcessed: number;
    plannedOrdersCreated: number;
    purchaseRequisitionsCreated: number;
    stockShortfalls: any[];
  }> {
    const client = await this.pool.connect();
    
    try {
      // Step 1: Get all open requirements (from Sales Orders as per diagram)
      const requirementsQuery = `
        SELECT 
          o.id as source_id,
          o.order_number as source_document,
          m.material_code as material_id,
          o.plant_id,
          oi.quantity as required_quantity,
          o.delivery_date as required_date,
          'SALES_ORDER' as requirement_type,
          'LSB' as requirement_class
        FROM orders o
        JOIN order_items oi ON o.id = oi.order_id
        JOIN materials m ON oi.material_id = m.id
        WHERE o.status = 'CONFIRMED'
        ${plantId ? 'AND o.plant_id = $1' : ''}
        ORDER BY o.delivery_date ASC
      `;
      
      const requirementsResult = await client.query(
        requirementsQuery, 
        plantId ? [plantId] : []
      );
      
      let plannedOrdersCreated = 0;
      let purchaseRequisitionsCreated = 0;
      const stockShortfalls: any[] = [];

      // Step 2: Process each requirement
      for (const req of requirementsResult.rows) {
        // Check stock availability (as per your diagram flow)
        const stockCheck = await this.checkStockAvailability(
          req.material_id, 
          req.plant_id, 
          req.required_quantity
        );

        if (!stockCheck.stockSufficient) {
          // Stock insufficient - need to create orders
          stockShortfalls.push({
            materialId: req.material_id,
            plantId: req.plant_id,
            requiredQuantity: req.required_quantity,
            availableStock: stockCheck.availableStock,
            shortfall: stockCheck.shortfallQuantity
          });

          // Check if material is produced in-house or purchased
          const materialInfo = await this.getMaterialProcurementType(req.material_id);
          
          if (materialInfo.procurement_type === 'PRODUCTION') {
            // Create Planned Order (as shown in diagram)
            await this.createPlannedOrder({
              materialId: req.material_id,
              plantId: req.plant_id,
              plannedQuantity: stockCheck.shortfallQuantity,
              requiredDate: req.required_date,
              sourceDocument: req.source_document,
              orderType: 'PLANNED'
            });
            plannedOrdersCreated++;

            // Check RM (Raw Material) stock for BOM components
            await this.checkRawMaterialRequirements(
              req.material_id, 
              req.plant_id, 
              stockCheck.shortfallQuantity
            );
          } else {
            // Create Purchase Requisition (PR to Procurement team as per diagram)
            await this.createPurchaseRequisition({
              materialId: req.material_id,
              plantId: req.plant_id,
              requestedQuantity: stockCheck.shortfallQuantity,
              requiredDate: req.required_date,
              requestReason: `MRP requirement for Sales Order ${req.source_document}`
            });
            purchaseRequisitionsCreated++;
          }
        }
      }

      return {
        requirementsProcessed: requirementsResult.rows.length,
        plannedOrdersCreated,
        purchaseRequisitionsCreated,
        stockShortfalls
      };

    } finally {
      client.release();
    }
  }

  /**
   * Check stock availability as shown in your diagram's decision flow
   */
  private async checkStockAvailability(
    materialId: string, 
    plantId: number, 
    requiredQuantity: number
  ): Promise<StockCheckResult> {
    const client = await this.pool.connect();
    
    try {
      // Get current stock levels
      const stockQuery = `
        SELECT 
          COALESCE(ib.stock_quantity, 0) as available_stock,
          COALESCE(scc.safety_stock_quantity, 0) as safety_stock
        FROM materials m
        LEFT JOIN inventory_balance ib ON m.material_code = ib.material_code AND ib.plant_id = $2
        LEFT JOIN stock_check_config scc ON m.material_code = scc.material_id AND scc.plant_id = $2
        WHERE m.material_code = $1
      `;
      
      const stockResult = await client.query(stockQuery, [materialId, plantId]);
      const stockData = stockResult.rows[0] || { available_stock: 0, safety_stock: 0 };
      
      const availableStock = parseFloat(stockData.available_stock);
      const safetyStock = parseFloat(stockData.safety_stock);
      const freeStock = Math.max(0, availableStock - safetyStock);
      const stockSufficient = freeStock >= requiredQuantity;
      const shortfallQuantity = stockSufficient ? 0 : requiredQuantity - freeStock;

      return {
        materialId,
        plantId,
        availableStock,
        allocatedStock: 0, // Would need allocation table for real implementation
        freeStock,
        safetyStock,
        stockSufficient,
        shortfallQuantity
      };
      
    } finally {
      client.release();
    }
  }

  /**
   * Check Raw Material requirements (RM stock check from your diagram)
   */
  private async checkRawMaterialRequirements(
    materialId: string, 
    plantId: number, 
    plannedQuantity: number
  ): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      // Get BOM components for the material
      const bomQuery = `
        SELECT 
          bc.material_id as component_material_id,
          bc.component_quantity,
          bc.component_unit,
          m.material_code as component_code
        FROM bills_of_material bom
        JOIN bom_components bc ON bom.id = bc.bom_id
        JOIN materials m ON bc.material_id = m.id
        WHERE bom.material_id = $1 AND bom.plant_id = $2
      `;
      
      const bomResult = await client.query(bomQuery, [materialId, plantId]);
      
      for (const component of bomResult.rows) {
        const requiredComponentQty = component.component_quantity * plannedQuantity;
        
        // Check if component stock is available
        const componentStockCheck = await this.checkStockAvailability(
          component.component_code,
          plantId,
          requiredComponentQty
        );
        
        if (!componentStockCheck.stockSufficient) {
          // Create Purchase Requisition for component (PR to Procurement team)
          await this.createPurchaseRequisition({
            materialId: component.component_code,
            plantId: plantId,
            requestedQuantity: componentStockCheck.shortfallQuantity,
            requiredDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
            requestReason: `MRP requirement for component of ${materialId}`
          });
        }
      }
      
    } finally {
      client.release();
    }
  }

  /**
   * Create Planned Order (as shown in diagram flow)
   */
  private async createPlannedOrder(orderData: {
    materialId: string;
    plantId: number;
    plannedQuantity: number;
    requiredDate: string;
    sourceDocument: string;
    orderType: string;
  }): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      const orderNumber = `PLO-${Date.now()}`;
      
      const insertQuery = `
        INSERT INTO planned_orders (
          order_number, material_id, plant_id, planned_quantity, unit_of_measure,
          planned_start_date, planned_finish_date, requirement_date, order_type,
          conversion_status, mrp_controller, planning_strategy, created_by
        ) VALUES ($1, $2, $3, $4, 'EA', $5, $6, $7, $8, 'OPEN', 'MRP-SYSTEM', 'MRP', 'MRP-ENGINE')
      `;
      
      const startDate = new Date(orderData.requiredDate);
      startDate.setDate(startDate.getDate() - 7); // Start 7 days before required date
      
      await client.query(insertQuery, [
        orderNumber,
        orderData.materialId,
        orderData.plantId,
        orderData.plannedQuantity,
        startDate.toISOString(),
        orderData.requiredDate,
        orderData.requiredDate,
        orderData.orderType
      ]);
      
    } finally {
      client.release();
    }
  }

  /**
   * Create Purchase Requisition (PR to Procurement team as per diagram)
   */
  private async createPurchaseRequisition(reqData: {
    materialId: string;
    plantId: number;
    requestedQuantity: number;
    requiredDate: string;
    requestReason: string;
  }): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      const reqNumber = `PR-MRP-${Date.now()}`;
      
      const insertQuery = `
        INSERT INTO purchase_requisitions (
          requisition_number, requestor_name, request_date, required_date,
          plant_id, priority, status, approval_status, total_estimated_value,
          currency, business_justification, created_by, material_code, requested_quantity
        ) VALUES ($1, 'MRP System', $2, $3, $4, 'HIGH', 'OPEN', 'PENDING', 1000, 'USD', $5, 'MRP-ENGINE', $6, $7)
      `;
      
      await client.query(insertQuery, [
        reqNumber,
        new Date().toISOString(),
        reqData.requiredDate,
        reqData.plantId,
        reqData.requestReason,
        reqData.materialId,
        reqData.requestedQuantity
      ]);
      
    } finally {
      client.release();
    }
  }

  /**
   * Get material procurement type (make vs buy decision)
   */
  private async getMaterialProcurementType(materialId: string): Promise<{ procurement_type: string }> {
    const client = await this.pool.connect();
    
    try {
      const query = `
        SELECT 
          CASE 
            WHEN bom.id IS NOT NULL THEN 'PRODUCTION'
            ELSE 'PROCUREMENT'
          END as procurement_type
        FROM materials m
        LEFT JOIN bills_of_material bom ON m.material_code = bom.material_id
        WHERE m.material_code = $1
        LIMIT 1
      `;
      
      const result = await client.query(query, [materialId]);
      return result.rows[0] || { procurement_type: 'PROCUREMENT' };
      
    } finally {
      client.release();
    }
  }

  /**
   * Get MRP Dashboard with requirement analysis
   */
  async getMRPRequirementsDashboard(plantId?: number): Promise<any> {
    const client = await this.pool.connect();
    
    try {
      const result = {
        openRequirements: 0,
        stockShortfalls: 0,
        plannedOrdersNeeded: 0,
        purchaseRequisitionsNeeded: 0,
        lastMRPRun: null,
        requirementTypes: [],
        criticalMaterials: []
      };

      // Get open requirements count
      const requirementsQuery = `
        SELECT COUNT(*) as count
        FROM orders o
        JOIN order_items oi ON o.id = oi.order_id
        WHERE o.status = 'CONFIRMED'
        ${plantId ? 'AND o.plant_id = $1' : ''}
      `;
      
      const reqResult = await client.query(
        requirementsQuery, 
        plantId ? [plantId] : []
      );
      result.openRequirements = parseInt(reqResult.rows[0].count);

      // Get requirement types
      const typesQuery = `SELECT * FROM requirement_types ORDER BY requirement_type`;
      const typesResult = await client.query(typesQuery);
      result.requirementTypes = typesResult.rows;

      return result;
      
    } finally {
      client.release();
    }
  }
}