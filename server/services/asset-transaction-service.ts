import { getPool } from '../database';

export interface AssetTransactionParams {
  assetId: number;
  transactionType: 'ACQUISITION' | 'TRANSFER' | 'RETIREMENT' | 'DISPOSAL' | 'SALE' | 'CAPITALIZATION';
  transactionDate: Date;
  amount?: number;
  description?: string;
  fromCostCenterId?: number;
  toCostCenterId?: number;
  fromCompanyCodeId?: number;
  toCompanyCodeId?: number;
  fromLocation?: string;
  toLocation?: string;
  retirementMethod?: 'SALE' | 'SCRAPPING' | 'PARTIAL';
  retirementRevenue?: number;
  createdBy?: string;
}

export class AssetTransactionService {
  private pool = getPool();

  /**
   * Create an asset transaction
   */
  async createTransaction(params: AssetTransactionParams): Promise<number> {
    const {
      assetId,
      transactionType,
      transactionDate,
      amount,
      description,
      fromCostCenterId,
      toCostCenterId,
      fromCompanyCodeId,
      toCompanyCodeId,
      fromLocation,
      toLocation,
      retirementMethod,
      retirementRevenue,
      createdBy
    } = params;

    // Generate document number
    const docNumber = await this.generateDocumentNumber(transactionType, transactionDate);

    const result = await this.pool.query(`
      INSERT INTO asset_transactions (
        asset_id, transaction_type, transaction_date, document_number,
        amount, description, from_cost_center_id, to_cost_center_id,
        from_company_code_id, to_company_code_id, from_location, to_location,
        retirement_method, retirement_revenue, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING id
    `, [
      assetId,
      transactionType,
      transactionDate,
      docNumber,
      amount || null,
      description || null,
      fromCostCenterId || null,
      toCostCenterId || null,
      fromCompanyCodeId || null,
      toCompanyCodeId || null,
      fromLocation || null,
      toLocation || null,
      retirementMethod || null,
      retirementRevenue || null,
      createdBy || null
    ]);

    const transactionId = result.rows[0].id;

    // Update asset based on transaction type
    await this.updateAssetFromTransaction(assetId, transactionType, params);

    return transactionId;
  }

  /**
   * Update asset based on transaction
   */
  private async updateAssetFromTransaction(
    assetId: number,
    transactionType: string,
    params: AssetTransactionParams
  ): Promise<void> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    switch (transactionType) {
      case 'TRANSFER':
        if (params.toCostCenterId) {
          updates.push(`cost_center_id = $${paramIndex++}`);
          values.push(params.toCostCenterId);
        }
        if (params.toCompanyCodeId) {
          updates.push(`company_code_id = $${paramIndex++}`);
          values.push(params.toCompanyCodeId);
        }
        if (params.toLocation) {
          updates.push(`location = $${paramIndex++}`);
          values.push(params.toLocation);
        }
        break;

      case 'RETIREMENT':
      case 'DISPOSAL':
        updates.push(`status = $${paramIndex++}`);
        values.push('Retired');
        updates.push(`retirement_date = $${paramIndex++}`);
        values.push(params.transactionDate);
        if (params.retirementMethod) {
          updates.push(`retirement_method = $${paramIndex++}`);
          values.push(params.retirementMethod);
        }
        if (params.retirementRevenue !== undefined) {
          updates.push(`retirement_revenue = $${paramIndex++}`);
          values.push(params.retirementRevenue);
        }
        break;

      case 'CAPITALIZATION':
        updates.push(`capitalization_date = $${paramIndex++}`);
        values.push(params.transactionDate);
        updates.push(`status = $${paramIndex++}`);
        values.push('Active');
        break;
    }

    if (updates.length > 0) {
      updates.push(`updated_at = NOW()`);
      values.push(assetId);
      await this.pool.query(`
        UPDATE asset_master
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex}
      `, values);
    }
  }

  /**
   * Generate document number for transaction
   */
  private async generateDocumentNumber(
    transactionType: string,
    date: Date
  ): Promise<string> {
    const year = date.getFullYear();
    const prefix = transactionType.substring(0, 3).toUpperCase();
    
    const result = await this.pool.query(`
      SELECT COUNT(*) as count
      FROM asset_transactions
      WHERE document_number LIKE $1
    `, [`${prefix}-${year}-%`]);

    const count = parseInt(result.rows[0].count || '0') + 1;
    return `${prefix}-${year}-${count.toString().padStart(6, '0')}`;
  }

  /**
   * Get asset transaction history
   */
  async getTransactionHistory(assetId: number): Promise<any[]> {
    const result = await this.pool.query(`
      SELECT 
        at.*,
        cc1.code as from_cost_center_code,
        cc1.description as from_cost_center_name,
        cc2.code as to_cost_center_code,
        cc2.description as to_cost_center_name,
        comp1.code as from_company_code,
        comp1.name as from_company_name,
        comp2.code as to_company_code,
        comp2.name as to_company_name
      FROM asset_transactions at
      LEFT JOIN cost_centers cc1 ON at.from_cost_center_id = cc1.id
      LEFT JOIN cost_centers cc2 ON at.to_cost_center_id = cc2.id
      LEFT JOIN company_codes comp1 ON at.from_company_code_id = comp1.id
      LEFT JOIN company_codes comp2 ON at.to_company_code_id = comp2.id
      WHERE at.asset_id = $1
      ORDER BY at.transaction_date DESC, at.created_at DESC
    `, [assetId]);

    return result.rows;
  }
}

