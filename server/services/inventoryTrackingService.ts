import pkg from 'pg';
const { Pool } = pkg;
type PoolType = InstanceType<typeof Pool>;

export class InventoryTrackingService {
  private pool: PoolType;

  constructor(pool: PoolType) {
    this.pool = pool;
  }

  /**
   * Update ordered quantity when PO is created
   * Increases ordered_quantity in stock_balances
   */
  async increaseOrderedQuantity(
    materialId: number,
    materialCode: string,
    plantId: number,
    plantCode: string,
    storageLocation: string,
    quantity: number,
    unit: string,
    providedClient?: any
  ): Promise<void> {
    const client = providedClient || this.pool;
    let finalStorageLocation = storageLocation;
    let finalUnit = unit;
    try {
      // Get material code if not provided
      let finalMaterialCode = materialCode;
      if (!finalMaterialCode && materialId) {
        const materialResult = await client.query(
          'SELECT code FROM materials WHERE id = $1',
          [materialId]
        );
        if (materialResult.rows.length > 0) {
          finalMaterialCode = materialResult.rows[0].code;
        }
      }

      // Get plant code if not provided
      let finalPlantCode = plantCode;
      if (!finalPlantCode && plantId) {
        const plantResult = await client.query(
          'SELECT code FROM plants WHERE id = $1',
          [plantId]
        );
        if (plantResult.rows.length > 0) {
          finalPlantCode = plantResult.rows[0].code;
        }
      }

      if (!finalMaterialCode || !finalPlantCode) {
        throw new Error('Material code and plant code are required');
      }

      // Get default storage location from system configuration if not provided
      finalStorageLocation = storageLocation;
      if (!finalStorageLocation) {
        try {
          const defaultStorageResult = await client.query(
            'SELECT config_value FROM system_configuration WHERE config_key = $1 AND active = true LIMIT 1',
            ['default_storage_location']
          );
          if (defaultStorageResult.rows.length > 0 && defaultStorageResult.rows[0].config_value) {
            finalStorageLocation = defaultStorageResult.rows[0].config_value;
          } else if (plantId) {
            // Try to get default storage location from plant
            const plantStorageResult = await client.query(
              'SELECT code FROM storage_locations WHERE plant_id = $1 ORDER BY id LIMIT 1',
              [plantId]
            );
            if (plantStorageResult.rows.length > 0) {
              finalStorageLocation = plantStorageResult.rows[0].code;
            }
          }
        } catch (configError) {
          // If system_configuration table doesn't exist, that's okay
          console.warn('Could not get default storage location from configuration:', configError);
        }
      }

      if (!finalStorageLocation) {
        throw new Error('Storage location is required and could not be determined from configuration or plant');
      }

      // Get default unit from material master or system configuration if not provided
      finalUnit = unit;
      if (!finalUnit) {
        try {
          if (materialId) {
            const materialUnitResult = await client.query(
              'SELECT base_uom FROM materials WHERE id = $1 LIMIT 1',
              [materialId]
            );
            if (materialUnitResult.rows.length > 0 && materialUnitResult.rows[0].base_uom) {
              finalUnit = materialUnitResult.rows[0].base_uom;
            }
          }

          if (!finalUnit) {
            const defaultUnitResult = await client.query(
              'SELECT config_value FROM system_configuration WHERE config_key = $1 AND active = true LIMIT 1',
              ['default_unit_of_measure']
            );
            if (defaultUnitResult.rows.length > 0 && defaultUnitResult.rows[0].config_value) {
              finalUnit = defaultUnitResult.rows[0].config_value;
            }
          }
        } catch (configError) {
          // If system_configuration table doesn't exist, that's okay
          console.warn('Could not get default unit from configuration:', configError);
        }
      }

      if (!finalUnit) {
        throw new Error('Unit is required and could not be determined from material master or configuration');
      }

      // Update or insert stock balance with ordered quantity
      await client.query(`
        INSERT INTO stock_balances (
          material_code, plant_code, storage_location, stock_type,
          quantity, ordered_quantity, available_quantity, unit, last_updated
        )
        VALUES ($1::VARCHAR, $2::VARCHAR, $3::VARCHAR, $6::VARCHAR, 0, $4::NUMERIC, $4::NUMERIC, $5::VARCHAR, CURRENT_TIMESTAMP)
        ON CONFLICT (material_code, plant_code, storage_location, stock_type)
        DO UPDATE SET
          ordered_quantity = stock_balances.ordered_quantity + $4::NUMERIC,
          available_quantity = GREATEST(0, 
            COALESCE(stock_balances.quantity, 0) 
            - COALESCE(stock_balances.committed_quantity, 0) 
            - COALESCE(stock_balances.reserved_quantity, 0)
            + stock_balances.ordered_quantity + $4::NUMERIC
          ),
          last_updated = CURRENT_TIMESTAMP
      `, [String(finalMaterialCode), String(finalPlantCode), String(finalStorageLocation), quantity, String(finalUnit), 'AVAILABLE']);
    } catch (error) {
      console.error('Error increasing ordered quantity:', error);
      throw error;
    }
  }

  /**
   * Decrease ordered quantity when GRPO is posted
   * Also increases in_stock quantity
   */
  async decreaseOrderedAndIncreaseStock(
    materialId: number,
    materialCode: string,
    plantId: number,
    plantCode: string,
    storageLocation: string,
    quantity: number,
    unitPrice: number,
    unit: string = 'EA',
    providedClient?: any
  ): Promise<void> {
    const client = providedClient || this.pool;
    let finalStorageLocation = storageLocation;
    let finalUnit = unit;
    try {
      // Get material code if not provided
      let finalMaterialCode = materialCode;
      if (!finalMaterialCode && materialId) {
        const materialResult = await client.query(
          'SELECT code FROM materials WHERE id = $1',
          [materialId]
        );
        if (materialResult.rows.length > 0) {
          finalMaterialCode = materialResult.rows[0].code;
        }
      }

      // Get plant code if not provided
      let finalPlantCode = plantCode;
      if (!finalPlantCode && plantId) {
        const plantResult = await client.query(
          'SELECT code FROM plants WHERE id = $1',
          [plantId]
        );
        if (plantResult.rows.length > 0) {
          finalPlantCode = plantResult.rows[0].code;
        }
      }

      if (!finalMaterialCode || !finalPlantCode) {
        throw new Error('Material code and plant code are required');
      }

      // Get default storage location from system configuration if not provided
      finalStorageLocation = storageLocation;
      if (!finalStorageLocation) {
        try {
          const defaultStorageResult = await client.query(
            'SELECT config_value FROM system_configuration WHERE config_key = $1 AND active = true LIMIT 1',
            ['default_storage_location']
          );
          if (defaultStorageResult.rows.length > 0 && defaultStorageResult.rows[0].config_value) {
            finalStorageLocation = defaultStorageResult.rows[0].config_value;
          } else if (plantId) {
            // Try to get default storage location from plant
            const plantStorageResult = await client.query(
              'SELECT code FROM storage_locations WHERE plant_id = $1 ORDER BY id LIMIT 1',
              [plantId]
            );
            if (plantStorageResult.rows.length > 0) {
              finalStorageLocation = plantStorageResult.rows[0].code;
            }
          }
        } catch (configError) {
          // If system_configuration table doesn't exist, that's okay
          console.warn('Could not get default storage location from configuration:', configError);
        }
      }

      if (!finalStorageLocation) {
        throw new Error('Storage location is required and could not be determined from configuration or plant');
      }

      // Get default unit from material master or system configuration if not provided
      let finalUnit = unit;
      if (!finalUnit || finalUnit === 'EA') {
        try {
          if (materialId) {
            const materialUnitResult = await client.query(
              'SELECT base_uom FROM materials WHERE id = $1 LIMIT 1',
              [materialId]
            );
            if (materialUnitResult.rows.length > 0 && materialUnitResult.rows[0].base_uom) {
              finalUnit = materialUnitResult.rows[0].base_uom;
            }
          }

          if (!finalUnit || finalUnit === 'EA') {
            const defaultUnitResult = await client.query(
              'SELECT config_value FROM system_configuration WHERE config_key = $1 AND active = true LIMIT 1',
              ['default_unit_of_measure']
            );
            if (defaultUnitResult.rows.length > 0 && defaultUnitResult.rows[0].config_value) {
              finalUnit = defaultUnitResult.rows[0].config_value;
            }
          }
        } catch (configError) {
          // If system_configuration table doesn't exist, that's okay
          console.warn('Could not get default unit from configuration:', configError);
        }
      }

      if (!finalUnit) {
        throw new Error('Unit is required and could not be determined from material master or configuration');
      }

      // Update stock balance: decrease ordered_quantity, increase quantity (in_stock)
      // Cast all parameters to explicit types to avoid type inference issues
      await client.query(`
        INSERT INTO stock_balances (
          material_code, plant_code, storage_location, stock_type,
          quantity, ordered_quantity, available_quantity, unit,
          moving_average_price, total_value, last_updated
        )
        VALUES ($1::VARCHAR, $2::VARCHAR, $3::VARCHAR, $7::VARCHAR, $4::NUMERIC, 0, $4::NUMERIC, $5::VARCHAR, $6::NUMERIC, ($4::NUMERIC * $6::NUMERIC), CURRENT_TIMESTAMP)
        ON CONFLICT (material_code, plant_code, storage_location, stock_type)
        DO UPDATE SET
          quantity = COALESCE(stock_balances.quantity, 0) + $4::NUMERIC,
          ordered_quantity = GREATEST(0, COALESCE(stock_balances.ordered_quantity, 0) - $4::NUMERIC),
          moving_average_price = CASE
            WHEN COALESCE(stock_balances.quantity, 0) = 0 THEN $6::NUMERIC
            ELSE (
              (COALESCE(stock_balances.total_value, 0) + ($4::NUMERIC * $6::NUMERIC)) / 
              (COALESCE(stock_balances.quantity, 0) + $4::NUMERIC)
            )
          END,
          total_value = (COALESCE(stock_balances.quantity, 0) + $4::NUMERIC) * (
            CASE
              WHEN COALESCE(stock_balances.quantity, 0) = 0 THEN $6::NUMERIC
              ELSE (
                (COALESCE(stock_balances.total_value, 0) + ($4::NUMERIC * $6::NUMERIC)) / 
                (COALESCE(stock_balances.quantity, 0) + $4::NUMERIC)
              )
            END
          ),
          available_quantity = GREATEST(0,
            (COALESCE(stock_balances.quantity, 0) + $4::NUMERIC)
            - COALESCE(stock_balances.committed_quantity, 0)
            - COALESCE(stock_balances.reserved_quantity, 0)
            + GREATEST(0, COALESCE(stock_balances.ordered_quantity, 0) - $4::NUMERIC)
          ),
          last_updated = CURRENT_TIMESTAMP
      `, [
        String(finalMaterialCode),
        String(finalPlantCode),
        String(finalStorageLocation),
        quantity,
        String(finalUnit),
        unitPrice,
        'AVAILABLE'
      ]);
    } catch (error: any) {
      console.error('Error decreasing ordered and increasing stock:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        detail: error.detail,
        hint: error.hint,
        position: error.position,
        materialId,
        materialCode,
        plantId,
        plantCode,
        storageLocation: finalStorageLocation || storageLocation,
        quantity,
        unitPrice,
        unit: finalUnit || unit
      });
      throw error;
    }
  }

  /**
   * Increase committed quantity (for sales orders)
   */
  async increaseCommittedQuantity(
    materialCode: string,
    plantCode: string,
    storageLocation: string,
    quantity: number,
    providedClient?: any
  ): Promise<void> {
    const client = providedClient || this.pool;
    let finalStorageLocation = storageLocation;
    try {
      // Get default storage location from system configuration if not provided
      finalStorageLocation = storageLocation;
      if (!finalStorageLocation) {
        try {
          const defaultStorageResult = await client.query(
            'SELECT config_value FROM system_configuration WHERE config_key = $1 AND active = true LIMIT 1',
            ['default_storage_location']
          );
          if (defaultStorageResult.rows.length > 0 && defaultStorageResult.rows[0].config_value) {
            finalStorageLocation = defaultStorageResult.rows[0].config_value;
          } else {
            // Try to get default storage location from plant
            const plantResult = await client.query(
              'SELECT id FROM plants WHERE code = $1 LIMIT 1',
              [plantCode]
            );
            if (plantResult.rows.length > 0) {
              const plantId = plantResult.rows[0].id;
              const plantStorageResult = await client.query(
                'SELECT code FROM storage_locations WHERE plant_id = $1 ORDER BY id LIMIT 1',
                [plantId]
              );
              if (plantStorageResult.rows.length > 0) {
                finalStorageLocation = plantStorageResult.rows[0].code;
              }
            }
          }
        } catch (configError) {
          // If system_configuration table doesn't exist, that's okay
          console.warn('Could not get default storage location from configuration:', configError);
        }
      }

      if (!finalStorageLocation) {
        throw new Error('Storage location is required and could not be determined from configuration or plant');
      }

      // Get unit from material master or system configuration if not provided
      // Note: increaseCommittedQuantity doesn't take unit parameter, so we need to get it
      let finalUnit = 'EA'; // Default fallback
      try {
        // Try to get unit from material master using material code
        const materialUnitResult = await client.query(
          'SELECT base_uom FROM materials WHERE code = $1 LIMIT 1',
          [materialCode]
        );
        if (materialUnitResult.rows.length > 0 && materialUnitResult.rows[0].base_uom) {
          finalUnit = materialUnitResult.rows[0].base_uom;
        } else {
          // Try system configuration
          const defaultUnitResult = await client.query(
            'SELECT config_value FROM system_configuration WHERE config_key = $1 AND active = true LIMIT 1',
            ['default_unit_of_measure']
          );
          if (defaultUnitResult.rows.length > 0 && defaultUnitResult.rows[0].config_value) {
            finalUnit = defaultUnitResult.rows[0].config_value;
          }
        }
      } catch (configError) {
        // If lookup fails, use default
        console.warn('Could not get unit from material master or configuration:', configError);
      }

      await client.query(`
        INSERT INTO stock_balances (
          material_code, plant_code, storage_location, stock_type,
          quantity, committed_quantity, reserved_quantity, available_quantity, unit, last_updated
        )
        VALUES ($1::VARCHAR, $2::VARCHAR, $3::VARCHAR, $6::VARCHAR, 0, $4::NUMERIC, 0, 0, $5::VARCHAR, CURRENT_TIMESTAMP)
        ON CONFLICT (material_code, plant_code, storage_location, stock_type)
        DO UPDATE SET
          committed_quantity = stock_balances.committed_quantity + $4::NUMERIC,
          available_quantity = GREATEST(0,
            COALESCE(stock_balances.quantity, 0)
            - (stock_balances.committed_quantity + $4::NUMERIC)
            - COALESCE(stock_balances.reserved_quantity, 0)
            + COALESCE(stock_balances.ordered_quantity, 0)
          ),
          last_updated = CURRENT_TIMESTAMP
      `, [String(materialCode), String(plantCode), String(finalStorageLocation), quantity, String(finalUnit), 'AVAILABLE']);
    } catch (error) {
      console.error('Error increasing committed quantity:', error);
      throw error;
    }
  }

  /**
   * Decrease committed quantity and decrease stock when goods are delivered/shipped
   * Used for sales order deliveries
   */
  async decreaseCommittedAndDecreaseStock(
    materialId: number,
    materialCode: string,
    plantId: number,
    plantCode: string,
    storageLocation: string,
    quantity: number,
    unit: string,
    providedClient?: any
  ): Promise<void> {
    const client = providedClient || this.pool;
    let finalStorageLocation = storageLocation;
    let finalUnit = unit;
    try {
      // Get material code if not provided
      let finalMaterialCode = materialCode;
      if (!finalMaterialCode && materialId) {
        const materialResult = await client.query(
          'SELECT code FROM materials WHERE id = $1',
          [materialId]
        );
        if (materialResult.rows.length > 0) {
          finalMaterialCode = materialResult.rows[0].code;
        }
      }

      // Get plant code if not provided
      let finalPlantCode = plantCode;
      if (!finalPlantCode && plantId) {
        const plantResult = await client.query(
          'SELECT code FROM plants WHERE id = $1',
          [plantId]
        );
        if (plantResult.rows.length > 0) {
          finalPlantCode = plantResult.rows[0].code;
        }
      }

      if (!finalMaterialCode || !finalPlantCode) {
        throw new Error('Material code and plant code are required');
      }

      // Get default storage location from system configuration if not provided
      finalStorageLocation = storageLocation;
      if (!finalStorageLocation) {
        try {
          const defaultStorageResult = await client.query(
            'SELECT config_value FROM system_configuration WHERE config_key = $1 AND active = true LIMIT 1',
            ['default_storage_location']
          );
          if (defaultStorageResult.rows.length > 0 && defaultStorageResult.rows[0].config_value) {
            finalStorageLocation = defaultStorageResult.rows[0].config_value;
          } else if (plantId) {
            // Try to get default storage location from plant
            const plantStorageResult = await client.query(
              'SELECT code FROM storage_locations WHERE plant_id = $1 ORDER BY id LIMIT 1',
              [plantId]
            );
            if (plantStorageResult.rows.length > 0) {
              finalStorageLocation = plantStorageResult.rows[0].code;
            }
          }
        } catch (configError) {
          // If system_configuration table doesn't exist, that's okay
          console.warn('Could not get default storage location from configuration:', configError);
        }
      }

      if (!finalStorageLocation) {
        throw new Error('Storage location is required and could not be determined from configuration or plant');
      }

      // Get default unit from material master or system configuration if not provided
      finalUnit = unit;
      if (!finalUnit) {
        try {
          if (materialId) {
            const materialUnitResult = await client.query(
              'SELECT base_uom FROM materials WHERE id = $1 LIMIT 1',
              [materialId]
            );
            if (materialUnitResult.rows.length > 0 && materialUnitResult.rows[0].base_uom) {
              finalUnit = materialUnitResult.rows[0].base_uom;
            }
          }

          if (!finalUnit) {
            const defaultUnitResult = await client.query(
              'SELECT config_value FROM system_configuration WHERE config_key = $1 AND active = true LIMIT 1',
              ['default_unit_of_measure']
            );
            if (defaultUnitResult.rows.length > 0 && defaultUnitResult.rows[0].config_value) {
              finalUnit = defaultUnitResult.rows[0].config_value;
            }
          }
        } catch (configError) {
          // If system_configuration table doesn't exist, that's okay
          console.warn('Could not get default unit from configuration:', configError);
        }
      }

      if (!finalUnit) {
        throw new Error('Unit is required and could not be determined from material master or configuration');
      }

      // Update stock balance: decrease committed_quantity and quantity (in_stock)
      // CRITICAL: available_quantity must respect constraint: available_quantity <= quantity + ordered_quantity
      // CRITICAL FIX: Only UPDATE existing rows, don't INSERT new rows with negative values
      // If row doesn't exist, we can't decrease stock (there's nothing to decrease)
      await client.query(`
        UPDATE stock_balances
        SET
          quantity = GREATEST(0, COALESCE(quantity, 0) - $4::NUMERIC),
          committed_quantity = GREATEST(0, COALESCE(committed_quantity, 0) - $4::NUMERIC),
          reserved_quantity = GREATEST(0, COALESCE(reserved_quantity, 0) - $4::NUMERIC),
          available_quantity = GREATEST(0,
            LEAST(
              -- Calculate available as: quantity - committed - reserved + ordered
              GREATEST(0, COALESCE(quantity, 0) - $4::NUMERIC)
              - GREATEST(0, COALESCE(committed_quantity, 0) - $4::NUMERIC)
              - GREATEST(0, COALESCE(reserved_quantity, 0) - $4::NUMERIC)
              + COALESCE(ordered_quantity, 0),
              -- Constraint: available_quantity <= quantity + ordered_quantity
              GREATEST(0, COALESCE(quantity, 0) - $4::NUMERIC) + COALESCE(ordered_quantity, 0)
            )
          ),
          last_updated = CURRENT_TIMESTAMP
        WHERE material_code = $1::VARCHAR
          AND plant_code = $2::VARCHAR
          AND storage_location = $3::VARCHAR
          AND (stock_type = $5::VARCHAR OR stock_type IS NULL)
      `, [
        String(finalMaterialCode),
        String(finalPlantCode),
        String(finalStorageLocation),
        quantity,
        'AVAILABLE'
      ]);

      // Check if any rows were updated - if not, the stock balance doesn't exist
      const updateResult = await client.query(`
        SELECT COUNT(*) as updated_count
        FROM stock_balances
        WHERE material_code = $1::VARCHAR
          AND plant_code = $2::VARCHAR
          AND storage_location = $3::VARCHAR
          AND (stock_type = $4::VARCHAR OR stock_type IS NULL)
      `, [String(finalMaterialCode), String(finalPlantCode), String(finalStorageLocation), 'AVAILABLE']);

      if (parseInt(updateResult.rows[0]?.updated_count || 0) === 0) {
        console.warn(`⚠️ Cannot decrease stock: stock_balances row does not exist for material ${finalMaterialCode} at plant ${finalPlantCode}, storage ${finalStorageLocation}`);
        throw new Error(`Stock balance record not found. Cannot decrease inventory for material ${finalMaterialCode} at plant ${finalPlantCode}, storage ${finalStorageLocation}.`);
      }
    } catch (error: any) {
      console.error('Error decreasing committed and decreasing stock:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        detail: error.detail,
        hint: error.hint,
        position: error.position,
        materialId,
        materialCode,
        plantId,
        plantCode,
        storageLocation: finalStorageLocation || storageLocation,
        quantity,
        unit: finalUnit || unit
      });
      throw error;
    }
  }

  /**
   * Get inventory status for a material
   */
  async getInventoryStatus(
    materialCode: string,
    plantCode: string,
    storageLocation?: string
  ): Promise<{
    inStock: number;
    ordered: number;
    committed: number;
    available: number;
  }> {
    try {
      const query = storageLocation
        ? `
          SELECT 
            COALESCE(quantity, 0) as in_stock,
            COALESCE(ordered_quantity, 0) as ordered,
            COALESCE(committed_quantity, 0) + COALESCE(reserved_quantity, 0) as committed,
            COALESCE(available_quantity, 0) as available
          FROM stock_balances
          WHERE material_code = $1 AND plant_code = $2 AND storage_location = $3
        `
        : `
          SELECT 
            SUM(COALESCE(quantity, 0)) as in_stock,
            SUM(COALESCE(ordered_quantity, 0)) as ordered,
            SUM(COALESCE(committed_quantity, 0) + COALESCE(reserved_quantity, 0)) as committed,
            SUM(COALESCE(available_quantity, 0)) as available
          FROM stock_balances
          WHERE material_code = $1 AND plant_code = $2
          GROUP BY material_code, plant_code
        `;

      const params = storageLocation
        ? [materialCode, plantCode, storageLocation]
        : [materialCode, plantCode];

      const result = await this.pool.query(query, params);

      if (result.rows.length === 0) {
        return { inStock: 0, ordered: 0, committed: 0, available: 0 };
      }

      return {
        inStock: parseFloat(result.rows[0].in_stock || 0),
        ordered: parseFloat(result.rows[0].ordered || 0),
        committed: parseFloat(result.rows[0].committed || 0),
        available: parseFloat(result.rows[0].available || 0),
      };
    } catch (error) {
      console.error('Error getting inventory status:', error);
      return { inStock: 0, ordered: 0, committed: 0, available: 0 };
    }
  }

  /**
   * Recalculate available quantity based on formula:
   * Available = In Stock - Committed + Ordered
   */
  async recalculateAvailableQuantity(
    materialCode: string,
    plantCode: string,
    storageLocation: string
  ): Promise<void> {
    try {
      await this.pool.query(`
        UPDATE stock_balances
        SET available_quantity = GREATEST(0,
          COALESCE(quantity, 0)
          - COALESCE(committed_quantity, 0)
          - COALESCE(reserved_quantity, 0)
          + COALESCE(ordered_quantity, 0)
        ),
        last_updated = CURRENT_TIMESTAMP
        WHERE material_code = $1 AND plant_code = $2 AND storage_location = $3
      `, [materialCode, plantCode, storageLocation || '0001']);
    } catch (error) {
      console.error('Error recalculating available quantity:', error);
      throw error;
    }
  }
}

