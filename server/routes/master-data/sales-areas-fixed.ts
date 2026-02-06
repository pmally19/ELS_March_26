import { Request, Response } from "express";
import { pool } from "../../db";

// Get all sales areas
export async function getSalesAreas(req: Request, res: Response) {
  try {
    const { active_only, sales_org_code, distribution_channel_code, division_code } = req.query;

    let query = `
      SELECT 
        sa.id,
        sa.sales_org_code,
        sa.distribution_channel_code,
        sa.division_code,
        sa.name,
        sa.is_active,
        sa.created_at,
        sa.updated_at,
        so.name as sales_org_name,
        dc.name as distribution_channel_name,
        d.name as division_name
      FROM sd_sales_areas sa
      LEFT JOIN sd_sales_organizations so ON sa.sales_org_code = so.code
      LEFT JOIN distribution_channels dc ON sa.distribution_channel_code = dc.code
      LEFT JOIN sd_divisions d ON sa.division_code = d.code
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    // Filter by active status if requested
    if (active_only === 'true' || active_only === '1') {
      query += ` AND sa.is_active = $${paramIndex}`;
      params.push(true);
      paramIndex++;
    }

    // Filter by sales organization code if provided
    if (sales_org_code) {
      query += ` AND sa.sales_org_code = $${paramIndex}`;
      params.push(sales_org_code);
      paramIndex++;
    }

    // Filter by distribution channel code if provided
    if (distribution_channel_code) {
      query += ` AND sa.distribution_channel_code = $${paramIndex}`;
      params.push(distribution_channel_code);
      paramIndex++;
    }

    // Filter by division code if provided
    if (division_code) {
      query += ` AND sa.division_code = $${paramIndex}`;
      params.push(division_code);
      paramIndex++;
    }

    query += " ORDER BY sa.sales_org_code, sa.distribution_channel_code, sa.division_code";

    const result = await pool.query(query, params);

    // Transform data for UI compatibility
    const transformedRows = result.rows.map(row => ({
      id: row.id,
      sales_org_code: row.sales_org_code,
      sales_org_name: row.sales_org_name || row.sales_org_code,
      distribution_channel_code: row.distribution_channel_code,
      distribution_channel_name: row.distribution_channel_name || row.distribution_channel_code,
      division_code: row.division_code,
      division_name: row.division_name || row.division_code,
      name: row.name,
      is_active: row.is_active !== false,
      created_at: row.created_at,
      updated_at: row.updated_at
    }));

    return res.status(200).json(transformedRows);
  } catch (error: any) {
    console.error("Error fetching sales areas:", error);
    return res.status(500).json({
      message: "Failed to fetch sales areas",
      error: error.message || "Unknown error"
    });
  }
}

// Get sales area by ID
export async function getSalesAreaById(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid ID format" });
    }

    const result = await pool.query(`
      SELECT 
        sa.*,
        so.name as sales_org_name,
        dc.name as distribution_channel_name,
        d.name as division_name
      FROM sd_sales_areas sa
      LEFT JOIN sd_sales_organizations so ON sa.sales_org_code = so.code
      LEFT JOIN distribution_channels dc ON sa.distribution_channel_code = dc.code
      LEFT JOIN sd_divisions d ON sa.division_code = d.code
      WHERE sa.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Sales area not found" });
    }

    // Transform response for UI compatibility
    const row = result.rows[0];
    const transformed = {
      id: row.id,
      sales_org_code: row.sales_org_code,
      sales_org_name: row.sales_org_name || row.sales_org_code,
      distribution_channel_code: row.distribution_channel_code,
      distribution_channel_name: row.distribution_channel_name || row.distribution_channel_code,
      division_code: row.division_code,
      division_name: row.division_name || row.division_code,
      name: row.name,
      is_active: row.is_active !== false,
      created_at: row.created_at,
      updated_at: row.updated_at
    };

    return res.status(200).json(transformed);
  } catch (error: any) {
    console.error("Error fetching sales area:", error);
    return res.status(500).json({
      message: "Failed to fetch sales area",
      error: error.message || "Unknown error"
    });
  }
}

// Create new sales area
export async function createSalesArea(req: Request, res: Response) {
  try {
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {
        console.error('Failed to parse request body:', e);
      }
    }
    const { sales_org_code, distribution_channel_code, division_code, name, is_active } = body;

    console.log('Create Sales Area Request Body:', { sales_org_code, distribution_channel_code, division_code, name, is_active });

    if (!sales_org_code || !distribution_channel_code || !division_code || !name) {
      return res.status(400).json({
        message: "Sales organization code, distribution channel code, division code, and name are required"
      });
    }

    // Validate code lengths
    if (sales_org_code.length > 10) {
      return res.status(400).json({ message: "Sales organization code must be 10 characters or less" });
    }
    if (distribution_channel_code.length > 5) {
      return res.status(400).json({ message: "Distribution channel code must be 5 characters or less" });
    }
    if (division_code.length > 5) {
      return res.status(400).json({ message: "Division code must be 5 characters or less" });
    }
    if (name.length > 100) {
      return res.status(400).json({ message: "Name must be 100 characters or less" });
    }

    // Check if combination already exists
    const existingCheck = await pool.query(
      `SELECT id FROM sd_sales_areas 
       WHERE sales_org_code = $1 
       AND distribution_channel_code = $2 
       AND division_code = $3`,
      [sales_org_code, distribution_channel_code, division_code]
    );

    if (existingCheck.rows.length > 0) {
      return res.status(400).json({
        message: "Sales area with this combination already exists"
      });
    }

    // Verify that the referenced codes exist
    const salesOrgCheck = await pool.query(
      "SELECT id FROM sd_sales_organizations WHERE code = $1",
      [sales_org_code]
    );
    if (salesOrgCheck.rows.length === 0) {
      return res.status(400).json({ message: "Sales organization with this code does not exist" });
    }

    const distChannelCheck = await pool.query(
      "SELECT id FROM distribution_channels WHERE code = $1",
      [distribution_channel_code]
    );
    if (distChannelCheck.rows.length === 0) {
      return res.status(400).json({ message: "Distribution channel with this code does not exist" });
    }

    const divisionCheck = await pool.query(
      "SELECT id FROM sd_divisions WHERE code = $1",
      [division_code]
    );
    if (divisionCheck.rows.length === 0) {
      return res.status(400).json({ message: "Division with this code does not exist" });
    }

    // Insert new sales area (no hardcoded defaults)
    const insertQuery = `
      INSERT INTO sd_sales_areas (sales_org_code, distribution_channel_code, division_code, name, is_active)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const isActiveValue = is_active !== undefined ? is_active : true;

    let result;
    try {
      result = await pool.query(insertQuery, [
        sales_org_code,
        distribution_channel_code,
        division_code,
        name,
        isActiveValue
      ]);
    } catch (insertError: any) {
      // Handle sequence out-of-sync error
      if (insertError.code === '23505' && insertError.constraint === 'sales_areas_pkey') {
        console.log('⚠️ Sequence out of sync, attempting to fix...');
        try {
          // Get current max ID and fix sequence
          const maxIdResult = await pool.query('SELECT MAX(id) as max_id FROM sd_sales_areas;');
          const maxId = parseInt(maxIdResult.rows[0].max_id) || 0;
          const newSeqValue = maxId + 1;
          await pool.query(`SELECT setval('sales_areas_id_seq', ${newSeqValue}, false);`);
          console.log(`✅ Sequence fixed to ${newSeqValue}, retrying insert...`);

          // Retry the insert
          result = await pool.query(insertQuery, [
            sales_org_code,
            distribution_channel_code,
            division_code,
            name,
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

    // Get related names for response
    const salesOrgResult = await pool.query(
      "SELECT name FROM sd_sales_organizations WHERE code = $1",
      [sales_org_code]
    );
    const distChannelResult = await pool.query(
      "SELECT name FROM distribution_channels WHERE code = $1",
      [distribution_channel_code]
    );
    const divisionResult = await pool.query(
      "SELECT name FROM sd_divisions WHERE code = $1",
      [division_code]
    );

    const transformed = {
      id: row.id,
      sales_org_code: row.sales_org_code,
      sales_org_name: salesOrgResult.rows[0]?.name || sales_org_code,
      distribution_channel_code: row.distribution_channel_code,
      distribution_channel_name: distChannelResult.rows[0]?.name || distribution_channel_code,
      division_code: row.division_code,
      division_name: divisionResult.rows[0]?.name || division_code,
      name: row.name,
      is_active: row.is_active !== false,
      created_at: row.created_at,
      updated_at: row.updated_at
    };

    return res.status(201).json(transformed);
  } catch (error: any) {
    console.error("Error creating sales area:", error);

    // Handle unique constraint violation
    if (error.code === '23505') {
      if (error.constraint === 'sales_areas_pkey') {
        return res.status(500).json({
          message: "Database sequence error. Please contact administrator.",
          error: "Sequence synchronization issue"
        });
      } else {
        return res.status(400).json({ message: "Sales area with this combination already exists" });
      }
    }

    return res.status(500).json({
      message: "Failed to create sales area",
      error: error.message || "Unknown error"
    });
  }
}

// Update sales area
export async function updateSalesArea(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid ID format" });
    }

    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (e) {
        console.error('Failed to parse request body:', e);
      }
    }
    const { sales_org_code, distribution_channel_code, division_code, name, is_active } = body;

    // Check if sales area exists
    const existingCheck = await pool.query(
      "SELECT id FROM sd_sales_areas WHERE id = $1",
      [id]
    );

    if (existingCheck.rows.length === 0) {
      return res.status(404).json({ message: "Sales area not found" });
    }

    // Build update query dynamically
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (sales_org_code !== undefined) {
      if (sales_org_code.length > 10) {
        return res.status(400).json({ message: "Sales organization code must be 10 characters or less" });
      }
      // Verify sales org exists
      const salesOrgCheck = await pool.query(
        "SELECT id FROM sd_sales_organizations WHERE code = $1",
        [sales_org_code]
      );
      if (salesOrgCheck.rows.length === 0) {
        return res.status(400).json({ message: "Sales organization with this code does not exist" });
      }
      updates.push(`sales_org_code = $${paramIndex}`);
      values.push(sales_org_code);
      paramIndex++;
    }

    if (distribution_channel_code !== undefined) {
      if (distribution_channel_code.length > 5) {
        return res.status(400).json({ message: "Distribution channel code must be 5 characters or less" });
      }
      // Verify distribution channel exists
      const distChannelCheck = await pool.query(
        "SELECT id FROM distribution_channels WHERE code = $1",
        [distribution_channel_code]
      );
      if (distChannelCheck.rows.length === 0) {
        return res.status(400).json({ message: "Distribution channel with this code does not exist" });
      }
      updates.push(`distribution_channel_code = $${paramIndex}`);
      values.push(distribution_channel_code);
      paramIndex++;
    }

    if (division_code !== undefined) {
      if (division_code.length > 5) {
        return res.status(400).json({ message: "Division code must be 5 characters or less" });
      }
      // Verify division exists
      const divisionCheck = await pool.query(
        "SELECT id FROM sd_divisions WHERE code = $1",
        [division_code]
      );
      if (divisionCheck.rows.length === 0) {
        return res.status(400).json({ message: "Division with this code does not exist" });
      }
      updates.push(`division_code = $${paramIndex}`);
      values.push(division_code);
      paramIndex++;
    }

    if (name !== undefined) {
      if (name.length > 100) {
        return res.status(400).json({ message: "Name must be 100 characters or less" });
      }
      updates.push(`name = $${paramIndex}`);
      values.push(name);
      paramIndex++;
    }

    if (is_active !== undefined) {
      updates.push(`is_active = $${paramIndex}`);
      values.push(is_active);
      paramIndex++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: "No fields to update" });
    }

    // Check for duplicate combination if any of the codes are being updated
    if (sales_org_code !== undefined || distribution_channel_code !== undefined || division_code !== undefined) {
      // Get current values
      const currentResult = await pool.query("SELECT sales_org_code, distribution_channel_code, division_code FROM sd_sales_areas WHERE id = $1", [id]);
      const current = currentResult.rows[0];

      const finalSalesOrgCode = sales_org_code !== undefined ? sales_org_code : current.sales_org_code;
      const finalDistChannelCode = distribution_channel_code !== undefined ? distribution_channel_code : current.distribution_channel_code;
      const finalDivisionCode = division_code !== undefined ? division_code : current.division_code;

      const duplicateCheck = await pool.query(
        `SELECT id FROM sd_sales_areas 
         WHERE sales_org_code = $1 
         AND distribution_channel_code = $2 
         AND division_code = $3 
         AND id != $4`,
        [finalSalesOrgCode, finalDistChannelCode, finalDivisionCode, id]
      );

      if (duplicateCheck.rows.length > 0) {
        return res.status(400).json({ message: "Sales area with this combination already exists" });
      }
    }

    // Always update updated_at timestamp
    updates.push(`updated_at = NOW()`);

    values.push(id);

    const updateQuery = `
      UPDATE sd_sales_areas 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await pool.query(updateQuery, values);

    const row = result.rows[0];

    // Get related names for response
    const salesOrgResult = await pool.query(
      "SELECT name FROM sd_sales_organizations WHERE code = $1",
      [row.sales_org_code]
    );
    const distChannelResult = await pool.query(
      "SELECT name FROM distribution_channels WHERE code = $1",
      [row.distribution_channel_code]
    );
    const divisionResult = await pool.query(
      "SELECT name FROM sd_divisions WHERE code = $1",
      [row.division_code]
    );

    const transformed = {
      id: row.id,
      sales_org_code: row.sales_org_code,
      sales_org_name: salesOrgResult.rows[0]?.name || row.sales_org_code,
      distribution_channel_code: row.distribution_channel_code,
      distribution_channel_name: distChannelResult.rows[0]?.name || row.distribution_channel_code,
      division_code: row.division_code,
      division_name: divisionResult.rows[0]?.name || row.division_code,
      name: row.name,
      is_active: row.is_active !== false,
      created_at: row.created_at,
      updated_at: row.updated_at
    };

    return res.status(200).json(transformed);
  } catch (error: any) {
    console.error("Error updating sales area:", error);

    if (error.code === '23505') {
      return res.status(400).json({ message: "Sales area with this combination already exists" });
    }

    return res.status(500).json({
      message: "Failed to update sales area",
      error: error.message || "Unknown error"
    });
  }
}

// Delete sales area
export async function deleteSalesArea(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid ID format" });
    }

    // Check if sales area exists
    const existingCheck = await pool.query(
      "SELECT id FROM sd_sales_areas WHERE id = $1",
      [id]
    );

    if (existingCheck.rows.length === 0) {
      return res.status(404).json({ message: "Sales area not found" });
    }

    // Check if sales area is being used in sales orders
    const usageCheck = await pool.query(
      `SELECT COUNT(*) as count FROM sales_orders 
       WHERE sales_org_id IN (SELECT id FROM sd_sales_organizations WHERE code = (SELECT sales_org_code FROM sd_sales_areas WHERE id = $1))
       AND distribution_channel_id IN (SELECT id FROM distribution_channels WHERE code = (SELECT distribution_channel_code FROM sd_sales_areas WHERE id = $1))
       AND division_id IN (SELECT id FROM sd_divisions WHERE code = (SELECT division_code FROM sd_sales_areas WHERE id = $1))`,
      [id]
    );

    if (parseInt(usageCheck.rows[0].count) > 0) {
      return res.status(400).json({
        message: "Cannot delete sales area that is being used in sales orders"
      });
    }

    // Delete the sales area
    await pool.query("DELETE FROM sd_sales_areas WHERE id = $1", [id]);

    return res.status(200).json({ message: "Sales area deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting sales area:", error);
    return res.status(500).json({
      message: "Failed to delete sales area",
      error: error.message || "Unknown error"
    });
  }
}

// Bulk import sales areas
export async function bulkImportSalesAreas(req: Request, res: Response) {
  try {
    const { salesAreas } = req.body;

    if (!Array.isArray(salesAreas) || salesAreas.length === 0) {
      return res.status(400).json({ message: "Sales areas array is required" });
    }

    const results = [];
    const errors = [];

    for (const salesArea of salesAreas) {
      try {
        const { sales_org_code, distribution_channel_code, division_code, name, is_active } = salesArea;

        if (!sales_org_code || !distribution_channel_code || !division_code || !name) {
          errors.push({ salesArea, error: "Sales organization code, distribution channel code, division code, and name are required" });
          continue;
        }

        // Check if combination already exists
        const existingCheck = await pool.query(
          `SELECT id FROM sd_sales_areas 
           WHERE sales_org_code = $1 
           AND distribution_channel_code = $2 
           AND division_code = $3`,
          [sales_org_code, distribution_channel_code, division_code]
        );

        if (existingCheck.rows.length > 0) {
          errors.push({ salesArea, error: "Sales area with this combination already exists" });
          continue;
        }

        // Verify referenced codes exist
        const salesOrgCheck = await pool.query(
          "SELECT id FROM sd_sales_organizations WHERE code = $1",
          [sales_org_code]
        );
        if (salesOrgCheck.rows.length === 0) {
          errors.push({ salesArea, error: "Sales organization with this code does not exist" });
          continue;
        }

        const distChannelCheck = await pool.query(
          "SELECT id FROM distribution_channels WHERE code = $1",
          [distribution_channel_code]
        );
        if (distChannelCheck.rows.length === 0) {
          errors.push({ salesArea, error: "Distribution channel with this code does not exist" });
          continue;
        }

        const divisionCheck = await pool.query(
          "SELECT id FROM sd_divisions WHERE code = $1",
          [division_code]
        );
        if (divisionCheck.rows.length === 0) {
          errors.push({ salesArea, error: "Division with this code does not exist" });
          continue;
        }

        const insertQuery = `
          INSERT INTO sd_sales_areas (sales_org_code, distribution_channel_code, division_code, name, is_active)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING *
        `;

        const isActiveValue = is_active !== undefined ? is_active : true;

        const result = await pool.query(insertQuery, [
          sales_org_code,
          distribution_channel_code,
          division_code,
          name,
          isActiveValue
        ]);

        results.push(result.rows[0]);
      } catch (error: any) {
        errors.push({ salesArea, error: error.message });
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
    console.error("Error bulk importing sales areas:", error);
    return res.status(500).json({
      message: "Failed to bulk import sales areas",
      error: error.message || "Unknown error"
    });
  }
}

