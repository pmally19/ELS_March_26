/**
 * API Route for sales-organization
 * PRIMARY table: sd_sales_organizations (22 rows — real business data)
 * Includes SAP-style codes (1000/2000/3000) and all sales org data.
 */

import { Request, Response } from "express";
import { pool } from "../../db";

export async function getSalesOrganization(req: Request, res: Response) {
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
        notes,
        created_at as "createdAt",
        updated_at as "updatedAt",
        created_by as "_createdBy",
        updated_by as "_updatedBy",
        "_tenantId",
        "_deletedAt"
      FROM sd_sales_organizations
      WHERE is_active IS NOT false
      ORDER BY code
    `);
    return res.json(result.rows);
  } catch (error: any) {
    console.error("Error fetching sales-organization data:", error);
    return res.status(500).json({ message: `Failed to fetch sales-organization data: ${error.message}` });
  }
}

export async function createSalesOrganization(req: Request, res: Response) {
  try {
    const {
      code, name, description, companyCodeId,
      region, distributionChannel, industry, currency,
      address, city, state, country, postalCode,
      phone, email, manager, status, isActive, notes
    } = req.body;

    if (!code || !name || !companyCodeId) {
      return res.status(400).json({ message: "Code, name, and company code are required" });
    }

    // Check duplicate code and UPSERT to support automated agents cleanly
    const existing = await pool.query(
      `SELECT id FROM sd_sales_organizations WHERE code = $1`, [code]
    );

    if (existing.rows.length > 0) {
      // It exists. Treat this POST as an UPSERT and update the existing record.
      const updateResult = await pool.query(`
        UPDATE sd_sales_organizations SET
          name = $2, description = $3, company_code_id = $4, region = $5, distribution_channel = $6,
          industry = $7, currency = $8, address = $9, city = $10, state = $11, country = $12, postal_code = $13,
          phone = $14, email = $15, manager = $16, status = $17, is_active = $18, notes = $19,
          updated_at = NOW(), updated_by = $20, "_deletedAt" = NULL
        WHERE code = $1
        RETURNING *
      `, [
        code, name, description || null, companyCodeId,
        region || null, distributionChannel || null,
        industry || null, currency || 'USD',
        address || null, city || null, state || null, country || null, postalCode || null,
        phone || null, email || null, manager || null,
        status || 'active', isActive !== false, notes || null,
        (req as any).user?.id ?? 1
      ]);
      
      return res.status(200).json(updateResult.rows[0]);
    }

    const result = await pool.query(`
      INSERT INTO sd_sales_organizations (
        code, name, description, company_code_id, region, distribution_channel,
        industry, currency, address, city, state, country, postal_code,
        phone, email, manager, status, is_active, notes,
        created_by, updated_by, "_tenantId", "_deletedAt"
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11, $12, $13,
        $14, $15, $16, $17, $18, $19,
        $20, $21, $22, NULL
      )
      RETURNING *
    `, [
      code, name, description || null, companyCodeId,
      region || null, distributionChannel || null,
      industry || null, currency || 'USD',
      address || null, city || null, state || null, country || null, postalCode || null,
      phone || null, email || null, manager || null,
      status || 'active', isActive !== false, notes || null,
      (req as any).user?.id ?? 1,
      (req as any).user?.id ?? 1,
      (req as any).user?.tenantId ?? '001'
    ]);

    return res.status(201).json(result.rows[0]);
  } catch (error: any) {
    if (error.code === '23503') return res.status(400).json({ message: "Invalid company code reference" });
    if (error.code === '23505') return res.status(409).json({ message: "Code already exists" });
    console.error("Error creating sales organization:", error);
    return res.status(500).json({ message: `Failed to create sales organization: ${error.message}` });
  }
}

export async function updateSalesOrganization(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const {
      name, description, companyCodeId, region, distributionChannel, industry,
      currency, address, city, state, country, postalCode,
      phone, email, manager, status, isActive, notes
    } = req.body;

    if (!name || !companyCodeId) {
      return res.status(400).json({ message: "Name and company code are required" });
    }

    // Validate company code
    const companyCheck = await pool.query(`SELECT id FROM company_codes WHERE id = $1`, [companyCodeId]);
    if (companyCheck.rows.length === 0) {
      return res.status(400).json({ message: "Invalid company code ID" });
    }

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
        updated_at = NOW(),
        updated_by = $19
      WHERE id = $20
      RETURNING *
    `, [
      name, description || null, companyCodeId,
      region || null, distributionChannel || null, industry || null,
      currency || 'USD', address || null, city || null, state || null,
      country || null, postalCode || null, phone || null, email || null,
      manager || null, status || 'active', isActive !== false,
      notes || null,
      (req as any).user?.id ?? 1,
      id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Sales organization not found" });
    }

    return res.json(result.rows[0]);
  } catch (error: any) {
    if (error.code === '23503') return res.status(400).json({ message: "Invalid company code reference" });
    if (error.code === '23505') return res.status(400).json({ message: "Code already exists" });
    console.error("Error updating sales organization:", error);
    return res.status(500).json({ message: `Failed to update sales organization: ${error.message}` });
  }
}

export async function deleteSalesOrganization(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const deleteUserId = (req as any).user?.id ?? 1;

    // Soft-delete: preserve all data, set _deletedAt
    const result = await pool.query(`
      UPDATE sd_sales_organizations
      SET is_active = false,
          status = 'inactive',
          "_deletedAt" = NOW(),
          updated_by = $1,
          updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [deleteUserId, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Sales organization not found" });
    }

    return res.json({ message: "Sales organization deleted successfully" });
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