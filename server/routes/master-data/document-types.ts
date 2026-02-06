import { Request, Response } from 'express';
import { ensureActivePool } from '../../database';

const pool = ensureActivePool();

// GET /api/master-data/document-types - Get all document types
export async function getDocumentTypes(req: Request, res: Response) {
  try {
    const result = await pool.query(`
      SELECT 
        dt.*,
        cc.code as company_code,
        cc.name as company_name
      FROM document_types dt
      LEFT JOIN company_codes cc ON dt.company_code_id = cc.id
      ORDER BY dt.document_type_code ASC
    `);
    return res.status(200).json(result.rows);
  } catch (error: any) {
    console.error("Error fetching document types:", error);
    return res.status(500).json({ error: "Internal server error", message: error.message });
  }
}

// GET /api/master-data/document-types/:id - Get document type by ID
export async function getDocumentTypeById(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID format" });
    }

    const result = await pool.query(`
      SELECT 
        dt.*,
        cc.code as company_code,
        cc.name as company_name
      FROM document_types dt
      LEFT JOIN company_codes cc ON dt.company_code_id = cc.id
      WHERE dt.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Document type not found" });
    }

    return res.status(200).json(result.rows[0]);
  } catch (error: any) {
    console.error("Error fetching document type:", error);
    return res.status(500).json({ error: "Internal server error", message: error.message });
  }
}

// POST /api/master-data/document-types - Create a new document type
export async function createDocumentType(req: Request, res: Response) {
  try {
    const {
      documentTypeCode,
      description,
      documentCategory,
      numberRange,
      reversalAllowed,
      accountTypesAllowed,
      entryView,
      referenceRequired,
      authorizationGroup,
      companyCodeId,
      isActive
    } = req.body;

    // Validation
    if (!documentTypeCode || !description || !documentCategory) {
      return res.status(400).json({ 
        error: "Validation error", 
        message: "Document type code, description, and category are required" 
      });
    }

    // Check if document type code already exists for this company
    const existingResult = await pool.query(`
      SELECT id FROM document_types 
      WHERE document_type_code = $1 AND company_code_id = $2
    `, [documentTypeCode.toUpperCase(), companyCodeId || 1]);

    if (existingResult.rows.length > 0) {
      return res.status(409).json({ 
        error: "Conflict", 
        message: "Document type code already exists for this company" 
      });
    }

    const result = await pool.query(`
      INSERT INTO document_types (
        document_type_code, description, document_category, number_range,
        reversal_allowed, account_types_allowed, entry_view, reference_required,
        authorization_group, company_code_id, is_active, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
      RETURNING *
    `, [
      documentTypeCode.toUpperCase().trim(),
      description.trim(),
      documentCategory,
      numberRange || null,
      reversalAllowed !== undefined ? reversalAllowed : true,
      accountTypesAllowed || null,
      entryView || 'standard',
      referenceRequired !== undefined ? referenceRequired : false,
      authorizationGroup || null,
      companyCodeId || 1,
      isActive !== undefined ? isActive : true
    ]);

    return res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error("Error creating document type:", error);
    
    // Handle specific database errors
    if (error.code === '23505') {
      return res.status(409).json({ 
        error: "Conflict", 
        message: "Document type with this code already exists" 
      });
    } else if (error.code === '23514') {
      return res.status(400).json({ 
        error: "Validation error", 
        message: "Invalid data provided" 
      });
    }
    
    return res.status(500).json({ error: "Internal server error", message: error.message });
  }
}

// PUT /api/master-data/document-types/:id - Update a document type
export async function updateDocumentType(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID format" });
    }

    const {
      documentTypeCode,
      description,
      documentCategory,
      numberRange,
      reversalAllowed,
      accountTypesAllowed,
      entryView,
      referenceRequired,
      authorizationGroup,
      companyCodeId,
      isActive
    } = req.body;

    // Check if document type exists
    const existingResult = await pool.query(`
      SELECT * FROM document_types WHERE id = $1
    `, [id]);
    
    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: "Document type not found" });
    }

    // If code is being changed, check it doesn't conflict with another document type
    if (documentTypeCode && documentTypeCode !== existingResult.rows[0].document_type_code) {
      const conflictCheck = await pool.query(`
        SELECT id FROM document_types 
        WHERE document_type_code = $1 AND company_code_id = $2 AND id != $3
      `, [documentTypeCode.toUpperCase(), companyCodeId || existingResult.rows[0].company_code_id, id]);

      if (conflictCheck.rows.length > 0) {
        return res.status(409).json({ 
          error: "Conflict", 
          message: "Document type code already exists for this company" 
        });
      }
    }

    // Build update query dynamically
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;

    if (documentTypeCode !== undefined) {
      updateFields.push(`document_type_code = $${paramIndex++}`);
      updateValues.push(documentTypeCode.toUpperCase().trim());
    }
    if (description !== undefined) {
      updateFields.push(`description = $${paramIndex++}`);
      updateValues.push(description.trim());
    }
    if (documentCategory !== undefined) {
      updateFields.push(`document_category = $${paramIndex++}`);
      updateValues.push(documentCategory);
    }
    if (numberRange !== undefined) {
      updateFields.push(`number_range = $${paramIndex++}`);
      updateValues.push(numberRange || null);
    }
    if (reversalAllowed !== undefined) {
      updateFields.push(`reversal_allowed = $${paramIndex++}`);
      updateValues.push(reversalAllowed);
    }
    if (accountTypesAllowed !== undefined) {
      updateFields.push(`account_types_allowed = $${paramIndex++}`);
      updateValues.push(accountTypesAllowed || null);
    }
    if (entryView !== undefined) {
      updateFields.push(`entry_view = $${paramIndex++}`);
      updateValues.push(entryView);
    }
    if (referenceRequired !== undefined) {
      updateFields.push(`reference_required = $${paramIndex++}`);
      updateValues.push(referenceRequired);
    }
    if (authorizationGroup !== undefined) {
      updateFields.push(`authorization_group = $${paramIndex++}`);
      updateValues.push(authorizationGroup || null);
    }
    if (companyCodeId !== undefined) {
      updateFields.push(`company_code_id = $${paramIndex++}`);
      updateValues.push(companyCodeId);
    }
    if (isActive !== undefined) {
      updateFields.push(`is_active = $${paramIndex++}`);
      updateValues.push(isActive);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    updateFields.push(`updated_at = NOW()`);
    updateValues.push(id);

    const result = await pool.query(`
      UPDATE document_types 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `, updateValues);

    return res.status(200).json(result.rows[0]);
  } catch (error: any) {
    console.error("Error updating document type:", error);
    
    if (error.code === '23505') {
      return res.status(409).json({ 
        error: "Conflict", 
        message: "Document type with this code already exists" 
      });
    }
    
    return res.status(500).json({ error: "Internal server error", message: error.message });
  }
}

// DELETE /api/master-data/document-types/:id - Delete a document type
export async function deleteDocumentType(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID format" });
    }

    // Check if document type exists
    const existingResult = await pool.query(`
      SELECT id FROM document_types WHERE id = $1
    `, [id]);
    
    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: "Document type not found" });
    }

    await pool.query(`DELETE FROM document_types WHERE id = $1`, [id]);

    return res.status(200).json({ message: "Document type deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting document type:", error);
    return res.status(500).json({ error: "Internal server error", message: error.message });
  }
}

