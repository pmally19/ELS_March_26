// Direct implementation for approval-level routes
import { Request, Response, Router } from 'express';
import { pool } from '../../db';

// Create the router
const router = Router();

// Middleware to ensure the table exists
router.use(async (_req, _res, next) => {
  try {
    // Create the approval_levels table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS approval_levels (
        id SERIAL PRIMARY KEY,
        level INTEGER NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        value_limit NUMERIC NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    next();
  } catch (error) {
    console.error("Error creating approval_levels table:", error);
    next(error);
  }
});

// GET /api/master-data/approval-level
router.get('/', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT id, level, name, description, value_limit, created_at, updated_at
      FROM approval_levels
      ORDER BY level ASC
    `);
    
    res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error fetching approval levels:", error);
    res.status(500).json({ message: "Failed to fetch approval levels" });
  }
});

// GET /api/master-data/approval-level/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT id, level, name, description, value_limit, created_at, updated_at
      FROM approval_levels
      WHERE id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: `Approval level with ID ${id} not found` });
    }
    
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching approval level:", error);
    res.status(500).json({ message: "Failed to fetch approval level" });
  }
});

// POST /api/master-data/approval-level
router.post('/', async (req: Request, res: Response) => {
  try {
    const { level, name, description, value_limit } = req.body;
    
    if (!level || !name) {
      return res.status(400).json({ message: "Level and name are required fields" });
    }
    
    console.log("Creating approval level:", { level, name, description, value_limit });
    
    const result = await pool.query(`
      INSERT INTO approval_levels (level, name, description, value_limit)
      VALUES ($1, $2, $3, $4)
      RETURNING id, level, name, description, value_limit, created_at, updated_at
    `, [level, name, description || null, value_limit || null]);
    
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error creating approval level:", error);
    res.status(500).json({ message: "Failed to create approval level" });
  }
});

// PUT /api/master-data/approval-level/:id
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { level, name, description, value_limit } = req.body;
    
    if (!level || !name) {
      return res.status(400).json({ message: "Level and name are required fields" });
    }
    
    const result = await pool.query(`
      UPDATE approval_levels
      SET level = $1, 
          name = $2, 
          description = $3, 
          value_limit = $4, 
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING id, level, name, description, value_limit, created_at, updated_at
    `, [level, name, description || null, value_limit || null, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: `Approval level with ID ${id} not found` });
    }
    
    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error("Error updating approval level:", error);
    res.status(500).json({ message: "Failed to update approval level" });
  }
});

// DELETE /api/master-data/approval-level/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(`
      DELETE FROM approval_levels
      WHERE id = $1
      RETURNING id
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: `Approval level with ID ${id} not found` });
    }
    
    res.status(200).json({ message: `Approval level with ID ${id} successfully deleted` });
  } catch (error) {
    console.error("Error deleting approval level:", error);
    res.status(500).json({ message: "Failed to delete approval level" });
  }
});

export default router;