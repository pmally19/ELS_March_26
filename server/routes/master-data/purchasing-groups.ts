
import { Request, Response } from "express";
import { pool } from "../../db";

// Get all purchasing groups
export async function getPurchasingGroups(req: Request, res: Response) {
  try {
    const result = await pool.query(`
      SELECT 
        id, 
        code, 
        name, 
        description, 
        is_active,
        created_at,
        updated_at
      FROM purchase_groups 
      ORDER BY code
    `);
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching purchasing groups:", error);
    res.status(500).json({ error: "Failed to fetch purchasing groups" });
  }
}

// Get purchasing group by ID
export async function getPurchasingGroupById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT 
        id, 
        code, 
        name, 
        description, 
        is_active,
        created_at,
        updated_at
      FROM purchase_groups 
      WHERE id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Purchasing group not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching purchasing group:", error);
    res.status(500).json({ error: "Failed to fetch purchasing group" });
  }
}

// Create new purchasing group
export async function createPurchasingGroup(req: Request, res: Response) {
  try {
    const { code, name, description, isActive = true } = req.body;

    if (!code || !name) {
      return res.status(400).json({ error: "Code and name are required" });
    }

    // Check if code already exists
    const existingCheck = await pool.query(
      'SELECT id FROM purchase_groups WHERE code = $1',
      [code]
    );

    if (existingCheck.rows.length > 0) {
      return res.status(409).json({ error: "Purchase group code already exists" });
    }

    const result = await pool.query(`
      INSERT INTO purchase_groups (
        code, 
        name, 
        description, 
        is_active, 
        created_at, 
        updated_at
      )
      VALUES ($1, $2, $3, $4, NOW(), NOW())
      RETURNING *
    `, [code, name, description || '', isActive]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error creating purchasing group:", error);
    res.status(500).json({ error: "Failed to create purchasing group" });
  }
}

// Update purchasing group
export async function updatePurchasingGroup(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { code, name, description, isActive } = req.body;

    // Check if purchasing group exists
    const existingCheck = await pool.query(
      'SELECT id FROM purchase_groups WHERE id = $1',
      [id]
    );

    if (existingCheck.rows.length === 0) {
      return res.status(404).json({ error: "Purchasing group not found" });
    }

    // If code is being updated, check for duplicates
    if (code) {
      const duplicateCheck = await pool.query(
        'SELECT id FROM purchase_groups WHERE code = $1 AND id != $2',
        [code, id]
      );

      if (duplicateCheck.rows.length > 0) {
        return res.status(409).json({ error: "Purchasing group code already exists" });
      }
    }

    const result = await pool.query(`
      UPDATE purchase_groups
      SET 
        code = COALESCE($2, code),
        name = COALESCE($3, name),
        description = COALESCE($4, description),
        is_active = COALESCE($5, is_active),
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [id, code, name, description, isActive]);

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Error updating purchasing group:", error);
    res.status(400).json({ error: "Failed to update purchasing group" });
  }
}

// Delete purchasing group
export async function deletePurchasingGroup(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM purchase_groups WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Purchasing group not found" });
    }

    res.json({ message: "Purchasing group deleted successfully" });
  } catch (error) {
    console.error("Error deleting purchasing group:", error);
    res.status(500).json({ error: "Failed to delete purchasing group" });
  }
}

// Bulk import purchasing groups
export async function bulkImportPurchasingGroups(req: Request, res: Response) {
  try {
    const { data } = req.body;

    if (!Array.isArray(data) || data.length === 0) {
      return res.status(400).json({ error: "Data must be a non-empty array" });
    }

    const results = [];
    const errors = [];

    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      try {
        // Validate required fields
        if (!item.code || !item.name) {
          errors.push({ row: i + 1, error: "Code and name are required" });
          continue;
        }

        // Check if code already exists
        const existingCheck = await pool.query(
          'SELECT id FROM purchase_groups WHERE code = $1',
          [item.code]
        );

        if (existingCheck.rows.length > 0) {
          errors.push({ row: i + 1, error: `Code '${item.code}' already exists` });
          continue;
        }

        const result = await pool.query(`
          INSERT INTO purchase_groups (
            code, 
            name, 
            description, 
            is_active, 
            created_at, 
            updated_at
          )
          VALUES ($1, $2, $3, $4, NOW(), NOW())
          RETURNING *
        `, [
          item.code,
          item.name,
          item.description || null,
          item.isActive !== false
        ]);

        results.push(result.rows[0]);
      } catch (error: any) {
        errors.push({ row: i + 1, error: `Failed to import: ${error.message}` });
      }
    }

    res.status(200).json({
      message: `Import completed. ${results.length} items imported, ${errors.length} errors.`,
      imported: results.length,
      errors: errors.length,
      errorDetails: errors,
      data: results
    });
  } catch (error) {
    console.error("Error in bulk import:", error);
    res.status(500).json({ error: "Failed to import purchasing groups" });
  }
}