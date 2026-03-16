import { getPool } from '../database';

export interface DepreciationCalculationParams {
  assetId: number;
  acquisitionCost: number;
  accumulatedDepreciation: number;
  usefulLifeYears: number;
  depreciationMethod: string;
  valueDate: Date;
  calculationDate: Date;
  fiscalYear: number;
  fiscalPeriod: number;
}

export interface DepreciationResult {
  depreciationAmount: number;
  accumulatedDepreciation: number;
  netBookValue: number;
  proratedDays?: number;
  proratedFactor?: number;
}

export class AssetDepreciationService {
  private pool = getPool();

  /**
   * Calculate depreciation for an asset
   */
  async calculateDepreciation(params: DepreciationCalculationParams): Promise<DepreciationResult> {
    const {
      assetId,
      acquisitionCost,
      accumulatedDepreciation,
      usefulLifeYears,
      depreciationMethod,
      valueDate,
      calculationDate,
      fiscalYear,
      fiscalPeriod
    } = params;

    // Get depreciation method details
    const methodResult = await this.pool.query(`
      SELECT * FROM depreciation_methods 
      WHERE code = $1 OR name = $1 
      LIMIT 1
    `, [depreciationMethod]);

    if (methodResult.rows.length === 0) {
      throw new Error(`Depreciation method not found: ${depreciationMethod}`);
    }

    const method = methodResult.rows[0];
    const methodType = method.type || method.method_type || method.calculation_type;
    
    if (!methodType) {
      throw new Error(`Depreciation method ${depreciationMethod} does not have a calculation type defined.`);
    }

    let depreciationAmount = 0;
    let proratedDays = 0;
    let proratedFactor = 1;

    // Calculate annual depreciation
    switch (methodType.toUpperCase()) {
      case 'STRAIGHT_LINE':
      case 'STL':
        depreciationAmount = acquisitionCost / usefulLifeYears;
        break;

      case 'DECLINING_BALANCE':
      case 'DB':
        // Get rate from database - use depreciation_rate column
        const rate = method.depreciation_rate || method.rate || null;
        if (!rate) {
          throw new Error(`Depreciation rate not configured for declining balance method: ${depreciationMethod}`);
        }
        const remainingValue = acquisitionCost - accumulatedDepreciation;
        depreciationAmount = remainingValue * (parseFloat(rate) / 100);
        // Don't depreciate below salvage/residual value
        const residualValuePercent = method.residual_value_percent || method.salvage_value || 0;
        const salvageValue = acquisitionCost * (parseFloat(residualValuePercent) / 100);
        const minValue = Math.max(salvageValue, remainingValue - depreciationAmount);
        depreciationAmount = remainingValue - minValue;
        break;

      case 'SUM_OF_YEARS_DIGITS':
      case 'SYD':
      case 'SUM_OF_YEARS':
        const remainingLife = usefulLifeYears - (accumulatedDepreciation / (acquisitionCost / usefulLifeYears));
        const sumOfYears = (usefulLifeYears * (usefulLifeYears + 1)) / 2;
        const remainingYears = Math.max(1, Math.floor(remainingLife));
        const fraction = remainingYears / sumOfYears;
        const residualPercent = method.residual_value_percent || 0;
        const residualVal = acquisitionCost * (parseFloat(residualPercent) / 100);
        depreciationAmount = (acquisitionCost - residualVal) * fraction;
        break;

      case 'UNITS_OF_PRODUCTION':
      case 'UOP':
        // For UOP, we need production/usage data - simplified to annual for now
        depreciationAmount = acquisitionCost / usefulLifeYears;
        break;

      default:
        // If method type is not recognized, throw error instead of defaulting
        throw new Error(`Unsupported depreciation method type: ${methodType}. Supported types: STRAIGHT_LINE, DECLINING_BALANCE, SUM_OF_YEARS_DIGITS, UNITS_OF_PRODUCTION`);
    }

    // Calculate prorated depreciation for partial periods
    if (valueDate && calculationDate) {
      const valueDateObj = new Date(valueDate);
      const calcDateObj = new Date(calculationDate);
      
      // If asset was acquired in the middle of the period, prorate
      const yearStart = new Date(fiscalYear, 0, 1);
      const periodStart = new Date(fiscalYear, fiscalPeriod - 1, 1);
      const periodEnd = new Date(fiscalYear, fiscalPeriod, 0);
      
      // If value date is in the future relative to the period, use period start
      // This handles cases where value_date is set incorrectly or is a future date
      const effectiveValueDate = valueDateObj > periodEnd ? periodStart : valueDateObj;
      
      // Use the later of: effective value date or period start
      let startDate = effectiveValueDate > periodStart ? effectiveValueDate : periodStart;
      
      // Use the earlier of: calculation date or period end
      let endDate = calcDateObj < periodEnd ? calcDateObj : periodEnd;
      
      // Ensure startDate is not after endDate (shouldn't happen, but safety check)
      if (startDate > endDate) {
        console.warn(`Warning: Start date (${startDate}) is after end date (${endDate}) for asset ${assetId}. Using full period.`);
        startDate = periodStart;
        endDate = periodEnd;
      }
      
      const daysInPeriod = Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      proratedDays = Math.max(0, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1);
      proratedFactor = proratedDays / daysInPeriod;
      
      // Ensure prorated factor is between 0 and 1
      proratedFactor = Math.max(0, Math.min(1, proratedFactor));
      
      depreciationAmount = depreciationAmount * proratedFactor;
    }

    // Ensure depreciation doesn't exceed remaining value
    const remainingValue = acquisitionCost - accumulatedDepreciation;
    depreciationAmount = Math.min(depreciationAmount, remainingValue);
    depreciationAmount = Math.max(0, depreciationAmount); // Can't be negative

    const newAccumulatedDepreciation = accumulatedDepreciation + depreciationAmount;
    const netBookValue = acquisitionCost - newAccumulatedDepreciation;

    return {
      depreciationAmount: Math.round(depreciationAmount * 100) / 100,
      accumulatedDepreciation: Math.round(newAccumulatedDepreciation * 100) / 100,
      netBookValue: Math.round(netBookValue * 100) / 100,
      proratedDays,
      proratedFactor
    };
  }

  /**
   * Check if depreciation has already been posted for a period
   */
  async isDepreciationPosted(
    assetId: number,
    fiscalYear: number,
    fiscalPeriod: number
  ): Promise<boolean> {
    const result = await this.pool.query(`
      SELECT id FROM asset_depreciation_postings
      WHERE asset_id = $1 
        AND fiscal_year = $2 
        AND fiscal_period = $3
      LIMIT 1
    `, [assetId, fiscalYear, fiscalPeriod]);

    return result.rows.length > 0;
  }

  /**
   * Get last depreciation date for an asset
   */
  async getLastDepreciationDate(assetId: number): Promise<Date | null> {
    const result = await this.pool.query(`
      SELECT MAX(created_at) as last_date
      FROM asset_depreciation_postings
      WHERE asset_id = $1
    `, [assetId]);

    if (result.rows[0]?.last_date) {
      return new Date(result.rows[0].last_date);
    }
    return null;
  }
}

