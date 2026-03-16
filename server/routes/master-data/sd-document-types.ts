import { Request, Response } from 'express';
import { pool } from '../../db';

// GET /api/master-data/sd-document-types - Get all SD document types
export async function getSDDocumentTypes(req: Request, res: Response) {
  try {
    const { category } = req.query;

    let query = `
      SELECT 
        dt.id,
        dt.code,
        dt.name,
        dt.category,
        dt.sales_document_category_id as "salesDocumentCategoryId",
        sdc.category_code as "salesDocumentCategoryCode",
        sdc.category_name as "salesDocumentCategoryName",
        dt.number_range as "numberRange",
        dt.document_pricing_procedure as "documentPricingProcedure",
        dt.is_active as "isActive",
        dt.created_at as "createdAt",
        dt.updated_at as "updatedAt"
      FROM sd_document_types dt
      LEFT JOIN sales_document_categories sdc ON dt.sales_document_category_id = sdc.id
    `;

    const params: any[] = [];
    if (category) {
      query += ` WHERE dt.category = $1`;
      params.push(category);
    }

    query += ` ORDER BY dt.category, dt.code`;

    const result = await pool.query(query, params);
    return res.status(200).json(result.rows);
  } catch (error: any) {
    console.error("Error fetching SD document types:", error);
    return res.status(500).json({ error: "Internal server error", message: error.message });
  }
}

// GET /api/master-data/sd-document-types/:id - Get SD document type by ID
export async function getSDDocumentTypeById(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID format" });
    }

    const result = await pool.query(`
      SELECT 
        dt.id,
        dt.code,
        dt.name,
        dt.category,
        dt.sales_document_category_id as "salesDocumentCategoryId",
        sdc.category_code as "salesDocumentCategoryCode",
        sdc.category_name as "salesDocumentCategoryName",
        dt.number_range as "numberRange",
        dt.document_pricing_procedure as "documentPricingProcedure",
        dt.is_active as "isActive",
        dt.created_at as "createdAt",
        dt.updated_at as "updatedAt"
      FROM sd_document_types dt
      LEFT JOIN sales_document_categories sdc ON dt.sales_document_category_id = sdc.id
      WHERE dt.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "SD document type not found" });
    }

    return res.status(200).json(result.rows[0]);
  } catch (error: any) {
    console.error("Error fetching SD document type:", error);
    return res.status(500).json({ error: "Internal server error", message: error.message });
  }
}

// POST /api/master-data/sd-document-types - Create a new SD document type
export async function createSDDocumentType(req: Request, res: Response) {
  try {
    const { code, name, salesDocumentCategoryId, numberRange, documentPricingProcedure, isActive } = req.body;

    // Validation
    if (!code || !name || !salesDocumentCategoryId) {
      return res.status(400).json({
        error: "Validation error",
        message: "Code, name, and sales document category are required"
      });
    }

    // Validate sales document category exists and get its sales process type
    const categoryCheck = await pool.query(`
      SELECT id, category_code, category_name, sales_process_type FROM sales_document_categories WHERE id = $1
    `, [salesDocumentCategoryId]);

    if (categoryCheck.rows.length === 0) {
      return res.status(400).json({
        error: "Validation error",
        message: "Invalid sales document category ID"
      });
    }

    // Check if code already exists
    const existingResult = await pool.query(`
      SELECT id FROM sd_document_types WHERE code = $1
    `, [code.toUpperCase()]);

    if (existingResult.rows.length > 0) {
      return res.status(409).json({
        error: "Conflict",
        message: "Document type code already exists"
      });
    }

    // Use values from request, no hardcoded defaults
    const normalizedCode = code.trim().toUpperCase();
    const activeStatus = isActive !== undefined ? isActive : true; // Use request value or database default

    // Get the sales process type from sales_document_categories table (no hardcoding!)
    // This dynamically fetches the process type (ORDER/DELIVERY/BILLING) from the database
    const categoryRow = categoryCheck.rows[0];
    const category = categoryRow.sales_process_type;

    // Validate that sales process type exists and is valid
    if (!category) {
      return res.status(400).json({
        error: "Invalid sales document category",
        message: "The selected sales document category does not have a sales process type assigned"
      });
    }

    const result = await pool.query(`
      INSERT INTO sd_document_types (
        code, name, category, sales_document_category_id, number_range, document_pricing_procedure, is_active
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7
      ) RETURNING 
        id,
        code,
        name,
        category,
        sales_document_category_id as "salesDocumentCategoryId",
        number_range as "numberRange",
        document_pricing_procedure as "documentPricingProcedure",
        is_active as "isActive",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `, [
      normalizedCode,
      name.trim(),
      category,
      salesDocumentCategoryId,
      numberRange?.trim() || null,
      documentPricingProcedure?.trim() || null,
      activeStatus
    ]);

    // Fetch with category details
    const fullResult = await pool.query(`
      SELECT 
        dt.id,
        dt.code,
        dt.name,
        dt.category,
        dt.sales_document_category_id as "salesDocumentCategoryId",
        sdc.category_code as "salesDocumentCategoryCode",
        sdc.category_name as "salesDocumentCategoryName",
        dt.number_range as "numberRange",
        dt.document_pricing_procedure as "documentPricingProcedure",
        dt.is_active as "isActive",
        dt.created_at as "createdAt",
        dt.updated_at as "updatedAt"
      FROM sd_document_types dt
      LEFT JOIN sales_document_categories sdc ON dt.sales_document_category_id = sdc.id
      WHERE dt.id = $1
    `, [result.rows[0].id]);

    return res.status(201).json(fullResult.rows[0]);
  } catch (error: any) {
    console.error("Error creating SD document type:", error);
    return res.status(500).json({ error: "Internal server error", message: error.message });
  }
}

// PUT /api/master-data/sd-document-types/:id - Update an SD document type
export async function updateSDDocumentType(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID format" });
    }

    const { code, name, salesDocumentCategoryId, numberRange, documentPricingProcedure, isActive } = req.body;

    // Check if document type exists
    const existingResult = await pool.query(`
      SELECT * FROM sd_document_types WHERE id = $1
    `, [id]);

    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: "SD document type not found" });
    }

    const existingDocType = existingResult.rows[0];

    // If code is being changed, check it doesn't conflict with another document type
    if (code && code.toUpperCase() !== existingDocType.code) {
      const duplicateResult = await pool.query(`
        SELECT id FROM sd_document_types WHERE code = $1 AND id != $2
      `, [code.toUpperCase(), id]);

      if (duplicateResult.rows.length > 0) {
        return res.status(409).json({
          error: "Conflict",
          message: "Document type code already exists"
        });
      }
    }

    // Validate sales document category if provided
    if (salesDocumentCategoryId !== undefined) {
      const categoryCheck = await pool.query(`
        SELECT id FROM sales_document_categories WHERE id = $1
      `, [salesDocumentCategoryId]);

      if (categoryCheck.rows.length === 0) {
        return res.status(400).json({
          error: "Validation error",
          message: "Invalid sales document category ID"
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
    if (salesDocumentCategoryId !== undefined) {
      updates.push(`sales_document_category_id = $${paramIndex++}`);
      values.push(salesDocumentCategoryId);
    }
    if (numberRange !== undefined) {
      updates.push(`number_range = $${paramIndex++}`);
      values.push(numberRange?.trim() || null);
    }
    if (documentPricingProcedure !== undefined) {
      updates.push(`document_pricing_procedure = $${paramIndex++}`);
      values.push(documentPricingProcedure?.trim() || null);
    }
    if (isActive !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(isActive);
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const updateQuery = `
      UPDATE sd_document_types 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
    `;

    await pool.query(updateQuery, values);

    // Fetch updated record with category details
    const result = await pool.query(`
      SELECT 
        dt.id,
        dt.code,
        dt.name,
        dt.category,
        dt.sales_document_category_id as "salesDocumentCategoryId",
        sdc.category_code as "salesDocumentCategoryCode",
        sdc.category_name as "salesDocumentCategoryName",
        dt.number_range as "numberRange",
        dt.document_pricing_procedure as "documentPricingProcedure",
        dt.is_active as "isActive",
        dt.created_at as "createdAt",
        dt.updated_at as "updatedAt"
      FROM sd_document_types dt
      LEFT JOIN sales_document_categories sdc ON dt.sales_document_category_id = sdc.id
      WHERE dt.id = $1
    `, [id]);

    return res.status(200).json(result.rows[0]);
  } catch (error: any) {
    console.error("Error updating SD document type:", error);
    return res.status(500).json({ error: "Internal server error", message: error.message });
  }
}

// DELETE /api/master-data/sd-document-types/:id - Delete an SD document type
export async function deleteSDDocumentType(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID format" });
    }

    // Check if document type exists
    const existingResult = await pool.query(`
      SELECT * FROM sd_document_types WHERE id = $1
    `, [id]);

    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: "SD document type not found" });
    }

    // Check for usage in sales orders
    const salesOrdersCheck = await pool.query(`
      SELECT COUNT(*) as count FROM sales_orders WHERE document_type = $1
    `, [existingResult.rows[0].code]);

    const salesOrdersCount = parseInt(String(salesOrdersCheck.rows[0].count));
    if (salesOrdersCount > 0) {
      return res.status(409).json({
        error: "Cannot delete document type",
        message: `This document type is used in ${salesOrdersCount} sales order(s). Please remove these records first or deactivate the document type instead.`
      });
    }

    // Delete document type
    await pool.query(`
      DELETE FROM sd_document_types WHERE id = $1
    `, [id]);

    return res.status(200).json({ message: "SD document type deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting SD document type:", error);

    // Check if it's a foreign key constraint error
    if (error.message && error.message.includes('violates foreign key constraint')) {
      return res.status(409).json({
        error: "Cannot delete document type",
        message: "This document type has associated records in other tables. Please remove these records first or deactivate the document type instead."
      });
    }

    return res.status(500).json({ error: "Internal server error", message: error.message });
  }
}

// PUT /api/master-data/sd-document-types/:id/deactivate - Deactivate an SD document type
export async function deactivateSDDocumentType(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID format" });
    }

    // Check if document type exists
    const existingResult = await pool.query(`
      SELECT * FROM sd_document_types WHERE id = $1
    `, [id]);

    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: "SD document type not found" });
    }

    // Deactivate document type
    await pool.query(`
      UPDATE sd_document_types 
      SET is_active = false, updated_at = NOW()
      WHERE id = $1
    `, [id]);

    // Fetch updated record with category details
    const updateResult = await pool.query(`
      SELECT 
        dt.id,
        dt.code,
        dt.name,
        dt.category,
        dt.sales_document_category_id as "salesDocumentCategoryId",
        sdc.category_code as "salesDocumentCategoryCode",
        sdc.category_name as "salesDocumentCategoryName",
        dt.number_range as "numberRange",
        dt.document_pricing_procedure as "documentPricingProcedure",
        dt.is_active as "isActive",
        dt.created_at as "createdAt",
        dt.updated_at as "updatedAt"
      FROM sd_document_types dt
      LEFT JOIN sales_document_categories sdc ON dt.sales_document_category_id = sdc.id
      WHERE dt.id = $1
    `, [id]);

    return res.status(200).json({
      message: "SD document type deactivated successfully",
      documentType: updateResult.rows[0]
    });
  } catch (error: any) {
    console.error("Error deactivating SD document type:", error);
    return res.status(500).json({ error: "Internal server error", message: error.message });
  }
}

