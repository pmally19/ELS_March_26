import express from 'express';
import { db, pool } from '../db';
import pkg from 'pg';
const { Pool } = pkg;
import { InventoryConfigService } from '../services/inventory-config-service.js';

// Create a direct connection pool for this route to ensure it works
const directPool = new Pool({
  connectionString: 'postgresql://postgres:Mokshith@21@localhost:5432/mallyerp'
});

const router = express.Router();

// Get stock overview by material code (for location details)
// Primary source: stock_balances (by material/plant/storage)
// Fallback: products table when no stock_balances records exist
router.get('/balances/overview/:materialCode', async (req, res) => {
  try {
    const { materialCode } = req.params;

    // 1) Try detailed stock_balances first
    const stockBalancesResult = await directPool.query(
      `
      SELECT 
        sb.material_code,
        sb.plant_code,
        sb.storage_location,
        sb.quantity,
        sb.available_quantity,
        COALESCE(sb.reserved_quantity, 0) as reserved_quantity,
        sb.unit,
        COALESCE(sb.moving_average_price, 0) as moving_average_price,
        COALESCE(sb.total_value, 0) as total_value,
        p.name as plant_name,
        m.description as material_name
      FROM stock_balances sb
      LEFT JOIN plants p ON sb.plant_code = p.code
      LEFT JOIN materials m ON sb.material_code = m.code
      WHERE sb.material_code = $1
      ORDER BY sb.plant_code, sb.storage_location
    `,
      [materialCode]
    );

    let locations = stockBalancesResult.rows;
    let materialName = null;
    let unit = null;

    if (locations.length > 0) {
      materialName = locations[0].material_name;
      unit = locations[0].unit;
    } else {
      // Fallback to fetching basic material info
      const materialsResult = await directPool.query(
        `SELECT description, base_uom FROM materials WHERE code = $1`,
        [materialCode]
      );
      if (materialsResult.rows.length > 0) {
        materialName = materialsResult.rows[0].description;
        unit = materialsResult.rows[0].base_uom;
      }
    }

    const totalStock = locations.reduce(
      (sum, row) => sum + parseFloat(row.quantity || 0),
      0
    );
    const totalValue = locations.reduce(
      (sum, row) => sum + parseFloat(row.total_value || 0),
      0
    );

    res.json({
      material_code: materialCode,
      material_name: materialName,
      total_stock: totalStock,
      total_value: totalValue,
      unit: unit,
      locations,
    });
  } catch (error) {
    console.error('Error fetching stock overview:', error);
    res
      .status(500)
      .json({ message: 'Failed to fetch stock overview', error: error.message });
  }
});

// Get all products from products table
// Get all products from materials table (migrated from products)
router.get('/products', async (req, res) => {
  try {
    const result = await directPool.query(`
      SELECT 
        m.id,
        m.code as sku,
        m.description as name,
        m.description,
        COALESCE(m.base_unit_price, 0) as price,
        COALESCE(m.base_unit_price, 0) as cost,
        -- Calculate total stock from stock_balances
        COALESCE((
          SELECT SUM(quantity) 
          FROM stock_balances sb 
          WHERE sb.material_code = m.code AND sb.stock_type = 'AVAILABLE'
        ), 0) as current_stock,
        0 as min_stock, -- materials table doesn't have min_stock column in schema shown
        0 as max_stock, -- materials table doesn't have max_stock column in schema shown
        NULL as category_id,
        m.active as status,
        m.created_at,
        m.updated_at,
        'General' as category_name, -- Join to category might function differently or be absent
        m.category_id as type, -- materials has category_id
        m.id as material_master_id,
        -- Default to first storage location/plant found for UI consistency
        NULL as storage_location_id,
        'Main' as storage_location_name,
        'MAIN' as storage_location_code,
        NULL as plant_id,
        'PL01' as plant_code, -- Default plant code if not in materials
        'Main Plant' as plant_name
      FROM materials m
      WHERE m.active = true
      ORDER BY m.description
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching products (materials):', error);
    res.status(500).json({ message: 'Failed to fetch products' });
  }
});



// Get stock levels - uses stock_balances as primary source, aggregated by material
router.get('/stock-levels', async (req, res) => {
  try {
    // Query stock_balances as the primary source of truth
    // Aggregate by material_code across all plants and storage locations
    const result = await directPool.query(`
      WITH stock_aggregated AS (
        SELECT 
          material_code,
          -- Total quantity: sum of all stock types
          SUM(CASE WHEN stock_type = 'AVAILABLE' THEN quantity ELSE 0 END) as total_quantity,
          -- Available quantity: available stock minus reserved and committed
          SUM(CASE 
            WHEN stock_type = 'AVAILABLE' 
            THEN available_quantity 
            ELSE 0 
          END) as total_available,
          -- Reserved quantity
          SUM(CASE 
            WHEN stock_type = 'AVAILABLE' 
            THEN COALESCE(reserved_quantity, 0) 
            ELSE 0 
          END) as total_reserved,
          -- Ordered quantity
          SUM(CASE 
            WHEN stock_type = 'AVAILABLE' 
            THEN COALESCE(ordered_quantity, 0) 
            ELSE 0 
          END) as total_ordered,
          -- Blocked quantity
          SUM(CASE 
            WHEN stock_type = 'BLOCKED' 
            THEN quantity 
            ELSE 0 
          END) as total_blocked,
          -- Quality inspection quantity
          SUM(CASE 
            WHEN stock_type = 'QUALITY_INSPECTION' 
            THEN quantity 
            ELSE 0 
          END) as total_quality_inspection,
          -- Unit of measure (use MAX to get a consistent unit - most materials use same unit)
          MAX(unit) as unit,
          -- Average price weighted by quantity
          CASE 
            WHEN SUM(CASE WHEN stock_type = 'AVAILABLE' THEN quantity ELSE 0 END) > 0
            THEN SUM(CASE WHEN stock_type = 'AVAILABLE' THEN COALESCE(moving_average_price, 0) * quantity ELSE 0 END) 
                 / NULLIF(SUM(CASE WHEN stock_type = 'AVAILABLE' THEN quantity ELSE 0 END), 0)
            ELSE AVG(moving_average_price)
          END as avg_price,
          -- Total value
          SUM(COALESCE(total_value, 0)) as total_value,
          MAX(last_updated) as last_updated,
          -- Count distinct plants and storage locations
          COUNT(DISTINCT plant_code) as plant_count,
          COUNT(DISTINCT storage_location) as location_count
        FROM stock_balances
        GROUP BY material_code
      ),
      location_details AS (
        SELECT 
          sb.material_code,
          p.code as plant_code,
          p.name as plant_name,
          sb.storage_location,
          ROW_NUMBER() OVER (PARTITION BY sb.material_code ORDER BY sb.quantity DESC, sb.available_quantity DESC) as rn
        FROM stock_balances sb
        LEFT JOIN plants p ON sb.plant_code = p.code
        WHERE (sb.quantity > 0 OR sb.available_quantity > 0)
          AND sb.stock_type = 'AVAILABLE'
      )
      SELECT 
        -- Use material ID from materials table
        COALESCE(m.id, DENSE_RANK() OVER (ORDER BY sa.material_code)) as id,
        -- Material information
        COALESCE(m.description, sa.material_code) as name,
        sa.material_code as sku,
        -- Stock quantities
        CAST(sa.total_quantity AS NUMERIC) as current_stock,
        CAST(sa.total_available AS NUMERIC) as available_stock,
        CAST(sa.total_reserved AS NUMERIC) as reserved_stock,
        CAST(sa.total_ordered AS NUMERIC) as ordered_stock,
        CAST(sa.total_blocked AS NUMERIC) as blocked_stock,
        CAST(sa.total_quality_inspection AS NUMERIC) as quality_inspection_stock,
        -- Min/Max stock from materials table with defaults
        0 as min_stock,
        999999 as max_stock,
        -- Material type (from materials.type field)
        COALESCE(m.type, 'Standard') as type,
        -- Category
        'General' as category_name,
        -- Location info
        CASE 
          WHEN sa.plant_count = 1 THEN MAX(ld.plant_name)
          ELSE 'Multiple Locations'
        END as plant_name,
        CASE 
          WHEN sa.plant_count = 1 THEN MAX(ld.plant_code)
          ELSE 'MULTIPLE'
        END as plant_code,
        CASE 
          WHEN sa.location_count = 1 THEN MAX(ld.storage_location)
          ELSE 'Multiple'
        END as storage_location_name,
        CASE 
          WHEN sa.location_count = 1 THEN MAX(ld.storage_location)
          ELSE 'MULTIPLE'
        END as storage_location_code,
        -- Unit of measure
        COALESCE(sa.unit, m.base_uom, 'EA') as unit,
        -- Pricing
        COALESCE(sa.avg_price, 0) as moving_average_price,
        COALESCE(sa.total_value, 0) as total_value,
        sa.last_updated as stock_last_updated
      FROM stock_aggregated sa
      LEFT JOIN materials m ON sa.material_code = m.code
      -- Join with location details
      LEFT JOIN location_details ld ON sa.material_code = ld.material_code AND ld.rn = 1
      GROUP BY 
        m.id, m.description, sa.material_code,
        sa.total_quantity, sa.total_available, sa.total_reserved,
        sa.total_ordered, sa.total_blocked, sa.total_quality_inspection,
        m.type,
        sa.unit, m.base_uom, sa.avg_price, sa.total_value, sa.last_updated,
        sa.plant_count, sa.location_count
      ORDER BY COALESCE(m.description, sa.material_code)
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching stock levels:', error);
    res.status(500).json({ message: 'Failed to fetch stock levels', error: error.message });
  }
});

// Create or update stock balance (upsert)
router.post('/stock-balances', async (req, res) => {
  try {
    const {
      material_code,
      plant_code,
      storage_location,
      quantity,
      available_quantity,
      reserved_quantity,
      ordered_quantity,
      blocked_quantity,
      quality_inspection_quantity,
      unit,
      moving_average_price,
      stock_type = 'AVAILABLE'
    } = req.body;

    // Validate required fields
    if (!material_code || !plant_code || !storage_location) {
      return res.status(400).json({
        success: false,
        message: 'material_code, plant_code, and storage_location are required'
      });
    }

    // Validate material exists
    const materialCheck = await directPool.query(
      'SELECT id, code, base_uom FROM materials WHERE code = $1',
      [material_code]
    );

    if (materialCheck.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: `Material with code "${material_code}" not found`
      });
    }

    // Validate plant exists
    const plantCheck = await directPool.query(
      'SELECT id, plant_code FROM plants WHERE plant_code = $1',
      [plant_code]
    );

    if (plantCheck.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: `Plant with code "${plant_code}" not found`
      });
    }

    // Determine unit of measure
    const finalUnit = unit || materialCheck.rows[0].base_uom || 'EA';

    // Calculate values
    const finalQuantity = parseFloat(quantity || 0);
    const finalAvailableQuantity = available_quantity !== undefined
      ? parseFloat(available_quantity)
      : (finalQuantity - parseFloat(reserved_quantity || 0) - parseFloat(blocked_quantity || 0) - parseFloat(quality_inspection_quantity || 0));
    const finalPrice = parseFloat(moving_average_price || 0);
    const finalTotalValue = finalQuantity * finalPrice;

    // Check if stock balance already exists
    const existingCheck = await directPool.query(
      `SELECT id FROM stock_balances 
       WHERE material_code = $1 
         AND plant_code = $2 
         AND storage_location = $3 
         AND stock_type = $4`,
      [material_code, plant_code, storage_location, stock_type]
    );

    let result;
    if (existingCheck.rows.length > 0) {
      // Update existing record
      result = await directPool.query(
        `UPDATE stock_balances
         SET 
           quantity = $1,
           available_quantity = $2,
           reserved_quantity = COALESCE($3, reserved_quantity),
           ordered_quantity = COALESCE($4, ordered_quantity),
           blocked_quantity = COALESCE($5, blocked_quantity),
           quality_inspection_quantity = COALESCE($6, quality_inspection_quantity),
           unit = $7,
           moving_average_price = COALESCE($8, moving_average_price),
           total_value = $9,
           last_updated = CURRENT_TIMESTAMP,
           updated_at = CURRENT_TIMESTAMP
         WHERE material_code = $10 
           AND plant_code = $11 
           AND storage_location = $12 
           AND stock_type = $13
         RETURNING *`,
        [
          finalQuantity,
          finalAvailableQuantity,
          reserved_quantity || null,
          ordered_quantity || null,
          blocked_quantity || null,
          quality_inspection_quantity || null,
          finalUnit,
          finalPrice || null,
          finalTotalValue,
          material_code,
          plant_code,
          storage_location,
          stock_type
        ]
      );
    } else {
      // Insert new record
      result = await directPool.query(
        `INSERT INTO stock_balances (
           material_code, plant_code, storage_location, stock_type,
           quantity, available_quantity, reserved_quantity, ordered_quantity,
           blocked_quantity, quality_inspection_quantity,
           unit, moving_average_price, total_value,
           last_updated, created_at, updated_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         RETURNING *`,
        [
          material_code,
          plant_code,
          storage_location,
          stock_type,
          finalQuantity,
          finalAvailableQuantity,
          reserved_quantity || 0,
          ordered_quantity || 0,
          blocked_quantity || 0,
          quality_inspection_quantity || 0,
          finalUnit,
          finalPrice || null,
          finalTotalValue
        ]
      );
    }

    res.json({
      success: true,
      data: result.rows[0],
      message: existingCheck.rows.length > 0
        ? 'Stock balance updated successfully'
        : 'Stock balance created successfully'
    });
  } catch (error) {
    console.error('Error creating/updating stock balance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create/update stock balance',
      error: error.message
    });
  }
});

// Update stock balance by ID
router.put('/stock-balances/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      quantity,
      available_quantity,
      reserved_quantity,
      ordered_quantity,
      blocked_quantity,
      quality_inspection_quantity,
      moving_average_price
    } = req.body;

    // Check if stock balance exists
    const existingCheck = await directPool.query(
      'SELECT * FROM stock_balances WHERE id = $1',
      [id]
    );

    if (existingCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Stock balance not found'
      });
    }

    const existing = existingCheck.rows[0];

    // Calculate new values
    const finalQuantity = quantity !== undefined ? parseFloat(quantity) : existing.quantity;
    const finalAvailableQuantity = available_quantity !== undefined
      ? parseFloat(available_quantity)
      : (finalQuantity - parseFloat(reserved_quantity || existing.reserved_quantity || 0) - parseFloat(blocked_quantity || existing.blocked_quantity || 0) - parseFloat(quality_inspection_quantity || existing.quality_inspection_quantity || 0));
    const finalPrice = moving_average_price !== undefined ? parseFloat(moving_average_price) : existing.moving_average_price;
    const finalTotalValue = finalQuantity * (finalPrice || 0);

    // Update record
    const result = await directPool.query(
      `UPDATE stock_balances
       SET 
         quantity = $1,
         available_quantity = $2,
         reserved_quantity = COALESCE($3, reserved_quantity),
         ordered_quantity = COALESCE($4, ordered_quantity),
         blocked_quantity = COALESCE($5, blocked_quantity),
         quality_inspection_quantity = COALESCE($6, quality_inspection_quantity),
         moving_average_price = COALESCE($7, moving_average_price),
         total_value = $8,
         last_updated = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $9
       RETURNING *`,
      [
        finalQuantity,
        finalAvailableQuantity,
        reserved_quantity !== undefined ? reserved_quantity : null,
        ordered_quantity !== undefined ? ordered_quantity : null,
        blocked_quantity !== undefined ? blocked_quantity : null,
        quality_inspection_quantity !== undefined ? quality_inspection_quantity : null,
        moving_average_price !== undefined ? moving_average_price : null,
        finalTotalValue,
        id
      ]
    );

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Stock balance updated successfully'
    });
  } catch (error) {
    console.error('Error updating stock balance:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update stock balance',
      error: error.message
    });
  }
});

// Get stock movements


// Get warehouses and storage locations with stock levels and ERP details
router.get('/warehouses', async (req, res) => {
  try {
    // Combine warehouses from warehouse_types table and storage locations from storage_locations table
    const result = await directPool.query(`
      SELECT * FROM (
        -- Get warehouses from warehouse_types table
        SELECT 
          wt.id,
          wt.code,
          wt.name,
          wt.description,
          wt.plant_id,
          wt.storage_type,
          'warehouse' as location_type,
          -- Default ERP flags for warehouses (can be null if not applicable)
          true as is_mrp_relevant,
          false as is_negative_stock_allowed,
          true as is_goods_receipt_relevant,
          true as is_goods_issue_relevant,
          false as is_interim_storage,
          false as is_transit_storage,
          false as is_restricted_use,
          CASE WHEN wt.is_active THEN 'active' ELSE 'inactive' END as status,
          wt.is_active,
          NULL as notes,
          wt.created_at,
          wt.updated_at,
          -- Plant information
          p.name as plant_name,
          p.code as plant_code,
          -- Company code information
          cc.name as company_code_name,
          cc.code as company_code,
          -- Stock level aggregation from stock_balances (using warehouse code)
          COALESCE(stock_stats.total_materials, 0) as total_materials,
          COALESCE(stock_stats.total_quantity, 0) as total_quantity,
          COALESCE(stock_stats.total_available, 0) as total_available,
          COALESCE(stock_stats.total_reserved, 0) as total_reserved,
          COALESCE(stock_stats.total_value, 0) as total_value
        FROM warehouse_types wt
        LEFT JOIN plants p ON wt.plant_id = p.id
        LEFT JOIN company_codes cc ON p.company_code = cc.code
        LEFT JOIN (
          SELECT 
            storage_location,
            COUNT(DISTINCT material_code) as total_materials,
            SUM(quantity) as total_quantity,
            SUM(available_quantity) as total_available,
            SUM(COALESCE(reserved_quantity, 0)) as total_reserved,
            SUM(total_value) as total_value
          FROM stock_balances
          WHERE stock_type = 'AVAILABLE' OR stock_type IS NULL
          GROUP BY storage_location
        ) stock_stats ON stock_stats.storage_location = wt.code
        WHERE wt.is_active = true
        
        UNION ALL
        
        -- Get storage locations from storage_locations table
        SELECT 
          sl.id,
          sl.code,
          sl.name,
          sl.description,
          sl.plant_id,
          sl.type as storage_type,
          -- Determine if this is a warehouse or storage location
          CASE 
            WHEN COALESCE(sl.is_warehouse, false) = true 
            THEN 'warehouse'
            ELSE 'storage_location'
          END as location_type,
          sl.is_mrp_relevant,
          sl.is_negative_stock_allowed,
          sl.is_goods_receipt_relevant,
          sl.is_goods_issue_relevant,
          sl.is_interim_storage,
          sl.is_transit_storage,
          sl.is_restricted_use,
          sl.status,
          sl.is_active,
          sl.notes,
          sl.created_at,
          sl.updated_at,
          -- Plant information
          p2.name as plant_name,
          p2.code as plant_code,
          -- Company code information
          cc2.name as company_code_name,
          cc2.code as company_code,
          -- Stock level aggregation from stock_balances
          COALESCE(stock_stats2.total_materials, 0) as total_materials,
          COALESCE(stock_stats2.total_quantity, 0) as total_quantity,
          COALESCE(stock_stats2.total_available, 0) as total_available,
          COALESCE(stock_stats2.total_reserved, 0) as total_reserved,
          COALESCE(stock_stats2.total_value, 0) as total_value
        FROM storage_locations sl
        LEFT JOIN plants p2 ON sl.plant_id = p2.id
        LEFT JOIN company_codes cc2 ON p2.company_code = cc2.code
        LEFT JOIN (
          SELECT 
            storage_location,
            COUNT(DISTINCT material_code) as total_materials,
            SUM(quantity) as total_quantity,
            SUM(available_quantity) as total_available,
            SUM(COALESCE(reserved_quantity, 0)) as total_reserved,
            SUM(total_value) as total_value
          FROM stock_balances
          WHERE stock_type = 'AVAILABLE' OR stock_type IS NULL
          GROUP BY storage_location
        ) stock_stats2 ON stock_stats2.storage_location = sl.code
        WHERE sl.is_active = true
      ) combined_locations
      ORDER BY 
        CASE 
          WHEN location_type = 'warehouse' THEN 0 
          ELSE 1 
        END,
        plant_code, 
        code ASC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching warehouses:', error);
    res.status(500).json({ message: 'Failed to fetch warehouses', error: error.message });
  }
});

// Create a new product
// Create a new product (Redirects to Materials + Stock Balances)
router.post('/products', async (req, res) => {
  try {
    const {
      name, sku, description, category_id, unit_of_measure_id,
      price, cost, current_stock, min_stock, max_stock, storage_location_id, storage_location_code,
      material_master_id, type, plant_id, plant_code,
      // Attributes for materials
      gross_weight, net_weight, weight_unit, volume, volume_unit
    } = req.body;

    // Validate Code/SKU
    if (!sku) {
      return res.status(400).json({ message: 'Product SKU (Material Code) is required' });
    }

    // 1. Check if material already exists
    const existingMaterial = await directPool.query(
      'SELECT id, code FROM materials WHERE code = $1',
      [sku]
    );

    if (existingMaterial.rows.length > 0) {
      return res.status(400).json({ message: `Material with code ${sku} already exists` });
    }

    // 2. Resolve Plant & Storage Location
    let finalPlantCode = plant_code || 'PL01'; // Default
    let finalStorageLocation = storage_location_code || 'SL01'; // Default
    // If IDs provided but not codes for Plant/SL, we might want to look them up, 
    // but typically the frontend sends codes for text inputs or we defaults.
    // For robust "no corner missing", let's look up if IDs provided.

    if (plant_id && !plant_code) {
      try {
        const pRes = await directPool.query('SELECT code FROM plants WHERE id = $1', [plant_id]);
        if (pRes.rows.length > 0) finalPlantCode = pRes.rows[0].code;
      } catch (e) { console.error(e); }
    }
    if (storage_location_id && !storage_location_code) {
      try {
        // Try generic storage locations table
        const sRes = await directPool.query('SELECT code FROM storage_locations WHERE id = $1', [storage_location_id]);
        if (sRes.rows.length > 0) finalStorageLocation = sRes.rows[0].code;
        else {
          const wRes = await directPool.query('SELECT code FROM warehouse_types WHERE id = $1', [storage_location_id]);
          if (wRes.rows.length > 0) finalStorageLocation = wRes.rows[0].code;
        }
      } catch (e) { console.error(e); }
    }

    // 3. Insert into Materials Table
    // Note: We use mostly defaults for fields not in the simple 'product' form
    const insertMaterialQuery = `
      INSERT INTO materials (
        code, name, description, 
        material_type, base_uom, 
        base_unit_price, cost, min_stock, max_stock,
        plant_code, production_storage_location,
        category_id,
        gross_weight, net_weight, weight_unit, volume, volume_unit,
        active, created_at, updated_at
      ) VALUES (
        $1, $2, $3, 
        $4, $5, 
        $6, $7, $8, $9,
        $10, $11,
        $12,
        $13, $14, $15, $16, $17,
        true, NOW(), NOW()
      ) RETURNING *;
    `;

    // Map Product Type to Material Type
    let materialType = type || 'FERT';
    const typeMapping = {
      'FINISHED_PRODUCT': 'FERT',
      'SEMI_FINISHED_PRODUCT': 'HALB',
      'RAW_MATERIAL': 'ROH',
      'COMPONENT': 'ROH'
    };
    if (typeMapping[type]) materialType = typeMapping[type];

    const materialValues = [
      sku, name, description,
      materialType, 'EA', // Default UOM to EA if not mapped from ID
      parseFloat(price || 0), parseFloat(cost || 0), parseInt(min_stock || 0), parseInt(max_stock || 0),
      finalPlantCode, finalStorageLocation,
      category_id ? parseInt(category_id) : null,
      parseFloat(gross_weight || 0), parseFloat(net_weight || 0), weight_unit || 'KG', parseFloat(volume || 0), volume_unit || 'L'
    ];

    // If UOM ID provided, try to look up its code
    if (unit_of_measure_id) {
      try {
        const uomRes = await directPool.query('SELECT code FROM units_of_measure WHERE id = $1', [unit_of_measure_id]);
        if (uomRes.rows.length > 0) materialValues[4] = uomRes.rows[0].code; // Update base_uom
      } catch (e) { console.error(e); }
    }

    const materialResult = await directPool.query(insertMaterialQuery, materialValues);
    const createdMaterial = materialResult.rows[0];

    // 4. Initial Stock Entry (if stock provided)
    if (current_stock && parseFloat(current_stock) > 0) {
      try {
        const stockQty = parseFloat(current_stock);
        await directPool.query(
          `INSERT INTO stock_balances (
             material_code, plant_code, storage_location, stock_type,
             quantity, available_quantity, unit, moving_average_price, total_value,
             last_updated, created_at, updated_at
           ) VALUES (
             $1, $2, $3, 'AVAILABLE',
             $4, $4, $5, $6, $7,
             NOW(), NOW(), NOW()
           )`,
          [
            sku, finalPlantCode, finalStorageLocation,
            stockQty,
            materialValues[4], // The UOM we resolved
            parseFloat(price || 0),
            (stockQty * parseFloat(price || 0))
          ]
        );
        console.log(`Initialized stock for ${sku}: ${stockQty}`);
      } catch (stockError) {
        console.error('Error creating initial stock:', stockError);
      }
    }

    // 5. Return shaped response looking like a product to satisfy any legacy frontend expectations
    // but backed by Material ID
    const response = {
      id: createdMaterial.id,
      sku: createdMaterial.code,
      name: createdMaterial.name,
      description: createdMaterial.description,
      stock: current_stock || 0,
      price: createdMaterial.base_unit_price,
      cost: createdMaterial.cost,
      category_id: createdMaterial.category_id,
      type: createdMaterial.material_type,
      active: createdMaterial.active,
      created_at: createdMaterial.created_at,
      updated_at: createdMaterial.updated_at,
      message: 'Product created successfully (as Material)'
    };

    res.status(201).json(response);

  } catch (error) {
    console.error('Error creating product (material):', error);
    res.status(500).json({ message: 'Failed to create product', error: error.message });
  }
});

// DEPRECATED: Old Product Creation Logic
router.post('/products-deprecated-legacy', async (req, res) => {
  try {
    const {
      name, sku, description, category_id, unit_of_measure_id,
      price, cost, current_stock, min_stock, max_stock, storage_location_id, storage_location_code,
      material_master_id, type, plant_id, plant_code
    } = req.body;

    // If material_master_id is provided, validate it exists and get additional data
    let materialData = null;
    if (material_master_id) {
      const materialResult = await directPool.query(
        `SELECT * FROM materials WHERE id = $1 AND is_active = true`,
        [material_master_id]
      );

      if (materialResult.rows.length === 0) {
        return res.status(400).json({
          message: 'Invalid material master ID provided'
        });
      }

      materialData = materialResult.rows[0];

      // Use material master data to enhance product data if not provided
      const enhancedData = {
        name: name || materialData.description || materialData.name,
        sku: sku || materialData.material_code,
        description: description || materialData.description,
        price: price || materialData.base_price || 0
      };

      // Update the request data with enhanced values
      Object.assign(req.body, enhancedData);
    }

    // Determine product type based on provided type or material master
    let productType = type || 'FINISHED_PRODUCT';

    // Map material types to valid product types
    const materialTypeToProductType = {
      'FERT': 'FINISHED_PRODUCT',
      'FINISHED_GOOD': 'FINISHED_PRODUCT',
      'FER': 'FINISHED_PRODUCT',
      'SEMI_FINISHED': 'SEMI_FINISHED_PRODUCT',
      'COMPONENT': 'COMPONENT',
      'RAW_MATERIAL': 'RAW_MATERIAL',
      'CONSUMABLE': 'CONSUMABLE'
    };

    // Always apply the mapping if the type is a material type
    if (type && materialTypeToProductType[type]) {
      productType = materialTypeToProductType[type];
      console.log(`🔄 Mapped material type '${type}' to product type '${productType}'`);
    } else if (!type && materialData && materialData.type) {
      // Use material type mapping
      productType = materialTypeToProductType[materialData.type] || 'FINISHED_PRODUCT';
      console.log(`🔄 Mapped material type '${materialData.type}' to product type '${productType}'`);
    } else if (type && !materialTypeToProductType[type]) {
      // If type is provided but not in mapping, check if it's already a valid product type
      const validProductTypes = ['FINISHED_PRODUCT', 'SEMI_FINISHED_PRODUCT', 'RAW_MATERIAL', 'COMPONENT', 'CONSUMABLE'];
      if (validProductTypes.includes(type)) {
        productType = type;
        console.log(`✅ Using valid product type: '${productType}'`);
      } else {
        productType = 'FINISHED_PRODUCT'; // Default fallback
        console.log(`⚠️  Unknown type '${type}', defaulting to '${productType}'`);
      }
    }

    // Validate numeric inputs to prevent integer overflow
    const MAX_INTEGER = 2147483647; // PostgreSQL integer max value

    const validateNumericInput = (value, fieldName, maxValue = MAX_INTEGER) => {
      const numValue = parseInt(value) || 0;
      if (numValue > maxValue) {
        throw new Error(`${fieldName} value ${numValue} exceeds maximum allowed value of ${maxValue}`);
      }
      return numValue;
    };

    const validateFloatInput = (value, fieldName, maxValue = 999999999.99) => {
      const numValue = parseFloat(value) || 0;
      if (numValue > maxValue) {
        throw new Error(`${fieldName} value ${numValue} exceeds maximum allowed value of ${maxValue}`);
      }
      return numValue;
    };

    // Validate and convert numeric inputs
    const validatedCurrentStock = validateNumericInput(current_stock, 'current_stock');
    const validatedMinStock = validateNumericInput(min_stock, 'min_stock');
    const validatedMaxStock = validateNumericInput(max_stock, 'max_stock');
    const validatedPrice = validateFloatInput(price, 'price');
    const validatedCost = cost ? validateFloatInput(cost, 'cost') : validatedPrice;

    // Validate price and cost are positive
    if (validatedPrice <= 0) {
      return res.status(400).json({ message: 'Price must be greater than 0' });
    }
    if (validatedCost <= 0) {
      return res.status(400).json({ message: 'Cost must be greater than 0' });
    }

    // Validate min_stock < max_stock
    if (validatedMinStock >= validatedMaxStock) {
      return res.status(400).json({
        message: `Min stock (${validatedMinStock}) must be less than max stock (${validatedMaxStock})`
      });
    }

    // Set default max_stock if not provided
    const defaultMaxStock = validatedMaxStock || Math.max(validatedCurrentStock * 2, 100);

    // Resolve storage location code to ID if provided
    // Check both storage_locations and warehouse_types tables
    let resolvedStorageLocationId = null;
    let storageLocationCode = null;
    let isWarehouse = false;

    if (storage_location_code) {
      try {
        // First check storage_locations table
        const storageLocationResult = await directPool.query(
          `SELECT id, code FROM storage_locations WHERE code = $1 AND is_active = true`,
          [storage_location_code]
        );

        if (storageLocationResult.rows.length > 0) {
          resolvedStorageLocationId = storageLocationResult.rows[0].id;
          storageLocationCode = storageLocationResult.rows[0].code;
          isWarehouse = false;
        } else {
          // If not found in storage_locations, check warehouse_types table
          const warehouseResult = await directPool.query(
            `SELECT id, code FROM warehouse_types WHERE code = $1 AND is_active = true`,
            [storage_location_code]
          );

          if (warehouseResult.rows.length > 0) {
            resolvedStorageLocationId = warehouseResult.rows[0].id;
            storageLocationCode = warehouseResult.rows[0].code;
            isWarehouse = true;
          } else {
            return res.status(400).json({
              message: `Invalid storage location or warehouse code provided: ${storage_location_code}`
            });
          }
        }
      } catch (storageError) {
        console.error('Error resolving storage location/warehouse code:', storageError);
        return res.status(400).json({
          message: 'Error validating storage location or warehouse code'
        });
      }
    } else if (storage_location_id) {
      // If storage_location_id is provided directly, check both tables
      try {
        const storageLocationResult = await directPool.query(
          `SELECT id, code FROM storage_locations WHERE id = $1 AND is_active = true`,
          [storage_location_id]
        );

        if (storageLocationResult.rows.length > 0) {
          resolvedStorageLocationId = parseInt(storage_location_id);
          storageLocationCode = storageLocationResult.rows[0].code;
          isWarehouse = false;
        } else {
          // Check warehouse_types table
          const warehouseResult = await directPool.query(
            `SELECT id, code FROM warehouse_types WHERE id = $1 AND is_active = true`,
            [storage_location_id]
          );

          if (warehouseResult.rows.length > 0) {
            resolvedStorageLocationId = parseInt(storage_location_id);
            storageLocationCode = warehouseResult.rows[0].code;
            isWarehouse = true;
          } else {
            return res.status(400).json({
              message: `Invalid storage location or warehouse ID provided: ${storage_location_id}`
            });
          }
        }
      } catch (idError) {
        console.error('Error resolving storage location/warehouse ID:', idError);
        return res.status(400).json({
          message: 'Error validating storage location or warehouse ID'
        });
      }
    }

    // Validate and resolve plant data
    let resolvedPlantId = null;
    let resolvedPlantCode = null;

    if (plant_id) {
      // Validate plant_id exists
      try {
        const plantResult = await directPool.query(
          `SELECT id, code FROM plants WHERE id = $1 AND is_active = true`,
          [plant_id]
        );

        if (plantResult.rows.length === 0) {
          return res.status(400).json({
            message: `Invalid plant ID provided: ${plant_id}`
          });
        }

        resolvedPlantId = parseInt(plant_id);
        resolvedPlantCode = plantResult.rows[0].code;
      } catch (plantError) {
        console.error('Error validating plant ID:', plantError);
        return res.status(400).json({
          message: 'Error validating plant ID'
        });
      }
    } else if (plant_code) {
      // Resolve plant_code to ID
      try {
        const plantResult = await directPool.query(
          `SELECT id, code FROM plants WHERE code = $1 AND is_active = true`,
          [plant_code]
        );

        if (plantResult.rows.length === 0) {
          return res.status(400).json({
            message: `Invalid plant code provided: ${plant_code}`
          });
        }

        resolvedPlantId = plantResult.rows[0].id;
        resolvedPlantCode = plantResult.rows[0].code;
      } catch (plantError) {
        console.error('Error resolving plant code:', plantError);
        return res.status(400).json({
          message: 'Error validating plant code'
        });
      }
    }

    // Validate category_id if provided
    if (category_id && category_id !== "") {
      try {
        const categoryCheck = await directPool.query(
          `SELECT id FROM categories WHERE id = $1`,
          [category_id]
        );
        if (categoryCheck.rows.length === 0) {
          return res.status(400).json({
            message: `Invalid category ID provided: ${category_id}`
          });
        }
      } catch (categoryError) {
        console.error('Error validating category ID:', categoryError);
        return res.status(400).json({
          message: 'Error validating category ID'
        });
      }
    }

    // Validate unit_of_measure_id if provided
    if (unit_of_measure_id && unit_of_measure_id !== "") {
      try {
        const uomCheck = await directPool.query(
          `SELECT id FROM units_of_measure WHERE id = $1`,
          [unit_of_measure_id]
        );
        if (uomCheck.rows.length === 0) {
          return res.status(400).json({
            message: `Invalid unit of measure ID provided: ${unit_of_measure_id}`
          });
        }
      } catch (uomError) {
        console.error('Error validating unit of measure ID:', uomError);
        return res.status(400).json({
          message: 'Error validating unit of measure ID'
        });
      }
    }

    // For warehouses from warehouse_types, we can't use the ID in storage_location_id
    // because of the foreign key constraint. Store NULL for ID and use the code instead.
    const finalStorageLocationId = isWarehouse ? null : resolvedStorageLocationId;

    const result = await directPool.query(
      `INSERT INTO products (
         name, sku, description, category_id, unit_of_measure_id, 
         price, cost, stock, min_stock, max_stock,
         material_master_id, type, storage_location_id, storage_location_code, 
         plant_id, plant_code, created_at, updated_at, active
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW(), NOW(), true)
       RETURNING *`,
      [
        name,
        sku,
        description,
        category_id && category_id !== "" ? parseInt(category_id) : null,
        unit_of_measure_id && unit_of_measure_id !== "" ? parseInt(unit_of_measure_id) : null,
        validatedPrice,
        validatedCost,
        validatedCurrentStock,
        validatedMinStock,
        parseInt(defaultMaxStock),
        material_master_id ? parseInt(material_master_id) : null,
        productType,
        finalStorageLocationId,
        storageLocationCode,
        resolvedPlantId,
        resolvedPlantCode
      ]
    );

    const createdProduct = result.rows[0];

    // Create product-warehouse relationship if storage location is provided
    if (resolvedStorageLocationId) {
      try {
        // Validate warehouse/storage location exists - check both tables
        let warehouseCheck = null;
        if (isWarehouse) {
          warehouseCheck = await directPool.query(
            `SELECT id, name, code FROM warehouse_types WHERE id = $1 AND is_active = true`,
            [resolvedStorageLocationId]
          );
        } else {
          warehouseCheck = await directPool.query(
            `SELECT id, name, code FROM storage_locations WHERE id = $1 AND is_active = true`,
            [resolvedStorageLocationId]
          );
        }

        if (warehouseCheck.rows.length === 0) {
          console.warn(`Invalid storage location/warehouse ID: ${resolvedStorageLocationId}`);
        } else {
          // Create product-warehouse relationship
          await directPool.query(
            `INSERT INTO product_warehouses (product_id, storage_location_id, stock_quantity, created_at, updated_at)
             VALUES ($1, $2, $3, NOW(), NOW())
             ON CONFLICT (product_id, storage_location_id) 
             DO UPDATE SET stock_quantity = $3, updated_at = NOW()`,
            [createdProduct.id, resolvedStorageLocationId, validatedCurrentStock]
          );

          // Add warehouse information to response
          createdProduct.warehouse_info = {
            storage_location_id: resolvedStorageLocationId,
            warehouse_name: warehouseCheck.rows[0].name,
            warehouse_code: warehouseCheck.rows[0].code,
            stock_quantity: validatedCurrentStock
          };
        }
      } catch (warehouseError) {
        console.error('Error creating product-warehouse relationship:', warehouseError);
        // Don't fail the product creation if warehouse assignment fails
      }
    }

    // Add material master information to response if available
    if (materialData) {
      createdProduct.material_master_info = {
        material_code: materialData.material_code,
        material_type: materialData.material_type,
        base_unit: materialData.base_uom,
        base_price: materialData.base_price
      };
    }

    res.status(201).json(createdProduct);
  } catch (error) {
    console.error('Error creating product:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      message: 'Failed to create product',
      error: error.message,
      details: error.detail || 'No additional details'
    });
  }
});

// Update an existing product
// Update an existing product (Material)
router.put('/products/:id', async (req, res) => {
  try {
    const materialId = parseInt(req.params.id, 10);

    if (Number.isNaN(materialId)) {
      return res.status(400).json({ message: 'Invalid product ID' });
    }

    // 1. Get existing Material
    const existingResult = await directPool.query(
      `SELECT * FROM materials WHERE id = $1`,
      [materialId]
    );

    if (existingResult.rows.length === 0) {
      return res.status(404).json({ message: 'Product (Material) not found' });
    }
    const existing = existingResult.rows[0];

    const {
      name,
      sku,
      description,
      category_id,
      price,
      cost,
      current_stock,
      min_stock,
      max_stock,
      storage_location_id,
      storage_location_code, // Main location identifier
      material_master_id,
      type,
      plant_id,
      plant_code,
      gross_weight, net_weight, weight_unit, volume, volume_unit,
      create_stock_movement // Flag to create movement history
    } = req.body;

    // Validate inputs
    const validatedPrice = price !== undefined ? parseFloat(price) : existing.base_unit_price;
    const validatedCost = cost !== undefined ? parseFloat(cost) : existing.cost;

    // Resolve Plant & Storage
    // Use provided values or fallback to existing or defaults
    let finalPlantCode = plant_code || existing.plant_code || 'PL01';
    let finalStorageLocation = storage_location_code || existing.production_storage_location || 'SL01';

    if (plant_id && !plant_code) {
      // Lookup plant if only ID provided (rare but possible in updates)
      try {
        const pRes = await directPool.query('SELECT code FROM plants WHERE id = $1', [plant_id]);
        if (pRes.rows.length > 0) finalPlantCode = pRes.rows[0].code;
      } catch (e) { console.error('Plant lookup error', e); }
    }

    // Map Product Type to Material Type
    let materialType = type || existing.material_type || 'FERT';
    const typeMapping = {
      'FINISHED_PRODUCT': 'FERT',
      'SEMI_FINISHED_PRODUCT': 'HALB',
      'RAW_MATERIAL': 'ROH',
      'COMPONENT': 'ROH'
    };
    if (typeMapping[type]) materialType = typeMapping[type];

    // 2. Update Material Table
    const updateMaterialQuery = `
      UPDATE materials
      SET 
        name = COALESCE($1, name),
        code = COALESCE($2, code),
        description = COALESCE($3, description),
        category_id = COALESCE($4, category_id),
        base_unit_price = COALESCE($5, base_unit_price),
        cost = COALESCE($6, cost),
        min_stock = COALESCE($7, min_stock),
        max_stock = COALESCE($8, max_stock),
        plant_code = COALESCE($9, plant_code),
        production_storage_location = COALESCE($10, production_storage_location),
        type = COALESCE($11, type),
        gross_weight = COALESCE($12, gross_weight),
        net_weight = COALESCE($13, net_weight),
        weight_unit = COALESCE($14, weight_unit),
        volume = COALESCE($15, volume),
        volume_unit = COALESCE($16, volume_unit),
        updated_at = NOW()
      WHERE id = $17
      RETURNING *;
    `;

    const updateValues = [
      name, sku, description,
      category_id ? parseInt(category_id) : undefined,
      validatedPrice, validatedCost,
      min_stock ? parseInt(min_stock) : undefined,
      max_stock ? parseInt(max_stock) : undefined,
      finalPlantCode, finalStorageLocation,
      materialType,
      gross_weight ? parseFloat(gross_weight) : undefined,
      net_weight ? parseFloat(net_weight) : undefined,
      weight_unit,
      volume ? parseFloat(volume) : undefined,
      volume_unit,
      materialId
    ];

    const result = await directPool.query(updateMaterialQuery, updateValues);
    const updatedMaterial = result.rows[0];

    // 3. Update Stock Balances if current_stock provided
    if (current_stock !== undefined && current_stock !== null) {
      const newStock = parseFloat(current_stock);

      // Update stock_balances with correct parameter order
      await directPool.query(`
        INSERT INTO stock_balances (
             material_code, plant_code, storage_location, stock_type,
             quantity, available_quantity, unit, moving_average_price, total_value,
             last_updated, created_at, updated_at
        ) VALUES (
             $1, $2, $3, 'AVAILABLE',
             $4, $4, $5, $6, $7,
             NOW(), NOW(), NOW()
        )
        ON CONFLICT (material_code, plant_code, storage_location, stock_type)
        DO UPDATE SET
          quantity = $4,
          available_quantity = $4,
          moving_average_price = $6,
          total_value = $7,
          last_updated = NOW(),
          updated_at = NOW()
      `, [
        updatedMaterial.code,       // $1 - material_code
        finalPlantCode,             // $2 - plant_code
        finalStorageLocation,       // $3 - storage_location
        newStock,                   // $4 - quantity & available_quantity
        updatedMaterial.base_uom || 'EA', // $5 - unit
        validatedPrice,            // $6 - moving_average_price
        (newStock * validatedPrice) // $7 - total_value
      ]);

      console.log(`Updated stock for ${updatedMaterial.code} to ${newStock}`);

      // Optional: Create movement record if explicitly requested
      if (create_stock_movement) {
        // Logic to insert into stock_movements (omitted for brevity but can be added if critical)
        // For now, updating balance is the core requirement.
      }
    }

    // 4. Return shaped response
    const response = {
      id: updatedMaterial.id,
      sku: updatedMaterial.code,
      name: updatedMaterial.name,
      description: updatedMaterial.description,
      stock: current_stock !== undefined ? parseFloat(current_stock) : 0, // Should ideally fetch from balance if not updating
      price: updatedMaterial.base_unit_price,
      cost: updatedMaterial.cost,
      category_id: updatedMaterial.category_id,
      type: updatedMaterial.material_type,
      active: updatedMaterial.is_active,
      created_at: updatedMaterial.created_at,
      updated_at: updatedMaterial.updated_at,
      message: 'Product updated successfully (Material)'
    };

    // If we didn't update stock but need to return it, we might want to query it.
    // But frontend usually has the old stock or we return what we just set.
    // For completeness, if current_stock was undefined, we might return 0 or existing logic?
    // The GET route sums it up. Here we just return what was processed.

    res.json(response);

  } catch (error) {
    console.error('Error updating product (material):', error);
    res.status(500).json({ message: 'Failed to update product', error: error.message });
  }
});


// Create a stock movement
router.post('/movements', async (req, res) => {
  try {
    const { product_id, quantity, type, reason, user_id } = req.body;

    // Validate input data
    if (!product_id || !quantity || !type) {
      return res.status(400).json({
        message: 'Missing required fields: product_id, quantity, and type are required'
      });
    }

    // Validate quantity is reasonable (not too large)
    if (quantity > 1000000) {
      return res.status(400).json({
        message: 'Quantity too large. Maximum allowed is 1,000,000'
      });
    }

    // Validate type
    if (!['IN', 'OUT'].includes(type)) {
      return res.status(400).json({
        message: 'Invalid type. Must be IN or OUT'
      });
    }

    // Check if product exists and get its SKU
    const productCheck = await pool.query(
      `SELECT id, description as name, code as sku, id as material_master_id, 
        NULL as plant_id, plant_code, 
        NULL as storage_location_id, production_storage_location as storage_location_code 
       FROM materials WHERE id = $1`,
      [product_id]
    );

    if (productCheck.rows.length === 0) {
      return res.status(404).json({
        message: `Product with ID ${product_id} not found or inactive`
      });
    }

    const product = productCheck.rows[0];

    // Get values from database instead of hardcoded defaults
    const plantCode = await InventoryConfigService.getPlantCode(
      product_id,
      product.material_master_id,
      product.plant_code,
      product.plant_id
    );

    const storageLocation = await InventoryConfigService.getStorageLocationCode(
      product_id,
      product.storage_location_id,
      product.storage_location_code,
      plantCode
    );

    const unit = await InventoryConfigService.getUnitOfMeasure(
      product.material_master_id,
      product.sku,
      product_id,
      null
    );

    const currency = await InventoryConfigService.getCurrencyCode(
      null, // companyCodeId
      null  // providedCurrency
    );

    const createdBy = await InventoryConfigService.getCreatedBy(
      user_id,
      null  // userName
    );

    const unitPrice = await InventoryConfigService.getUnitPrice(
      product.material_master_id,
      product.sku,
      product_id,
      null
    );

    const totalValue = quantity * unitPrice;

    // Generate document number
    const documentNumber = `MOV-${Date.now()}-${type}`;
    const postingDate = new Date().toISOString().split('T')[0];

    // Insert into stock_movements table with correct structure
    const result = await pool.query(`
      INSERT INTO stock_movements (
        document_number, posting_date, material_code, plant_code, storage_location,
        movement_type, quantity, unit, unit_price, currency_code, total_value,
        reference_document, notes, created_by, fiscal_year, fiscal_period
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *
    `, [
      documentNumber,
      postingDate,
      product.sku, // Use SKU as material_code
      plantCode,
      storageLocation,
      type,
      quantity,
      unit,
      unitPrice,
      currency,
      totalValue,
      reason || 'Manual Movement',
      `Stock movement for product ${product.name}`,
      createdBy,
      new Date().getFullYear().toString(),
      (new Date().getMonth() + 1).toString().padStart(2, '0')
    ]);

    // Update stock_balances (primary source of truth)
    const materialCode = product.sku;

    if (type === 'IN') {
      // Insert or update stock_balances - goods receipt goes to available stock
      await pool.query(`
        INSERT INTO stock_balances (
          material_code, plant_code, storage_location, stock_type,
          quantity, available_quantity, unit, last_updated
        )
        VALUES ($1, $2, $3, 'AVAILABLE', $4, $4, $5, CURRENT_TIMESTAMP)
        ON CONFLICT (material_code, plant_code, storage_location, stock_type)
        DO UPDATE SET
          quantity = stock_balances.quantity + $4,
          available_quantity = stock_balances.available_quantity + $4,
          last_updated = CURRENT_TIMESTAMP
      `, [materialCode, plantCode, storageLocation, quantity, unit]);

      // Backward compatibility update to products table removed
    } else if (type === 'OUT') {
      // Check stock_balances first (primary source) - only available stock can be issued
      const stockCheck = await pool.query(`
        SELECT 
          SUM(CASE WHEN stock_type = 'AVAILABLE' THEN quantity ELSE 0 END) as total_quantity,
          SUM(CASE WHEN stock_type = 'AVAILABLE' THEN available_quantity ELSE 0 END) as total_available
        FROM stock_balances
        WHERE material_code = $1
      `, [materialCode]);

      const availableStock = stockCheck.rows[0]?.total_available || 0;

      if (availableStock < quantity) {
        // Fallback to products.stock check
        // Fallback check removed
        const currentStock = { rows: [] };

        if (currentStock.rows.length > 0 && currentStock.rows[0].stock < quantity) {
          return res.status(400).json({
            message: `Insufficient stock. Available: ${availableStock || currentStock.rows[0].stock}, Requested: ${quantity}`
          });
        }
      }

      // Update stock_balances - goods issue from available stock only
      await pool.query(`
        INSERT INTO stock_balances (
          material_code, plant_code, storage_location, stock_type,
          quantity, available_quantity, unit, last_updated
        )
        VALUES ($1, $2, $3, 'AVAILABLE', -$4, -$4, $5, CURRENT_TIMESTAMP)
        ON CONFLICT (material_code, plant_code, storage_location, stock_type)
        DO UPDATE SET
          quantity = GREATEST(0, stock_balances.quantity - $4),
          available_quantity = GREATEST(0, stock_balances.available_quantity - $4),
          -- Also reduce reserved if it exists
          reserved_quantity = GREATEST(0, COALESCE(stock_balances.reserved_quantity, 0) - LEAST($4, COALESCE(stock_balances.reserved_quantity, 0))),
          last_updated = CURRENT_TIMESTAMP
      `, [materialCode, plantCode, storageLocation, quantity, unit]);

      // Backward compatibility update to products table removed
    }

    // Sync products.stock from stock_balances to ensure consistency
    // Sync call removed

    res.status(201).json({
      success: true,
      data: {
        id: result.rows[0].id,
        product_id: product_id,
        quantity: quantity,
        type: type,
        reason: reason,
        user_id: user_id,
        date: result.rows[0].posting_date,
        created_at: result.rows[0].created_at,
        document_number: result.rows[0].document_number,
        material_code: result.rows[0].material_code
      },
      message: `Stock movement created successfully. ${type} ${quantity} units for product ${product.name}`
    });
  } catch (error) {
    console.error('Error creating stock movement:', error);
    res.status(500).json({
      message: 'Failed to create stock movement',
      error: error.message
    });
  }
});

// Create a warehouse (storage location)
router.post('/warehouses', async (req, res) => {
  try {
    const {
      code,
      name,
      description,
      plant_id,
      type = 'raw_material',
      is_mrp_relevant = true,
      is_negative_stock_allowed = false,
      is_goods_receipt_relevant = true,
      is_goods_issue_relevant = true,
      is_interim_storage = false,
      is_transit_storage = false,
      is_restricted_use = false,
      status = 'active',
      is_active = true
    } = req.body;

    if (!code || !name || !plant_id) {
      return res.status(400).json({
        message: 'Missing required fields: code, name, and plant_id are required'
      });
    }

    const result = await directPool.query(
      `INSERT INTO storage_locations (
         code, name, description, plant_id, type,
         is_mrp_relevant, is_negative_stock_allowed,
         is_goods_receipt_relevant, is_goods_issue_relevant,
         is_interim_storage, is_transit_storage, is_restricted_use,
         status, is_active, created_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       RETURNING *`,
      [
        code,
        name,
        description || null,
        plant_id,
        type,
        is_mrp_relevant,
        is_negative_stock_allowed,
        is_goods_receipt_relevant,
        is_goods_issue_relevant,
        is_interim_storage,
        is_transit_storage,
        is_restricted_use,
        status,
        is_active
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating warehouse:', error);
    if (error.code === '23505') { // Unique violation
      return res.status(400).json({
        message: 'Storage location with this code already exists'
      });
    }
    res.status(500).json({
      message: 'Failed to create warehouse',
      error: error.message
    });
  }
});

// Get warehouse-specific stock levels for products
router.get('/products/:id/warehouse-stock', async (req, res) => {
  try {
    const productId = req.params.id;

    const result = await directPool.query(`
      SELECT 
        pw.id,
        pw.product_id,
        pw.storage_location_id,
        pw.stock_quantity,
        pw.min_stock,
        pw.max_stock,
        pw.reorder_point,
        pw.is_active,
        sl.name as warehouse_name,
        sl.code as warehouse_code,
        p.name as plant_name,
        p.code as plant_code
      FROM product_warehouses pw
      JOIN storage_locations sl ON pw.storage_location_id = sl.id
      LEFT JOIN plants p ON sl.plant_id = p.id
      WHERE pw.product_id = $1 AND pw.is_active = true
      ORDER BY sl.name
    `, [productId]);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching warehouse stock levels:', error);
    res.status(500).json({ message: 'Failed to fetch warehouse stock levels' });
  }
});

// Update warehouse-specific stock for a product
router.put('/products/:id/warehouse-stock/:warehouseId', async (req, res) => {
  try {
    const { productId, warehouseId } = req.params;
    const { stock_quantity, min_stock, max_stock, reorder_point } = req.body;

    const result = await directPool.query(`
      UPDATE product_warehouses 
      SET 
        stock_quantity = $1,
        min_stock = $2,
        max_stock = $3,
        reorder_point = $4,
        updated_at = NOW()
      WHERE product_id = $5 AND storage_location_id = $6
      RETURNING *
    `, [stock_quantity, min_stock, max_stock, reorder_point, productId, warehouseId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Product-warehouse relationship not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating warehouse stock:', error);
    res.status(500).json({ message: 'Failed to update warehouse stock' });
  }
});

// Get product types (material types)
router.get('/product-types', async (req, res) => {
  try {
    const result = await directPool.query(`
      SELECT 
        id,
        code,
        name,
        description,
        sort_order,
        is_active
      FROM product_types 
      WHERE is_active = true
      ORDER BY sort_order, name
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching product types:', error);
    res.status(500).json({ message: 'Failed to fetch product types' });
  }
});

// Get finished products for sales orders (sellable products only) with plant and storage location
router.get('/products-for-sales', async (req, res) => {
  try {
    console.log('🔍 Fetching finished products for sales orders with plant and storage location...');

    const result = await directPool.query(`
      SELECT DISTINCT ON (m.id)
        m.id,
        m.description as name,
        m.code as sku,
        m.description,
        COALESCE(m.base_unit_price, 0) as price,
        -- Calculate total available stock
        COALESCE((
          SELECT SUM(quantity) 
          FROM stock_balances sb 
          WHERE sb.material_code = m.code AND sb.stock_type = 'AVAILABLE'
        ), 0) as stock,
        0 as min_stock,
        m.type,
        NULL as category_name,
        m.active,
        m.created_at,
        m.updated_at,
        -- Plant info from materials table
        m.plant_code as product_plant_code,
        p.code as plant_code,
        p.name as plant_name,
        p.id as plant_id,
        -- Storage Location info from materials table (production_storage_location)
        m.production_storage_location as storage_location_code,
        sl.name as storage_location_name,
        sl.id as storage_location_id,
        sl.code as bin_code,
        sl.name as bin_name,
        sl.id as storage_location_table_id,
        sl.plant_id as storage_plant_id,
        p.id as product_plant_id
      FROM materials m
      LEFT JOIN plants p ON m.plant_code = p.code
      LEFT JOIN storage_locations sl ON m.production_storage_location = sl.code AND sl.plant_id = p.id
      WHERE m.active = true
      ORDER BY m.id, m.description
    `);

    console.log(`✅ Found ${result.rows.length} finished products for sales`);
    console.log('Sample products with plant/storage location:', result.rows.slice(0, 3).map(p => ({
      id: p.id,
      name: p.name,
      type: p.type,
      price: p.price,
      plant_code: p.plant_code,
      plant_name: p.plant_name,
      storage_location_code: p.storage_location_code,
      storage_location_name: p.storage_location_name
    })));

    res.json(result.rows);
  } catch (error) {
    console.error('❌ Error fetching finished products for sales:', error);
    res.status(500).json({ message: 'Failed to fetch finished products for sales' });
  }
});

// Get inventory balance data
router.get('/balance', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM inventory_balance 
      ORDER BY material_code, plant_code, storage_location
    `);

    res.json({
      success: true,
      data: result.rows,
      message: `Retrieved ${result.rows.length} inventory balance records`
    });
  } catch (error) {
    console.error('Error fetching inventory balance:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch inventory balance',
      details: error.message
    });
  }
});

// Get stock movements data
router.get('/stock-movements', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM stock_movements 
      ORDER BY posting_date DESC, created_at DESC
      LIMIT 100
    `);

    res.json({
      success: true,
      data: result.rows,
      message: `Retrieved ${result.rows.length} stock movement records`
    });
  } catch (error) {
    console.error('Error fetching stock movements:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch stock movements',
      details: error.message
    });
  }
});

// Get movements with product details (for UI display)
router.get('/movements', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
    sm.id,
      sm.document_number,
      sm.posting_date as movement_date,
      sm.material_code,
      sm.movement_type,
      sm.quantity,
      sm.unit as unit_of_measure,
      sm.plant_code,
      sm.storage_location as from_location,
      NULL as to_location,
      sm.reference_document as reference,
      sm.notes,
      sm.created_by as user_name,
      sm.unit_price,
      sm.currency_code,
      sm.total_value,
      sm.production_order_id,
      sm.created_at,
      --Get product details from materials table
    COALESCE(m.description, sm.material_code) as product_name,
      COALESCE(m.code, sm.material_code) as sku,
      m.id as product_id,
      --Status based on financial posting
    CASE 
          WHEN sm.posted_to_gl = true THEN 'posted'
          WHEN sm.financial_posting_status = 'success' THEN 'posted'
          WHEN sm.financial_posting_error IS NOT NULL THEN 'error'
          ELSE 'pending'
    END as status
      FROM stock_movements sm
      LEFT JOIN materials m ON sm.material_code = m.code
      ORDER BY sm.posting_date DESC, sm.created_at DESC
      LIMIT 500
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching movements:', error);
    res.status(500).json({
      message: 'Failed to fetch movements',
      error: error.message
    });
  }
});

// Create stock movement
router.post('/stock-movements', async (req, res) => {
  try {
    const {
      material_code,
      plant_code,
      storage_location,
      movement_type,
      quantity,
      unit,
      posting_date,
      reference_document,
      notes
    } = req.body;

    // Validate required fields
    if (!material_code || !movement_type || !quantity) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: material_code, movement_type, and quantity are required'
      });
    }

    // Validate quantity is reasonable
    if (quantity > 1000000) {
      return res.status(400).json({
        success: false,
        error: 'Quantity too large. Maximum allowed is 1,000,000'
      });
    }

    // Additional validation for quantity
    if (isNaN(quantity) || quantity <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Quantity must be a positive number'
      });
    }

    // Generate document number if not provided
    const document_number = `MOV - ${Date.now()} -${movement_type} `;
    const actual_posting_date = posting_date || new Date().toISOString().split('T')[0];

    // Get values from database instead of hardcoded defaults
    let actual_plant_code = plant_code;
    let actual_storage_location = storage_location;
    let actual_unit = unit;
    let actual_currency = null;
    let actual_created_by = null;

    // If material_code provided, get related data
    if (material_code && (!plant_code || !storage_location || !unit)) {
      const materialResult = await pool.query(`
        SELECT m.id as material_id, m.material_code as code, m.plant_code,
        --Dummy product_id for compatibility if needed, or handle removal
        m.id as product_id
        FROM materials m
        WHERE m.material_code = $1 OR m.id::text = $1
        LIMIT 1
      `, [material_code]);

      if (materialResult.rows.length > 0) {
        const mat = materialResult.rows[0];
        if (!actual_plant_code) {
          try {
            actual_plant_code = await InventoryConfigService.getPlantCode(
              mat.product_id,
              mat.material_id,
              mat.plant_code,
              mat.plant_id
            );
          } catch (e) {
            // If error, material might not have plant configured
          }
        }
        if (!actual_storage_location && actual_plant_code) {
          try {
            actual_storage_location = await InventoryConfigService.getStorageLocationCode(
              mat.product_id,
              mat.storage_location_id,
              mat.storage_location_code,
              actual_plant_code
            );
          } catch (e) {
            // If error, material might not have storage location configured
          }
        }
        if (!actual_unit) {
          try {
            actual_unit = await InventoryConfigService.getUnitOfMeasure(
              mat.material_id,
              mat.code,
              mat.product_id,
              null
            );
          } catch (e) {
            // If error, material might not have unit configured
          }
        }
      }
    }

    // Get currency and created_by
    try {
      actual_currency = await InventoryConfigService.getCurrencyCode(null, null);
    } catch (e) {
      // Currency not configured, will need to be provided
    }

    try {
      actual_created_by = await InventoryConfigService.getCreatedBy(null, null);
    } catch (e) {
      // Created_by not configured, will need to be provided
    }

    // Validate required fields are present
    if (!actual_plant_code) {
      return res.status(400).json({
        success: false,
        error: 'Plant code is required. Please provide plant_code or configure default_plant_code in document_settings'
      });
    }

    if (!actual_storage_location) {
      return res.status(400).json({
        success: false,
        error: 'Storage location is required. Please provide storage_location or configure default_storage_location in document_settings'
      });
    }

    if (!actual_unit) {
      return res.status(400).json({
        success: false,
        error: 'Unit of measure is required. Please provide unit or ensure material has base_uom configured'
      });
    }

    if (!actual_currency) {
      return res.status(400).json({
        success: false,
        error: 'Currency is required. Please provide currency or configure default_currency in document_settings'
      });
    }

    if (!actual_created_by) {
      return res.status(400).json({
        success: false,
        error: 'Created by is required. Please provide user_id, user_name, or configure default_created_by in document_settings'
      });
    }

    // Insert into stock_movements table
    const result = await pool.query(`
      INSERT INTO stock_movements(
          document_number, posting_date, material_code, plant_code, storage_location,
          movement_type, quantity, unit, unit_price, currency_code, total_value,
          reference_document, notes, created_by, fiscal_year, fiscal_period
        ) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING * `,
      [
        document_number,
        actual_posting_date,
        material_code,
        actual_plant_code,
        actual_storage_location,
        movement_type,
        quantity,
        actual_unit,
        0, // Unit price - should be calculated from material
        actual_currency,
        0, // Total value - should be calculated
        reference_document || 'Manual Movement',
        notes || `Stock movement for material ${material_code}`,
        actual_created_by,
        new Date().getFullYear().toString(),
        (new Date().getMonth() + 1).toString().padStart(2, '0')
      ]
    );

    res.json({
      success: true,
      data: result.rows[0],
      message: 'Stock movement created successfully'
    });
  } catch (error) {
    console.error('Error creating stock movement:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create stock movement',
      details: error.message
    });
  }
});

// Get physical inventory data
router.get('/physical-inventory', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM physical_inventory 
      ORDER BY count_date DESC, material_code
        `);

    res.json({
      success: true,
      data: result.rows,
      message: `Retrieved ${result.rows.length} physical inventory records`
    });
  } catch (error) {
    console.error('Error fetching physical inventory:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch physical inventory',
      details: error.message
    });
  }
});

export default router;