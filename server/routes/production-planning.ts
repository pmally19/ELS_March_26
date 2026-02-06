/**
 * Production Planning API Routes
 * 
 * Provides comprehensive API endpoints for production planning functionality:
 * - Bills of Material management
 * - Routing and Operations
 * - Resource Management
 * - Capacity Planning
 * - MRP Controllers
 */

import { Router, Request, Response } from 'express';
import { pool } from '../db';

const router = Router();

// Bills of Material routes
router.get('/bom', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT 
        b.bom_id,
        b.material_id,
        m.code as material_code,
        m.name as material_name,
        b.plant_id,
        p.code as plant_code,
        b.bom_usage,
        b.bom_status,
        b.base_quantity,
        b.base_unit,
        b.valid_from,
        b.valid_to
      FROM bills_of_material b
      JOIN materials m ON b.material_id = m.id
      JOIN plants p ON b.plant_id = p.id
      ORDER BY b.bom_id
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching BOMs:', error);
    res.status(500).json({ error: 'Failed to fetch Bills of Material' });
  }
});

router.get('/bom/:bomId/components', async (req: Request, res: Response) => {
  try {
    const { bomId } = req.params;
    
    const result = await pool.query(`
      SELECT 
        bc.bom_id,
        bc.component_number,
        bc.material_id,
        m.code as component_code,
        m.name as component_name,
        bc.component_quantity,
        bc.component_unit,
        bc.component_scrap,
        bc.operation_number
      FROM bom_components bc
      JOIN materials m ON bc.material_id = m.id
      WHERE bc.bom_id = $1
      ORDER BY bc.component_number
    `, [bomId]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching BOM components:', error);
    res.status(500).json({ error: 'Failed to fetch BOM components' });
  }
});

router.post('/bom', async (req: Request, res: Response) => {
  try {
    const {
      bom_id, material_id, plant_id, bom_usage, base_quantity, base_unit,
      components = []
    } = req.body;
    
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // Create BOM header
      await client.query(`
        INSERT INTO bills_of_material (
          bom_id, material_id, plant_id, bom_usage, base_quantity, base_unit, valid_from
        ) VALUES ($1, $2, $3, $4, $5, $6, CURRENT_DATE)
      `, [bom_id, material_id, plant_id, bom_usage, base_quantity, base_unit]);
      
      // Create BOM components
      for (const comp of components) {
        await client.query(`
          INSERT INTO bom_components (
            bom_id, component_number, material_id, component_quantity, component_unit, valid_from
          ) VALUES ($1, $2, $3, $4, $5, CURRENT_DATE)
        `, [bom_id, comp.component_number, comp.material_id, comp.component_quantity, comp.component_unit]);
      }
      
      await client.query('COMMIT');
      res.status(201).json({ message: 'BOM created successfully', bom_id });
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Error creating BOM:', error);
    res.status(500).json({ error: 'Failed to create BOM' });
  }
});

// Routing and Operations routes
router.get('/routings', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT 
        r.routing_id,
        r.routing_code,
        r.description,
        r.material_id,
        m.code as material_code,
        m.name as material_name,
        r.plant_id,
        p.code as plant_code,
        r.routing_type,
        r.routing_status,
        r.base_quantity,
        r.base_unit
      FROM routings r
      JOIN materials m ON r.material_id = m.id
      JOIN plants p ON r.plant_id = p.id
      ORDER BY r.routing_id
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching routings:', error);
    res.status(500).json({ error: 'Failed to fetch routings' });
  }
});

router.get('/routings/:routingId/operations', async (req: Request, res: Response) => {
  try {
    const { routingId } = req.params;
    
    const result = await pool.query(`
      SELECT 
        o.routing_id,
        o.operation_number,
        o.operation_id,
        o.description,
        o.work_center_id,
        wc.code as work_center_code,
        wc.name as work_center_name,
        o.setup_time,
        o.machine_time,
        o.labor_time,
        o.base_quantity,
        o.time_unit
      FROM operations o
      JOIN work_centers wc ON o.work_center_id = wc.id
      WHERE o.routing_id = $1
      ORDER BY o.operation_number
    `, [routingId]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching operations:', error);
    res.status(500).json({ error: 'Failed to fetch operations' });
  }
});

// Resource Management routes
router.get('/resources', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT 
        r.resource_id,
        r.resource_code,
        r.description,
        r.resource_type_id,
        rt.description as resource_type_description,
        r.plant_id,
        p.code as plant_code,
        r.work_center_id,
        wc.code as work_center_code,
        r.capacity_quantity,
        r.capacity_unit,
        r.utilization_rate,
        r.availability_rate,
        r.status
      FROM resources r
      JOIN resource_types rt ON r.resource_type_id = rt.resource_type_id
      JOIN plants p ON r.plant_id = p.id
      LEFT JOIN work_centers wc ON r.work_center_id = wc.id
      ORDER BY r.resource_code
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching resources:', error);
    res.status(500).json({ error: 'Failed to fetch resources' });
  }
});

router.get('/resource-types', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT 
        resource_type_id,
        description,
        resource_category,
        capacity_relevant,
        scheduling_relevant,
        unit_of_measure,
        status
      FROM resource_types
      ORDER BY resource_type_id
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching resource types:', error);
    res.status(500).json({ error: 'Failed to fetch resource types' });
  }
});

// Capacity Planning routes
router.get('/capacity/work-centers', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT 
        wc.id,
        wc.code,
        wc.name,
        wc.capacity,
        wc.work_center_category,
        wcc.description as category_description,
        p.code as plant_code,
        COUNT(r.resource_id) as resource_count,
        SUM(r.capacity_quantity) as total_capacity
      FROM work_centers wc
      LEFT JOIN work_center_categories wcc ON wc.work_center_category = wcc.category_code
      JOIN plants p ON wc.plant_id = p.id
      LEFT JOIN resources r ON wc.id = r.work_center_id
      GROUP BY wc.id, wc.code, wc.name, wc.capacity, wc.work_center_category, wcc.description, p.code
      ORDER BY wc.code
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching work center capacity:', error);
    res.status(500).json({ error: 'Failed to fetch work center capacity' });
  }
});

router.get('/capacity/utilization', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT 
        wc.code as work_center_code,
        wc.name as work_center_name,
        wc.capacity as planned_capacity,
        COALESCE(AVG(r.utilization_rate), 0) as average_utilization,
        COALESCE(SUM(r.capacity_quantity), 0) as available_capacity,
        p.code as plant_code
      FROM work_centers wc
      JOIN plants p ON wc.plant_id = p.id
      LEFT JOIN resources r ON wc.id = r.work_center_id AND r.status = 'ACTIVE'
      GROUP BY wc.id, wc.code, wc.name, wc.capacity, p.code
      ORDER BY average_utilization DESC
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching capacity utilization:', error);
    res.status(500).json({ error: 'Failed to fetch capacity utilization' });
  }
});

// MRP Controllers routes
router.get('/mrp-controllers', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT 
        mc.mrp_controller,
        mc.description,
        mc.plant_id,
        p.code as plant_code,
        mc.person_id,
        pe.first_name,
        pe.last_name,
        mc.email,
        mc.telephone,
        mc.status
      FROM mrp_controllers mc
      JOIN plants p ON mc.plant_id = p.id
      LEFT JOIN personnel pe ON mc.person_id = pe.person_id
      ORDER BY mc.mrp_controller
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching MRP controllers:', error);
    res.status(500).json({ error: 'Failed to fetch MRP controllers' });
  }
});

// Material Plant Data routes
router.get('/material-plant-data', async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT 
        mpd.material_id,
        m.code as material_code,
        m.name as material_name,
        mpd.plant_id,
        p.code as plant_code,
        mpd.mrp_type,
        mpd.mrp_controller,
        mc.description as controller_description,
        mpd.planning_strategy_group,
        ps.description as strategy_description,
        mpd.procurement_type,
        mpd.safety_stock,
        mpd.reorder_point,
        mpd.planned_delivery_time,
        mpd.abc_indicator,
        mpd.plant_status
      FROM material_plant_data mpd
      JOIN materials m ON mpd.material_id = m.id
      JOIN plants p ON mpd.plant_id = p.id
      LEFT JOIN mrp_controllers mc ON mpd.mrp_controller = mc.mrp_controller
      LEFT JOIN planning_strategies ps ON mpd.planning_strategy_group = ps.strategy_group
      ORDER BY m.code, p.code
    `);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching material plant data:', error);
    res.status(500).json({ error: 'Failed to fetch material plant data' });
  }
});

// Production Planning Dashboard
router.get('/dashboard', async (req: Request, res: Response) => {
  try {
    const [
      materialCount,
      bomCount,
      routingCount,
      workCenterCount,
      resourceCount
    ] = await Promise.all([
      pool.query('SELECT COUNT(*) as count FROM materials'),
      pool.query('SELECT COUNT(*) as count FROM bills_of_material'),
      pool.query('SELECT COUNT(*) as count FROM routings'),
      pool.query('SELECT COUNT(*) as count FROM work_centers'),
      pool.query('SELECT COUNT(*) as count FROM resources')
    ]);
    
    res.json({
      summary: {
        materials: parseInt(materialCount.rows[0].count),
        boms: parseInt(bomCount.rows[0].count),
        routings: parseInt(routingCount.rows[0].count),
        work_centers: parseInt(workCenterCount.rows[0].count),
        resources: parseInt(resourceCount.rows[0].count)
      }
    });
    
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

export default router;