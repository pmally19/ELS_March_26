import express, { Request, Response, Router } from 'express';
import pkg from 'pg';
const { Pool } = pkg;
import { InventoryFinanceCostService } from '../services/inventory-finance-cost-service';
import { ProductionMaterialIssueService } from '../services/production-material-issue-service';
import { InventoryWriteoffService } from '../services/inventory-writeoff-service';
import { AdvancedCostAllocationService } from '../services/advanced-cost-allocation-service';
import { validatePeriodLock } from '../middleware/period-lock-check';

const router = Router();

// Initialize pool from environment or defaults
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'mallyerp',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'Mokshith@21'
});

// ===================================================================
// PRODUCTION MATERIAL ISSUE ROUTES
// ===================================================================

/**
 * POST /api/inventory-finance/production/issue-material
 * Issue materials to production order with WIP tracking
 */
router.post('/production/issue-material', validatePeriodLock({ module: 'INVENTORY' }), async (req: Request, res: Response) => {
  try {
    const {
      productionOrderId,
      materialCode,
      quantity,
      plantCode,
      storageLocation,
      costCenterId
    } = req.body;

    // Validation
    if (!productionOrderId || !materialCode || !quantity || !plantCode || !storageLocation) {
      return res.status(400).json({
        success: false,
        error: 'productionOrderId, materialCode, quantity, plantCode, and storageLocation are required'
      });
    }

    const service = new ProductionMaterialIssueService(pool);
    const result = await service.issueMaterialToProduction(
      parseInt(productionOrderId),
      materialCode,
      parseFloat(quantity),
      plantCode,
      storageLocation,
      costCenterId ? parseInt(costCenterId) : undefined
    );

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      data: {
        stockMovementId: result.stockMovementId,
        wipAmount: result.wipAmount,
        glDocumentNumber: result.glDocumentNumber
      }
    });
  } catch (error: any) {
    console.error('Error issuing material to production:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to issue material to production'
    });
  }
});

/**
 * POST /api/inventory-finance/production/receive-finished-goods
 * Receive finished goods from production order (WIP to Finished Goods transfer)
 */
router.post('/production/receive-finished-goods', validatePeriodLock({ module: 'INVENTORY' }), async (req: Request, res: Response) => {
  try {
    const {
      productionOrderId,
      receivedQuantity,
      plantCode,
      storageLocation
    } = req.body;

    // Validation
    if (!productionOrderId || !receivedQuantity || !plantCode || !storageLocation) {
      return res.status(400).json({
        success: false,
        error: 'productionOrderId, receivedQuantity, plantCode, and storageLocation are required'
      });
    }

    const service = new ProductionMaterialIssueService(pool);
    const result = await service.receiveFinishedGoodsFromProduction(
      parseInt(productionOrderId),
      parseFloat(receivedQuantity),
      plantCode,
      storageLocation
    );

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      data: {
        wipTransferred: result.wipTransferred,
        glDocumentNumber: result.glDocumentNumber
      }
    });
  } catch (error: any) {
    console.error('Error receiving finished goods from production:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to receive finished goods from production'
    });
  }
});

// ===================================================================
// INVENTORY WRITE-OFF/WRITE-DOWN ROUTES
// ===================================================================

/**
 * POST /api/inventory-finance/write-off
 * Process inventory write-off (complete loss)
 */
router.post('/write-off', validatePeriodLock({ module: 'INVENTORY' }), async (req: Request, res: Response) => {
  try {
    const {
      materialCode,
      quantity,
      plantCode,
      storageLocation,
      reason,
      costCenterId
    } = req.body;

    // Validation
    if (!materialCode || !quantity || !plantCode || !storageLocation || !reason) {
      return res.status(400).json({
        success: false,
        error: 'materialCode, quantity, plantCode, storageLocation, and reason are required'
      });
    }

    const service = new InventoryWriteoffService(pool);
    const result = await service.processWriteOff(
      materialCode,
      parseFloat(quantity),
      plantCode,
      storageLocation,
      reason,
      costCenterId ? parseInt(costCenterId) : undefined
    );

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      data: {
        writeOffAmount: result.writeOffAmount,
        glDocumentNumber: result.glDocumentNumber,
        stockMovementId: result.stockMovementId
      }
    });
  } catch (error: any) {
    console.error('Error processing write-off:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to process write-off'
    });
  }
});

/**
 * POST /api/inventory-finance/write-down
 * Process inventory write-down (partial devaluation)
 */
router.post('/write-down', validatePeriodLock({ module: 'INVENTORY' }), async (req: Request, res: Response) => {
  try {
    const {
      materialCode,
      quantity,
      plantCode,
      storageLocation,
      newUnitCost,
      reason,
      costCenterId
    } = req.body;

    // Validation
    if (!materialCode || !quantity || !plantCode || !storageLocation || !newUnitCost || !reason) {
      return res.status(400).json({
        success: false,
        error: 'materialCode, quantity, plantCode, storageLocation, newUnitCost, and reason are required'
      });
    }

    const service = new InventoryWriteoffService(pool);
    const result = await service.processWriteDown(
      materialCode,
      parseFloat(quantity),
      plantCode,
      storageLocation,
      parseFloat(newUnitCost),
      reason,
      costCenterId ? parseInt(costCenterId) : undefined
    );

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error
      });
    }

    res.json({
      success: true,
      data: {
        writeDownAmount: result.writeDownAmount,
        glDocumentNumber: result.glDocumentNumber,
        stockMovementId: result.stockMovementId
      }
    });
  } catch (error: any) {
    console.error('Error processing write-down:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to process write-down'
    });
  }
});

// ===================================================================
// COST CENTER & PROFIT CENTER ROUTES
// ===================================================================

/**
 * GET /api/inventory-finance/cost-centers
 * Get cost centers and profit centers for material/plant
 */
router.get('/cost-centers', async (req: Request, res: Response) => {
  try {
    const { materialCode, plantCode, costCenterId, costCenterCode } = req.query;

    const service = new InventoryFinanceCostService(pool);
    const result = await service.getCostAndProfitCenters(
      materialCode as string | undefined,
      plantCode as string | undefined,
      costCenterId ? parseInt(costCenterId as string) : undefined,
      costCenterCode as string | undefined
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('Error getting cost centers:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get cost centers'
    });
  }
});

// ===================================================================
// COGS CALCULATION ROUTES
// ===================================================================

/**
 * POST /api/inventory-finance/calculate-cogs
 * Calculate COGS for sales delivery
 */
router.post('/calculate-cogs', async (req: Request, res: Response) => {
  try {
    const { materialCode, quantity, plantCode, storageLocation } = req.body;

    // Validation
    if (!materialCode || !quantity || !plantCode || !storageLocation) {
      return res.status(400).json({
        success: false,
        error: 'materialCode, quantity, plantCode, and storageLocation are required'
      });
    }

    const service = new InventoryFinanceCostService(pool);
    const result = await service.calculateCOGS(
      materialCode,
      parseFloat(quantity),
      plantCode,
      storageLocation
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('Error calculating COGS:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to calculate COGS'
    });
  }
});

// ===================================================================
// VARIANCE CALCULATION ROUTES
// ===================================================================

/**
 * POST /api/inventory-finance/calculate-variance
 * Calculate standard cost variance
 */
router.post('/calculate-variance', async (req: Request, res: Response) => {
  try {
    const { materialCode, actualCost, quantity } = req.body;

    // Validation
    if (!materialCode || actualCost === undefined || !quantity) {
      return res.status(400).json({
        success: false,
        error: 'materialCode, actualCost, and quantity are required'
      });
    }

    const service = new InventoryFinanceCostService(pool);
    const result = await service.calculateVariance(
      materialCode,
      parseFloat(actualCost),
      parseFloat(quantity)
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('Error calculating variance:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to calculate variance'
    });
  }
});

// ===================================================================
// LANDED COST CALCULATION ROUTES
// ===================================================================

/**
 * POST /api/inventory-finance/calculate-landed-cost
 * Calculate landed cost including freight, duty, handling, insurance
 */
router.post('/calculate-landed-cost', async (req: Request, res: Response) => {
  try {
    const {
      unitPrice,
      quantity,
      freightCost,
      dutyCost,
      handlingCost,
      insuranceCost
    } = req.body;

    // Validation
    if (unitPrice === undefined || !quantity) {
      return res.status(400).json({
        success: false,
        error: 'unitPrice and quantity are required'
      });
    }

    const service = new InventoryFinanceCostService(pool);
    const result = await service.calculateLandedCost(
      parseFloat(unitPrice),
      parseFloat(quantity),
      freightCost ? parseFloat(freightCost) : undefined,
      dutyCost ? parseFloat(dutyCost) : undefined,
      handlingCost ? parseFloat(handlingCost) : undefined,
      insuranceCost ? parseFloat(insuranceCost) : undefined
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('Error calculating landed cost:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to calculate landed cost'
    });
  }
});

// ===================================================================
// OVERHEAD ALLOCATION ROUTES
// ===================================================================

/**
 * POST /api/inventory-finance/calculate-overhead
 * Calculate overhead allocation from cost center
 */
router.post('/calculate-overhead', async (req: Request, res: Response) => {
  try {
    const { baseCost, costCenterId, costCenterCode } = req.body;

    // Validation
    if (baseCost === undefined) {
      return res.status(400).json({
        success: false,
        error: 'baseCost is required'
      });
    }

    if (!costCenterId && !costCenterCode) {
      return res.status(400).json({
        success: false,
        error: 'Either costCenterId or costCenterCode is required'
      });
    }

    const service = new InventoryFinanceCostService(pool);
    const result = await service.calculateOverheadAllocation(
      parseFloat(baseCost),
      costCenterId ? parseInt(costCenterId) : undefined,
      costCenterCode as string | undefined
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('Error calculating overhead:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to calculate overhead'
    });
  }
});

// ===================================================================
// WIP CALCULATION ROUTES
// ===================================================================

/**
 * GET /api/inventory-finance/production/:id/wip-cost
 * Get WIP cost for production order
 */
router.get('/production/:id/wip-cost', async (req: Request, res: Response) => {
  try {
    const productionOrderId = parseInt(req.params.id);

    if (!productionOrderId) {
      return res.status(400).json({
        success: false,
        error: 'Production order ID is required'
      });
    }

    const service = new InventoryFinanceCostService(pool);
    const result = await service.calculateWIPCost(productionOrderId);

    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('Error calculating WIP cost:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to calculate WIP cost'
    });
  }
});

// ===================================================================
// ADVANCED COST ALLOCATION ROUTES
// ===================================================================

/**
 * POST /api/inventory-finance/activity-based-allocation
 * Calculate activity-based cost allocation
 */
router.post('/activity-based-allocation', async (req: Request, res: Response) => {
  try {
    const {
      costCenterId,
      activityDriver,
      activityQuantity,
      materialCode,
      productionOrderId
    } = req.body;

    if (!costCenterId || !activityDriver || activityQuantity === undefined) {
      return res.status(400).json({
        success: false,
        error: 'costCenterId, activityDriver, and activityQuantity are required'
      });
    }

    const service = new AdvancedCostAllocationService(pool);
    const result = await service.calculateActivityBasedAllocation({
      costCenterId: parseInt(costCenterId),
      activityDriver,
      activityQuantity: parseFloat(activityQuantity),
      materialCode,
      productionOrderId: productionOrderId ? parseInt(productionOrderId) : undefined
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('Error calculating activity-based allocation:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to calculate activity-based allocation'
    });
  }
});

/**
 * POST /api/inventory-finance/direct-allocation
 * Calculate direct cost allocation
 */
router.post('/direct-allocation', async (req: Request, res: Response) => {
  try {
    const {
      costObjectId,
      costObjectType,
      directCostAmount,
      allocationBasis
    } = req.body;

    if (!costObjectId || !costObjectType || directCostAmount === undefined) {
      return res.status(400).json({
        success: false,
        error: 'costObjectId, costObjectType, and directCostAmount are required'
      });
    }

    const service = new AdvancedCostAllocationService(pool);
    const result = await service.calculateDirectAllocation({
      costObjectId: parseInt(costObjectId),
      costObjectType,
      directCostAmount: parseFloat(directCostAmount),
      allocationBasis
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('Error calculating direct allocation:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to calculate direct allocation'
    });
  }
});

/**
 * POST /api/inventory-finance/step-down-allocation
 * Calculate step-down cost allocation
 */
router.post('/step-down-allocation', async (req: Request, res: Response) => {
  try {
    const {
      serviceCostCenterIds,
      productionCostCenterIds,
      allocationSequence
    } = req.body;

    if (!serviceCostCenterIds || !Array.isArray(serviceCostCenterIds) || serviceCostCenterIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'serviceCostCenterIds array is required'
      });
    }

    const service = new AdvancedCostAllocationService(pool);
    const result = await service.calculateStepDownAllocation({
      serviceCostCenterIds: serviceCostCenterIds.map((id: any) => parseInt(id)),
      productionCostCenterIds: productionCostCenterIds ? productionCostCenterIds.map((id: any) => parseInt(id)) : [],
      allocationSequence: allocationSequence || []
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('Error calculating step-down allocation:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to calculate step-down allocation'
    });
  }
});

/**
 * POST /api/inventory-finance/inventory-aging-analysis
 * Calculate inventory aging cost analysis
 */
router.post('/inventory-aging-analysis', async (req: Request, res: Response) => {
  try {
    const {
      materialCode,
      plantCode,
      storageLocation,
      agingPeriodDays
    } = req.body;

    if (!materialCode || !plantCode || !storageLocation) {
      return res.status(400).json({
        success: false,
        error: 'materialCode, plantCode, and storageLocation are required'
      });
    }

    const service = new AdvancedCostAllocationService(pool);
    const result = await service.calculateInventoryAgingCost({
      materialCode,
      plantCode,
      storageLocation,
      agingPeriodDays: agingPeriodDays ? parseInt(agingPeriodDays) : undefined
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('Error calculating inventory aging analysis:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to calculate inventory aging analysis'
    });
  }
});

export default router;

