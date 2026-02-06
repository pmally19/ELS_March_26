/**
 * API Routes for Storage Location Master Data
 */

import { Request, Response } from "express";
import { db } from "../../db";
import { pool } from "../../db";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { oneProjectSyncAgent } from "../../services/oneproject-sync-agent";

// Validation schema for storage location
const storageLocationSchema = z.object({
  code: z.string().min(2, "Code is required").max(10, "Code must be at most 10 characters"),
  name: z.string().min(1, "Name is required").max(100, "Name must be at most 100 characters"),
  description: z.string().transform(val => val === "" ? null : val).nullable().optional(),
  plantId: z.number().min(1, "Plant is required"),
  type: z.string().min(1, "Type is required"),
  category: z.string().transform(val => val === "" ? null : val).nullable().optional(),
  address: z.string().transform(val => val === "" ? null : val).nullable().optional(),
  capacity: z.number().min(0).default(0),
  unit: z.string().default("UNITS"),
  status: z.string().default("active"),
  isActive: z.boolean().default(true),
});

// GET /api/master-data/storage-location - List all storage locations
export async function getStorageLocations(req: Request, res: Response) {
  try {
    const result = await db.execute(sql`
      SELECT 
        sl.id,
        sl.code AS code,
        sl.name,
        sl.description,
        sl.plant_id AS plant_id,
        p.id AS plant_id,
        p.code AS p_code,
        p.name AS p_name,
        sl.type AS type,
        COALESCE(sl.status, 'active') AS status,
        COALESCE(sl.is_active, true) AS is_active,
        sl.created_at,
        sl.updated_at
      FROM storage_locations sl 
      LEFT JOIN plants p ON sl.plant_id = p.id
      ORDER BY sl.code
    `);
    // Map DB fields to UI schema
    const rows = (result.rows || []).map((r: any) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      description: r.description,
      plantId: r.plant_id,
      type: r.type,
      status: r.status,
      isActive: r.is_active,
      plant: r.plant_id ? { id: r.plant_id, code: r.p_code, name: r.p_name } : undefined,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
    return res.status(200).json(rows);
  } catch (error: any) {
    console.error("Error fetching storage locations:", error);
    return res.status(500).json({ error: "Internal server error", message: error.message });
  }
}

// GET /api/master-data/storage-location/:id - Get a specific storage location by ID
export async function getStorageLocationById(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID format" });
    }

    const result = await db.execute(sql`
      SELECT 
        sl.id,
        sl.code AS code,
        sl.name,
        sl.description,
        sl.plant_id AS plant_id,
        p.id AS plant_id,
        p.code AS p_code,
        p.name AS p_name,
        sl.type AS type,
        COALESCE(sl.status, 'active') AS status,
        COALESCE(sl.is_active, true) AS is_active,
        sl.created_at,
        sl.updated_at
      FROM storage_locations sl 
      LEFT JOIN plants p ON sl.plant_id = p.id
      WHERE sl.id = ${id}
    `);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Storage location not found" });
    }

    const r: any = result.rows[0];
    const row = {
      id: r.id,
      code: r.code,
      name: r.name,
      description: r.description,
      plantId: r.plant_id,
      type: r.type,
      status: r.status,
      isActive: r.is_active,
      plant: r.plant_id ? { id: r.plant_id, code: r.p_code, name: r.p_name } : undefined,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    };
    return res.status(200).json(row);
  } catch (error: any) {
    console.error("Error fetching storage location:", error);
    return res.status(500).json({ error: "Internal server error", message: error.message });
  }
}

// POST /api/master-data/storage-location - Create a new storage location
export async function createStorageLocation(req: Request, res: Response) {
  try {
    const validation = storageLocationSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({ 
        error: "Validation error", 
        message: validation.error.errors.map(e => e.message).join(", ") 
      });
    }

    const data = validation.data;

    // Check if storage location code already exists (handle both schema variants)
    const existingResult = await db.execute(sql`
      SELECT id FROM storage_locations 
      WHERE location_code = ${data.code} OR code = ${data.code}
    `);
    
    if (existingResult.rows.length > 0) {
      return res.status(409).json({ error: "Conflict", message: "Storage location code already exists" });
    }

    // Resolve plant_code from plantId
    const plantResult = await db.execute(sql`SELECT code FROM plants WHERE id = ${data.plantId}`);
    const plantCode = plantResult.rows?.[0]?.code;
    if (!plantCode) {
      return res.status(400).json({ error: "Invalid plant reference", message: "Plant ID not found" });
    }

    // Insert storage location (map type -> storage_type) with schema fallback
    let insertResult;
    try {
      insertResult = await db.execute(sql`
        INSERT INTO storage_locations (
          location_code, name, description, plant_code, storage_type, is_active, created_at, updated_at
        )
        VALUES (
          ${data.code}, ${data.name}, ${data.description || null}, ${plantCode}, 
          ${data.type || 'GENERAL'}, ${data.isActive}, NOW(), NOW()
        )
        RETURNING *
      `);
    } catch (schemaError: any) {
      // Dynamic insert based on existing columns
      const colsRes = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'storage_locations'`);
      const cols = new Set(colsRes.rows.map((r: any) => r.column_name));

      const colMap: Record<string, any> = {
        location_code: data.code,
        code: data.code,
        name: data.name,
        description: data.description || null,
        plant_code: plantCode,
        plant_id: null, // if only plant_id exists, resolve id from plants
        storage_type: data.type || 'GENERAL',
        type: data.type || 'GENERAL',
        status: 'active',
        is_active: data.isActive,
        created_at: new Date(),
        updated_at: new Date(),
      };

      if (cols.has('plant_id') && !cols.has('plant_code')) {
        // Resolve plant id (we already have plantId from request)
        const plantId = data.plantId;
        colMap.plant_id = plantId;
      } else {
        delete colMap.plant_id;
      }

      // Build final columns/values limited to existing cols
      const finalCols: string[] = [];
      const params: any[] = [];
      Object.entries(colMap).forEach(([c, v]) => {
        if (v !== undefined && cols.has(c)) {
          finalCols.push(c);
          params.push(v);
        }
      });
      const placeholders = params.map((_, i) => `$${i+1}`).join(', ');
      const sqlText = `INSERT INTO storage_locations (${finalCols.join(', ')}) VALUES (${placeholders}) RETURNING *`;
      const dynRes = await pool.query(sqlText, params);
      insertResult = { rows: dynRes.rows } as any;
    }
    
    if (insertResult.rows && insertResult.rows.length > 0) {
      const newStorageLocation = insertResult.rows[0];
      
      // Sync to OneProject table
      try {
        await oneProjectSyncAgent.syncBusinessToOneProject('storage_locations', newStorageLocation.id.toString(), 'INSERT', newStorageLocation);
        console.log(`✅ Storage Location ${newStorageLocation.code || newStorageLocation.location_code} synced to OneProject table`);
      } catch (syncError) {
        console.error(`❌ Failed to sync storage location ${newStorageLocation.code || newStorageLocation.location_code} to OneProject:`, syncError);
        // Don't fail the request, just log the sync error
      }
      
      return res.status(201).json(newStorageLocation);
    } else {
      return res.status(500).json({ error: "Failed to create storage location" });
    }
  } catch (error: any) {
    console.error("Error creating storage location:", error);
    return res.status(500).json({ error: "Internal server error", message: error.message });
  }
}

// PUT /api/master-data/storage-location/:id - Update a storage location
export async function updateStorageLocation(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID format" });
    }

    const validation = storageLocationSchema.safeParse(req.body);
    
    if (!validation.success) {
      return res.status(400).json({ 
        error: "Validation error", 
        message: validation.error.errors.map(e => e.message).join(", ") 
      });
    }

    const data = validation.data;

    // Check if storage location exists
    const existingResult = await db.execute(sql`SELECT * FROM storage_locations WHERE id = ${id}`);
    
    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: "Storage location not found" });
    }

    // Resolve plant_code from plantId
    const plantResult = await db.execute(sql`SELECT code FROM plants WHERE id = ${data.plantId}`);
    const plantCode = plantResult.rows?.[0]?.code;
    if (!plantCode) {
      return res.status(400).json({ error: "Invalid plant reference", message: "Plant ID not found" });
    }

    // Update storage location (map type -> storage_type) with schema fallback
    let updateResult;
    try {
      updateResult = await db.execute(sql`
        UPDATE storage_locations 
        SET location_code = ${data.code}, name = ${data.name}, description = ${data.description || null}, 
            plant_code = ${plantCode}, storage_type = ${data.type || 'GENERAL'}, 
            is_active = ${data.isActive}, updated_at = NOW()
        WHERE id = ${id}
        RETURNING *
      `);
    } catch (schemaError: any) {
      const colsRes = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'storage_locations'`);
      const cols = new Set(colsRes.rows.map((r: any) => r.column_name));

      const updatePairs: string[] = [];
      const params: any[] = [];
      const setCol = (col: string, val: any) => { if (cols.has(col)) { params.push(val); updatePairs.push(`${col} = $${params.length}`); } };

      // Prefer location_code/code
      setCol(cols.has('location_code') ? 'location_code' : 'code', data.code);
      setCol('name', data.name);
      setCol('description', data.description || null);
      if (cols.has('plant_code')) setCol('plant_code', plantCode);
      if (!cols.has('plant_code') && cols.has('plant_id')) setCol('plant_id', data.plantId);
      // Prefer storage_type/type
      setCol(cols.has('storage_type') ? 'storage_type' : 'type', data.type || 'GENERAL');
      setCol('is_active', data.isActive);
      if (cols.has('updated_at')) updatePairs.push(`updated_at = NOW()`);

      if (updatePairs.length === 0) {
        return res.status(400).json({ error: 'No updatable fields for current schema' });
      }

      params.push(id);
      const sqlText = `UPDATE storage_locations SET ${updatePairs.join(', ')} WHERE id = $${params.length} RETURNING *`;
      const dynRes = await pool.query(sqlText, params);
      updateResult = { rows: dynRes.rows } as any;
    }

    const updatedStorageLocation = updateResult.rows[0];
    
    // Sync to OneProject table
    try {
      await oneProjectSyncAgent.syncBusinessToOneProject('storage_locations', updatedStorageLocation.id.toString(), 'UPDATE', updatedStorageLocation);
      console.log(`✅ Storage Location ${updatedStorageLocation.code || updatedStorageLocation.location_code} updated in OneProject table`);
    } catch (syncError) {
      console.error(`❌ Failed to sync storage location ${updatedStorageLocation.code || updatedStorageLocation.location_code} update to OneProject:`, syncError);
      // Don't fail the request, just log the sync error
    }

    return res.status(200).json(updatedStorageLocation);
  } catch (error: any) {
    console.error("Error updating storage location:", error);
    return res.status(500).json({ error: "Internal server error", message: error.message });
  }
}

// DELETE /api/master-data/storage-location/:id - Delete a storage location
export async function deleteStorageLocation(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID format" });
    }

    // Check if storage location exists
    const existingResult = await db.execute(sql`SELECT * FROM storage_locations WHERE id = ${id}`);
    
    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: "Storage location not found" });
    }

    const storageLocationToDelete = existingResult.rows[0];

    // Delete storage location
    await db.execute(sql`DELETE FROM storage_locations WHERE id = ${id}`);
    
    // Sync deletion to OneProject table
    try {
      await oneProjectSyncAgent.syncBusinessToOneProject('storage_locations', storageLocationToDelete.id.toString(), 'DELETE', storageLocationToDelete);
      console.log(`✅ Storage Location ${storageLocationToDelete.code || storageLocationToDelete.location_code} deletion synced to OneProject table`);
    } catch (syncError) {
      console.error(`❌ Failed to sync storage location ${storageLocationToDelete.code || storageLocationToDelete.location_code} deletion to OneProject:`, syncError);
      // Don't fail the request, just log the sync error
    }

    return res.status(200).json({ success: true, message: "Storage location deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting storage location:", error);
    return res.status(500).json({ error: "Internal server error", message: error.message });
  }
}

// PUT /api/master-data/storage-location/:id/deactivate - Deactivate a storage location (soft delete)
export async function deactivateStorageLocation(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid ID format" });
    }

    // Check if storage location exists
    const existingResult = await db.execute(sql`SELECT * FROM storage_locations WHERE id = ${id}`);
    
    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: "Storage location not found" });
    }

    const existingStorageLocation = existingResult.rows[0];

    // Deactivate storage location
    const updateResult = await db.execute(sql`
      UPDATE storage_locations 
      SET is_active = false, status = 'inactive', updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `);
    
    const deactivatedStorageLocation = updateResult.rows[0];
    
    // Sync deactivation to OneProject table
    try {
      await oneProjectSyncAgent.syncBusinessToOneProject('storage_locations', deactivatedStorageLocation.id.toString(), 'UPDATE', deactivatedStorageLocation);
      console.log(`✅ Storage Location ${deactivatedStorageLocation.code || deactivatedStorageLocation.location_code} deactivation synced to OneProject table`);
    } catch (syncError) {
      console.error(`❌ Failed to sync storage location ${deactivatedStorageLocation.code || deactivatedStorageLocation.location_code} deactivation to OneProject:`, syncError);
      // Don't fail the request, just log the sync error
    }
    
    return res.status(200).json({
      message: "Storage location deactivated successfully",
      storageLocation: deactivatedStorageLocation
    });
  } catch (error: any) {
    console.error("Error deactivating storage location:", error);
    return res.status(500).json({ error: "Internal server error", message: error.message });
  }
}

// POST /api/master-data/storage-location/bulk-import - Bulk import storage locations
export async function bulkImportStorageLocations(req: Request, res: Response) {
  try {
    const storageLocations = req.body;
    
    if (!Array.isArray(storageLocations)) {
      return res.status(400).json({ error: "Expected an array of storage locations" });
    }

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[]
    };

    for (const storageLocationData of storageLocations) {
      try {
        const validation = storageLocationSchema.safeParse(storageLocationData);
        
        if (!validation.success) {
          results.failed++;
          results.errors.push(`${storageLocationData.code}: Validation failed - ${validation.error.errors.map(e => e.message).join(", ")}`);
          continue;
        }

        const data = validation.data;

        // Check if storage location code already exists
        const existingResult = await db.execute(sql`SELECT id FROM storage_locations WHERE code = ${data.code}`);
        
        if (existingResult.rows.length > 0) {
          results.failed++;
          results.errors.push(`${data.code}: Storage location code already exists`);
          continue;
        }

        // Insert storage location
        await db.execute(sql`
          INSERT INTO storage_locations (
            code, name, description, plant_id, type, category, address, 
            capacity, unit, status, is_active, created_at, updated_at
          )
          VALUES (
            ${data.code}, ${data.name}, ${data.description || null}, ${data.plantId}, 
            ${data.type}, ${data.category || null}, ${data.address || null}, 
            ${data.capacity}, ${data.unit}, ${data.status}, ${data.isActive}, 
            NOW(), NOW()
          )
        `);
        
        results.success++;
      } catch (error: any) {
        results.failed++;
        results.errors.push(`${storageLocationData.code}: ${error.message || 'Unknown error'}`);
      }
    }

    return res.status(200).json(results);
  } catch (error: any) {
    console.error("Error bulk importing storage locations:", error);
    return res.status(500).json({ error: "Internal server error", message: error.message });
  }
}

// For backward compatibility
export async function getStorageLocation(req: Request, res: Response) {
  return getStorageLocations(req, res);
}

export default getStorageLocation;