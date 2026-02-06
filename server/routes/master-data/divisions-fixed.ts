import { Request, Response } from "express";
import { pool } from "../../db";

// Get all divisions
export async function getDivisions(req: Request, res: Response) {
  try {
    const { active_only } = req.query;
    
    let query = `
      SELECT 
        id,
        code,
        name,
        description,
        is_active,
        created_at,
        updated_at
      FROM sd_divisions 
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;
    
    // Filter by active status if requested
    if (active_only === 'true' || active_only === '1') {
      query += ` AND is_active = $${paramIndex}`;
      params.push(true);
      paramIndex++;
    }
    
    query += " ORDER BY code";
    
    const result = await pool.query(query, params);
    
    // Transform data for UI compatibility
    const transformedRows = result.rows.map(row => ({
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description || row.name,
      isActive: row.is_active !== false,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
    
    return res.status(200).json(transformedRows);
  } catch (error: any) {
    console.error("Error fetching divisions:", error);
    return res.status(500).json({ 
      message: "Failed to fetch divisions", 
      error: error.message || "Unknown error" 
    });
  }
}

// Get division by ID
export async function getDivisionById(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid ID format" });
    }
    
    const result = await pool.query("SELECT * FROM sd_divisions WHERE id = $1", [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Division not found" });
    }
    
    // Transform response for UI compatibility
    const row = result.rows[0];
    const transformed = {
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description || row.name,
      isActive: row.is_active !== false,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
    
    return res.status(200).json(transformed);
  } catch (error: any) {
    console.error("Error fetching division:", error);
    return res.status(500).json({ 
      message: "Failed to fetch division", 
      error: error.message || "Unknown error" 
    });
  }
}

// Helper function to generate next division code
async function generateNextDivisionCode(): Promise<string> {
  try {
    // Get all existing codes and find the highest numeric code
    const result = await pool.query(`
      SELECT code FROM sd_divisions 
      WHERE code ~ '^[0-9]+$'
      ORDER BY CAST(code AS INTEGER) DESC
      LIMIT 1
    `);
    
    if (result.rows.length > 0) {
      const lastCode = parseInt(result.rows[0].code);
      const nextCode = lastCode + 1;
      // Format as 2-digit string (01, 02, etc.) with max 5 characters
      return nextCode.toString().padStart(2, '0').slice(0, 5);
    }
    
    // If no numeric codes exist, start with 01
    return '01';
  } catch (error) {
    console.error("Error generating division code:", error);
    // Fallback: use timestamp-based code if query fails
    return Date.now().toString().slice(-5);
  }
}

// Create new division
export async function createDivision(req: Request, res: Response) {
  try {
    const { code, name, description, isActive } = req.body;
    
    console.log('Create Division Request Body:', { code, name, description, isActive });
    
    if (!name || (typeof name === 'string' && name.trim() === '')) {
      return res.status(400).json({ message: "Name is required" });
    }
    
    // Auto-generate code if not provided
    let divisionCode = code;
    if (!divisionCode || divisionCode.trim() === '') {
      divisionCode = await generateNextDivisionCode();
    }
    
    // Validate code length (max 5 characters)
    if (divisionCode.length > 5) {
      return res.status(400).json({ message: "Code must be 5 characters or less" });
    }
    
    // Check if code already exists
    const existingCheck = await pool.query(
      "SELECT id FROM sd_divisions WHERE code = $1",
      [divisionCode]
    );
    
    if (existingCheck.rows.length > 0) {
      // If auto-generated code exists, try generating a new one
      if (!code || code.trim() === '') {
        divisionCode = await generateNextDivisionCode();
        // Double-check the new code
        const doubleCheck = await pool.query(
          "SELECT id FROM sd_divisions WHERE code = $1",
          [divisionCode]
        );
        if (doubleCheck.rows.length > 0) {
          // Use timestamp-based code as last resort
          divisionCode = Date.now().toString().slice(-5);
        }
      } else {
        return res.status(400).json({ message: "Division with this code already exists" });
      }
    }
    
    // Insert new division (no hardcoded defaults - isActive defaults to true in DB if not provided)
    const insertQuery = `
      INSERT INTO sd_divisions (code, name, description, is_active)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    
    const isActiveValue = isActive !== undefined ? isActive : true;
    
    let result;
    try {
      result = await pool.query(insertQuery, [
        divisionCode,
        name,
        description || null,
        isActiveValue
      ]);
    } catch (insertError: any) {
      // Handle sequence out-of-sync error
      if (insertError.code === '23505' && insertError.constraint === 'divisions_pkey') {
        console.log('⚠️ Sequence out of sync, attempting to fix...');
        try {
          // Get current max ID and fix sequence
          const maxIdResult = await pool.query('SELECT MAX(id) as max_id FROM sd_divisions;');
          const maxId = parseInt(maxIdResult.rows[0].max_id) || 0;
          const newSeqValue = maxId + 1;
          await pool.query(`SELECT setval('divisions_id_seq', ${newSeqValue}, false);`);
          console.log(`✅ Sequence fixed to ${newSeqValue}, retrying insert...`);
          
          // Retry the insert
          result = await pool.query(insertQuery, [
            divisionCode,
            name,
            description || null,
            isActiveValue
          ]);
        } catch (retryError: any) {
          console.error('Error retrying insert after sequence fix:', retryError);
          throw insertError; // Throw original error
        }
      } else {
        throw insertError;
      }
    }
    
    const row = result.rows[0];
    const transformed = {
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description || row.name,
      isActive: row.is_active !== false,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
    
    return res.status(201).json(transformed);
  } catch (error: any) {
    console.error("Error creating division:", error);
    
    // Handle unique constraint violation
    if (error.code === '23505') {
      // Check if it's a code duplicate or ID sequence issue
      if (error.constraint === 'divisions_pkey') {
        // This is an ID sequence issue - should have been handled above, but just in case
        return res.status(500).json({ 
          message: "Database sequence error. Please contact administrator.", 
          error: "Sequence synchronization issue" 
        });
      } else {
        // Code duplicate
        return res.status(400).json({ message: "Division with this code already exists" });
      }
    }
    
    return res.status(500).json({ 
      message: "Failed to create division", 
      error: error.message || "Unknown error" 
    });
  }
}

// Update division
export async function updateDivision(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid ID format" });
    }
    
    const { code, name, description, isActive } = req.body;
    
    // Check if division exists
    const existingCheck = await pool.query(
      "SELECT id FROM sd_divisions WHERE id = $1",
      [id]
    );
    
    if (existingCheck.rows.length === 0) {
      return res.status(404).json({ message: "Division not found" });
    }
    
    // If code is being updated, check for duplicates
    if (code) {
      if (code.length > 5) {
        return res.status(400).json({ message: "Code must be 5 characters or less" });
      }
      
      const duplicateCheck = await pool.query(
        "SELECT id FROM sd_divisions WHERE code = $1 AND id != $2",
        [code, id]
      );
      
      if (duplicateCheck.rows.length > 0) {
        return res.status(400).json({ message: "Division with this code already exists" });
      }
    }
    
    // Build update query dynamically
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;
    
    if (code !== undefined) {
      updates.push(`code = $${paramIndex}`);
      values.push(code);
      paramIndex++;
    }
    
    if (name !== undefined) {
      updates.push(`name = $${paramIndex}`);
      values.push(name);
      paramIndex++;
    }
    
    if (description !== undefined) {
      updates.push(`description = $${paramIndex}`);
      values.push(description || null);
      paramIndex++;
    }
    
    if (isActive !== undefined) {
      updates.push(`is_active = $${paramIndex}`);
      values.push(isActive);
      paramIndex++;
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ message: "No fields to update" });
    }
    
    // Always update updated_at timestamp
    updates.push(`updated_at = NOW()`);
    
    values.push(id);
    
    const updateQuery = `
      UPDATE sd_divisions 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;
    
    const result = await pool.query(updateQuery, values);
    
    const row = result.rows[0];
    const transformed = {
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description || row.name,
      isActive: row.is_active !== false,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
    
    return res.status(200).json(transformed);
  } catch (error: any) {
    console.error("Error updating division:", error);
    
    if (error.code === '23505') {
      return res.status(400).json({ message: "Division with this code already exists" });
    }
    
    return res.status(500).json({ 
      message: "Failed to update division", 
      error: error.message || "Unknown error" 
    });
  }
}

// Delete division
export async function deleteDivision(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid ID format" });
    }
    
    // Check if division exists
    const existingCheck = await pool.query(
      "SELECT id FROM sd_divisions WHERE id = $1",
      [id]
    );
    
    if (existingCheck.rows.length === 0) {
      return res.status(404).json({ message: "Division not found" });
    }
    
    // Check if division is being used in sales orders
    const usageCheck = await pool.query(
      "SELECT COUNT(*) as count FROM sales_orders WHERE division_id = $1",
      [id]
    );
    
    if (parseInt(usageCheck.rows[0].count) > 0) {
      return res.status(400).json({ 
        message: "Cannot delete division that is being used in sales orders" 
      });
    }
    
    // Delete the division
    await pool.query("DELETE FROM sd_divisions WHERE id = $1", [id]);
    
    return res.status(200).json({ message: "Division deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting division:", error);
    return res.status(500).json({ 
      message: "Failed to delete division", 
      error: error.message || "Unknown error" 
    });
  }
}

// Bulk import divisions
export async function bulkImportDivisions(req: Request, res: Response) {
  try {
    const { divisions } = req.body;
    
    if (!Array.isArray(divisions) || divisions.length === 0) {
      return res.status(400).json({ message: "Divisions array is required" });
    }
    
    const results = [];
    const errors = [];
    
    for (const division of divisions) {
      try {
        const { code, name, description, isActive } = division;
        
        if (!name) {
          errors.push({ division, error: "Name is required" });
          continue;
        }
        
        // Auto-generate code if not provided
        let divisionCode = code;
        if (!divisionCode || divisionCode.trim() === '') {
          divisionCode = await generateNextDivisionCode();
        }
        
        // Validate code length
        if (divisionCode.length > 5) {
          errors.push({ division, error: "Code must be 5 characters or less" });
          continue;
        }
        
        // Check if code already exists
        const existingCheck = await pool.query(
          "SELECT id FROM sd_divisions WHERE code = $1",
          [divisionCode]
        );
        
        if (existingCheck.rows.length > 0) {
          // If auto-generated code exists, try generating a new one
          if (!code || code.trim() === '') {
            divisionCode = await generateNextDivisionCode();
            // Double-check the new code
            const doubleCheck = await pool.query(
              "SELECT id FROM sd_divisions WHERE code = $1",
              [divisionCode]
            );
            if (doubleCheck.rows.length > 0) {
              // Use timestamp-based code as last resort
              divisionCode = Date.now().toString().slice(-5);
            }
          } else {
            errors.push({ division, error: "Division with this code already exists" });
            continue;
          }
        }
        
        const insertQuery = `
          INSERT INTO sd_divisions (code, name, description, is_active)
          VALUES ($1, $2, $3, $4)
          RETURNING *
        `;
        
        const isActiveValue = isActive !== undefined ? isActive : true;
        
        const result = await pool.query(insertQuery, [
          divisionCode,
          name,
          description || null,
          isActiveValue
        ]);
        
        results.push(result.rows[0]);
      } catch (error: any) {
        errors.push({ division, error: error.message });
      }
    }
    
    return res.status(200).json({
      success: true,
      imported: results.length,
      failed: errors.length,
      results,
      errors
    });
  } catch (error: any) {
    console.error("Error bulk importing divisions:", error);
    return res.status(500).json({ 
      message: "Failed to bulk import divisions", 
      error: error.message || "Unknown error" 
    });
  }
}

