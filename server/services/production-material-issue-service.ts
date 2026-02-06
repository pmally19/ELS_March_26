import pkg from 'pg';
const { Pool } = pkg;
import { InventoryFinanceCostService } from './inventory-finance-cost-service';

/**
 * Production Material Issue Service
 * Handles material issues to production orders with WIP tracking and financial posting
 */
export class ProductionMaterialIssueService {
  private pool: Pool;
  private financeService: InventoryFinanceCostService;

  constructor(pool: Pool) {
    this.pool = pool;
    this.financeService = new InventoryFinanceCostService(pool);
  }

  /**
   * Issue materials to production order
   * Creates stock movement, updates WIP, and posts to GL
   */
  async issueMaterialToProduction(
    productionOrderId: number,
    materialCode: string,
    quantity: number,
    plantCode: string,
    storageLocation: string,
    costCenterId?: number
  ): Promise<{
    success: boolean;
    stockMovementId?: number;
    wipAmount?: number;
    glDocumentNumber?: string;
    error?: string;
  }> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Get production order details
      // Note: production_orders has material_id, not material_code - need to join with materials
      const poResult = await client.query(
        `SELECT po.id, m.code as material_code, po.plant_id, po.status
         FROM production_orders po
         LEFT JOIN materials m ON po.material_id = m.id
         WHERE po.id = $1`,
        [productionOrderId]
      );

      if (poResult.rows.length === 0) {
        throw new Error(`Production order ${productionOrderId} not found`);
      }

      const productionOrder = poResult.rows[0];

      if (productionOrder.status === 'COMPLETED' || productionOrder.status === 'CANCELLED') {
        throw new Error(`Cannot issue materials to ${productionOrder.status} production order`);
      }

      // Get material cost from stock balance
      const stockBalanceResult = await client.query(
        `SELECT moving_average_price, quantity, available_quantity
         FROM stock_balances
         WHERE material_code = $1 
           AND plant_code = $2 
           AND storage_location = $3
         LIMIT 1`,
        [materialCode, plantCode, storageLocation]
      );

      if (stockBalanceResult.rows.length === 0) {
        throw new Error(`No stock balance found for material ${materialCode} at ${plantCode}/${storageLocation}`);
      }

      const stockBalance = stockBalanceResult.rows[0];
      const availableQty = parseFloat(stockBalance.available_quantity || '0');

      if (availableQty < quantity) {
        throw new Error(`Insufficient stock. Available: ${availableQty}, Required: ${quantity}`);
      }

      const unitCost = parseFloat(stockBalance.moving_average_price || '0');
      const totalValue = unitCost * quantity;

      // Get cost center and profit center
      const centers = await this.financeService.getCostAndProfitCenters(
        materialCode,
        plantCode,
        costCenterId
      );

      // Calculate variance
      const varianceData = await this.financeService.calculateVariance(
        materialCode,
        unitCost,
        quantity
      );

      // Generate document number
      const currentYear = new Date().getFullYear();
      const docCountResult = await client.query(
        `SELECT COUNT(*) as count FROM stock_movements
         WHERE document_number LIKE $1`,
        [`MAT-${currentYear}-%`]
      );
      const docCount = parseInt(docCountResult.rows[0]?.count || '0') + 1;
      const documentNumber = `MAT-${currentYear}-${docCount.toString().padStart(6, '0')}`;

      // Create stock movement (Movement Type 261 - GI to Production)
      const movementResult = await client.query(
        `INSERT INTO stock_movements (
          document_number, posting_date, material_code, plant_code,
          storage_location, movement_type, quantity, unit,
          unit_price, total_value, reference_document, notes,
          production_order_id, cost_center_id, profit_center_id,
          wip_amount, standard_cost, actual_cost, variance_amount, variance_type,
          financial_posting_status
        )
        VALUES (
          $1, CURRENT_DATE, $2, $3, $4, '261', $5, 
          (SELECT base_uom FROM materials WHERE code = $2 LIMIT 1),
          $6, $7, $8, $9, $10, $11, $12, $7, $13, $6, $14, $15, 'PENDING'
        )
        RETURNING id`,
        [
          documentNumber,
          materialCode,
          plantCode,
          storageLocation,
          -Math.abs(quantity), // Negative for issue
          unitCost,
          totalValue,
          `PROD-${productionOrderId}`,
          `Material issue to production order ${productionOrder.order_number}`,
          productionOrderId,
          centers.costCenterId,
          centers.profitCenterId,
          varianceData.standardCost,
          varianceData.varianceAmount,
          varianceData.varianceType,
        ]
      );

      const stockMovementId = movementResult.rows[0].id;

      // Update stock balance
      await client.query(
        `UPDATE stock_balances
         SET quantity = quantity - $1,
             available_quantity = GREATEST(0, available_quantity - $1),
             last_updated = CURRENT_TIMESTAMP
         WHERE material_code = $2 
           AND plant_code = $3 
           AND storage_location = $4`,
        [quantity, materialCode, plantCode, storageLocation]
      );

      // Create financial posting (mandatory)
      const postingResult = await this.financeService.createFinancialPosting(
        client,
        {
          materialCode,
          movementType: '261', // GI to Production
          quantity,
          unitPrice: unitCost,
          totalValue,
          costCenterId: centers.costCenterId || undefined,
          profitCenterId: centers.profitCenterId || undefined,
          wipAmount: totalValue,
          referenceDocument: `PROD-${productionOrderId}`,
        }
      );

      if (!postingResult.success) {
        throw new Error(`Financial posting failed: ${postingResult.error}`);
      }

      // Update stock movement with financial posting data
      await this.financeService.updateStockMovementWithFinanceData(
        client,
        stockMovementId,
        {
          wipAmount: totalValue,
          standardCost: varianceData.standardCost,
          actualCost: varianceData.actualCost,
          varianceAmount: varianceData.varianceAmount,
          varianceType: varianceData.varianceType,
          glDocumentNumber: postingResult.glDocumentNumber,
          financialPostingStatus: 'POSTED',
        }
      );

      // Update WIP cost in production order
      await this.financeService.updateWIPCost(client, productionOrderId);

      await client.query('COMMIT');

      return {
        success: true,
        stockMovementId,
        wipAmount: totalValue,
        glDocumentNumber: postingResult.glDocumentNumber,
      };
    } catch (error: any) {
      await client.query('ROLLBACK');
      console.error('Error issuing material to production:', error);
      return {
        success: false,
        error: error.message || 'Unknown error',
      };
    } finally {
      client.release();
    }
  }

  /**
   * Receive finished goods from production order
   * Transfers WIP to Finished Goods inventory
   */
  async receiveFinishedGoodsFromProduction(
    productionOrderId: number,
    receivedQuantity: number,
    plantCode: string,
    storageLocation: string
  ): Promise<{
    success: boolean;
    wipTransferred: number;
    glDocumentNumber?: string;
    error?: string;
  }> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Get production order and WIP cost
      const poResult = await client.query(
        `SELECT id, material_code, quantity, wip_total_cost, plant_id
         FROM production_orders
         WHERE id = $1`,
        [productionOrderId]
      );

      if (poResult.rows.length === 0) {
        throw new Error(`Production order ${productionOrderId} not found`);
      }

      const productionOrder = poResult.rows[0];
      const finishedGoodCode = productionOrder.material_code;
      const plannedQuantity = parseFloat(productionOrder.quantity || '0');
      const wipTotalCost = parseFloat(productionOrder.wip_total_cost || '0');

      // Calculate unit cost from WIP
      const unitCost = plannedQuantity > 0 ? wipTotalCost / plannedQuantity : 0;
      const receivedValue = unitCost * receivedQuantity;

      // Get cost center and profit center
      const centers = await this.financeService.getCostAndProfitCenters(
        finishedGoodCode,
        plantCode
      );

      // Generate document number
      const currentYear = new Date().getFullYear();
      const docCountResult = await client.query(
        `SELECT COUNT(*) as count FROM stock_movements
         WHERE document_number LIKE $1`,
        [`MAT-${currentYear}-%`]
      );
      const docCount = parseInt(docCountResult.rows[0]?.count || '0') + 1;
      const documentNumber = `MAT-${currentYear}-${docCount.toString().padStart(6, '0')}`;

      // Create stock movement (Movement Type 102 - GR from Production)
      const movementResult = await client.query(
        `INSERT INTO stock_movements (
          document_number, posting_date, material_code, plant_code,
          storage_location, movement_type, quantity, unit,
          unit_price, total_value, reference_document, notes,
          production_order_id, cost_center_id, profit_center_id,
          wip_amount, financial_posting_status
        )
        VALUES (
          $1, CURRENT_DATE, $2, $3, $4, '102', $5,
          (SELECT base_uom FROM materials WHERE code = $2 LIMIT 1),
          $6, $7, $8, $9, $10, $11, $12, $7, 'PENDING'
        )
        RETURNING id`,
        [
          documentNumber,
          finishedGoodCode,
          plantCode,
          storageLocation,
          receivedQuantity,
          unitCost,
          receivedValue,
          `PROD-${productionOrderId}`,
          `Finished goods receipt from production order ${productionOrder.order_number}`,
          productionOrderId,
          centers.costCenterId,
          centers.profitCenterId,
        ]
      );

      const stockMovementId = movementResult.rows[0].id;

      // Update stock balance (increase finished goods)
      await client.query(
        `INSERT INTO stock_balances (
          material_code, plant_code, storage_location, stock_type,
          quantity, available_quantity, unit, moving_average_price, total_value
        )
        VALUES ($1::VARCHAR, $2::VARCHAR, $3::VARCHAR, $7::VARCHAR, $4::NUMERIC, $4::NUMERIC, 
          (SELECT base_uom FROM materials WHERE code = $1 LIMIT 1),
          $5::NUMERIC, $6::NUMERIC
        )
        ON CONFLICT (material_code, plant_code, storage_location, stock_type)
        DO UPDATE SET
          quantity = stock_balances.quantity + $4::NUMERIC,
          available_quantity = stock_balances.available_quantity + $4::NUMERIC,
          moving_average_price = (
            (stock_balances.total_value + $6::NUMERIC) / 
            (stock_balances.quantity + $4::NUMERIC)
          ),
          total_value = stock_balances.total_value + $6::NUMERIC,
          last_updated = CURRENT_TIMESTAMP`,
        [String(finishedGoodCode), String(plantCode), String(storageLocation), receivedQuantity, unitCost, receivedValue, 'AVAILABLE']
      );

      // Create financial posting (Movement Type 102: Debit Finished Goods, Credit WIP)
      const postingResult = await this.financeService.createFinancialPosting(
        client,
        {
          materialCode: finishedGoodCode,
          movementType: '102', // GR from Production
          quantity: receivedQuantity,
          unitPrice: unitCost,
          totalValue: receivedValue,
          costCenterId: centers.costCenterId || undefined,
          profitCenterId: centers.profitCenterId || undefined,
          wipAmount: receivedValue,
          referenceDocument: `PROD-${productionOrderId}`,
        }
      );

      if (!postingResult.success) {
        throw new Error(`Financial posting failed: ${postingResult.error}`);
      }

      // Update stock movement with financial posting data
      await this.financeService.updateStockMovementWithFinanceData(
        client,
        stockMovementId,
        {
          wipAmount: receivedValue,
          glDocumentNumber: postingResult.glDocumentNumber,
          financialPostingStatus: 'POSTED',
        }
      );

      // Update production order WIP (reduce by received amount)
      await client.query(
        `UPDATE production_orders
         SET wip_total_cost = GREATEST(0, wip_total_cost - $1),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [receivedValue, productionOrderId]
      );

      await client.query('COMMIT');

      return {
        success: true,
        wipTransferred: receivedValue,
        glDocumentNumber: postingResult.glDocumentNumber,
      };
    } catch (error: any) {
      await client.query('ROLLBACK');
      console.error('Error receiving finished goods from production:', error);
      return {
        success: false,
        error: error.message || 'Unknown error',
      };
    } finally {
      client.release();
    }
  }
}

