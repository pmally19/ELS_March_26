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

    // Add explicit transaction keys (Debit, Credit, PRD)
    if (!availableColumns.includes('debit_transaction_key')) {
      await pool.query('ALTER TABLE movement_types ADD COLUMN debit_transaction_key character varying(10)');
      console.log('✅ Added debit_transaction_key column');
    }
    if (!availableColumns.includes('credit_transaction_key')) {
      await pool.query('ALTER TABLE movement_types ADD COLUMN credit_transaction_key character varying(10)');
      console.log('✅ Added credit_transaction_key column');
    }
    if (!availableColumns.includes('prd_transaction_key')) {
      await pool.query('ALTER TABLE movement_types ADD COLUMN prd_transaction_key character varying(10)');
      console.log('✅ Added prd_transaction_key column');
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
        mt.movement_type_code,
        mt.description,
        mt.movement_class,
        COALESCE(mt.transaction_type, 'inventory') as transaction_type,
        COALESCE(mt.inventory_direction, 'neutral') as inventory_direction,
        COALESCE(mt.company_code_id, 1) as company_code_id,
        COALESCE(mt.is_active, true) as is_active,
        -- SAP T156 context fields
        COALESCE(mt.reversal_movement_type, '') as reversal_movement_type,
        COALESCE(mt.reference_document_required, 'NONE') as reference_document_required,
        COALESCE(mt.account_assignment_mandatory, 'NONE') as account_assignment_mandatory,
        COALESCE(mt.print_control, 'N') as print_control,
        COALESCE(mt.reason_code_required, false) as reason_code_required,
        COALESCE(mt.screen_layout_variant, '') as screen_layout_variant,
        COALESCE(mt.create_fi_document, true) as create_fi_document,
        COALESCE(mt.create_material_document, true) as create_material_document,
        mt.created_at,
        mt.updated_at,
        mt.created_by,
        mt.updated_by,
        mt."_tenantId" as tenantId,
        mt."_deletedAt" as deletedAt,
        COALESCE(
          ARRAY_AGG(mttk.transaction_key ORDER BY mttk.transaction_key) FILTER (WHERE mttk.transaction_key IS NOT NULL),
          ARRAY[]::varchar[]
        ) as transaction_keys,
        -- Posting rules (T156S) aggregated
        (SELECT json_agg(pr ORDER BY pr.special_stock_ind, pr.movement_ind)
         FROM movement_posting_rules pr WHERE pr.movement_type_id = mt.id AND pr.is_active = true
        ) AS posting_rules,
        -- Allowed transactions aggregated
        (SELECT json_agg(at2.transaction_code ORDER BY at2.transaction_code)
         FROM movement_type_allowed_transactions at2
         WHERE at2.movement_type_id = mt.id AND at2.is_active = true
        ) AS allowed_transactions
      FROM movement_types mt
      LEFT JOIN movement_type_transaction_keys mttk ON mt.id = mttk.movement_type_id
      WHERE mt."_deletedAt" IS NULL
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

router.post('/movement-types', async (req: any, res) => {
  try {
    const pool = ensureActivePool();
    await ensureMovementTypesColumns(pool);

    const tenantId = req.user?.tenantId || '001';
    const userId = req.user?.id || 1;

    const {
      movementTypeCode,
      description,
      movementClass,
      transactionType,
      inventoryDirection,
      glAccountDetermination,
      transactionKey,
      debitTransactionKey,
      creditTransactionKey,
      prdTransactionKey,
      transactionKeys,   // NEW: array of transaction key codes
      documentTypeId,
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
        inventory_direction, document_type_id, company_code_id, is_active,
        "_tenantId", created_by, updated_by
      ) VALUES (
        $1::varchar, $2::text, $3::varchar, $4::varchar, 
        $5::varchar, $6::integer, $7::integer, $8::boolean,
        $9::varchar, $10::integer, $11::integer
      ) 
      RETURNING *
    `;

    const records = await pool.query(query, [
      movementTypeCode, description, movementClass, transactionType || 'inventory',
      inventoryDirection || 'neutral',
      documentTypeId ? parseInt(documentTypeId) : null,
      companyCodeId || 1, true,
      tenantId, userId, userId
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

router.put('/movement-types/:id', async (req: any, res) => {
  try {
    const pool = ensureActivePool();
    await ensureMovementTypesColumns(pool);

    const { id } = req.params;
    const userId = req.user?.id || 1;
    const {
      movementTypeCode,
      description,
      movementClass,
      transactionType,
      inventoryDirection,
      glAccountDetermination,
      transactionKey,
      debitTransactionKey,
      creditTransactionKey,
      prdTransactionKey,
      transactionKeys,
      companyCodeId,
      isActive,
      // SAP T156 context fields
      reversalMovementType,
      referenceDocumentRequired,
      accountAssignmentMandatory,
      printControl,
      reasonCodeRequired,
      screenLayoutVariant,
      createFiDocument,
      createMaterialDocument,

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
        company_code_id = COALESCE($6, company_code_id),
        is_active = COALESCE($7, is_active),
        updated_at = NOW(),
        updated_by = $8,
        -- SAP T156 context fields
        reversal_movement_type       = COALESCE($9, reversal_movement_type),
        reference_document_required  = COALESCE($10, reference_document_required),
        account_assignment_mandatory = COALESCE($11, account_assignment_mandatory),
        print_control                = COALESCE($12, print_control),
        reason_code_required         = COALESCE($13, reason_code_required),
        screen_layout_variant        = COALESCE($14, screen_layout_variant),
        create_fi_document           = COALESCE($15, create_fi_document),
        create_material_document     = COALESCE($16, create_material_document)
      WHERE id = $17  AND "_deletedAt" IS NULL
      RETURNING *
    `;

    const records = await pool.query(query, [
      movementTypeCode, description, movementClass, transactionType,
      inventoryDirection, companyCodeId, isActive,
      userId,
      // SAP T156 context fields ($9–$16)
      reversalMovementType ?? null,
      referenceDocumentRequired ?? null, accountAssignmentMandatory ?? null,
      printControl ?? null, reasonCodeRequired ?? null, screenLayoutVariant ?? null,
      createFiDocument ?? null, createMaterialDocument ?? null,
      id // $17
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

router.delete('/movement-types/:id', async (req: any, res) => {
  try {
    const pool = ensureActivePool();
    const { id } = req.params;
    const userId = req.user?.id || 1;

    const checkQuery = 'SELECT id FROM movement_types WHERE id = $1 AND "_deletedAt" IS NULL';
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

    const deleteQuery = 'UPDATE movement_types SET "_deletedAt" = NOW(), updated_by = $1, updated_at = NOW() WHERE id = $2 AND "_deletedAt" IS NULL RETURNING id, movement_type_code, description';
    const deleteResult = await pool.query(deleteQuery, [userId, id]);

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

// ─── Global Posting Rules (all movement types) ────────────────────────────────
router.get('/posting-rules', async (req, res) => {
  try {
    const pool = ensureActivePool();
    const result = await pool.query(`
      SELECT pr.*, mt.movement_type_code
      FROM movement_posting_rules pr
      JOIN movement_types mt ON mt.id = pr.movement_type_id
      WHERE pr.is_active = true
      ORDER BY mt.movement_type_code, pr.special_stock_ind, pr.movement_ind
    `);
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch posting rules', error: error.message });
  }
});

// ─── SAP T156S: Posting Rules (per movement type) ────────────────────────────
router.get('/movement-types/:id/posting-rules', async (req, res) => {
  try {
    const pool = ensureActivePool();
    const result = await pool.query(
      'SELECT * FROM movement_posting_rules WHERE movement_type_id=$1 AND is_active=true ORDER BY special_stock_ind, movement_ind',
      [req.params.id]
    );
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch posting rules', error: error.message });
  }
});

router.post('/movement-types/:id/posting-rules', async (req, res) => {
  try {
    const pool = ensureActivePool();
    const { special_stock_ind = '', movement_ind = '', value_string, quantity_update = true, value_update = true, consumption_posting = '' } = req.body;
    if (!value_string) return res.status(400).json({ message: 'value_string is required' });
    const result = await pool.query(`
      INSERT INTO movement_posting_rules (movement_type_id, special_stock_ind, movement_ind, value_string, quantity_update, value_update, consumption_posting)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      ON CONFLICT (movement_type_id, special_stock_ind, movement_ind) DO UPDATE
        SET value_string=$4, quantity_update=$5, value_update=$6, consumption_posting=$7, updated_at=NOW()
      RETURNING *
    `, [req.params.id, special_stock_ind, movement_ind, value_string, quantity_update, value_update, consumption_posting]);
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to save posting rule', error: error.message });
  }
});

router.delete('/movement-types/:id/posting-rules/:ruleId', async (req, res) => {
  try {
    const pool = ensureActivePool();
    await pool.query('DELETE FROM movement_posting_rules WHERE id=$1 AND movement_type_id=$2', [req.params.ruleId, req.params.id]);
    res.json({ message: 'Posting rule deleted' });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to delete posting rule', error: error.message });
  }
});

// ─── Allowed Transactions (per movement type) ─────────────────────────────────
router.get('/movement-types/:id/allowed-transactions', async (req, res) => {
  try {
    const pool = ensureActivePool();
    const result = await pool.query(
      'SELECT * FROM movement_type_allowed_transactions WHERE movement_type_id=$1 AND is_active=true ORDER BY transaction_code',
      [req.params.id]
    );
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch allowed transactions', error: error.message });
  }
});

router.post('/movement-types/:id/allowed-transactions', async (req, res) => {
  try {
    const pool = ensureActivePool();
    const { transaction_code, description } = req.body;
    if (!transaction_code) return res.status(400).json({ message: 'transaction_code is required' });
    const result = await pool.query(
      'INSERT INTO movement_type_allowed_transactions (movement_type_id, transaction_code, description) VALUES ($1,$2,$3) ON CONFLICT DO NOTHING RETURNING *',
      [req.params.id, transaction_code, description || null]
    );
    res.status(201).json(result.rows[0] || { message: 'already exists' });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to add allowed transaction', error: error.message });
  }
});

router.delete('/movement-types/:id/allowed-transactions/:txnId', async (req, res) => {
  try {
    const pool = ensureActivePool();
    await pool.query('DELETE FROM movement_type_allowed_transactions WHERE id=$1 AND movement_type_id=$2', [req.params.txnId, req.params.id]);
    res.json({ message: 'Removed' });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to remove allowed transaction', error: error.message });
  }
});

// ─── Value Strings (OBYC) ─────────────────────────────────────────────────────
router.get('/value-strings', async (req, res) => {
  try {
    const pool = ensureActivePool();
    const { value_string } = req.query;
    let query = 'SELECT * FROM movement_type_value_strings WHERE is_active=true';
    const params: any[] = [];
    if (value_string) { query += ' AND value_string=$1'; params.push(value_string); }
    query += ' ORDER BY value_string, sort_order';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch value strings', error: error.message });
  }
});

router.post('/value-strings', async (req, res) => {
  try {
    const pool = ensureActivePool();
    const { value_string, transaction_key, debit_credit = 'D', account_modifier = '', description = '', sort_order = 10 } = req.body;
    if (!value_string || !transaction_key) {
      return res.status(400).json({ message: 'value_string and transaction_key are required' });
    }
    const result = await pool.query(`
      INSERT INTO movement_type_value_strings (value_string, transaction_key, debit_credit, account_modifier, description, sort_order)
      VALUES ($1,$2,$3,$4,$5,$6)
      RETURNING *
    `, [value_string, transaction_key, debit_credit, account_modifier, description, sort_order]);
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to create value string', error: error.message });
  }
});

router.delete('/value-strings/:id', async (req, res) => {
  try {
    const pool = ensureActivePool();
    await pool.query('UPDATE movement_type_value_strings SET is_active=false WHERE id=$1', [req.params.id]);
    res.json({ message: 'Value string deactivated' });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to delete value string', error: error.message });
  }
});

// ─── T156S Determination Engine ───────────────────────────────────────────────
// POST /api/master-data-crud/determine-posting
// Body: { movement_type_code, special_stock_ind?, movement_ind? }
// Returns: value_string + transaction_keys (for GR/GI posting logic)
router.post('/determine-posting', async (req, res) => {
  try {
    const pool = ensureActivePool();
    const { movement_type_code, special_stock_ind = '', movement_ind = '' } = req.body;
    if (!movement_type_code) return res.status(400).json({ message: 'movement_type_code is required' });

    // Find movement type
    const mtResult = await pool.query(
      `SELECT id, movement_type_code, movement_class FROM movement_types WHERE movement_type_code=$1 AND is_active=true LIMIT 1`,
      [movement_type_code]
    );
    if (mtResult.rows.length === 0) return res.status(404).json({ message: `Movement type ${movement_type_code} not found` });
    const mt = mtResult.rows[0];

    // Find posting rule: exact match first, then fallback to wildcards
    const ruleResult = await pool.query(`
      SELECT * FROM movement_posting_rules
      WHERE movement_type_id = $1
        AND (
          (special_stock_ind = $2 AND movement_ind = $3)
          OR (special_stock_ind = ''  AND movement_ind = $3)
          OR (special_stock_ind = $2  AND movement_ind = '')
          OR (special_stock_ind = ''  AND movement_ind = '')
        )
        AND is_active = true
      ORDER BY
        CASE WHEN special_stock_ind=$2 AND movement_ind=$3 THEN 0
             WHEN special_stock_ind=$2 AND movement_ind='' THEN 1
             WHEN special_stock_ind='' AND movement_ind=$3 THEN 2
             ELSE 3 END
      LIMIT 1
    `, [mt.id, special_stock_ind, movement_ind]);

    if (ruleResult.rows.length === 0) {
      return res.status(404).json({ message: `No posting rule for ${movement_type_code} (stock='${special_stock_ind}', ind='${movement_ind}')` });
    }
    const rule = ruleResult.rows[0];

    // Get transaction keys for the determined value string
    const keysResult = await pool.query(
      'SELECT * FROM movement_type_value_strings WHERE value_string=$1 AND is_active=true ORDER BY sort_order, debit_credit',
      [rule.value_string]
    );

    res.json({
      movement_type_code,
      movement_class: mt.movement_class,
      posting_rule: rule,
      value_string: rule.value_string,
      transaction_keys: keysResult.rows,
    });
  } catch (error: any) {
    console.error('Determination engine error:', error);
    res.status(500).json({ message: 'Determination failed', error: error.message });
  }
});

// Deactivate movement type endpoint
router.put('/movement-types/:id/deactivate', async (req: any, res) => {
  try {
    const pool = ensureActivePool();
    const { id } = req.params;
    const userId = req.user?.id || 1;

    // Ensure columns exist before updating
    await ensureMovementTypesColumns(pool);

    const query = `
      UPDATE movement_types 
      SET is_active = false, active = false, updated_at = NOW(), updated_by = $2
      WHERE id = $1 AND "_deletedAt" IS NULL
      RETURNING id, movement_type_code, description, is_active
    `;

    const result = await pool.query(query, [id, userId]);

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
        cash_discount_percent,
        created_at,
        created_by,
        updated_by,
        "_tenantId",
        "_deletedAt",
        is_active
      FROM payment_terms
      WHERE "_deletedAt" IS NULL
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
      isActive: r.is_active !== undefined ? r.is_active : true,
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : null,
      updatedAt: r.created_at ? new Date(r.created_at).toISOString() : null, // Using created_at since updated_at missing in DB
      createdBy: r.created_by,
      updatedBy: r.updated_by,
      tenantId: r._tenantId,
      deletedAt: r._deletedAt
    }));
    res.json({ records });
  } catch (error) {
    console.error('Error fetching payment terms:', error);
    res.status(500).json({ message: 'Failed to fetch payment terms' });
  }
});

router.post('/payment-terms', async (req: any, res) => {
  try {
    const pool = ensureActivePool();
    let { paymentTermCode, description, dueDays, discountDays1, discountPercent1, isActive } = req.body || {};
    const tenantId = req.user?.tenantId || '001';
    const userId = req.user?.id || 1;
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
        payment_term_key, description, payment_due_days, cash_discount_days, cash_discount_percent, is_active, "_tenantId", created_by, updated_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `;
    const result = await pool.query(query, [paymentTermCode, description, dueDaysNum, discountDays1Num, discountPercent1Num, isActive !== undefined ? isActive : true, tenantId, userId, userId]);
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
      discountPercent1: Number(r.cash_discount_percent) || 0,
      isActive: r.is_active !== undefined ? r.is_active : true,
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : null,
      updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : null,
      createdBy: r.created_by,
      updatedBy: r.updated_by,
      tenantId: r._tenantId,
      deletedAt: r._deletedAt
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

router.put('/payment-terms/:id', async (req: any, res) => {
  try {
    const pool = ensureActivePool();
    const { id } = req.params;
    let { paymentTermCode, description, dueDays, discountDays1, discountPercent1, isActive } = req.body || {};
    const userId = req.user?.id || 1;

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
        cash_discount_percent = COALESCE($5, cash_discount_percent),
        is_active = COALESCE($6, is_active),
        updated_at = NOW(),
        updated_by = $7
      WHERE id = $8 AND "_deletedAt" IS NULL
      RETURNING *
    `, [codeCoerced, descCoerced, dueDaysNum, discountDays1Num, discountPercent1Num, isActive, userId, id]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Payment term not found' });
    const r = result.rows[0];
    res.json({
      id: r.id,
      paymentTermCode: r.payment_term_key,
      description: r.description || '',
      dueDays: Number(r.payment_due_days) || 0,
      discountDays1: Number(r.cash_discount_days) || 0,
      discountPercent1: Number(r.cash_discount_percent) || 0,
      isActive: r.is_active !== undefined ? r.is_active : true,
      createdAt: r.created_at ? new Date(r.created_at).toISOString() : null,
      updatedAt: r.updated_at ? new Date(r.updated_at).toISOString() : null,
      createdBy: r.created_by,
      updatedBy: r.updated_by,
      tenantId: r._tenantId,
      deletedAt: r._deletedAt
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

router.delete('/payment-terms/:id', async (req: any, res) => {
  try {
    const pool = ensureActivePool();
    const { id } = req.params;
    const userId = req.user?.id || 1;
    const result = await pool.query('UPDATE payment_terms SET "_deletedAt" = NOW(), updated_by = $1, updated_at = NOW() WHERE id = $2 AND "_deletedAt" IS NULL RETURNING id', [userId, id]);
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
    res.json(records.rows); // Return the array directly to match what the frontend expects
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
    const result = await pool.query('SELECT * FROM number_ranges ORDER BY id');
    res.json({ records: result.rows });   // ← was returning QueryResult object, now returns rows array
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

    const result = await pool.query(query, [numberRangeCode, description, numberRangeObject, fiscalYear, rangeFrom, rangeTo, currentNumber || rangeFrom, externalNumbering ?? false, bufferSize ?? 100, warningPercentage ?? 90, companyCodeId ?? 0]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating number range:', error);
    res.status(500).json({ message: 'Failed to create number range' });
  }
});

router.put('/number-ranges/:id', async (req, res) => {
  try {
    const pool = ensureActivePool();
    const { id } = req.params;
    const { numberRangeCode, description, numberRangeObject, fiscalYear, rangeFrom, rangeTo, currentNumber, externalNumbering, bufferSize, warningPercentage, companyCodeId, isActive } = req.body;

    const result = await pool.query(`
      UPDATE number_ranges SET
        number_range_code   = COALESCE($1, number_range_code),
        description         = COALESCE($2, description),
        number_range_object = COALESCE($3, number_range_object),
        fiscal_year         = COALESCE($4, fiscal_year),
        range_from          = COALESCE($5, range_from),
        range_to            = COALESCE($6, range_to),
        current_number      = COALESCE($7, current_number),
        external_numbering  = COALESCE($8, external_numbering),
        buffer_size         = COALESCE($9, buffer_size),
        warning_percentage   = COALESCE($10, warning_percentage),
        company_code_id     = COALESCE($11, company_code_id),
        is_active           = COALESCE($12, is_active),
        updated_at          = NOW()
      WHERE id = $13
      RETURNING *
    `, [numberRangeCode, description, numberRangeObject, fiscalYear, rangeFrom, rangeTo, currentNumber, externalNumbering, bufferSize, warningPercentage, companyCodeId, isActive, id]);

    if (result.rows.length === 0) return res.status(404).json({ message: 'Number range not found' });
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error updating number range:', error);
    res.status(500).json({ message: 'Failed to update number range', detail: error.message });
  }
});

router.delete('/number-ranges/:id', async (req, res) => {
  try {
    const pool = ensureActivePool();
    const { id } = req.params;
    const result = await pool.query('DELETE FROM number_ranges WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Number range not found' });
    res.json({ message: 'Number range deleted successfully', id: parseInt(id) });
  } catch (error: any) {
    console.error('Error deleting number range:', error);
    res.status(500).json({ message: 'Failed to delete number range', detail: error.message });
  }
});


// ─── Reference Tables (for all dropdown data — zero hardcoded) ────────────────

// Mount full CRUD for movement classes (existing dedicated router)
router.use('/movement-classes', movementClassesRoutes);

// GET /api/master-data-crud/transaction-keys
router.get('/transaction-keys', async (req, res) => {
  try {
    const pool = ensureActivePool();
    const result = await pool.query(
      `SELECT id, code, name, description, is_active FROM transaction_keys ORDER BY code`
    );
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch transaction keys', error: error.message });
  }
});

// GET /api/master-data-crud/movement-indicators
router.get('/movement-indicators', async (req, res) => {
  try {
    const pool = ensureActivePool();
    const result = await pool.query(
      `SELECT id, code, name, description, is_active, sort_order FROM mt_movement_indicators ORDER BY sort_order`
    );
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch movement indicators', error: error.message });
  }
});

// GET /api/master-data-crud/special-stock-types
router.get('/special-stock-types', async (req, res) => {
  try {
    const pool = ensureActivePool();
    const result = await pool.query(
      `SELECT id, code, name, description, is_active, sort_order FROM mt_special_stock_types ORDER BY sort_order`
    );
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch special stock types', error: error.message });
  }
});

// GET /api/master-data-crud/consumption-postings
router.get('/consumption-postings', async (req, res) => {
  try {
    const pool = ensureActivePool();
    const result = await pool.query(
      `SELECT id, code, name, description, is_active, sort_order FROM mt_consumption_postings ORDER BY sort_order`
    );
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch consumption postings', error: error.message });
  }
});

// GET /api/master-data-crud/account-modifiers
router.get('/account-modifiers', async (req, res) => {
  try {
    const pool = ensureActivePool();
    const result = await pool.query(
      `SELECT id, code, name, description, is_active, sort_order FROM mt_account_modifiers ORDER BY sort_order`
    );
    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch account modifiers', error: error.message });
  }
});

// GET /api/master-data-crud/inventory-directions
router.get('/inventory-directions', async (req, res) => {
  try {
    const pool = ensureActivePool();
    const result = await pool.query(
      `SELECT DISTINCT inventory_direction AS code FROM movement_types WHERE inventory_direction IS NOT NULL AND inventory_direction <> '' ORDER BY code`
    );
    // Return friendly labels along with DB values
    const labels: Record<string, string> = { increase: 'Increase (+)', decrease: 'Decrease (-)', neutral: 'Neutral' };
    res.json(result.rows.map((r: any) => ({ code: r.code, name: labels[r.code] || r.code })));
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch inventory directions', error: error.message });
  }
});

// ─── Full CRUD helpers for simple reference tables ────────────────────────────
// Pattern: GET (already above), POST, PUT/:id, DELETE/:id

// ─── Movement Indicators ──────────────────────────────────────────────────────
router.post('/movement-indicators', async (req, res) => {
  try {
    const pool = ensureActivePool();
    const { code, name, description, sort_order = 10 } = req.body;
    if (!code || !name) return res.status(400).json({ message: 'code and name are required' });
    const r = await pool.query(
      `INSERT INTO mt_movement_indicators (code, name, description, sort_order) VALUES ($1,$2,$3,$4) RETURNING *`,
      [code.toUpperCase(), name, description || null, sort_order]
    );
    res.status(201).json(r.rows[0]);
  } catch (e: any) {
    res.status(e.code === '23505' ? 400 : 500).json({ message: e.code === '23505' ? 'Code already exists' : 'Failed to create', error: e.message });
  }
});
router.put('/movement-indicators/:id', async (req, res) => {
  try {
    const pool = ensureActivePool();
    const { code, name, description, sort_order, is_active } = req.body;
    const r = await pool.query(
      `UPDATE mt_movement_indicators SET code=$1, name=$2, description=$3, sort_order=$4, is_active=$5 WHERE id=$6 RETURNING *`,
      [code, name, description || null, sort_order ?? 10, is_active ?? true, req.params.id]
    );
    if (!r.rows.length) return res.status(404).json({ message: 'Not found' });
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: 'Failed to update', error: e.message }); }
});
router.delete('/movement-indicators/:id', async (req, res) => {
  try {
    const pool = ensureActivePool();
    await pool.query(`UPDATE mt_movement_indicators SET is_active=false WHERE id=$1`, [req.params.id]);
    res.json({ message: 'Deactivated' });
  } catch (e: any) { res.status(500).json({ message: 'Failed to delete', error: e.message }); }
});

// ─── Special Stock Types ──────────────────────────────────────────────────────
router.post('/special-stock-types', async (req, res) => {
  try {
    const pool = ensureActivePool();
    const { code, name, description, sort_order = 10 } = req.body;
    if (!code || !name) return res.status(400).json({ message: 'code and name are required' });
    const r = await pool.query(
      `INSERT INTO mt_special_stock_types (code, name, description, sort_order) VALUES ($1,$2,$3,$4) RETURNING *`,
      [code.toUpperCase(), name, description || null, sort_order]
    );
    res.status(201).json(r.rows[0]);
  } catch (e: any) {
    res.status(e.code === '23505' ? 400 : 500).json({ message: e.code === '23505' ? 'Code already exists' : 'Failed to create', error: e.message });
  }
});
router.put('/special-stock-types/:id', async (req, res) => {
  try {
    const pool = ensureActivePool();
    const { code, name, description, sort_order, is_active } = req.body;
    const r = await pool.query(
      `UPDATE mt_special_stock_types SET code=$1, name=$2, description=$3, sort_order=$4, is_active=$5 WHERE id=$6 RETURNING *`,
      [code, name, description || null, sort_order ?? 10, is_active ?? true, req.params.id]
    );
    if (!r.rows.length) return res.status(404).json({ message: 'Not found' });
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: 'Failed to update', error: e.message }); }
});
router.delete('/special-stock-types/:id', async (req, res) => {
  try {
    const pool = ensureActivePool();
    await pool.query(`UPDATE mt_special_stock_types SET is_active=false WHERE id=$1`, [req.params.id]);
    res.json({ message: 'Deactivated' });
  } catch (e: any) { res.status(500).json({ message: 'Failed to delete', error: e.message }); }
});

// ─── Consumption Postings ─────────────────────────────────────────────────────
router.post('/consumption-postings', async (req, res) => {
  try {
    const pool = ensureActivePool();
    const { code, name, description, sort_order = 10 } = req.body;
    if (!code || !name) return res.status(400).json({ message: 'code and name are required' });
    const r = await pool.query(
      `INSERT INTO mt_consumption_postings (code, name, description, sort_order) VALUES ($1,$2,$3,$4) RETURNING *`,
      [code.toUpperCase(), name, description || null, sort_order]
    );
    res.status(201).json(r.rows[0]);
  } catch (e: any) {
    res.status(e.code === '23505' ? 400 : 500).json({ message: e.code === '23505' ? 'Code already exists' : 'Failed to create', error: e.message });
  }
});
router.put('/consumption-postings/:id', async (req, res) => {
  try {
    const pool = ensureActivePool();
    const { code, name, description, sort_order, is_active } = req.body;
    const r = await pool.query(
      `UPDATE mt_consumption_postings SET code=$1, name=$2, description=$3, sort_order=$4, is_active=$5 WHERE id=$6 RETURNING *`,
      [code, name, description || null, sort_order ?? 10, is_active ?? true, req.params.id]
    );
    if (!r.rows.length) return res.status(404).json({ message: 'Not found' });
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: 'Failed to update', error: e.message }); }
});
router.delete('/consumption-postings/:id', async (req, res) => {
  try {
    const pool = ensureActivePool();
    await pool.query(`UPDATE mt_consumption_postings SET is_active=false WHERE id=$1`, [req.params.id]);
    res.json({ message: 'Deactivated' });
  } catch (e: any) { res.status(500).json({ message: 'Failed to delete', error: e.message }); }
});

// ─── Account Modifiers ────────────────────────────────────────────────────────
router.post('/account-modifiers', async (req, res) => {
  try {
    const pool = ensureActivePool();
    const { code, name, description, sort_order = 10 } = req.body;
    if (!code || !name) return res.status(400).json({ message: 'code and name are required' });
    const r = await pool.query(
      `INSERT INTO mt_account_modifiers (code, name, description, sort_order) VALUES ($1,$2,$3,$4) RETURNING *`,
      [code.toUpperCase(), name, description || null, sort_order]
    );
    res.status(201).json(r.rows[0]);
  } catch (e: any) {
    res.status(e.code === '23505' ? 400 : 500).json({ message: e.code === '23505' ? 'Code already exists' : 'Failed to create', error: e.message });
  }
});
router.put('/account-modifiers/:id', async (req, res) => {
  try {
    const pool = ensureActivePool();
    const { code, name, description, sort_order, is_active } = req.body;
    const r = await pool.query(
      `UPDATE mt_account_modifiers SET code=$1, name=$2, description=$3, sort_order=$4, is_active=$5 WHERE id=$6 RETURNING *`,
      [code, name, description || null, sort_order ?? 10, is_active ?? true, req.params.id]
    );
    if (!r.rows.length) return res.status(404).json({ message: 'Not found' });
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: 'Failed to update', error: e.message }); }
});
router.delete('/account-modifiers/:id', async (req, res) => {
  try {
    const pool = ensureActivePool();
    await pool.query(`UPDATE mt_account_modifiers SET is_active=false WHERE id=$1`, [req.params.id]);
    res.json({ message: 'Deactivated' });
  } catch (e: any) { res.status(500).json({ message: 'Failed to delete', error: e.message }); }
});

// ─── Reference Documents ──────────────────────────────────────────────────────
router.get('/reference-documents', async (req, res) => {
  try {
    const pool = ensureActivePool();
    const result = await pool.query('SELECT * FROM mt_reference_documents ORDER BY sort_order ASC, code ASC');
    res.json(result.rows);
  } catch (e: any) { res.status(500).json({ message: 'Failed to fetch', error: e.message }); }
});
router.post('/reference-documents', async (req, res) => {
  try {
    const pool = ensureActivePool();
    const { code, name, description, sort_order = 10 } = req.body;
    if (!code || !name) return res.status(400).json({ message: 'code and name are required' });
    const r = await pool.query(
      `INSERT INTO mt_reference_documents (code, name, description, sort_order) VALUES ($1,$2,$3,$4) RETURNING *`,
      [code.toUpperCase(), name, description || null, sort_order]
    );
    res.status(201).json(r.rows[0]);
  } catch (e: any) {
    res.status(e.code === '23505' ? 400 : 500).json({ message: e.code === '23505' ? 'Code already exists' : 'Failed to create', error: e.message });
  }
});
router.put('/reference-documents/:id', async (req, res) => {
  try {
    const pool = ensureActivePool();
    const { code, name, description, sort_order, is_active } = req.body;
    const r = await pool.query(
      `UPDATE mt_reference_documents SET code=$1, name=$2, description=$3, sort_order=$4, is_active=$5 WHERE id=$6 RETURNING *`,
      [code, name, description || null, sort_order ?? 10, is_active ?? true, req.params.id]
    );
    if (!r.rows.length) return res.status(404).json({ message: 'Not found' });
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: 'Failed to update', error: e.message }); }
});
router.delete('/reference-documents/:id', async (req, res) => {
  try {
    const pool = ensureActivePool();
    await pool.query(`UPDATE mt_reference_documents SET is_active=false WHERE id=$1`, [req.params.id]);
    res.json({ message: 'Deactivated' });
  } catch (e: any) { res.status(500).json({ message: 'Failed to delete', error: e.message }); }
});

// ─── Account Assignments ──────────────────────────────────────────────────────
router.get('/account-assignments', async (req, res) => {
  try {
    const pool = ensureActivePool();
    const result = await pool.query('SELECT * FROM mt_account_assignments ORDER BY sort_order ASC, code ASC');
    res.json(result.rows);
  } catch (e: any) { res.status(500).json({ message: 'Failed to fetch', error: e.message }); }
});
router.post('/account-assignments', async (req, res) => {
  try {
    const pool = ensureActivePool();
    const { code, name, description, sort_order = 10 } = req.body;
    if (!code || !name) return res.status(400).json({ message: 'code and name are required' });
    const r = await pool.query(
      `INSERT INTO mt_account_assignments (code, name, description, sort_order) VALUES ($1,$2,$3,$4) RETURNING *`,
      [code.toUpperCase(), name, description || null, sort_order]
    );
    res.status(201).json(r.rows[0]);
  } catch (e: any) {
    res.status(e.code === '23505' ? 400 : 500).json({ message: e.code === '23505' ? 'Code already exists' : 'Failed to create', error: e.message });
  }
});
router.put('/account-assignments/:id', async (req, res) => {
  try {
    const pool = ensureActivePool();
    const { code, name, description, sort_order, is_active } = req.body;
    const r = await pool.query(
      `UPDATE mt_account_assignments SET code=$1, name=$2, description=$3, sort_order=$4, is_active=$5 WHERE id=$6 RETURNING *`,
      [code, name, description || null, sort_order ?? 10, is_active ?? true, req.params.id]
    );
    if (!r.rows.length) return res.status(404).json({ message: 'Not found' });
    res.json(r.rows[0]);
  } catch (e: any) { res.status(500).json({ message: 'Failed to update', error: e.message }); }
});
router.delete('/account-assignments/:id', async (req, res) => {
  try {
    const pool = ensureActivePool();
    await pool.query(`UPDATE mt_account_assignments SET is_active=false WHERE id=$1`, [req.params.id]);
    res.json({ message: 'Deactivated' });
  } catch (e: any) { res.status(500).json({ message: 'Failed to delete', error: e.message }); }
});

export default router;
