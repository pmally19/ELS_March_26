import express from 'express';
import { sql } from 'drizzle-orm';
import { ensureActivePool } from '../database';
import movementTransactionTypesRouter from './master-data-crud/movementTransactionTypesRoutes';
import movementClassesRoutes from './master-data-crud/movementClassesRoutes';

// Function to ensure modern columns exist in movement_types table
async function ensureMovementTypesColumns(pool: any) {
  try {
    // Check what columns actually exist
    const columnsResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'movement_types' AND table_schema = 'public'
    `);
    const availableColumns = columnsResult.rows.map(r => r.column_name);

    // Add movement_type_code column if it doesn't exist (copy from movement_code)
    if (!availableColumns.includes('movement_type_code') && availableColumns.includes('movement_code')) {
      await pool.query('ALTER TABLE movement_types ADD COLUMN movement_type_code character varying(3)');
      await pool.query('UPDATE movement_types SET movement_type_code = movement_code WHERE movement_code IS NOT NULL');
      await pool.query('ALTER TABLE movement_types ALTER COLUMN movement_type_code SET NOT NULL');
      console.log('✅ Added movement_type_code column');
    }

    // Add description column if it doesn't exist (copy from movement_name)
    if (!availableColumns.includes('description') && availableColumns.includes('movement_name')) {
      await pool.query('ALTER TABLE movement_types ADD COLUMN description character varying(100)');
      await pool.query('UPDATE movement_types SET description = movement_name WHERE movement_name IS NOT NULL');
      await pool.query('ALTER TABLE movement_types ALTER COLUMN description SET NOT NULL');
      console.log('✅ Added description column');
    }

    // Add movement_class column if it doesn't exist (copy from movement_category)
    if (!availableColumns.includes('movement_class') && availableColumns.includes('movement_category')) {
      await pool.query('ALTER TABLE movement_types ADD COLUMN movement_class character varying(20)');
      await pool.query('UPDATE movement_types SET movement_class = movement_category WHERE movement_category IS NOT NULL');
      await pool.query('ALTER TABLE movement_types ALTER COLUMN movement_class SET NOT NULL');
      console.log('✅ Added movement_class column');
    }

    // Add transaction_type column if it doesn't exist
    if (!availableColumns.includes('transaction_type')) {
      await pool.query('ALTER TABLE movement_types ADD COLUMN transaction_type character varying(20) DEFAULT \'inventory\'');
      console.log('✅ Added transaction_type column');
    }

    // Add inventory_direction column if it doesn't exist
    if (!availableColumns.includes('inventory_direction')) {
      await pool.query('ALTER TABLE movement_types ADD COLUMN inventory_direction character varying(10) DEFAULT \'increase\'');
      console.log('✅ Added inventory_direction column');
    }

    // Add special_stock_indicator column if it doesn't exist
    if (!availableColumns.includes('special_stock_indicator')) {
      await pool.query('ALTER TABLE movement_types ADD COLUMN special_stock_indicator character varying(10)');
      console.log('✅ Added special_stock_indicator column');
    }

    // Add valuation_impact column if it doesn't exist (copy from value_update)
    if (!availableColumns.includes('valuation_impact') && availableColumns.includes('value_update')) {
      await pool.query('ALTER TABLE movement_types ADD COLUMN valuation_impact boolean DEFAULT true');
      await pool.query('UPDATE movement_types SET valuation_impact = value_update WHERE value_update IS NOT NULL');
      console.log('✅ Added valuation_impact column');
    } else if (!availableColumns.includes('valuation_impact')) {
      await pool.query('ALTER TABLE movement_types ADD COLUMN valuation_impact boolean DEFAULT true');
      console.log('✅ Added valuation_impact column');
    }

    // Add quantity_impact column if it doesn't exist (copy from quantity_update)
    if (!availableColumns.includes('quantity_impact') && availableColumns.includes('quantity_update')) {
      await pool.query('ALTER TABLE movement_types ADD COLUMN quantity_impact boolean DEFAULT true');
      await pool.query('UPDATE movement_types SET quantity_impact = quantity_update WHERE quantity_update IS NOT NULL');
      console.log('✅ Added quantity_impact column');
    } else if (!availableColumns.includes('quantity_impact')) {
      await pool.query('ALTER TABLE movement_types ADD COLUMN quantity_impact boolean DEFAULT true');
      console.log('✅ Added quantity_impact column');
    }

    // Add gl_account_determination column if it doesn't exist
    if (!availableColumns.includes('gl_account_determination')) {
      await pool.query('ALTER TABLE movement_types ADD COLUMN gl_account_determination character varying(20)');
      console.log('✅ Added gl_account_determination column');
    }

    // Add transaction_key column if it doesn't exist (kept for backward compat)
    if (!availableColumns.includes('transaction_key')) {
      await pool.query('ALTER TABLE movement_types ADD COLUMN transaction_key character varying(3)');
      console.log('✅ Added transaction_key column');
    }

    // Add company_code_id column if it doesn't exist
    if (!availableColumns.includes('company_code_id')) {
      await pool.query('ALTER TABLE movement_types ADD COLUMN company_code_id integer DEFAULT 1');
      console.log('✅ Added company_code_id column');
    }

    // Add is_active column if it doesn't exist (copy from active)
    if (!availableColumns.includes('is_active') && availableColumns.includes('active')) {
      await pool.query('ALTER TABLE movement_types ADD COLUMN is_active boolean DEFAULT true');
      await pool.query('UPDATE movement_types SET is_active = active WHERE active IS NOT NULL');
      console.log('✅ Added is_active column');
    } else if (!availableColumns.includes('is_active')) {
      await pool.query('ALTER TABLE movement_types ADD COLUMN is_active boolean DEFAULT true');
      console.log('✅ Added is_active column');
    }

    // Create junction table for multiple transaction keys per movement type
    await pool.query(`
      CREATE TABLE IF NOT EXISTS movement_type_transaction_keys (
        id SERIAL PRIMARY KEY,
        movement_type_id INTEGER NOT NULL REFERENCES movement_types(id) ON DELETE CASCADE,
        transaction_key VARCHAR(10) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(movement_type_id, transaction_key)
      )
    `);
    // Index for fast lookup
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_mt_transaction_keys_mt_id
      ON movement_type_transaction_keys(movement_type_id)
    `);

  } catch (error: any) {
    console.warn('Error ensuring movement types columns:', error.message);
  }
}

console.log('🔧 Loading masterDataCRUDRoutes.ts...');

const router = express.Router();

// Register sub-routes
router.use('/movement-transaction-types', movementTransactionTypesRouter);
router.use('/movement-classes', movementClassesRoutes);

// Movement Types routes
router.get('/movement-types', async (req, res) => {
  try {
    const pool = ensureActivePool();
    await ensureMovementTypesColumns(pool);

    const query = `
      SELECT 
        mt.id,
        COALESCE(mt.movement_type_code, mt.movement_code) as movement_type_code,
        COALESCE(mt.description, mt.movement_name) as description,
        COALESCE(mt.movement_class, mt.movement_category) as movement_class,
        COALESCE(mt.transaction_type, 'inventory') as transaction_type,
        COALESCE(mt.inventory_direction, 
          CASE 
            WHEN mt.debit_credit_indicator = 'D' THEN 'increase'
            WHEN mt.debit_credit_indicator = 'C' THEN 'decrease'
            ELSE 'neutral'
          END
        ) as inventory_direction,
        COALESCE(mt.special_stock_indicator, '') as special_stock_indicator,
        COALESCE(mt.valuation_impact, mt.value_update, true) as valuation_impact,
        COALESCE(mt.quantity_impact, mt.quantity_update, true) as quantity_impact,
        COALESCE(mt.gl_account_determination, '') as gl_account_determination,
        COALESCE(mt.transaction_key, '') as transaction_key,
        COALESCE(mt.company_code_id, 1) as company_code_id,
        COALESCE(mt.is_active, mt.active, true) as is_active,
        mt.created_at,
        mt.updated_at,
        COALESCE(
          ARRAY_AGG(mttk.transaction_key ORDER BY mttk.transaction_key) FILTER (WHERE mttk.transaction_key IS NOT NULL),
          ARRAY[]::varchar[]
        ) as transaction_keys
      FROM movement_types mt
      LEFT JOIN movement_type_transaction_keys mttk ON mt.id = mttk.movement_type_id
      GROUP BY mt.id
      ORDER BY mt.id
    `;

    const result = await pool.query(query);
    res.json({ records: { rows: result.rows } });
  } catch (error) {
    console.error('Error fetching movement types:', error);
    res.status(500).json({ message: 'Failed to fetch movement types' });
  }
});

router.post('/movement-types', async (req, res) => {
  try {
    const pool = ensureActivePool();
    await ensureMovementTypesColumns(pool);

    const {
      movementTypeCode,
      description,
      movementClass,
      transactionType,
      inventoryDirection,
      specialStockIndicator,
      valuationImpact,
      quantityImpact,
      glAccountDetermination,
      transactionKey,
      transactionKeys,   // NEW: array of transaction key codes
      companyCodeId
    } = req.body;

    if (!movementTypeCode || !description || !movementClass) {
      return res.status(400).json({
        message: 'movementTypeCode, description, and movementClass are required'
      });
    }

    const debitCreditIndicator = inventoryDirection === 'increase' ? 'D' :
      inventoryDirection === 'decrease' ? 'C' : 'N';

    const query = `
      INSERT INTO movement_types (
        movement_type_code, description, movement_class, transaction_type,
        inventory_direction, special_stock_indicator, valuation_impact,
        quantity_impact, gl_account_determination, transaction_key, company_code_id, is_active,
        movement_code, movement_name, movement_category, debit_credit_indicator,
        quantity_update, value_update, reversal_allowed, active
      ) VALUES (
        $1::varchar, $2::text, $3::varchar, $4::varchar, $5::varchar, $6::varchar, $7::boolean, $8::boolean, $9::varchar, $14::varchar, $10::integer, $11::boolean,
        $1::varchar, $2::varchar, $3::varchar, $12::varchar, $8::boolean, $7::boolean, $13::boolean, $11::boolean
      ) 
      RETURNING *
    `;

    const records = await pool.query(query, [
      movementTypeCode, description, movementClass, transactionType || 'inventory',
      inventoryDirection || 'neutral', specialStockIndicator || '',
      valuationImpact !== undefined ? valuationImpact : true,
      quantityImpact !== undefined ? quantityImpact : true,
      glAccountDetermination || '', companyCodeId || 1, true,
      debitCreditIndicator, false, transactionKey || null
    ]);

    const newId = records.rows[0].id;

    // Insert multiple transaction keys into junction table
    const keys: string[] = Array.isArray(transactionKeys) ? transactionKeys : (transactionKey ? [transactionKey] : []);
    for (const key of keys) {
      if (key) {
        await pool.query(
          'INSERT INTO movement_type_transaction_keys (movement_type_id, transaction_key) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [newId, key]
        );
      }
    }

    res.status(201).json({ ...records.rows[0], transaction_keys: keys });
  } catch (error: any) {
    console.error('Error creating movement type:', error);
    if (error.code === '23505') {
      return res.status(400).json({ message: 'Movement type code already exists' });
    } else if (error.code === '23502') {
      return res.status(400).json({ message: 'Missing required field for movement type' });
    } else if (error.code === '23514') {
      return res.status(400).json({ message: 'Invalid data provided for movement type' });
    }
    res.status(500).json({
      message: 'Failed to create movement type',
      error: error.message,
      details: error.detail
    });
  }
});

router.put('/movement-types/:id', async (req, res) => {
  try {
    const pool = ensureActivePool();
    await ensureMovementTypesColumns(pool);

    const { id } = req.params;
    const {
      movementTypeCode,
      description,
      movementClass,
      transactionType,
      inventoryDirection,
      specialStockIndicator,
      valuationImpact,
      quantityImpact,
      glAccountDetermination,
      transactionKey,
      transactionKeys,   // NEW: array of transaction key codes
      companyCodeId,
      isActive
    } = req.body;

    const debitCreditIndicator = inventoryDirection === 'increase' ? 'D' :
      inventoryDirection === 'decrease' ? 'C' : 'N';

    const query = `
      UPDATE movement_types SET 
        movement_type_code = COALESCE($1, movement_type_code),
        description = COALESCE($2, description),
        movement_class = COALESCE($3, movement_class),
        transaction_type = COALESCE($4, transaction_type),
        inventory_direction = COALESCE($5, inventory_direction),
        special_stock_indicator = COALESCE($6, special_stock_indicator),
        valuation_impact = COALESCE($7, valuation_impact),
        quantity_impact = COALESCE($8, quantity_impact),
        gl_account_determination = COALESCE($9, gl_account_determination),
        transaction_key = COALESCE($14, transaction_key),
        company_code_id = COALESCE($10, company_code_id),
        is_active = COALESCE($11, is_active),
        movement_code = COALESCE($1, movement_code),
        movement_name = COALESCE($2, movement_name),
        movement_category = COALESCE($3, movement_category),
        debit_credit_indicator = COALESCE($12, debit_credit_indicator),
        quantity_update = COALESCE($8, quantity_update),
        value_update = COALESCE($7, value_update),
        active = COALESCE($11, active),
        updated_at = NOW()
      WHERE id = $13 
      RETURNING *
    `;

    const records = await pool.query(query, [
      movementTypeCode, description, movementClass, transactionType,
      inventoryDirection, specialStockIndicator, valuationImpact,
      quantityImpact, glAccountDetermination, companyCodeId, isActive,
      debitCreditIndicator, id, transactionKey || null
    ]);

    if (records.rows.length === 0) {
      return res.status(404).json({ message: 'Movement type not found' });
    }

    // Replace transaction keys in junction table
    const keys: string[] = Array.isArray(transactionKeys) ? transactionKeys : (transactionKey ? [transactionKey] : []);
    await pool.query('DELETE FROM movement_type_transaction_keys WHERE movement_type_id = $1', [id]);
    for (const key of keys) {
      if (key) {
        await pool.query(
          'INSERT INTO movement_type_transaction_keys (movement_type_id, transaction_key) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [id, key]
        );
      }
    }

    res.json({ ...records.rows[0], transaction_keys: keys });
  } catch (error: any) {
    console.error('Error updating movement type:', error);
    if (error.code === '23505') {
      return res.status(400).json({ message: 'Movement type code already exists' });
    } else if (error.code === '23514') {
      return res.status(400).json({ message: 'Invalid data provided for movement type' });
    }
    res.status(500).json({
      message: 'Failed to update movement type',
      error: error.message,
      details: error.detail
    });
  }
});

router.delete('/movement-types/:id', async (req, res) => {
  try {
    const pool = ensureActivePool();
    const { id } = req.params;

    const checkQuery = 'SELECT id FROM movement_types WHERE id = $1';
    const checkResult = await pool.query(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({ message: 'Movement type not found' });
    }

    const usageCheckQuery = `
      SELECT COUNT(*) as usage_count 
      FROM stock_movements 
      WHERE movement_type_id = $1
    `;

    try {
      const usageResult = await pool.query(usageCheckQuery, [id]);
      const usageCount = parseInt(usageResult.rows[0]?.usage_count || '0');

      if (usageCount > 0) {
        return res.status(400).json({
          message: `Cannot delete movement type. It is being used in ${usageCount} material movement(s). Consider deactivating instead.`
        });
      }
    } catch (usageError) {
      console.warn('Could not check movement type usage:', usageError);
    }

    // Remove transaction keys from junction table first (CASCADE handles it, but explicit is safer)
    await pool.query('DELETE FROM movement_type_transaction_keys WHERE movement_type_id = $1', [id]);

    const deleteQuery = 'DELETE FROM movement_types WHERE id = $1 RETURNING id, movement_type_code, description';
    const deleteResult = await pool.query(deleteQuery, [id]);

    res.json({
      message: 'Movement type deleted successfully',
      deletedId: deleteResult.rows[0].id,
      movementTypeCode: deleteResult.rows[0].movement_type_code,
      description: deleteResult.rows[0].description
    });
  } catch (error: any) {
    console.error('Error deleting movement type:', error);
    if (error.code === '23503') {
      return res.status(400).json({
        message: 'Cannot delete movement type. It is referenced by other records.'
      });
    }
    res.status(500).json({
      message: 'Failed to delete movement type',
      error: error.message,
      details: error.detail
    });
  }
});

// Deactivate movement type endpoint
router.put('/movement-types/:id/deactivate', async (req, res) => {
  try {
    const pool = ensureActivePool();
    const { id } = req.params;

    // Ensure columns exist before updating
    await ensureMovementTypesColumns(pool);

    const query = `
      UPDATE movement_types 
      SET is_active = false, active = false, updated_at = NOW()
      WHERE id = $1
      RETURNING id, movement_type_code, description, is_active
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Movement type not found' });
    }

    res.json({
      message: 'Movement type deactivated successfully',
      id: result.rows[0].id,
      movementTypeCode: result.rows[0].movement_type_code,
      description: result.rows[0].description,
      isActive: result.rows[0].is_active
    });
  } catch (error: any) {
    console.error('Error deactivating movement type:', error);
    res.status(500).json({
      message: 'Failed to deactivate movement type',
      error: error.message
    });
  }
});

// Price Lists routes
router.get('/price-lists', async (req, res) => {
  try {
    const pool = ensureActivePool();
    const result = await pool.query('SELECT * FROM price_lists ORDER BY id');

    // Map database columns (snake_case) to frontend format (camelCase)
    const records = (result.rows || []).map((r: any) => ({
      id: r.id,
      priceListCode: r.price_list_code,
      name: r.name,
      description: r.description || null,
      currency: r.currency,
      validFrom: r.valid_from ? new Date(r.valid_from).toISOString().split('T')[0] : null,
      validTo: r.valid_to ? new Date(r.valid_to).toISOString().split('T')[0] : null,
      priceListType: r.price_list_type || 'standard',
      isActive: r.is_active !== undefined ? r.is_active : true,
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : null,
      updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : null
    }));

    res.json(records);
  } catch (error) {
    console.error('Error fetching price lists:', error);
    res.status(500).json({ message: 'Failed to fetch price lists' });
  }
});

router.post('/price-lists', async (req, res) => {
  try {
    const pool = ensureActivePool();
    const {
      priceListCode,
      name,
      description,
      currency,
      validFrom,
      validTo,
      priceListType,
      isActive
    } = req.body;

    if (!priceListCode || !name || !currency || !validFrom) {
      return res.status(400).json({ message: 'Missing required fields: priceListCode, name, currency, validFrom' });
    }

    const query = `
      INSERT INTO price_lists (
        price_list_code, 
        name, 
        description, 
        currency, 
        valid_from, 
        valid_to,
        price_list_type,
        is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
      RETURNING *
    `;

    const result = await pool.query(query, [
      priceListCode,
      name,
      description || null,
      currency,
      validFrom,
      validTo || null,
      priceListType || 'standard',
      isActive !== undefined ? isActive : true
    ]);

    const r = result.rows[0];
    res.status(201).json({
      id: r.id,
      priceListCode: r.price_list_code,
      name: r.name,
      description: r.description || null,
      currency: r.currency,
      validFrom: r.valid_from ? new Date(r.valid_from).toISOString().split('T')[0] : null,
      validTo: r.valid_to ? new Date(r.valid_to).toISOString().split('T')[0] : null,
      priceListType: r.price_list_type || 'standard',
      isActive: r.is_active !== undefined ? r.is_active : true,
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : null,
      updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : null
    });
  } catch (error: any) {
    console.error('Error creating price list:', error);
    if (error.code === '23505') { // Unique violation
      return res.status(400).json({ message: 'Price list code already exists' });
    }
    res.status(500).json({ message: 'Failed to create price list', error: error.message });
  }
});

router.put('/price-lists/:id', async (req, res) => {
  try {
    const pool = ensureActivePool();
    const id = parseInt(req.params.id);
    const {
      priceListCode,
      name,
      description,
      currency,
      validFrom,
      validTo,
      priceListType,
      isActive
    } = req.body;

    if (!priceListCode || !name || !currency || !validFrom) {
      return res.status(400).json({ message: 'Missing required fields: priceListCode, name, currency, validFrom' });
    }

    const query = `
      UPDATE price_lists 
      SET 
        price_list_code = $1,
        name = $2,
        description = $3,
        currency = $4,
        valid_from = $5,
        valid_to = $6,
        price_list_type = $7,
        is_active = $8,
        updated_at = NOW()
      WHERE id = $9
      RETURNING *
    `;

    const result = await pool.query(query, [
      priceListCode,
      name,
      description || null,
      currency,
      validFrom,
      validTo || null,
      priceListType || 'standard',
      isActive !== undefined ? isActive : true,
      id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Price list not found' });
    }

    const r = result.rows[0];
    res.json({
      id: r.id,
      priceListCode: r.price_list_code,
      name: r.name,
      description: r.description || null,
      currency: r.currency,
      validFrom: r.valid_from ? new Date(r.valid_from).toISOString().split('T')[0] : null,
      validTo: r.valid_to ? new Date(r.valid_to).toISOString().split('T')[0] : null,
      priceListType: r.price_list_type || 'standard',
      isActive: r.is_active !== undefined ? r.is_active : true,
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : null,
      updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : null
    });
  } catch (error: any) {
    console.error('Error updating price list:', error);
    if (error.code === '23505') { // Unique violation
      return res.status(400).json({ message: 'Price list code already exists' });
    }
    res.status(500).json({ message: 'Failed to update price list', error: error.message });
  }
});

router.delete('/price-lists/:id', async (req, res) => {
  try {
    const pool = ensureActivePool();
    const id = parseInt(req.params.id);

    const result = await pool.query('DELETE FROM price_lists WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Price list not found' });
    }

    res.json({ message: 'Price list deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting price list:', error);
    res.status(500).json({ message: 'Failed to delete price list', error: error.message });
  }
});

// Payment Terms routes (mapped to existing DB columns)
router.get('/payment-terms', async (req, res) => {
  try {
    const pool = ensureActivePool();
    const result = await pool.query(`
      SELECT 
        id,
        payment_term_key,
        description,
        payment_due_days,
        cash_discount_days,
        cash_discount_percent
      FROM payment_terms
      ORDER BY id
    `);
    const records = (result.rows || []).map((r: any) => ({
      id: r.id,
      paymentTermCode: r.payment_term_key,
      description: r.description || '',
      dueDays: Number(r.payment_due_days) || 0,
      discountDays1: Number(r.cash_discount_days) || 0,
      discountPercent1: Number(r.cash_discount_percent) || 0,
      discountDays2: 0,
      discountPercent2: 0,
      baselineDate: 'document_date',
      companyCodeId: 1,
      isActive: true,
      createdAt: '',
      updatedAt: ''
    }));
    res.json({ records });
  } catch (error) {
    console.error('Error fetching payment terms:', error);
    res.status(500).json({ message: 'Failed to fetch payment terms' });
  }
});

router.post('/payment-terms', async (req, res) => {
  try {
    const pool = ensureActivePool();
    let { paymentTermCode, description, dueDays, discountDays1, discountPercent1 } = req.body || {};
    console.log('[POST /payment-terms] incoming body:', req.body);

    // Basic validation and coercion
    paymentTermCode = (paymentTermCode || '').toString().trim().toUpperCase().slice(0, 4);
    description = (description || '').toString().trim();
    const dueDaysNum = Number.isFinite(Number(dueDays)) ? parseInt(dueDays) : 0;
    const discountDays1Num = Number.isFinite(Number(discountDays1)) ? parseInt(discountDays1) : 0;
    const discountPercent1Num = Number.isFinite(Number(discountPercent1)) ? parseFloat(discountPercent1) : 0;

    if (!paymentTermCode || !description) {
      return res.status(400).json({ message: 'paymentTermCode and description are required' });
    }
    if (dueDaysNum < 0 || discountDays1Num < 0) {
      return res.status(400).json({ message: 'Days cannot be negative' });
    }
    if (discountPercent1Num < 0 || discountPercent1Num > 100) {
      return res.status(400).json({ message: 'Discount percent must be between 0 and 100' });
    }

    const query = `
      INSERT INTO payment_terms (
        payment_term_key, description, payment_due_days, cash_discount_days, cash_discount_percent, created_at
      )
      VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING *
    `;
    const result = await pool.query(query, [paymentTermCode, description, dueDaysNum, discountDays1Num, discountPercent1Num]);
    console.log('[POST /payment-terms] insert result rowCount:', result.rowCount);
    const r = result.rows?.[0];
    if (!r) {
      console.error('[POST /payment-terms] INSERT returned no row.');
      return res.status(500).json({ message: 'Failed to create payment term', detail: 'Insert returned no row' });
    }
    res.status(201).json({
      id: r.id,
      paymentTermCode: r.payment_term_key,
      description: r.description || '',
      dueDays: Number(r.payment_due_days) || 0,
      discountDays1: Number(r.cash_discount_days) || 0,
      discountPercent1: Number(r.cash_discount_percent) || 0
    });
  } catch (error: any) {
    console.error('Error creating payment term:', error);
    if (error && error.code === '23505') {
      return res.status(400).json({ message: 'Payment term code already exists' });
    }
    if (error && error.code === '23502') {
      return res.status(400).json({ message: 'Missing required field for payment term' });
    }
    if (error && error.code === '23514') {
      return res.status(400).json({ message: 'Invalid data provided for payment term' });
    }
    res.status(500).json({ message: 'Failed to create payment term', detail: error?.message });
  }
});

router.put('/payment-terms/:id', async (req, res) => {
  try {
    const pool = ensureActivePool();
    const { id } = req.params;
    let { paymentTermCode, description, dueDays, discountDays1, discountPercent1 } = req.body || {};

    // Coerce optional updates while preserving existing when null/undefined
    const codeCoerced = paymentTermCode == null ? null : (paymentTermCode || '').toString().trim().toUpperCase().slice(0, 4);
    const descCoerced = description == null ? null : (description || '').toString().trim();
    const dueDaysNum = dueDays == null ? null : (Number.isFinite(Number(dueDays)) ? parseInt(dueDays) : 0);
    const discountDays1Num = discountDays1 == null ? null : (Number.isFinite(Number(discountDays1)) ? parseInt(discountDays1) : 0);
    const discountPercent1Num = discountPercent1 == null ? null : (Number.isFinite(Number(discountPercent1)) ? parseFloat(discountPercent1) : 0);

    const result = await pool.query(`
      UPDATE payment_terms SET 
        payment_term_key = COALESCE($1, payment_term_key),
        description = COALESCE($2, description),
        payment_due_days = COALESCE($3, payment_due_days),
        cash_discount_days = COALESCE($4, cash_discount_days),
        cash_discount_percent = COALESCE($5, cash_discount_percent)
      WHERE id = $6
      RETURNING *
    `, [codeCoerced, descCoerced, dueDaysNum, discountDays1Num, discountPercent1Num, id]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Payment term not found' });
    const r = result.rows[0];
    res.json({
      id: r.id,
      paymentTermCode: r.payment_term_key,
      description: r.description || '',
      dueDays: Number(r.payment_due_days) || 0,
      discountDays1: Number(r.cash_discount_days) || 0,
      discountPercent1: Number(r.cash_discount_percent) || 0
    });
  } catch (error: any) {
    console.error('Error updating payment term:', error);
    if (error && error.code === '23505') {
      return res.status(400).json({ message: 'Payment term code already exists' });
    }
    if (error && error.code === '23514') {
      return res.status(400).json({ message: 'Invalid data provided for payment term' });
    }
    res.status(500).json({ message: 'Failed to update payment term', detail: error?.message });
  }
});

router.delete('/payment-terms/:id', async (req, res) => {
  try {
    const pool = ensureActivePool();
    const { id } = req.params;
    const result = await pool.query('DELETE FROM payment_terms WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Payment term not found' });
    res.json({ message: 'Payment term deleted successfully' });
  } catch (error) {
    console.error('Error deleting payment term:', error);
    res.status(500).json({ message: 'Failed to delete payment term' });
  }
});

// Document Types routes
router.get('/document-types', async (req, res) => {
  try {
    const pool = ensureActivePool();
    const records = await pool.query('SELECT * FROM document_types ORDER BY id');
    res.json({ records });
  } catch (error) {
    console.error('Error fetching document types:', error);
    res.status(500).json({ message: 'Failed to fetch document types' });
  }
});

router.get('/document-types/:id', async (req, res) => {
  try {
    const pool = ensureActivePool();
    const { id } = req.params;
    const records = await pool.query('SELECT * FROM document_types WHERE id = $1', [id]);

    if (records.rows.length === 0) {
      return res.status(404).json({ message: 'Document type not found' });
    }

    res.json(records.rows[0]);
  } catch (error) {
    console.error('Error fetching document type by ID:', error);
    res.status(500).json({ message: 'Failed to fetch document type' });
  }
});

router.post('/document-types', async (req, res) => {
  try {
    const pool = ensureActivePool();
    const { documentTypeCode, description, documentCategory, numberRange, reversalAllowed, accountTypesAllowed, entryView, referenceRequired, authorizationGroup, companyCodeId, isActive } = req.body;

    const query = `
      INSERT INTO document_types (document_type_code, description, document_category, number_range, reversal_allowed, account_types_allowed, entry_view, reference_required, authorization_group, company_code_id, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
      RETURNING *
    `;

    const records = await pool.query(query, [documentTypeCode, description, documentCategory, numberRange, reversalAllowed, accountTypesAllowed, entryView, referenceRequired, authorizationGroup, companyCodeId, isActive]);
    res.status(201).json(records.rows[0]);
  } catch (error) {
    console.error('Error creating document type:', error);

    // Handle specific database errors
    if (error.code === '23505') {
      res.status(400).json({ message: 'Document type with this code already exists' });
    } else if (error.code === '23514') {
      res.status(400).json({ message: 'Invalid data provided' });
    } else {
      res.status(500).json({ message: 'Failed to create document type' });
    }
  }
});

router.put('/document-types/:id', async (req, res) => {
  try {
    const pool = ensureActivePool();
    const { id } = req.params;
    const { documentTypeCode, description, documentCategory, numberRange, reversalAllowed, accountTypesAllowed, entryView, referenceRequired, authorizationGroup, companyCodeId, isActive } = req.body;

    const query = `
      UPDATE document_types 
      SET document_type_code = $1, description = $2, document_category = $3, number_range = $4, 
          reversal_allowed = $5, account_types_allowed = $6, entry_view = $7, reference_required = $8, 
          authorization_group = $9, company_code_id = $10, is_active = $11, updated_at = NOW()
      WHERE id = $12
      RETURNING *
    `;

    const records = await pool.query(query, [documentTypeCode, description, documentCategory, numberRange, reversalAllowed, accountTypesAllowed, entryView, referenceRequired, authorizationGroup, companyCodeId, isActive, id]);

    if (records.rows.length === 0) {
      return res.status(404).json({ message: 'Document type not found' });
    }

    res.json(records.rows[0]);
  } catch (error) {
    console.error('Error updating document type:', error);
    res.status(500).json({ message: 'Failed to update document type' });
  }
});

router.delete('/document-types/:id', async (req, res) => {
  try {
    const pool = ensureActivePool();
    const { id } = req.params;

    const query = 'DELETE FROM document_types WHERE id = $1 RETURNING *';
    const records = await pool.query(query, [id]);

    if (records.rows.length === 0) {
      return res.status(404).json({ message: 'Document type not found' });
    }

    res.json({ message: 'Document type deleted successfully', id: parseInt(id) });
  } catch (error) {
    console.error('Error deleting document type:', error);
    res.status(500).json({ message: 'Failed to delete document type' });
  }
});

router.put('/document-types/:id/deactivate', async (req, res) => {
  try {
    const pool = ensureActivePool();
    const { id } = req.params;

    const query = `
      UPDATE document_types 
      SET is_active = false, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const records = await pool.query(query, [id]);

    if (records.rows.length === 0) {
      return res.status(404).json({ message: 'Document type not found' });
    }

    res.json({ message: 'Document type deactivated successfully', id: parseInt(id) });
  } catch (error) {
    console.error('Error deactivating document type:', error);
    res.status(500).json({ message: 'Failed to deactivate document type' });
  }
});

// Fix sequence issue route
router.post('/document-types/fix-sequence', async (req, res) => {
  try {
    // Reset the sequence to start from the next available ID
    const query = `
      SELECT setval('document_types_id_seq', COALESCE((SELECT MAX(id) FROM document_types), 0) + 1, false)
    `;
    const pool = ensureActivePool();
    await pool.query(query);

    res.json({ message: 'Document types sequence fixed successfully' });
  } catch (error) {
    console.error('Error fixing sequence:', error);
    res.status(500).json({ message: 'Failed to fix sequence' });
  }
});

// Account Types Management Routes
router.get('/account-types', async (req, res) => {
  try {
    const pool = ensureActivePool();
    const records = await pool.query('SELECT * FROM account_types ORDER BY id');
    res.json({ records });
  } catch (error) {
    console.error('Error fetching account types:', error);
    res.status(500).json({ message: 'Failed to fetch account types' });
  }
});

router.post('/account-types', async (req, res) => {
  try {
    const pool = ensureActivePool();
    const { code, name, description, category, isActive } = req.body;

    const query = `
      INSERT INTO account_types (code, name, description, category, is_active, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW()) 
      RETURNING *
    `;

    const records = await pool.query(query, [code, name, description, category, isActive]);
    res.status(201).json(records.rows[0]);
  } catch (error) {
    console.error('Error creating account type:', error);
    res.status(500).json({ message: 'Failed to create account type' });
  }
});

router.put('/account-types/:id', async (req, res) => {
  try {
    const pool = ensureActivePool();
    const { id } = req.params;
    const { code, name, description, category, isActive } = req.body;

    const query = `
      UPDATE account_types SET 
        code = $1, name = $2, description = $3, category = $4, is_active = $5, updated_at = NOW()
      WHERE id = $6 
      RETURNING *
    `;

    const records = await pool.query(query, [code, name, description, category, isActive, id]);

    if (records.rows.length === 0) {
      return res.status(404).json({ message: 'Account type not found' });
    }

    res.json(records.rows[0]);
  } catch (error) {
    console.error('Error updating account type:', error);
    res.status(500).json({ message: 'Failed to update account type' });
  }
});

router.delete('/account-types/:id', async (req, res) => {
  try {
    const pool = ensureActivePool();
    const { id } = req.params;

    const query = 'DELETE FROM account_types WHERE id = $1 RETURNING *';
    const records = await pool.query(query, [id]);

    if (records.rows.length === 0) {
      return res.status(404).json({ message: 'Account type not found' });
    }

    res.json({ message: 'Account type deleted successfully' });
  } catch (error) {
    console.error('Error deleting account type:', error);
    res.status(500).json({ message: 'Failed to delete account type' });
  }
});

router.put('/account-types/:id/deactivate', async (req, res) => {
  try {
    const pool = ensureActivePool();
    const { id } = req.params;

    const query = `
      UPDATE account_types 
      SET is_active = false, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const records = await pool.query(query, [id]);

    if (records.rows.length === 0) {
      return res.status(404).json({ message: 'Account type not found' });
    }

    res.json({ message: 'Account type deactivated successfully', id: parseInt(id) });
  } catch (error) {
    console.error('Error deactivating account type:', error);
    res.status(500).json({ message: 'Failed to deactivate account type' });
  }
});

// Number Ranges routes
router.get('/number-ranges', async (req, res) => {
  try {
    const pool = ensureActivePool();
    const records = await pool.query('SELECT * FROM number_ranges ORDER BY id');
    res.json({ records });
  } catch (error) {
    console.error('Error fetching number ranges:', error);
    res.status(500).json({ message: 'Failed to fetch number ranges' });
  }
});

router.post('/number-ranges', async (req, res) => {
  try {
    const pool = ensureActivePool();
    const { numberRangeCode, description, numberRangeObject, fiscalYear, rangeFrom, rangeTo, currentNumber, externalNumbering, bufferSize, warningPercentage, companyCodeId } = req.body;

    const query = `
      INSERT INTO number_ranges (number_range_code, description, number_range_object, fiscal_year, range_from, range_to, current_number, external_numbering, buffer_size, warning_percentage, company_code_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
      RETURNING *
    `;

    const records = await pool.query(query, [numberRangeCode, description, numberRangeObject, fiscalYear, rangeFrom, rangeTo, currentNumber, externalNumbering, bufferSize, warningPercentage, companyCodeId]);
    res.status(201).json(records.rows[0]);
  } catch (error) {
    console.error('Error creating number range:', error);
    res.status(500).json({ message: 'Failed to create number range' });
  }
});

export default router;