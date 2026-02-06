/**
 * INVENTORY ANALYTICS ENGINE
 * Real-time KPIs, demand forecasting, and automatic reorder point calculations
 */

import { db } from "../db";

export interface InventoryKPI {
  totalInventoryValue: number;
  turnoverRatio: number;
  daysOfSupply: number;
  stockoutRisk: number;
  accuracyPercentage: number;
  slowMovingValue: number;
  excessInventoryValue: number;
}

export interface DemandForecast {
  materialCode: string;
  plantCode: string;
  periodType: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  historicalAverage: number;
  trendFactor: number;
  seasonalFactor: number;
  forecastedDemand: number;
  confidenceLevel: number;
  lastUpdated: Date;
}

export interface ReorderPoint {
  materialCode: string;
  plantCode: string;
  currentStock: number;
  reorderPoint: number;
  safetyStock: number;
  economicOrderQuantity: number;
  leadTimeDays: number;
  averageDailyUsage: number;
  reorderRecommendation: 'URGENT' | 'SOON' | 'NORMAL' | 'NOT_NEEDED';
}

export class InventoryAnalyticsEngine {

  /**
   * Calculate comprehensive inventory KPIs
   */
  async calculateInventoryKPIs(plantCode?: string): Promise<InventoryKPI> {
    
    // Total inventory value
    const totalValueQuery = await db.execute(`
      SELECT 
        SUM(total_value) as total_inventory_value,
        COUNT(*) as total_items,
        AVG(total_value) as avg_item_value
      FROM inventory_balance 
      WHERE quantity > 0 
        AND ($1 IS NULL OR plant_code = $1)
    `, [plantCode || null]);

    const totalInventoryValue = parseFloat(totalValueQuery.rows[0]?.total_inventory_value || '0');

    // Inventory turnover ratio (Cost of Goods Sold / Average Inventory)
    const turnoverQuery = await db.execute(`
      WITH cogs AS (
        SELECT 
          SUM(total_value) as cost_of_goods_sold
        FROM stock_movements 
        WHERE movement_type IN ('601', '261') -- Issues for sales/production
          AND posting_date >= CURRENT_DATE - INTERVAL '365 days'
          AND ($1 IS NULL OR plant_code = $1)
      ),
      avg_inventory AS (
        SELECT 
          AVG(total_value) as average_inventory
        FROM inventory_balance
        WHERE ($1 IS NULL OR plant_code = $1)
      )
      SELECT 
        CASE 
          WHEN ai.average_inventory > 0 THEN cogs.cost_of_goods_sold / ai.average_inventory
          ELSE 0 
        END as turnover_ratio
      FROM cogs, avg_inventory ai
    `, [plantCode || null]);

    const turnoverRatio = parseFloat(turnoverQuery.rows[0]?.turnover_ratio || '0');

    // Days of supply (Average Inventory / Daily Usage)
    const daysSupplyQuery = await db.execute(`
      WITH daily_usage AS (
        SELECT 
          AVG(daily_consumption) as avg_daily_usage
        FROM (
          SELECT 
            posting_date,
            SUM(total_value) as daily_consumption
          FROM stock_movements 
          WHERE movement_type IN ('601', '261')
            AND posting_date >= CURRENT_DATE - INTERVAL '90 days'
            AND ($1 IS NULL OR plant_code = $1)
          GROUP BY posting_date
        ) daily_data
      )
      SELECT 
        CASE 
          WHEN du.avg_daily_usage > 0 THEN $2 / du.avg_daily_usage
          ELSE 999 
        END as days_of_supply
      FROM daily_usage du
    `, [plantCode || null, totalInventoryValue]);

    const daysOfSupply = parseFloat(daysSupplyQuery.rows[0]?.days_of_supply || '999');

    // Stockout risk analysis
    const stockoutQuery = await db.execute(`
      WITH low_stock_items AS (
        SELECT 
          COUNT(*) as low_stock_count
        FROM inventory_balance ib
        JOIN (
          SELECT 
            material_code,
            plant_code,
            AVG(quantity) * 0.2 as min_threshold
          FROM stock_movements 
          WHERE movement_type IN ('601', '261')
            AND posting_date >= CURRENT_DATE - INTERVAL '60 days'
          GROUP BY material_code, plant_code
        ) thresholds ON ib.material_code = thresholds.material_code 
          AND ib.plant_code = thresholds.plant_code
        WHERE ib.available_quantity <= thresholds.min_threshold
          AND ($1 IS NULL OR ib.plant_code = $1)
      ),
      total_items AS (
        SELECT COUNT(*) as total_count
        FROM inventory_balance 
        WHERE quantity > 0 
          AND ($1 IS NULL OR plant_code = $1)
      )
      SELECT 
        CASE 
          WHEN ti.total_count > 0 THEN (lsi.low_stock_count::FLOAT / ti.total_count) * 100
          ELSE 0 
        END as stockout_risk
      FROM low_stock_items lsi, total_items ti
    `, [plantCode || null]);

    const stockoutRisk = parseFloat(stockoutQuery.rows[0]?.stockout_risk || '0');

    // Inventory accuracy (from physical inventory variance)
    const accuracyQuery = await db.execute(`
      WITH variance_analysis AS (
        SELECT 
          COUNT(*) as total_counts,
          SUM(CASE WHEN ABS(difference_quantity) <= book_quantity * 0.02 THEN 1 ELSE 0 END) as accurate_counts
        FROM physical_inventory 
        WHERE count_date >= CURRENT_DATE - INTERVAL '90 days'
          AND status = 'counted'
      )
      SELECT 
        CASE 
          WHEN va.total_counts > 0 THEN (va.accurate_counts::FLOAT / va.total_counts) * 100
          ELSE 100 
        END as accuracy_percentage
      FROM variance_analysis va
    `);

    const accuracyPercentage = parseFloat(accuracyQuery.rows[0]?.accuracy_percentage || '100');

    // Slow-moving inventory value (no movement in 90+ days)
    const slowMovingQuery = await db.execute(`
      WITH latest_movements AS (
        SELECT 
          material_code,
          plant_code,
          MAX(posting_date) as last_movement_date
        FROM stock_movements 
        WHERE ($1 IS NULL OR plant_code = $1)
        GROUP BY material_code, plant_code
      )
      SELECT 
        SUM(ib.total_value) as slow_moving_value
      FROM inventory_balance ib
      JOIN latest_movements lm ON ib.material_code = lm.material_code 
        AND ib.plant_code = lm.plant_code
      WHERE ib.quantity > 0 
        AND lm.last_movement_date <= CURRENT_DATE - INTERVAL '90 days'
        AND ($1 IS NULL OR ib.plant_code = $1)
    `, [plantCode || null]);

    const slowMovingValue = parseFloat(slowMovingQuery.rows[0]?.slow_moving_value || '0');

    // Excess inventory (beyond 180 days of supply)
    const excessQuery = await db.execute(`
      WITH usage_rates AS (
        SELECT 
          material_code,
          plant_code,
          AVG(quantity) as avg_daily_usage
        FROM stock_movements 
        WHERE movement_type IN ('601', '261')
          AND posting_date >= CURRENT_DATE - INTERVAL '90 days'
          AND ($1 IS NULL OR plant_code = $1)
        GROUP BY material_code, plant_code
      )
      SELECT 
        SUM(
          CASE 
            WHEN ib.quantity > (ur.avg_daily_usage * 180) 
            THEN (ib.quantity - (ur.avg_daily_usage * 180)) * ib.moving_average_price
            ELSE 0 
          END
        ) as excess_inventory_value
      FROM inventory_balance ib
      JOIN usage_rates ur ON ib.material_code = ur.material_code 
        AND ib.plant_code = ur.plant_code
      WHERE ib.quantity > 0 
        AND ur.avg_daily_usage > 0
        AND ($1 IS NULL OR ib.plant_code = $1)
    `, [plantCode || null]);

    const excessInventoryValue = parseFloat(excessQuery.rows[0]?.excess_inventory_value || '0');

    return {
      totalInventoryValue,
      turnoverRatio,
      daysOfSupply,
      stockoutRisk,
      accuracyPercentage,
      slowMovingValue,
      excessInventoryValue
    };
  }

  /**
   * Generate demand forecasts based on historical consumption patterns
   */
  async generateDemandForecast(
    materialCode?: string,
    plantCode?: string,
    periodType: 'DAILY' | 'WEEKLY' | 'MONTHLY' = 'MONTHLY'
  ): Promise<DemandForecast[]> {
    
    const forecastQuery = await db.execute(`
      WITH historical_demand AS (
        SELECT 
          material_code,
          plant_code,
          DATE_TRUNC('${periodType.toLowerCase()}', posting_date) as period,
          SUM(quantity) as period_demand
        FROM stock_movements 
        WHERE movement_type IN ('601', '261') -- Issues representing demand
          AND posting_date >= CURRENT_DATE - INTERVAL '12 months'
          AND ($1 IS NULL OR material_code = $1)
          AND ($2 IS NULL OR plant_code = $2)
        GROUP BY material_code, plant_code, DATE_TRUNC('${periodType.toLowerCase()}', posting_date)
      ),
      demand_stats AS (
        SELECT 
          material_code,
          plant_code,
          AVG(period_demand) as historical_average,
          STDDEV(period_demand) as demand_volatility,
          COUNT(*) as period_count,
          -- Simple trend calculation (slope of demand over time)
          CASE 
            WHEN COUNT(*) > 1 THEN
              (SUM((EXTRACT(EPOCH FROM period) - AVG(EXTRACT(EPOCH FROM period))) * (period_demand - AVG(period_demand))) /
               SUM(POWER(EXTRACT(EPOCH FROM period) - AVG(EXTRACT(EPOCH FROM period)), 2)))
            ELSE 0
          END as trend_factor
        FROM historical_demand
        GROUP BY material_code, plant_code
        HAVING COUNT(*) >= 3 -- Minimum periods for meaningful forecast
      ),
      seasonal_factors AS (
        SELECT 
          material_code,
          plant_code,
          EXTRACT(MONTH FROM period) as month_number,
          AVG(period_demand) / ds.historical_average as seasonal_factor
        FROM historical_demand hd
        JOIN demand_stats ds ON hd.material_code = ds.material_code 
          AND hd.plant_code = ds.plant_code
        GROUP BY hd.material_code, hd.plant_code, EXTRACT(MONTH FROM period), ds.historical_average
      )
      SELECT 
        ds.material_code,
        ds.plant_code,
        ds.historical_average,
        ds.trend_factor,
        COALESCE(sf.seasonal_factor, 1.0) as seasonal_factor,
        ds.demand_volatility,
        ds.period_count
      FROM demand_stats ds
      LEFT JOIN seasonal_factors sf ON ds.material_code = sf.material_code 
        AND ds.plant_code = sf.plant_code
        AND sf.month_number = EXTRACT(MONTH FROM CURRENT_DATE + INTERVAL '1 month')
    `, [materialCode || null, plantCode || null]);

    return forecastQuery.rows.map(row => {
      const historicalAverage = parseFloat(row.historical_average || '0');
      const trendFactor = parseFloat(row.trend_factor || '0');
      const seasonalFactor = parseFloat(row.seasonal_factor || '1');
      const volatility = parseFloat(row.demand_volatility || '0');
      
      // Calculate forecasted demand with trend and seasonal adjustments
      const baselineForecast = historicalAverage * seasonalFactor;
      const trendAdjustment = trendFactor * 30; // Assume 30-day projection
      const forecastedDemand = Math.max(0, baselineForecast + trendAdjustment);
      
      // Confidence level based on demand volatility
      const coefficientOfVariation = historicalAverage > 0 ? volatility / historicalAverage : 1;
      const confidenceLevel = Math.max(0.5, 1 - Math.min(0.5, coefficientOfVariation));

      return {
        materialCode: row.material_code,
        plantCode: row.plant_code,
        periodType,
        historicalAverage,
        trendFactor,
        seasonalFactor,
        forecastedDemand,
        confidenceLevel,
        lastUpdated: new Date()
      };
    });
  }

  /**
   * Calculate automatic reorder points and economic order quantities
   */
  async calculateReorderPoints(plantCode?: string): Promise<ReorderPoint[]> {
    
    const reorderQuery = await db.execute(`
      WITH usage_analysis AS (
        SELECT 
          material_code,
          plant_code,
          AVG(quantity) as avg_daily_usage,
          STDDEV(quantity) as usage_volatility,
          COUNT(*) as usage_periods
        FROM stock_movements 
        WHERE movement_type IN ('601', '261')
          AND posting_date >= CURRENT_DATE - INTERVAL '90 days'
          AND ($1 IS NULL OR plant_code = $1)
        GROUP BY material_code, plant_code
        HAVING COUNT(*) >= 5 -- Minimum data points
      ),
      lead_time_analysis AS (
        SELECT 
          material_code,
          plant_code,
          AVG(EXTRACT(DAYS FROM (posting_date - created_at))) as avg_lead_time_days
        FROM stock_movements 
        WHERE movement_type = '101' -- Purchase receipts
          AND posting_date >= CURRENT_DATE - INTERVAL '180 days'
          AND ($1 IS NULL OR plant_code = $1)
        GROUP BY material_code, plant_code
      ),
      carrying_costs AS (
        SELECT 
          material_code,
          plant_code,
          moving_average_price,
          0.25 as carrying_cost_rate -- 25% annual carrying cost assumption
        FROM inventory_balance
        WHERE quantity > 0
          AND ($1 IS NULL OR plant_code = $1)
      )
      SELECT 
        ib.material_code,
        ib.plant_code,
        ib.available_quantity as current_stock,
        ua.avg_daily_usage,
        COALESCE(lta.avg_lead_time_days, 14) as lead_time_days,
        ua.usage_volatility,
        cc.moving_average_price,
        cc.carrying_cost_rate
      FROM inventory_balance ib
      JOIN usage_analysis ua ON ib.material_code = ua.material_code 
        AND ib.plant_code = ua.plant_code
      LEFT JOIN lead_time_analysis lta ON ib.material_code = lta.material_code 
        AND ib.plant_code = lta.plant_code
      LEFT JOIN carrying_costs cc ON ib.material_code = cc.material_code 
        AND ib.plant_code = cc.plant_code
      WHERE ib.quantity > 0
    `, [plantCode || null]);

    return reorderQuery.rows.map(row => {
      const currentStock = parseFloat(row.current_stock || '0');
      const avgDailyUsage = parseFloat(row.avg_daily_usage || '0');
      const leadTimeDays = parseFloat(row.lead_time_days || '14');
      const usageVolatility = parseFloat(row.usage_volatility || '0');
      const unitPrice = parseFloat(row.moving_average_price || '0');
      const carryingCostRate = parseFloat(row.carrying_cost_rate || '0.25');

      // Calculate safety stock (service level 95% = 1.645 z-score)
      const leadTimeDemand = avgDailyUsage * leadTimeDays;
      const leadTimeVariability = usageVolatility * Math.sqrt(leadTimeDays);
      const safetyStock = 1.645 * leadTimeVariability;

      // Reorder point = Lead time demand + Safety stock
      const reorderPoint = leadTimeDemand + safetyStock;

      // Economic Order Quantity (EOQ) = sqrt(2 * Annual Demand * Order Cost / Carrying Cost)
      const annualDemand = avgDailyUsage * 365;
      const orderCost = 100; // Assumed $100 per order
      const annualCarryingCost = unitPrice * carryingCostRate;
      const economicOrderQuantity = annualCarryingCost > 0 ? 
        Math.sqrt((2 * annualDemand * orderCost) / annualCarryingCost) : 
        avgDailyUsage * 30; // 30-day supply fallback

      // Reorder recommendation
      let reorderRecommendation: 'URGENT' | 'SOON' | 'NORMAL' | 'NOT_NEEDED';
      if (currentStock <= reorderPoint * 0.5) {
        reorderRecommendation = 'URGENT';
      } else if (currentStock <= reorderPoint) {
        reorderRecommendation = 'SOON';
      } else if (currentStock <= reorderPoint * 1.5) {
        reorderRecommendation = 'NORMAL';
      } else {
        reorderRecommendation = 'NOT_NEEDED';
      }

      return {
        materialCode: row.material_code,
        plantCode: row.plant_code,
        currentStock,
        reorderPoint: Math.ceil(reorderPoint),
        safetyStock: Math.ceil(safetyStock),
        economicOrderQuantity: Math.ceil(economicOrderQuantity),
        leadTimeDays,
        averageDailyUsage: avgDailyUsage,
        reorderRecommendation
      };
    });
  }

  /**
   * Generate inventory analytics dashboard data
   */
  async generateDashboardData(plantCode?: string): Promise<{
    kpis: InventoryKPI;
    topMovers: {
      materialCode: string;
      totalMovement: number;
      movementTrend: 'UP' | 'DOWN' | 'STABLE';
    }[];
    alertsAndRecommendations: {
      type: 'STOCKOUT_RISK' | 'EXCESS_INVENTORY' | 'REORDER_NEEDED' | 'PRICE_VARIANCE';
      severity: 'HIGH' | 'MEDIUM' | 'LOW';
      message: string;
      materialCode?: string;
      actionRequired: boolean;
    }[];
    categoryAnalysis: {
      category: string;
      totalValue: number;
      turnoverRatio: number;
      itemCount: number;
    }[];
  }> {
    
    // Get comprehensive KPIs
    const kpis = await this.calculateInventoryKPIs(plantCode);

    // Top moving materials (by transaction volume)
    const topMoversQuery = await db.execute(`
      WITH recent_movements AS (
        SELECT 
          material_code,
          SUM(ABS(quantity)) as total_movement,
          COUNT(*) as movement_count
        FROM stock_movements 
        WHERE posting_date >= CURRENT_DATE - INTERVAL '30 days'
          AND ($1 IS NULL OR plant_code = $1)
        GROUP BY material_code
      ),
      previous_movements AS (
        SELECT 
          material_code,
          SUM(ABS(quantity)) as previous_movement
        FROM stock_movements 
        WHERE posting_date BETWEEN CURRENT_DATE - INTERVAL '60 days' 
          AND CURRENT_DATE - INTERVAL '30 days'
          AND ($1 IS NULL OR plant_code = $1)
        GROUP BY material_code
      )
      SELECT 
        rm.material_code,
        rm.total_movement,
        COALESCE(pm.previous_movement, 0) as previous_movement,
        CASE 
          WHEN COALESCE(pm.previous_movement, 0) = 0 THEN 'UP'
          WHEN rm.total_movement > pm.previous_movement * 1.1 THEN 'UP'
          WHEN rm.total_movement < pm.previous_movement * 0.9 THEN 'DOWN'
          ELSE 'STABLE'
        END as movement_trend
      FROM recent_movements rm
      LEFT JOIN previous_movements pm ON rm.material_code = pm.material_code
      ORDER BY rm.total_movement DESC
      LIMIT 10
    `, [plantCode || null]);

    const topMovers = topMoversQuery.rows.map(row => ({
      materialCode: row.material_code,
      totalMovement: parseFloat(row.total_movement || '0'),
      movementTrend: row.movement_trend as 'UP' | 'DOWN' | 'STABLE'
    }));

    // Get reorder recommendations for alerts
    const reorderPoints = await this.calculateReorderPoints(plantCode);
    
    // Generate alerts and recommendations
    const alertsAndRecommendations = [
      // Stockout risk alerts
      ...reorderPoints
        .filter(rp => rp.reorderRecommendation === 'URGENT')
        .map(rp => ({
          type: 'STOCKOUT_RISK' as const,
          severity: 'HIGH' as const,
          message: `Critical stock level for ${rp.materialCode}: ${rp.currentStock} units remaining (reorder at ${rp.reorderPoint})`,
          materialCode: rp.materialCode,
          actionRequired: true
        })),
      
      // Reorder needed alerts
      ...reorderPoints
        .filter(rp => rp.reorderRecommendation === 'SOON')
        .slice(0, 5) // Limit to top 5
        .map(rp => ({
          type: 'REORDER_NEEDED' as const,
          severity: 'MEDIUM' as const,
          message: `Reorder recommended for ${rp.materialCode}: Current ${rp.currentStock}, Reorder point ${rp.reorderPoint}`,
          materialCode: rp.materialCode,
          actionRequired: true
        })),

      // Excess inventory alerts
      ...(kpis.excessInventoryValue > 10000 ? [{
        type: 'EXCESS_INVENTORY' as const,
        severity: 'MEDIUM' as const,
        message: `Excess inventory detected: $${kpis.excessInventoryValue.toLocaleString()} worth of slow-moving stock`,
        actionRequired: false
      }] : []),

      // Accuracy alerts
      ...(kpis.accuracyPercentage < 95 ? [{
        type: 'PRICE_VARIANCE' as const,
        severity: 'LOW' as const,
        message: `Inventory accuracy below target: ${kpis.accuracyPercentage.toFixed(1)}% (target: 95%+)`,
        actionRequired: false
      }] : [])
    ];

    // Category analysis (simplified - using first character of material code as category)
    const categoryQuery = await db.execute(`
      SELECT 
        CASE 
          WHEN material_code LIKE 'PAINT%' THEN 'Paint Products'
          WHEN material_code LIKE 'RAW%' THEN 'Raw Materials'
          WHEN material_code LIKE 'PACK%' THEN 'Packaging'
          WHEN material_code LIKE 'STEEL%' THEN 'Steel Products'
          WHEN material_code LIKE 'ENGINE%' THEN 'Engines'
          ELSE 'Other Materials'
        END as category,
        SUM(total_value) as total_value,
        COUNT(*) as item_count,
        AVG(moving_average_price) as avg_price
      FROM inventory_balance 
      WHERE quantity > 0 
        AND ($1 IS NULL OR plant_code = $1)
      GROUP BY 
        CASE 
          WHEN material_code LIKE 'PAINT%' THEN 'Paint Products'
          WHEN material_code LIKE 'RAW%' THEN 'Raw Materials'
          WHEN material_code LIKE 'PACK%' THEN 'Packaging'
          WHEN material_code LIKE 'STEEL%' THEN 'Steel Products'
          WHEN material_code LIKE 'ENGINE%' THEN 'Engines'
          ELSE 'Other Materials'
        END
      ORDER BY total_value DESC
    `, [plantCode || null]);

    const categoryAnalysis = categoryQuery.rows.map(row => ({
      category: row.category,
      totalValue: parseFloat(row.total_value || '0'),
      turnoverRatio: kpis.turnoverRatio, // Simplified - using overall ratio
      itemCount: parseInt(row.item_count || '0')
    }));

    return {
      kpis,
      topMovers,
      alertsAndRecommendations,
      categoryAnalysis
    };
  }
}