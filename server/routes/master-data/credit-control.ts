import { Request, Response } from "express";
import { z } from "zod";
import { pool } from "../../db";

// Validation schema
const creditControlSchema = z.object({
  code: z.string().min(2, "Code must be at least 2 characters"),
  name: z.string().min(3, "Name must be at least 3 characters"),
  description: z.string().optional(),
  companyCodeId: z.number().int().positive("Company code is required"),
  creditCheckingGroup: z.string().optional(),
  creditPeriod: z.number().int().nonnegative().default(30),
  gracePercentage: z.number().nonnegative().max(100).default(10),
  blockingReason: z.string().optional(),
  reviewFrequency: z.string().default("monthly"),
  currency: z.string().default("USD"),
  creditApprover: z.string().optional(),
  status: z.string().default("active"),
  isActive: z.boolean().default(true),
  notes: z.string().optional(),
});

// Get all credit control areas
export async function getCreditControlAreas(req: Request, res: Response) {
  try {
    const { rows } = await pool.query(`
      SELECT c.*, cc.code as company_code, cc.name as company_name
      FROM credit_control_areas c
      LEFT JOIN company_codes cc ON c.company_code_id = cc.id
      WHERE c.is_active = true OR c.is_active IS NULL
      ORDER BY c.id
    `);

    // Format each row to include company code as a nested object
    const formattedResults = rows.map(row => ({
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description,
      companyCodeId: row.company_code_id,
      creditCheckingGroup: row.credit_checking_group,
      creditPeriod: row.credit_period,
      gracePercentage: row.grace_percentage,
      blockingReason: row.blocking_reason,
      reviewFrequency: row.review_frequency,
      currency: row.currency,
      creditApprover: row.credit_approver,
      status: row.status,
      isActive: row.is_active,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      companyCode: {
        id: row.company_code_id, 
        code: row.company_code,
        name: row.company_name
      }
    }));

    return res.status(200).json(formattedResults);
  } catch (error) {
    console.error("Error fetching credit control areas:", error);
    return res.status(500).json({ message: "Failed to fetch credit control areas" });
  }
}

// Get a single credit control area by id
export async function getCreditControlAreaById(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid ID format" });
    }
    
    const { rows } = await pool.query(`
      SELECT c.*, cc.code as company_code, cc.name as company_name
      FROM credit_control_areas c
      LEFT JOIN company_codes cc ON c.company_code_id = cc.id
      WHERE c.id = $1
    `, [id]);
    
    if (rows.length === 0) {
      return res.status(404).json({ message: "Credit control area not found" });
    }
    
    const row = rows[0];
    
    // Format the result
    const formattedResult = {
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description,
      companyCodeId: row.company_code_id,
      creditCheckingGroup: row.credit_checking_group,
      creditPeriod: row.credit_period,
      gracePercentage: row.grace_percentage,
      blockingReason: row.blocking_reason,
      reviewFrequency: row.review_frequency,
      currency: row.currency,
      creditApprover: row.credit_approver,
      status: row.status,
      isActive: row.is_active,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      companyCode: {
        id: row.company_code_id, 
        code: row.company_code,
        name: row.company_name
      }
    };
    
    return res.status(200).json(formattedResult);
  } catch (error) {
    console.error("Error fetching credit control area:", error);
    return res.status(500).json({ message: "Failed to fetch credit control area" });
  }
}

// Create a new credit control area
export async function createCreditControlArea(req: Request, res: Response) {
  try {
    // Validate input data
    const validatedData = creditControlSchema.parse(req.body);
    
    // Check if company code exists
    const companyCodeQuery = await pool.query(
      "SELECT id, code, name FROM company_codes WHERE id = $1", 
      [validatedData.companyCodeId]
    );
    
    if (companyCodeQuery.rows.length === 0) {
      return res.status(400).json({ message: "Company code not found" });
    }
    
    // Insert the new credit control area
    const insertQuery = await pool.query(`
      INSERT INTO credit_control_areas (
        code, name, description, company_code_id, credit_checking_group, 
        credit_period, grace_percentage, blocking_reason, review_frequency, 
        currency, credit_approver, status, is_active, notes, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())
      RETURNING *
    `, [
      validatedData.code,
      validatedData.name,
      validatedData.description || null,
      validatedData.companyCodeId,
      validatedData.creditCheckingGroup || null,
      validatedData.creditPeriod,
      validatedData.gracePercentage,
      validatedData.blockingReason || null,
      validatedData.reviewFrequency,
      validatedData.currency,
      validatedData.creditApprover || null,
      validatedData.status,
      validatedData.isActive,
      validatedData.notes || null
    ]);
    
    const newCreditControl = insertQuery.rows[0];
    const companyCode = companyCodeQuery.rows[0];
    
    // Format the response
    const result = {
      id: newCreditControl.id,
      code: newCreditControl.code,
      name: newCreditControl.name,
      description: newCreditControl.description,
      companyCodeId: newCreditControl.company_code_id,
      creditCheckingGroup: newCreditControl.credit_checking_group,
      creditPeriod: newCreditControl.credit_period,
      gracePercentage: newCreditControl.grace_percentage,
      blockingReason: newCreditControl.blocking_reason,
      reviewFrequency: newCreditControl.review_frequency,
      currency: newCreditControl.currency,
      creditApprover: newCreditControl.credit_approver,
      status: newCreditControl.status,
      isActive: newCreditControl.is_active,
      notes: newCreditControl.notes,
      createdAt: newCreditControl.created_at,
      updatedAt: newCreditControl.updated_at,
      companyCode: {
        id: companyCode.id,
        code: companyCode.code,
        name: companyCode.name
      }
    };
    
    return res.status(201).json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Validation error", errors: error.errors });
    }
    console.error("Error creating credit control area:", error);
    return res.status(500).json({ message: "Failed to create credit control area" });
  }
}

// Update a credit control area
export async function updateCreditControlArea(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid ID format" });
    }
    
    // Check if credit control area exists
    const existingQuery = await pool.query(
      "SELECT * FROM credit_control_areas WHERE id = $1", 
      [id]
    );
    
    if (existingQuery.rows.length === 0) {
      return res.status(404).json({ message: "Credit control area not found" });
    }
    
    // Parse and validate the update data
    const validatedData = creditControlSchema.partial().parse(req.body);
    
    // If company code ID is provided, check if it exists
    let companyCode = null;
    if (validatedData.companyCodeId) {
      const companyCodeQuery = await pool.query(
        "SELECT id, code, name FROM company_codes WHERE id = $1", 
        [validatedData.companyCodeId]
      );
      
      if (companyCodeQuery.rows.length === 0) {
        return res.status(400).json({ message: "Company code not found" });
      }
      
      companyCode = companyCodeQuery.rows[0];
    }
    
    // Build the update query dynamically
    const updates = [];
    const values = [];
    let paramCount = 1;
    
    if (validatedData.code !== undefined) {
      updates.push(`code = $${paramCount++}`);
      values.push(validatedData.code);
    }
    
    if (validatedData.name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(validatedData.name);
    }
    
    if (validatedData.description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(validatedData.description);
    }
    
    if (validatedData.companyCodeId !== undefined) {
      updates.push(`company_code_id = $${paramCount++}`);
      values.push(validatedData.companyCodeId);
    }
    
    if (validatedData.creditCheckingGroup !== undefined) {
      updates.push(`credit_checking_group = $${paramCount++}`);
      values.push(validatedData.creditCheckingGroup);
    }
    
    if (validatedData.creditPeriod !== undefined) {
      updates.push(`credit_period = $${paramCount++}`);
      values.push(validatedData.creditPeriod);
    }
    
    if (validatedData.gracePercentage !== undefined) {
      updates.push(`grace_percentage = $${paramCount++}`);
      values.push(validatedData.gracePercentage);
    }
    
    if (validatedData.blockingReason !== undefined) {
      updates.push(`blocking_reason = $${paramCount++}`);
      values.push(validatedData.blockingReason);
    }
    
    if (validatedData.reviewFrequency !== undefined) {
      updates.push(`review_frequency = $${paramCount++}`);
      values.push(validatedData.reviewFrequency);
    }
    
    if (validatedData.currency !== undefined) {
      updates.push(`currency = $${paramCount++}`);
      values.push(validatedData.currency);
    }
    
    if (validatedData.creditApprover !== undefined) {
      updates.push(`credit_approver = $${paramCount++}`);
      values.push(validatedData.creditApprover);
    }
    
    if (validatedData.status !== undefined) {
      updates.push(`status = $${paramCount++}`);
      values.push(validatedData.status);
    }
    
    if (validatedData.isActive !== undefined) {
      updates.push(`is_active = $${paramCount++}`);
      values.push(validatedData.isActive);
    }
    
    if (validatedData.notes !== undefined) {
      updates.push(`notes = $${paramCount++}`);
      values.push(validatedData.notes);
    }
    
    // Always update the updated_at timestamp
    updates.push(`updated_at = NOW()`);
    
    // Only proceed if there are updates to make
    if (updates.length === 0) {
      return res.status(400).json({ message: "No valid updates provided" });
    }
    
    // Add the id to the values array for the WHERE clause
    values.push(id);
    
    // Execute the update query
    const updateQuery = await pool.query(`
      UPDATE credit_control_areas
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `, values);
    
    const updatedCreditControl = updateQuery.rows[0];
    
    // If we don't have the company code info yet, get it
    if (!companyCode) {
      const companyCodeQuery = await pool.query(
        "SELECT id, code, name FROM company_codes WHERE id = $1", 
        [updatedCreditControl.company_code_id]
      );
      companyCode = companyCodeQuery.rows[0];
    }
    
    // Format the response
    const result = {
      id: updatedCreditControl.id,
      code: updatedCreditControl.code,
      name: updatedCreditControl.name,
      description: updatedCreditControl.description,
      companyCodeId: updatedCreditControl.company_code_id,
      creditCheckingGroup: updatedCreditControl.credit_checking_group,
      creditPeriod: updatedCreditControl.credit_period,
      gracePercentage: updatedCreditControl.grace_percentage,
      blockingReason: updatedCreditControl.blocking_reason,
      reviewFrequency: updatedCreditControl.review_frequency,
      currency: updatedCreditControl.currency,
      creditApprover: updatedCreditControl.credit_approver,
      status: updatedCreditControl.status,
      isActive: updatedCreditControl.is_active,
      notes: updatedCreditControl.notes,
      createdAt: updatedCreditControl.created_at,
      updatedAt: updatedCreditControl.updated_at,
      companyCode: companyCode
    };
    
    return res.status(200).json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Validation error", errors: error.errors });
    }
    console.error("Error updating credit control area:", error);
    return res.status(500).json({ message: "Failed to update credit control area" });
  }
}

// Delete a credit control area (soft delete by setting isActive to false)
export async function deleteCreditControlArea(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid ID format" });
    }
    
    // Check if credit control area exists
    const existingQuery = await pool.query(
      "SELECT * FROM credit_control_areas WHERE id = $1", 
      [id]
    );
    
    if (existingQuery.rows.length === 0) {
      return res.status(404).json({ message: "Credit control area not found" });
    }
    
    // Soft delete by setting isActive to false
    await pool.query(`
      UPDATE credit_control_areas
      SET is_active = false, updated_at = NOW()
      WHERE id = $1
    `, [id]);
    
    return res.status(200).json({ message: "Credit control area deleted successfully" });
  } catch (error) {
    console.error("Error deleting credit control area:", error);
    return res.status(500).json({ message: "Failed to delete credit control area" });
  }
}