import { Router } from 'express';
import { pool } from '../../db';

const router = Router();

// GET /api/master-data/transportation-zones - Get all transportation zones
router.get("/", async (req, res) => {
  try {
    // Check if table exists first
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'transportation_zones'
      );
    `);
    
    if (!tableCheck.rows[0]?.exists) {
      return res.json([]); // Return empty array if table doesn't exist yet
    }
    
    // Check if shipping_points table exists
    const shippingPointsExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'shipping_points'
      );
    `);
    const hasShippingPoints = shippingPointsExists.rows[0]?.exists;
    
    const result = await pool.query(hasShippingPoints ? `
      SELECT 
        tz.id,
        tz.code,
        tz.name,
        tz.description,
        tz.region,
        tz.country,
        tz.zone_type,
        tz.transit_time,
        tz.shipping_multiplier,
        tz.postal_code_from,
        tz.postal_code_to,
        tz.company_code_id,
        tz.base_freight_rate,
        tz.currency,
        tz.transportation_type,
        tz.distance_km,
        tz.shipping_point_id,
        tz.block_indicator,
        tz.is_active,
        tz.created_at,
        tz.updated_at,
        cc.code as company_code,
        cc.name as company_name,
        sp.code as shipping_point_code,
        sp.name as shipping_point_name
      FROM transportation_zones tz
      LEFT JOIN company_codes cc ON tz.company_code_id = cc.id
      LEFT JOIN shipping_points sp ON tz.shipping_point_id = sp.id
      WHERE COALESCE(tz.is_active, true) = true
      ORDER BY tz.code, tz.name
    ` : `
      SELECT 
        tz.id,
        tz.code,
        tz.name,
        tz.description,
        tz.region,
        tz.country,
        tz.zone_type,
        tz.transit_time,
        tz.shipping_multiplier,
        tz.postal_code_from,
        tz.postal_code_to,
        tz.company_code_id,
        tz.base_freight_rate,
        tz.currency,
        tz.transportation_type,
        tz.distance_km,
        tz.shipping_point_id,
        tz.block_indicator,
        tz.is_active,
        tz.created_at,
        tz.updated_at,
        cc.code as company_code,
        cc.name as company_name,
        NULL as shipping_point_code,
        NULL as shipping_point_name
      FROM transportation_zones tz
      LEFT JOIN company_codes cc ON tz.company_code_id = cc.id
      WHERE COALESCE(tz.is_active, true) = true
      ORDER BY tz.code, tz.name
    `);
    
    const rows = result.rows.map((r: any) => ({
      id: r.id,
      code: r.code || '',
      name: r.name || '',
      description: r.description || '',
      region: r.region || undefined,
      country: r.country || undefined,
      zoneType: r.zone_type || undefined,
      transitTime: r.transit_time || undefined,
      shippingMultiplier: r.shipping_multiplier ? parseFloat(r.shipping_multiplier) : undefined,
      postalCodeFrom: r.postal_code_from || undefined,
      postalCodeTo: r.postal_code_to || undefined,
      companyCodeId: r.company_code_id || undefined,
      companyCode: r.company_code || undefined,
      companyName: r.company_name || undefined,
      baseFreightRate: r.base_freight_rate ? parseFloat(r.base_freight_rate) : undefined,
      currency: r.currency || undefined,
      transportationType: r.transportation_type || undefined,
      distanceKm: r.distance_km ? parseFloat(r.distance_km) : undefined,
      shippingPointId: r.shipping_point_id || undefined,
      shippingPointCode: r.shipping_point_code || undefined,
      shippingPointName: r.shipping_point_name || undefined,
      blockIndicator: r.block_indicator || false,
      isActive: r.is_active !== false,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
    res.json(rows);
  } catch (error: any) {
    console.error("Error fetching transportation zones:", error);
    console.error("Error details:", error.message, error.stack);
    res.status(500).json({ 
      message: "Failed to fetch transportation zones",
      error: error.message || "Unknown error"
    });
  }
});

// GET /api/master-data/transportation-zones/:id - Get transportation zone by ID
router.get("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    // Check if shipping_points table exists
    const shippingPointsExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'shipping_points'
      );
    `);
    const hasShippingPoints = shippingPointsExists.rows[0]?.exists;
    
    const result = await pool.query(hasShippingPoints ? `
      SELECT 
        tz.id,
        tz.code,
        tz.name,
        tz.description,
        tz.region,
        tz.country,
        tz.zone_type,
        tz.transit_time,
        tz.shipping_multiplier,
        tz.postal_code_from,
        tz.postal_code_to,
        tz.company_code_id,
        tz.base_freight_rate,
        tz.currency,
        tz.transportation_type,
        tz.distance_km,
        tz.shipping_point_id,
        tz.block_indicator,
        tz.is_active,
        tz.created_at,
        tz.updated_at,
        cc.code as company_code,
        cc.name as company_name,
        sp.code as shipping_point_code,
        sp.name as shipping_point_name
      FROM transportation_zones tz
      LEFT JOIN company_codes cc ON tz.company_code_id = cc.id
      LEFT JOIN shipping_points sp ON tz.shipping_point_id = sp.id
      WHERE tz.id = $1
    ` : `
      SELECT 
        tz.id,
        tz.code,
        tz.name,
        tz.description,
        tz.region,
        tz.country,
        tz.zone_type,
        tz.transit_time,
        tz.shipping_multiplier,
        tz.postal_code_from,
        tz.postal_code_to,
        tz.company_code_id,
        tz.base_freight_rate,
        tz.currency,
        tz.transportation_type,
        tz.distance_km,
        tz.shipping_point_id,
        tz.block_indicator,
        tz.is_active,
        tz.created_at,
        tz.updated_at,
        cc.code as company_code,
        cc.name as company_name,
        NULL as shipping_point_code,
        NULL as shipping_point_name
      FROM transportation_zones tz
      LEFT JOIN company_codes cc ON tz.company_code_id = cc.id
      WHERE tz.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Transportation zone not found" });
    }
    
    const row = result.rows[0];
    res.json({
      id: row.id,
      code: row.code || '',
      name: row.name || '',
      description: row.description || '',
      region: row.region || undefined,
      country: row.country || undefined,
      zoneType: row.zone_type || undefined,
      transitTime: row.transit_time || undefined,
      shippingMultiplier: row.shipping_multiplier ? parseFloat(row.shipping_multiplier) : undefined,
      postalCodeFrom: row.postal_code_from || undefined,
      postalCodeTo: row.postal_code_to || undefined,
      companyCodeId: row.company_code_id || undefined,
      companyCode: row.company_code || undefined,
      companyName: row.company_name || undefined,
      baseFreightRate: row.base_freight_rate ? parseFloat(row.base_freight_rate) : undefined,
      currency: row.currency || undefined,
      transportationType: row.transportation_type || undefined,
      distanceKm: row.distance_km ? parseFloat(row.distance_km) : undefined,
      shippingPointId: row.shipping_point_id || undefined,
      shippingPointCode: row.shipping_point_code || undefined,
      shippingPointName: row.shipping_point_name || undefined,
      blockIndicator: row.block_indicator || false,
      isActive: row.is_active !== false,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  } catch (error) {
    console.error("Error fetching transportation zone:", error);
    res.status(500).json({ message: "Failed to fetch transportation zone" });
  }
});

// POST /api/master-data/transportation-zones - Create new transportation zone
router.post("/", async (req, res) => {
  try {
    const {
      code, name, description, region, country, zoneType, transitTime, shippingMultiplier,
      postalCodeFrom, postalCodeTo, companyCodeId, baseFreightRate, currency,
      transportationType, distanceKm, shippingPointId, blockIndicator, isActive
    } = req.body;
    
    // Validation
    if (!code || !name) {
      return res.status(400).json({ message: "Code and name are required" });
    }
    
    // Check for duplicate code
    const existingCheck = await pool.query(
      'SELECT id FROM transportation_zones WHERE code = $1',
      [code]
    );
    if (existingCheck.rows.length > 0) {
      return res.status(409).json({ message: "Transportation zone code already exists" });
    }
    
    const result = await pool.query(`
      INSERT INTO transportation_zones (
        code, name, description, region, country, zone_type, transit_time, shipping_multiplier,
        postal_code_from, postal_code_to, company_code_id, base_freight_rate, currency,
        transportation_type, distance_km, shipping_point_id, block_indicator, is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING id, code, name, description, region, country, zone_type, transit_time, shipping_multiplier,
        postal_code_from, postal_code_to, company_code_id, base_freight_rate, currency,
        transportation_type, distance_km, shipping_point_id, block_indicator, is_active,
        created_at, updated_at
    `, [
      code, name || null, description || null, region || null, country || null,
      zoneType || null, transitTime || null, shippingMultiplier || 1.00,
      postalCodeFrom || null, postalCodeTo || null, companyCodeId || null,
      baseFreightRate || null, currency || null, transportationType || null,
      distanceKm || null, shippingPointId || null, blockIndicator || false,
      isActive !== undefined ? isActive : true
    ]);
    
    const created = result.rows[0];
    
    // Check if shipping_points table exists
    const shippingPointsExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'shipping_points'
      );
    `);
    const hasShippingPoints = shippingPointsExists.rows[0]?.exists;
    
    // Fetch with joins
    const fullRecord = await pool.query(hasShippingPoints ? `
      SELECT 
        tz.*,
        cc.code as company_code,
        cc.name as company_name,
        sp.code as shipping_point_code,
        sp.name as shipping_point_name
      FROM transportation_zones tz
      LEFT JOIN company_codes cc ON tz.company_code_id = cc.id
      LEFT JOIN shipping_points sp ON tz.shipping_point_id = sp.id
      WHERE tz.id = $1
    ` : `
      SELECT 
        tz.*,
        cc.code as company_code,
        cc.name as company_name,
        NULL as shipping_point_code,
        NULL as shipping_point_name
      FROM transportation_zones tz
      LEFT JOIN company_codes cc ON tz.company_code_id = cc.id
      WHERE tz.id = $1
    `, [created.id]);
    
    const fullRow = fullRecord.rows[0];
    
    res.status(201).json({
      id: fullRow.id,
      code: fullRow.code,
      name: fullRow.name,
      description: fullRow.description || '',
      region: fullRow.region || undefined,
      country: fullRow.country || undefined,
      zoneType: fullRow.zone_type || undefined,
      transitTime: fullRow.transit_time || undefined,
      shippingMultiplier: fullRow.shipping_multiplier ? parseFloat(fullRow.shipping_multiplier) : undefined,
      postalCodeFrom: fullRow.postal_code_from || undefined,
      postalCodeTo: fullRow.postal_code_to || undefined,
      companyCodeId: fullRow.company_code_id || undefined,
      companyCode: fullRow.company_code || undefined,
      companyName: fullRow.company_name || undefined,
      baseFreightRate: fullRow.base_freight_rate ? parseFloat(fullRow.base_freight_rate) : undefined,
      currency: fullRow.currency || undefined,
      transportationType: fullRow.transportation_type || undefined,
      distanceKm: fullRow.distance_km ? parseFloat(fullRow.distance_km) : undefined,
      shippingPointId: fullRow.shipping_point_id || undefined,
      shippingPointCode: fullRow.shipping_point_code || undefined,
      shippingPointName: fullRow.shipping_point_name || undefined,
      blockIndicator: fullRow.block_indicator || false,
      isActive: fullRow.is_active !== false,
      createdAt: fullRow.created_at,
      updatedAt: fullRow.updated_at,
    });
  } catch (error: any) {
    console.error("Error creating transportation zone:", error);
    if (error.code === '23505') {
      res.status(409).json({ message: "Transportation zone code already exists" });
    } else {
      res.status(500).json({ message: "Failed to create transportation zone" });
    }
  }
});

// PATCH /api/master-data/transportation-zones/:id - Update transportation zone
router.patch("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const {
      code, name, description, region, country, zoneType, transitTime, shippingMultiplier,
      postalCodeFrom, postalCodeTo, companyCodeId, baseFreightRate, currency,
      transportationType, distanceKm, shippingPointId, blockIndicator, isActive
    } = req.body;
    
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;
    
    if (code !== undefined) {
      // Check for duplicate code (excluding current record)
      const existingCheck = await pool.query(
        'SELECT id FROM transportation_zones WHERE code = $1 AND id != $2',
        [code, id]
      );
      if (existingCheck.rows.length > 0) {
        return res.status(409).json({ message: "Transportation zone code already exists" });
      }
      updateFields.push(`code = $${paramCount}`);
      values.push(code);
      paramCount++;
    }
    
    if (name !== undefined) {
      updateFields.push(`name = $${paramCount}`);
      values.push(name);
      paramCount++;
    }
    if (description !== undefined) {
      updateFields.push(`description = $${paramCount}`);
      values.push(description || null);
      paramCount++;
    }
    if (region !== undefined) {
      updateFields.push(`region = $${paramCount}`);
      values.push(region || null);
      paramCount++;
    }
    if (country !== undefined) {
      updateFields.push(`country = $${paramCount}`);
      values.push(country || null);
      paramCount++;
    }
    if (zoneType !== undefined) {
      updateFields.push(`zone_type = $${paramCount}`);
      values.push(zoneType || null);
      paramCount++;
    }
    if (transitTime !== undefined) {
      updateFields.push(`transit_time = $${paramCount}`);
      values.push(transitTime || null);
      paramCount++;
    }
    if (shippingMultiplier !== undefined) {
      updateFields.push(`shipping_multiplier = $${paramCount}`);
      values.push(shippingMultiplier || null);
      paramCount++;
    }
    if (postalCodeFrom !== undefined) {
      updateFields.push(`postal_code_from = $${paramCount}`);
      values.push(postalCodeFrom || null);
      paramCount++;
    }
    if (postalCodeTo !== undefined) {
      updateFields.push(`postal_code_to = $${paramCount}`);
      values.push(postalCodeTo || null);
      paramCount++;
    }
    if (companyCodeId !== undefined) {
      updateFields.push(`company_code_id = $${paramCount}`);
      values.push(companyCodeId || null);
      paramCount++;
    }
    if (baseFreightRate !== undefined) {
      updateFields.push(`base_freight_rate = $${paramCount}`);
      values.push(baseFreightRate || null);
      paramCount++;
    }
    if (currency !== undefined) {
      updateFields.push(`currency = $${paramCount}`);
      values.push(currency || null);
      paramCount++;
    }
    if (transportationType !== undefined) {
      updateFields.push(`transportation_type = $${paramCount}`);
      values.push(transportationType || null);
      paramCount++;
    }
    if (distanceKm !== undefined) {
      updateFields.push(`distance_km = $${paramCount}`);
      values.push(distanceKm || null);
      paramCount++;
    }
    if (shippingPointId !== undefined) {
      updateFields.push(`shipping_point_id = $${paramCount}`);
      values.push(shippingPointId || null);
      paramCount++;
    }
    if (blockIndicator !== undefined) {
      updateFields.push(`block_indicator = $${paramCount}`);
      values.push(blockIndicator);
      paramCount++;
    }
    if (isActive !== undefined) {
      updateFields.push(`is_active = $${paramCount}`);
      values.push(isActive);
      paramCount++;
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({ message: "No fields to update" });
    }
    
    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);
    
    await pool.query(
      `UPDATE transportation_zones SET ${updateFields.join(', ')} WHERE id = $${paramCount}`,
      values
    );
    
    // Check if shipping_points table exists
    const shippingPointsExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'shipping_points'
      );
    `);
    const hasShippingPoints = shippingPointsExists.rows[0]?.exists;
    
    // Fetch updated record with joins
    const fullRecord = await pool.query(hasShippingPoints ? `
      SELECT 
        tz.*,
        cc.code as company_code,
        cc.name as company_name,
        sp.code as shipping_point_code,
        sp.name as shipping_point_name
      FROM transportation_zones tz
      LEFT JOIN company_codes cc ON tz.company_code_id = cc.id
      LEFT JOIN shipping_points sp ON tz.shipping_point_id = sp.id
      WHERE tz.id = $1
    ` : `
      SELECT 
        tz.*,
        cc.code as company_code,
        cc.name as company_name,
        NULL as shipping_point_code,
        NULL as shipping_point_name
      FROM transportation_zones tz
      LEFT JOIN company_codes cc ON tz.company_code_id = cc.id
      WHERE tz.id = $1
    `, [id]);
    
    const fullRow = fullRecord.rows[0];
    
    res.json({
      id: fullRow.id,
      code: fullRow.code,
      name: fullRow.name,
      description: fullRow.description || '',
      region: fullRow.region || undefined,
      country: fullRow.country || undefined,
      zoneType: fullRow.zone_type || undefined,
      transitTime: fullRow.transit_time || undefined,
      shippingMultiplier: fullRow.shipping_multiplier ? parseFloat(fullRow.shipping_multiplier) : undefined,
      postalCodeFrom: fullRow.postal_code_from || undefined,
      postalCodeTo: fullRow.postal_code_to || undefined,
      companyCodeId: fullRow.company_code_id || undefined,
      companyCode: fullRow.company_code || undefined,
      companyName: fullRow.company_name || undefined,
      baseFreightRate: fullRow.base_freight_rate ? parseFloat(fullRow.base_freight_rate) : undefined,
      currency: fullRow.currency || undefined,
      transportationType: fullRow.transportation_type || undefined,
      distanceKm: fullRow.distance_km ? parseFloat(fullRow.distance_km) : undefined,
      shippingPointId: fullRow.shipping_point_id || undefined,
      shippingPointCode: fullRow.shipping_point_code || undefined,
      shippingPointName: fullRow.shipping_point_name || undefined,
      blockIndicator: fullRow.block_indicator || false,
      isActive: fullRow.is_active !== false,
      createdAt: fullRow.created_at,
      updatedAt: fullRow.updated_at,
    });
  } catch (error: any) {
    console.error("Error updating transportation zone:", error);
    if (error.code === '23505') {
      res.status(409).json({ message: "Transportation zone code already exists" });
    } else {
      res.status(500).json({ message: "Failed to update transportation zone" });
    }
  }
});

// DELETE /api/master-data/transportation-zones/:id - Delete transportation zone
router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    // Check if zone is referenced
    const references = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM routes_master WHERE departure_zone = tz.code OR destination_zone = tz.code) as route_count,
        (SELECT COUNT(*) FROM route_schedules WHERE transportation_zone_id = $1) as schedule_count
      FROM transportation_zones tz
      WHERE tz.id = $1
    `, [id]);
    
    if (references.rows[0] && (parseInt(references.rows[0].route_count) > 0 || parseInt(references.rows[0].schedule_count) > 0)) {
      return res.status(400).json({ 
        message: "Cannot delete transportation zone. It is referenced by routes or schedules." 
      });
    }
    
    const result = await pool.query(
      'DELETE FROM transportation_zones WHERE id = $1 RETURNING id',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Transportation zone not found" });
    }
    
    res.json({ message: "Transportation zone deleted successfully", id });
  } catch (error) {
    console.error("Error deleting transportation zone:", error);
    res.status(500).json({ message: "Failed to delete transportation zone" });
  }
});

export default router;

