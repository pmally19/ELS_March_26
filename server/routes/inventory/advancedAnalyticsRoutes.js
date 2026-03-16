/**
 * ADVANCED INVENTORY ANALYTICS API ROUTES
 * Comprehensive endpoints for valuation methods, KPIs, forecasting, and business intelligence
 */

import express from 'express';
import { AdvancedValuationEngine } from '../../services/advanced-valuation-engine.js';
import { InventoryAnalyticsEngine } from '../../services/inventory-analytics-engine.js';

const router = express.Router();
const valuationEngine = new AdvancedValuationEngine();
const analyticsEngine = new InventoryAnalyticsEngine();

/**
 * Calculate inventory value using different valuation methods
 * POST /api/inventory/advanced/valuation
 */
router.post('/valuation', async (req, res) => {
  try {
    const { materialCode, plantCode, storageLocation, method = 'MOVING_AVERAGE' } = req.body;

    if (!materialCode || !plantCode || !storageLocation) {
      return res.status(400).json({
        error: 'Missing required fields: materialCode, plantCode, storageLocation'
      });
    }

    const valuation = await valuationEngine.calculateInventoryValue(
      materialCode, 
      plantCode, 
      storageLocation, 
      method
    );

    res.json({
      success: true,
      data: valuation,
      message: `${method} valuation calculated successfully`
    });

  } catch (error) {
    console.error('Valuation calculation error:', error);
    res.status(500).json({
      error: 'Failed to calculate inventory valuation',
      details: error.message
    });
  }
});

/**
 * Compare multiple valuation methods for a material
 * POST /api/inventory/advanced/valuation-comparison
 */
router.post('/valuation-comparison', async (req, res) => {
  try {
    const { materialCode, plantCode, storageLocation } = req.body;

    if (!materialCode || !plantCode || !storageLocation) {
      return res.status(400).json({
        error: 'Missing required fields: materialCode, plantCode, storageLocation'
      });
    }

    const methods = ['FIFO', 'LIFO', 'MOVING_AVERAGE', 'STANDARD_COST'];
    const comparisons = {};

    for (const method of methods) {
      try {
        const valuation = await valuationEngine.calculateInventoryValue(
          materialCode, 
          plantCode, 
          storageLocation, 
          method
        );
        comparisons[method] = valuation;
      } catch (methodError) {
        console.warn(`Failed to calculate ${method} valuation:`, methodError.message);
        comparisons[method] = { error: methodError.message };
      }
    }

    res.json({
      success: true,
      data: {
        materialCode,
        plantCode,
        storageLocation,
        valuationMethods: comparisons,
        comparisonDate: new Date()
      },
      message: 'Valuation methods comparison completed'
    });

  } catch (error) {
    console.error('Valuation comparison error:', error);
    res.status(500).json({
      error: 'Failed to compare valuation methods',
      details: error.message
    });
  }
});

/**
 * Process inventory revaluation
 * POST /api/inventory/advanced/revaluation
 */
router.post('/revaluation', async (req, res) => {
  try {
    const { materialCode, plantCode, newPrice, revaluationReason } = req.body;

    if (!materialCode || !plantCode || !newPrice || !revaluationReason) {
      return res.status(400).json({
        error: 'Missing required fields: materialCode, plantCode, newPrice, revaluationReason'
      });
    }

    const revaluationResult = await valuationEngine.processRevaluation(
      materialCode,
      plantCode,
      parseFloat(newPrice),
      revaluationReason
    );

    res.json({
      success: true,
      data: {
        materialCode,
        plantCode,
        newPrice: parseFloat(newPrice),
        revaluationReason,
        ...revaluationResult,
        processedDate: new Date()
      },
      message: 'Inventory revaluation processed successfully'
    });

  } catch (error) {
    console.error('Revaluation processing error:', error);
    res.status(500).json({
      error: 'Failed to process inventory revaluation',
      details: error.message
    });
  }
});

/**
 * Get inventory aging analysis
 * GET /api/inventory/advanced/aging-analysis
 */
router.get('/aging-analysis', async (req, res) => {
  try {
    const { plantCode } = req.query;

    const agingAnalysis = await valuationEngine.performAgingAnalysis(plantCode);

    res.json({
      success: true,
      data: {
        plantCode: plantCode || 'ALL_PLANTS',
        analysisDate: new Date(),
        ...agingAnalysis
      },
      message: 'Inventory aging analysis completed successfully'
    });

  } catch (error) {
    console.error('Aging analysis error:', error);
    res.status(500).json({
      error: 'Failed to perform aging analysis',
      details: error.message
    });
  }
});

/**
 * Get comprehensive inventory KPIs
 * GET /api/inventory/advanced/kpis
 */
router.get('/kpis', async (req, res) => {
  try {
    const { plantCode } = req.query;

    const kpis = await analyticsEngine.calculateInventoryKPIs(plantCode);

    res.json({
      success: true,
      data: {
        plantCode: plantCode || 'ALL_PLANTS',
        calculationDate: new Date(),
        kpis
      },
      message: 'Inventory KPIs calculated successfully'
    });

  } catch (error) {
    console.error('KPI calculation error:', error);
    res.status(500).json({
      error: 'Failed to calculate inventory KPIs',
      details: error.message
    });
  }
});

/**
 * Generate demand forecasts
 * POST /api/inventory/advanced/demand-forecast
 */
router.post('/demand-forecast', async (req, res) => {
  try {
    const { materialCode, plantCode, periodType = 'MONTHLY' } = req.body;

    const forecasts = await analyticsEngine.generateDemandForecast(
      materialCode,
      plantCode,
      periodType
    );

    res.json({
      success: true,
      data: {
        materialCode: materialCode || 'ALL_MATERIALS',
        plantCode: plantCode || 'ALL_PLANTS',
        periodType,
        forecastDate: new Date(),
        forecasts
      },
      message: 'Demand forecasts generated successfully'
    });

  } catch (error) {
    console.error('Demand forecast error:', error);
    res.status(500).json({
      error: 'Failed to generate demand forecasts',
      details: error.message
    });
  }
});

/**
 * Calculate reorder points and EOQ
 * GET /api/inventory/advanced/reorder-points
 */
router.get('/reorder-points', async (req, res) => {
  try {
    const { plantCode } = req.query;

    const reorderPoints = await analyticsEngine.calculateReorderPoints(plantCode);

    res.json({
      success: true,
      data: {
        plantCode: plantCode || 'ALL_PLANTS',
        calculationDate: new Date(),
        reorderPoints
      },
      message: 'Reorder points calculated successfully'
    });

  } catch (error) {
    console.error('Reorder points calculation error:', error);
    res.status(500).json({
      error: 'Failed to calculate reorder points',
      details: error.message
    });
  }
});

/**
 * Get comprehensive analytics dashboard data
 * GET /api/inventory/advanced/dashboard
 */
router.get('/dashboard', async (req, res) => {
  try {
    const { plantCode } = req.query;

    const dashboardData = await analyticsEngine.generateDashboardData(plantCode);

    res.json({
      success: true,
      data: {
        plantCode: plantCode || 'ALL_PLANTS',
        dashboardDate: new Date(),
        ...dashboardData
      },
      message: 'Analytics dashboard data generated successfully'
    });

  } catch (error) {
    console.error('Dashboard data generation error:', error);
    res.status(500).json({
      error: 'Failed to generate dashboard data',
      details: error.message
    });
  }
});

/**
 * Get valuation method recommendations
 * GET /api/inventory/advanced/valuation-recommendations
 */
router.get('/valuation-recommendations', async (req, res) => {
  try {
    const { materialCode, plantCode } = req.query;

    if (!materialCode || !plantCode) {
      return res.status(400).json({
        error: 'Missing required parameters: materialCode, plantCode'
      });
    }

    // Compare all methods and provide recommendations
    const methods = ['FIFO', 'LIFO', 'MOVING_AVERAGE', 'STANDARD_COST'];
    const valuations = {};
    
    for (const method of methods) {
      try {
        const valuation = await valuationEngine.calculateInventoryValue(
          materialCode, 
          plantCode, 
          '', // All storage locations
          method
        );
        valuations[method] = valuation;
      } catch (methodError) {
        console.warn(`Failed to calculate ${method}:`, methodError.message);
      }
    }

    // Generate recommendations based on business scenarios
    const recommendations = {
      volatilePrices: {
        recommended: 'FIFO',
        reason: 'FIFO provides better matching of current costs with revenues during price volatility'
      },
      stablePrices: {
        recommended: 'MOVING_AVERAGE',
        reason: 'Moving average smooths price fluctuations and provides consistent valuation'
      },
      risingSprices: {
        recommended: 'LIFO',
        reason: 'LIFO matches current higher costs with revenues for better profit measurement'
      },
      standardCosting: {
        recommended: 'STANDARD_COST',
        reason: 'Standard cost provides predictable valuation for budgeting and variance analysis'
      }
    };

    res.json({
      success: true,
      data: {
        materialCode,
        plantCode,
        analysisDate: new Date(),
        valuationResults: valuations,
        businessScenarios: recommendations,
        summary: {
          mostConservative: Object.entries(valuations).reduce((min, [method, val]) => 
            val.totalValue < min.value ? { method, value: val.totalValue } : min, 
            { method: 'N/A', value: Infinity }
          ),
          mostOptimistic: Object.entries(valuations).reduce((max, [method, val]) => 
            val.totalValue > max.value ? { method, value: val.totalValue } : max, 
            { method: 'N/A', value: 0 }
          )
        }
      },
      message: 'Valuation method recommendations generated successfully'
    });

  } catch (error) {
    console.error('Valuation recommendations error:', error);
    res.status(500).json({
      error: 'Failed to generate valuation recommendations',
      details: error.message
    });
  }
});

export default router;