import pkg from 'pg';
const { Pool } = pkg;
import { InventoryFinanceCostService } from './inventory-finance-cost-service';

/**
 * Inventory Write-off and Write-down Service
 * Handles inventory losses, obsolescence, and devaluation with financial posting
 */
export class InventoryWriteoffService {
  private pool: Pool;
  private financeService: InventoryFinanceCostService;

  constructor(pool: Pool) {
    this.pool = pool;
    this.financeService = new InventoryFinanceCostService(pool);
  }

  /**
   * Process inventory write-off (complete loss)
   */
  async processWriteOff(
    materialCode: string,
    quantity: number,
    plantCode: string,
    storageLocation: string,
    reason: string,
    costCenterId?: number
  ): Promise<{
    success: boolean;
    writeOffAmount: number;
    glDocumentNumber?: string;
    stockMovementId?: number;
    error?: string;
  }> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Get current stock balance and cost
      const stockBalanceResult = await client.query(
        `SELECT quantity, moving_average_price, available_quantity
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
        throw new Error(`Insufficient stock for write-off. Available: ${availableQty}, Required: ${quantity}`);
      }

      const unitCost = parseFloat(stockBalance.moving_average_price || '0');
      const writeOffAmount = unitCost * quantity;

      // Get cost center and profit center
      const centers = await this.financeService.getCostAndProfitCenters(
        materialCode,
        plantCode,
        costCenterId
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

      // Create stock movement (Movement Type 602 - Scrapping/Write-off)
      const movementResult = await client.query(
        `INSERT INTO stock_movements (
          document_number, posting_date, material_code, plant_code,
          storage_location, movement_type, quantity, unit,
          unit_price, total_value, reference_document, notes,
          cost_center_id, profit_center_id, write_off_amount,
          financial_posting_status
        )
        VALUES (
          $1, CURRENT_DATE, $2, $3, $4, '602', $5,
          (SELECT base_uom FROM materials WHERE code = $2 LIMIT 1),
          $6, $7, $8, $9, $10, $11, $7, 'PENDING'
        )
        RETURNING id`,
        [
          documentNumber,
          materialCode,
          plantCode,
          storageLocation,
          -Math.abs(quantity), // Negative for write-off
          unitCost,
          writeOffAmount,
          `WRITEOFF-${Date.now()}`,
          `Inventory write-off: ${reason}`,
          centers.costCenterId,
          centers.profitCenterId,
        ]
      );

      const stockMovementId = movementResult.rows[0].id;

      // Update stock balance
      await client.query(
        `UPDATE stock_balances
         SET quantity = GREATEST(0, quantity - $1),
             available_quantity = GREATEST(0, available_quantity - $1),
             total_value = GREATEST(0, total_value - $2),
             last_updated = CURRENT_TIMESTAMP
         WHERE material_code = $3 
           AND plant_code = $4 
           AND storage_location = $5`,
        [quantity, writeOffAmount, materialCode, plantCode, storageLocation]
      );

      // Create financial posting (mandatory)
      const postingResult = await this.financeService.processWriteOff(
        client,
        {
          materialCode,
          quantity,
          unitCost,
          writeOffAmount,
          reason,
          costCenterId: centers.costCenterId || undefined,
          profitCenterId: centers.profitCenterId || undefined,
          referenceDocument: documentNumber,
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
          writeOffAmount,
          glDocumentNumber: postingResult.glDocumentNumber,
          financialPostingStatus: 'POSTED',
        }
      );

      await client.query('COMMIT');

      return {
        success: true,
        writeOffAmount,
        glDocumentNumber: postingResult.glDocumentNumber,
        stockMovementId,
      };
    } catch (error: any) {
      await client.query('ROLLBACK');
      console.error('Error processing write-off:', error);
      return {
        success: false,
        writeOffAmount: 0,
        error: error.message || 'Unknown error',
      };
    } finally {
      client.release();
    }
  }

  /**
   * Process inventory write-down (partial devaluation)
   */
  async processWriteDown(
    materialCode: string,
    quantity: number,
    plantCode: string,
    storageLocation: string,
    newUnitCost: number,
    reason: string,
    costCenterId?: number
  ): Promise<{
    success: boolean;
    writeDownAmount: number;
    glDocumentNumber?: string;
    stockMovementId?: number;
    error?: string;
  }> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Get current stock balance and cost
      const stockBalanceResult = await client.query(
        `SELECT quantity, moving_average_price, available_quantity, total_value
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
        throw new Error(`Insufficient stock for write-down. Available: ${availableQty}, Required: ${quantity}`);
      }

      const originalUnitCost = parseFloat(stockBalance.moving_average_price || '0');
      const originalValue = originalUnitCost * quantity;
      const newValue = newUnitCost * quantity;
      const writeDownAmount = originalValue - newValue; // Loss amount

      if (writeDownAmount <= 0) {
        throw new Error('Write-down amount must be positive. New cost must be less than original cost.');
      }

      // Get cost center and profit center
      const centers = await this.financeService.getCostAndProfitCenters(
        materialCode,
        plantCode,
        costCenterId
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

      // Create stock movement (Movement Type 602 - Write-down)
      const movementResult = await client.query(
        `INSERT INTO stock_movements (
          document_number, posting_date, material_code, plant_code,
          storage_location, movement_type, quantity, unit,
          unit_price, total_value, reference_document, notes,
          cost_center_id, profit_center_id, write_down_amount,
          financial_posting_status
        )
        VALUES (
          $1, CURRENT_DATE, $2, $3, $4, '602', 0,
          (SELECT base_uom FROM materials WHERE code = $2 LIMIT 1),
          $5, $6, $7, $8, $9, $10, $6, 'PENDING'
        )
        RETURNING id`,
        [
          documentNumber,
          materialCode,
          plantCode,
          storageLocation,
          originalUnitCost,
          writeDownAmount,
          `WRITEDOWN-${Date.now()}`,
          `Inventory write-down: ${reason}`,
          centers.costCenterId,
          centers.profitCenterId,
        ]
      );

      const stockMovementId = movementResult.rows[0].id;

      // Update stock balance with new cost
      const currentTotalValue = parseFloat(stockBalance.total_value || '0');
      const newTotalValue = currentTotalValue - writeDownAmount;
      const newMovingAverage = stockBalance.quantity > 0 
        ? newTotalValue / parseFloat(stockBalance.quantity || '1')
        : newUnitCost;

      await client.query(
        `UPDATE stock_balances
         SET moving_average_price = $1,
             total_value = $2,
             last_updated = CURRENT_TIMESTAMP
         WHERE material_code = $3 
           AND plant_code = $4 
           AND storage_location = $5`,
        [newMovingAverage, newTotalValue, materialCode, plantCode, storageLocation]
      );

      // Create financial posting (mandatory)
      const postingResult = await this.financeService.processWriteDown(
        client,
        {
          materialCode,
          quantity,
          originalCost: originalUnitCost,
          newCost: newUnitCost,
          writeDownAmount,
          reason,
          costCenterId: centers.costCenterId || undefined,
          profitCenterId: centers.profitCenterId || undefined,
          referenceDocument: documentNumber,
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
          writeDownAmount,
          glDocumentNumber: postingResult.glDocumentNumber,
          financialPostingStatus: 'POSTED',
        }
      );

      await client.query('COMMIT');

      return {
        success: true,
        writeDownAmount,
        glDocumentNumber: postingResult.glDocumentNumber,
        stockMovementId,
      };
    } catch (error: any) {
      await client.query('ROLLBACK');
      console.error('Error processing write-down:', error);
      return {
        success: false,
        writeDownAmount: 0,
        error: error.message || 'Unknown error',
      };
    } finally {
      client.release();
    }
  }
}

