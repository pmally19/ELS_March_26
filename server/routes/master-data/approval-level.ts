import { Request, Response } from "express";
// import { Pool } from '@neondatabase/serverless';
import pg from 'pg';
const { Pool } = pg
import 'dotenv/config'

const directPool = new Pool({ 
  connectionString: process.env.DATABASE_URL
});

// GET /api/master-data/approval-level
export async function getApprovalLevels(req: Request, res: Response) {
  try {
    const result = await directPool.query(`
      SELECT id, level, name, description, value_limit, created_at, updated_at
      FROM approval_levels
      ORDER BY level ASC
    `);
    
    return res.status(200).json(result.rows);
  } catch (error: any) {
    console.error("[API] Error fetching approval levels:", error);
    return res.status(500).json({ message: `Failed to fetch approval levels: ${error.message}` });
  }
}

// GET /api/master-data/approval-level/:id
export async function getApprovalLevelById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const result = await directPool.query(`
      SELECT id, level, name, description, value_limit, created_at, updated_at
      FROM approval_levels
      WHERE id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: `Approval level with ID ${id} not found` });
    }
    
    return res.status(200).json(result.rows[0]);
  } catch (error: any) {
    console.error("[API] Error fetching approval level:", error);
    return res.status(500).json({ message: `Failed to fetch approval level: ${error.message}` });
  }
}

// POST /api/master-data/approval-level
export async function createApprovalLevel(req: Request, res: Response) {
  try {
    const { level, name, description, value_limit } = req.body;
    
    if (!level || !name) {
      return res.status(400).json({ message: "Level and name are required fields" });
    }
    
    console.log("[DEBUG] Creating approval level:", { level, name, description, value_limit });
    
    const result = await directPool.query(`
      INSERT INTO approval_levels (level, name, description, value_limit)
      VALUES ($1, $2, $3, $4)
      RETURNING id, level, name, description, value_limit, created_at, updated_at
    `, [level, name, description, value_limit]);
    
    return res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error("[API] Error creating approval level:", error);
    return res.status(500).json({ message: `Failed to create approval level: ${error.message}` });
  }
}

// PUT /api/master-data/approval-level/:id
export async function updateApprovalLevel(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { level, name, description, value_limit } = req.body;
    
    if (!level || !name) {
      return res.status(400).json({ message: "Level and name are required fields" });
    }
    
    const result = await directPool.query(`
      UPDATE approval_levels
      SET level = $1, 
          name = $2, 
          description = $3, 
          value_limit = $4, 
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING id, level, name, description, value_limit, created_at, updated_at
    `, [level, name, description, value_limit, id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: `Approval level with ID ${id} not found` });
    }
    
    return res.status(200).json(result.rows[0]);
  } catch (error: any) {
    console.error("[API] Error updating approval level:", error);
    return res.status(500).json({ message: `Failed to update approval level: ${error.message}` });
  }
}

// DELETE /api/master-data/approval-level/:id
export async function deleteApprovalLevel(req: Request, res: Response) {
  try {
    const { id } = req.params;
    
    const result = await directPool.query(`
      DELETE FROM approval_levels
      WHERE id = $1
      RETURNING id
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: `Approval level with ID ${id} not found` });
    }
    
    return res.status(200).json({ message: `Approval level with ID ${id} successfully deleted` });
  } catch (error: any) {
    console.error("[API] Error deleting approval level:", error);
    return res.status(500).json({ message: `Failed to delete approval level: ${error.message}` });
  }
}