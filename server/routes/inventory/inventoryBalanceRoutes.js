import express from 'express';
import { pool } from '../../db.ts';

const router = express.Router();

// Create stock_balances table if it doesn't exist
// Following ERP inventory management principles: track stock by type (available, blocked, quality_inspection)
const createStockBalancesTable = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS stock_balances (
        id SERIAL PRIMARY KEY,
        material_code VARCHAR(50) NOT NULL,
        plant_code VARCHAR(50) NOT NULL,
        storage_location VARCHAR(50) NOT NULL,
        -- Total quantity in this location
        quantity DECIMAL(15,3) DEFAULT 0,
        -- Available quantity (can be used for sales/production)
        available_quantity DECIMAL(15,3) DEFAULT 0,
        -- Reserved quantity (allocated to sales orders/deliveries)
        reserved_quantity DECIMAL(15,3) DEFAULT 0,
        -- Committed quantity (allocated to production orders)
        committed_quantity DECIMAL(15,3) DEFAULT 0,
        -- Ordered quantity (on order from suppliers)
        ordered_quantity DECIMAL(15,3) DEFAULT 0,
        -- Blocked quantity (damaged, expired, or blocked for other reasons)
        blocked_quantity DECIMAL(15,3) DEFAULT 0,
        -- Quality inspection quantity (pending quality check)
        quality_inspection_quantity DECIMAL(15,3) DEFAULT 0,
        -- Stock type: 'AVAILABLE', 'BLOCKED', 'QUALITY_INSPECTION'
        stock_type VARCHAR(20) DEFAULT 'AVAILABLE',
        unit VARCHAR(10) NOT NULL,
        moving_average_price DECIMAL(15,2) DEFAULT 0,
        total_value DECIMAL(15,2) DEFAULT 0,
        last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(material_code, plant_code, storage_location, stock_type)
      )
    `);
    
    // Add columns if they don't exist (migration support)
    const columnsToAdd = [
      { name: 'reserved_quantity', type: 'DECIMAL(15,3) DEFAULT 0' },
      { name: 'committed_quantity', type: 'DECIMAL(15,3) DEFAULT 0' },
      { name: 'ordered_quantity', type: 'DECIMAL(15,3) DEFAULT 0' },
      { name: 'blocked_quantity', type: 'DECIMAL(15,3) DEFAULT 0' },
      { name: 'quality_inspection_quantity', type: 'DECIMAL(15,3) DEFAULT 0' },
      { name: 'stock_type', type: "VARCHAR(20) DEFAULT 'AVAILABLE'" }
    ];
    
    for (const col of columnsToAdd) {
      await pool.query(`
        DO $$ 
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'stock_balances' AND column_name = '${col.name}'
          ) THEN
            ALTER TABLE stock_balances ADD COLUMN ${col.name} ${col.type};
          END IF;
        END $$;
      `);
    }
    
    // Update unique constraint to include stock_type if it doesn't exist
    try {
      await pool.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'stock_balances_material_plant_location_type_key'
          ) THEN
            -- Drop old unique constraint if exists
            ALTER TABLE stock_balances DROP CONSTRAINT IF EXISTS stock_balances_material_code_plant_code_storage_location_key;
            -- Add new unique constraint with stock_type
            ALTER TABLE stock_balances ADD CONSTRAINT stock_balances_material_plant_location_type_key 
              UNIQUE(material_code, plant_code, storage_location, stock_type);
          END IF;
        END $$;
      `);
    } catch (constraintError) {
      // Constraint might already exist or table structure different, continue
      console.log('Note: Unique constraint update skipped (may already exist)');
    }
    
    console.log('✅ stock_balances table verified/created with all required columns and stock types');
  } catch (error) {
    console.error('Error creating stock_balances table:', error);
  }
};

// Initialize table on startup
createStockBalancesTable();

// Get all stock balances with filtering
router.get('/balances', async (req, res) => {
  try {
    // Ensure table exists first
    await createStockBalancesTable();
    
    const { 
      material_code = '',
      plant_code = '',
      low_stock_only = false,
      page = 1,
      limit = 100
    } = req.query;
    
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT 
        sb.*,
        m.name as material_name,
        p.name as plant_name
      FROM stock_balances sb
      LEFT JOIN materials m ON sb.material_code = m.code
      LEFT JOIN plants p ON sb.plant_code = p.code
      WHERE 1=1
    `;
    
    const params = [];
    let paramCount = 0;
    
    if (material_code) {
      paramCount++;
      query += ` AND sb.material_code ILIKE $${paramCount}`;
      params.push(`%${material_code}%`);
    }
    
    if (plant_code) {
      paramCount++;
      query += ` AND sb.plant_code = $${paramCount}`;
      params.push(plant_code);
    }
    
    if (low_stock_only === 'true') {
      query += ` AND sb.available_quantity < 10`;
    }
    
    query += ` ORDER BY sb.material_code, sb.plant_code, sb.storage_location`;
    query += ` LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(limit, offset);
    
    const result = await pool.query(query, params);
    res.json(result.rows || []);
  } catch (error) {
    console.error('Error fetching stock balances:', error);
    res.json([]);
  }
});

// Get inventory statistics
router.get('/stats', async (req, res) => {
  try {
    // Ensure table exists first
    await createStockBalancesTable();
    
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_items,
        COALESCE(SUM(total_value), 0) as total_value,
        COALESCE(SUM(CASE WHEN available_quantity < 10 THEN 1 ELSE 0 END), 0) as low_stock_items,
        COALESCE(AVG(moving_average_price), 0) as avg_price
      FROM stock_balances
      WHERE quantity > 0
    `);
    
    const stats = result.rows[0] || {
      total_items: 0,
      total_value: 0,
      low_stock_items: 0,
      avg_price: 0
    };
    
    res.json({
      totalItems: parseInt(stats.total_items) || 0,
      totalValue: parseFloat(stats.total_value) || 0,
      lowStockItems: parseInt(stats.low_stock_items) || 0,
      averagePrice: parseFloat(stats.avg_price) || 0
    });
  } catch (error) {
    console.error('Error fetching inventory stats:', error);
    res.json({
      totalItems: 0,
      totalValue: 0,
      lowStockItems: 0,
      averagePrice: 0
    });
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
        sb.available_quantity,
        sb.reserved_quantity,
        sb.unit,
        sb.moving_average_price,
        sb.total_value,
        sb.last_updated,
        p.name as plant_name,
        m.name as material_name
      FROM stock_balances sb
      LEFT JOIN plants p ON sb.plant_code = p.code
      LEFT JOIN materials m ON sb.material_code = m.code
      WHERE sb.material_code = $1
      ORDER BY sb.plant_code, sb.storage_location
    `, [material_code]);
    
    const totalStock = result.rows.reduce((sum, row) => sum + parseFloat(row.quantity || 0), 0);
    const totalValue = result.rows.reduce((sum, row) => sum + parseFloat(row.total_value || 0), 0);
    
    res.json({
      material_code,
      material_name: result.rows.length > 0 ? result.rows[0].material_name : null,
      total_stock: totalStock,
      total_value: totalValue,
      unit: result.rows.length > 0 ? result.rows[0].unit : null,
      locations: result.rows
    });
  } catch (error) {
    console.error('Error fetching stock overview:', error);
    res.status(500).json({ message: 'Failed to fetch stock overview' });
  }
});

// Update stock balance (used internally by stock movements)
router.put('/update-balance', async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const {
      material_code,
      plant_code,
      storage_location,
      quantity_change,
      unit,
      price_update = null
    } = req.body;
    
    // Update stock balance
    const updateQuery = `
      INSERT INTO stock_balances (material_code, plant_code, storage_location, quantity, unit, available_quantity, last_updated)
      VALUES ($1, $2, $3, $4, $5, $4, CURRENT_TIMESTAMP)
      ON CONFLICT (material_code, plant_code, storage_location)
      DO UPDATE SET 
        quantity = stock_balances.quantity + $4,
        available_quantity = stock_balances.quantity + $4,
        last_updated = CURRENT_TIMESTAMP,
        moving_average_price = CASE 
          WHEN $6 IS NOT NULL THEN $6 
          ELSE stock_balances.moving_average_price 
        END,
        total_value = (stock_balances.quantity + $4) * COALESCE($6, stock_balances.moving_average_price)
      RETURNING *
    `;
    
    const result = await client.query(updateQuery, [
      material_code, plant_code, storage_location, quantity_change, unit, price_update
    ]);
    
    await client.query('COMMIT');
    
    res.json({
      success: true,
      updated_balance: result.rows[0]
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating stock balance:', error);
    res.status(500).json({ 
      success: false,
      message: error.message || 'Failed to update stock balance'
    });
  } finally {
    client.release();
  }
});

// Physical inventory operations
router.get('/physical-inventory', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        pi.*,
        m.name as material_name,
        p.name as plant_name
      FROM physical_inventory pi
      LEFT JOIN materials m ON pi.material_code = m.code
      LEFT JOIN plants p ON pi.plant_code = p.code
      ORDER BY pi.created_at DESC
    `);
    
    res.json(result.rows || []);
  } catch (error) {
    console.error('Error fetching physical inventory:', error);
    res.json([]);
  }
});

router.post('/physical-inventory', async (req, res) => {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const {
      material_code,
      plant_code,
      storage_location,
      counted_quantity,
      counter_name,
      variance_reason = ''
    } = req.body;
    
    // Get current book quantity
    const balanceResult = await client.query(`
      SELECT quantity FROM stock_balances 
      WHERE material_code = $1 AND plant_code = $2 AND storage_location = $3
    `, [material_code, plant_code, storage_location]);
    
    const book_quantity = balanceResult.rows.length > 0 ? balanceResult.rows[0].quantity : 0;
    const difference_quantity = counted_quantity - book_quantity;
    
    // Generate inventory document number
    const docResult = await client.query(`
      SELECT COALESCE(MAX(CAST(SUBSTRING(inventory_document FROM 3) AS INTEGER)), 0) + 1 as next_number
      FROM physical_inventory 
      WHERE inventory_document LIKE 'PI%'
    `);
    
    const inventory_document = `PI${docResult.rows[0].next_number.toString().padStart(6, '0')}`;
    
    // Insert physical inventory record
    const inventoryResult = await client.query(`
      INSERT INTO physical_inventory (
        inventory_document, material_code, plant_code, storage_location,
        book_quantity, counted_quantity, difference_quantity, unit,
        count_date, counter_name, status, variance_reason
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'PCS', CURRENT_DATE, $8, 'COUNTED', $9)
      RETURNING *
    `, [
      inventory_document, material_code, plant_code, storage_location,
      book_quantity, counted_quantity, difference_quantity, counter_name, variance_reason
    ]);
    
    await client.query('COMMIT');
    
    res.status(201).json({
      message: 'Physical inventory count recorded successfully',
      inventory: inventoryResult.rows[0],
      requires_posting: Math.abs(difference_quantity) > 0
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error recording physical inventory:', error);
    res.status(400).json({ 
      message: error.message || 'Failed to record physical inventory'
    });
  } finally {
    client.release();
  }
});

// Valuation methods endpoint
router.get('/valuation-methods', async (req, res) => {
  try {
    const methods = [
      {
        id: 'moving_average',
        name: 'Moving Average',
        description: 'Continuously updated average price based on all transactions',
        status: 'active',
        accuracy: 'high'
      },
      {
        id: 'fifo',
        name: 'First In, First Out (FIFO)',
        description: 'Oldest inventory items are consumed first',
        status: 'planned',
        accuracy: 'very_high'
      },
      {
        id: 'lifo',
        name: 'Last In, First Out (LIFO)',
        description: 'Newest inventory items are consumed first',
        status: 'planned',
        accuracy: 'high'
      },
      {
        id: 'standard',
        name: 'Standard Cost',
        description: 'Fixed predetermined cost for consistent pricing',
        status: 'planned',
        accuracy: 'medium'
      }
    ];
    
    res.json(methods);
  } catch (error) {
    console.error('Error fetching valuation methods:', error);
    res.json([]);
  }
});

export default router;