/**
 * ATP (Available-to-Promise) Check Service
 * Checks material availability considering current stock, reservations, and planned receipts/issues
 */

import { Pool } from 'pg';
import { pool } from '../db';

export interface ATPCheckRequest {
  materialCode: string;
  materialId?: number;
  plantId: number;
  storageLocation?: string;
  requiredQuantity: number;
  requirementDate: Date;
  excludeReservationId?: number; // Exclude specific reservation from check
}

export interface ATPCheckResult {
  isAvailable: boolean;
  availableQuantity: number;
  currentStock: number;
  reservedQuantity: number;
  availableDate?: Date;
  shortageQuantity: number;
  breakdown: {
    currentStock: number;
    reservedQuantity: number;
    plannedReceipts: number;
    plannedIssues: number;
    netAvailable: number;
  };
}

export class ATPCheckService {
  private pool: Pool;

  constructor(dbPool?: Pool) {
    this.pool = dbPool || pool;
  }

  /**
   * Check ATP for a material requirement
   */
  async checkATP(request: ATPCheckRequest): Promise<ATPCheckResult> {
    const {
      materialCode,
      materialId,
      plantId,
      storageLocation,
      requiredQuantity,
      requirementDate,
      excludeReservationId
    } = request;

    // Get current stock
    const stockQuery = `
      SELECT 
        COALESCE(SUM(sb.quantity), 0) as current_stock
      FROM stock_balances sb
      WHERE sb.material_code = $1
        AND sb.plant_code = (SELECT code FROM plants WHERE id = $2)
        ${storageLocation ? `AND sb.storage_location = $3` : ''}
    `;

    const stockParams = storageLocation 
      ? [materialCode, plantId, storageLocation]
      : [materialCode, plantId];

    const stockResult = await this.pool.query(stockQuery, stockParams);
    const currentStock = parseFloat(stockResult.rows[0]?.current_stock || '0');

    // Get reserved quantity (active reservations)
    const reservedQuery = `
      SELECT 
        COALESCE(SUM(mr.reserved_quantity - mr.withdrawn_quantity), 0) as reserved_quantity
      FROM material_reservations mr
      WHERE mr.material_code = $1
        AND mr.plant_id = $2
        AND mr.status = 'ACTIVE'
        AND mr.requirement_date <= $3
        ${excludeReservationId ? `AND mr.id != $4` : ''}
    `;

    const reservedParams = excludeReservationId
      ? [materialCode, plantId, requirementDate, excludeReservationId]
      : [materialCode, plantId, requirementDate];

    const reservedResult = await this.pool.query(reservedQuery, reservedParams);
    const reservedQuantity = parseFloat(reservedResult.rows[0]?.reserved_quantity || '0');

    // Get planned receipts (goods receipts scheduled before requirement date)
    const plannedReceiptsQuery = `
      SELECT 
        COALESCE(SUM(gr.quantity), 0) as planned_receipts
      FROM goods_receipts gr
      WHERE gr.material_code = $1
        AND gr.plant_id = $2
        AND gr.status IN ('PENDING', 'APPROVED')
        AND gr.receipt_date <= $3
    `;

    const plannedReceiptsResult = await this.pool.query(plannedReceiptsQuery, [
      materialCode,
      plantId,
      requirementDate
    ]);
    const plannedReceipts = parseFloat(plannedReceiptsResult.rows[0]?.planned_receipts || '0');

    // Get planned issues (stock movements scheduled before requirement date)
    const plannedIssuesQuery = `
      SELECT 
        COALESCE(SUM(sm.quantity), 0) as planned_issues
      FROM stock_movements sm
      WHERE sm.material_code = $1
        AND sm.plant_code = (SELECT code FROM plants WHERE id = $2)
        AND sm.movement_type IN ('261', '201', '202') -- GI to production, transfers out
        AND sm.posting_date <= $3
        AND sm.production_order_id IS NULL -- Not yet executed
    `;

    const plannedIssuesResult = await this.pool.query(plannedIssuesQuery, [
      materialCode,
      plantId,
      requirementDate
    ]);
    const plannedIssues = parseFloat(plannedIssuesResult.rows[0]?.planned_issues || '0');

    // Calculate net available
    const netAvailable = currentStock + plannedReceipts - reservedQuantity - plannedIssues;
    const availableQuantity = Math.max(0, netAvailable);
    const isAvailable = availableQuantity >= requiredQuantity;
    const shortageQuantity = isAvailable ? 0 : requiredQuantity - availableQuantity;

    // Determine available date if not immediately available
    let availableDate: Date | undefined = undefined;
    if (!isAvailable) {
      // Check future receipts that could fulfill the requirement
      const futureReceiptsQuery = `
        SELECT MIN(gr.receipt_date) as earliest_receipt_date
        FROM goods_receipts gr
        WHERE gr.material_code = $1
          AND gr.plant_id = $2
          AND gr.status IN ('PENDING', 'APPROVED')
          AND gr.receipt_date > $3
      `;

      const futureReceiptsResult = await this.pool.query(futureReceiptsQuery, [
        materialCode,
        plantId,
        requirementDate
      ]);

      if (futureReceiptsResult.rows[0]?.earliest_receipt_date) {
        availableDate = new Date(futureReceiptsResult.rows[0].earliest_receipt_date);
      }
    } else {
      availableDate = requirementDate;
    }

    return {
      isAvailable,
      availableQuantity,
      currentStock,
      reservedQuantity,
      availableDate,
      shortageQuantity,
      breakdown: {
        currentStock,
        reservedQuantity,
        plannedReceipts,
        plannedIssues,
        netAvailable
      }
    };
  }

  /**
   * Check ATP for multiple materials (BOM components)
   */
  async checkATPForBOM(
    bomId: number,
    plantId: number,
    requiredQuantity: number,
    requirementDate: Date
  ): Promise<{
    allAvailable: boolean;
    results: Array<{
      materialCode: string;
      materialId: number;
      requiredQuantity: number;
      atpResult: ATPCheckResult;
    }>;
    unavailableMaterials: Array<{
      materialCode: string;
      requiredQuantity: number;
      availableQuantity: number;
      shortageQuantity: number;
    }>;
  }> {
    // Get BOM components
    const bomItemsQuery = `
      SELECT 
        bi.material_id,
        m.code as material_code,
        bi.quantity as quantity_per_unit
      FROM bom_items bi
      JOIN materials m ON bi.material_id = m.id
      WHERE bi.bom_id = $1
    `;

    const bomItemsResult = await this.pool.query(bomItemsQuery, [bomId]);
    const bomItems = bomItemsResult.rows;

    const results = [];
    const unavailableMaterials = [];

    for (const item of bomItems) {
      const requiredQty = parseFloat(item.quantity_per_unit) * requiredQuantity;
      const atpResult = await this.checkATP({
        materialCode: item.material_code,
        materialId: item.material_id,
        plantId,
        requiredQuantity: requiredQty,
        requirementDate
      });

      results.push({
        materialCode: item.material_code,
        materialId: item.material_id,
        requiredQuantity: requiredQty,
        atpResult
      });

      if (!atpResult.isAvailable) {
        unavailableMaterials.push({
          materialCode: item.material_code,
          requiredQuantity: requiredQty,
          availableQuantity: atpResult.availableQuantity,
          shortageQuantity: atpResult.shortageQuantity
        });
      }
    }

    return {
      allAvailable: unavailableMaterials.length === 0,
      results,
      unavailableMaterials
    };
  }

  /**
   * Create ATP requirement record
   */
  async createATPRequirement(
    materialCode: string,
    materialId: number,
    plantId: number,
    requirementType: string,
    requirementReferenceId: number,
    requirementReferenceNumber: string,
    requiredQuantity: number,
    requirementDate: Date,
    priority: number = 0,
    createdBy?: number
  ): Promise<number> {
    const result = await this.pool.query(`
      INSERT INTO atp_requirements (
        material_code, material_id, plant_id, requirement_type,
        requirement_reference_id, requirement_reference_number,
        required_quantity, requirement_date, priority, status, created_by,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'PENDING', $10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING id
    `, [
      materialCode,
      materialId,
      plantId,
      requirementType,
      requirementReferenceId,
      requirementReferenceNumber,
      requiredQuantity,
      requirementDate,
      priority,
      createdBy || null
    ]);

    return result.rows[0].id;
  }
}

export const atpCheckService = new ATPCheckService();

