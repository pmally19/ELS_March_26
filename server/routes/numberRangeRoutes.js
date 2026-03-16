import express from 'express';
import { pool } from '../db.ts';

const router = express.Router();

/**
 * Initialize number range management system
 */
router.post('/initialize', async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Create number ranges table
    await client.query(`
      CREATE TABLE IF NOT EXISTS number_ranges (
        id SERIAL PRIMARY KEY,
        range_id VARCHAR(20) UNIQUE NOT NULL,
        object_type VARCHAR(30) NOT NULL,
        company_code VARCHAR(4),
        sales_organization VARCHAR(4),
        plant_code VARCHAR(4),
        range_from BIGINT NOT NULL,
        range_to BIGINT NOT NULL,
        current_number BIGINT NOT NULL,
        increment INTEGER DEFAULT 1,
        prefix VARCHAR(10) DEFAULT '',
        suffix VARCHAR(10) DEFAULT '',
        status VARCHAR(10) DEFAULT 'ACTIVE',
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create number range assignments table
    await client.query(`
      CREATE TABLE IF NOT EXISTS number_range_assignments (
        id SERIAL PRIMARY KEY,
        range_id VARCHAR(20) REFERENCES number_ranges(range_id),
        assignment_type VARCHAR(30) NOT NULL,
        assignment_value VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Insert default number ranges for all object types
    const defaultRanges = [
      // GL Account ranges
      {
        range_id: 'GL_ASSET',
        object_type: 'GL_ACCOUNT',
        range_from: 1000000,
        range_to: 1999999,
        current_number: 1000000,
        description: 'Asset GL Accounts'
      },
      {
        range_id: 'GL_LIABILITY',
        object_type: 'GL_ACCOUNT', 
        range_from: 2000000,
        range_to: 2999999,
        current_number: 2000000,
        description: 'Liability GL Accounts'
      },
      {
        range_id: 'GL_EQUITY',
        object_type: 'GL_ACCOUNT',
        range_from: 3000000,
        range_to: 3999999,
        current_number: 3000000,
        description: 'Equity GL Accounts'
      },
      {
        range_id: 'GL_REVENUE',
        object_type: 'GL_ACCOUNT',
        range_from: 4000000,
        range_to: 4999999,
        current_number: 4000000,
        description: 'Revenue GL Accounts'
      },
      {
        range_id: 'GL_EXPENSE',
        object_type: 'GL_ACCOUNT',
        range_from: 5000000,
        range_to: 9999999,
        current_number: 5000000,
        description: 'Expense GL Accounts'
      },
      // Customer ranges
      {
        range_id: 'CUST_DOMESTIC',
        object_type: 'CUSTOMER',
        range_from: 10000,
        range_to: 69999,
        current_number: 10000,
        prefix: 'C',
        description: 'Domestic Customers'
      },
      {
        range_id: 'CUST_EXPORT',
        object_type: 'CUSTOMER',
        range_from: 70000,
        range_to: 99999,
        current_number: 70000,
        prefix: 'C',
        description: 'Export Customers'
      },
      // Vendor ranges
      {
        range_id: 'VEND_DOMESTIC',
        object_type: 'VENDOR',
        range_from: 20000,
        range_to: 29999,
        current_number: 20000,
        prefix: 'V',
        description: 'Domestic Vendors'
      },
      {
        range_id: 'VEND_FOREIGN',
        object_type: 'VENDOR',
        range_from: 30000,
        range_to: 39999,
        current_number: 30000,
        prefix: 'V',
        description: 'Foreign Vendors'
      },
      // Asset ranges
      {
        range_id: 'ASSET_BUILDING',
        object_type: 'ASSET',
        range_from: 100000,
        range_to: 199999,
        current_number: 100000,
        prefix: 'A',
        description: 'Building Assets'
      },
      {
        range_id: 'ASSET_MACHINERY',
        object_type: 'ASSET',
        range_from: 200000,
        range_to: 299999,
        current_number: 200000,
        prefix: 'A',
        description: 'Machinery Assets'
      },
      {
        range_id: 'ASSET_VEHICLE',
        object_type: 'ASSET',
        range_from: 300000,
        range_to: 399999,
        current_number: 300000,
        prefix: 'A',
        description: 'Vehicle Assets'
      },
      {
        range_id: 'ASSET_IT',
        object_type: 'ASSET',
        range_from: 400000,
        range_to: 499999,
        current_number: 400000,
        prefix: 'A',
        description: 'IT Equipment Assets'
      },
      // Purchase Order ranges
      {
        range_id: 'PO_STANDARD',
        object_type: 'PURCHASE_ORDER',
        range_from: 4500000000,
        range_to: 4549999999,
        current_number: 4500000000,
        description: 'Standard Purchase Orders'
      },
      {
        range_id: 'PO_SERVICE',
        object_type: 'PURCHASE_ORDER',
        range_from: 4550000000,
        range_to: 4559999999,
        current_number: 4550000000,
        description: 'Service Purchase Orders'
      },
      {
        range_id: 'PO_CONSIGNMENT',
        object_type: 'PURCHASE_ORDER',
        range_from: 4560000000,
        range_to: 4569999999,
        current_number: 4560000000,
        description: 'Consignment Purchase Orders'
      },
      // Sales Order ranges
      {
        range_id: 'SO_STANDARD',
        object_type: 'SALES_ORDER',
        range_from: 1000000,
        range_to: 1999999,
        current_number: 1000000,
        prefix: 'SO',
        description: 'Standard Sales Orders'
      },
      {
        range_id: 'SO_EXPORT',
        object_type: 'SALES_ORDER',
        range_from: 2000000,
        range_to: 2999999,
        current_number: 2000000,
        prefix: 'SO',
        description: 'Export Sales Orders'
      },
      // Material ranges
      {
        range_id: 'MAT_RAW',
        object_type: 'MATERIAL',
        range_from: 1000000,
        range_to: 1999999,
        current_number: 1000000,
        prefix: 'MAT',
        description: 'Raw Materials'
      },
      {
        range_id: 'MAT_SEMI',
        object_type: 'MATERIAL',
        range_from: 2000000,
        range_to: 2999999,
        current_number: 2000000,
        prefix: 'MAT',
        description: 'Semi-Finished Materials'
      },
      {
        range_id: 'MAT_FINISHED',
        object_type: 'MATERIAL',
        range_from: 3000000,
        range_to: 3999999,
        current_number: 3000000,
        prefix: 'MAT',
        description: 'Finished Products'
      }
    ];

    // Insert all default ranges
    for (const range of defaultRanges) {
      await client.query(`
        INSERT INTO number_ranges 
        (range_id, object_type, range_from, range_to, current_number, prefix, suffix, description)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (range_id) DO NOTHING
      `, [
        range.range_id,
        range.object_type,
        range.range_from,
        range.range_to,
        range.current_number,
        range.prefix || '',
        range.suffix || '',
        range.description
      ]);
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Number range management system initialized successfully',
      ranges_created: defaultRanges.length
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error initializing number ranges:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to initialize number range system'
    });
  } finally {
    client.release();
  }
});

/**
 * Get next number from a range
 */
router.post('/get-next-number', async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const { range_id, company_code, sales_organization, plant_code } = req.body;

    if (!range_id) {
      return res.status(400).json({
        success: false,
        error: 'Range ID is required'
      });
    }

    // Get current range
    const rangeResult = await client.query(`
      SELECT * FROM number_ranges 
      WHERE range_id = $1 AND status = 'ACTIVE'
    `, [range_id]);

    if (rangeResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Number range not found or inactive'
      });
    }

    const range = rangeResult.rows[0];

    // Check if range is exhausted
    if (range.current_number >= range.range_to) {
      return res.status(400).json({
        success: false,
        error: 'Number range exhausted',
        range_id: range_id,
        suggestion: 'Create new range or extend existing range'
      });
    }

    // Get next number
    const nextNumber = range.current_number;
    const formattedNumber = `${range.prefix}${nextNumber}${range.suffix}`;

    // Update current number
    await client.query(`
      UPDATE number_ranges 
      SET current_number = current_number + increment,
          updated_at = CURRENT_TIMESTAMP
      WHERE range_id = $1
    `, [range_id]);

    // Log number assignment
    await client.query(`
      INSERT INTO number_assignments 
      (range_id, assigned_number, formatted_number, company_code, sales_organization, plant_code, assigned_at)
      VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
    `, [range_id, nextNumber, formattedNumber, company_code, sales_organization, plant_code]);

    await client.query('COMMIT');

    res.json({
      success: true,
      range_id: range_id,
      assigned_number: nextNumber,
      formatted_number: formattedNumber,
      next_available: range.current_number + range.increment,
      range_remaining: range.range_to - (range.current_number + range.increment)
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error getting next number:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get next number'
    });
  } finally {
    client.release();
  }
});

/**
 * Get all number ranges by object type
 */
router.get('/ranges/:objectType', async (req, res) => {
  try {
    const { objectType } = req.params;

    const result = await pool.query(`
      SELECT 
        range_id,
        object_type,
        company_code,
        range_from,
        range_to,
        current_number,
        prefix,
        suffix,
        description,
        status,
        (range_to - current_number) as remaining_count,
        ROUND(((current_number - range_from) * 100.0 / (range_to - range_from)), 2) as utilization_percentage
      FROM number_ranges 
      WHERE object_type = $1
      ORDER BY range_id
    `, [objectType]);

    res.json({
      success: true,
      object_type: objectType,
      ranges: result.rows
    });

  } catch (error) {
    console.error('Error fetching number ranges:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch number ranges'
    });
  }
});

/**
 * Create custom number range
 */
router.post('/create-range', async (req, res) => {
  try {
    const {
      range_id,
      object_type,
      company_code,
      range_from,
      range_to,
      prefix = '',
      suffix = '',
      description
    } = req.body;

    // Validate required fields
    if (!range_id || !object_type || !range_from || !range_to) {
      return res.status(400).json({
        success: false,
        error: 'Range ID, object type, range_from, and range_to are required'
      });
    }

    // Check for overlapping ranges
    const overlapCheck = await pool.query(`
      SELECT range_id FROM number_ranges 
      WHERE object_type = $1 
      AND company_code = $2
      AND (
        (range_from <= $3 AND range_to >= $3) OR 
        (range_from <= $4 AND range_to >= $4) OR
        (range_from >= $3 AND range_to <= $4)
      )
    `, [object_type, company_code, range_from, range_to]);

    if (overlapCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Range overlaps with existing range',
        conflicting_range: overlapCheck.rows[0].range_id
      });
    }

    // Create new range
    const result = await pool.query(`
      INSERT INTO number_ranges 
      (range_id, object_type, company_code, range_from, range_to, current_number, prefix, suffix, description)
      VALUES ($1, $2, $3, $4, $5, $4, $6, $7, $8)
      RETURNING *
    `, [range_id, object_type, company_code, range_from, range_to, prefix, suffix, description]);

    res.json({
      success: true,
      message: 'Number range created successfully',
      range: result.rows[0]
    });

  } catch (error) {
    console.error('Error creating number range:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create number range'
    });
  }
});

/**
 * Get number range utilization report
 */
router.get('/utilization-report', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        object_type,
        COUNT(*) as total_ranges,
        SUM(current_number - range_from) as total_assigned,
        SUM(range_to - range_from + 1) as total_capacity,
        ROUND(AVG((current_number - range_from) * 100.0 / (range_to - range_from)), 2) as avg_utilization,
        COUNT(CASE WHEN (range_to - current_number) < 1000 THEN 1 END) as ranges_near_exhaustion
      FROM number_ranges 
      WHERE status = 'ACTIVE'
      GROUP BY object_type
      ORDER BY object_type
    `);

    res.json({
      success: true,
      utilization_report: result.rows
    });

  } catch (error) {
    console.error('Error generating utilization report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate utilization report'
    });
  }
});

/**
 * Transport number range configuration
 */
router.post('/transport-range-config', async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    const { transport_id, range_configs } = req.body;

    // Create transport for number range configuration
    const transportResult = await client.query(`
      INSERT INTO transport_requests 
      (request_number, request_type, description, status, target_environment, created_by)
      VALUES ($1, 'NUMBER_RANGE_CONFIG', $2, 'MODIFIABLE', 'QA', 1)
      RETURNING *
    `, [transport_id, 'Number Range Configuration Transport']);

    const transport = transportResult.rows[0];

    // Add each range configuration as transport object
    for (const rangeConfig of range_configs) {
      await client.query(`
        INSERT INTO transport_objects 
        (request_id, object_type, object_name, table_name, data_snapshot, created_at)
        VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
      `, [
        transport.id,
        'NUMBER_RANGE',
        rangeConfig.range_id,
        'number_ranges',
        JSON.stringify(rangeConfig)
      ]);
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      transport: transport,
      objects_added: range_configs.length,
      message: 'Number range configuration transport created successfully'
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating number range transport:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create number range transport'
    });
  } finally {
    client.release();
  }
});

export default router;