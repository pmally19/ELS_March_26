import { Router } from "express";
import { productionPlanningService } from "../services/productionPlanningService";
import { insertPlannedOrderSchema, insertPurchaseRequisitionSchema, insertPurchaseRequisitionItemSchema } from "@shared/schema";
import { z } from "zod";
import { pool } from "../db";

const router = Router();

// ===================================================================
// PLANNED ORDERS ENDPOINTS
// ===================================================================

// Get all planned orders with optional filters
router.get("/planned-orders", async (req, res) => {
  try {
    const filters = {
      plantId: req.query.plantId ? parseInt(req.query.plantId as string) : undefined,
      materialId: req.query.materialId ? parseInt(req.query.materialId as string) : undefined,
      status: req.query.status as string,
      dateFrom: req.query.dateFrom as string,
      dateTo: req.query.dateTo as string,
    };

    const plannedOrders = await productionPlanningService.getPlannedOrders(filters);
    
    // Calculate analytics from the data
    const totalPlannedOrders = plannedOrders.length;
    const openPlannedOrders = plannedOrders.filter((po: any) => po.conversionStatus === 'open').length;
    
    res.json({
      success: true,
      data: plannedOrders,
      total: totalPlannedOrders,
      totalPlannedOrders,
      openPlannedOrders,
    });
  } catch (error) {
    console.error("Error fetching planned orders:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch planned orders",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Create new planned order
router.post("/planned-orders", async (req, res) => {
  try {
    const validatedData = insertPlannedOrderSchema.parse(req.body);
    const newPlannedOrder = await productionPlanningService.createPlannedOrder(validatedData);
    
    res.status(201).json({
      success: true,
      data: newPlannedOrder,
      message: "Planned order created successfully",
    });
  } catch (error) {
    console.error("Error creating planned order:", error);
    res.status(500).json({
      success: false,
      error: "Failed to create planned order",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Convert planned order to production order
router.post("/planned-orders/:id/convert-to-production", async (req, res) => {
  try {
    const plannedOrderId = parseInt(req.params.id);
    const { convertedOrderId } = req.body;

    if (!convertedOrderId) {
      return res.status(400).json({
        success: false,
        error: "convertedOrderId is required",
      });
    }

    const updatedOrder = await productionPlanningService.convertPlannedOrderToProduction(
      plannedOrderId,
      convertedOrderId
    );

    res.json({
      success: true,
      data: updatedOrder,
      message: "Planned order converted to production order successfully",
    });
  } catch (error) {
    console.error("Error converting planned order:", error);
    res.status(500).json({
      success: false,
      error: "Failed to convert planned order",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Convert planned order to purchase requisition
router.post("/planned-orders/:id/convert-to-requisition", async (req, res) => {
  try {
    const plannedOrderId = parseInt(req.params.id);
    const { requisitionId } = req.body;

    if (!requisitionId) {
      return res.status(400).json({
        success: false,
        error: "requisitionId is required",
      });
    }

    const updatedOrder = await productionPlanningService.convertPlannedOrderToPurchaseRequisition(
      plannedOrderId,
      requisitionId
    );

    res.json({
      success: true,
      data: updatedOrder,
      message: "Planned order converted to purchase requisition successfully",
    });
  } catch (error) {
    console.error("Error converting planned order:", error);
    res.status(500).json({
      success: false,
      error: "Failed to convert planned order",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// ===================================================================
// PURCHASE REQUISITIONS ENDPOINTS
// ===================================================================

// Get all purchase requisitions with optional filters
router.get("/purchase-requisitions", async (req, res) => {
  try {
    const filters = {
      status: req.query.status as string,
      requestorId: req.query.requestorId ? parseInt(req.query.requestorId as string) : undefined,
      plantId: req.query.plantId ? parseInt(req.query.plantId as string) : undefined,
      priority: req.query.priority as string,
    };

    const requisitions = await productionPlanningService.getPurchaseRequisitions(filters);
    
    // Calculate analytics from the data
    const totalRequisitions = requisitions.length;
    const pendingRequisitions = requisitions.filter((req: any) => req.approval_status === 'pending').length;
    
    res.json({
      success: true,
      data: requisitions,
      total: totalRequisitions,
      totalRequisitions,
      pendingRequisitions,
    });
  } catch (error) {
    console.error("Error fetching purchase requisitions:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch purchase requisitions",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Create new purchase requisition with items
router.post("/purchase-requisitions", async (req, res) => {
  try {
    const { requisition, items } = req.body;

    if (!requisition || !items || !Array.isArray(items)) {
      return res.status(400).json({
        success: false,
        error: "Requisition data and items array are required",
      });
    }

    const validatedRequisition = insertPurchaseRequisitionSchema.parse(requisition);
    const validatedItems = items.map(item => insertPurchaseRequisitionItemSchema.parse(item));

    const result = await productionPlanningService.createPurchaseRequisition(
      validatedRequisition,
      validatedItems
    );

    res.status(201).json({
      success: true,
      data: result,
      message: "Purchase requisition created successfully",
    });
  } catch (error) {
    console.error("Error creating purchase requisition:", error);
    res.status(500).json({
      success: false,
      error: "Failed to create purchase requisition",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Approve purchase requisition
router.post("/purchase-requisitions/:id/approve", async (req, res) => {
  try {
    const requisitionId = parseInt(req.params.id);
    const { approvedBy } = req.body;

    if (!approvedBy) {
      return res.status(400).json({
        success: false,
        error: "approvedBy is required",
      });
    }

    const updatedRequisition = await productionPlanningService.approvePurchaseRequisition(
      requisitionId,
      approvedBy
    );

    res.json({
      success: true,
      data: updatedRequisition,
      message: "Purchase requisition approved successfully",
    });
  } catch (error) {
    console.error("Error approving purchase requisition:", error);
    res.status(500).json({
      success: false,
      error: "Failed to approve purchase requisition",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Convert requisition to purchase order
router.post("/purchase-requisitions/:id/convert-to-po", async (req, res) => {
  try {
    const requisitionId = parseInt(req.params.id);
    const { poNumber } = req.body;

    if (!poNumber) {
      return res.status(400).json({
        success: false,
        error: "poNumber is required",
      });
    }

    const updatedRequisition = await productionPlanningService.convertRequisitionToPurchaseOrder(
      requisitionId,
      poNumber
    );

    res.json({
      success: true,
      data: updatedRequisition,
      message: "Purchase requisition converted to purchase order successfully",
    });
  } catch (error) {
    console.error("Error converting requisition:", error);
    res.status(500).json({
      success: false,
      error: "Failed to convert requisition",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// ===================================================================
// MATERIAL PLANNING ENDPOINTS
// ===================================================================

// Run Material Planning (formerly MRP)
router.post("/material-planning/run", async (req, res) => {
  try {
    const { plantId, planningArea, planningHorizon } = req.body;

    if (!plantId) {
      return res.status(400).json({
        success: false,
        error: "plantId is required",
      });
    }

    // If planningHorizon not provided, fetch from document_settings
    let horizon = planningHorizon;
    if (!horizon) {
      try {
        const settingsResult = await pool.query(`
          SELECT setting_value
          FROM document_settings
          WHERE setting_key = 'planning_horizon_days'
          LIMIT 1
        `);
        if (settingsResult.rows.length > 0 && settingsResult.rows[0].setting_value) {
          horizon = parseInt(settingsResult.rows[0].setting_value);
        }
      } catch (settingsError) {
        console.warn("Could not fetch planning horizon from settings:", settingsError);
      }
    }

    const planningRun = await productionPlanningService.runMrpPlanning(
      plantId,
      planningArea,
      horizon
    );

    res.json({
      success: true,
      data: planningRun,
      message: "Material planning completed successfully",
    });
  } catch (error) {
    console.error("Error running material planning:", error);
    res.status(500).json({
      success: false,
      error: "Failed to run material planning",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Legacy endpoint for backward compatibility
router.post("/mrp/run", async (req, res) => {
  try {
    const { plantId, mrpArea, planningHorizon } = req.body;

    if (!plantId) {
      return res.status(400).json({
        success: false,
        error: "plantId is required",
      });
    }

    // If planningHorizon not provided, fetch from document_settings
    let horizon = planningHorizon;
    if (!horizon) {
      try {
        const settingsResult = await pool.query(`
          SELECT setting_value
          FROM document_settings
          WHERE setting_key = 'planning_horizon_days'
          LIMIT 1
        `);
        if (settingsResult.rows.length > 0 && settingsResult.rows[0].setting_value) {
          horizon = parseInt(settingsResult.rows[0].setting_value);
        }
      } catch (settingsError) {
        console.warn("Could not fetch planning horizon from settings:", settingsError);
      }
    }

    const planningRun = await productionPlanningService.runMrpPlanning(
      plantId,
      mrpArea,
      horizon
    );

    res.json({
      success: true,
      data: planningRun,
      message: "Material planning completed successfully",
    });
  } catch (error) {
    console.error("Error running material planning:", error);
    res.status(500).json({
      success: false,
      error: "Failed to run material planning",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Get planning areas (formerly MRP areas)
router.get("/planning-areas", async (req, res) => {
  try {
    const plantId = req.query.plantId ? parseInt(req.query.plantId as string) : undefined;
    const planningAreas = await productionPlanningService.getMrpAreas(plantId);

    res.json({
      success: true,
      data: planningAreas,
      total: planningAreas.length,
    });
  } catch (error) {
    console.error("Error fetching planning areas:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch planning areas",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Legacy endpoint for backward compatibility
router.get("/mrp/areas", async (req, res) => {
  try {
    const plantId = req.query.plantId ? parseInt(req.query.plantId as string) : undefined;
    const planningAreas = await productionPlanningService.getMrpAreas(plantId);

    res.json({
      success: true,
      data: planningAreas,
      total: planningAreas.length,
    });
  } catch (error) {
    console.error("Error fetching planning areas:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch planning areas",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// ===================================================================
// ANALYTICS ENDPOINTS
// ===================================================================

// Get production planning analytics
router.get("/analytics", async (req, res) => {
  try {
    const plantId = req.query.plantId ? parseInt(req.query.plantId as string) : undefined;
    const analytics = await productionPlanningService.getProductionPlanningAnalytics(plantId);

    res.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    console.error("Error fetching production planning analytics:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch analytics",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// ===================================================================
// MASTER DATA ENDPOINTS FOR PRODUCTION PLANNING
// ===================================================================

// Get all plants for production planning
router.get("/plants", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        id,
        code,
        name,
        description,
        company_code,
        is_active,
        created_at,
        updated_at
      FROM plants
      WHERE is_active = true
      ORDER BY code, name
    `);
    
    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length,
    });
  } catch (error) {
    console.error("Error fetching plants:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch plants",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Get planning horizon from document_settings
router.get("/planning-horizon", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT setting_value
      FROM document_settings
      WHERE setting_key = 'planning_horizon_days'
      LIMIT 1
    `);
    
    const planningHorizon = result.rows.length > 0 && result.rows[0].setting_value 
      ? parseInt(result.rows[0].setting_value) 
      : null;
    
    res.json({
      success: true,
      data: { planningHorizon },
    });
  } catch (error) {
    console.error("Error fetching planning horizon:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch planning horizon",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});


// ===================================================================
// PLANNING AREAS MANAGEMENT ENDPOINTS
// ===================================================================

// Get all planning areas
router.get("/mrp-areas", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        ma.*,
        p.name as plant_name,
        p.code as plant_code
      FROM mrp_areas ma
      LEFT JOIN plants p ON ma.plant_id = p.id
      ORDER BY ma.mrp_area
    `);
    
    res.json({
      success: true,
      data: result.rows,
      total: result.rows.length,
    });
  } catch (error) {
    console.error("Error fetching planning areas:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch planning areas",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Create new planning area
router.post("/mrp-areas", async (req, res) => {
  try {
    const { mrpArea, description, plantId, mrpController } = req.body;
    
    // Validate plant exists
    const plantCheck = await pool.query(`SELECT id FROM plants WHERE id = $1`, [plantId]);
    if (plantCheck.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Plant not found",
      });
    }
    
    const result = await pool.query(`
      INSERT INTO mrp_areas (mrp_area, description, plant_id, mrp_controller)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [mrpArea, description, plantId, mrpController]);
    
    res.json({
      success: true,
      data: result.rows[0],
      message: "Planning area created successfully",
    });
  } catch (error) {
    console.error("Error creating planning area:", error);
    res.status(500).json({
      success: false,
      error: "Failed to create planning area",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Update planning area
router.put("/mrp-areas/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { description, plantId, mrpController } = req.body;
    
    // Validate plant exists if provided
    if (plantId) {
      const plantCheck = await pool.query(`SELECT id FROM plants WHERE id = $1`, [plantId]);
      if (plantCheck.rows.length === 0) {
        return res.status(400).json({
          success: false,
          error: "Plant not found",
        });
      }
    }
    
    const result = await pool.query(`
      UPDATE mrp_areas 
      SET description = $1, plant_id = $2, mrp_controller = $3, updated_at = NOW()
      WHERE id = $4
      RETURNING *
    `, [description, plantId, mrpController, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Planning area not found",
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0],
      message: "Planning area updated successfully",
    });
  } catch (error) {
    console.error("Error updating planning area:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update planning area",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Delete planning area
router.delete("/mrp-areas/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      DELETE FROM mrp_areas WHERE id = $1 RETURNING *
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Planning area not found",
      });
    }
    
    res.json({
      success: true,
      message: "Planning area deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting planning area:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete planning area",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

export { router as productionPlanningRoutes };