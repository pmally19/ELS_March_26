import express from 'express';
import pkg from 'pg';
const { Pool } = pkg;

const router = express.Router();

// Initialize connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// GET all inventory items with stock levels
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT DISTINCT
        m.id, m.code as item_code, m.name as item_name,
        m.base_uom as unit, m.type as item_type,
        m.base_unit_price, m.cost,
        COALESCE(ib.quantity, 0) as stock_quantity,
        COALESCE(ib.available_quantity, 0) as available_quantity,
        COALESCE(ib.reserved_quantity, 0) as reserved_quantity,
        COALESCE(ib.moving_average_price, m.base_unit_price) as current_price,
        ib.storage_location_code, ib.plant_code,
        m.created_at, m.updated_at
      FROM materials m
      LEFT JOIN inventory_balance ib ON m.code = ib.material_code
      WHERE m.active = true
      ORDER BY m.code ASC
    `);
    
    console.log(`✅ Inventory Items fetched: ${result.rows.length} records`);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching inventory items:', error);
    res.status(500).json({ message: 'Failed to fetch inventory items', error: error.message });
  }
});

// GET inventory item by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT 
        m.*,
        COALESCE(ib.quantity, 0) as stock_quantity,
        COALESCE(ib.available_quantity, 0) as available_quantity,
        COALESCE(ib.reserved_quantity, 0) as reserved_quantity,
        ib.storage_location_code, ib.plant_code, ib.last_movement_date
      FROM materials m
      LEFT JOIN inventory_balance ib ON m.material_number = ib.material_number
      WHERE m.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Inventory item not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching inventory item:', error);
    res.status(500).json({ message: 'Failed to fetch inventory item', error: error.message });
  }
});

// GET inventory movements for an item
router.get('/:id/movements', async (req, res) => {
  try {
    const { id } = req.params;
    
    // First get the material number
    const materialResult = await pool.query('SELECT material_number FROM materials WHERE id = $1', [id]);
    if (materialResult.rows.length === 0) {
      return res.status(404).json({ message: 'Material not found' });
    }
    
    const materialNumber = materialResult.rows[0].material_number;
    
    const result = await pool.query(`
      SELECT 
        sm.id, sm.movement_type, sm.posting_date, sm.quantity, 
        sm.unit_of_measure, sm.reference_document, sm.description,
        sm.storage_location_from, sm.storage_location_to,
        sm.created_at
      FROM stock_movements sm
      WHERE sm.material_number = $1
      ORDER BY sm.posting_date DESC, sm.created_at DESC
      LIMIT 50
    `, [materialNumber]);
    
    console.log(`✅ Inventory movements fetched: ${result.rows.length} records for material ${materialNumber}`);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching inventory movements:', error);
    res.status(500).json({ message: 'Failed to fetch inventory movements', error: error.message });
  }
});

// POST create stock movement (receipt/issue)
router.post('/:id/movement', async (req, res) => {
  try {
    const { id } = req.params;
    const { movement_type, quantity, unit_of_measure, reference_document, description, storage_location } = req.body;
    
    // Validate required fields
    if (!movement_type || !quantity) {
      return res.status(400).json({ message: 'Movement type and quantity are required' });
    }
    
    // Get material details
    const materialResult = await pool.query('SELECT material_number, base_unit_of_measure FROM materials WHERE id = $1', [id]);
    if (materialResult.rows.length === 0) {
      return res.status(404).json({ message: 'Material not found' });
    }
    
    const { material_number, base_unit_of_measure } = materialResult.rows[0];
    
    // Create stock movement
    const movementResult = await pool.query(`
      INSERT INTO stock_movements (
        material_number, movement_type, posting_date, quantity,
        unit_of_measure, reference_document, description,
        storage_location_from, storage_location_to, created_at, updated_at
      )
      VALUES ($1, $2, CURRENT_DATE, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      RETURNING *
    `, [
      material_number, movement_type, quantity, 
      unit_of_measure || base_unit_of_measure,
      reference_document, description,
      movement_type.startsWith('2') ? storage_location : null, // Issues
      movement_type.startsWith('1') ? storage_location : null  // Receipts
    ]);
    
    // Update inventory balance
    const sign = movement_type.startsWith('1') ? 1 : -1; // Receipts are positive, issues are negative
    await pool.query(`
      INSERT INTO inventory_balance (
        material_number, plant_code, storage_location_code,
        quantity_on_hand, available_quantity, unit_price, last_movement_date
      )
      VALUES ($1, 'P001', $2, $3, $3, 0, CURRENT_DATE)
      ON CONFLICT (material_number, plant_code, storage_location_code)
      DO UPDATE SET
        quantity_on_hand = inventory_balance.quantity_on_hand + $3,
        available_quantity = inventory_balance.available_quantity + $3,
        last_movement_date = CURRENT_DATE
    `, [material_number, storage_location || 'SL01', sign * quantity]);
    
    console.log('✅ Stock movement created successfully:', movementResult.rows[0]);
    res.status(201).json(movementResult.rows[0]);
  } catch (error) {
    console.error('Error creating stock movement:', error);
    res.status(500).json({ message: 'Failed to create stock movement', error: error.message });
  }
});

// GET low stock items
router.get('/low-stock/alert', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        m.id, m.material_number, m.description,
        ib.quantity_on_hand, ib.available_quantity,
        ib.plant_code, ib.storage_location_code
      FROM materials m
      JOIN inventory_balance ib ON m.material_number = ib.material_number
      WHERE ib.quantity_on_hand < 10 -- Low stock threshold
      AND m.is_active = true
      ORDER BY ib.quantity_on_hand ASC
    `);
    
    console.log(`✅ Low stock items: ${result.rows.length} items need attention`);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching low stock items:', error);
    res.status(500).json({ message: 'Failed to fetch low stock items', error: error.message });
  }
});

// GET inventory valuation
router.get('/valuation/summary', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        COUNT(DISTINCT m.id) as total_items,
        COALESCE(SUM(ib.quantity_on_hand), 0) as total_quantity,
        COALESCE(SUM(ib.quantity_on_hand * COALESCE(ib.unit_price, m.standard_price)), 0) as total_value,
        COUNT(CASE WHEN ib.quantity_on_hand < 10 THEN 1 END) as low_stock_items,
        COUNT(CASE WHEN ib.quantity_on_hand = 0 THEN 1 END) as out_of_stock_items
      FROM materials m
      LEFT JOIN inventory_balance ib ON m.material_number = ib.material_number
      WHERE m.is_active = true
    `);
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching inventory valuation:', error);
    res.status(500).json({ message: 'Failed to fetch inventory valuation', error: error.message });
  }
});

export default router;