/**
 * API Route for purchase-organization (mapped from purchase_organizations)
 */

import { Request, Response } from "express";
import { db } from "../../db";
import { pool } from "../../db";

export async function getPurchaseOrganization(req: Request, res: Response) {
  try {
    const { company_code_id } = req.query;

    // Build query with optional company code filter
    let whereClause = '';
    const params: any[] = [];

    if (company_code_id) {
      whereClause = 'WHERE po.company_code_id = $1';
      params.push(parseInt(company_code_id as string));
    }

    // Query data from the original table with proper aliasing for the UI
    const result = await pool.query(`
      SELECT 
        po.id,
        po.code,
        po.name,
        po.description,
        po.notes,
        po.company_code_id AS "companyCodeId",
        po.currency,
        po.address,
        po.city,
        po.state,
        po.country,
        po.postal_code AS "postalCode",
        po.phone,
        po.email,
        po.manager,
        po.status,
        po.is_active AS "isActive",
        po.created_at AS "createdAt",
        po.updated_at AS "updatedAt",
        cc.code AS "companyCode.code",
        cc.name AS "companyCode.name"
      FROM purchase_organizations po
      LEFT JOIN company_codes cc ON po.company_code_id = cc.id
      ${whereClause}
      ORDER BY po.code
    `, params);

    // Fetch assigned plants for all returned Purchase Orgs (Optimized)
    const orgIds = result.rows.map((r: any) => r.id);
    let plantsMap: Record<number, number[]> = {};

    if (orgIds.length > 0) {
      const plantsResult = await pool.query(`
            SELECT purchase_organization_id, plant_id
            FROM purchase_organization_plants
            WHERE purchase_organization_id = ANY($1) AND is_active = true
        `, [orgIds]);

      plantsResult.rows.forEach((row: any) => {
        if (!plantsMap[row.purchase_organization_id]) {
          plantsMap[row.purchase_organization_id] = [];
        }
        plantsMap[row.purchase_organization_id].push(row.plant_id);
      });
    }

    // Transform the data to include nested companyCode object and plants
    const transformedRows = result.rows.map((row: any) => ({
      ...row,
      companyCode: row['companyCode.code'] && row['companyCode.name'] ? {
        code: row['companyCode.code'],
        name: row['companyCode.name']
      } : null,
      plants: plantsMap[row.id] || [], // Array of Plant IDs
      // Remove the flat company code fields
      'companyCode.code': undefined,
      'companyCode.name': undefined
    }));

    return res.json(transformedRows);
  } catch (error: any) {
    console.error("Error fetching purchase-organization data:", error);
    return res.status(500).json({ message: `Failed to fetch purchase-organization data: ${error.message}` });
  }
}

export async function createPurchaseOrganization(req: Request, res: Response) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const {
      code,
      name,
      description,
      notes,
      companyCodeId,
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
      plants // Expecting array of plant IDs
    } = req.body;

    // Validate required fields
    if (!code || !name || !companyCodeId) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: "Code, Name, and Company Code are required" });
    }

    // Check duplicate
    const check = await client.query('SELECT id FROM purchase_organizations WHERE code = $1', [code]);
    if (check.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ message: "Purchase Organization Code already exists" });
    }

    // Insert Purchase Org
    const result = await client.query(`
        INSERT INTO purchase_organizations (
            code, name, description, notes, company_code_id, 
            currency, address, city, state, country, postal_code, 
            phone, email, manager, status, is_active, 
            created_at, updated_at
        ) VALUES (
            $1, $2, $3, $4, $5, 
            $6, $7, $8, $9, $10, $11, 
            $12, $13, $14, $15, $16, 
            NOW(), NOW()
        )
        RETURNING *
    `, [
      code, name, description, notes, companyCodeId,
      currency || 'USD', address, city, state, country, postalCode,
      phone, email, manager, status || 'active',
      isActive !== undefined ? isActive : true
    ]);

    const newOrg = result.rows[0];

    // Assign Plants
    if (Array.isArray(plants) && plants.length > 0) {
      for (const plantId of plants) {
        await client.query(`
                INSERT INTO purchase_organization_plants (purchase_organization_id, plant_id)
                VALUES ($1, $2)
                ON CONFLICT DO NOTHING
            `, [newOrg.id, plantId]);
      }
    }

    await client.query('COMMIT');

    return res.status(201).json({
      ...newOrg,
      companyCodeId: newOrg.company_code_id,
      postalCode: newOrg.postal_code,
      isActive: newOrg.is_active,
      createdAt: newOrg.created_at,
      updatedAt: newOrg.updated_at,
      plants: plants || []
    });

  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error("Error creating purchase organization:", error);
    return res.status(500).json({ message: `Failed to create purchase organization: ${error.message}` });
  } finally {
    client.release();
  }
}

export default getPurchaseOrganization;

export async function updatePurchaseOrganization(req: Request, res: Response) {
  const client = await pool.connect();
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ message: "Invalid ID" });
    }

    await client.query('BEGIN');

    const {
      code,
      name,
      description,
      notes,
      companyCodeId,
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
      plants // Array of plant IDs
    } = req.body;

    // Build dynamic update set clause
    const sets: string[] = [];
    const params: any[] = [];
    let paramIdx = 1;

    const add = (column: string, value: any) => {
      params.push(value);
      sets.push(`${column} = $${paramIdx++}`);
    };

    if (code !== undefined) add('code', code);
    if (name !== undefined) add('name', name);
    if (description !== undefined) add('description', description);
    if (notes !== undefined) add('notes', notes);
    if (companyCodeId !== undefined) add('company_code_id', companyCodeId);
    if (currency !== undefined) add('currency', currency);
    if (address !== undefined) add('address', address);
    if (city !== undefined) add('city', city);
    if (state !== undefined) add('state', state);
    if (country !== undefined) add('country', country);
    if (postalCode !== undefined) add('postal_code', postalCode);
    if (phone !== undefined) add('phone', phone);
    if (email !== undefined) add('email', email);
    if (manager !== undefined) add('manager', manager);
    if (status !== undefined) add('status', status);
    if (isActive !== undefined) add('is_active', !!isActive);

    sets.push(`updated_at = NOW()`);

    params.push(id); // ID is the last param

    let updatedOrg;

    // Perform update if fields present
    if (sets.length > 1) {
      const sql = `UPDATE purchase_organizations SET ${sets.join(', ')} WHERE id = $${paramIdx} RETURNING *`;
      const result = await client.query(sql, params);
      if (!result.rows || result.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ message: "Purchase organization not found" });
      }
      updatedOrg = result.rows[0];
    } else {
      // Just verify existence if only updating plants
      const check = await client.query('SELECT * FROM purchase_organizations WHERE id = $1', [id]);
      if (check.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ message: "Purchase organization not found" });
      }
      updatedOrg = check.rows[0];
    }

    // Update Assignments (Plants)
    if (Array.isArray(plants)) {
      // Delete existing
      await client.query('DELETE FROM purchase_organization_plants WHERE purchase_organization_id = $1', [id]);

      // Insert new
      if (plants.length > 0) {
        for (const plantId of plants) {
          await client.query(`
                    INSERT INTO purchase_organization_plants (purchase_organization_id, plant_id)
                    VALUES ($1, $2)
                    ON CONFLICT DO NOTHING
                `, [id, plantId]);
        }
      }
    }

    await client.query('COMMIT');

    return res.json({
      ...updatedOrg,
      companyCodeId: updatedOrg.company_code_id,
      postalCode: updatedOrg.postal_code,
      isActive: updatedOrg.is_active,
      createdAt: updatedOrg.created_at,
      updatedAt: updatedOrg.updated_at,
      plants: plants // Just echo back for now
    });

  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error("Error updating purchase organization:", error);
    return res.status(500).json({ message: `Failed to update purchase organization: ${error.message}` });
  } finally {
    client.release();
  }
}

export async function deletePurchaseOrganization(req: Request, res: Response) {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ message: "Invalid ID" });
    }

    const result = await pool.query(`DELETE FROM purchase_organizations WHERE id = $1 RETURNING id`, [id]);

    if (!result.rows || result.rows.length === 0) {
      return res.status(404).json({ message: "Purchase organization not found" });
    }

    return res.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting purchase organization:", error);
    return res.status(500).json({ message: `Failed to delete purchase organization: ${error.message}` });
  }
}