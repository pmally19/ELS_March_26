import { Request, Response, Router } from 'express';
import { ensureActivePool } from '../database';

const pool = ensureActivePool();
const router = Router();

// Map order status codes to readable names
function mapOrderStatus(status: string): string {
  const statusMap: { [key: string]: string } = {
    'CRTD': 'Created',
    'REL': 'Released',
    'PCNF': 'Partially Confirmed',
    'CNF': 'Confirmed',
    'TECO': 'Technically Completed',
    'CLSD': 'Closed',
    'DLFL': 'Deleted',
    'SETC': 'Settled',
    'PREL': 'Pre-released',
    'MANC': 'Manually Confirmed',
    'NOCO': 'Not Confirmed',
    'ONH': 'On Hold',
    'INPR': 'In Progress',
    'COMP': 'Completed'
  };
  return statusMap[status?.toUpperCase()] || status || 'Created';
}

// GET /api/work-orders - Get all work orders
export async function getWorkOrders(req: Request, res: Response) {
  try {
    const result = await pool.query(`
      SELECT 
        wo.*,
        wc.code as work_center_code,
        wc.name as work_center_name,
        p.code as plant_code,
        p.name as plant_name
      FROM work_orders wo
      LEFT JOIN work_centers wc ON wo.work_center = wc.code
      LEFT JOIN plants p ON wo.plant = p.code
      WHERE wo.active = true
      ORDER BY wo.work_order_number DESC
    `);
    
    // Transform database fields to frontend format
    const transformedData = result.rows.map((row: any) => ({
      id: row.id,
      orderNumber: row.work_order_number,
      orderType: row.work_order_type,
      equipment: row.equipment_number || '',
      equipmentDescription: row.description || '',
      functionalLocation: row.functional_location || '',
      plant: row.plant || '',
      plantName: row.plant_name || '',
      workCenter: row.work_center || '',
      workCenterName: row.work_center_name || '',
      priority: parseInt(row.priority) || 3,
      orderDescription: row.description || '',
      systemStatus: row.system_status || '',
      userStatus: row.user_status || '',
      orderStatus: mapOrderStatus(row.order_status) || 'Created',
      plannedStartDate: row.requested_start_date ? new Date(row.requested_start_date).toLocaleDateString() : '',
      plannedFinishDate: row.requested_end_date ? new Date(row.requested_end_date).toLocaleDateString() : '',
      actualStartDate: row.actual_start_date ? new Date(row.actual_start_date).toLocaleDateString() : '',
      actualFinishDate: row.actual_end_date ? new Date(row.actual_end_date).toLocaleDateString() : '',
      basicStartDate: row.requested_start_date ? new Date(row.requested_start_date).toLocaleDateString() : '',
      basicFinishDate: row.requested_end_date ? new Date(row.requested_end_date).toLocaleDateString() : '',
      estimatedCosts: parseFloat(row.estimated_cost || 0),
      actualCosts: parseFloat(row.actual_cost || 0),
      currency: row.currency || 'USD',
      responsiblePerson: row.created_by || '',
      plannerGroup: row.planner_group || '',
      workOrderType: row.work_order_type || '',
      maintenanceActivityType: row.maintenance_activity_type || '',
      breakdown: row.work_order_type === 'BD01' || row.maintenance_activity_type === 'BD',
      plannedMaintenance: row.work_order_type === 'PM01' || row.maintenance_activity_type === 'PM',
      createdBy: row.created_by || '',
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : '',
      updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : '',
      isActive: row.active !== false,
      completionPercentage: parseFloat(row.completion_percentage || 0)
    }));
    
    return res.status(200).json({ data: transformedData });
  } catch (error: any) {
    console.error("Error fetching work orders:", error);
    return res.status(500).json({ error: "Internal server error", message: error.message });
  }
}

// GET /api/work-orders/:id - Get work order by ID
export async function getWorkOrderById(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID format" });
    }

    const result = await pool.query(`
      SELECT 
        wo.*,
        wc.code as work_center_code,
        wc.name as work_center_name,
        p.code as plant_code,
        p.name as plant_name
      FROM work_orders wo
      LEFT JOIN work_centers wc ON wo.work_center = wc.code
      LEFT JOIN plants p ON wo.plant = p.code
      WHERE wo.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Work order not found" });
    }

    const row = result.rows[0];
    const transformedData = {
      id: row.id,
      orderNumber: row.work_order_number,
      orderType: row.work_order_type,
      equipment: row.equipment_number || '',
      equipmentDescription: row.description || '',
      functionalLocation: row.functional_location || '',
      plant: row.plant || '',
      plantName: row.plant_name || '',
      workCenter: row.work_center || '',
      workCenterName: row.work_center_name || '',
      priority: parseInt(row.priority) || 3,
      orderDescription: row.description || '',
      systemStatus: row.system_status || '',
      userStatus: row.user_status || '',
      orderStatus: mapOrderStatus(row.order_status) || 'Created',
      plannedStartDate: row.requested_start_date ? new Date(row.requested_start_date).toLocaleDateString() : '',
      plannedFinishDate: row.requested_end_date ? new Date(row.requested_end_date).toLocaleDateString() : '',
      actualStartDate: row.actual_start_date ? new Date(row.actual_start_date).toLocaleDateString() : '',
      actualFinishDate: row.actual_end_date ? new Date(row.actual_end_date).toLocaleDateString() : '',
      estimatedCosts: parseFloat(row.estimated_cost || 0),
      actualCosts: parseFloat(row.actual_cost || 0),
      currency: row.currency || 'USD',
      responsiblePerson: row.created_by || '',
      plannerGroup: row.planner_group || '',
      workOrderType: row.work_order_type || '',
      maintenanceActivityType: row.maintenance_activity_type || '',
      breakdown: row.work_order_type === 'BD01' || row.maintenance_activity_type === 'BD',
      plannedMaintenance: row.work_order_type === 'PM01' || row.maintenance_activity_type === 'PM',
      createdBy: row.created_by || '',
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : '',
      updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : '',
      isActive: row.active !== false,
      completionPercentage: parseFloat(row.completion_percentage || 0)
    };

    return res.status(200).json(transformedData);
  } catch (error: any) {
    console.error("Error fetching work order:", error);
    return res.status(500).json({ error: "Internal server error", message: error.message });
  }
}

export default router;

