import { Router } from 'express';
import type { Pool } from 'pg';
import { MRPRequirementsService } from '../services/mrpRequirementsService';

export function createMRPRequirementsRoutes(pool: Pool): Router {
  const router = Router();
  const mrpRequirementsService = new MRPRequirementsService(pool);

  // Execute MRP Requirements Processing (based on the flow diagram)
  router.post('/process-requirements', async (req, res) => {
    try {
      const { plantId } = req.body;
      
      const result = await mrpRequirementsService.processMRPRequirements(plantId);
      
      res.json({
        success: true,
        data: result,
        message: `MRP requirements processed successfully`
      });
    } catch (error) {
      console.error('Error processing MRP requirements:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process MRP requirements',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get MRP Requirements Dashboard
  router.get('/dashboard', async (req, res) => {
    try {
      const plantId = req.query.plantId ? parseInt(req.query.plantId as string) : undefined;
      
      const dashboard = await mrpRequirementsService.getMRPRequirementsDashboard(plantId);
      
      res.json({
        success: true,
        data: dashboard
      });
    } catch (error) {
      console.error('Error fetching MRP requirements dashboard:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch MRP requirements dashboard',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get Requirement Types (LSB, VSB, PLO, PRD as shown in diagram)
  router.get('/requirement-types', async (req, res) => {
    try {
      const client = await pool.connect();
      
      try {
        const query = `
          SELECT 
            requirement_type,
            description,
            requirement_class,
            procurement_type,
            stock_check_required,
            auto_create_orders
          FROM requirement_types 
          ORDER BY requirement_type
        `;
        
        const result = await client.query(query);
        
        res.json({
          success: true,
          data: result.rows
        });
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error fetching requirement types:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch requirement types',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get Stock Check Configuration
  router.get('/stock-check-config', async (req, res) => {
    try {
      const client = await pool.connect();
      
      try {
        const query = `
          SELECT 
            scc.*,
            m.description as material_description,
            p.plant_name
          FROM stock_check_config scc
          JOIN materials m ON scc.material_id = m.code
          LEFT JOIN plants p ON scc.plant_id = p.id
          ORDER BY scc.material_id, scc.plant_id
        `;
        
        const result = await client.query(query);
        
        res.json({
          success: true,
          data: result.rows
        });
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error fetching stock check configuration:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch stock check configuration',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Create or Update Stock Check Configuration
  router.post('/stock-check-config', async (req, res) => {
    try {
      const { materialId, plantId, checkAvailability, safetyStockQuantity, minimumStockLevel } = req.body;
      
      const client = await pool.connect();
      
      try {
        const query = `
          INSERT INTO stock_check_config 
          (material_id, plant_id, check_availability, safety_stock_quantity, minimum_stock_level)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (material_id, plant_id) 
          DO UPDATE SET
            check_availability = EXCLUDED.check_availability,
            safety_stock_quantity = EXCLUDED.safety_stock_quantity,
            minimum_stock_level = EXCLUDED.minimum_stock_level
          RETURNING *
        `;
        
        const result = await client.query(query, [
          materialId,
          plantId,
          checkAvailability,
          safetyStockQuantity,
          minimumStockLevel
        ]);
        
        res.json({
          success: true,
          data: result.rows[0],
          message: 'Stock check configuration updated successfully'
        });
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error updating stock check configuration:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update stock check configuration',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get Current Stock Levels for Materials
  router.get('/stock-levels', async (req, res) => {
    try {
      const plantIdParam = req.query.plantId as string | undefined;
      const plantId = plantIdParam && plantIdParam !== 'all' ? parseInt(plantIdParam) : undefined;
      
      const client = await pool.connect();
      
      try {
        // Use stock_balances and materials tables instead of stock_availability_check
        const query = `
          SELECT 
            m.code as material_code,
            m.description,
            COALESCE(
              SUM(CASE WHEN sb.stock_type = 'AVAILABLE' THEN sb.quantity ELSE 0 END),
              0
            ) as current_stock,
            COALESCE(scc.safety_stock_quantity, 0) as safety_stock,
            COALESCE(scc.minimum_stock_level, 0) as minimum_level,
            CASE 
              WHEN COALESCE(
                SUM(CASE WHEN sb.stock_type = 'AVAILABLE' THEN sb.quantity ELSE 0 END),
                0
              ) <= COALESCE(scc.minimum_stock_level, 0) THEN 'CRITICAL'
              WHEN COALESCE(
                SUM(CASE WHEN sb.stock_type = 'AVAILABLE' THEN sb.quantity ELSE 0 END),
                0
              ) <= COALESCE(scc.safety_stock_quantity, 0) THEN 'LOW'
              ELSE 'NORMAL'
            END as stock_status,
            COALESCE(sb.plant_id, scc.plant_id) as plant_id
          FROM materials m
          LEFT JOIN stock_balances sb ON m.code = sb.material_code
          LEFT JOIN stock_check_config scc ON m.code = scc.material_id
          WHERE 1=1
          ${plantId ? 'AND (sb.plant_id = $1 OR scc.plant_id = $1)' : ''}
          GROUP BY m.code, m.description, scc.safety_stock_quantity, scc.minimum_stock_level, sb.plant_id, scc.plant_id
          ORDER BY m.code
        `;
        
        const result = await client.query(query, plantId ? [plantId] : []);
        
        res.json({
          success: true,
          data: result.rows
        });
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error fetching stock levels:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch stock levels',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  return router;
}