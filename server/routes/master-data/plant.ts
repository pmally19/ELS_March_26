import { Request, Response } from 'express';
import { db } from '../../db';
import { sql } from 'drizzle-orm';
import { pool } from '../../db';
import { plantSchema } from '../../schemas/plant-schema';
import { oneProjectSyncAgent } from '../../services/oneproject-sync-agent';

// GET /api/master-data/plant - Get all plants
export async function getPlants(req: Request, res: Response) {
  try {
    const { company_code_id } = req.query;

    // Build WHERE clause based on query parameters
    let whereCondition = sql`1=1`;
    if (company_code_id) {
      const companyId = parseInt(company_code_id as string);
      whereCondition = sql`p.company_code_id = ${companyId}`;
    }

    const result = await db.execute(sql`
      SELECT 
        p.id,
        p.code,
        p.name,
        p.description,
        p.company_code_id as "companyCodeId",
        p.type,
        p.category,
        p.address,
        p.city,
        p.state,
        p.country,
        p.postal_code as "postalCode",
        p.phone,
        p.email,
        p.manager,
        p.timezone,
        p.operating_hours as "operatingHours",
        p.coordinates,
        p.factory_calendar as "factoryCalendar",
        p.status,
        p.is_active as "isActive",
        p.created_at as "createdAt",
        p.updated_at as "updatedAt",
        p.valuation_grouping_code_id as "valuationGroupingCodeId",
        cc.name as "companyCodeName",
        vgc.code as "valuationGroupingCode",
        vgc.name as "valuationGroupingName"
      FROM plants p 
      LEFT JOIN company_codes cc ON p.company_code_id = cc.id 
      LEFT JOIN valuation_grouping_codes vgc ON p.valuation_grouping_code_id = vgc.id
      WHERE ${whereCondition}
      ORDER BY p.code
    `);
    return res.status(200).json(result.rows);
  } catch (error: any) {
    console.error("Error fetching plants:", error);
    return res.status(500).json({ error: "Internal server error", message: error.message });
  }
}

// GET /api/master-data/plant/:id - Get plant by ID
export async function getPlantById(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID format" });
    }

    const result = await db.execute(sql`
      SELECT 
        p.id,
        p.code,
        p.name,
        p.description,
        p.company_code_id as "companyCodeId",
        p.type,
        p.category,
        p.address,
        p.city,
        p.state,
        p.country,
        p.postal_code as "postalCode",
        p.phone,
        p.email,
        p.manager,
        p.timezone,
        p.operating_hours as "operatingHours",
        p.coordinates,
        p.factory_calendar as "factoryCalendar",
        p.status,
        p.is_active as "isActive",
        p.created_at as "createdAt",
        p.updated_at as "updatedAt",
        p.valuation_grouping_code_id as "valuationGroupingCodeId",
        cc.name as "companyCodeName",
        vgc.code as "valuationGroupingCode",
        vgc.name as "valuationGroupingName"
      FROM plants p 
      LEFT JOIN company_codes cc ON p.company_code_id = cc.id 
      LEFT JOIN valuation_grouping_codes vgc ON p.valuation_grouping_code_id = vgc.id
      WHERE p.id = ${id}
    `);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Plant not found" });
    }

    return res.status(200).json(result.rows[0]);
  } catch (error: any) {
    console.error("Error fetching plant:", error);
    return res.status(500).json({ error: "Internal server error", message: error.message });
  }
}

// POST /api/master-data/plant - Create a new plant
export async function createPlant(req: Request, res: Response) {
  try {
    const validation = plantSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        error: "Validation error",
        message: validation.error.errors.map(e => e.message).join(", ")
      });
    }

    const data = validation.data;

    // Check if company code exists using direct SQL
    const companyResult = await pool.query(`
      SELECT id FROM company_codes WHERE id = $1
    `, [data.companyCodeId]);

    if (companyResult.rows.length === 0) {
      return res.status(400).json({ error: "Invalid company code ID" });
    }

    // Check if plant code already exists using direct SQL
    const existingResult = await pool.query(`
      SELECT id FROM plants WHERE code = $1
    `, [data.code]);

    if (existingResult.rows.length > 0) {
      return res.status(409).json({ error: "Conflict", message: "Plant code already exists" });
    }

    // Use a simpler approach with only required columns
    let newPlant;
    try {
      // Use values from request, no hardcoded defaults
      const status = data.status || 'active'; // Use request value or fallback to 'active' (database default)
      const isActive = data.isActive !== undefined ? data.isActive : true; // Use request value or fallback to true (database default)

      const result = await pool.query(`
        INSERT INTO plants (
          code, name, company_code_id, type, status, is_active, valuation_grouping_code_id
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7
        ) RETURNING *
      `, [
        data.code, data.name, data.companyCodeId, data.type, status, isActive, data.valuationGroupingCodeId || null
      ]);

      newPlant = result.rows[0];

      // Update with additional fields if the basic insert succeeded
      if (data.description || data.category || data.address || data.city || data.state ||
        data.country || data.postalCode || data.phone || data.email || data.manager ||
        data.timezone || data.operatingHours || data.coordinates || data.factoryCalendar) {

        const updateResult = await pool.query(`
          UPDATE plants SET 
            description = $1, category = $2, address = $3, city = $4, state = $5,
            country = $6, postal_code = $7, phone = $8, email = $9, manager = $10,
            timezone = $11, operating_hours = $12, coordinates = $13, factory_calendar = $14
          WHERE id = $15
          RETURNING *
        `, [
          data.description, data.category, data.address, data.city, data.state,
          data.country, data.postalCode, data.phone, data.email, data.manager,
          data.timezone, data.operatingHours, data.coordinates, data.factoryCalendar, newPlant.id
        ]);

        newPlant = updateResult.rows[0];
      }

    } catch (sqlError: any) {
      console.error('SQL Error:', sqlError.message);
      return res.status(500).json({
        error: "Database error",
        message: `Failed to create plant: ${sqlError.message}`
      });
    }

    // Sync to OneProject table
    try {
      await oneProjectSyncAgent.syncBusinessToOneProject('plants', newPlant.id.toString(), 'INSERT', newPlant);
      console.log(`✅ Plant ${newPlant.code} synced to OneProject table`);
    } catch (syncError) {
      console.error(`❌ Failed to sync plant ${newPlant.code} to OneProject:`, syncError);
      // Don't fail the request, just log the sync error
    }

    // Map the response to match frontend expectations
    const mappedPlant = {
      id: newPlant.id,
      code: newPlant.code,
      name: newPlant.name,
      description: newPlant.description,
      companyCodeId: newPlant.company_code_id,
      type: newPlant.type,
      category: newPlant.category,
      address: newPlant.address,
      city: newPlant.city,
      state: newPlant.state,
      country: newPlant.country,
      postalCode: newPlant.postal_code,
      phone: newPlant.phone,
      email: newPlant.email,
      manager: newPlant.manager,
      timezone: newPlant.timezone,
      operatingHours: newPlant.operating_hours,
      coordinates: newPlant.coordinates,
      factoryCalendar: newPlant.factory_calendar,
      status: newPlant.status,
      isActive: newPlant.is_active,
      valuationGroupingCodeId: newPlant.valuation_grouping_code_id,
      createdAt: newPlant.created_at,
      updatedAt: newPlant.updated_at
    };

    return res.status(201).json(mappedPlant);
  } catch (error: any) {
    console.error("Error creating plant:", error);
    return res.status(500).json({ error: "Internal server error", message: error.message });
  }
}

// PUT /api/master-data/plant/:id - Update a plant
export async function updatePlant(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID format" });
    }

    const validation = plantSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        error: "Validation error",
        message: validation.error.errors.map(e => e.message).join(", ")
      });
    }

    const data = validation.data;

    // Check if plant exists
    const existingResult = await pool.query(`
      SELECT * FROM plants WHERE id = $1
    `, [id]);

    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: "Plant not found" });
    }

    const existingPlant = existingResult.rows[0];

    // If code is being changed, check it doesn't conflict with another plant
    if (data.code !== existingPlant.code) {
      const duplicateResult = await pool.query(`
        SELECT id FROM plants WHERE code = $1 AND id != $2
      `, [data.code, id]);

      if (duplicateResult.rows.length > 0) {
        return res.status(409).json({ error: "Conflict", message: "Plant code already exists" });
      }
    }

    // Check if company code exists
    const companyResult = await pool.query(`
      SELECT id FROM company_codes WHERE id = $1
    `, [data.companyCodeId]);

    if (companyResult.rows.length === 0) {
      return res.status(400).json({ error: "Invalid company code ID" });
    }

    // Update plant
    const updateResult = await pool.query(`
      UPDATE plants 
      SET code = $1, name = $2, description = $3, company_code_id = $4, type = $5, 
          category = $6, address = $7, city = $8, state = $9, country = $10, 
          postal_code = $11, phone = $12, email = $13, manager = $14, timezone = $15, 
          operating_hours = $16, coordinates = $17, factory_calendar = $18, status = $19, is_active = $20, 
          valuation_grouping_code_id = $21, updated_at = NOW()
      WHERE id = $22
      RETURNING *
    `, [
      data.code, data.name, data.description, data.companyCodeId, data.type,
      data.category, data.address, data.city, data.state, data.country,
      data.postalCode, data.phone, data.email, data.manager, data.timezone,
      data.operatingHours, data.coordinates, data.factoryCalendar, data.status, data.isActive,
      data.valuationGroupingCodeId || null, id
    ]);

    const updatedPlant = updateResult.rows[0];

    // Sync to OneProject table
    try {
      await oneProjectSyncAgent.syncBusinessToOneProject('plants', updatedPlant.id.toString(), 'UPDATE', updatedPlant);
      console.log(`✅ Plant ${updatedPlant.code} updated in OneProject table`);
    } catch (syncError) {
      console.error(`❌ Failed to sync plant ${updatedPlant.code} update to OneProject:`, syncError);
      // Don't fail the request, just log the sync error
    }

    // Map the response to match frontend expectations
    const mappedPlant = {
      id: updatedPlant.id,
      code: updatedPlant.code,
      name: updatedPlant.name,
      description: updatedPlant.description,
      companyCodeId: updatedPlant.company_code_id,
      type: updatedPlant.type,
      category: updatedPlant.category,
      address: updatedPlant.address,
      city: updatedPlant.city,
      state: updatedPlant.state,
      country: updatedPlant.country,
      postalCode: updatedPlant.postal_code,
      phone: updatedPlant.phone,
      email: updatedPlant.email,
      manager: updatedPlant.manager,
      timezone: updatedPlant.timezone,
      operatingHours: updatedPlant.operating_hours,
      coordinates: updatedPlant.coordinates,
      factoryCalendar: updatedPlant.factory_calendar,
      status: updatedPlant.status,
      isActive: updatedPlant.is_active,
      valuationGroupingCodeId: updatedPlant.valuation_grouping_code_id,
      createdAt: updatedPlant.created_at,
      updatedAt: updatedPlant.updated_at
    };

    return res.status(200).json(mappedPlant);
  } catch (error: any) {
    console.error("Error updating plant:", error);
    return res.status(500).json({ error: "Internal server error", message: error.message });
  }
}

// DELETE /api/master-data/plant/:id - Delete a plant
export async function deletePlant(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID format" });
    }

    // Check if plant exists
    const existingResult = await pool.query(`
      SELECT * FROM plants WHERE id = $1
    `, [id]);

    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: "Plant not found" });
    }

    const plantToDelete = existingResult.rows[0];

    // Check if plant has associated storage locations
    const storageLocationsResult = await pool.query(`
      SELECT id, code, name 
      FROM storage_locations 
      WHERE plant_id = $1
    `, [id]);

    if (storageLocationsResult.rows.length > 0) {
      const storageLocationNames = storageLocationsResult.rows.map((sl: any) => `${sl.code} - ${sl.name}`).join(', ');
      return res.status(409).json({
        error: "Cannot delete plant",
        message: `This plant has ${storageLocationsResult.rows.length} associated storage location(s): ${storageLocationNames}. Please delete the storage locations first or deactivate the plant instead.`
      });
    }

    // Check for other potential foreign key constraints
    const constraints = [
      { table: 'accounts_payable', field: 'plant_id' },
      { table: 'accounts_receivable', field: 'plant_id' },
      { table: 'batch_master', field: 'plant_id' },
      { table: 'condition_access_rules', field: 'plant_id' },
      { table: 'sales_orders', field: 'plant_id' },
      { table: 'inventory_transactions', field: 'plant_id' },
      { table: 'production_orders', field: 'plant_id' },
      { table: 'purchase_order_items', field: 'plant_id' },
      { table: 'purchase_orders', field: 'plant_id' }
    ];

    for (const constraint of constraints) {
      const constraintResult = await pool.query(`
        SELECT COUNT(*) as count FROM ${constraint.table} WHERE ${constraint.field} = $1
      `, [id]);

      const count = parseInt(constraintResult.rows[0].count);
      if (count > 0) {
        return res.status(409).json({
          error: "Cannot delete plant",
          message: `This plant has ${count} associated record(s) in ${constraint.table}. Please remove these records first or deactivate the plant instead.`
        });
      }
    }

    // Delete plant
    await pool.query(`
      DELETE FROM plants WHERE id = $1
    `, [id]);

    // Sync deletion to OneProject table
    try {
      await oneProjectSyncAgent.syncBusinessToOneProject('plants', plantToDelete.id.toString(), 'DELETE', plantToDelete);
      console.log(`✅ Plant ${plantToDelete.code} deletion synced to OneProject table`);
    } catch (syncError) {
      console.error(`❌ Failed to sync plant ${plantToDelete.code} deletion to OneProject:`, syncError);
      // Don't fail the request, just log the sync error
    }

    return res.status(200).json({ message: "Plant deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting plant:", error);

    // Check if it's a foreign key constraint error
    if (error.message && error.message.includes('violates foreign key constraint')) {
      return res.status(409).json({
        error: "Cannot delete plant",
        message: "This plant has associated records in other tables. Please remove these records first or deactivate the plant instead."
      });
    }

    return res.status(500).json({ error: "Internal server error", message: error.message });
  }
}

// PUT /api/master-data/plant/:id/deactivate - Deactivate a plant (soft delete)
export async function deactivatePlant(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID format" });
    }

    // Check if plant exists
    const existingResult = await pool.query(`
      SELECT * FROM plants WHERE id = $1
    `, [id]);

    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: "Plant not found" });
    }

    const existingPlant = existingResult.rows[0];

    // Deactivate plant
    const updateResult = await pool.query(`
      UPDATE plants 
      SET is_active = false, status = 'inactive', updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [id]);

    const deactivatedPlant = updateResult.rows[0];

    // Sync deactivation to OneProject table
    try {
      await oneProjectSyncAgent.syncBusinessToOneProject('plants', deactivatedPlant.id.toString(), 'UPDATE', deactivatedPlant);
      console.log(`✅ Plant ${deactivatedPlant.code} deactivation synced to OneProject table`);
    } catch (syncError) {
      console.error(`❌ Failed to sync plant ${deactivatedPlant.code} deactivation to OneProject:`, syncError);
      // Don't fail the request, just log the sync error
    }

    // Map the response to match frontend expectations
    const mappedPlant = {
      id: deactivatedPlant.id,
      code: deactivatedPlant.code,
      name: deactivatedPlant.name,
      description: deactivatedPlant.description,
      companyCodeId: deactivatedPlant.company_code_id,
      type: deactivatedPlant.type,
      category: deactivatedPlant.category,
      address: deactivatedPlant.address,
      city: deactivatedPlant.city,
      state: deactivatedPlant.state,
      country: deactivatedPlant.country,
      postalCode: deactivatedPlant.postal_code,
      phone: deactivatedPlant.phone,
      email: deactivatedPlant.email,
      manager: deactivatedPlant.manager,
      timezone: deactivatedPlant.timezone,
      operatingHours: deactivatedPlant.operating_hours,
      coordinates: deactivatedPlant.coordinates,
      factoryCalendar: deactivatedPlant.factory_calendar,
      status: deactivatedPlant.status,
      isActive: deactivatedPlant.is_active,
      createdAt: deactivatedPlant.created_at,
      updatedAt: deactivatedPlant.updated_at
    };

    return res.status(200).json({
      message: "Plant deactivated successfully",
      plant: mappedPlant
    });
  } catch (error: any) {
    console.error("Error deactivating plant:", error);
    return res.status(500).json({ error: "Internal server error", message: error.message });
  }
}

// POST /api/master-data/plant/bulk-import - Bulk import plants
export async function bulkImportPlants(req: Request, res: Response) {
  try {
    const { plants } = req.body;

    if (!Array.isArray(plants)) {
      return res.status(400).json({ error: "Invalid input", message: "plants must be an array" });
    }

    const results = [];
    const errors = [];

    for (const plantData of plants) {
      try {
        const validation = plantSchema.safeParse(plantData);

        if (!validation.success) {
          errors.push({
            data: plantData,
            error: validation.error.errors.map(e => e.message).join(", ")
          });
          continue;
        }

        const data = validation.data;

        // Check if plant code already exists
        const existingResult = await pool.query(`
          SELECT id FROM plants WHERE code = $1
        `, [data.code]);

        if (existingResult.rows.length > 0) {
          errors.push({
            data: plantData,
            error: "Plant code already exists"
          });
          continue;
        }

        // Check if company code exists
        const companyResult = await pool.query(`
          SELECT id FROM company_codes WHERE id = $1
        `, [data.companyCodeId]);

        if (companyResult.rows.length === 0) {
          errors.push({
            data: plantData,
            error: "Invalid company code ID"
          });
          continue;
        }

        // Use values from request, no hardcoded defaults
        const status = data.status || 'active'; // Use request value or fallback to 'active' (database default)
        const isActive = data.isActive !== undefined ? data.isActive : true; // Use request value or fallback to true (database default)

        // Create plant with minimal columns first
        const insertResult = await pool.query(`
          INSERT INTO plants (
            code, name, company_code_id, type, status, is_active, valuation_grouping_code_id
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7
          ) RETURNING *
        `, [
          data.code, data.name, data.companyCodeId, data.type, status, isActive, data.valuationGroupingCodeId || null
        ]);

        let newPlant = insertResult.rows[0];

        // Update with additional fields if needed
        if (data.description || data.category || data.address || data.city || data.state ||
          data.country || data.postalCode || data.phone || data.email || data.manager ||
          data.timezone || data.operatingHours || data.coordinates || data.factoryCalendar) {

          const updateResult = await pool.query(`
            UPDATE plants SET 
              description = $1, category = $2, address = $3, city = $4, state = $5,
              country = $6, postal_code = $7, phone = $8, email = $9, manager = $10,
              timezone = $11, operating_hours = $12, coordinates = $13, factory_calendar = $14
            WHERE id = $15
            RETURNING *
          `, [
            data.description, data.category, data.address, data.city, data.state,
            data.country, data.postalCode, data.phone, data.email, data.manager,
            data.timezone, data.operatingHours, data.coordinates, data.factoryCalendar, newPlant.id
          ]);

          newPlant = updateResult.rows[0];
        }

        // Sync to OneProject table
        try {
          await oneProjectSyncAgent.syncBusinessToOneProject('plants', newPlant.id.toString(), 'INSERT', newPlant);
        } catch (syncError) {
          console.error(`❌ Failed to sync plant ${newPlant.code} to OneProject:`, syncError);
        }

        results.push(newPlant);
      } catch (error: any) {
        errors.push({
          data: plantData,
          error: error.message
        });
      }
    }

    return res.status(200).json({
      message: `Bulk import completed. ${results.length} created, ${errors.length} failed.`,
      created: results,
      errors: errors
    });
  } catch (error: any) {
    console.error("Error in bulk import:", error);
    return res.status(500).json({ error: "Internal server error", message: error.message });
  }
}