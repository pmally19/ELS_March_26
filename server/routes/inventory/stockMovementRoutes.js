import express from 'express';
import { pool } from '../../db.ts';

const router = express.Router();

// Get all stock movements with pagination and filtering
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      material_code = '', 
      movement_type = '', 
      plant_code = '',
      date_from = '', 
      date_to = '' 
    } = req.query;
    
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT 
        sm.id,
        sm.document_number,
        sm.posting_date,
        sm.material_code,
        sm.plant_code,
        sm.storage_location,
        sm.movement_type,
        sm.quantity,
        sm.unit,
        sm.unit_price,
        sm.total_value,
        sm.reference_document,
        sm.notes,
        sm.created_at,
        m.name as material_name
      FROM stock_movements sm
      LEFT JOIN materials m ON sm.material_code = m.code
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 0;

    if (material_code) {
      paramCount++;
      query += ` AND sm.material_code ILIKE $${paramCount}`;
      params.push(`%${material_code}%`);
    }

    if (movement_type) {
      paramCount++;
      query += ` AND sm.movement_type = $${paramCount}`;
      params.push(movement_type);
    }

    if (plant_code) {
      paramCount++;
      query += ` AND sm.plant_code = $${paramCount}`;
      params.push(plant_code);
    }

    if (date_from) {
      paramCount++;
      query += ` AND sm.posting_date >= $${paramCount}`;
      params.push(date_from);
    }

    if (date_to) {
      paramCount++;
      query += ` AND sm.posting_date <= $${paramCount}`;
      params.push(date_to);
    }

    query += ` ORDER BY sm.created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    res.json(result.rows || []);
  } catch (error) {
    console.error('Error fetching stock movements:', error);
    res.json([]);
  }
});

// Create stock movement (goods receipt/issue)
router.post('/', async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const {
      material_code,
      plant_code,
      storage_location,
      movement_type,
      quantity,
      unit,
      posting_date,
      reference_document = '',
      notes = ''
    } = req.body;

    // Validation with specific error messages
    if (!material_code) {
      throw new Error('Material code is required');
    }
    
    if (!plant_code) {
      throw new Error('Plant code is required');
    }
    
    if (!storage_location) {
      throw new Error('Storage location is required');
    }
    
    if (!movement_type) {
      throw new Error('Movement type is required');
    }
    
    if (!quantity || quantity === 0) {
      throw new Error('Valid quantity is required');
    }
    
    if (!posting_date) {
      throw new Error('Posting date is required');
    }

    // Create tables if they don't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS stock_movements (
        id SERIAL PRIMARY KEY,
        document_number VARCHAR(50) UNIQUE NOT NULL,
        posting_date DATE NOT NULL,
        material_code VARCHAR(50) NOT NULL,
        plant_code VARCHAR(50) NOT NULL,
        storage_location VARCHAR(50) NOT NULL,
        movement_type VARCHAR(10) NOT NULL,
        quantity DECIMAL(15,3) NOT NULL,
        unit VARCHAR(10),
        reference_document VARCHAR(50),
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        created_by VARCHAR(50) DEFAULT 'system'
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS stock_balances (
        id SERIAL PRIMARY KEY,
        material_code VARCHAR(50) NOT NULL,
        plant_code VARCHAR(50) NOT NULL,
        storage_location VARCHAR(50) NOT NULL,
        quantity DECIMAL(15,3) DEFAULT 0,
        unit VARCHAR(10),
        last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(material_code, plant_code, storage_location)
      )
    `);

    // Validate material exists
    const materialCheck = await client.query(`
      SELECT code, name, unit FROM materials WHERE code = $1
    `, [material_code]);

    if (materialCheck.rows.length === 0) {
      throw new Error(`Material ${material_code} not found`);
    }

    const material = materialCheck.rows[0];
    const materialUnit = unit || material.unit;

    // Validate plant exists
    const plantCheck = await client.query(`
      SELECT code FROM plants WHERE code = $1
    `, [plant_code]);

    if (plantCheck.rows.length === 0) {
      throw new Error(`Plant ${plant_code} not found`);
    }

    // Check movement type and validate stock availability for issues
    const movementTypeCheck = await client.query(`
      SELECT movement_type_code, description, inventory_direction 
      FROM movement_types 
      WHERE movement_type_code = $1
    `, [movement_type]);

    if (movementTypeCheck.rows.length === 0) {
      throw new Error(`Movement type ${movement_type} not found`);
    }

    const movementInfo = movementTypeCheck.rows[0];
    const isIssue = movementInfo.inventory_direction === 'OUT' || 
                   ['601', '261', '551', '702'].includes(movement_type); // Common issue movement types

    // For issues, check if sufficient stock is available
    if (isIssue && quantity > 0) {
      const stockCheck = await client.query(`
        SELECT quantity FROM stock_balances 
        WHERE material_code = $1 AND plant_code = $2 AND storage_location = $3
      `, [material_code, plant_code, storage_location]);

      const currentStock = stockCheck.rows.length > 0 ? stockCheck.rows[0].quantity : 0;
      
      if (currentStock < quantity) {
        throw new Error(`Insufficient stock. Available: ${currentStock} ${materialUnit}, Required: ${quantity} ${materialUnit}`);
      }
    }

    // Generate document number
    const docNumberResult = await client.query(`
      SELECT COALESCE(MAX(CAST(SUBSTRING(document_number FROM 4) AS INTEGER)), 0) + 1 as next_number
      FROM stock_movements 
      WHERE document_number LIKE 'STK%'
    `);
    
    const document_number = `STK${docNumberResult.rows[0].next_number.toString().padStart(6, '0')}`;

    // Insert stock movement
    const movementResult = await client.query(`
      INSERT INTO stock_movements (
        document_number, posting_date, material_code, plant_code,
        storage_location, movement_type, quantity, unit,
        reference_document, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id
    `, [
      document_number, posting_date, material_code, plant_code,
      storage_location, movement_type, quantity, materialUnit,
      reference_document, notes
    ]);

    // Update stock balance
    const stockQuantityChange = isIssue ? -Math.abs(quantity) : Math.abs(quantity);
    
    await client.query(`
      INSERT INTO stock_balances (material_code, plant_code, storage_location, quantity, unit)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (material_code, plant_code, storage_location)
      DO UPDATE SET 
        quantity = stock_balances.quantity + $4,
        last_updated = CURRENT_TIMESTAMP
    `, [material_code, plant_code, storage_location, stockQuantityChange, materialUnit]);

    await client.query('COMMIT');

    res.status(201).json({
      message: 'Stock movement created successfully',
      movement_id: movementResult.rows[0].id,
      document_number,
      quantity_changed: stockQuantityChange
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating stock movement:', error);
    res.status(400).json({ 
      message: error.message || 'Failed to create stock movement'
    });
  } finally {
    client.release();
  }
});

// Get stock balance for specific material/location
router.get('/balance/:material_code/:plant_code/:storage_location', async (req, res) => {
  try {
    const { material_code, plant_code, storage_location } = req.params;
    
    const result = await pool.query(`
      SELECT 
        sb.*,
        m.name as material_name,
        p.name as plant_name
      FROM stock_balances sb
      LEFT JOIN materials m ON sb.material_code = m.code
      LEFT JOIN plants p ON sb.plant_code = p.code
      WHERE sb.material_code = $1 AND sb.plant_code = $2 AND sb.storage_location = $3
    `, [material_code, plant_code, storage_location]);

    if (result.rows.length === 0) {
      return res.json({
        material_code,
        plant_code,
        storage_location,
        quantity: 0,
        unit: null,
        material_name: null,
        plant_name: null
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching stock balance:', error);
    res.status(500).json({ message: 'Failed to fetch stock balance' });
  }
});

// Get stock overview by material
router.get('/overview/:material_code', async (req, res) => {
  try {
    const { material_code } = req.params;
    
    const result = await pool.query(`
      SELECT 
        sb.plant_code,
        sb.storage_location,
        sb.quantity,
        sb.unit,
        sb.last_updated,
        p.name as plant_name,
        m.name as material_name
      FROM stock_balances sb
      LEFT JOIN plants p ON sb.plant_code = p.code
      LEFT JOIN materials m ON sb.material_code = m.code
      WHERE sb.material_code = $1 AND sb.quantity > 0
      ORDER BY sb.plant_code, sb.storage_location
    `, [material_code]);

    const totalStock = result.rows.reduce((sum, row) => sum + parseFloat(row.quantity || 0), 0);

    res.json({
      material_code,
      material_name: result.rows.length > 0 ? result.rows[0].material_name : null,
      total_stock: totalStock,
      unit: result.rows.length > 0 ? result.rows[0].unit : null,
      locations: result.rows
    });
  } catch (error) {
    console.error('Error fetching stock overview:', error);
    res.status(500).json({ message: 'Failed to fetch stock overview' });
  }
});

// Get movement types
router.get('/movement-types', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        movement_type,
        description,
        movement_indicator,
        special_stock_indicator
      FROM movement_types
      WHERE active = true
      ORDER BY movement_type
    `);

    res.json(result.rows || []);
  } catch (error) {
    console.error('Error fetching movement types:', error);
    res.json([]);
  }
});

// Stock transfer between locations
router.post('/transfer', async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const {
      material_code,
      from_plant,
      from_storage_location,
      to_plant,
      to_storage_location,
      quantity,
      posting_date,
      notes = ''
    } = req.body;

    // Validation
    if (!material_code || !from_plant || !from_storage_location || 
        !to_plant || !to_storage_location || !quantity || !posting_date) {
      throw new Error('All transfer details are required');
    }

    if (from_plant === to_plant && from_storage_location === to_storage_location) {
      throw new Error('Source and destination cannot be the same');
    }

    // Check source stock availability
    const sourceStockCheck = await client.query(`
      SELECT quantity, unit FROM stock_balances 
      WHERE material_code = $1 AND plant_code = $2 AND storage_location = $3
    `, [material_code, from_plant, from_storage_location]);

    const sourceStock = sourceStockCheck.rows.length > 0 ? sourceStockCheck.rows[0].quantity : 0;
    const unit = sourceStockCheck.rows.length > 0 ? sourceStockCheck.rows[0].unit : '';

    if (sourceStock < quantity) {
      throw new Error(`Insufficient stock at source. Available: ${sourceStock} ${unit}, Required: ${quantity} ${unit}`);
    }

    // Generate transfer document numbers
    const docResult = await client.query(`
      SELECT COALESCE(MAX(CAST(SUBSTRING(document_number FROM 4) AS INTEGER)), 0) + 1 as next_number
      FROM stock_movements 
      WHERE document_number LIKE 'TRF%'
    `);
    
    const transferNumber = `TRF${docResult.rows[0].next_number.toString().padStart(6, '0')}`;

    // Create issue movement (from source)
    await client.query(`
      INSERT INTO stock_movements (
        document_number, posting_date, material_code, plant_code,
        storage_location, movement_type, quantity, unit,
        reference_document, notes
      ) VALUES ($1, $2, $3, $4, $5, '551', $6, $7, $8, $9)
    `, [
      `${transferNumber}-OUT`, posting_date, material_code, from_plant,
      from_storage_location, quantity, unit, transferNumber, 
      `Transfer to ${to_plant}-${to_storage_location}: ${notes}`
    ]);

    // Create receipt movement (to destination)
    await client.query(`
      INSERT INTO stock_movements (
        document_number, posting_date, material_code, plant_code,
        storage_location, movement_type, quantity, unit,
        reference_document, notes
      ) VALUES ($1, $2, $3, $4, $5, '561', $6, $7, $8, $9)
    `, [
      `${transferNumber}-IN`, posting_date, material_code, to_plant,
      to_storage_location, quantity, unit, transferNumber,
      `Transfer from ${from_plant}-${from_storage_location}: ${notes}`
    ]);

    // Update source stock balance (decrease)
    await client.query(`
      UPDATE stock_balances 
      SET quantity = quantity - $1, last_updated = CURRENT_TIMESTAMP
      WHERE material_code = $2 AND plant_code = $3 AND storage_location = $4
    `, [quantity, material_code, from_plant, from_storage_location]);

    // Update destination stock balance (increase)
    await client.query(`
      INSERT INTO stock_balances (material_code, plant_code, storage_location, quantity, unit)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (material_code, plant_code, storage_location)
      DO UPDATE SET 
        quantity = stock_balances.quantity + $4,
        last_updated = CURRENT_TIMESTAMP
    `, [material_code, to_plant, to_storage_location, quantity, unit]);

    await client.query('COMMIT');

    res.status(201).json({
      message: 'Stock transfer completed successfully',
      transfer_number: transferNumber,
      quantity_transferred: quantity,
      unit
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error processing stock transfer:', error);
    res.status(400).json({ 
      message: error.message || 'Failed to process stock transfer'
    });
  } finally {
    client.release();
  }
});

export default router;