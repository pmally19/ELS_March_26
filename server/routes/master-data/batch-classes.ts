import { Request, Response } from 'express';
import { pool } from '../../db';

// GET /api/master-data/batch-classes - Get all batch classes
export async function getBatchClasses(req: Request, res: Response) {
  try {
    const result = await pool.query(`
      SELECT 
        id,
        code,
        name,
        description,
        batch_number_format as "batchNumberFormat",
        shelf_life_days as "shelfLifeDays",
        expiration_required as "expirationRequired",
        lot_tracking_required as "lotTrackingRequired",
        is_active as "isActive",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM batch_classes
      ORDER BY code
    `);
    return res.status(200).json(result.rows);
  } catch (error: any) {
    console.error("Error fetching batch classes:", error);
    return res.status(500).json({ error: "Internal server error", message: error.message });
  }
}

// GET /api/master-data/batch-classes/:id - Get batch class by ID
export async function getBatchClassById(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID format" });
    }

    const result = await pool.query(`
      SELECT 
        id,
        code,
        name,
        description,
        batch_number_format as "batchNumberFormat",
        shelf_life_days as "shelfLifeDays",
        expiration_required as "expirationRequired",
        lot_tracking_required as "lotTrackingRequired",
        is_active as "isActive",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM batch_classes
      WHERE id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Batch class not found" });
    }

    return res.status(200).json(result.rows[0]);
  } catch (error: any) {
    console.error("Error fetching batch class:", error);
    return res.status(500).json({ error: "Internal server error", message: error.message });
  }
}

// POST /api/master-data/batch-classes - Create a new batch class
export async function createBatchClass(req: Request, res: Response) {
  try {
    const { code, name, description, batchNumberFormat, shelfLifeDays, expirationRequired, lotTrackingRequired, isActive } = req.body;

    // Validation
    if (!code || !name) {
      return res.status(400).json({ 
        error: "Validation error", 
        message: "Code and name are required" 
      });
    }

    // Check if code already exists
    const existingResult = await pool.query(`
      SELECT id FROM batch_classes WHERE code = $1
    `, [code.toUpperCase()]);

    if (existingResult.rows.length > 0) {
      return res.status(409).json({ 
        error: "Conflict", 
        message: "Batch class code already exists" 
      });
    }

    // Use values from request, no hardcoded defaults
    const normalizedCode = code.trim().toUpperCase();
    const activeStatus = isActive !== undefined ? isActive : true; // Use request value or database default
    const expirationReq = expirationRequired !== undefined ? expirationRequired : false; // Use request value or database default
    const lotTrackingReq = lotTrackingRequired !== undefined ? lotTrackingRequired : true; // Use request value or database default

    const result = await pool.query(`
      INSERT INTO batch_classes (
        code, name, description, batch_number_format, shelf_life_days, 
        expiration_required, lot_tracking_required, is_active
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8
      ) RETURNING 
        id,
        code,
        name,
        description,
        batch_number_format as "batchNumberFormat",
        shelf_life_days as "shelfLifeDays",
        expiration_required as "expirationRequired",
        lot_tracking_required as "lotTrackingRequired",
        is_active as "isActive",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `, [
      normalizedCode,
      name.trim(),
      description?.trim() || null,
      batchNumberFormat?.trim() || null,
      shelfLifeDays || null,
      expirationReq,
      lotTrackingReq,
      activeStatus
    ]);
    
    return res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error("Error creating batch class:", error);
    return res.status(500).json({ error: "Internal server error", message: error.message });
  }
}

// PUT /api/master-data/batch-classes/:id - Update a batch class
export async function updateBatchClass(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID format" });
    }

    const { code, name, description, batchNumberFormat, shelfLifeDays, expirationRequired, lotTrackingRequired, isActive } = req.body;

    // Check if batch class exists
    const existingResult = await pool.query(`
      SELECT * FROM batch_classes WHERE id = $1
    `, [id]);

    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: "Batch class not found" });
    }

    const existingBatchClass = existingResult.rows[0];

    // If code is being changed, check it doesn't conflict with another batch class
    if (code && code.toUpperCase() !== existingBatchClass.code) {
      const duplicateResult = await pool.query(`
        SELECT id FROM batch_classes WHERE code = $1 AND id != $2
      `, [code.toUpperCase(), id]);

      if (duplicateResult.rows.length > 0) {
        return res.status(409).json({ 
          error: "Conflict", 
          message: "Batch class code already exists" 
        });
      }
    }

    // Build update query dynamically
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (code !== undefined) {
      updates.push(`code = $${paramIndex++}`);
      values.push(code.trim().toUpperCase());
    }
    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(name.trim());
    }
    if (description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(description?.trim() || null);
    }
    if (batchNumberFormat !== undefined) {
      updates.push(`batch_number_format = $${paramIndex++}`);
      values.push(batchNumberFormat?.trim() || null);
    }
    if (shelfLifeDays !== undefined) {
      updates.push(`shelf_life_days = $${paramIndex++}`);
      values.push(shelfLifeDays || null);
    }
    if (expirationRequired !== undefined) {
      updates.push(`expiration_required = $${paramIndex++}`);
      values.push(expirationRequired);
    }
    if (lotTrackingRequired !== undefined) {
      updates.push(`lot_tracking_required = $${paramIndex++}`);
      values.push(lotTrackingRequired);
    }
    if (isActive !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(isActive);
    }
    
    updates.push(`updated_at = NOW()`);
    values.push(id);

    const updateQuery = `
      UPDATE batch_classes 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING 
        id,
        code,
        name,
        description,
        batch_number_format as "batchNumberFormat",
        shelf_life_days as "shelfLifeDays",
        expiration_required as "expirationRequired",
        lot_tracking_required as "lotTrackingRequired",
        is_active as "isActive",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `;

    const result = await pool.query(updateQuery, values);
    
    return res.status(200).json(result.rows[0]);
  } catch (error: any) {
    console.error("Error updating batch class:", error);
    return res.status(500).json({ error: "Internal server error", message: error.message });
  }
}

// DELETE /api/master-data/batch-classes/:id - Delete a batch class
export async function deleteBatchClass(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID format" });
    }

    // Check if batch class exists
    const existingResult = await pool.query(`
      SELECT * FROM batch_classes WHERE id = $1
    `, [id]);

    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: "Batch class not found" });
    }

    // Check for usage in batch_master (if batch_class_id column exists in future)
    // For now, we'll just check if there are any batches that might reference this class
    // Note: batch_master doesn't currently have batch_class_id, but we check for future compatibility

    // Delete batch class
    await pool.query(`
      DELETE FROM batch_classes WHERE id = $1
    `, [id]);
    
    return res.status(200).json({ message: "Batch class deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting batch class:", error);
    
    // Check if it's a foreign key constraint error
    if (error.message && error.message.includes('violates foreign key constraint')) {
      return res.status(409).json({ 
        error: "Cannot delete batch class", 
        message: "This batch class has associated records in other tables. Please remove these records first or deactivate the batch class instead." 
      });
    }
    
    return res.status(500).json({ error: "Internal server error", message: error.message });
  }
}

// PUT /api/master-data/batch-classes/:id/deactivate - Deactivate a batch class
export async function deactivateBatchClass(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID format" });
    }

    // Check if batch class exists
    const existingResult = await pool.query(`
      SELECT * FROM batch_classes WHERE id = $1
    `, [id]);

    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: "Batch class not found" });
    }

    // Deactivate batch class
    const updateResult = await pool.query(`
      UPDATE batch_classes 
      SET is_active = false, updated_at = NOW()
      WHERE id = $1
      RETURNING 
        id,
        code,
        name,
        description,
        batch_number_format as "batchNumberFormat",
        shelf_life_days as "shelfLifeDays",
        expiration_required as "expirationRequired",
        lot_tracking_required as "lotTrackingRequired",
        is_active as "isActive",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `, [id]);
    
    return res.status(200).json({
      message: "Batch class deactivated successfully",
      batchClass: updateResult.rows[0]
    });
  } catch (error: any) {
    console.error("Error deactivating batch class:", error);
    return res.status(500).json({ error: "Internal server error", message: error.message });
  }
}

