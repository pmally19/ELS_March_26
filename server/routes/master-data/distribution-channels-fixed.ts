import { Request, Response } from "express";
import { pool } from "../../db";

// Helper function to get default distribution channel from database
export async function getDefaultDistributionChannel(): Promise<string | null> {
  try {
    // First try to get from system configuration
    const configResult = await pool.query(
      "SELECT config_value FROM system_configuration WHERE config_key = 'default_distribution_channel_code' AND active = true LIMIT 1"
    );

    if (configResult.rows.length > 0 && configResult.rows[0].config_value) {
      return configResult.rows[0].config_value;
    }

    // Fallback: Get first active distribution channel by code
    const channelResult = await pool.query(
      "SELECT code FROM distribution_channels ORDER BY code LIMIT 1"
    );

    if (channelResult.rows.length > 0) {
      return channelResult.rows[0].code;
    }

    return null;
  } catch (error) {
    console.error("Error getting default distribution channel:", error);
    return null;
  }
}

// Helper function to get distribution channel by code
export async function getDistributionChannelByCode(code: string): Promise<any | null> {
  try {
    const result = await pool.query("SELECT * FROM distribution_channels WHERE code = $1", [code]);
    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    console.error("Error fetching distribution channel by code:", error);
    return null;
  }
}

// Get all distribution channels
export async function getDistributionChannels(req: Request, res: Response) {
  try {
    const { active_only, active } = req.query;

    let query = `
      SELECT 
        id,
        code,
        name,
        description,
        is_active,
        created_at,
        updated_at,
        created_by,
        updated_by,
        "_tenantId",
        "_deletedAt"
      FROM distribution_channels
      WHERE is_active IS NOT false
    `;
    const params: any[] = [];
    let paramIndex = 1;

    // Additional active filter from query param (keeps backward compat)
    if (active_only === 'true' || active === 'true') {
      // already filtered by is_active above
    } else if (active === 'false') {
      // override: show only inactive
      query = `
        SELECT id, code, name, description, is_active, created_at, updated_at,
               created_by, updated_by, "_tenantId", "_deletedAt"
        FROM distribution_channels
        WHERE is_active = false
      `;
    }

    query += " ORDER BY code";

    const result = await pool.query(query, params);

    // Transform data for UI compatibility
    const transformedRows = result.rows.map(row => ({
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description || row.name,
      salesOrganization: null,
      salesOrganizationCode: null,
      salesOrganizationName: null,
      channelType: null,
      isActive: row.is_active !== false,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      _createdBy: row.created_by,
      _updatedBy: row.updated_by,
      _tenantId: row['_tenantId'],
      _deletedAt: row['_deletedAt'],
    }));

    return res.status(200).json(transformedRows);
  } catch (error: any) {
    console.error("Error fetching distribution channels:", error);
    return res.status(500).json({
      message: "Failed to fetch distribution channels",
      error: error.message || "Unknown error"
    });
  }
}

// Get distribution channel by ID
export async function getDistributionChannelById(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid ID format" });
    }

    const result = await pool.query("SELECT * FROM distribution_channels WHERE id = $1", [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Distribution channel not found" });
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
      updatedAt: row.updated_at,
      _createdBy: row.created_by,
      _updatedBy: row.updated_by,
      _tenantId: row['_tenantId'],
      _deletedAt: row['_deletedAt'],
    };

    return res.status(200).json(transformed);
  } catch (error: any) {
    console.error("Error fetching distribution channel:", error);
    return res.status(500).json({
      message: "Failed to fetch distribution channel",
      error: error.message || "Unknown error"
    });
  }
}

// Create new distribution channel
export async function createDistributionChannel(req: Request, res: Response) {
  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {
        console.error('Failed to parse request body:', e);
      }
    }
    const { code, name, description, isActive } = body;

    // Validate required fields
    if (!code || !name) {
      return res.status(400).json({ message: "Code and name are required" });
    }

    // Check if code already exists
    const existingCode = await pool.query("SELECT id, name FROM distribution_channels WHERE code = $1", [code]);
    if (existingCode.rows.length > 0) {
      const existing = existingCode.rows[0];
      return res.status(409).json({
        message: `Distribution channel code "${code}" already exists`,
        details: `A distribution channel with code "${code}" (${existing.name || 'unnamed'}) already exists. Please use a different code.`,
        existingId: existing.id
      });
    }

    const result = await pool.query(`
      INSERT INTO distribution_channels (
        code, name, description, is_active, created_at, updated_at,
        created_by, updated_by, "_tenantId", "_deletedAt"
      )
      VALUES ($1, $2, $3, $4, NOW(), NOW(), $5, $6, $7, NULL)
      RETURNING *
    `, [
      code, name, description || null, isActive !== false,
      (req as any).user?.id ?? 1,
      (req as any).user?.id ?? 1,
      (req as any).user?.tenantId ?? '001'
    ]);

    const row = result.rows[0];
    const transformed = {
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description || row.name,
      salesOrganization: null,
      salesOrganizationCode: null,
      salesOrganizationName: null,
      channelType: null,
      isActive: row.is_active !== false,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      _createdBy: row.created_by,
      _updatedBy: row.updated_by,
      _tenantId: row['_tenantId'],
      _deletedAt: row['_deletedAt'],
    };

    return res.status(201).json(transformed);
  } catch (error: any) {
    if (error.code === '23505') {
      // Unique constraint violation - code already exists
      return res.status(409).json({
        message: `Distribution channel code "${req.body.code || 'unknown'}" already exists`,
        details: "A distribution channel with this code already exists in the database. Please use a different code."
      });
    }
    console.error("Error creating distribution channel:", error);
    return res.status(500).json({
      message: "Failed to create distribution channel",
      error: error.message || "Unknown error"
    });
  }
}

// Update distribution channel
export async function updateDistributionChannel(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid ID format" });
    }

    // Accept both name and description from UI
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {
        console.error('Failed to parse request body:', e);
      }
    }
    const { code, name, description, isActive } = body;

    // Check if distribution channel exists
    const existing = await pool.query("SELECT * FROM distribution_channels WHERE id = $1", [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ message: "Distribution channel not found" });
    }

    // Check if new code conflicts with existing (excluding current record)
    if (code && code !== existing.rows[0].code) {
      const codeConflict = await pool.query("SELECT id FROM distribution_channels WHERE code = $1 AND id != $2", [code, id]);
      if (codeConflict.rows.length > 0) {
        return res.status(409).json({ message: "Distribution channel code already exists" });
      }
    }



    // Build update query dynamically
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (code !== undefined) {
      updates.push(`code = $${paramCount++}`);
      values.push(code);
    }
    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(description || null);
    }

    if (isActive !== undefined) {
      updates.push(`is_active = $${paramCount++}`);
      values.push(isActive);
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: "No fields to update" });
    }

    updates.push(`updated_at = NOW()`);
    updates.push(`updated_by = $${paramCount++}`);
    values.push((req as any).user?.id ?? 1);
    values.push(id);

    const query = `
      UPDATE distribution_channels 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);

    const row = result.rows[0];
    const transformed = {
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description || row.name,
      salesOrganization: null,
      salesOrganizationCode: null,
      salesOrganizationName: null,
      channelType: null,
      isActive: row.is_active !== false,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      _createdBy: row.created_by,
      _updatedBy: row.updated_by,
      _tenantId: row['_tenantId'],
      _deletedAt: row['_deletedAt'],
    };

    return res.status(200).json(transformed);
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(409).json({ message: "Distribution channel code already exists" });
    }
    console.error("Error updating distribution channel:", error);
    return res.status(500).json({
      message: "Failed to update distribution channel",
      error: error.message || "Unknown error"
    });
  }
}

// Delete distribution channel
export async function deleteDistributionChannel(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid ID format" });
    }

    // Check if distribution channel is referenced by other records
    // First, get the distribution channel code
    const dcCheck = await pool.query("SELECT code FROM distribution_channels WHERE id = $1", [id]);
    if (dcCheck.rows.length === 0) {
      return res.status(404).json({ message: "Distribution channel not found" });
    }
    const dcCode = dcCheck.rows[0].code;

    // Check sd_sales_areas table (uses distribution_channel_code)
    const salesAreaCheck = await pool.query(`
      SELECT COUNT(*) as count FROM sd_sales_areas 
      WHERE distribution_channel_code = $1
    `, [dcCode]);

    // Also check if there's a sales_areas table with distribution_channel_id (if it exists)
    let salesAreaIdCheck = { rows: [{ count: '0' }] };
    try {
      salesAreaIdCheck = await pool.query(`
        SELECT COUNT(*) as count FROM sales_areas 
        WHERE distribution_channel_id = $1
      `, [id]);
    } catch (e) {
      // Table might not exist, ignore
    }

    const totalCount = parseInt(salesAreaCheck.rows[0].count) + parseInt(salesAreaIdCheck.rows[0].count);

    if (totalCount > 0) {
      return res.status(400).json({
        message: `Cannot delete distribution channel. It is used by ${totalCount} sales area(s).`
      });
    }

    // Soft-delete: preserve data, mark as deleted
    const deleteUserId = (req as any).user?.id ?? 1;
    const result = await pool.query(`
      UPDATE distribution_channels
      SET is_active = false,
          "_deletedAt" = NOW(),
          updated_by = $1,
          updated_at = NOW()
      WHERE id = $2
      RETURNING id, code, name
    `, [deleteUserId, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Distribution channel not found" });
    }

    return res.status(200).json({
      message: "Distribution channel deleted successfully",
      deleted: result.rows[0]
    });
  } catch (error: any) {
    if (error.code === '23503') {
      return res.status(400).json({ message: "Cannot delete distribution channel. It is referenced by other records." });
    }
    console.error("Error deleting distribution channel:", error);
    return res.status(500).json({ message: "Failed to delete distribution channel", error: error.message });
  }
}

// Bulk import distribution channels
export async function bulkImportDistributionChannels(req: Request, res: Response) {
  try {
    const { distributionChannels: importData } = req.body;

    if (!Array.isArray(importData) || importData.length === 0) {
      return res.status(400).json({ message: "Valid distribution channels array is required" });
    }

    const results = [];
    const errors = [];

    for (let index = 0; index < importData.length; index++) {
      const channel = importData[index];
      try {
        const { code, name, description } = channel;

        if (!code || !name) {
          errors.push({ row: index + 1, error: "Code and name are required" });
          continue;
        }

        // Check if code already exists
        const existingCode = await pool.query("SELECT id FROM distribution_channels WHERE code = $1", [code]);
        if (existingCode.rows.length > 0) {
          errors.push({ row: index + 1, error: `Distribution channel code ${code} already exists` });
          continue;
        }

        const result = await pool.query(`
          INSERT INTO distribution_channels (code, name, description, created_at, updated_at)
          VALUES ($1, $2, $3, NOW(), NOW())
          RETURNING *
        `, [code, name, description]);

        results.push(result.rows[0]);
      } catch (error) {
        errors.push({ row: index + 1, error: error.message });
      }
    }

    return res.status(200).json({
      message: `Bulk import completed. ${results.length} distribution channels created, ${errors.length} errors`,
      imported: results,
      errors,
    });
  } catch (error) {
    console.error("Error bulk importing distribution channels:", error);
    return res.status(500).json({ message: "Failed to bulk import distribution channels", error });
  }
}