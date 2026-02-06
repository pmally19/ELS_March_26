import { Router } from 'express';
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const router = Router();

// Get all tiles with statistics
router.get('/tiles', async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query(`
      SELECT * FROM tile_display_view
      ORDER BY module_code, tile_number
    `);
    client.release();
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching tiles:', error);
    res.status(500).json({ error: 'Failed to fetch tiles' });
  }
});

// Get tiles by module
router.get('/tiles/module/:moduleCode', async (req, res) => {
  try {
    const { moduleCode } = req.params;
    const client = await pool.connect();
    const result = await client.query(`
      SELECT * FROM tile_display_view
      WHERE module_code = $1
      ORDER BY tile_number
    `, [moduleCode.toUpperCase()]);
    client.release();
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching module tiles:', error);
    res.status(500).json({ error: 'Failed to fetch module tiles' });
  }
});

// Get tile statistics
router.get('/statistics', async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query(`
      SELECT * FROM tile_statistics_view
      ORDER BY module_code
    `);
    client.release();
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching tile statistics:', error);
    res.status(500).json({ error: 'Failed to fetch tile statistics' });
  }
});

// Get next available tile number for a module
router.get('/next-number/:moduleCode', async (req, res) => {
  try {
    const { moduleCode } = req.params;
    const client = await pool.connect();
    const result = await client.query(`
      SELECT generate_tile_number($1) as next_number
    `, [moduleCode.toUpperCase()]);
    client.release();
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error generating tile number:', error);
    res.status(500).json({ error: 'Failed to generate tile number' });
  }
});

// Register a new tile
router.post('/register', async (req, res) => {
  try {
    const { 
      tileName, 
      tileCategory, 
      moduleCode, 
      routePath, 
      description, 
      iconName,
      parentTileNumber 
    } = req.body;

    const client = await pool.connect();
    
    // Generate tile number
    const numberResult = await client.query(`
      SELECT generate_tile_number($1) as tile_number
    `, [moduleCode.toUpperCase()]);

    const tileNumber = numberResult.rows[0].tile_number;

    // Get module name
    const moduleResult = await client.query(`
      SELECT module_name FROM tile_numbering_rules WHERE module_code = $1
    `, [moduleCode.toUpperCase()]);

    const moduleName = moduleResult.rows[0]?.module_name || moduleCode;

    // Insert tile
    const result = await client.query(`
      INSERT INTO tile_registry 
      (tile_number, tile_name, tile_category, module_code, module_name, route_path, description, icon_name, parent_tile_number)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [tileNumber, tileName, tileCategory, moduleCode.toUpperCase(), moduleName, routePath, description, iconName, parentTileNumber]);
    
    client.release();

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error registering tile:', error);
    res.status(500).json({ error: 'Failed to register tile' });
  }
});

// Update tile
router.put('/tiles/:tileNumber', async (req, res) => {
  try {
    const { tileNumber } = req.params;
    const updates = req.body;
    
    const setClause = Object.keys(updates)
      .map((key, index) => `${key} = $${index + 2}`)
      .join(', ');
    
    const values = [tileNumber, ...Object.values(updates)];
    
    const client = await pool.connect();
    const result = await client.query(`
      UPDATE tile_registry 
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP
      WHERE tile_number = $1
      RETURNING *
    `, values);
    client.release();

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tile not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating tile:', error);
    res.status(500).json({ error: 'Failed to update tile' });
  }
});

// Deactivate tile (soft delete)
router.patch('/tiles/:tileNumber/deactivate', async (req, res) => {
  try {
    const { tileNumber } = req.params;
    
    const client = await pool.connect();
    const result = await client.query(`
      UPDATE tile_registry 
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE tile_number = $1
      RETURNING *
    `, [tileNumber]);
    client.release();

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tile not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error deactivating tile:', error);
    res.status(500).json({ error: 'Failed to deactivate tile' });
  }
});

// Reactivate tile
router.patch('/tiles/:tileNumber/activate', async (req, res) => {
  try {
    const { tileNumber } = req.params;
    
    const client = await pool.connect();
    const result = await client.query(`
      UPDATE tile_registry 
      SET is_active = true, updated_at = CURRENT_TIMESTAMP
      WHERE tile_number = $1
      RETURNING *
    `, [tileNumber]);
    client.release();

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tile not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error activating tile:', error);
    res.status(500).json({ error: 'Failed to activate tile' });
  }
});

export default router;