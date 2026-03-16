import { Router } from 'express';
import { db } from '../../db';
import { eq, or, like } from 'drizzle-orm';
import { getPool } from "../../database";
import {
  valuationClasses, materialTypes,
  paymentTerms, incoterms, priceLists, discountGroups, creditLimitGroups,
  shippingConditions, transportationZones, routeSchedules, warehouseTypes,
  movementTypes, reasonCodes, qualityGrades, batchClasses, serialNumberProfiles,
  documentTypes, numberRanges, taxCodes, supplyTypes,
  chartOfAccounts,
  insertValuationClassesSchema,
  insertPaymentTermsSchema, insertIncotermsSchema, insertPriceListsSchema,
  insertDiscountGroupsSchema, insertCreditLimitGroupsSchema, insertShippingConditionsSchema,
  insertTransportationZonesSchema, insertRouteSchedulesSchema, insertWarehouseTypesSchema,
  insertMovementTypesSchema, insertReasonCodesSchema, insertQualityGradesSchema,
  insertBatchClassesSchema, insertSerialNumberProfilesSchema, insertDocumentTypesSchema,
  insertNumberRangesSchema, insertSupplyTypeSchema, insertTaxCodeSchema,
  insertChartOfAccountsSchema
} from '@shared/schema';
import { reconciliationAccounts, insertReconciliationAccountSchema } from '@shared/reconciliation-accounts-schema';

const router = Router();


router.get('/movement-types', async (req, res) => {
  try {
    const result = await db.execute(`
      SELECT 
        id, 
        movement_type_code as code, 
        description as name, 
        description, 
        movement_class, 
        transaction_type, 
        inventory_direction, 
        is_active 
      FROM movement_types 
      ORDER BY id
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching movement types:', error);
    res.status(500).json({ error: 'Failed to fetch movement types' });
  }
});

// Valuation Classes routes - Material valuation and pricing categorization
router.get('/valuation-classes', async (req, res) => {
  try {
    // First check if valuation_class_material_types table exists
    const tableCheck = await getPool().query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'valuation_class_material_types'
      );
    `);

    const hasMaterialTypesTable = tableCheck.rows[0]?.exists || false;

    let result;
    if (hasMaterialTypesTable) {
      // Query with material types join
      result = await getPool().query(`
        SELECT 
          vc.id,
          vc.class_code,
          vc.class_name,
          vc.description,
          vc.valuation_method,
          vc.price_control,
          COALESCE(vc.moving_price, false)::boolean as moving_price,
          COALESCE(vc.standard_price, false)::boolean as standard_price,
          COALESCE(vc.active, true)::boolean as is_active,
          vc.account_category_reference_id,
          vc.created_at,
          vc.updated_at,
          CASE 
            WHEN acr.id IS NOT NULL THEN
              json_build_object(
                'id', acr.id,
                'code', acr.code,
                'name', acr.name
              )
            ELSE NULL
          END as account_category_reference,
          COALESCE(
            json_agg(
              json_build_object(
                'id', mt.id,
                'code', mt.code,
                'description', mt.description
              )
            ) FILTER (WHERE mt.id IS NOT NULL),
            '[]'::json
          ) as allowed_material_types
        FROM valuation_classes vc
        LEFT JOIN account_category_references acr ON vc.account_category_reference_id = acr.id
        LEFT JOIN valuation_class_material_types vcmt ON vc.id = vcmt.valuation_class_id
        LEFT JOIN material_types mt ON vcmt.material_type_id = mt.id
        GROUP BY vc.id, vc.class_code, vc.class_name, vc.description, vc.valuation_method, 
                 vc.price_control, vc.moving_price, vc.standard_price, vc.active, 
                 vc.account_category_reference_id, vc.created_at, vc.updated_at, acr.id, acr.code, acr.name
        ORDER BY vc.class_code ASC
      `);
    } else {
      // Query without material types join (table doesn't exist)
      result = await getPool().query(`
        SELECT 
          vc.id,
          vc.class_code,
          vc.class_name,
          vc.description,
          vc.valuation_method,
          vc.price_control,
          COALESCE(vc.moving_price, false)::boolean as moving_price,
          COALESCE(vc.standard_price, false)::boolean as standard_price,
          COALESCE(vc.active, true)::boolean as is_active,
          vc.account_category_reference_id,
          vc.created_at,
          vc.updated_at,
          CASE 
            WHEN acr.id IS NOT NULL THEN
              json_build_object(
                'id', acr.id,
                'code', acr.code,
                'name', acr.name
              )
            ELSE NULL
          END as account_category_reference,
          '[]'::json as allowed_material_types
        FROM valuation_classes vc
        LEFT JOIN account_category_references acr ON vc.account_category_reference_id = acr.id
        ORDER BY vc.class_code ASC
      `);
    }

    // Transform the results to ensure boolean values are properly set
    const transformedRows = result.rows.map((row: any) => {
      // Debug: Log first row to see what we're getting
      if (result.rows.indexOf(row) === 0) {
        console.log('Sample row from DB:', {
          class_code: row.class_code,
          is_active_raw: row.is_active,
          is_active_type: typeof row.is_active,
          moving_price_raw: row.moving_price,
          standard_price_raw: row.standard_price
        });
      }

      return {
        ...row,
        is_active: Boolean(row.is_active === true || row.is_active === 'true' || row.is_active === 1 || row.is_active === 't' || row.is_active === 'TRUE'),
        moving_price: Boolean(row.moving_price === true || row.moving_price === 'true' || row.moving_price === 1),
        standard_price: Boolean(row.standard_price === true || row.standard_price === 'true' || row.standard_price === 1),
      };
    });

    // Debug: Log first transformed row
    if (transformedRows.length > 0) {
      console.log('Sample transformed row:', {
        class_code: transformedRows[0].class_code,
        is_active: transformedRows[0].is_active,
        is_active_type: typeof transformedRows[0].is_active
      });
    }

    res.json(transformedRows);
  } catch (error: any) {
    console.error('Error fetching valuation classes:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      hint: error.hint
    });
    res.status(500).json({
      error: 'Failed to fetch valuation classes',
      details: error.message
    });
  }
});

router.post('/valuation-classes', async (req, res) => {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');

    const {
      class_code,
      class_name,
      description,
      valuation_method,
      price_control,
      moving_price = false,
      standard_price = false,
      allowed_material_types = [],
      account_category_reference_id = null,
      is_active = true
    } = req.body;

    // Validate class_code is 4 characters or less
    if (!class_code || class_code.length > 4) {
      return res.status(400).json({ error: 'Class code must be 4 characters or less' });
    }

    // Insert valuation class
    const result = await client.query(`
      INSERT INTO valuation_classes 
      (class_code, class_name, description, valuation_method, price_control, moving_price, standard_price, account_category_reference_id, active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      class_code,
      class_name || null,
      description || null,
      valuation_method || null,
      price_control || null,
      moving_price,
      standard_price,
      account_category_reference_id,
      is_active
    ]);

    const valuationClass = result.rows[0];

    // Insert allowed material types if provided
    if (Array.isArray(allowed_material_types) && allowed_material_types.length > 0) {
      for (const materialTypeId of allowed_material_types) {
        await client.query(`
          INSERT INTO valuation_class_material_types (valuation_class_id, material_type_id)
          VALUES ($1, $2)
          ON CONFLICT (valuation_class_id, material_type_id) DO NOTHING
        `, [valuationClass.id, materialTypeId]);
      }
    }

    // Fetch with material types
    const finalResult = await client.query(`
      SELECT 
        vc.id,
        vc.class_code,
        vc.class_name,
        vc.description,
        vc.valuation_method,
        vc.price_control,
        COALESCE(vc.moving_price, false)::boolean as moving_price,
        COALESCE(vc.standard_price, false)::boolean as standard_price,
        COALESCE(vc.active, true)::boolean as is_active,
        vc.account_category_reference_id,
        vc.created_at,
        vc.updated_at,
        CASE 
          WHEN acr.id IS NOT NULL THEN
            json_build_object(
              'id', acr.id,
              'code', acr.code,
              'name', acr.name
            )
          ELSE NULL
        END as account_category_reference,
        COALESCE(
          json_agg(
            json_build_object(
              'id', mt.id,
              'code', mt.code,
              'description', mt.description
            )
          ) FILTER (WHERE mt.id IS NOT NULL),
          '[]'::json
        ) as allowed_material_types
      FROM valuation_classes vc
      LEFT JOIN account_category_references acr ON vc.account_category_reference_id = acr.id
      LEFT JOIN valuation_class_material_types vcmt ON vc.id = vcmt.valuation_class_id
      LEFT JOIN material_types mt ON vcmt.material_type_id = mt.id
      WHERE vc.id = $1
      GROUP BY vc.id, vc.class_code, vc.class_name, vc.description, vc.valuation_method, 
               vc.price_control, vc.moving_price, vc.standard_price, vc.active, 
               vc.account_category_reference_id, vc.created_at, vc.updated_at, acr.id, acr.code, acr.name
    `, [valuationClass.id]);

    await client.query('COMMIT');
    res.status(201).json(finalResult.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating valuation class:', error);
    res.status(500).json({ error: 'Failed to create valuation class' });
  } finally {
    client.release();
  }
});

router.patch('/valuation-classes/:id', async (req, res) => {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const {
      class_code,
      class_name,
      description,
      valuation_method,
      price_control,
      moving_price,
      standard_price,
      allowed_material_types,
      account_category_reference_id,
      is_active
    } = req.body;

    // Validate class_code if provided
    if (class_code && class_code.length > 4) {
      return res.status(400).json({ error: 'Class code must be 4 characters or less' });
    }

    // Build update query dynamically
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (class_code !== undefined) {
      updates.push(`class_code = $${paramCount++}`);
      values.push(class_code);
    }
    if (class_name !== undefined) {
      updates.push(`class_name = $${paramCount++}`);
      values.push(class_name);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(description);
    }
    if (valuation_method !== undefined) {
      updates.push(`valuation_method = $${paramCount++}`);
      values.push(valuation_method);
    }
    if (price_control !== undefined) {
      updates.push(`price_control = $${paramCount++}`);
      values.push(price_control);
    }
    if (moving_price !== undefined) {
      updates.push(`moving_price = $${paramCount++}`);
      values.push(moving_price);
    }
    if (standard_price !== undefined) {
      updates.push(`standard_price = $${paramCount++}`);
      values.push(standard_price);
    }
    if (is_active !== undefined) {
      updates.push(`active = $${paramCount++}`);
      values.push(is_active);
    }
    if (account_category_reference_id !== undefined) {
      updates.push(`account_category_reference_id = $${paramCount++}`);
      values.push(account_category_reference_id);
    }
    updates.push(`updated_at = CURRENT_TIMESTAMP`);

    if (updates.length > 0) {
      values.push(id);
      const result = await client.query(`
        UPDATE valuation_classes 
        SET ${updates.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `, values);

      if (result.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Valuation class not found' });
      }
    }

    // Update allowed material types if provided
    if (Array.isArray(allowed_material_types)) {
      // Delete existing relationships
      await client.query(`
        DELETE FROM valuation_class_material_types 
        WHERE valuation_class_id = $1
      `, [id]);

      // Insert new relationships
      for (const materialTypeId of allowed_material_types) {
        await client.query(`
          INSERT INTO valuation_class_material_types (valuation_class_id, material_type_id)
          VALUES ($1, $2)
        `, [id, materialTypeId]);
      }
    }

    // Fetch updated record with material types
    const finalResult = await client.query(`
      SELECT 
        vc.id,
        vc.class_code,
        vc.class_name,
        vc.description,
        vc.valuation_method,
        vc.price_control,
        COALESCE(vc.moving_price, false)::boolean as moving_price,
        COALESCE(vc.standard_price, false)::boolean as standard_price,
        COALESCE(vc.active, true)::boolean as is_active,
        vc.account_category_reference_id,
        vc.created_at,
        vc.updated_at,
        CASE 
          WHEN acr.id IS NOT NULL THEN
            json_build_object(
              'id', acr.id,
              'code', acr.code,
              'name', acr.name
            )
          ELSE NULL
        END as account_category_reference,
        COALESCE(
          json_agg(
            json_build_object(
              'id', mt.id,
              'code', mt.code,
              'description', mt.description
            )
          ) FILTER (WHERE mt.id IS NOT NULL),
          '[]'::json
        ) as allowed_material_types
      FROM valuation_classes vc
      LEFT JOIN account_category_references acr ON vc.account_category_reference_id = acr.id
      LEFT JOIN valuation_class_material_types vcmt ON vc.id = vcmt.valuation_class_id
      LEFT JOIN material_types mt ON vcmt.material_type_id = mt.id
      WHERE vc.id = $1
      GROUP BY vc.id, vc.class_code, vc.class_name, vc.description, vc.valuation_method, 
               vc.price_control, vc.moving_price, vc.standard_price, vc.active, 
               vc.account_category_reference_id, vc.created_at, vc.updated_at, acr.id, acr.code, acr.name
    `, [id]);

    await client.query('COMMIT');
    res.json(finalResult.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating valuation class:', error);
    res.status(500).json({ error: 'Failed to update valuation class' });
  } finally {
    client.release();
  }
});

router.delete('/valuation-classes/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await getPool().query('DELETE FROM valuation_classes WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Valuation class not found' });
    }

    res.json({ message: 'Valuation class deleted successfully' });
  } catch (error) {
    console.error('Error deleting valuation class:', error);
    res.status(500).json({ error: 'Failed to delete valuation class' });
  }
});

// Document Types routes (using raw SQL for column mapping)
router.get('/document-types', async (req, res) => {
  try {
    const result = await db.execute(`
      SELECT 
        id, 
        document_type_code as code, 
        description as name, 
        description, 
        document_category, 
        number_range, 
        is_active 
      FROM document_types 
      ORDER BY id
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching document types:', error);
    res.status(500).json({ error: 'Failed to fetch document types' });
  }
});

// Number Ranges routes (using raw SQL for column mapping)
router.get('/number-ranges', async (req, res) => {
  try {
    const result = await db.execute(`
      SELECT 
        id, 
        number_range_code as code, 
        description as name, 
        description, 
        number_range_object as object_type, 
        range_from as from_number, 
        range_to as to_number, 
        current_number,
        fiscal_year,
        company_code_id,
        is_active 
      FROM number_ranges 
      ORDER BY id
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching number ranges:', error);
    res.status(500).json({ error: 'Failed to fetch number ranges' });
  }
});

// Helper function to create CRUD routes for any master data table
function createMasterDataRoutes(
  tableName: string,
  table: any,
  insertSchema: any,
  router: Router
) {
  // GET all records
  router.get(`/${tableName}`, async (req, res) => {
    try {
      const records = await db.select().from(table);
      // For credit-limit-groups, ensure creditLimit field is properly mapped
      if (tableName === 'credit-limit-groups') {
        const mappedRecords = records.map((record: any) => ({
          ...record,
          creditLimit: record.creditLimit || record.credit_limit || null,
          credit_limit: undefined, // Remove snake_case version if it exists
        }));
        return res.json(mappedRecords);
      }
      res.json(records);
    } catch (error) {
      console.error(`Error fetching ${tableName}:`, error);
      res.status(500).json({ error: `Failed to fetch ${tableName}` });
    }
  });

  // GET record by ID
  router.get(`/${tableName}/:id`, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const [record] = await db.select().from(table).where(eq(table.id, id));

      if (!record) {
        return res.status(404).json({ error: `${tableName} not found` });
      }

      // For credit-limit-groups, ensure creditLimit field is properly mapped
      if (tableName === 'credit-limit-groups') {
        const mappedRecord = {
          ...record,
          creditLimit: record.creditLimit || record.credit_limit || null,
          credit_limit: undefined, // Remove snake_case version if it exists
        };
        return res.json(mappedRecord);
      }

      res.json(record);
    } catch (error) {
      console.error(`Error fetching ${tableName} by ID:`, error);
      res.status(500).json({ error: `Failed to fetch ${tableName}` });
    }
  });

  // POST new record
  router.post(`/${tableName}`, async (req, res) => {
    try {
      const validatedData = insertSchema.parse(req.body);
      const inserted = await db.insert(table).values(validatedData).returning() as any[];
      const newRecord = inserted[0];
      res.status(201).json(newRecord);
    } catch (error) {
      console.error(`Error creating ${tableName}:`, error);
      res.status(400).json({ error: `Failed to create ${tableName}`, details: error.message });
    }
  });

  // PUT update record
  router.put(`/${tableName}/:id`, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertSchema.parse(req.body);

      const updatedRes = await db
        .update(table)
        .set({ ...validatedData, updatedAt: new Date() })
        .where(eq(table.id, id))
        .returning() as any[];
      const updatedRecord = (updatedRes as any[])[0];

      if (!updatedRecord) {
        return res.status(404).json({ error: `${tableName} not found` });
      }

      res.json(updatedRecord);
    } catch (error) {
      console.error(`Error updating ${tableName}:`, error);
      res.status(400).json({ error: `Failed to update ${tableName}`, details: error.message });
    }
  });

  // DELETE record
  router.delete(`/${tableName}/:id`, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deletedRes = await db.delete(table).where(eq(table.id, id)).returning() as any[];
      const deletedRecord = deletedRes[0];

      if (!deletedRecord) {
        return res.status(404).json({ error: `${tableName} not found` });
      }

      res.json({ message: `${tableName} deleted successfully`, id });
    } catch (error) {
      console.error(`Error deleting ${tableName}:`, error);
      res.status(500).json({ error: `Failed to delete ${tableName}` });
    }
  });

  // POST bulk import
  router.post(`/${tableName}/bulk`, async (req, res) => {
    try {
      const { data } = req.body;
      if (!Array.isArray(data)) {
        return res.status(400).json({ error: 'Data must be an array' });
      }

      const validatedData = data.map(item => insertSchema.parse(item));
      const insertedRecords = await db.insert(table).values(validatedData).returning() as any[];

      res.status(201).json({
        message: `${insertedRecords.length} ${tableName} records imported successfully`,
        data: insertedRecords
      });
    } catch (error) {
      console.error(`Error bulk importing ${tableName}:`, error);
      res.status(400).json({ error: `Failed to bulk import ${tableName}`, details: error.message });
    }
  });
}

// Create routes for all 21 Master Data tables
// Chart of Accounts routes are handled by master-data-configuration-routes.ts - do not create generic routes here
// createMasterDataRoutes('chart-of-accounts', chartOfAccounts, insertChartOfAccountsSchema, router);
createMasterDataRoutes('reconciliation-accounts', reconciliationAccounts, insertReconciliationAccountSchema, router);
// valuation-classes routes are defined above with custom field mapping
createMasterDataRoutes('payment-terms', paymentTerms, insertPaymentTermsSchema, router);
createMasterDataRoutes('incoterms', incoterms, insertIncotermsSchema, router);
// Price Lists routes are handled by masterDataCRUDRoutes.ts - do not create generic routes here
// createMasterDataRoutes('price-lists', priceLists, insertPriceListsSchema, router);
createMasterDataRoutes('discount-groups', discountGroups, insertDiscountGroupsSchema, router);
createMasterDataRoutes('credit-limit-groups', creditLimitGroups, insertCreditLimitGroupsSchema, router);
createMasterDataRoutes('shipping-conditions', shippingConditions, insertShippingConditionsSchema, router);
// Transportation zones routes are handled by dedicated router in transportation-zones.ts
// createMasterDataRoutes('transportation-zones', transportationZones, insertTransportationZonesSchema, router);
// Route Schedules routes (using routings table with custom field mapping)
router.get('/route-schedules', async (req, res) => {
  try {
    const result = await getPool().query(`
      SELECT 
        routing_id as id,
        routing_code as code,
        description as name,
        description,
        routing_type as "routeType",
        routing_status as status,
        base_quantity as "baseQuantity",
        base_unit as "baseUnit",
        valid_from as "validFrom",
        created_at as "createdAt"
      FROM routings 
      ORDER BY routing_id
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching route schedules:', error);
    res.status(500).json({ error: 'Failed to fetch route schedules' });
  }
});

router.post('/route-schedules', async (req, res) => {
  try {
    const { code, name, description, routeType, status, baseQuantity, baseUnit, validFrom, materialId, plantId } = req.body;

    const result = await getPool().query(`
      INSERT INTO routings 
      (routing_code, description, routing_type, routing_status, base_quantity, base_unit, valid_from, material_id, plant_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING routing_id as id, routing_code as code, description as name, description, routing_type as "routeType", routing_status as status, base_quantity as "baseQuantity", base_unit as "baseUnit", valid_from as "validFrom", created_at as "createdAt"
    `, [code, name, description, routeType || 'PRODUCTION', status || 'ACTIVE', baseQuantity || '1.000', baseUnit || 'EA', validFrom || new Date(), materialId || 1, plantId || 1]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating route schedule:', error);
    res.status(500).json({ error: 'Failed to create route schedule' });
  }
});

router.put('/route-schedules/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      code,
      name,
      description,
      routeType,
      status,
      baseQuantity,
      baseUnit,
      validFrom
    } = req.body || {};

    // Apply safe defaults to avoid writing NULL/invalid values
    const updateCode = code;
    const updateName = name;
    const updateDescription = description;
    const updateRouteType = routeType || 'PRODUCTION';
    const updateStatus = status || 'ACTIVE';
    const updateBaseQuantity = (baseQuantity === undefined || baseQuantity === null || baseQuantity === '')
      ? '1.000'
      : String(baseQuantity);
    const updateBaseUnit = baseUnit || 'EA';
    // Normalize validFrom to a valid Date object
    let updateValidFrom: Date;
    if (validFrom) {
      const parsed = new Date(validFrom);
      updateValidFrom = isNaN(parsed.getTime()) ? new Date() : parsed;
    } else {
      updateValidFrom = new Date();
    }

    const result = await getPool().query(`
      UPDATE routings 
      SET routing_code = $1,
          description = $2,
          routing_type = $3,
          routing_status = $4,
          base_quantity = $5,
          base_unit = $6,
          valid_from = $7
      WHERE routing_id = $9
      RETURNING routing_id as id,
                routing_code as code,
                description as name,
                description,
                routing_type as "routeType",
                routing_status as status,
                base_quantity as "baseQuantity",
                base_unit as "baseUnit",
                valid_from as "validFrom",
                created_at as "createdAt"
    `, [updateCode, updateName, updateDescription, updateRouteType, updateStatus, updateBaseQuantity, updateBaseUnit, updateValidFrom, String(id)]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Route schedule not found' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error updating route schedule:', error);
    const msg = error?.message || 'Failed to update route schedule';
    res.status(500).json({ error: 'Failed to update route schedule', details: msg });
  }
});

router.delete('/route-schedules/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await getPool().query('DELETE FROM routings WHERE routing_id = $1 RETURNING routing_id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Route schedule not found' });
    }

    res.json({ message: 'Route schedule deleted successfully', id });
  } catch (error) {
    console.error('Error deleting route schedule:', error);
    res.status(500).json({ error: 'Failed to delete route schedule' });
  }
});
// Warehouse Types routes with plant join
router.get('/warehouse-types', async (req, res) => {
  try {
    const result = await getPool().query(`
      SELECT 
        wt.id,
        wt.code,
        wt.name,
        wt.plant_id as "plantId",
        wt.description,
        wt.storage_type as "storageType",
        wt.temperature_range as "temperatureRange",
        wt.special_requirements as "specialRequirements",
        wt.handling_equipment as "handlingEquipment",
        wt.is_active as "isActive",
        wt.created_at as "createdAt",
        wt.updated_at as "updatedAt",
        p.code as "plantCode",
        p.name as "plantName",
        p.address_id as "plantAddressId",
        p.company_code_id as "plantCompanyCodeId"
      FROM warehouse_types wt
      LEFT JOIN plants p ON wt.plant_id = p.id
      ORDER BY p.code, wt.code
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching warehouse types:', error);
    res.status(500).json({ error: 'Failed to fetch warehouse types' });
  }
});

router.get('/warehouse-types/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const result = await getPool().query(`
      SELECT 
        wt.id,
        wt.code,
        wt.name,
        wt.plant_id as "plantId",
        wt.description,
        wt.storage_type as "storageType",
        wt.temperature_range as "temperatureRange",
        wt.special_requirements as "specialRequirements",
        wt.handling_equipment as "handlingEquipment",
        wt.is_active as "isActive",
        wt.created_at as "createdAt",
        wt.updated_at as "updatedAt",
        p.code as "plantCode",
        p.name as "plantName"
      FROM warehouse_types wt
      LEFT JOIN plants p ON wt.plant_id = p.id
      WHERE wt.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Warehouse type not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching warehouse type by ID:', error);
    res.status(500).json({ error: 'Failed to fetch warehouse type' });
  }
});

router.post('/warehouse-types', async (req, res) => {
  try {
    const validatedData = insertWarehouseTypesSchema.parse(req.body);

    // Validate plant exists
    const plantCheck = await getPool().query(
      'SELECT id FROM plants WHERE id = $1 AND is_active = true',
      [validatedData.plantId]
    );

    if (plantCheck.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid plant ID or plant is not active' });
    }

    // Check for duplicate code within the same plant
    const duplicateCheck = await getPool().query(
      'SELECT id FROM warehouse_types WHERE plant_id = $1 AND code = $2',
      [validatedData.plantId, validatedData.code]
    );

    if (duplicateCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Warehouse type code already exists for this plant' });
    }

    const result = await getPool().query(`
      INSERT INTO warehouse_types (
        code, name, plant_id, description, storage_type, 
        temperature_range, special_requirements, handling_equipment, is_active, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      RETURNING *
    `, [
      validatedData.code,
      validatedData.name,
      validatedData.plantId,
      validatedData.description || null,
      validatedData.storageType,
      validatedData.temperatureRange || null,
      validatedData.specialRequirements || null,
      validatedData.handlingEquipment || null,
      validatedData.isActive !== false
    ]);

    const inserted = result.rows[0];

    // Fetch with plant details
    const fullResult = await getPool().query(`
      SELECT 
        wt.id,
        wt.code,
        wt.name,
        wt.plant_id as "plantId",
        wt.description,
        wt.storage_type as "storageType",
        wt.temperature_range as "temperatureRange",
        wt.special_requirements as "specialRequirements",
        wt.handling_equipment as "handlingEquipment",
        wt.is_active as "isActive",
        wt.created_at as "createdAt",
        wt.updated_at as "updatedAt",
        p.code as "plantCode",
        p.name as "plantName"
      FROM warehouse_types wt
      LEFT JOIN plants p ON wt.plant_id = p.id
      WHERE wt.id = $1
    `, [inserted.id]);

    res.status(201).json(fullResult.rows[0]);
  } catch (error: any) {
    console.error('Error creating warehouse type:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to create warehouse type', details: error.message });
  }
});

router.put('/warehouse-types/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const validatedData = insertWarehouseTypesSchema.parse(req.body);

    // Validate plant exists
    const plantCheck = await getPool().query(
      'SELECT id FROM plants WHERE id = $1 AND is_active = true',
      [validatedData.plantId]
    );

    if (plantCheck.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid plant ID or plant is not active' });
    }

    // Check for duplicate code within the same plant (excluding current record)
    const duplicateCheck = await getPool().query(
      'SELECT id FROM warehouse_types WHERE plant_id = $1 AND code = $2 AND id != $3',
      [validatedData.plantId, validatedData.code, id]
    );

    if (duplicateCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Warehouse type code already exists for this plant' });
    }

    const result = await getPool().query(`
      UPDATE warehouse_types 
      SET 
        code = $1,
        name = $2,
        plant_id = $3,
        description = $4,
        storage_type = $5,
        temperature_range = $6,
        special_requirements = $7,
        handling_equipment = $8,
        is_active = $9,
        updated_at = NOW()
      WHERE id = $10
      RETURNING *
    `, [
      validatedData.code,
      validatedData.name,
      validatedData.plantId,
      validatedData.description || null,
      validatedData.storageType,
      validatedData.temperatureRange || null,
      validatedData.specialRequirements || null,
      validatedData.handlingEquipment || null,
      validatedData.isActive !== false,
      id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Warehouse type not found' });
    }

    // Fetch with plant details
    const fullResult = await getPool().query(`
      SELECT 
        wt.id,
        wt.code,
        wt.name,
        wt.plant_id as "plantId",
        wt.description,
        wt.storage_type as "storageType",
        wt.temperature_range as "temperatureRange",
        wt.special_requirements as "specialRequirements",
        wt.handling_equipment as "handlingEquipment",
        wt.is_active as "isActive",
        wt.created_at as "createdAt",
        wt.updated_at as "updatedAt",
        p.code as "plantCode",
        p.name as "plantName"
      FROM warehouse_types wt
      LEFT JOIN plants p ON wt.plant_id = p.id
      WHERE wt.id = $1
    `, [id]);

    res.json(fullResult.rows[0]);
  } catch (error: any) {
    console.error('Error updating warehouse type:', error);
    if (error.name === 'ZodError') {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to update warehouse type', details: error.message });
  }
});

router.delete('/warehouse-types/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const result = await getPool().query(
      'DELETE FROM warehouse_types WHERE id = $1 RETURNING id',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Warehouse type not found' });
    }

    res.json({ message: 'Warehouse type deleted successfully', id });
  } catch (error: any) {
    console.error('Error deleting warehouse type:', error);
    res.status(500).json({ error: 'Failed to delete warehouse type', details: error.message });
  }
});
// Custom reason codes routes with filtering support
router.get('/reason-codes', async (req, res) => {
  try {
    const { category, active, search } = req.query;

    let query = db.select().from(reasonCodes);

    // Apply filters
    if (category) {
      query = query.where(eq(reasonCodes.reasonCategoryKey, category as string));
    }

    if (active !== undefined) {
      const isActive = active === 'true';
      query = query.where(eq(reasonCodes.isActive, isActive));
    }

    if (search) {
      // Note: This is a simplified search - in production you'd want more sophisticated search
      query = query.where(
        or(
          like(reasonCodes.name, `%${search}%`),
          like(reasonCodes.code, `%${search}%`),
          like(reasonCodes.description, `%${search}%`)
        )
      );
    }

    const records = await query;
    res.json(records);
  } catch (error) {
    console.error('Error fetching reason codes:', error);
    res.status(500).json({ error: 'Failed to fetch reason codes' });
  }
});

// GET reason code by ID
router.get('/reason-codes/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [record] = await db.select().from(reasonCodes).where(eq(reasonCodes.id, id));

    if (!record) {
      return res.status(404).json({ error: 'Reason code not found' });
    }

    res.json(record);
  } catch (error) {
    console.error('Error fetching reason code by ID:', error);
    res.status(500).json({ error: 'Failed to fetch reason code' });
  }
});

// POST create reason code
router.post('/reason-codes', async (req, res) => {
  try {
    const validatedData = insertReasonCodesSchema.parse(req.body);
    const [record] = await db.insert(reasonCodes).values(validatedData).returning();
    res.status(201).json(record);
  } catch (error) {
    console.error('Error creating reason code:', error);
    res.status(500).json({ error: 'Failed to create reason code' });
  }
});

// PUT update reason code
router.put('/reason-codes/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const validatedData = insertReasonCodesSchema.parse(req.body);

    const [record] = await db.update(reasonCodes)
      .set(validatedData)
      .where(eq(reasonCodes.id, id))
      .returning();

    if (!record) {
      return res.status(404).json({ error: 'Reason code not found' });
    }

    res.json(record);
  } catch (error) {
    console.error('Error updating reason code:', error);
    res.status(500).json({ error: 'Failed to update reason code' });
  }
});

// DELETE reason code
router.delete('/reason-codes/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const [record] = await db.delete(reasonCodes)
      .where(eq(reasonCodes.id, id))
      .returning();

    if (!record) {
      return res.status(404).json({ error: 'Reason code not found' });
    }

    res.json({ message: 'reason-codes deleted successfully', id });
  } catch (error) {
    console.error('Error deleting reason code:', error);
    res.status(500).json({ error: 'Failed to delete reason code' });
  }
});
createMasterDataRoutes('quality-grades', qualityGrades, insertQualityGradesSchema, router);
createMasterDataRoutes('batch-classes', batchClasses, insertBatchClassesSchema, router);
createMasterDataRoutes('serial-number-profiles', serialNumberProfiles, insertSerialNumberProfilesSchema, router);
createMasterDataRoutes('supply-types', supplyTypes, insertSupplyTypeSchema, router);

// Tax Codes routes - properly configured without hardcoded data
router.get('/tax-codes', async (req, res) => {
  try {
    // Check table existence to avoid 500s in new environments
    const existsRes = await getPool().query(`
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'tax_codes'
    `);
    if (existsRes.rowCount === 0) {
      return res.json([]);
    }

    // Select all relevant columns from the database with jurisdiction join
    const primary = await getPool().query(`
      SELECT 
        tc.id, 
        tc.tax_code, 
        COALESCE(tc.description, '') AS description, 
        tc.tax_rate, 
        COALESCE(tc.tax_type, '') AS tax_type,
        COALESCE(tc.country, '') AS country,
        COALESCE(tc.jurisdiction, '') AS jurisdiction,
        tc.tax_jurisdiction_id,
        tj.jurisdiction_code AS jurisdiction_code,
        tj.jurisdiction_name AS jurisdiction_name,
        tj.jurisdiction_type AS jurisdiction_type,
        COALESCE(tj.state_province, '') AS jurisdiction_state,
        tc.effective_from,
        tc.effective_to,
        COALESCE(tc.tax_account, '') AS tax_account,
        COALESCE(tc.tax_base_account, '') AS tax_base_account,
        COALESCE(tc.is_active, true) AS is_active,
        tc.company_code_id,
        tc.created_at,
        tc.updated_at
      FROM public.tax_codes tc
      LEFT JOIN public.tax_jurisdictions tj ON tc.tax_jurisdiction_id = tj.id
      ORDER BY tc.id
    `);

    const rows = primary.rows.map((r: any) => ({
      id: r.id,
      tax_code: r.tax_code,
      description: r.description || '',
      tax_rate: String(r.tax_rate ?? '0.00'),
      tax_type: r.tax_type || '',
      country: r.country || '',
      jurisdiction: r.jurisdiction || '',
      tax_jurisdiction_id: r.tax_jurisdiction_id,
      jurisdiction_code: r.jurisdiction_code || '',
      jurisdiction_name: r.jurisdiction_name || '',
      jurisdiction_type: r.jurisdiction_type || '',
      jurisdiction_state: r.jurisdiction_state || '',
      effective_from: r.effective_from ? new Date(r.effective_from).toISOString().slice(0, 10) : null,
      effective_to: r.effective_to ? new Date(r.effective_to).toISOString().slice(0, 10) : null,
      tax_account: r.tax_account || '',
      tax_base_account: r.tax_base_account || '',
      is_active: r.is_active !== false,
      company_code_id: r.company_code_id,
      created_at: r.created_at,
      updated_at: r.updated_at
    }));
    return res.json(rows);
  } catch (error: any) {
    console.error('Error fetching tax codes:', error?.message || error);
    return res.status(500).json({ error: 'Failed to fetch tax codes', details: error?.message });
  }
});

router.post('/tax-codes', async (req, res) => {
  try {
    const body = req.body || {};
    const tax_code = body.tax_code || body.taxCode;
    const description = body.description || '';
    const raw_tax_rate = body.tax_rate ?? body.taxRate;
    const tax_type = body.tax_type || body.taxType || null;
    const country = body.country || null;
    const jurisdiction = body.jurisdiction || null;
    const tax_jurisdiction_id = body.tax_jurisdiction_id || body.taxJurisdictionId || null;
    const effective_from = body.effective_from || body.effectiveFrom || null;
    const effective_to = body.effective_to || body.effectiveTo || null;
    const tax_account = body.tax_account || body.taxAccount || null;
    const tax_base_account = body.tax_base_account || body.taxBaseAccount || null;
    const is_active = body.is_active !== undefined ? !!body.is_active : true;
    const requested_company_code_id = body.company_code_id ?? body.companyCodeId ?? null;

    const normalizeRate = (val: unknown): string => {
      if (val === undefined || val === null || val === '') return '0.00';
      const cleaned = String(val).replace(/%/g, '').replace(/,/g, '').trim();
      const num = Number.parseFloat(cleaned);
      if (!Number.isFinite(num)) return '0.00';
      return num.toFixed(2);
    };
    const tax_rate = normalizeRate(raw_tax_rate);

    // Validate required fields
    const missing = [
      ['tax_code', tax_code],
      ['tax_rate', tax_rate],
      ['company_code_id', requested_company_code_id]
    ].filter(([k, v]) => v === undefined || v === null || v === '').map(([k]) => k);
    if (missing.length) {
      return res.status(400).json({ error: `Missing required fields: ${missing.join(', ')}` });
    }

    // Validate company code exists
    let company_code_id: number | null = null;
    if (requested_company_code_id !== null) {
      const ccCheck = await getPool().query(
        `SELECT id FROM public.company_codes WHERE id = $1`,
        [Number(requested_company_code_id)]
      );
      if (ccCheck.rowCount && ccCheck.rows[0]?.id) {
        company_code_id = Number(ccCheck.rows[0].id);
      } else {
        return res.status(400).json({
          error: 'Invalid company code ID. Please provide a valid company code.'
        });
      }
    }

    // Insert with all fields including tax_jurisdiction_id
    const result = await getPool().query(
      `INSERT INTO public.tax_codes 
       (tax_code, description, tax_rate, tax_type, country, jurisdiction, tax_jurisdiction_id,
        effective_from, effective_to, tax_account, tax_base_account, 
        is_active, company_code_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW()) 
       RETURNING *`,
      [
        String(tax_code).toUpperCase(),
        description,
        String(tax_rate),
        tax_type,
        country,
        jurisdiction,
        tax_jurisdiction_id,
        effective_from,
        effective_to,
        tax_account,
        tax_base_account,
        is_active,
        company_code_id
      ]
    );

    const r = result.rows[0];
    const out = {
      id: r.id,
      tax_code: r.tax_code,
      description: r.description || '',
      tax_rate: String(r.tax_rate ?? '0.00'),
      tax_type: r.tax_type || '',
      country: r.country || '',
      jurisdiction: r.jurisdiction || '',
      tax_jurisdiction_id: r.tax_jurisdiction_id,
      effective_from: r.effective_from ? new Date(r.effective_from).toISOString().slice(0, 10) : null,
      effective_to: r.effective_to ? new Date(r.effective_to).toISOString().slice(0, 10) : null,
      tax_account: r.tax_account || '',
      tax_base_account: r.tax_base_account || '',
      is_active: r.is_active !== false,
      company_code_id: r.company_code_id,
      created_at: r.created_at,
      updated_at: r.updated_at
    };
    res.status(201).json(out);
  } catch (error: any) {
    console.error('❌ Error creating tax code:', error);
    const msg = error?.message || String(error);
    if (/unique|constraint|violates|duplicate/i.test(msg)) {
      return res.status(400).json({ error: 'Tax code already exists or violates constraints', details: msg });
    }
    res.status(500).json({ error: 'Failed to create tax code', details: msg });
  }
});

// Update tax code
router.put('/tax-codes/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const body = req.body || {};
    const tax_code = body.tax_code ?? body.taxCode;
    const description = body.description;
    const raw_tax_rate = body.tax_rate ?? body.taxRate;
    const tax_type = body.tax_type ?? body.taxType;
    const country = body.country;
    const jurisdiction = body.jurisdiction;
    const effective_from = body.effective_from ?? body.effectiveFrom;
    const effective_to = body.effective_to ?? body.effectiveTo;
    const tax_account = body.tax_account ?? body.taxAccount;
    const tax_base_account = body.tax_base_account ?? body.taxBaseAccount;
    const is_active = body.is_active ?? body.isActive;
    const requested_company_code_id = body.company_code_id ?? body.companyCodeId;

    const normalizeRate = (val: unknown): string => {
      if (val === undefined || val === null || val === '') return '0.00';
      const cleaned = String(val).replace(/%/g, '').replace(/,/g, '').trim();
      const num = Number.parseFloat(cleaned);
      if (!Number.isFinite(num)) return '0.00';
      return num.toFixed(2);
    };
    const tax_rate = raw_tax_rate === undefined ? undefined : normalizeRate(raw_tax_rate);

    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (tax_code !== undefined) {
      fields.push(`tax_code = $${idx++}`);
      values.push(String(tax_code).toUpperCase());
    }
    if (description !== undefined) {
      fields.push(`description = $${idx++}`);
      values.push(description);
    }
    if (tax_rate !== undefined) {
      fields.push(`tax_rate = $${idx++}`);
      values.push(String(tax_rate));
    }
    if (tax_type !== undefined) {
      fields.push(`tax_type = $${idx++}`);
      values.push(tax_type);
    }
    if (country !== undefined) {
      fields.push(`country = $${idx++}`);
      values.push(country);
    }
    if (jurisdiction !== undefined) {
      fields.push(`jurisdiction = $${idx++}`);
      values.push(jurisdiction);
    }
    if (effective_from !== undefined) {
      fields.push(`effective_from = $${idx++}`);
      values.push(effective_from);
    }
    if (effective_to !== undefined) {
      fields.push(`effective_to = $${idx++}`);
      values.push(effective_to);
    }
    if (tax_account !== undefined) {
      fields.push(`tax_account = $${idx++}`);
      values.push(tax_account);
    }
    if (tax_base_account !== undefined) {
      fields.push(`tax_base_account = $${idx++}`);
      values.push(tax_base_account);
    }
    if (is_active !== undefined) {
      fields.push(`is_active = $${idx++}`);
      values.push(Boolean(is_active));
    }

    // Validate company code if provided
    if (requested_company_code_id !== undefined) {
      const ccCheck = await getPool().query(
        `SELECT id FROM public.company_codes WHERE id = $1`,
        [Number(requested_company_code_id)]
      );
      if (ccCheck.rowCount && ccCheck.rows[0]?.id) {
        fields.push(`company_code_id = $${idx++}`);
        values.push(Number(ccCheck.rows[0].id));
      } else {
        return res.status(400).json({
          error: 'Invalid company code ID. Please provide a valid company code.'
        });
      }
    }

    fields.push(`updated_at = NOW()`);

    if (values.length === 0 && fields.length === 1) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    const result = await getPool().query(
      `UPDATE public.tax_codes SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      [...values, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tax code not found' });
    }

    const r = result.rows[0];
    const out = {
      id: r.id,
      tax_code: r.tax_code,
      description: r.description || '',
      tax_rate: String(r.tax_rate ?? '0.00'),
      tax_type: r.tax_type || '',
      country: r.country || '',
      jurisdiction: r.jurisdiction || '',
      effective_from: r.effective_from ? new Date(r.effective_from).toISOString().slice(0, 10) : null,
      effective_to: r.effective_to ? new Date(r.effective_to).toISOString().slice(0, 10) : null,
      tax_account: r.tax_account || '',
      tax_base_account: r.tax_base_account || '',
      is_active: r.is_active !== false,
      company_code_id: r.company_code_id,
      created_at: r.created_at,
      updated_at: r.updated_at
    };
    res.json(out);
  } catch (error: any) {
    console.error('❌ Error updating tax code:', error);
    const msg = error?.message || String(error);
    if (/unique|constraint|violates|invalid input/i.test(msg)) {
      return res.status(400).json({ error: 'Failed to update tax code', details: msg });
    }
    res.status(500).json({ error: 'Failed to update tax code', details: msg });
  }
});

// Delete tax code
router.delete('/tax-codes/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const result = await getPool().query(`DELETE FROM public.tax_codes WHERE id = $1 RETURNING id`, [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tax code not found' });
    }
    res.json({ message: 'Tax code deleted successfully', id });
  } catch (error: any) {
    console.error('Error deleting tax code:', error);
    res.status(500).json({ error: 'Failed to delete tax code', details: error?.message });
  }
});

// Material Types routes (using product_types table)
router.get('/material-types', async (req, res) => {
  try {
    const pool = getPool();
    const result = await pool.query(`
      SELECT 
        pt.id,
        pt.code,
        pt.name,
        pt.description,
        pt.sort_order,
        pt.is_active,
        pt.number_range_code,
        pt.valuation_class_id,
        vc.class_code as valuation_class_code,
        vc.description as valuation_class_description,
        pt.account_category_reference_id,
        acr.code as account_category_reference_code,
        acr.name as account_category_reference_name,
        pt.inventory_management_enabled,
        pt.quantity_update_enabled,
        pt.value_update_enabled,
        pt.price_control,
        pt.material_category,
        pt.allow_batch_management,
        pt.allow_serial_number,
        pt.allow_negative_stock,
        pt.default_base_unit,
        pt.default_mrp_type,
        pt.default_procurement_type,
        pt.default_lot_size,
        pt.default_valuation_class,
        pt.default_price_control,
        pt.default_material_group,
        pt.default_industry_sector,
        pt.created_at,
        pt.updated_at
      FROM product_types pt
      LEFT JOIN valuation_classes vc ON pt.valuation_class_id = vc.id
      LEFT JOIN account_category_references acr ON pt.account_category_reference_id = acr.id
      WHERE pt.is_active = true
      ORDER BY pt.sort_order, pt.name
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching material types:', error);
    res.status(500).json({ error: 'Failed to fetch material types' });
  }
});

router.post('/material-types', async (req, res) => {
  try {
    const pool = getPool();
    const {
      code,
      name,
      description,
      sort_order,
      number_range_code,
      valuation_class_id,
      account_category_reference_id,
      inventory_management_enabled,
      quantity_update_enabled,
      value_update_enabled,
      price_control,
      material_category,
      allow_batch_management,
      allow_serial_number,
      allow_negative_stock
    } = req.body;

    const result = await pool.query(`
      INSERT INTO product_types (
        code, name, description, sort_order, is_active, 
        number_range_code, valuation_class_id, account_category_reference_id,
        inventory_management_enabled, quantity_update_enabled, value_update_enabled,
        price_control, material_category,
        allow_batch_management, allow_serial_number, allow_negative_stock,
        created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, true, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW())
      RETURNING *
    `, [
      code,
      name,
      description,
      sort_order || 0,
      number_range_code || null,
      valuation_class_id || null,
      account_category_reference_id || null,
      inventory_management_enabled !== false,
      quantity_update_enabled !== false,
      value_update_enabled !== false,
      price_control || 'STANDARD',
      material_category || null,
      allow_batch_management === true,
      allow_serial_number === true,
      allow_negative_stock === true
    ]);

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating material type:', error);
    res.status(400).json({ error: 'Failed to create material type', details: error.message });
  }
});

router.put('/material-types/:id', async (req, res) => {
  try {
    const pool = getPool();
    const { id } = req.params;
    const {
      code,
      name,
      description,
      sort_order,
      is_active,
      number_range_code,
      valuation_class_id,
      account_category_reference_id,
      inventory_management_enabled,
      quantity_update_enabled,
      value_update_enabled,
      price_control,
      material_category,
      allow_batch_management,
      allow_serial_number,
      allow_negative_stock
    } = req.body;

    const result = await pool.query(`
      UPDATE product_types 
      SET 
        code = $1, 
        name = $2, 
        description = $3, 
        sort_order = $4, 
        is_active = $5,
        number_range_code = $6,
        valuation_class_id = $7,
        account_category_reference_id = $8,
        inventory_management_enabled = $9,
        quantity_update_enabled = $10,
        value_update_enabled = $11,
        price_control = $12,
        material_category = $13,
        allow_batch_management = $14,
        allow_serial_number = $15,
        allow_negative_stock = $16,
        updated_at = NOW()
      WHERE id = $17
      RETURNING *
    `, [
      code,
      name,
      description,
      sort_order || 0,
      is_active !== false,
      number_range_code || null,
      valuation_class_id || null,
      account_category_reference_id || null,
      inventory_management_enabled !== false,
      quantity_update_enabled !== false,
      value_update_enabled !== false,
      price_control || 'STANDARD',
      material_category || null,
      allow_batch_management === true,
      allow_serial_number === true,
      allow_negative_stock === true,
      id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Material type not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating material type:', error);
    res.status(400).json({ error: 'Failed to update material type', details: error.message });
  }
});

router.delete('/material-types/:id', async (req, res) => {
  try {
    const pool = getPool();
    const { id } = req.params;

    // Check if material type exists
    const existingResult = await pool.query('SELECT id FROM product_types WHERE id = $1', [id]);

    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Material type not found' });
    }

    // Soft delete by setting is_active to false
    await pool.query('UPDATE product_types SET is_active = false, updated_at = NOW() WHERE id = $1', [id]);

    res.json({ message: 'Material type deleted successfully' });
  } catch (error) {
    console.error('Error deleting material type:', error);
    res.status(500).json({ error: 'Failed to delete material type', details: error.message });
  }
});

// Parent Categories routes (top-level categories only - parent_id IS NULL)
router.get('/parent-categories', async (req, res) => {
  try {
    const pool = getPool();
    const { active } = req.query;

    // Build query with strict filtering - ONLY categories with parent_id IS NULL
    // This ensures only true parent categories (top-level) are returned
    let query = `
      SELECT 
        id,
        code,
        name,
        description,
        active,
        created_at,
        updated_at
      FROM material_categories 
      WHERE parent_id IS NULL
    `;

    const params: any[] = [];
    if (active !== undefined) {
      query += ` AND active = $1`;
      params.push(active === 'true');
    } else {
      // Default: show only active categories
      query += ` AND active = true`;
    }

    query += ` ORDER BY code, name`;

    const result = await pool.query(query, params);

    // Double-check: Filter out any categories that might have parent_id set (defensive programming)
    const parentCategoriesOnly = result.rows.filter(row => row.parent_id === null || row.parent_id === undefined);

    res.json(parentCategoriesOnly);
  } catch (error: any) {
    console.error('Error fetching parent categories:', error);
    res.status(500).json({ error: 'Failed to fetch parent categories', details: error.message });
  }
});

router.get('/parent-categories/:id', async (req, res) => {
  try {
    const pool = getPool();
    const { id } = req.params;

    const categoryId = parseInt(id);
    if (isNaN(categoryId)) {
      return res.status(400).json({ error: 'Invalid category ID' });
    }

    const result = await pool.query(`
      SELECT 
        id,
        code,
        name,
        description,
        active,
        created_at,
        updated_at
      FROM material_categories 
      WHERE id = $1 AND parent_id IS NULL
    `, [categoryId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Parent category not found' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error fetching parent category:', error);
    res.status(500).json({ error: 'Failed to fetch parent category', details: error.message });
  }
});

router.post('/parent-categories', async (req, res) => {
  try {
    const pool = getPool();
    let { code, name, description, active } = req.body;

    // Validate required fields
    if (!code || !name) {
      return res.status(400).json({ error: 'Code and name are required' });
    }

    // Normalize code: trim, uppercase, max 10 characters
    code = String(code).trim().toUpperCase().substring(0, 10);
    if (code.length < 2) {
      return res.status(400).json({ error: 'Code must be at least 2 characters' });
    }

    // Normalize name: trim, max 100 characters
    name = String(name).trim().substring(0, 100);
    if (name.length < 1) {
      return res.status(400).json({ error: 'Name is required' });
    }

    // Check if code already exists (case-insensitive)
    const existingCheck = await pool.query(
      'SELECT id, code FROM material_categories WHERE UPPER(code) = $1',
      [code]
    );

    if (existingCheck.rows.length > 0) {
      return res.status(400).json({
        error: 'Parent category with this code already exists',
        existingCode: existingCheck.rows[0].code
      });
    }

    // Parent categories must have parent_id = NULL
    const result = await pool.query(`
      INSERT INTO material_categories (code, name, description, parent_id, active, created_at, updated_at)
      VALUES ($1, $2, $3, NULL, $4, NOW(), NOW())
      RETURNING *
    `, [code, name, description || null, active !== false]);

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Error creating parent category:', error);
    if (error.code === '23505') { // Unique violation
      return res.status(400).json({ error: 'Parent category with this code already exists' });
    }
    if (error.code === '23514') { // Check constraint violation
      return res.status(400).json({ error: 'Invalid data: check constraint violation', details: error.message });
    }
    res.status(500).json({ error: 'Failed to create parent category', details: error.message });
  }
});

router.put('/parent-categories/:id', async (req, res) => {
  try {
    const pool = getPool();
    const { id } = req.params;
    let { code, name, description, active } = req.body;

    // Validate ID
    const categoryId = parseInt(id);
    if (isNaN(categoryId)) {
      return res.status(400).json({ error: 'Invalid category ID' });
    }

    // Validate required fields
    if (!code || !name) {
      return res.status(400).json({ error: 'Code and name are required' });
    }

    // Normalize code: trim, uppercase, max 10 characters
    code = String(code).trim().toUpperCase().substring(0, 10);
    if (code.length < 2) {
      return res.status(400).json({ error: 'Code must be at least 2 characters' });
    }

    // Normalize name: trim, max 100 characters
    name = String(name).trim().substring(0, 100);
    if (name.length < 1) {
      return res.status(400).json({ error: 'Name is required' });
    }

    // Check if category exists and is a parent category (parent_id IS NULL)
    const existingCheck = await pool.query(
      'SELECT id, code, parent_id FROM material_categories WHERE id = $1',
      [categoryId]
    );

    if (existingCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Parent category not found' });
    }

    if (existingCheck.rows[0].parent_id !== null) {
      return res.status(400).json({ error: 'This category is not a parent category (it has a parent)' });
    }

    // Check if code already exists for a different category (case-insensitive)
    const codeCheck = await pool.query(
      'SELECT id, code FROM material_categories WHERE UPPER(code) = $1 AND id != $2',
      [code, categoryId]
    );

    if (codeCheck.rows.length > 0) {
      return res.status(400).json({
        error: 'Parent category with this code already exists',
        existingCode: codeCheck.rows[0].code
      });
    }

    // Ensure parent_id remains NULL for parent categories
    const result = await pool.query(`
      UPDATE material_categories 
      SET code = $1, name = $2, description = $3, active = $4, parent_id = NULL, updated_at = NOW()
      WHERE id = $5 AND parent_id IS NULL
      RETURNING *
    `, [code, name, description || null, active !== false, categoryId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Parent category not found or is not a top-level category' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error updating parent category:', error);
    if (error.code === '23505') { // Unique violation
      return res.status(400).json({ error: 'Parent category with this code already exists' });
    }
    if (error.code === '23514') { // Check constraint violation
      return res.status(400).json({ error: 'Invalid data: check constraint violation', details: error.message });
    }
    res.status(500).json({ error: 'Failed to update parent category', details: error.message });
  }
});

router.delete('/parent-categories/:id', async (req, res) => {
  try {
    const pool = getPool();
    const { id } = req.params;

    // Validate ID
    const categoryId = parseInt(id);
    if (isNaN(categoryId)) {
      return res.status(400).json({ error: 'Invalid category ID' });
    }

    // Check if parent category exists and is top-level
    const existingResult = await pool.query(
      'SELECT id, code, name FROM material_categories WHERE id = $1 AND parent_id IS NULL',
      [categoryId]
    );

    if (existingResult.rows.length === 0) {
      // Check if it exists but has a parent
      const existsWithParent = await pool.query(
        'SELECT id, code, name, parent_id FROM material_categories WHERE id = $1',
        [categoryId]
      );

      if (existsWithParent.rows.length > 0) {
        return res.status(400).json({
          error: 'This category is not a parent category (it has a parent)',
          category: existsWithParent.rows[0]
        });
      }

      return res.status(404).json({ error: 'Parent category not found' });
    }

    // Check if category has active child categories
    const childCheck = await pool.query(
      'SELECT COUNT(*) as count FROM material_categories WHERE parent_id = $1 AND active = true',
      [categoryId]
    );
    const activeChildCount = parseInt(childCheck.rows[0].count);

    if (activeChildCount > 0) {
      return res.status(400).json({
        error: 'Cannot delete parent category with active child categories',
        activeChildCount: activeChildCount
      });
    }

    // Check if category has any child categories (including inactive)
    const allChildCheck = await pool.query(
      'SELECT COUNT(*) as count FROM material_categories WHERE parent_id = $1',
      [categoryId]
    );
    const totalChildCount = parseInt(allChildCheck.rows[0].count);

    // Soft delete by setting active to false
    await pool.query(
      'UPDATE material_categories SET active = false, updated_at = NOW() WHERE id = $1',
      [categoryId]
    );

    res.json({
      message: 'Parent category deleted successfully',
      hadChildCategories: totalChildCount > 0,
      childCategoryCount: totalChildCount
    });
  } catch (error: any) {
    console.error('Error deleting parent category:', error);
    res.status(500).json({ error: 'Failed to delete parent category', details: error.message });
  }
});

// Material Categories routes
router.get('/material-categories', async (req, res) => {
  try {
    const pool = getPool();
    const { active, parent_only } = req.query;

    // Build query - Material Categories shows ALL categories (both parent and child)
    let query = `
      SELECT 
        mc.id,
        mc.code,
        mc.name,
        mc.description,
        mc.parent_id,
        mc.active,
        mc.created_at,
        mc.updated_at,
        parent.code as parent_code,
        parent.name as parent_name
      FROM material_categories mc
      LEFT JOIN material_categories parent ON mc.parent_id = parent.id
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramIndex = 1;

    // Optional active filter
    if (active !== undefined) {
      query += ` AND mc.active = $${paramIndex}`;
      params.push(active === 'true');
      paramIndex++;
    }

    // Optional parent_only filter (for specific use cases)
    if (parent_only === 'true') {
      query += ` AND mc.parent_id IS NULL`;
    }

    query += ` ORDER BY mc.parent_id NULLS FIRST, mc.code, mc.name`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching material categories:', error);
    res.status(500).json({ error: 'Failed to fetch material categories', details: error.message });
  }
});

router.post('/material-categories', async (req, res) => {
  try {
    const pool = getPool();
    const { code, name, description, parent_id } = req.body;

    if (!code || !name) {
      return res.status(400).json({ error: 'Code and name are required' });
    }

    const result = await pool.query(`
      INSERT INTO material_categories (code, name, description, parent_id, active, created_at, updated_at)
      VALUES ($1, $2, $3, $4, true, NOW(), NOW())
      RETURNING *
    `, [code, name, description || null, parent_id || null]);

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Error creating material category:', error);
    if (error.code === '23505') { // Unique violation
      return res.status(400).json({ error: 'Material category with this code already exists' });
    }
    res.status(400).json({ error: 'Failed to create material category', details: error.message });
  }
});

router.put('/material-categories/:id', async (req, res) => {
  try {
    const pool = getPool();
    const { id } = req.params;
    const { code, name, description, parent_id, active } = req.body;

    if (!code || !name) {
      return res.status(400).json({ error: 'Code and name are required' });
    }

    const result = await pool.query(`
      UPDATE material_categories 
      SET code = $1, name = $2, description = $3, parent_id = $4, active = $5, updated_at = NOW()
      WHERE id = $6
      RETURNING *
    `, [code, name, description || null, parent_id || null, active !== false, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Material category not found' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error updating material category:', error);
    if (error.code === '23505') { // Unique violation
      return res.status(400).json({ error: 'Material category with this code already exists' });
    }
    res.status(400).json({ error: 'Failed to update material category', details: error.message });
  }
});

router.delete('/material-categories/:id', async (req, res) => {
  try {
    const pool = getPool();
    const { id } = req.params;

    // Check if material category exists
    const existingResult = await pool.query('SELECT id FROM material_categories WHERE id = $1', [id]);

    if (existingResult.rows.length === 0) {
      return res.status(404).json({ error: 'Material category not found' });
    }

    // Check if category has child categories
    const childCheck = await pool.query('SELECT COUNT(*) as count FROM material_categories WHERE parent_id = $1', [id]);
    if (parseInt(childCheck.rows[0].count) > 0) {
      return res.status(400).json({ error: 'Cannot delete material category with child categories' });
    }

    // Soft delete by setting active to false
    await pool.query('UPDATE material_categories SET active = false, updated_at = NOW() WHERE id = $1', [id]);

    res.json({ message: 'Material category deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting material category:', error);
    res.status(500).json({ error: 'Failed to delete material category', details: error.message });
  }
});

// PO Document Types routes
import poDocumentTypesRoutes from './po-document-types';
router.use('/po-document-types', poDocumentTypesRoutes);

// Interest Calculators routes
import interestCalculatorsRoutes from './interest-calculators';
router.use('/interest-calculators', interestCalculatorsRoutes);

export default router;
