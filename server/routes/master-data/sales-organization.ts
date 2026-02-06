/**
 * API Route for sales-organization
 * Tries comprehensive table `sd_sales_organizations` first, falls back to legacy `sales_organizations`.
 */

import { Request, Response } from "express";
import { pool } from "../../db";

export async function getSalesOrganization(req: Request, res: Response) {
  try {
    try {
      const result = await pool.query(`
        SELECT 
          id,
          code,
          name,
          description,
          company_code_id as "companyCodeId",
          region,
          distribution_channel as "distributionChannel",
          industry,
          currency,
          address,
          city,
          state,
          country,
          postal_code as "postalCode",
          phone,
          email,
          manager,
          status,
          is_active as "isActive",
          notes
        FROM sd_sales_organizations
        ORDER BY code
      `);
      return res.json(result.rows);
    } catch (primaryError: any) {
      // Fallback to legacy minimal table
      const fallback = await pool.query(`
        SELECT 
          id,
          code,
          name,
          description,
          company_code_id as "companyCodeId",
          NULL::text as region,
          NULL::text as "distributionChannel",
          NULL::text as industry,
          'USD'::text as currency,
          NULL::text as address,
          NULL::text as city,
          NULL::text as state,
          NULL::text as country,
          NULL::text as "postalCode",
          NULL::text as phone,
          NULL::text as email,
          NULL::text as manager,
          'active'::text as status,
          true as "isActive",
          NULL::text as notes
        FROM sales_organizations
        ORDER BY code
      `);
      return res.json(fallback.rows);
    }
  } catch (error: any) {
    console.error("Error fetching sales-organization data:", error);
    return res.status(500).json({ message: `Failed to fetch sales-organization data: ${error.message}` });
  }
}

export async function createSalesOrganization(req: Request, res: Response) {
  try {
    const {
      code,
      name,
      description,
      companyCodeId,
      region,
      distributionChannel,
      industry,
      currency,
      address,
      city,
      state,
      country,
      postalCode,
      phone,
      email,
      manager,
      status,
      isActive,
      notes
    } = req.body;

    // Validate required fields
    if (!code || !name || !companyCodeId) {
      return res.status(400).json({ message: "Code, name, and company code are required" });
    }

    try {
      // Try to insert into comprehensive table first
      const result = await pool.query(`
        INSERT INTO sd_sales_organizations (
          code, name, description, company_code_id, region, distribution_channel,
          industry, currency, address, city, state, country, postal_code,
          phone, email, manager, status, is_active, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
        RETURNING *
      `, [
        code, name, description, companyCodeId, region, distributionChannel,
        industry, currency || 'USD', address, city, state, country, postalCode,
        phone, email, manager, status || 'active', isActive !== false, notes
      ]);

      return res.status(201).json(result.rows[0]);
    } catch (primaryError: any) {
      // Fallback to legacy table
      const fallback = await pool.query(`
        INSERT INTO sales_organizations (code, name, description, company_code_id)
        VALUES ($1, $2, $3, $4)
        RETURNING *
      `, [code, name, description, companyCodeId]);

      return res.status(201).json(fallback.rows[0]);
    }
  } catch (error: any) {
    console.error("Error creating sales organization:", error);
    return res.status(500).json({ message: `Failed to create sales organization: ${error.message}` });
  }
}

export async function updateSalesOrganization(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      companyCodeId,
      region,
      distributionChannel,
      industry,
      currency,
      address,
      city,
      state,
      country,
      postalCode,
      phone,
      email,
      manager,
      status,
      isActive,
      notes
    } = req.body;

    // Validate required fields
    if (!name || !companyCodeId) {
      return res.status(400).json({ message: "Name and company code are required" });
    }

    // Validate that the company code exists
    try {
      const companyCheck = await pool.query(
        'SELECT id FROM company_codes WHERE id = $1',
        [companyCodeId]
      );
      
      if (companyCheck.rows.length === 0) {
        return res.status(400).json({ message: "Invalid company code ID" });
      }
    } catch (companyError: any) {
      console.error("Error checking company code:", companyError);
      return res.status(500).json({ message: "Error validating company code" });
    }

    try {
      // Try to update comprehensive table first
      const result = await pool.query(`
        UPDATE sd_sales_organizations SET
          name = $1, 
          description = $2, 
          company_code_id = $3, 
          region = $4,
          distribution_channel = $5, 
          industry = $6, 
          currency = $7, 
          address = $8,
          city = $9, 
          state = $10, 
          country = $11, 
          postal_code = $12,
          phone = $13, 
          email = $14, 
          manager = $15, 
          status = $16,
          is_active = $17, 
          notes = $18,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $19
        RETURNING *
      `, [
        name, 
        description || null, 
        companyCodeId, 
        region || null, 
        distributionChannel || null,
        industry || null, 
        currency || 'USD', 
        address || null, 
        city || null, 
        state || null, 
        country || null, 
        postalCode || null,
        phone || null, 
        email || null, 
        manager || null, 
        status || 'active',
        isActive !== false, 
        notes || null, 
        id
      ]);

      if (result.rows.length === 0) {
        // Try legacy table
        const fallback = await pool.query(`
          UPDATE sales_organizations SET
            name = $1, 
            description = $2, 
            company_code_id = $3
          WHERE id = $4
          RETURNING *
        `, [name, description || null, companyCodeId, id]);

        if (fallback.rows.length === 0) {
          return res.status(404).json({ message: "Sales organization not found" });
        }

        return res.json(fallback.rows[0]);
      }

      return res.json(result.rows[0]);
    } catch (primaryError: any) {
      console.error("Primary update error:", primaryError);
      
      // Check if it's a foreign key constraint error
      if (primaryError.code === '23503') {
        return res.status(400).json({ 
          message: "Cannot update sales organization: Invalid company code reference" 
        });
      }
      
      // Check if it's a unique constraint error
      if (primaryError.code === '23505') {
        return res.status(400).json({ 
          message: "Cannot update sales organization: Code already exists" 
        });
      }

      // Fallback to legacy table
      try {
        const fallback = await pool.query(`
          UPDATE sales_organizations SET
            name = $1, 
            description = $2, 
            company_code_id = $3
          WHERE id = $4
          RETURNING *
        `, [name, description || null, companyCodeId, id]);

        if (fallback.rows.length === 0) {
          return res.status(404).json({ message: "Sales organization not found" });
        }

        return res.json(fallback.rows[0]);
      } catch (fallbackError: any) {
        console.error("Fallback update error:", fallbackError);
        return res.status(500).json({ 
          message: `Failed to update sales organization: ${fallbackError.message}` 
        });
      }
    }
  } catch (error: any) {
    console.error("Error updating sales organization:", error);
    return res.status(500).json({ message: `Failed to update sales organization: ${error.message}` });
  }
}

export async function deleteSalesOrganization(req: Request, res: Response) {
  try {
    const { id } = req.params;

    try {
      // Try to delete from comprehensive table first
      const result = await pool.query(`
        DELETE FROM sd_sales_organizations WHERE id = $1 RETURNING *
      `, [id]);

      if (result.rows.length === 0) {
        // Try legacy table
        const fallback = await pool.query(`
          DELETE FROM sales_organizations WHERE id = $1 RETURNING *
        `, [id]);

        if (fallback.rows.length === 0) {
          return res.status(404).json({ message: "Sales organization not found" });
        }
      }

      return res.json({ message: "Sales organization deleted successfully" });
    } catch (error: any) {
      // If comprehensive table doesn't exist, try legacy table
      const fallback = await pool.query(`
        DELETE FROM sales_organizations WHERE id = $1 RETURNING *
      `, [id]);

      if (fallback.rows.length === 0) {
        return res.status(404).json({ message: "Sales organization not found" });
      }

      return res.json({ message: "Sales organization deleted successfully" });
    }
  } catch (error: any) {
    console.error("Error deleting sales organization:", error);
    return res.status(500).json({ message: `Failed to delete sales organization: ${error.message}` });
  }
}

export default {
  getSalesOrganization,
  createSalesOrganization,
  updateSalesOrganization,
  deleteSalesOrganization
};