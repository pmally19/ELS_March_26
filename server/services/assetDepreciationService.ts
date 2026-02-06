import { pool } from '../db.js';

interface DepreciationParams {
    assetId: number;
    method: 'STRAIGHT_LINE' | 'DECLINING_BALANCE_200' | 'DECLINING_BALANCE_150' | 'UNITS_OF_PRODUCTION' | 'SUM_OF_YEARS_DIGITS';
    fiscalYear: number;
    fiscalPeriod: number;
    depreciationAreaId?: number;
}

interface Asset {
    id: number;
    asset_number: string;
    name: string;
    acquisition_cost: number;
    accumulated_depreciation: number;
    net_book_value: number;
    useful_life_years: number;
    residual_value: number;
    capitalization_date: Date;
    retirement_date?: Date;
    last_depreciation_date?: Date;
    last_depreciation_period?: number;
    last_depreciation_year?: number;
}

interface DepreciationResult {
    assetId: number;
    assetNumber: string;
    periodDepreciation: number;
    accumulatedDepreciation: number;
    newBookValue: number;
    method: string;
    fiscalYear: number;
    fiscalPeriod: number;
}

export class AssetDepreciationService {

    /**
     * Calculate straight-line depreciation
     * Formula: (Cost - Residual Value) / Useful Life / 12
     */
    private calculateStraightLine(asset: Asset, monthsInPeriod: number = 1): number {
        const depreciableAmount = asset.acquisition_cost - (asset.residual_value || 0);
        const totalMonths = asset.useful_life_years * 12;
        const monthlyDepreciation = depreciableAmount / totalMonths;

        return monthlyDepreciation * monthsInPeriod;
    }

    /**
     * Calculate declining balance depreciation (200% = double declining)
     * Formula: Book Value * (2 / Useful Life) / 12
     */
    private calculateDecliningBalance200(asset: Asset, monthsInPeriod: number = 1): number {
        const rate = 2 / asset.useful_life_years;
        const monthlyRate = rate / 12;
        const monthlyDepreciation = asset.net_book_value * monthlyRate;

        return monthlyDepreciation * monthsInPeriod;
    }

    /**
     * Calculate declining balance depreciation (150%)
     * Formula: Book Value * (1.5 / Useful Life) / 12
     */
    private calculateDecliningBalance150(asset: Asset, monthsInPeriod: number = 1): number {
        const rate = 1.5 / asset.useful_life_years;
        const monthlyRate = rate / 12;
        const monthlyDepreciation = asset.net_book_value * monthlyRate;

        return monthlyDepreciation * monthsInPeriod;
    }

    /**
     * Calculate sum of years digits depreciation
     * Formula: (Remaining Life / Sum of Digits) * Depreciable Amount / 12
     */
    private calculateSumOfYearsDigits(asset: Asset, monthsInPeriod: number = 1): number {
        const depreciableAmount = asset.acquisition_cost - (asset.residual_value || 0);
        const usefulLifeMonths = asset.useful_life_years * 12;
        const sumOfDigits = (usefulLifeMonths * (usefulLifeMonths + 1)) / 2;

        // Calculate months depreciated so far
        const monthsDepreciated = this.calculateMonthsDepreciated(asset);
        const remainingMonths = usefulLifeMonths - monthsDepreciated;

        const monthlyDepreciation = (remainingMonths / sumOfDigits) * depreciableAmount;

        return monthlyDepreciation * monthsInPeriod;
    }

    /**
     * Calculate months depreciated from capitalization to last depreciation
     */
    private calculateMonthsDepreciated(asset: Asset): number {
        if (!asset.capitalization_date) return 0;

        const capDate = new Date(asset.capitalization_date);
        const lastDepDate = asset.last_depreciation_date
            ? new Date(asset.last_depreciation_date)
            : capDate;

        const yearsDiff = lastDepDate.getFullYear() - capDate.getFullYear();
        const monthsDiff = lastDepDate.getMonth() - capDate.getMonth();

        return yearsDiff * 12 + monthsDiff;
    }

    /**
     * Calculate depreciation for a single asset
     */
    async calculateAssetDepreciation(params: DepreciationParams): Promise<DepreciationResult> {
        // Get asset details
        const assetResult = await pool.query(
            `SELECT 
        id, asset_number, name, acquisition_cost, 
        accumulated_depreciation, net_book_value,
        useful_life_years, residual_value,
        capitalization_date, retirement_date,
        last_depreciation_date, last_depreciation_period, last_depreciation_year
      FROM asset_master
      WHERE id = $1 AND is_active = true`,
            [params.assetId]
        );

        if (assetResult.rows.length === 0) {
            throw new Error(`Asset ${params.assetId} not found or inactive`);
        }

        const asset: Asset = assetResult.rows[0];

        // Validations
        if (asset.retirement_date) {
            throw new Error(`Asset ${asset.asset_number} is retired`);
        }

        if (!asset.capitalization_date) {
            throw new Error(`Asset ${asset.asset_number} has no capitalization date`);
        }

        if (!asset.useful_life_years || asset.useful_life_years <= 0) {
            throw new Error(`Asset ${asset.asset_number} has invalid useful life`);
        }

        // Check if already depreciated for this period
        if (asset.last_depreciation_year === params.fiscalYear &&
            asset.last_depreciation_period === params.fiscalPeriod) {
            throw new Error(`Asset ${asset.asset_number} already depreciated for period ${params.fiscalYear}-${params.fiscalPeriod}`);
        }

        // Calculate depreciation based on method
        let periodDepreciation = 0;
        const monthsInPeriod = 1; // Assuming monthly periods

        switch (params.method) {
            case 'STRAIGHT_LINE':
                periodDepreciation = this.calculateStraightLine(asset, monthsInPeriod);
                break;
            case 'DECLINING_BALANCE_200':
                periodDepreciation = this.calculateDecliningBalance200(asset, monthsInPeriod);
                break;
            case 'DECLINING_BALANCE_150':
                periodDepreciation = this.calculateDecliningBalance150(asset, monthsInPeriod);
                break;
            case 'SUM_OF_YEARS_DIGITS':
                periodDepreciation = this.calculateSumOfYearsDigits(asset, monthsInPeriod);
                break;
            default:
                throw new Error(`Unsupported depreciation method: ${params.method}`);
        }

        // Ensure depreciation doesn't exceed book value minus residual
        const maxDepreciation = asset.net_book_value - (asset.residual_value || 0);
        periodDepreciation = Math.min(periodDepreciation, maxDepreciation);
        periodDepreciation = Math.max(0, periodDepreciation); // Can't be negative

        // Round to 2 decimal places
        periodDepreciation = Math.round(periodDepreciation * 100) / 100;

        const newAccumulatedDepreciation = asset.accumulated_depreciation + periodDepreciation;
        const newBookValue = asset.acquisition_cost - newAccumulatedDepreciation;

        return {
            assetId: asset.id,
            assetNumber: asset.asset_number,
            periodDepreciation,
            accumulatedDepreciation: newAccumulatedDepreciation,
            newBookValue,
            method: params.method,
            fiscalYear: params.fiscalYear,
            fiscalPeriod: params.fiscalPeriod
        };
    }

    /**
     * Preview depreciation run for multiple assets
     */
    async previewDepreciationRun(params: {
        fiscalYear: number;
        fiscalPeriod: number;
        depreciationAreaId?: number;
        companyCodeId?: number;
    }): Promise<DepreciationResult[]> {

        // Get all eligible assets (excluding AUCs)
        let query = `
      SELECT 
        am.id, am.asset_number, am.name, am.acquisition_cost,
        am.accumulated_depreciation, am.net_book_value,
        am.useful_life_years, am.residual_value,
        am.capitalization_date, am.retirement_date,
        am.last_depreciation_date, am.last_depreciation_period, am.last_depreciation_year,
        dm.calculation_type as depreciation_method
      FROM asset_master am
      LEFT JOIN depreciation_methods dm ON am.depreciation_method = dm.code
      WHERE am.is_active = true
      AND am.retirement_date IS NULL
      AND am.capitalization_date IS NOT NULL
      AND am.useful_life_years > 0
      AND (am.is_auc IS NULL OR am.is_auc = false)
      AND (am.auc_status IS NULL OR am.auc_status = 'capitalized')
      AND (am.last_depreciation_year IS NULL 
           OR am.last_depreciation_year < $1
           OR (am.last_depreciation_year = $1 AND am.last_depreciation_period < $2))
    `;


        const queryParams: any[] = [params.fiscalYear, params.fiscalPeriod];
        let paramIndex = 3;

        if (params.companyCodeId) {
            query += ` AND am.company_code_id = $${paramIndex}`;
            queryParams.push(params.companyCodeId);
            paramIndex++;
        }

        if (params.depreciationAreaId) {
            query += ` AND am.depreciation_area_id = $${paramIndex}`;
            queryParams.push(params.depreciationAreaId);
        }

        const assetsResult = await pool.query(query, queryParams);
        const results: DepreciationResult[] = [];

        for (const asset of assetsResult.rows) {
            try {
                const method = this.mapDepreciationMethod(asset.depreciation_method);
                const result = await this.calculateAssetDepreciation({
                    assetId: asset.id,
                    method,
                    fiscalYear: params.fiscalYear,
                    fiscalPeriod: params.fiscalPeriod,
                    depreciationAreaId: params.depreciationAreaId
                });
                results.push(result);
            } catch (error: any) {
                console.error(`Error calculating depreciation for asset ${asset.asset_number}:`, error.message);
                // Continue with other assets
            }
        }

        return results;
    }

    /**
     * Map depreciation method string to enum
     */
    private mapDepreciationMethod(method: string): DepreciationParams['method'] {
        const upperMethod = (method || '').toUpperCase();
        if (upperMethod.includes('STRAIGHT')) return 'STRAIGHT_LINE';
        if (upperMethod.includes('200') || upperMethod.includes('DOUBLE')) return 'DECLINING_BALANCE_200';
        if (upperMethod.includes('150')) return 'DECLINING_BALANCE_150';
        if (upperMethod.includes('SUM')) return 'SUM_OF_YEARS_DIGITS';
        return 'STRAIGHT_LINE'; // Default
    }

    /**
     * Execute depreciation run and save results
     */
    async executeDepreciationRun(params: {
        fiscalYear: number;
        fiscalPeriod: number;
        depreciationAreaId?: number;
        companyCodeId?: number;
        testRun?: boolean;
    }): Promise<{
        runId?: number;
        status: 'completed' | 'failed';
        assetsProcessed: number;
        totalDepreciation: number;
        errors: string[];
    }> {

        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            // Preview calculations
            const preview = await this.previewDepreciationRun({
                fiscalYear: params.fiscalYear,
                fiscalPeriod: params.fiscalPeriod,
                depreciationAreaId: params.depreciationAreaId,
                companyCodeId: params.companyCodeId
            });

            if (params.testRun) {
                await client.query('ROLLBACK');
                return {
                    status: 'completed',
                    assetsProcessed: preview.length,
                    totalDepreciation: preview.reduce((sum, r) => sum + r.periodDepreciation, 0),
                    errors: []
                };
            }

            // Create depreciation run record
            const runResult = await client.query(
                `INSERT INTO asset_depreciation_runs (
          fiscal_year, fiscal_period, run_date, status,
          depreciation_area_id, company_code_id,
          assets_count, total_amount, created_at
        ) VALUES ($1, $2, NOW(), 'IN_PROGRESS', $3, $4, $5, $6, NOW())
        RETURNING id`,
                [
                    params.fiscalYear,
                    params.fiscalPeriod,
                    params.depreciationAreaId,
                    params.companyCodeId,
                    preview.length,
                    preview.reduce((sum, r) => sum + r.periodDepreciation, 0)
                ]
            );

            const runId = runResult.rows[0].id;
            const errors: string[] = [];

            // Post depreciation for each asset
            for (const result of preview) {
                try {
                    // Create depreciation posting
                    await client.query(
                        `INSERT INTO asset_depreciation_postings (
              asset_id, depreciation_run_id, fiscal_year, fiscal_period,
              posting_date, depreciation_amount, accumulated_depreciation,
              book_value, created_at
            ) VALUES ($1, $2, $3, $4, NOW(), $5, $6, $7, NOW())`,
                        [
                            result.assetId,
                            runId,
                            params.fiscalYear,
                            params.fiscalPeriod,
                            result.periodDepreciation,
                            result.accumulatedDepreciation,
                            result.newBookValue
                        ]
                    );

                    // Update asset master
                    await client.query(
                        `UPDATE asset_master
            SET accumulated_depreciation = $1,
                net_book_value = $2,
                last_depreciation_date = NOW(),
                last_depreciation_period = $3,
                last_depreciation_year = $4,
                updated_at = NOW()
            WHERE id = $5`,
                        [
                            result.accumulatedDepreciation,
                            result.newBookValue,
                            params.fiscalPeriod,
                            params.fiscalYear,
                            result.assetId
                        ]
                    );

                } catch (error: any) {
                    errors.push(`Asset ${result.assetNumber}: ${error.message}`);
                }
            }

            // Update run status
            await client.query(
                `UPDATE asset_depreciation_runs
        SET status = $1, completed_at = NOW()
        WHERE id = $2`,
                [errors.length > 0 ? 'COMPLETED_WITH_ERRORS' : 'COMPLETED', runId]
            );

            await client.query('COMMIT');

            return {
                runId,
                status: 'completed',
                assetsProcessed: preview.length - errors.length,
                totalDepreciation: preview.reduce((sum, r) => sum + r.periodDepreciation, 0),
                errors
            };

        } catch (error: any) {
            await client.query('ROLLBACK');
            console.error('Depreciation run failed:', error);
            return {
                status: 'failed',
                assetsProcessed: 0,
                totalDepreciation: 0,
                errors: [error.message]
            };
        } finally {
            client.release();
        }
    }
}

export const assetDepreciationService = new AssetDepreciationService();
