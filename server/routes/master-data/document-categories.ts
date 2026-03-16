import { Request, Response } from "express";
import { pool } from "../../db";

// Get all document categories
export async function getDocumentCategories(req: Request, res: Response) {
  try {
    const result = await pool.query("SELECT * FROM document_categories ORDER BY code");
    return res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error fetching document categories:", error);
    return res.status(500).json({ message: "Failed to fetch document categories", error });
  }
}

// Get document category by ID
export async function getDocumentCategoryById(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid ID format" });
    }
    
    const result = await pool.query("SELECT * FROM document_categories WHERE id = $1", [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Document category not found" });
    }
    
    return res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching document category:", error);
    return res.status(500).json({ message: "Failed to fetch document category", error });
  }
}

// Create new document category
export async function createDocumentCategory(req: Request, res: Response) {
  try {
    // Accept both camelCase (from client) and snake_case (legacy)
    const { 
      code, 
      name, 
      description,
      isActive,
      is_active 
    } = req.body;
    
    // Use camelCase if provided, otherwise fallback to snake_case
    const is_active_value = isActive !== undefined ? isActive : (is_active !== undefined ? is_active : true);
    
    if (!code || !name) {
      return res.status(400).json({ message: "Code and name are required" });
    }
    
    // Check if code already exists
    const existingCode = await pool.query("SELECT id FROM document_categories WHERE code = $1", [code]);
    if (existingCode.rows.length > 0) {
      return res.status(409).json({ message: "Document category code already exists" });
    }
    
    const result = await pool.query(`
      INSERT INTO document_categories (code, name, description, is_active, created_at, updated_at)
      VALUES ($1, $2, $3, $4, NOW(), NOW())
      RETURNING *
    `, [code, name, description || null, is_active_value]);
    
    return res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error creating document category:", error);
    return res.status(500).json({ message: "Failed to create document category", error });
  }
}

// Update document category
export async function updateDocumentCategory(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid ID format" });
    }
    
    // Accept both camelCase (from client) and snake_case (legacy)
    const { 
      code, 
      name, 
      description,
      isActive,
      is_active 
    } = req.body;
    
    // Use camelCase if provided, otherwise fallback to snake_case
    const is_active_value = isActive !== undefined ? isActive : is_active;
    
    // Check if document category exists
    const existing = await pool.query("SELECT * FROM document_categories WHERE id = $1", [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ message: "Document category not found" });
    }
    
    // Check if new code conflicts with existing (excluding current record)
    if (code && code !== existing.rows[0].code) {
      const codeConflict = await pool.query("SELECT id FROM document_categories WHERE code = $1 AND id != $2", [code, id]);
      if (codeConflict.rows.length > 0) {
        return res.status(409).json({ message: "Document category code already exists" });
      }
    }
    
    const result = await pool.query(`
      UPDATE document_categories 
      SET code = COALESCE($1, code), 
          name = COALESCE($2, name),
          description = COALESCE($3, description),
          is_active = COALESCE($4, is_active),
          updated_at = NOW()
      WHERE id = $5
      RETURNING *
    `, [code, name, description, is_active_value, id]);
    
    return res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error("Error updating document category:", error);
    return res.status(500).json({ message: "Failed to update document category", error });
  }
}

// Delete document category
export async function deleteDocumentCategory(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid ID format" });
    }
    
    // Check if document category is being used by document types
    const usageCheck = await pool.query(
      "SELECT COUNT(*) as count FROM document_types WHERE document_category = (SELECT code FROM document_categories WHERE id = $1)",
      [id]
    );
    
    if (usageCheck.rows[0].count > 0) {
      return res.status(409).json({ 
        message: "Cannot delete document category. It is being used by document types.",
        usageCount: parseInt(usageCheck.rows[0].count)
      });
    }
    
    const result = await pool.query("DELETE FROM document_categories WHERE id = $1 RETURNING *", [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Document category not found" });
    }
    
    return res.status(200).json({ message: "Document category deleted successfully", deletedRecord: result.rows[0] });
  } catch (error) {
    console.error("Error deleting document category:", error);
    return res.status(500).json({ message: "Failed to delete document category", error });
  }
}

// Bulk import document categories
export async function bulkImportDocumentCategories(req: Request, res: Response) {
  try {
    const { documentCategories: importData } = req.body;
    
    if (!Array.isArray(importData) || importData.length === 0) {
      return res.status(400).json({ message: "Valid document categories array is required" });
    }
    
    const results = [];
    const errors = [];
    
    for (let index = 0; index < importData.length; index++) {
      const category = importData[index];
      try {
        // Accept both camelCase and snake_case
        const { 
          code, 
          name, 
          description,
          isActive,
          is_active 
        } = category;
        
        // Use camelCase if provided, otherwise fallback to snake_case
        const is_active_value = isActive !== undefined ? isActive : (is_active !== undefined ? is_active : true);
        
        if (!code || !name) {
          errors.push({ row: index + 1, error: "Code and name are required" });
          continue;
        }
        
        // Check if code already exists
        const existingCode = await pool.query("SELECT id FROM document_categories WHERE code = $1", [code]);
        if (existingCode.rows.length > 0) {
          errors.push({ row: index + 1, error: `Document category code ${code} already exists` });
          continue;
        }
        
        const result = await pool.query(`
          INSERT INTO document_categories (code, name, description, is_active, created_at, updated_at)
          VALUES ($1, $2, $3, $4, NOW(), NOW())
          RETURNING *
        `, [code, name, description || null, is_active_value]);
        
        results.push(result.rows[0]);
      } catch (error) {
        errors.push({ row: index + 1, error: error.message });
      }
    }
    
    return res.status(200).json({
      message: `Bulk import completed. ${results.length} document categories created, ${errors.length} errors`,
      imported: results,
      errors,
    });
  } catch (error) {
    console.error("Error bulk importing document categories:", error);
    return res.status(500).json({ message: "Failed to bulk import document categories", error });
  }
}

