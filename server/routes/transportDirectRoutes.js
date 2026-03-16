import express from 'express';
import { pool } from '../db.ts';
import { 
  generateTransportNumber, 
  getAllNumberRanges, 
  updateNumberRange, 
  createCustomNumberRange,
  initializeTransportNumbering 
} from '../transport/transportNumbering.js';

const router = express.Router();

/**
 * Get all transport requests with direct SQL queries
 */
router.get('/requests', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        tr.*,
        COUNT(tobj.id)::integer as object_count
      FROM transport_requests tr
      LEFT JOIN transport_objects tobj ON tr.id = tobj.request_id
      GROUP BY tr.id
      ORDER BY tr.created_at DESC
    `);
    
    res.json({
      requests: result.rows,
      summary: {
        total: result.rows.length,
        byStatus: result.rows.reduce((acc, req) => {
          acc[req.status] = (acc[req.status] || 0) + 1;
          return acc;
        }, {}),
        byEnvironment: result.rows.reduce((acc, req) => {
          acc[req.target_environment] = (acc[req.target_environment] || 0) + 1;
          return acc;
        }, {})
      }
    });
  } catch (error) {
    console.error('Error fetching transport requests:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get transport details with objects and logs
 */
router.get('/requests/:id', async (req, res) => {
  try {
    const requestId = parseInt(req.params.id);
    
    // Get transport request
    const transportResult = await pool.query(
      'SELECT * FROM transport_requests WHERE id = $1',
      [requestId]
    );
    
    if (transportResult.rows.length === 0) {
      return res.status(404).json({ error: 'Transport request not found' });
    }
    
    // Get transport objects
    const objectsResult = await pool.query(
      'SELECT * FROM transport_objects WHERE request_id = $1 ORDER BY id',
      [requestId]
    );
    
    // Get transport logs
    const logsResult = await pool.query(
      'SELECT * FROM transport_logs WHERE request_id = $1 ORDER BY executed_at DESC',
      [requestId]
    );
    
    res.json({
      transport: transportResult.rows[0],
      objects: objectsResult.rows,
      logs: logsResult.rows
    });
  } catch (error) {
    console.error('Error fetching transport details:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get available objects for transport creation
 */
router.get('/available-objects', async (req, res) => {
  try {
    const { module = 'all', search = '' } = req.query;
    const objects = [];

    // Define table mappings for different modules
    const moduleTableMapping = {
      'company_codes': { table: 'company_codes', type: 'Master Data', nameField: 'code', descField: 'name' },
      'plants': { table: 'plants', type: 'Master Data', nameField: 'code', descField: 'name' },
      'storage_locations': { table: 'storage_locations', type: 'Master Data', nameField: 'code', descField: 'name' },
      'materials': { table: 'materials', type: 'Master Data', nameField: 'code', descField: 'name' },
      'customers': { table: 'customers', type: 'Master Data', nameField: 'code', descField: 'name' },
      'vendors': { table: 'vendors', type: 'Master Data', nameField: 'code', descField: 'name' },
      'purchase_organizations': { table: 'purchase_organizations', type: 'Master Data', nameField: 'code', descField: 'name' },
      'sales_organizations': { table: 'sales_organizations', type: 'Master Data', nameField: 'code', descField: 'name' },
      'leads': { table: 'leads', type: 'Transactional', nameField: 'title', descField: 'company' },
      'opportunities': { table: 'opportunities', type: 'Transactional', nameField: 'title', descField: 'company' },
      'quotes': { table: 'quotes', type: 'Transactional', nameField: 'quote_number', descField: 'description' },
      'purchase_orders': { table: 'purchase_orders', type: 'Transactional', nameField: 'order_number', descField: 'description' },
      'work_centers': { table: 'work_centers', type: 'Master Data', nameField: 'code', descField: 'name' },
      'cost_centers': { table: 'cost_centers', type: 'Master Data', nameField: 'code', descField: 'name' }
    };

    // Get tables to query based on module selection
    const tablesToQuery = module === 'all' 
      ? Object.entries(moduleTableMapping)
      : [[module, moduleTableMapping[module]]].filter(([_, config]) => config);

    for (const [moduleKey, config] of tablesToQuery) {
      if (!config) continue;

      try {
        let query = `SELECT id, ${config.nameField} as name, ${config.descField} as description, created_at as last_modified FROM ${config.table}`;
        let params = [];

        if (search) {
          query += ` WHERE LOWER(${config.nameField}) LIKE $1 OR LOWER(${config.descField}) LIKE $1`;
          params = [`%${search.toLowerCase()}%`];
        }

        query += ' ORDER BY created_at DESC LIMIT 50';

        const result = await pool.query(query, params);
        
        result.rows.forEach(row => {
          objects.push({
            id: row.id,
            table_name: config.table,
            object_type: config.type,
            object_name: row.name || `${config.table}-${row.id}`,
            description: row.description || '',
            last_modified: row.last_modified
          });
        });
      } catch (error) {
        console.log(`Info: Table ${config.table} not accessible or empty`);
      }
    }

    res.json({ objects });
  } catch (error) {
    console.error('Error fetching available objects:', error);
    res.status(500).json({ error: 'Failed to fetch available objects' });
  }
});

/**
 * Create new transport request
 */
router.post('/create-request', async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const { request_type, description, target_environment, selected_objects } = req.body;
    
    if (!selected_objects || selected_objects.length === 0) {
      return res.status(400).json({ error: 'No objects selected for transport' });
    }

    // Determine object type based on selected objects
    let objectType = 'STANDARD';
    if (selected_objects.some(obj => obj.object_type === 'Custom Development')) {
      objectType = 'CUSTOM_DEV';
    } else if (selected_objects.some(obj => obj.object_type === 'Customer Customization')) {
      objectType = 'CUSTOMER';
    }

    // Generate transport request number using proper numbering system
    const transportNumberInfo = await generateTransportNumber(objectType);
    const requestNumber = transportNumberInfo.number;
    
    // Create transport request
    const requestResult = await client.query(`
      INSERT INTO transport_requests 
      (request_number, request_type, description, owner, status, source_environment, target_environment, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      requestNumber,
      request_type,
      description,
      'SYSTEM_USER',
      'MODIFIABLE',
      'DEV',
      target_environment,
      new Date().toISOString()
    ]);

    const transportId = requestResult.rows[0].id;

    // Add objects to transport
    for (const obj of selected_objects) {
      // Capture current data snapshot
      let dataSnapshot = null;
      try {
        const snapshotResult = await client.query(`SELECT * FROM ${obj.table_name} WHERE id = $1`, [obj.id]);
        dataSnapshot = snapshotResult.rows[0] || null;
      } catch (error) {
        console.log(`Warning: Could not capture snapshot for ${obj.table_name} ID ${obj.id}`);
      }

      await client.query(`
        INSERT INTO transport_objects 
        (request_id, object_type, object_name, table_name, action, created_at, data_snapshot)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        transportId,
        obj.object_type,
        obj.object_name,
        obj.table_name,
        'CREATE',
        new Date().toISOString(),
        JSON.stringify(dataSnapshot)
      ]);
    }

    // Add initial log entry
    await client.query(`
      INSERT INTO transport_logs 
      (request_id, environment, action, status, message, executed_by, executed_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      transportId,
      'DEV',
      'CREATE',
      'SUCCESS',
      `Transport request ${requestNumber} created with ${selected_objects.length} objects`,
      'SYSTEM_USER',
      new Date().toISOString()
    ]);

    await client.query('COMMIT');
    
    res.json({ 
      success: true, 
      request_number: requestNumber,
      transport_id: transportId,
      objects_count: selected_objects.length
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating transport request:', error);
    res.status(500).json({ error: 'Failed to create transport request' });
  } finally {
    client.release();
  }
});

/**
 * Admin: Get all transport number ranges
 */
router.get('/admin/number-ranges', async (req, res) => {
  try {
    const ranges = await getAllNumberRanges();
    res.json({ ranges });
  } catch (error) {
    console.error('Error fetching number ranges:', error);
    res.status(500).json({ error: 'Failed to fetch number ranges' });
  }
});

/**
 * Admin: Update transport number range
 */
router.put('/admin/number-ranges/:id', async (req, res) => {
  try {
    const rangeId = parseInt(req.params.id);
    const updates = req.body;
    
    const updatedRange = await updateNumberRange(rangeId, updates);
    res.json({ range: updatedRange });
  } catch (error) {
    console.error('Error updating number range:', error);
    res.status(500).json({ error: 'Failed to update number range' });
  }
});

/**
 * Admin: Create custom transport number range
 */
router.post('/admin/number-ranges', async (req, res) => {
  try {
    const rangeData = req.body;
    const newRange = await createCustomNumberRange(rangeData);
    res.json({ range: newRange });
  } catch (error) {
    console.error('Error creating number range:', error);
    res.status(500).json({ error: 'Failed to create number range' });
  }
});

export default router;