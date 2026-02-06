import { Request, Response } from "express";
import { pool } from "../../db";

// Get all material groups
export async function getMaterialGroups(req: Request, res: Response) {
  try {
    const result = await pool.query("SELECT * FROM material_groups ORDER BY code");
    return res.status(200).json(result.rows);
  } catch (error) {
    console.error("Error fetching material groups:", error);
    return res.status(500).json({ message: "Failed to fetch material groups", error });
  }
}

// Get material group by ID
export async function getMaterialGroupById(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid ID format" });
    }
    
    const result = await pool.query("SELECT * FROM material_groups WHERE id = $1", [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Material group not found" });
    }
    
    return res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error("Error fetching material group:", error);
    return res.status(500).json({ message: "Failed to fetch material group", error });
  }
}

// Create new material group
export async function createMaterialGroup(req: Request, res: Response) {
  try {
    // Accept both camelCase (from client) and snake_case (legacy)
    const { 
      code, 
      description, 
      materialGroupHierarchy, 
      material_group_hierarchy,
      generalItemCategory,
      general_item_category,
      isActive,
      is_active 
    } = req.body;
    
    // Use camelCase if provided, otherwise fallback to snake_case
    const material_group_hierarchy_value = materialGroupHierarchy || material_group_hierarchy;
    const general_item_category_value = generalItemCategory || general_item_category;
    const is_active_value = isActive !== undefined ? isActive : (is_active !== undefined ? is_active : true);
    
    if (!code || !description) {
      return res.status(400).json({ message: "Code and description are required" });
    }
    
    // Check if code already exists
    const existingCode = await pool.query("SELECT id FROM material_groups WHERE code = $1", [code]);
    if (existingCode.rows.length > 0) {
      return res.status(409).json({ message: "Material group code already exists" });
    }
    
    const result = await pool.query(`
      INSERT INTO material_groups (code, description, material_group_hierarchy, general_item_category, is_active, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      RETURNING *
    `, [code, description, material_group_hierarchy_value, general_item_category_value, is_active_value]);
    
    return res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Error creating material group:", error);
    return res.status(500).json({ message: "Failed to create material group", error });
  }
}

// Update material group
export async function updateMaterialGroup(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid ID format" });
    }
    
    // Accept both camelCase (from client) and snake_case (legacy)
    const { 
      code, 
      description, 
      materialGroupHierarchy, 
      material_group_hierarchy,
      generalItemCategory,
      general_item_category,
      isActive,
      is_active 
    } = req.body;
    
    // Use camelCase if provided, otherwise fallback to snake_case
    const material_group_hierarchy_value = materialGroupHierarchy !== undefined ? materialGroupHierarchy : material_group_hierarchy;
    const general_item_category_value = generalItemCategory !== undefined ? generalItemCategory : general_item_category;
    const is_active_value = isActive !== undefined ? isActive : is_active;
    
    // Check if material group exists
    const existing = await pool.query("SELECT * FROM material_groups WHERE id = $1", [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ message: "Material group not found" });
    }
    
    // Check if new code conflicts with existing (excluding current record)
    if (code && code !== existing.rows[0].code) {
      const codeConflict = await pool.query("SELECT id FROM material_groups WHERE code = $1 AND id != $2", [code, id]);
      if (codeConflict.rows.length > 0) {
        return res.status(409).json({ message: "Material group code already exists" });
      }
    }
    
    const result = await pool.query(`
      UPDATE material_groups 
      SET code = COALESCE($1, code), 
          description = COALESCE($2, description),
          material_group_hierarchy = COALESCE($3, material_group_hierarchy),
          general_item_category = COALESCE($4, general_item_category),
          is_active = COALESCE($5, is_active),
          updated_at = NOW()
      WHERE id = $6
      RETURNING *
    `, [code, description, material_group_hierarchy_value, general_item_category_value, is_active_value, id]);
    
    return res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error("Error updating material group:", error);
    return res.status(500).json({ message: "Failed to update material group", error });
  }
}

// Delete material group
export async function deleteMaterialGroup(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid ID format" });
    }
    
    const result = await pool.query("DELETE FROM material_groups WHERE id = $1 RETURNING *", [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Material group not found" });
    }
    
    return res.status(200).json({ message: "Material group deleted successfully", deletedRecord: result.rows[0] });
  } catch (error) {
    console.error("Error deleting material group:", error);
    return res.status(500).json({ message: "Failed to delete material group", error });
  }
}

// Bulk import material groups
export async function bulkImportMaterialGroups(req: Request, res: Response) {
  try {
    const { materialGroups: importData } = req.body;
    
    if (!Array.isArray(importData) || importData.length === 0) {
      return res.status(400).json({ message: "Valid material groups array is required" });
    }
    
    const results = [];
    const errors = [];
    
    for (let index = 0; index < importData.length; index++) {
      const group = importData[index];
      try {
        // Accept both camelCase and snake_case
        const { 
          code, 
          description, 
          materialGroupHierarchy, 
          material_group_hierarchy,
          generalItemCategory,
          general_item_category,
          isActive,
          is_active 
        } = group;
        
        // Use camelCase if provided, otherwise fallback to snake_case
        const material_group_hierarchy_value = materialGroupHierarchy || material_group_hierarchy;
        const general_item_category_value = generalItemCategory || general_item_category;
        const is_active_value = isActive !== undefined ? isActive : (is_active !== undefined ? is_active : true);
        
        if (!code || !description) {
          errors.push({ row: index + 1, error: "Code and description are required" });
          continue;
        }
        
        // Check if code already exists
        const existingCode = await pool.query("SELECT id FROM material_groups WHERE code = $1", [code]);
        if (existingCode.rows.length > 0) {
          errors.push({ row: index + 1, error: `Material group code ${code} already exists` });
          continue;
        }
        
        const result = await pool.query(`
          INSERT INTO material_groups (code, description, material_group_hierarchy, general_item_category, is_active, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
          RETURNING *
        `, [code, description, material_group_hierarchy_value, general_item_category_value, is_active_value]);
        
        results.push(result.rows[0]);
      } catch (error) {
        errors.push({ row: index + 1, error: error.message });
      }
    }
    
    return res.status(200).json({
      message: `Bulk import completed. ${results.length} material groups created, ${errors.length} errors`,
      imported: results,
      errors,
    });
  } catch (error) {
    console.error("Error bulk importing material groups:", error);
    return res.status(500).json({ message: "Failed to bulk import material groups", error });
  }
}
