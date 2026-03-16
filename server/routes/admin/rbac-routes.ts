import { Router } from 'express';
import { pool } from '../../db';

const router = Router();

// Get all users with their roles
router.get('/users', async (req, res) => {
  try {
    // Use a safe join that works regardless of whether role_id is stored as int or text
    const result = await pool.query(`
      SELECT 
        u.id,
        u.username,
        u.email,
        u.first_name,
        u.last_name,
        u.is_active,
        u.last_login,
        u.created_at,
        r.id as role_id,
        r.role_name,
        r.role_level
      FROM system_users u
      LEFT JOIN user_roles r ON CAST(u.role_id AS TEXT) = CAST(r.id AS TEXT)
      ORDER BY u.created_at DESC
    `);

    res.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users', details: error.message });
  }
});

// Get all roles
router.get('/roles', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM user_roles 
      WHERE is_active = true 
      ORDER BY role_level DESC, role_name
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching roles:', error);
    res.status(500).json({ error: 'Failed to fetch roles' });
  }
});

// Get all system tiles
router.get('/tiles', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM system_tiles 
      ORDER BY module_group, tile_category, tile_name
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching tiles:', error);
    res.status(500).json({ error: 'Failed to fetch tiles' });
  }
});

// Get role permissions for a specific role - simplified clean response
router.get('/role-permissions/:roleId', async (req, res) => {
  try {
    const { roleId } = req.params;
    console.log('Fetching permissions for role:', roleId);

    // Get all tiles
    const tilesResult = await pool.query(`
      SELECT tile_id, tile_name, module_group 
      FROM system_tiles 
      WHERE is_active = true 
      ORDER BY module_group, tile_name
    `);

    // Get granted permissions for this role - cast roleId to integer
    const permissionsResult = await pool.query(`
      SELECT rtp.tile_id, pa.action_name, rtp.is_granted
      FROM role_tile_permissions rtp
      JOIN permission_actions pa ON rtp.action_id = pa.id
      WHERE rtp.role_id = $1::INTEGER AND rtp.is_granted = true
    `, [roleId]);

    // Build permissions map
    const permissionsMap = {};
    permissionsResult.rows.forEach(row => {
      if (!permissionsMap[row.tile_id]) {
        permissionsMap[row.tile_id] = {};
      }
      // Normalize to titlecase
      const action = row.action_name.charAt(0).toUpperCase() + row.action_name.slice(1).toLowerCase();
      permissionsMap[row.tile_id][action] = true;
    });

    // Build final response with clean permissions structure
    const result = tilesResult.rows.map(tile => ({
      tile_id: tile.tile_id,
      tile_name: tile.tile_name,
      module_group: tile.module_group,
      permissions: {
        View: permissionsMap[tile.tile_id]?.View || false,
        Create: permissionsMap[tile.tile_id]?.Create || false,
        Edit: permissionsMap[tile.tile_id]?.Edit || false,
        Copy: permissionsMap[tile.tile_id]?.Copy || false,
        Deactivate: permissionsMap[tile.tile_id]?.Deactivate || false,
        Export: permissionsMap[tile.tile_id]?.Export || false,
        Import: permissionsMap[tile.tile_id]?.Import || false,
        Approve: permissionsMap[tile.tile_id]?.Approve || false
      }
    }));

    console.log(`Returning ${result.length} tiles with permissions for role ${roleId}`);
    res.json(result);
  } catch (error) {
    console.error('Error fetching role permissions:', error);
    res.status(500).json({ error: 'Failed to fetch role permissions' });
  }
});

// Batch update role permissions with timestamps and CRUD flags
router.post('/batch-permissions', async (req, res) => {
  const client = await pool.connect();
  try {
    const { roleId, permissions } = req.body;
    console.log('Batch RBAC Permission Update:', { roleId, permissionCount: permissions.length });

    if (!roleId || !Array.isArray(permissions) || permissions.length === 0) {
      return res.status(400).json({ error: 'Invalid batch permission data' });
    }

    await client.query('BEGIN');

    const results = [];
    const batchTimestamp = new Date().toISOString();

    for (const permission of permissions) {
      const { tileId, actionName, isGranted } = permission;

      // Get action ID
      const actionResult = await client.query(
        'SELECT id FROM permission_actions WHERE LOWER(action_name) = LOWER($1) LIMIT 1',
        [actionName]
      );

      if (actionResult.rows.length === 0) {
        throw new Error(`Action '${actionName}' not found`);
      }

      const actionId = actionResult.rows[0].id;

      // Upsert permission with batch timestamp and CRUD tracking
      const updateResult = await client.query(`
        INSERT INTO role_tile_permissions (role_id, tile_id, action_id, is_granted, created_by, created_at, updated_at, crud_operation)
        VALUES ($1::INTEGER, $2, $3::INTEGER, $4, 1, $5, $5, 'CREATE')
        ON CONFLICT (role_id, tile_id, action_id) 
        DO UPDATE SET 
          is_granted = EXCLUDED.is_granted,
          updated_at = EXCLUDED.updated_at,
          crud_operation = 'UPDATE'
        RETURNING *
      `, [roleId, tileId, actionId, isGranted, batchTimestamp]);

      results.push(updateResult.rows[0]);
    }

    await client.query('COMMIT');

    console.log(`Batch saved ${results.length} permissions with timestamp: ${batchTimestamp}`);
    res.json({
      success: true,
      message: `Batch updated ${results.length} permissions`,
      timestamp: batchTimestamp,
      results
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Batch RBAC Permission Update Error:', error);
    res.status(500).json({ error: 'Failed to batch update permissions' });
  } finally {
    client.release();
  }
});

// Update role permission - fixed to handle frontend field names
router.post('/role-permissions', async (req, res) => {
  try {
    const { roleId, tileId, actionName, isGranted } = req.body;
    console.log('RBAC Route Handler - Request:', { roleId, tileId, actionName, isGranted });

    // Validate required fields
    if (!roleId || !tileId || !actionName || typeof isGranted !== 'boolean') {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get action ID using case-insensitive search to handle both uppercase and titlecase
    const actionResult = await pool.query(`
      SELECT id FROM permission_actions 
      WHERE LOWER(action_name) = LOWER($1) 
      ORDER BY CASE WHEN action_name = $1 THEN 1 ELSE 2 END 
      LIMIT 1
    `, [actionName]);

    console.log('Action query result:', actionResult.rows);

    if (actionResult.rows.length === 0) {
      return res.status(400).json({ error: `Action '${actionName}' not found` });
    }

    const actionId = actionResult.rows[0].id;
    console.log('Using action ID:', actionId);

    // Upsert permission with CRUD tracking
    const updateResult = await pool.query(`
      INSERT INTO role_tile_permissions (role_id, tile_id, action_id, is_granted, created_by, created_at, updated_at, crud_operation)
      VALUES ($1::INTEGER, $2, $3::INTEGER, $4, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'CREATE')
      ON CONFLICT (role_id, tile_id, action_id) 
      DO UPDATE SET 
        is_granted = EXCLUDED.is_granted,
        updated_at = CURRENT_TIMESTAMP,
        crud_operation = 'UPDATE'
      RETURNING *
    `, [roleId, tileId, actionId, isGranted]);

    console.log('Permission update result:', updateResult.rows[0]);

    // Log the permission change
    await pool.query(`
      INSERT INTO permission_audit_log (
        user_id, action_type, tile_id, role_id, permission_details
      ) VALUES (1, $1, $2, $3, $4)
    `, [
      isGranted ? 'GRANT' : 'REVOKE',
      tileId,
      roleId,
      JSON.stringify({ actionName, isGranted })
    ]);

    res.json({ success: true, message: 'Permission updated successfully', data: updateResult.rows[0] });
  } catch (error) {
    console.error('Error updating permission:', error);
    res.status(500).json({ error: 'Failed to update permission', details: error.message });
  }
});

// Create new user
router.post('/users', async (req, res) => {
  try {
    const { username, email, first_name, last_name, role_id, password_hash } = req.body;

    // Cast role_id to integer if provided, otherwise NULL
    const roleIdValue = role_id ? role_id : null;

    const result = await pool.query(`
      INSERT INTO system_users (username, email, first_name, last_name, role_id, password_hash)
      VALUES ($1, $2, $3, $4, $5::TEXT, $6)
      RETURNING id, username, email, first_name, last_name
    `, [username, email, first_name, last_name, roleIdValue, password_hash || '$2b$10$defaulthash']);

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error creating user:', error);
    if (error.code === '23505') { // Unique constraint violation
      res.status(400).json({ error: 'Username or email already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create user', details: error.message });
    }
  }
});

// Update user
router.put('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { email, first_name, last_name, role_id, is_active } = req.body;

    // Build update query dynamically
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (email !== undefined) {
      updates.push(`email = $${paramCount++}`);
      values.push(email);
    }
    if (first_name !== undefined) {
      updates.push(`first_name = $${paramCount++}`);
      values.push(first_name);
    }
    if (last_name !== undefined) {
      updates.push(`last_name = $${paramCount++}`);
      values.push(last_name);
    }
    if (role_id !== undefined) {
      updates.push(`role_id = $${paramCount++}::TEXT`);
      values.push(role_id);
    }
    if (is_active !== undefined) {
      updates.push(`is_active = $${paramCount++}`);
      values.push(is_active);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields provided for update' });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `
      UPDATE system_users
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, username, email, first_name, last_name, role_id, is_active
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error updating user:', error);
    if (error.code === '23505') {
      res.status(400).json({ error: 'Email already exists' });
    } else {
      res.status(500).json({ error: 'Failed to update user', details: error.message });
    }
  }
});

// Delete user
router.delete('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Hard delete for now, or could implement soft delete
    const result = await pool.query(`
      DELETE FROM system_users WHERE id = $1 RETURNING id
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ success: true, message: 'User deleted successfully', id });
  } catch (error: any) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user', details: error.message });
  }
});

// Toggle user active status
router.post('/users/:userId/toggle', async (req, res) => {
  try {
    const { userId } = req.params;
    // Handle both JSON body and query parameters
    let is_active: boolean;

    if (req.body && typeof req.body === 'object' && 'is_active' in req.body) {
      is_active = req.body.is_active;
    } else if (req.body && typeof req.body === 'boolean') {
      is_active = req.body;
    } else if (req.query && req.query.is_active) {
      is_active = req.query.is_active === 'true' || req.query.is_active === '1';
    } else {
      // If no value provided, toggle the current status
      const currentUser = await pool.query(`
        SELECT is_active FROM system_users WHERE id = $1::INTEGER
      `, [userId]);

      if (currentUser.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      is_active = !currentUser.rows[0].is_active;
    }

    await pool.query(`
      UPDATE system_users 
      SET is_active = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2::INTEGER
    `, [is_active, userId]);

    res.json({ success: true, is_active });
  } catch (error: any) {
    console.error('Error toggling user status:', error);
    res.status(500).json({ error: 'Failed to update user status', details: error.message });
  }
});

// Get user permissions for middleware
router.get('/user-permissions/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const result = await pool.query(`
      SELECT 
        st.tile_id,
        st.route_path,
        json_object_agg(
          pa.action_name,
          COALESCE(rtp.is_granted, false)
        ) as permissions
      FROM system_users u
      JOIN user_roles ur ON CAST(u.role_id AS INTEGER) = ur.id
      CROSS JOIN system_tiles st
      CROSS JOIN permission_actions pa
      LEFT JOIN role_tile_permissions rtp ON (
        rtp.role_id = ur.id 
        AND rtp.tile_id = st.tile_id 
        AND rtp.action_id = pa.id
        AND rtp.is_granted = true
      )
      WHERE u.id = $1::INTEGER AND u.is_active = true AND st.is_active = true
      GROUP BY st.tile_id, st.route_path
    `, [userId]);

    res.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching user permissions:', error);
    // Try with explicit cast using :: operator
    try {
      const result = await pool.query(`
        SELECT 
          st.tile_id,
          st.route_path,
          json_object_agg(
            pa.action_name,
            COALESCE(rtp.is_granted, false)
          ) as permissions
        FROM system_users u
        JOIN user_roles ur ON u.role_id::INTEGER = ur.id
        CROSS JOIN system_tiles st
        CROSS JOIN permission_actions pa
        LEFT JOIN role_tile_permissions rtp ON (
          rtp.role_id = ur.id 
          AND rtp.tile_id = st.tile_id 
          AND rtp.action_id = pa.id
          AND rtp.is_granted = true
        )
        WHERE u.id = $1::INTEGER AND u.is_active = true AND st.is_active = true
        GROUP BY st.tile_id, st.route_path
      `, [userId]);
      res.json(result.rows);
    } catch (fallbackError: any) {
      res.status(500).json({
        error: 'Failed to fetch user permissions',
        details: fallbackError.message
      });
    }
  }
});

// Copy tile permissions from one role to another
router.post('/copy-permissions', async (req, res) => {
  try {
    const { source_role_id, target_role_id, tile_ids } = req.body;

    // Copy permissions for specified tiles
    const tileFilter = tile_ids ? 'AND rtp.tile_id = ANY($3)' : '';
    const params = tile_ids ? [source_role_id, target_role_id, tile_ids] : [source_role_id, target_role_id];

    await pool.query(`
      INSERT INTO role_tile_permissions (role_id, tile_id, action_id, is_granted, created_by)
      SELECT $2::INTEGER, rtp.tile_id, rtp.action_id, rtp.is_granted, 1
      FROM role_tile_permissions rtp
      WHERE rtp.role_id = $1::INTEGER AND rtp.is_granted = true ${tileFilter}
      ON CONFLICT (role_id, tile_id, action_id) 
      DO UPDATE SET 
        is_granted = EXCLUDED.is_granted,
        created_at = CURRENT_TIMESTAMP
    `, params);

    res.json({ success: true });
  } catch (error) {
    console.error('Error copying permissions:', error);
    res.status(500).json({ error: 'Failed to copy permissions' });
  }
});

export default router;