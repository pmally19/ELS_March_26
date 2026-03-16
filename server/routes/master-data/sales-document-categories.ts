import { Request, Response } from "express";
import { pool } from "../../db";

// Get all sales document categories
export async function getSalesDocumentCategories(req: Request, res: Response) {
  try {
    const result = await pool.query(`
      SELECT 
        sdc.id,
        sdc.category_code as "categoryCode",
        sdc.category_name as "categoryName",
        sdc.description,
        spt.process_code as "salesProcessType",
        sdc.delivery_relevant as "deliveryRelevant",
        sdc.billing_relevant as "billingRelevant",
        sdc.pricing_required as "pricingRequired",
        sdc.created_at as "createdAt",
        sdc.updated_at as "updatedAt"
      FROM sales_document_categories sdc
      LEFT JOIN sales_process_types spt ON sdc.sales_process_type_id = spt.id
      ORDER BY sdc.category_code
    `);

    return res.status(200).json(result.rows);
  } catch (error: any) {
    console.error("Error fetching sales document categories:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: "Failed to fetch sales document categories",
      details: error.message
    });
  }
}

// Get sales document category by ID
export async function getSalesDocumentCategoryById(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({
        error: "Validation error",
        message: "Invalid category ID format. ID must be a positive integer."
      });
    }

    const result = await pool.query(`
      SELECT 
        sdc.id,
        sdc.category_code as "categoryCode",
        sdc.category_name as "categoryName",
        sdc.description,
        spt.process_code as "salesProcessType",
        sdc.delivery_relevant as "deliveryRelevant",
        sdc.billing_relevant as "billingRelevant",
        sdc.pricing_required as "pricingRequired",
        sdc.created_at as "createdAt",
        sdc.updated_at as "updatedAt"
      FROM sales_document_categories sdc
      LEFT JOIN sales_process_types spt ON sdc.sales_process_type_id = spt.id
      WHERE sdc.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Not found",
        message: "Sales document category not found"
      });
    }

    return res.status(200).json(result.rows[0]);
  } catch (error: any) {
    console.error("Error fetching sales document category:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: "Failed to fetch sales document category",
      details: error.message
    });
  }
}

// Create new sales document category
export async function createSalesDocumentCategory(req: Request, res: Response) {
  try {
    const {
      categoryCode,
      category_code,
      categoryName,
      category_name,
      description,
      salesProcessType,
      sales_process_type,
      deliveryRelevant,
      delivery_relevant,
      billingRelevant,
      billing_relevant,
      pricingRequired,
      pricing_required
    } = req.body;

    // Normalize field names (support both camelCase and snake_case)
    const normalizedCode = (categoryCode || category_code || '').trim().toUpperCase();
    const normalizedName = (categoryName || category_name || '').trim();
    const normalizedDescription = (description || '').trim();
    const normalizedProcessType = (salesProcessType || sales_process_type || '').trim().toUpperCase();
    const normalizedDeliveryRelevant = deliveryRelevant !== undefined ? deliveryRelevant : (delivery_relevant !== undefined ? delivery_relevant : false);
    const normalizedBillingRelevant = billingRelevant !== undefined ? billingRelevant : (billing_relevant !== undefined ? billing_relevant : false);
    const normalizedPricingRequired = pricingRequired !== undefined ? pricingRequired : (pricing_required !== undefined ? pricing_required : false);

    // Validation: Category code is required
    if (!normalizedCode || normalizedCode.length === 0) {
      return res.status(400).json({
        error: "Validation error",
        message: "Category code is required and cannot be empty"
      });
    }

    // Validation: Category name is required
    if (!normalizedName || normalizedName.length === 0) {
      return res.status(400).json({
        error: "Validation error",
        message: "Category name is required and cannot be empty"
      });
    }

    // Validation: Description is required
    if (!normalizedDescription || normalizedDescription.length === 0) {
      return res.status(400).json({
        error: "Validation error",
        message: "Description is required and cannot be empty"
      });
    }

    // Validation: Code length
    if (normalizedCode.length > 10) {
      return res.status(400).json({
        error: "Validation error",
        message: "Category code cannot exceed 10 characters"
      });
    }

    // Validation: Name length
    if (normalizedName.length > 100) {
      return res.status(400).json({
        error: "Validation error",
        message: "Category name cannot exceed 100 characters"
      });
    }

    // Validation: Sales process type is required
    if (!normalizedProcessType || normalizedProcessType.length === 0) {
      return res.status(400).json({
        error: "Validation error",
        message: "Sales process type is required"
      });
    }

    // Get sales_process_type_id from process_code
    const processTypeResult = await pool.query(
      "SELECT id FROM sales_process_types WHERE process_code = $1 AND is_active = true",
      [normalizedProcessType]
    );

    if (processTypeResult.rows.length === 0) {
      return res.status(400).json({
        error: "Validation error",
        message: `Invalid sales process type: ${normalizedProcessType}`
      });
    }

    const salesProcessTypeId = processTypeResult.rows[0].id;

    // Check if category code already exists
    const existingCode = await pool.query(
      "SELECT id, category_name FROM sales_document_categories WHERE category_code = $1",
      [normalizedCode]
    );
    if (existingCode.rows.length > 0) {
      return res.status(409).json({
        error: "Conflict",
        message: `Category code "${normalizedCode}" already exists. Please use a different code.`,
        existingCategory: existingCode.rows[0]
      });
    }

    // Check if category name already exists
    const existingName = await pool.query(
      "SELECT id, category_code FROM sales_document_categories WHERE category_name = $1",
      [normalizedName]
    );
    if (existingName.rows.length > 0) {
      return res.status(409).json({
        error: "Conflict",
        message: `Category name "${normalizedName}" already exists. Please use a different name.`,
        existingCategory: existingName.rows[0]
      });
    }

    // Insert new category
    const result = await pool.query(`
      INSERT INTO sales_document_categories (
        category_code, 
        category_name, 
        description,
        sales_process_type_id,
        sales_process_type,
        delivery_relevant, 
        billing_relevant, 
        pricing_required
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING 
        id,
        category_code as "categoryCode",
        category_name as "categoryName",
        description,
        sales_process_type as "salesProcessType",
        delivery_relevant as "deliveryRelevant",
        billing_relevant as "billingRelevant",
        pricing_required as "pricingRequired",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `, [
      normalizedCode,
      normalizedName,
      normalizedDescription,
      salesProcessTypeId,
      normalizedProcessType,
      normalizedDeliveryRelevant,
      normalizedBillingRelevant,
      normalizedPricingRequired
    ]);

    return res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error("Error creating sales document category:", error);

    // Handle database constraint violations
    if (error.code === '23505') { // Unique violation
      const constraint = error.constraint;
      if (constraint?.includes('category_code')) {
        return res.status(409).json({
          error: "Conflict",
          message: "Category code already exists"
        });
      }
      if (constraint?.includes('category_name')) {
        return res.status(409).json({
          error: "Conflict",
          message: "Category name already exists"
        });
      }
      return res.status(409).json({
        error: "Conflict",
        message: "A category with this code or name already exists"
      });
    }

    return res.status(500).json({
      error: "Internal server error",
      message: "Failed to create sales document category",
      details: error.message
    });
  }
}

// Update sales document category
export async function updateSalesDocumentCategory(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({
        error: "Validation error",
        message: "Invalid category ID format. ID must be a positive integer."
      });
    }

    const {
      categoryCode,
      category_code,
      categoryName,
      category_name,
      description,
      salesProcessType,
      sales_process_type,
      deliveryRelevant,
      delivery_relevant,
      billingRelevant,
      billing_relevant,
      pricingRequired,
      pricing_required
    } = req.body;

    // Check if category exists
    const existing = await pool.query(
      "SELECT * FROM sales_document_categories WHERE id = $1",
      [id]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({
        error: "Not found",
        message: "Sales document category not found"
      });
    }

    // Normalize field names
    let normalizedCode = null;
    if (categoryCode !== undefined || category_code !== undefined) {
      normalizedCode = (categoryCode || category_code || '').trim().toUpperCase();
      if (normalizedCode.length === 0) {
        return res.status(400).json({
          error: "Validation error",
          message: "Category code cannot be empty"
        });
      }
      if (normalizedCode.length > 10) {
        return res.status(400).json({
          error: "Validation error",
          message: "Category code cannot exceed 10 characters"
        });
      }
    }

    let normalizedName = null;
    if (categoryName !== undefined || category_name !== undefined) {
      normalizedName = (categoryName || category_name || '').trim();
      if (normalizedName.length === 0) {
        return res.status(400).json({
          error: "Validation error",
          message: "Category name cannot be empty"
        });
      }
      if (normalizedName.length > 100) {
        return res.status(400).json({
          error: "Validation error",
          message: "Category name cannot exceed 100 characters"
        });
      }
    }

    let normalizedDescription = null;
    if (description !== undefined) {
      normalizedDescription = description.trim();
      if (normalizedDescription.length === 0) {
        return res.status(400).json({
          error: "Validation error",
          message: "Description cannot be empty"
        });
      }
    }

    let salesProcessTypeId = null;
    let processTypeCodeToUpdate = null;

    if (salesProcessType !== undefined || sales_process_type !== undefined) {
      const normalizedProcessType = (salesProcessType || sales_process_type || '').trim().toUpperCase();
      if (normalizedProcessType.length > 0) {
        processTypeCodeToUpdate = normalizedProcessType;
        const processTypeResult = await pool.query(
          "SELECT id FROM sales_process_types WHERE process_code = $1 AND is_active = true",
          [normalizedProcessType]
        );
        if (processTypeResult.rows.length === 0) {
          return res.status(400).json({
            error: "Validation error",
            message: `Invalid sales process type: ${normalizedProcessType}`
          });
        }
        salesProcessTypeId = processTypeResult.rows[0].id;
      }
    }

    const normalizedDeliveryRelevant = deliveryRelevant !== undefined ? deliveryRelevant : delivery_relevant;
    const normalizedBillingRelevant = billingRelevant !== undefined ? billingRelevant : billing_relevant;
    const normalizedPricingRequired = pricingRequired !== undefined ? pricingRequired : pricing_required;

    // Check for code conflicts if code is being changed
    if (normalizedCode !== null && normalizedCode !== existing.rows[0].category_code) {
      const codeConflict = await pool.query(
        "SELECT id, category_name FROM sales_document_categories WHERE category_code = $1 AND id != $2",
        [normalizedCode, id]
      );
      if (codeConflict.rows.length > 0) {
        return res.status(409).json({
          error: "Conflict",
          message: `Category code "${normalizedCode}" already exists. Please use a different code.`,
          existingCategory: codeConflict.rows[0]
        });
      }
    }

    // Check for name conflicts if name is being changed
    if (normalizedName !== null && normalizedName !== existing.rows[0].category_name) {
      const nameConflict = await pool.query(
        "SELECT id, category_code FROM sales_document_categories WHERE category_name = $1 AND id != $2",
        [normalizedName, id]
      );
      if (nameConflict.rows.length > 0) {
        return res.status(409).json({
          error: "Conflict",
          message: `Category name "${normalizedName}" already exists. Please use a different name.`,
          existingCategory: nameConflict.rows[0]
        });
      }
    }

    // Build update query dynamically
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (normalizedCode !== null) {
      updates.push(`category_code = $${paramIndex++}`);
      values.push(normalizedCode);
    }
    if (normalizedName !== null) {
      updates.push(`category_name = $${paramIndex++}`);
      values.push(normalizedName);
    }
    if (normalizedDescription !== null) {
      updates.push(`description = $${paramIndex++}`);
      values.push(normalizedDescription);
    }
    if (salesProcessTypeId !== null) {
      updates.push(`sales_process_type_id = $${paramIndex++}`);
      values.push(salesProcessTypeId);
      updates.push(`sales_process_type = $${paramIndex++}`);
      values.push(processTypeCodeToUpdate);
    }
    if (normalizedDeliveryRelevant !== undefined) {
      updates.push(`delivery_relevant = $${paramIndex++}`);
      values.push(normalizedDeliveryRelevant);
    }
    if (normalizedBillingRelevant !== undefined) {
      updates.push(`billing_relevant = $${paramIndex++}`);
      values.push(normalizedBillingRelevant);
    }
    if (normalizedPricingRequired !== undefined) {
      updates.push(`pricing_required = $${paramIndex++}`);
      values.push(normalizedPricingRequired);
    }

    // If no updates, return existing record
    if (updates.length === 0) {
      const existingResult = await pool.query(`
        SELECT 
          id,
          category_code as "categoryCode",
          category_name as "categoryName",
          description,
          delivery_relevant as "deliveryRelevant",
          billing_relevant as "billingRelevant",
          pricing_required as "pricingRequired",
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM sales_document_categories
        WHERE id = $1
      `, [id]);
      return res.status(200).json(existingResult.rows[0]);
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const result = await pool.query(`
      UPDATE sales_document_categories 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING 
        id,
        category_code as "categoryCode",
        category_name as "categoryName",
        description,
        delivery_relevant as "deliveryRelevant",
        billing_relevant as "billingRelevant",
        pricing_required as "pricingRequired",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `, values);

    return res.status(200).json(result.rows[0]);
  } catch (error: any) {
    console.error("Error updating sales document category:", error);

    // Handle database constraint violations
    if (error.code === '23505') { // Unique violation
      return res.status(409).json({
        error: "Conflict",
        message: "A category with this code or name already exists"
      });
    }

    return res.status(500).json({
      error: "Internal server error",
      message: "Failed to update sales document category",
      details: error.message
    });
  }
}

// Delete sales document category
export async function deleteSalesDocumentCategory(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id) || id <= 0) {
      return res.status(400).json({
        error: "Validation error",
        message: "Invalid category ID format. ID must be a positive integer."
      });
    }

    // Check if category exists
    const existing = await pool.query(
      "SELECT id, category_code, category_name FROM sales_document_categories WHERE id = $1",
      [id]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({
        error: "Not found",
        message: "Sales document category not found"
      });
    }

    // Check if category is being used (you can add foreign key checks here if needed)
    // For now, we'll do a hard delete as per requirements

    // Delete the category
    const result = await pool.query(`
      DELETE FROM sales_document_categories 
      WHERE id = $1 
      RETURNING 
        id,
        category_code as "categoryCode",
        category_name as "categoryName"
    `, [id]);

    return res.status(200).json({
      message: "Sales document category deleted successfully",
      deletedRecord: result.rows[0]
    });
  } catch (error: any) {
    console.error("Error deleting sales document category:", error);

    // Handle foreign key constraint violations
    if (error.code === '23503') {
      return res.status(409).json({
        error: "Cannot delete category",
        message: "This category has associated records in other tables. Please remove these associations first."
      });
    }

    return res.status(500).json({
      error: "Internal server error",
      message: "Failed to delete sales document category",
      details: error.message
    });
  }
}

