import { pool } from '../db';

/**
 * Service to get configuration values from database instead of hardcoded defaults
 * Follows ERP best practices - all values come from master data or configuration
 */
export class InventoryConfigService {

  /**
   * Get plant code from product or material
   */
  static async getPlantCode(productId, materialId, productPlantCode, productPlantId) {
    // Priority 1: From product plant_code
    if (productPlantCode) {
      return productPlantCode;
    }

    // Priority 2: From product plant_id
    if (productPlantId) {
      const result = await pool.query(
        'SELECT code FROM plants WHERE id = $1 AND is_active = true',
        [productPlantId]
      );
      if (result.rows.length > 0) {
        return result.rows[0].code;
      }
    }

    // Priority 3: From product's storage location's plant
    if (productId) {
      const result = await pool.query(`
        SELECT plant_code as code 
        FROM materials 
        WHERE id = $1
      `, [productId]);
      if (result.rows.length > 0 && result.rows[0].code) {
        return result.rows[0].code;
      }
    }

    // Priority 4: From material's plant
    if (materialId) {
      const result = await pool.query(`
        SELECT p.code
        FROM material_plants mp
        JOIN plants p ON mp.plant_id = p.id
        WHERE mp.material_id = $1 AND p.is_active = true
        LIMIT 1
      `, [materialId]);
      if (result.rows.length > 0) {
        return result.rows[0].code;
      }
    }

    // Priority 5: From document_settings
    const settings = await pool.query(`
      SELECT default_plant_code 
      FROM document_settings 
      WHERE default_plant_code IS NOT NULL
      LIMIT 1
    `);
    if (settings.rows.length > 0) {
      return settings.rows[0].default_plant_code;
    }

    // No default - throw error
    throw new Error('Plant code is required. Please provide plant_code, plant_id, or configure default_plant_code in document_settings');
  }

  /**
   * Get storage location code
   */
  static async getStorageLocationCode(productId, storageLocationId, storageLocationCode, plantCode) {
    // Priority 1: From provided storage_location_code
    if (storageLocationCode) {
      return storageLocationCode;
    }

    // Priority 2: From storage_location_id
    if (storageLocationId) {
      const result = await pool.query(
        'SELECT code FROM storage_locations WHERE id = $1 AND is_active = true',
        [storageLocationId]
      );
      if (result.rows.length > 0) {
        return result.rows[0].code;
      }
    }

    // Priority 3: From product's storage location
    if (productId) {
      const result = await pool.query(`
        SELECT production_storage_location as code
        FROM materials
        WHERE id = $1
      `, [productId]);
      if (result.rows.length > 0 && result.rows[0].code) {
        return result.rows[0].code;
      }
    }

    // Priority 4: From plant's default storage location
    if (plantCode) {
      const result = await pool.query(`
        SELECT p.default_storage_location
        FROM plants p
        WHERE p.code = $1 AND p.is_active = true
      `, [plantCode]);
      if (result.rows.length > 0 && result.rows[0].default_storage_location) {
        return result.rows[0].default_storage_location;
      }
    }

    // Priority 5: From document_settings
    const settings = await pool.query(`
      SELECT default_storage_location 
      FROM document_settings 
      WHERE default_storage_location IS NOT NULL
      LIMIT 1
    `);
    if (settings.rows.length > 0) {
      return settings.rows[0].default_storage_location;
    }

    // No default - throw error
    throw new Error('Storage location is required. Please provide storage_location_code, storage_location_id, or configure default_storage_location in document_settings');
  }

  /**
   * Get unit of measure
   */
  static async getUnitOfMeasure(materialId, materialCode, productId, providedUnit) {
    // Priority 1: From provided unit
    if (providedUnit) {
      return providedUnit;
    }

    // Priority 2: From material master
    if (materialId) {
      const result = await pool.query(`
        SELECT base_uom
        FROM materials
        WHERE id = $1 AND is_active = true
      `, [materialId]);
      if (result.rows.length > 0 && result.rows[0].base_uom) {
        return result.rows[0].base_uom;
      }
    }

    // Priority 3: From material code
    if (materialCode) {
      const result = await pool.query(`
        SELECT base_uom
        FROM materials
        WHERE code = $1 AND is_active = true
      `, [materialCode]);
      if (result.rows.length > 0 && result.rows[0].base_uom) {
        return result.rows[0].base_uom;
      }
    }

    // Priority 4: From product
    if (productId) {
      const result = await pool.query(`
        SELECT base_uom
        FROM materials
        WHERE id = $1
      `, [productId]);
      if (result.rows.length > 0 && result.rows[0].base_uom) {
        return result.rows[0].base_uom;
      }
    }

    // No default - throw error
    throw new Error('Unit of measure is required. Please provide unit or ensure material has base_uom configured');
  }

  /**
   * Get currency code
   */
  static async getCurrencyCode(companyCodeId, providedCurrency) {
    // Priority 1: From provided currency
    if (providedCurrency) {
      return providedCurrency;
    }

    // Priority 2: From company code
    if (companyCodeId) {
      const result = await pool.query(
        'SELECT currency FROM company_codes WHERE id = $1',
        [companyCodeId]
      );
      if (result.rows.length > 0 && result.rows[0].currency) {
        return result.rows[0].currency;
      }
    }

    // Priority 3: From document_settings
    const settings = await pool.query(`
      SELECT default_currency 
      FROM document_settings 
      WHERE default_currency IS NOT NULL
      LIMIT 1
    `);
    if (settings.rows.length > 0) {
      return settings.rows[0].default_currency;
    }

    // No default - throw error
    throw new Error('Currency is required. Please provide currency or configure default_currency in document_settings');
  }

  /**
   * Get created_by user
   */
  static async getCreatedBy(userId, userName) {
    // Priority 1: From provided user_name
    if (userName) {
      return userName;
    }

    // Priority 2: From user_id
    if (userId) {
      const result = await pool.query(
        'SELECT username, name FROM users WHERE id = $1',
        [userId]
      );
      if (result.rows.length > 0) {
        return result.rows[0].username || result.rows[0].name;
      }
    }

    // Priority 3: From document_settings
    const settings = await pool.query(`
      SELECT default_created_by 
      FROM document_settings 
      WHERE default_created_by IS NOT NULL
      LIMIT 1
    `);
    if (settings.rows.length > 0) {
      return settings.rows[0].default_created_by;
    }

    // No default - throw error
    throw new Error('Created by is required. Please provide user_id, user_name, or configure default_created_by in document_settings');
  }

  /**
   * Get unit price from material or product
   */
  static async getUnitPrice(materialId, materialCode, productId, providedPrice) {
    // Priority 1: From provided price
    if (providedPrice !== null && providedPrice !== undefined) {
      return parseFloat(providedPrice);
    }

    // Priority 2: From material master
    if (materialId) {
      const result = await pool.query(`
        SELECT base_unit_price, base_price, cost
        FROM materials
        WHERE id = $1 AND is_active = true
      `, [materialId]);
      if (result.rows.length > 0) {
        const price = result.rows[0].base_unit_price || result.rows[0].base_price || result.rows[0].cost;
        if (price) return parseFloat(price);
      }
    }

    // Priority 3: From material code
    if (materialCode) {
      const result = await pool.query(`
        SELECT base_unit_price, base_price, cost
        FROM materials
        WHERE code = $1 AND is_active = true
      `, [materialCode]);
      if (result.rows.length > 0) {
        const price = result.rows[0].base_unit_price || result.rows[0].base_price || result.rows[0].cost;
        if (price) return parseFloat(price);
      }
    }

    // Priority 4: From product
    if (productId) {
      const result = await pool.query(
        'SELECT base_unit_price as price, cost FROM materials WHERE id = $1',
        [productId]
      );
      if (result.rows.length > 0) {
        const price = result.rows[0].price || result.rows[0].cost;
        if (price) return parseFloat(price);
      }
    }

    // Priority 5: From stock_balances moving_average_price
    if (materialCode) {
      const result = await pool.query(`
        SELECT moving_average_price
        FROM stock_balances
        WHERE material_code = $1
        ORDER BY last_updated DESC
        LIMIT 1
      `, [materialCode]);
      if (result.rows.length > 0 && result.rows[0].moving_average_price) {
        return parseFloat(result.rows[0].moving_average_price);
      }
    }

    // Return 0 if no price found (but don't throw error)
    return 0;
  }
}
