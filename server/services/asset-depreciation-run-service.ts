import { getPool } from '../database';
import { AssetDepreciationService, DepreciationCalculationParams } from './asset-depreciation-service';
import { AssetGLPostingService } from './asset-gl-posting-service';

export interface DepreciationRunParams {
  fiscalYear: number;
  fiscalPeriod: number;
  depreciationAreaId?: number;
  companyCodeId?: number;
  runBy?: string;
  postToGL?: boolean;
}

export class AssetDepreciationRunService {
  private pool = getPool();
  private depreciationService = new AssetDepreciationService();
  private glPostingService = new AssetGLPostingService();

  /**
   * Run depreciation for all eligible assets
   */
  async runDepreciation(params: DepreciationRunParams): Promise<{
    runId: number;
    runNumber: string;
    assetsProcessed: number;
    totalDepreciation: number;
    glDocumentNumber?: string;
  }> {
    const {
      fiscalYear,
      fiscalPeriod,
      depreciationAreaId,
      companyCodeId,
      runBy,
      postToGL = true
    } = params;

    // Generate run number
    const runNumber = await this.generateRunNumber(fiscalYear, fiscalPeriod);

    // Create depreciation run record
    const runResult = await this.pool.query(`
      INSERT INTO asset_depreciation_runs (
        run_number, run_date, fiscal_year, fiscal_period,
        depreciation_area_id, company_code_id, status, run_by, started_at
      )
      VALUES ($1, CURRENT_DATE, $2, $3, $4, $5, 'RUNNING', $6, NOW())
      RETURNING id
    `, [runNumber, fiscalYear, fiscalPeriod, depreciationAreaId || null, companyCodeId || null, runBy || null]);

    const runId = runResult.rows[0].id;

    try {
      // Validate fiscal year and period
      if (fiscalPeriod < 1 || fiscalPeriod > 12) {
        await this.pool.query(`
          UPDATE asset_depreciation_runs
          SET 
            status = 'FAILED',
            error_message = $1,
            completed_at = NOW()
          WHERE id = $2
        `, [`Invalid fiscal period: ${fiscalPeriod}. Period must be between 1 and 12.`, runId]);
        throw new Error(`Invalid fiscal period: ${fiscalPeriod}. Period must be between 1 and 12.`);
      }

      // Validate fiscal year variant if company code is provided
      if (companyCodeId) {
        const companyCodeCheck = await this.pool.query(`
          SELECT cc.id, cc.fiscal_year_variant_id, fyv.posting_periods
          FROM company_codes cc
          LEFT JOIN fiscal_year_variants fyv ON cc.fiscal_year_variant_id = fyv.id
          WHERE cc.id = $1
        `, [companyCodeId]);

        if (companyCodeCheck.rows.length > 0) {
          const company = companyCodeCheck.rows[0];
          if (company.fiscal_year_variant_id && company.posting_periods) {
            if (fiscalPeriod > company.posting_periods) {
              await this.pool.query(`
                UPDATE asset_depreciation_runs
                SET 
                  status = 'FAILED',
                  error_message = $1,
                  completed_at = NOW()
                WHERE id = $2
              `, [`Invalid fiscal period: ${fiscalPeriod}. Maximum period for this fiscal year variant is ${company.posting_periods}.`, runId]);
              throw new Error(`Invalid fiscal period: ${fiscalPeriod}. Maximum period for this fiscal year variant is ${company.posting_periods}.`);
            }
          }
        }
      }

      // Validate posting period control if posting to GL
      if (postToGL && companyCodeId) {
        const periodControlCheck = await this.pool.query(`
          SELECT 
            posting_status,
            allow_posting,
            allow_adjustments,
            control_reason
          FROM posting_period_controls
          WHERE company_code_id = $1
            AND fiscal_year = $2
            AND period_from <= $3
            AND period_to >= $3
            AND is_active = true
          ORDER BY period_from DESC
          LIMIT 1
        `, [companyCodeId, fiscalYear, fiscalPeriod]);

        if (periodControlCheck.rows.length > 0) {
          const control = periodControlCheck.rows[0];
          if (control.posting_status !== 'OPEN' || !control.allow_posting) {
            await this.pool.query(`
              UPDATE asset_depreciation_runs
              SET 
                status = 'FAILED',
                error_message = $1,
                completed_at = NOW()
              WHERE id = $2
            `, [
              `Posting period is ${control.posting_status}. Posting not allowed. ${control.control_reason || ''}`,
              runId
            ]);
            throw new Error(
              `Posting period ${fiscalPeriod} for fiscal year ${fiscalYear} is ${control.posting_status}. ` +
              `Posting not allowed. ${control.control_reason || 'Period is closed or locked.'}`
            );
          }
        }
      }

      // Get eligible assets from asset_depreciation_area_assignments
      // This enables multi-area depreciation (Book, Tax, IFRS, etc.)
      const assetsResult = await this.pool.query(`
        SELECT 
          am.*,
          adaa.depreciation_area_id,
          adaa.depreciation_method_code as area_depreciation_method,
          adaa.useful_life_years as area_useful_life_years,
          adaa.acquisition_cost as area_acquisition_cost,
          adaa.accumulated_depreciation as area_accumulated_depreciation,
          adaa.net_book_value as area_net_book_value,
          adaa.last_depreciation_year as area_last_dep_year,
          adaa.last_depreciation_period as area_last_dep_period,
          adaa.post_to_gl,
          da.posting_indicator,
          da.name as area_name,
          ac.default_depreciation_method,
          ac.default_useful_life_years
        FROM asset_depreciation_area_assignments adaa
        INNER JOIN asset_master am ON adaa.asset_id = am.id
        LEFT JOIN asset_classes ac ON am.asset_class_id = ac.id
        LEFT JOIN depreciation_areas da ON adaa.depreciation_area_id = da.id
        WHERE am.is_active = true
          AND adaa.is_active = true
          AND UPPER(TRIM(am.status)) = 'ACTIVE'
          AND adaa.acquisition_cost > 0
          AND adaa.useful_life_years > 0
          AND (am.company_code_id = $1 OR $1 IS NULL)
          AND (adaa.depreciation_area_id = $4 OR $4 IS NULL)
          AND (
            adaa.last_depreciation_year IS NULL 
            OR adaa.last_depreciation_year < $2
            OR (adaa.last_depreciation_year = $2 AND adaa.last_depreciation_period < $3)
          )
        ORDER BY am.id, adaa.depreciation_area_id
      `, [companyCodeId, fiscalYear, fiscalPeriod, depreciationAreaId]);

      const assets = assetsResult.rows;
      let totalDepreciation = 0;
      let assetsProcessed = 0;
      const glEntries: Array<{ assetId: number; amount: number }> = [];

      // Process each asset (now including area-specific assignments)
      for (const asset of assets) {
        try {
          // Check if already posted for this specific area
          const alreadyPosted = await this.depreciationService.isDepreciationPosted(
            asset.id,
            fiscalYear,
            fiscalPeriod
          );

          if (alreadyPosted) {
            continue;
          }

          // Use area-specific values (from asset_depreciation_area_assignments)
          const acquisitionCost = parseFloat(asset.area_acquisition_cost || asset.acquisition_cost || 0);
          const accumulatedDepreciation = parseFloat(asset.area_accumulated_depreciation || asset.accumulated_depreciation || 0);

          // Get useful life from area assignment first, then asset class default
          const usefulLifeYears = asset.area_useful_life_years || asset.useful_life_years || asset.default_useful_life_years;
          if (!usefulLifeYears || usefulLifeYears <= 0) {
            console.error(`Asset ${asset.id} area ${asset.depreciation_area_id} has invalid useful life. Skipping.`);
            continue;
          }

          // Get depreciation method from area assignment first, then asset master, then asset class default
          const depreciationMethod = asset.area_depreciation_method || asset.depreciation_method || asset.default_depreciation_method;
          if (!depreciationMethod) {
            console.error(`Asset ${asset.id} area ${asset.depreciation_area_id} has no depreciation method defined. Skipping.`);
            continue;
          }

          const valueDate = asset.value_date || asset.acquisition_date || asset.capitalization_date || new Date();

          // Calculate depreciation
          const calculationParams: DepreciationCalculationParams = {
            assetId: asset.id,
            acquisitionCost,
            accumulatedDepreciation,
            usefulLifeYears,
            depreciationMethod,
            valueDate: new Date(valueDate),
            calculationDate: new Date(),
            fiscalYear,
            fiscalPeriod
          };

          const depreciationResult = await this.depreciationService.calculateDepreciation(calculationParams);

          if (depreciationResult.depreciationAmount > 0) {
            // Create depreciation posting record
            await this.pool.query(`
              INSERT INTO asset_depreciation_postings (
                depreciation_run_id, asset_id, fiscal_year, fiscal_period,
                depreciation_amount, accumulated_depreciation_before,
                accumulated_depreciation_after, net_book_value_before, net_book_value_after
              )
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            `, [
              runId,
              asset.id,
              fiscalYear,
              fiscalPeriod,
              depreciationResult.depreciationAmount,
              accumulatedDepreciation,
              depreciationResult.accumulatedDepreciation,
              acquisitionCost - accumulatedDepreciation,
              depreciationResult.netBookValue
            ]);

            // Update asset
            await this.pool.query(`
              UPDATE asset_master
              SET 
                accumulated_depreciation = $1,
                net_book_value = $2,
                current_value = $2,
                last_depreciation_date = CURRENT_DATE,
                last_depreciation_period = $3,
                last_depreciation_year = $4,
                updated_at = NOW()
              WHERE id = $5
            `, [
              depreciationResult.accumulatedDepreciation,
              depreciationResult.netBookValue,
              fiscalPeriod,
              fiscalYear,
              asset.id
            ]);

            totalDepreciation += depreciationResult.depreciationAmount;
            assetsProcessed++;
            glEntries.push({ assetId: asset.id, amount: depreciationResult.depreciationAmount });
          }
        } catch (assetError: any) {
          console.error(`Error processing asset ${asset.id}:`, assetError.message);
          // Continue with next asset
        }
      }

      // Post to GL if requested
      let glDocumentNumber: string | undefined;
      if (postToGL && glEntries.length > 0) {
        try {
          // Generate GL document number
          const glDocNumber = `DEP-${fiscalYear}-${fiscalPeriod.toString().padStart(2, '0')}-${runNumber}`;

          // Post each asset's depreciation to GL with area-specific accounts
          for (const entry of glEntries) {
            // Find the asset to get its area_id
            const assetEntry = assets.find(a => a.id === entry.assetId);

            await this.glPostingService.postDepreciation({
              assetId: entry.assetId,
              transactionType: 'DEPRECIATION',
              amount: entry.amount,
              documentNumber: glDocNumber,
              postingDate: new Date(),
              fiscalYear,
              fiscalPeriod,
              description: `Depreciation run ${runNumber} - Area: ${assetEntry?.area_name || 'N/A'}`,
              depreciationAreaId: assetEntry?.depreciation_area_id // CRITICAL: Pass area ID for account determination
            });
          }

          glDocumentNumber = glDocNumber;

          // Update run with GL document
          await this.pool.query(`
            UPDATE asset_depreciation_runs
            SET gl_document_number = $1, posted_to_gl = true
            WHERE id = $2
          `, [glDocumentNumber, runId]);
        } catch (glError: any) {
          console.error('Error posting to GL:', glError.message);
          console.error('GL posting error details:', glError);
          // Update run with error message and set posted_to_gl to false
          await this.pool.query(`
            UPDATE asset_depreciation_runs
            SET error_message = $1, posted_to_gl = false
            WHERE id = $2
          `, [`GL posting failed: ${glError.message}`, runId]);
        }
      }

      // Update run status
      await this.pool.query(`
        UPDATE asset_depreciation_runs
        SET 
          status = 'COMPLETED',
          total_assets_processed = $1,
          total_depreciation_amount = $2,
          completed_at = NOW()
        WHERE id = $3
      `, [assetsProcessed, totalDepreciation, runId]);

      return {
        runId,
        runNumber,
        assetsProcessed,
        totalDepreciation,
        glDocumentNumber
      };
    } catch (error: any) {
      // Update run status to failed
      await this.pool.query(`
        UPDATE asset_depreciation_runs
        SET 
          status = 'FAILED',
          error_message = $1,
          completed_at = NOW()
        WHERE id = $2
      `, [error.message, runId]);
      throw error;
    }
  }

  /**
   * Generate unique run number
   */
  private async generateRunNumber(fiscalYear: number, fiscalPeriod: number): Promise<string> {
    const prefix = `DEP-${fiscalYear}-${fiscalPeriod.toString().padStart(2, '0')}`;

    const result = await this.pool.query(`
      SELECT COUNT(*) as count
      FROM asset_depreciation_runs
      WHERE run_number LIKE $1
    `, [`${prefix}-%`]);

    const count = parseInt(result.rows[0].count || '0') + 1;
    return `${prefix}-${count.toString().padStart(4, '0')}`;
  }

  /**
   * Get depreciation run history
   */
  async getDepreciationRuns(limit: number = 50): Promise<any[]> {
    const result = await this.pool.query(`
      SELECT 
        dr.*,
        COALESCE(da.name, da.code) as depreciation_area_name,
        cc.code as company_code,
        cc.name as company_name
      FROM asset_depreciation_runs dr
      LEFT JOIN depreciation_areas da ON dr.depreciation_area_id = da.id
      LEFT JOIN company_codes cc ON dr.company_code_id = cc.id
      ORDER BY dr.run_date DESC, dr.created_at DESC
      LIMIT $1
    `, [limit]);

    return result.rows;
  }

  /**
   * Get depreciation run details
   */
  async getDepreciationRunDetails(runId: number): Promise<any> {
    const runResult = await this.pool.query(`
      SELECT 
        dr.*,
        COALESCE(da.name, da.code) as depreciation_area_name,
        cc.code as company_code,
        cc.name as company_name
      FROM asset_depreciation_runs dr
      LEFT JOIN depreciation_areas da ON dr.depreciation_area_id = da.id
      LEFT JOIN company_codes cc ON dr.company_code_id = cc.id
      WHERE dr.id = $1
    `, [runId]);

    if (runResult.rows.length === 0) {
      throw new Error(`Depreciation run not found: ${runId}`);
    }

    const run = runResult.rows[0];

    // Get postings for this run
    const postingsResult = await this.pool.query(`
      SELECT 
        adp.*,
        am.asset_number,
        am.name as asset_name
      FROM asset_depreciation_postings adp
      JOIN asset_master am ON adp.asset_id = am.id
      WHERE adp.depreciation_run_id = $1
      ORDER BY adp.asset_id
    `, [runId]);

    return {
      ...run,
      postings: postingsResult.rows
    };
  }
}

