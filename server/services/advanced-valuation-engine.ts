/**
 * ADVANCED PRICE VALUATION ENGINE
 * Implements FIFO, LIFO, Moving Average, and Standard Cost methods
 * Handles price revaluation and inventory aging analysis
 */

import { pool } from "../db";

export interface ValuationMethod {
  method: 'FIFO' | 'LIFO' | 'MOVING_AVERAGE' | 'STANDARD_COST';
  materialCode: string;
  plantCode: string;
  storageLocation: string;
}

export interface PriceLayer {
  quantity: number;
  unitPrice: number;
  totalValue: number;
  receiptDate: Date;
  documentNumber: string;
  remainingQuantity: number;
}

export interface ValuationResult {
  method: string;
  totalQuantity: number;
  totalValue: number;
  averagePrice: number;
  priceLayers: PriceLayer[];
  lastUpdated: Date;
}

export class AdvancedValuationEngine {

  /**
   * Calculate inventory value using specified valuation method
   */
  async calculateInventoryValue(
    materialCode: string,
    plantCode: string,
    storageLocation: string,
    method: 'FIFO' | 'LIFO' | 'MOVING_AVERAGE' | 'STANDARD_COST' = 'MOVING_AVERAGE'
  ): Promise<ValuationResult> {
    
    switch (method) {
      case 'FIFO':
        return this.calculateFIFOValue(materialCode, plantCode, storageLocation);
      case 'LIFO':
        return this.calculateLIFOValue(materialCode, plantCode, storageLocation);
      case 'MOVING_AVERAGE':
        return this.calculateMovingAverageValue(materialCode, plantCode, storageLocation);
      case 'STANDARD_COST':
        return this.calculateStandardCostValue(materialCode, plantCode, storageLocation);
      default:
        throw new Error(`Unsupported valuation method: ${method}`);
    }
  }

  /**
   * FIFO (First In, First Out) Valuation
   */
  private async calculateFIFOValue(
    materialCode: string,
    plantCode: string,
    storageLocation: string
  ): Promise<ValuationResult> {
    
    // Get all receipt movements ordered by date (oldest first)
    const receipts = await pool.query(`
      SELECT 
        document_number,
        posting_date,
        quantity,
        unit_price,
        total_value,
        movement_type
      FROM stock_movements 
      WHERE material_code = $1 
        AND plant_code = $2 
        AND storage_location = $3
        AND movement_type IN ('101', '131', '501') -- Receipt movement types
        AND quantity > 0
      ORDER BY posting_date ASC, created_at ASC
    `, [materialCode, plantCode, storageLocation]);

    // Get all issue movements
    const issues = await pool.query(`
      SELECT 
        SUM(quantity) as total_issued
      FROM stock_movements 
      WHERE material_code = $1 
        AND plant_code = $2 
        AND storage_location = $3
        AND movement_type IN ('601', '261', '551') -- Issue movement types
        AND quantity > 0
    `, [materialCode, plantCode, storageLocation]);

    const totalIssued = parseFloat(issues.rows[0]?.total_issued || '0');
    let remainingToIssue = totalIssued;
    
    const priceLayers: PriceLayer[] = [];
    let totalValue = 0;
    let totalQuantity = 0;

    // Process receipts in FIFO order
    for (const receipt of receipts.rows) {
      const receiptQty = parseFloat(receipt.quantity);
      const unitPrice = parseFloat(receipt.unit_price || '0');
      
      let remainingQty = receiptQty;
      
      // Deduct issues from this layer
      if (remainingToIssue > 0) {
        const issuedFromLayer = Math.min(remainingQty, remainingToIssue);
        remainingQty -= issuedFromLayer;
        remainingToIssue -= issuedFromLayer;
      }

      if (remainingQty > 0) {
        priceLayers.push({
          quantity: receiptQty,
          unitPrice,
          totalValue: remainingQty * unitPrice,
          receiptDate: new Date(receipt.posting_date),
          documentNumber: receipt.document_number,
          remainingQuantity: remainingQty
        });
        
        totalValue += remainingQty * unitPrice;
        totalQuantity += remainingQty;
      }
    }

    return {
      method: 'FIFO',
      totalQuantity,
      totalValue,
      averagePrice: totalQuantity > 0 ? totalValue / totalQuantity : 0,
      priceLayers,
      lastUpdated: new Date()
    };
  }

  /**
   * LIFO (Last In, First Out) Valuation
   */
  private async calculateLIFOValue(
    materialCode: string,
    plantCode: string,
    storageLocation: string
  ): Promise<ValuationResult> {
    
    // Get all receipt movements ordered by date (newest first for LIFO)
    const receipts = await db.execute(`
      SELECT 
        document_number,
        posting_date,
        quantity,
        unit_price,
        total_value,
        movement_type
      FROM stock_movements 
      WHERE material_code = $1 
        AND plant_code = $2 
        AND storage_location = $3
        AND movement_type IN ('101', '131', '501')
        AND quantity > 0
      ORDER BY posting_date DESC, created_at DESC
    `, [materialCode, plantCode, storageLocation]);

    // Similar logic to FIFO but process newest receipts first
    const issues = await db.execute(`
      SELECT 
        SUM(quantity) as total_issued
      FROM stock_movements 
      WHERE material_code = $1 
        AND plant_code = $2 
        AND storage_location = $3
        AND movement_type IN ('601', '261', '551')
        AND quantity > 0
    `, [materialCode, plantCode, storageLocation]);

    const totalIssued = parseFloat(issues.rows[0]?.total_issued || '0');
    let remainingToIssue = totalIssued;
    
    const priceLayers: PriceLayer[] = [];
    let totalValue = 0;
    let totalQuantity = 0;

    // Process receipts in LIFO order (newest first)
    for (const receipt of receipts.rows) {
      const receiptQty = parseFloat(receipt.quantity);
      const unitPrice = parseFloat(receipt.unit_price || '0');
      
      let remainingQty = receiptQty;
      
      if (remainingToIssue > 0) {
        const issuedFromLayer = Math.min(remainingQty, remainingToIssue);
        remainingQty -= issuedFromLayer;
        remainingToIssue -= issuedFromLayer;
      }

      if (remainingQty > 0) {
        priceLayers.push({
          quantity: receiptQty,
          unitPrice,
          totalValue: remainingQty * unitPrice,
          receiptDate: new Date(receipt.posting_date),
          documentNumber: receipt.document_number,
          remainingQuantity: remainingQty
        });
        
        totalValue += remainingQty * unitPrice;
        totalQuantity += remainingQty;
      }
    }

    return {
      method: 'LIFO',
      totalQuantity,
      totalValue,
      averagePrice: totalQuantity > 0 ? totalValue / totalQuantity : 0,
      priceLayers,
      lastUpdated: new Date()
    };
  }

  /**
   * Moving Average Valuation
   */
  private async calculateMovingAverageValue(
    materialCode: string,
    plantCode: string,
    storageLocation: string
  ): Promise<ValuationResult> {
    
    // Get all movements in chronological order
    const movements = await db.execute(`
      SELECT 
        document_number,
        posting_date,
        movement_type,
        quantity,
        unit_price,
        total_value
      FROM stock_movements 
      WHERE material_code = $1 
        AND plant_code = $2 
        AND storage_location = $3
      ORDER BY posting_date ASC, created_at ASC
    `, [materialCode, plantCode, storageLocation]);

    let runningQuantity = 0;
    let runningValue = 0;
    let movingAveragePrice = 0;

    // Process each movement to calculate moving average
    for (const movement of movements.rows) {
      const qty = parseFloat(movement.quantity);
      const unitPrice = parseFloat(movement.unit_price || '0');
      const movementType = movement.movement_type;

      if (['101', '131', '501'].includes(movementType)) {
        // Receipt: Add to inventory
        runningQuantity += qty;
        runningValue += qty * unitPrice;
        movingAveragePrice = runningQuantity > 0 ? runningValue / runningQuantity : 0;
      } else if (['601', '261', '551'].includes(movementType)) {
        // Issue: Deduct from inventory at moving average price
        runningQuantity -= qty;
        runningValue -= qty * movingAveragePrice;
        // Ensure no negative values
        if (runningQuantity < 0) runningQuantity = 0;
        if (runningValue < 0) runningValue = 0;
      }
    }

    return {
      method: 'MOVING_AVERAGE',
      totalQuantity: Math.max(0, runningQuantity),
      totalValue: Math.max(0, runningValue),
      averagePrice: movingAveragePrice,
      priceLayers: [{
        quantity: runningQuantity,
        unitPrice: movingAveragePrice,
        totalValue: runningValue,
        receiptDate: new Date(),
        documentNumber: 'MOVING_AVG',
        remainingQuantity: runningQuantity
      }],
      lastUpdated: new Date()
    };
  }

  /**
   * Standard Cost Valuation
   */
  private async calculateStandardCostValue(
    materialCode: string,
    plantCode: string,
    storageLocation: string
  ): Promise<ValuationResult> {
    
    // Get standard price from material master or use average of recent receipts
    const standardPrice = await db.execute(`
      SELECT 
        AVG(unit_price) as standard_price,
        COUNT(*) as receipt_count
      FROM stock_movements 
      WHERE material_code = $1 
        AND movement_type IN ('101', '131', '501')
        AND posting_date >= CURRENT_DATE - INTERVAL '90 days'
        AND unit_price > 0
    `, [materialCode]);

    const stdPrice = parseFloat(standardPrice.rows[0]?.standard_price || '0');

    // Get current quantity
    const currentStock = await db.execute(`
      SELECT 
        SUM(CASE 
          WHEN movement_type IN ('101', '131', '501') THEN quantity
          WHEN movement_type IN ('601', '261', '551') THEN -quantity
          ELSE 0 
        END) as current_quantity
      FROM stock_movements 
      WHERE material_code = $1 
        AND plant_code = $2 
        AND storage_location = $3
    `, [materialCode, plantCode, storageLocation]);

    const currentQty = Math.max(0, parseFloat(currentStock.rows[0]?.current_quantity || '0'));

    return {
      method: 'STANDARD_COST',
      totalQuantity: currentQty,
      totalValue: currentQty * stdPrice,
      averagePrice: stdPrice,
      priceLayers: [{
        quantity: currentQty,
        unitPrice: stdPrice,
        totalValue: currentQty * stdPrice,
        receiptDate: new Date(),
        documentNumber: 'STANDARD_COST',
        remainingQuantity: currentQty
      }],
      lastUpdated: new Date()
    };
  }

  /**
   * Currency Revaluation Processing
   */
  async processRevaluation(
    materialCode: string,
    plantCode: string,
    newPrice: number,
    revaluationReason: string
  ): Promise<{ revaluationGain: number; revaluationLoss: number }> {
    
    // Get current inventory value
    const currentValuation = await this.calculateInventoryValue(materialCode, plantCode, '', 'MOVING_AVERAGE');
    
    // Calculate revaluation difference
    const newTotalValue = currentValuation.totalQuantity * newPrice;
    const revaluationDifference = newTotalValue - currentValuation.totalValue;
    
    // Create revaluation movement
    await db.execute(`
      INSERT INTO stock_movements (
        document_number, posting_date, material_code, plant_code,
        movement_type, quantity, unit_price, total_value, notes
      ) VALUES (
        $1, CURRENT_DATE, $2, $3, 'REVAL', 0, $4, $5, $6
      )
    `, [
      `REVAL-${Date.now()}`,
      materialCode,
      plantCode,
      newPrice,
      revaluationDifference,
      revaluationReason
    ]);

    return {
      revaluationGain: revaluationDifference > 0 ? revaluationDifference : 0,
      revaluationLoss: revaluationDifference < 0 ? Math.abs(revaluationDifference) : 0
    };
  }

  /**
   * Inventory Aging Analysis
   */
  async performAgingAnalysis(plantCode?: string): Promise<{
    agingBuckets: {
      period: string;
      quantity: number;
      value: number;
      percentage: number;
    }[];
    slowMovingItems: {
      materialCode: string;
      lastMovementDate: Date;
      daysWithoutMovement: number;
      currentValue: number;
    }[];
  }> {
    
    // Define aging buckets (0-30, 31-60, 61-90, 91-180, 180+ days)
    const agingQuery = await db.execute(`
      WITH latest_movements AS (
        SELECT 
          material_code,
          plant_code,
          MAX(posting_date) as last_movement_date,
          CURRENT_DATE - MAX(posting_date) as days_without_movement
        FROM stock_movements 
        WHERE ($1 IS NULL OR plant_code = $1)
        GROUP BY material_code, plant_code
      ),
      current_inventory AS (
        SELECT 
          ib.material_code,
          ib.plant_code,
          ib.quantity,
          ib.total_value,
          lm.days_without_movement
        FROM inventory_balance ib
        JOIN latest_movements lm ON ib.material_code = lm.material_code 
          AND ib.plant_code = lm.plant_code
        WHERE ib.quantity > 0
      )
      SELECT 
        CASE 
          WHEN days_without_movement <= 30 THEN '0-30 days'
          WHEN days_without_movement <= 60 THEN '31-60 days'
          WHEN days_without_movement <= 90 THEN '61-90 days'
          WHEN days_without_movement <= 180 THEN '91-180 days'
          ELSE '180+ days'
        END as aging_period,
        SUM(quantity) as total_quantity,
        SUM(total_value) as total_value,
        COUNT(*) as item_count
      FROM current_inventory
      GROUP BY 
        CASE 
          WHEN days_without_movement <= 30 THEN '0-30 days'
          WHEN days_without_movement <= 60 THEN '31-60 days'
          WHEN days_without_movement <= 90 THEN '61-90 days'
          WHEN days_without_movement <= 180 THEN '91-180 days'
          ELSE '180+ days'
        END
      ORDER BY 
        CASE 
          WHEN aging_period = '0-30 days' THEN 1
          WHEN aging_period = '31-60 days' THEN 2
          WHEN aging_period = '61-90 days' THEN 3
          WHEN aging_period = '91-180 days' THEN 4
          ELSE 5
        END
    `, [plantCode || null]);

    // Calculate total value for percentage calculation
    const totalValue = agingQuery.rows.reduce((sum, row) => sum + parseFloat(row.total_value || '0'), 0);

    const agingBuckets = agingQuery.rows.map(row => ({
      period: row.aging_period,
      quantity: parseFloat(row.total_quantity || '0'),
      value: parseFloat(row.total_value || '0'),
      percentage: totalValue > 0 ? (parseFloat(row.total_value || '0') / totalValue) * 100 : 0
    }));

    // Identify slow-moving items (no movement in 90+ days)
    const slowMovingQuery = await db.execute(`
      WITH latest_movements AS (
        SELECT 
          material_code,
          plant_code,
          MAX(posting_date) as last_movement_date,
          CURRENT_DATE - MAX(posting_date) as days_without_movement
        FROM stock_movements 
        WHERE ($1 IS NULL OR plant_code = $1)
        GROUP BY material_code, plant_code
      )
      SELECT 
        ib.material_code,
        lm.last_movement_date,
        lm.days_without_movement,
        ib.total_value
      FROM inventory_balance ib
      JOIN latest_movements lm ON ib.material_code = lm.material_code 
        AND ib.plant_code = lm.plant_code
      WHERE ib.quantity > 0 
        AND lm.days_without_movement >= 90
      ORDER BY lm.days_without_movement DESC, ib.total_value DESC
      LIMIT 20
    `, [plantCode || null]);

    const slowMovingItems = slowMovingQuery.rows.map(row => ({
      materialCode: row.material_code,
      lastMovementDate: new Date(row.last_movement_date),
      daysWithoutMovement: parseInt(row.days_without_movement),
      currentValue: parseFloat(row.total_value || '0')
    }));

    return {
      agingBuckets,
      slowMovingItems
    };
  }
}