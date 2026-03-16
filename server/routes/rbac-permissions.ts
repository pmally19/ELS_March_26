import { Router, Request, Response } from 'express';
import { pool } from '../db.js';

const router = Router();

// Update role permissions - working implementation
router.post('/role-permissions', async (req: Request, res: Response) => {
  try {
    const { roleId, tileId, actionName, isGranted } = req.body;
    
    // Validate inputs
    if (!roleId || !tileId || !actionName || typeof isGranted !== 'boolean') {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get action ID using case-insensitive search to handle both uppercase and titlecase
    const actionResult = await pool.query(
      'SELECT id FROM permission_actions WHERE LOWER(action_name) = LOWER($1)', 
      [actionName]
    );
    
    if (actionResult.rows.length === 0) {
      return res.status(400).json({ error: `Action '${actionName}' not found` });
    }
    
    const actionId = actionResult.rows[0].id;

    // Update permission using upsert
    await pool.query(`
      INSERT INTO role_tile_permissions (role_id, tile_id, action_id, is_granted, created_by)
      VALUES ($1, $2, $3, $4, 1)
      ON CONFLICT (role_id, tile_id, action_id) 
      DO UPDATE SET is_granted = EXCLUDED.is_granted
    `, [roleId, tileId, actionId, isGranted]);

    res.json({ success: true, message: 'Permission updated successfully' });
  } catch (error) {
    console.error('Permission update error:', error);
    res.status(500).json({ error: 'Failed to update permission' });
  }
});

// Get role permissions
router.get('/role-permissions/:roleId', async (req: Request, res: Response) => {
  try {
    const { roleId } = req.params;
    
    const result = await pool.query(`
      SELECT 
        st.tile_id,
        st.tile_name,
        st.module_group,
        json_build_object(
          'View', COALESCE(bool_or(CASE WHEN pa.action_name IN ('View', 'VIEW') AND rtp.is_granted = true THEN true ELSE false END), false),
          'Create', COALESCE(bool_or(CASE WHEN pa.action_name IN ('Create', 'CREATE') AND rtp.is_granted = true THEN true ELSE false END), false),
          'Edit', COALESCE(bool_or(CASE WHEN pa.action_name IN ('Edit', 'EDIT') AND rtp.is_granted = true THEN true ELSE false END), false),
          'Copy', COALESCE(bool_or(CASE WHEN pa.action_name IN ('Copy', 'COPY') AND rtp.is_granted = true THEN true ELSE false END), false),
          'Deactivate', COALESCE(bool_or(CASE WHEN pa.action_name IN ('Deactivate', 'DEACTIVATE') AND rtp.is_granted = true THEN true ELSE false END), false),
          'Export', COALESCE(bool_or(CASE WHEN pa.action_name IN ('Export', 'EXPORT') AND rtp.is_granted = true THEN true ELSE false END), false),
          'Import', COALESCE(bool_or(CASE WHEN pa.action_name IN ('Import', 'IMPORT') AND rtp.is_granted = true THEN true ELSE false END), false),
          'Approve', COALESCE(bool_or(CASE WHEN pa.action_name IN ('Approve', 'APPROVE') AND rtp.is_granted = true THEN true ELSE false END), false)
        ) as permissions
      FROM system_tiles st
      CROSS JOIN permission_actions pa
      LEFT JOIN role_tile_permissions rtp ON (
        rtp.tile_id = st.tile_id 
        AND rtp.action_id = pa.id 
        AND rtp.role_id = $1
      )
      WHERE st.is_active = true
      GROUP BY st.tile_id, st.tile_name, st.module_group
      ORDER BY st.module_group, st.tile_name
    `, [roleId]);
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching role permissions:', error);
    res.status(500).json({ error: 'Failed to fetch role permissions' });
  }
});

export default router;