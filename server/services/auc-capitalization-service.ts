import { getPool } from '../database';
import { AUCGLPostingService } from './auc-gl-posting-service';

export interface CapitalizeAUCParams {
  aucId: number;
  assetNumber?: string;
  assetDescription?: string;
  capitalizationDate: Date;
  depreciationStartDate?: Date;
  userId: number;
  settlementProfile?: string;
  settlementAmount?: number;
  costCenterCode?: string;
  assetClassId?: number;
  depreciationMethodId?: number;
}

export interface CapitalizationResult {
  success: boolean;
  fixedAssetId: number;
  assetNumber: string;
  totalCost: number;
  documentNumber: string;
  message: string;
}

/**
 * AUC Capitalization Service
 * Handles the conversion of AUC to Fixed Assets
 */
export class AUCCapitalizationService {
  private pool = getPool();
  private glPostingService = new AUCGLPostingService();

  /**
   * Capitalize an AUC to a Fixed Asset
   * This includes:
   * 1. Calculating total costs
   * 2. Creating a new fixed asset
   * 3. Settling all unsettled costs
   * 4. Posting GL entries
   * 5. Updating AUC status
   */
  async capitalizeAUC(params: CapitalizeAUCParams): Promise<CapitalizationResult> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // 1. Get AUC details and validate
      const aucResult = await client.query(`
        SELECT 
          am.*,
          dm.code as depreciation_key,
          ac.default_useful_life_years as useful_life_years
        FROM auc_master am
        JOIN asset_classes ac ON am.asset_class_id = ac.id
        LEFT JOIN depreciation_methods dm ON ac.depreciation_method_id = dm.id
        WHERE am.id = $1
      `, [params.aucId]);

      if (aucResult.rows.length === 0) {
        throw new Error(`AUC not found or is not an AUC: ${params.aucId}`);
      }

      const auc = aucResult.rows[0];

      if (auc.auc_status !== 'in_progress') {
        throw new Error(`AUC cannot be capitalized. Current status: ${auc.auc_status}`);
      }

      // 2. Calculate total costs from cost tracking
      const costResult = await client.query(`
        SELECT 
          COALESCE(SUM(amount), 0) as total_cost,
          COUNT(*) as cost_count,
          COUNT(*) FILTER (WHERE is_settled = false) as unsettled_count
        FROM auc_cost_tracking
        WHERE auc_asset_id = $1 AND is_settled = false
      `, [params.aucId]);

      const totalCost = parseFloat(costResult.rows[0].total_cost);
      const unsettledCount = parseInt(costResult.rows[0].unsettled_count);

      if (totalCost === 0) {
        throw new Error('Cannot capitalize AUC with zero cost');
      }

      // 3. Determine Asset Class and Depreciation Key
      const targetAssetClassId = params.assetClassId || auc.asset_class_id;
      let targetDepreciationKey = auc.depreciation_key;
      let targetUsefulLifeYears = auc.useful_life_years;

      if (params.depreciationMethodId) {
        const depMethodResult = await client.query(
          'SELECT code, useful_life_years FROM depreciation_methods WHERE id = $1',
          [params.depreciationMethodId]
        );
        if (depMethodResult.rows.length > 0) {
          targetDepreciationKey = depMethodResult.rows[0].code;
          if (depMethodResult.rows[0].useful_life_years) {
            targetUsefulLifeYears = depMethodResult.rows[0].useful_life_years;
          }
        }
      } else if (targetAssetClassId !== auc.asset_class_id) {
        const newClassResult = await client.query(
          'SELECT depreciation_key, default_useful_life_years FROM asset_classes WHERE id = $1',
          [targetAssetClassId]
        );
        if (newClassResult.rows.length > 0) {
          targetDepreciationKey = newClassResult.rows[0].depreciation_key;
          if (newClassResult.rows[0].default_useful_life_years) {
            targetUsefulLifeYears = newClassResult.rows[0].default_useful_life_years;
          }
        }
      }

      // 4. Generate asset number if not provided (Using TARGET Asset Class)
      const assetNumber = params.assetNumber || await this.generateAssetNumber(
        auc.company_code_id,
        targetAssetClassId,
        client
      );

      // 5. Create Fixed Asset
      const fixedAssetResult = await client.query(`
        INSERT INTO asset_master (
          asset_number,
          name,
          asset_class_id,
          company_code_id,
          cost_center_id,
          plant_id,
          acquisition_date,
          acquisition_cost,
          depreciation_start_date,
          useful_life_years,
          depreciation_method,
          status,
          is_auc,
          parent_asset_id,
          created_by,
          created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'active', false, $12, $13, NOW())
        RETURNING id, asset_number
      `, [
        assetNumber,
        params.assetDescription || auc.name,
        targetAssetClassId,
        auc.company_code_id,
        auc.cost_center_id,
        auc.plant_id,
        params.capitalizationDate,
        totalCost,
        params.depreciationStartDate || params.capitalizationDate,
        targetUsefulLifeYears,
        targetDepreciationKey,
        params.aucId, // Set parent_asset_id to link to AUC
        params.userId
      ]);

      const fixedAsset = fixedAssetResult.rows[0];

      // 5. Generate document number for capitalization
      const documentNumber = await this.generateDocumentNumber('CAP', client);

      // 6. Post GL entries for capitalization
      await this.glPostingService.postCapitalization({
        aucId: params.aucId,
        fixedAssetId: fixedAsset.id,
        amount: totalCost,
        wipAccountCode: auc.wip_account_code,
        postingDate: params.capitalizationDate,
        documentNumber
      }, client);

      // 7. Mark all costs as settled
      await client.query(`
        UPDATE auc_cost_tracking
        SET 
          is_settled = true,
          settlement_date = $1,
          settled_asset_id = $2,
          settlement_document_number = $3,
          updated_at = NOW()
        WHERE auc_asset_id = $4 AND is_settled = false
      `, [params.capitalizationDate, fixedAsset.id, documentNumber, params.aucId]);

      // 8. Create asset transaction record
      await client.query(`
        INSERT INTO asset_transactions (
          asset_id,
          transaction_type,
          transaction_date,
          amount,
          document_number,
          description,
          fiscal_year,
          fiscal_period,
          created_by,
          created_at
        )
        VALUES ($1, 'acquisition', $2, $3, $4, $5, $6, $7, $8, NOW())
      `, [
        fixedAsset.id,
        params.capitalizationDate,
        totalCost,
        documentNumber,
        `Capitalized from AUC ${auc.asset_number}`,
        params.capitalizationDate.getFullYear(),
        params.capitalizationDate.getMonth() + 1,
        params.userId
      ]);

      // 9. Update AUC status
      await client.query(`
        UPDATE auc_master
        SET 
          auc_status = 'capitalized',
          actual_capitalization_date = $1,
          parent_asset_id = $2,
          updated_at = NOW()
        WHERE id = $3
      `, [params.capitalizationDate, fixedAsset.id, params.aucId]);

      await client.query('COMMIT');

      return {
        success: true,
        fixedAssetId: fixedAsset.id,
        assetNumber: fixedAsset.asset_number,
        totalCost,
        documentNumber,
        message: `Successfully capitalized AUC to Fixed Asset ${fixedAsset.asset_number}. Total cost: ${totalCost}, Costs settled: ${unsettledCount}`
      };

    } catch (error: any) {
      await client.query('ROLLBACK');
      throw new Error(`Capitalization failed: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Perform partial settlement of AUC costs to cost center or project
   */
  async settleAUCCosts(
    aucId: number,
    amount: number,
    receiverCostCenter: string,
    postingDate: Date,
    userId: number,
    description?: string
  ): Promise<string> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Get AUC details
      const aucResult = await client.query(`
        SELECT wip_account_code, company_code_id
        FROM asset_master
        WHERE id = $1 AND is_auc = true
      `, [aucId]);

      if (aucResult.rows.length === 0) {
        throw new Error(`AUC not found: ${aucId}`);
      }

      const auc = aucResult.rows[0];

      // Get receiver account code (cost center account)
      const receiverAccount = await this.getCostCenterAccount(receiverCostCenter, client);

      // Generate document number
      const documentNumber = await this.generateDocumentNumber('SETTLE', client);

      // Post settlement GL entries
      await this.glPostingService.postSettlement({
        aucId,
        amount,
        wipAccountCode: auc.wip_account_code,
        receiverAccountCode: receiverAccount,
        postingDate,
        fiscalYear: postingDate.getFullYear(),
        fiscalPeriod: postingDate.getMonth() + 1,
        description: description || `Partial settlement from AUC ${aucId}`,
        documentNumber
      }, client);

      // Record settlement in cost tracking
      await client.query(`
        INSERT INTO auc_cost_tracking (
          auc_asset_id,
          cost_type,
          cost_element_code,
          amount,
          posting_date,
          document_number,
          description,
          is_settled,
          settlement_date,
          settlement_document_number,
          cost_center_code,
          created_by
        )
        VALUES ($1, 'settlement', 'SETTLE', $2, $3, $4, $5, true, $3, $4, $6, $7)
      `, [
        aucId,
        -amount, // Negative to show cost reduction
        postingDate,
        documentNumber,
        description || `Partial settlement to ${receiverCostCenter}`,
        receiverCostCenter,
        userId
      ]);

      await client.query('COMMIT');
      return documentNumber;

    } catch (error: any) {
      await client.query('ROLLBACK');
      throw new Error(`Settlement failed: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Abandon an AUC (write off costs)
   */
  async abandonAUC(aucId: number, reason: string, userId: number): Promise<void> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Update AUC status
      await client.query(`
        UPDATE asset_master
        SET 
          auc_status = 'abandoned',
          status = 'inactive',
          updated_at = NOW()
        WHERE id = $1 AND is_auc = true
      `, [aucId]);

      // Mark all costs as settled (written off)
      await client.query(`
        UPDATE auc_cost_tracking
        SET 
          is_settled = true,
          settlement_date = NOW(),
          settlement_document_number = 'ABANDONED',
          description = CONCAT(COALESCE(description, ''), ' - Abandoned: ', $1),
          updated_at = NOW()
        WHERE auc_asset_id = $2 AND is_settled = false
      `, [reason, aucId]);

      await client.query('COMMIT');

    } catch (error: any) {
      await client.query('ROLLBACK');
      throw new Error(`Abandon AUC failed: ${error.message}`);
    } finally {
      client.release();
    }
  }

  /**
   * Generate asset number
   */
  private async generateAssetNumber(
    companyCodeId: number,
    assetClassId: number,
    client: any
  ): Promise<string> {
    // Get company code
    const companyResult = await client.query(`
      SELECT code FROM company_codes WHERE id = $1
    `, [companyCodeId]);

    const companyCode = companyResult.rows[0].code;

    // Get asset class code
    const classResult = await client.query(`
      SELECT code FROM asset_classes WHERE id = $1
    `, [assetClassId]);

    const classCode = classResult.rows[0].code;

    // Get next sequence number
    const seqResult = await client.query(`
      SELECT COUNT(*) + 1 as next_num
      FROM asset_master
      WHERE company_code_id = $1 AND asset_class_id = $2
    `, [companyCodeId, assetClassId]);

    const nextNum = seqResult.rows[0].next_num;

    return `${companyCode}-${classCode}-${String(nextNum).padStart(6, '0')}`;
  }

  /**
   * Generate document number
   */
  private async generateDocumentNumber(prefix: string, client: any): Promise<string> {
    const year = new Date().getFullYear();
    const result = await client.query(`
      SELECT COUNT(*) + 1 as next_num
      FROM gl_entries
      WHERE document_number LIKE $1
    `, [`${prefix}-${year}%`]);

    const nextNum = result.rows[0].next_num;
    return `${prefix}-${year}-${String(nextNum).padStart(6, '0')}`;
  }

  /**
   * Get cost center GL account
   */
  private async getCostCenterAccount(costCenterCode: string, client: any): Promise<string> {
    const result = await client.query(`
      SELECT default_account_code
      FROM cost_centers
      WHERE cost_center_code = $1
    `, [costCenterCode]);

    if (result.rows.length === 0) {
      throw new Error(`Cost center not found: ${costCenterCode}`);
    }

    return result.rows[0].default_account_code;
  }
}
