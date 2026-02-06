import { Router, Request, Response } from 'express';
import { pool } from '../../db';
import { z } from 'zod';

const router = Router();

// Item Categories

// GET all item categories
router.get('/item-categories', async (req: Request, res: Response) => {
  try {
    const { active } = req.query;

    let query = `
      SELECT 
        id, code, name, description, category_type, is_active,
        created_at, updated_at, created_by, updated_by
      FROM document_splitting_item_categories
      WHERE 1=1
    `;

    const params: any[] = [];
    if (active !== undefined) {
      query += ` AND is_active = $1`;
      params.push(active === 'true');
    }

    query += ` ORDER BY code`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching item categories:', error);
    res.status(500).json({ error: 'Failed to fetch item categories', message: error.message });
  }
});

// POST create item category
router.post('/item-categories', async (req: Request, res: Response) => {
  try {
    const { code, name, description, category_type } = req.body;

    if (!code || !name || !category_type) {
      return res.status(400).json({ error: 'Code, name, and category_type are required' });
    }

    const result = await pool.query(`
      INSERT INTO document_splitting_item_categories (
        code, name, description, category_type, is_active, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, true, NOW(), NOW())
      RETURNING *
    `, [code, name, description || null, category_type]);

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Error creating item category:', error);
    if (error.code === '23505') {
      res.status(409).json({ error: 'Item category with this code already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create item category', message: error.message });
    }
  }
});

// PUT update item category
router.put('/item-categories/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { code, name, description, category_type, is_active } = req.body;

    if (!code || !name || !category_type) {
      return res.status(400).json({ error: 'Code, name, and category_type are required' });
    }

    const result = await pool.query(`
      UPDATE document_splitting_item_categories
      SET code = $1, name = $2, description = $3, category_type = $4, 
          is_active = $5, updated_at = NOW()
      WHERE id = $6
      RETURNING *
    `, [code, name, description || null, category_type, is_active !== undefined ? is_active : true, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item category not found' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error updating item category:', error);
    if (error.code === '23505') {
      res.status(409).json({ error: 'Item category with this code already exists' });
    } else {
      res.status(500).json({ error: 'Failed to update item category', message: error.message });
    }
  }
});

// DELETE item category (soft delete)
router.delete('/item-categories/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      UPDATE document_splitting_item_categories
      SET is_active = false, updated_at = NOW()
      WHERE id = $1
      RETURNING id
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item category not found' });
    }

    res.json({ message: 'Item category deactivated successfully' });
  } catch (error: any) {
    console.error('Error deleting item category:', error);
    res.status(500).json({ error: 'Failed to delete item category', message: error.message });
  }
});

// Business Transactions

// GET all business transactions
router.get('/business-transactions', async (req: Request, res: Response) => {
  try {
    const { active } = req.query;

    let query = `
      SELECT 
        id, code, name, description, transaction_type, is_active,
        created_at, updated_at, created_by, updated_by
      FROM document_splitting_business_transactions
      WHERE 1=1
    `;

    const params: any[] = [];
    if (active !== undefined) {
      query += ` AND is_active = $1`;
      params.push(active === 'true');
    }

    query += ` ORDER BY code`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching business transactions:', error);
    res.status(500).json({ error: 'Failed to fetch business transactions', message: error.message });
  }
});

// POST create business transaction
router.post('/business-transactions', async (req: Request, res: Response) => {
  try {
    const { code, name, description, transaction_type } = req.body;

    if (!code || !name || !transaction_type) {
      return res.status(400).json({ error: 'Code, name, and transaction_type are required' });
    }

    const result = await pool.query(`
      INSERT INTO document_splitting_business_transactions (
        code, name, description, transaction_type, is_active, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, true, NOW(), NOW())
      RETURNING *
    `, [code, name, description || null, transaction_type]);

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Error creating business transaction:', error);
    if (error.code === '23505') {
      res.status(409).json({ error: 'Business transaction with this code already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create business transaction', message: error.message });
    }
  }
});

// PUT update business transaction
router.put('/business-transactions/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { code, name, description, transaction_type, is_active } = req.body;

    if (!code || !name || !transaction_type) {
      return res.status(400).json({ error: 'Code, name, and transaction_type are required' });
    }

    const result = await pool.query(`
      UPDATE document_splitting_business_transactions
      SET code = $1, name = $2, description = $3, transaction_type = $4,
          is_active = $5, updated_at = NOW()
      WHERE id = $6
      RETURNING *
    `, [code, name, description || null, transaction_type, is_active !== undefined ? is_active : true, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Business transaction not found' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error updating business transaction:', error);
    if (error.code === '23505') {
      res.status(409).json({ error: 'Business transaction with this code already exists' });
    } else {
      res.status(500).json({ error: 'Failed to update business transaction', message: error.message });
    }
  }
});

// DELETE business transaction (soft delete)
router.delete('/business-transactions/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      UPDATE document_splitting_business_transactions
      SET is_active = false, updated_at = NOW()
      WHERE id = $1
      RETURNING id
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Business transaction not found' });
    }

    res.json({ message: 'Business transaction deactivated successfully' });
  } catch (error: any) {
    console.error('Error deleting business transaction:', error);
    res.status(500).json({ error: 'Failed to delete business transaction', message: error.message });
  }
});

// Document Type Mapping

// GET document type mappings
router.get('/document-type-mappings', async (req: Request, res: Response) => {
  try {
    const { document_type, company_code_id } = req.query;

    let query = `
      SELECT 
        dtm.*,
        bt.code as business_transaction_code,
        bt.name as business_transaction_name,
        btv.code as variant_code,
        btv.name as variant_name
      FROM document_splitting_document_type_mapping dtm
      JOIN document_splitting_business_transactions bt ON dtm.business_transaction_id = bt.id
      LEFT JOIN document_splitting_business_transaction_variants btv ON dtm.business_transaction_variant_id = btv.id
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramCount = 1;

    if (document_type) {
      query += ` AND dtm.document_type = $${paramCount++}`;
      params.push(document_type);
    }

    if (company_code_id) {
      query += ` AND (dtm.company_code_id = $${paramCount++} OR dtm.company_code_id IS NULL)`;
      params.push(company_code_id);
    }

    query += ` ORDER BY dtm.document_type, dtm.company_code_id NULLS LAST`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching document type mappings:', error);
    res.status(500).json({ error: 'Failed to fetch document type mappings', message: error.message });
  }
});

// POST create document type mapping
router.post('/document-type-mappings', async (req: Request, res: Response) => {
  try {
    const { document_type, business_transaction_id, business_transaction_variant_id, company_code_id } = req.body;

    if (!document_type || !business_transaction_id) {
      return res.status(400).json({ error: 'Document type and business_transaction_id are required' });
    }

    const result = await pool.query(`
      INSERT INTO document_splitting_document_type_mapping (
        document_type, business_transaction_id, business_transaction_variant_id,
        company_code_id, is_active, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, true, NOW(), NOW())
      RETURNING *
    `, [document_type, business_transaction_id, business_transaction_variant_id || null, company_code_id || null]);

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Error creating document type mapping:', error);
    if (error.code === '23505') {
      res.status(409).json({ error: 'Document type mapping already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create document type mapping', message: error.message });
    }
  }
});

// PUT update document type mapping
router.put('/document-type-mappings/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { document_type, business_transaction_id, business_transaction_variant_id, company_code_id, is_active } = req.body;

    if (!document_type || !business_transaction_id) {
      return res.status(400).json({ error: 'Document type and business_transaction_id are required' });
    }

    // Check if mapping exists
    const existingCheck = await pool.query(
      'SELECT id FROM document_splitting_document_type_mapping WHERE id = $1',
      [id]
    );

    if (existingCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Document type mapping not found' });
    }

    const result = await pool.query(`
      UPDATE document_splitting_document_type_mapping
      SET document_type = $1, 
          business_transaction_id = $2, 
          business_transaction_variant_id = $3,
          company_code_id = $4,
          is_active = $5,
          updated_at = NOW()
      WHERE id = $6
      RETURNING *
    `, [
      document_type,
      business_transaction_id,
      business_transaction_variant_id || null,
      company_code_id || null,
      is_active !== undefined ? is_active : true,
      id
    ]);

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error updating document type mapping:', error);
    if (error.code === '23505') {
      res.status(409).json({ error: 'Document type mapping already exists' });
    } else {
      res.status(500).json({ error: 'Failed to update document type mapping', message: error.message });
    }
  }
});

// DELETE document type mapping
router.delete('/document-type-mappings/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      DELETE FROM document_splitting_document_type_mapping
      WHERE id = $1
      RETURNING id
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Document type mapping not found' });
    }

    res.json({ message: 'Document type mapping deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting document type mapping:', error);
    res.status(500).json({ error: 'Failed to delete document type mapping', message: error.message });
  }
});

// Splitting Rules

// GET splitting rules
router.get('/rules', async (req: Request, res: Response) => {
  try {
    const { business_transaction_id, active } = req.query;

    let query = `
      SELECT 
        dsr.*,
        bt.code as business_transaction_code,
        bt.name as business_transaction_name,
        sic_source.code as source_item_category_code,
        sic_source.name as source_item_category_name,
        sic_target.code as target_item_category_code,
        sic_target.name as target_item_category_name,
        dsm.code as method_code,
        dsm.name as method_name,
        dsm.method_type
      FROM document_splitting_rules dsr
      JOIN document_splitting_business_transactions bt ON dsr.business_transaction_id = bt.id
      JOIN document_splitting_item_categories sic_source ON dsr.source_item_category_id = sic_source.id
      LEFT JOIN document_splitting_item_categories sic_target ON dsr.target_item_category_id = sic_target.id
      JOIN document_splitting_methods dsm ON dsr.splitting_method_id = dsm.id
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramCount = 1;

    if (business_transaction_id) {
      query += ` AND dsr.business_transaction_id = $${paramCount++}`;
      params.push(business_transaction_id);
    }

    if (active !== undefined) {
      query += ` AND dsr.is_active = $${paramCount++}`;
      params.push(active === 'true');
    }

    query += ` ORDER BY dsr.priority DESC, dsr.id ASC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching splitting rules:', error);
    res.status(500).json({ error: 'Failed to fetch splitting rules', message: error.message });
  }
});

// POST create splitting rule
router.post('/rules', async (req: Request, res: Response) => {
  try {
    const {
      business_transaction_id,
      business_transaction_variant_id,
      splitting_method_id,
      rule_name,
      description,
      source_item_category_id,
      target_item_category_id,
      priority
    } = req.body;

    if (!business_transaction_id || !splitting_method_id || !rule_name || !source_item_category_id) {
      return res.status(400).json({
        error: 'business_transaction_id, splitting_method_id, rule_name, and source_item_category_id are required'
      });
    }

    const result = await pool.query(`
      INSERT INTO document_splitting_rules (
        business_transaction_id, business_transaction_variant_id, splitting_method_id,
        rule_name, description, source_item_category_id, target_item_category_id,
        priority, is_active, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, NOW(), NOW())
      RETURNING *
    `, [
      business_transaction_id,
      business_transaction_variant_id || null,
      splitting_method_id,
      rule_name,
      description || null,
      source_item_category_id,
      target_item_category_id || null,
      priority || 0
    ]);

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Error creating splitting rule:', error);
    res.status(500).json({ error: 'Failed to create splitting rule', message: error.message });
  }
});

// PUT update splitting rule
router.put('/rules/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      business_transaction_id,
      business_transaction_variant_id,
      splitting_method_id,
      rule_name,
      description,
      source_item_category_id,
      target_item_category_id,
      priority,
      is_active
    } = req.body;

    if (!business_transaction_id || !splitting_method_id || !rule_name || !source_item_category_id) {
      return res.status(400).json({
        error: 'business_transaction_id, splitting_method_id, rule_name, and source_item_category_id are required'
      });
    }

    const result = await pool.query(`
      UPDATE document_splitting_rules
      SET business_transaction_id = $1, business_transaction_variant_id = $2, splitting_method_id = $3,
          rule_name = $4, description = $5, source_item_category_id = $6, target_item_category_id = $7,
          priority = $8, is_active = $9, updated_at = NOW()
      WHERE id = $10
      RETURNING *
    `, [
      business_transaction_id,
      business_transaction_variant_id || null,
      splitting_method_id,
      rule_name,
      description || null,
      source_item_category_id,
      target_item_category_id || null,
      priority || 0,
      is_active !== undefined ? is_active : true,
      id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Splitting rule not found' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error updating splitting rule:', error);
    res.status(500).json({ error: 'Failed to update splitting rule', message: error.message });
  }
});

// DELETE splitting rule (soft delete)
router.delete('/rules/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      UPDATE document_splitting_rules
      SET is_active = false, updated_at = NOW()
      WHERE id = $1
      RETURNING id
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Splitting rule not found' });
    }

    res.json({ message: 'Splitting rule deactivated successfully' });
  } catch (error: any) {
    console.error('Error deleting splitting rule:', error);
    res.status(500).json({ error: 'Failed to delete splitting rule', message: error.message });
  }
});

// Zero Balance Accounts

// GET zero balance accounts
router.get('/zero-balance-accounts', async (req: Request, res: Response) => {
  try {
    const { ledger_id, company_code_id } = req.query;

    let query = `
      SELECT 
        dszba.*,
        l.code as ledger_code,
        l.name as ledger_name,
        ga.account_number,
        ga.account_name
      FROM document_splitting_zero_balance_accounts dszba
      JOIN ledgers l ON dszba.ledger_id = l.id
      JOIN gl_accounts ga ON dszba.gl_account_id = ga.id
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramCount = 1;

    if (ledger_id) {
      query += ` AND dszba.ledger_id = $${paramCount++}`;
      params.push(ledger_id);
    }

    if (company_code_id) {
      query += ` AND (dszba.company_code_id = $${paramCount++} OR dszba.company_code_id IS NULL)`;
      params.push(company_code_id);
    }

    query += ` ORDER BY dszba.ledger_id, dszba.company_code_id NULLS LAST`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching zero balance accounts:', error);
    res.status(500).json({ error: 'Failed to fetch zero balance accounts', message: error.message });
  }
});

// PUT update zero balance account
router.put('/zero-balance-accounts/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { gl_account_id, gl_account_number, description, is_active } = req.body;

    if (!gl_account_id && !gl_account_number) {
      return res.status(400).json({ error: 'gl_account_id or gl_account_number is required' });
    }

    let finalGlAccountId = gl_account_id;
    if (!finalGlAccountId && gl_account_number) {
      const accountResult = await pool.query(
        'SELECT id FROM gl_accounts WHERE account_number = $1 LIMIT 1',
        [gl_account_number]
      );
      if (accountResult.rows.length === 0) {
        return res.status(400).json({ error: 'GL account not found' });
      }
      finalGlAccountId = accountResult.rows[0].id;
    }

    const result = await pool.query(`
      UPDATE document_splitting_zero_balance_accounts
      SET gl_account_id = $1, gl_account_number = $2, description = $3,
          is_active = $4, updated_at = NOW()
      WHERE id = $5
      RETURNING *
    `, [finalGlAccountId, gl_account_number, description || null, is_active !== undefined ? is_active : true, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Zero balance account not found' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error updating zero balance account:', error);
    res.status(500).json({ error: 'Failed to update zero balance account', message: error.message });
  }
});

// DELETE zero balance account (soft delete)
router.delete('/zero-balance-accounts/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      UPDATE document_splitting_zero_balance_accounts
      SET is_active = false, updated_at = NOW()
      WHERE id = $1
      RETURNING id
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Zero balance account not found' });
    }

    res.json({ message: 'Zero balance account deactivated successfully' });
  } catch (error: any) {
    console.error('Error deleting zero balance account:', error);
    res.status(500).json({ error: 'Failed to delete zero balance account', message: error.message });
  }
});

// POST create/update zero balance account
router.post('/zero-balance-accounts', async (req: Request, res: Response) => {
  try {
    const { ledger_id, company_code_id, gl_account_id, gl_account_number, description } = req.body;

    if (!ledger_id || (!gl_account_id && !gl_account_number)) {
      return res.status(400).json({ error: 'ledger_id and gl_account_id or gl_account_number are required' });
    }

    // Get gl_account_id if only account number provided
    let finalGlAccountId = gl_account_id;
    if (!finalGlAccountId && gl_account_number) {
      const accountResult = await pool.query(
        'SELECT id FROM gl_accounts WHERE account_number = $1 LIMIT 1',
        [gl_account_number]
      );
      if (accountResult.rows.length === 0) {
        return res.status(400).json({ error: 'GL account not found' });
      }
      finalGlAccountId = accountResult.rows[0].id;
    }

    // Check if exists, update or insert
    const existingCheck = await pool.query(`
      SELECT id FROM document_splitting_zero_balance_accounts
      WHERE ledger_id = $1 AND (company_code_id = $2 OR (company_code_id IS NULL AND $2 IS NULL))
    `, [ledger_id, company_code_id || null]);

    let result;
    if (existingCheck.rows.length > 0) {
      // Update
      result = await pool.query(`
        UPDATE document_splitting_zero_balance_accounts
        SET gl_account_id = $1, gl_account_number = $2, description = $3, updated_at = NOW()
        WHERE id = $4
        RETURNING *
      `, [finalGlAccountId, gl_account_number, description || null, existingCheck.rows[0].id]);
    } else {
      // Insert
      result = await pool.query(`
        INSERT INTO document_splitting_zero_balance_accounts (
          ledger_id, company_code_id, gl_account_id, gl_account_number, description,
          is_active, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())
        RETURNING *
      `, [ledger_id, company_code_id || null, finalGlAccountId, gl_account_number, description || null]);
    }

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Error creating zero balance account:', error);
    if (error.code === '23505') {
      res.status(409).json({ error: 'Zero balance account already exists for this ledger and company code' });
    } else {
      res.status(500).json({ error: 'Failed to create zero balance account', message: error.message });
    }
  }
});

// Characteristics

// GET characteristics
router.get('/characteristics', async (req: Request, res: Response) => {
  try {
    const { active } = req.query;

    let query = `
      SELECT 
        id, code, name, description, characteristic_type, field_name,
        requires_zero_balance, is_mandatory, is_active,
        created_at, updated_at
      FROM document_splitting_characteristics
      WHERE 1=1
    `;

    const params: any[] = [];
    if (active !== undefined) {
      query += ` AND is_active = $1`;
      params.push(active === 'true');
    }

    query += ` ORDER BY is_mandatory DESC, code`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching characteristics:', error);
    res.status(500).json({ error: 'Failed to fetch characteristics', message: error.message });
  }
});

// POST create characteristic
router.post('/characteristics', async (req: Request, res: Response) => {
  try {
    const { code, name, description, characteristic_type, field_name, requires_zero_balance, is_mandatory } = req.body;

    if (!code || !name || !characteristic_type || !field_name) {
      return res.status(400).json({
        error: 'Code, name, characteristic_type, and field_name are required'
      });
    }

    const result = await pool.query(`
      INSERT INTO document_splitting_characteristics (
        code, name, description, characteristic_type, field_name,
        requires_zero_balance, is_mandatory, is_active, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, true, NOW(), NOW())
      RETURNING *
    `, [
      code, name, description || null, characteristic_type, field_name,
      requires_zero_balance || false, is_mandatory || false
    ]);

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Error creating characteristic:', error);
    if (error.code === '23505') {
      res.status(409).json({ error: 'Characteristic with this code already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create characteristic', message: error.message });
    }
  }
});

// PUT update characteristic
router.put('/characteristics/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { code, name, description, characteristic_type, field_name, requires_zero_balance, is_mandatory, is_active } = req.body;

    if (!code || !name || !characteristic_type || !field_name) {
      return res.status(400).json({
        error: 'Code, name, characteristic_type, and field_name are required'
      });
    }

    const result = await pool.query(`
      UPDATE document_splitting_characteristics
      SET code = $1, name = $2, description = $3, characteristic_type = $4, field_name = $5,
          requires_zero_balance = $6, is_mandatory = $7, is_active = $8, updated_at = NOW()
      WHERE id = $9
      RETURNING *
    `, [
      code, name, description || null, characteristic_type, field_name,
      requires_zero_balance || false, is_mandatory || false,
      is_active !== undefined ? is_active : true, id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Characteristic not found' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error updating characteristic:', error);
    if (error.code === '23505') {
      res.status(409).json({ error: 'Characteristic with this code already exists' });
    } else {
      res.status(500).json({ error: 'Failed to update characteristic', message: error.message });
    }
  }
});

// DELETE characteristic (soft delete)
router.delete('/characteristics/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      UPDATE document_splitting_characteristics
      SET is_active = false, updated_at = NOW()
      WHERE id = $1
      RETURNING id
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Characteristic not found' });
    }

    res.json({ message: 'Characteristic deactivated successfully' });
  } catch (error: any) {
    console.error('Error deleting characteristic:', error);
    res.status(500).json({ error: 'Failed to delete characteristic', message: error.message });
  }
});

// Constants

// GET constants
router.get('/constants', async (req: Request, res: Response) => {
  try {
    const { ledger_id, company_code_id } = req.query;

    let query = `
      SELECT 
        dsc.*,
        l.code as ledger_code,
        l.name as ledger_name,
        dsch.code as characteristic_code,
        dsch.name as characteristic_name,
        dsch.field_name
      FROM document_splitting_constants dsc
      JOIN ledgers l ON dsc.ledger_id = l.id
      JOIN document_splitting_characteristics dsch ON dsc.characteristic_id = dsch.id
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramCount = 1;

    if (ledger_id) {
      query += ` AND dsc.ledger_id = $${paramCount++}`;
      params.push(ledger_id);
    }

    if (company_code_id) {
      query += ` AND (dsc.company_code_id = $${paramCount++} OR dsc.company_code_id IS NULL)`;
      params.push(company_code_id);
    }

    query += ` ORDER BY dsc.ledger_id, dsc.characteristic_id`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching constants:', error);
    res.status(500).json({ error: 'Failed to fetch constants', message: error.message });
  }
});

// POST create/update constant
router.post('/constants', async (req: Request, res: Response) => {
  try {
    const { ledger_id, company_code_id, characteristic_id, constant_value, description } = req.body;

    if (!ledger_id || !characteristic_id || !constant_value) {
      return res.status(400).json({
        error: 'ledger_id, characteristic_id, and constant_value are required'
      });
    }

    // Check if exists, update or insert
    const existingCheck = await pool.query(`
      SELECT id FROM document_splitting_constants
      WHERE ledger_id = $1 AND (company_code_id = $2 OR (company_code_id IS NULL AND $2 IS NULL))
        AND characteristic_id = $3
    `, [ledger_id, company_code_id || null, characteristic_id]);

    let result;
    if (existingCheck.rows.length > 0) {
      // Update
      result = await pool.query(`
        UPDATE document_splitting_constants
        SET constant_value = $1, description = $2, updated_at = NOW()
        WHERE id = $3
        RETURNING *
      `, [constant_value, description || null, existingCheck.rows[0].id]);
    } else {
      // Insert
      result = await pool.query(`
        INSERT INTO document_splitting_constants (
          ledger_id, company_code_id, characteristic_id, constant_value, description,
          is_active, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())
        RETURNING *
      `, [ledger_id, company_code_id || null, characteristic_id, constant_value, description || null]);
    }

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Error creating constant:', error);
    if (error.code === '23505') {
      res.status(409).json({ error: 'Constant already exists for this ledger, company code, and characteristic' });
    } else {
      res.status(500).json({ error: 'Failed to create constant', message: error.message });
    }
  }
});

// Activation

// GET activation settings
router.get('/activation', async (req: Request, res: Response) => {
  try {
    const { ledger_id, company_code_id } = req.query;

    let query = `
      SELECT 
        dsa.*,
        l.code as ledger_code,
        l.name as ledger_name,
        cc.code as company_code,
        cc.name as company_name,
        dsm.code as method_code,
        dsm.name as method_name
      FROM document_splitting_activation dsa
      JOIN ledgers l ON dsa.ledger_id = l.id
      LEFT JOIN company_codes cc ON dsa.company_code_id = cc.id
      LEFT JOIN document_splitting_methods dsm ON dsa.splitting_method_id = dsm.id
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramCount = 1;

    if (ledger_id) {
      query += ` AND dsa.ledger_id = $${paramCount++}`;
      params.push(ledger_id);
    }

    if (company_code_id) {
      query += ` AND (dsa.company_code_id = $${paramCount++} OR dsa.company_code_id IS NULL)`;
      params.push(company_code_id);
    }

    query += ` ORDER BY dsa.ledger_id, dsa.company_code_id NULLS LAST`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching activation settings:', error);
    res.status(500).json({ error: 'Failed to fetch activation settings', message: error.message });
  }
});

// PUT update activation
router.put('/activation/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      ledger_id,
      company_code_id,
      is_active,
      enable_inheritance,
      enable_standard_assignment,
      splitting_method_id
    } = req.body;

    // Build the update query dynamically
    const updates: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    if (ledger_id !== undefined) {
      updates.push(`ledger_id = $${paramCount++}`);
      params.push(ledger_id);
    }

    if (company_code_id !== undefined) {
      updates.push(`company_code_id = $${paramCount++}`);
      params.push(company_code_id || null);
    }

    updates.push(`is_active = $${paramCount++}`);
    params.push(is_active !== undefined ? is_active : true);

    updates.push(`enable_inheritance = $${paramCount++}`);
    params.push(enable_inheritance !== undefined ? enable_inheritance : true);

    updates.push(`enable_standard_assignment = $${paramCount++}`);
    params.push(enable_standard_assignment !== undefined ? enable_standard_assignment : true);

    updates.push(`splitting_method_id = $${paramCount++}`);
    params.push(splitting_method_id || null);

    updates.push(`updated_at = NOW()`);

    params.push(id);

    const result = await pool.query(`
      UPDATE document_splitting_activation
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Activation setting not found' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error updating activation:', error);
    res.status(500).json({ error: 'Failed to update activation', message: error.message });
  }
});

// DELETE activation (soft delete)
router.delete('/activation/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      UPDATE document_splitting_activation
      SET is_active = false, updated_at = NOW()
      WHERE id = $1
      RETURNING id
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Activation setting not found' });
    }

    res.json({ message: 'Activation setting deactivated successfully' });
  } catch (error: any) {
    console.error('Error deleting activation:', error);
    res.status(500).json({ error: 'Failed to delete activation', message: error.message });
  }
});

// POST create/update activation
router.post('/activation', async (req: Request, res: Response) => {
  try {
    const {
      ledger_id,
      company_code_id,
      is_active,
      enable_inheritance,
      enable_standard_assignment,
      splitting_method_id
    } = req.body;

    if (!ledger_id) {
      return res.status(400).json({ error: 'ledger_id is required' });
    }

    // Check if exists, update or insert
    const existingCheck = await pool.query(`
      SELECT id FROM document_splitting_activation
      WHERE ledger_id = $1 AND (company_code_id = $2 OR (company_code_id IS NULL AND $2 IS NULL))
    `, [ledger_id, company_code_id || null]);

    let result;
    if (existingCheck.rows.length > 0) {
      // Update
      result = await pool.query(`
        UPDATE document_splitting_activation
        SET is_active = $1, enable_inheritance = $2, enable_standard_assignment = $3,
            splitting_method_id = $4, updated_at = NOW()
        WHERE id = $5
        RETURNING *
      `, [
        is_active !== undefined ? is_active : true,
        enable_inheritance !== undefined ? enable_inheritance : true,
        enable_standard_assignment !== undefined ? enable_standard_assignment : true,
        splitting_method_id || null,
        existingCheck.rows[0].id
      ]);
    } else {
      // Insert
      result = await pool.query(`
        INSERT INTO document_splitting_activation (
          ledger_id, company_code_id, is_active, enable_inheritance,
          enable_standard_assignment, splitting_method_id, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
        RETURNING *
      `, [
        ledger_id,
        company_code_id || null,
        is_active !== undefined ? is_active : true,
        enable_inheritance !== undefined ? enable_inheritance : true,
        enable_standard_assignment !== undefined ? enable_standard_assignment : true,
        splitting_method_id || null
      ]);
    }

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Error creating activation:', error);
    if (error.code === '23505') {
      res.status(409).json({ error: 'Activation already exists for this ledger and company code' });
    } else {
      res.status(500).json({ error: 'Failed to create activation', message: error.message });
    }
  }
});

// GL Account Category Assignments

// GET GL account category assignments
router.get('/gl-account-categories', async (req: Request, res: Response) => {
  try {
    const { gl_account_id, gl_account_number, chart_of_accounts_id } = req.query;

    let query = `
      SELECT 
        dsgac.*,
        ga.account_number,
        ga.account_name,
        sic.code as item_category_code,
        sic.name as item_category_name,
        sic.category_type
      FROM document_splitting_gl_account_categories dsgac
      JOIN gl_accounts ga ON dsgac.gl_account_id = ga.id
      JOIN document_splitting_item_categories sic ON dsgac.item_category_id = sic.id
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramCount = 1;

    if (gl_account_id) {
      query += ` AND dsgac.gl_account_id = $${paramCount++}`;
      params.push(gl_account_id);
    }

    if (gl_account_number) {
      query += ` AND ga.account_number = $${paramCount++}`;
      params.push(gl_account_number);
    }

    if (chart_of_accounts_id) {
      query += ` AND (dsgac.chart_of_accounts_id = $${paramCount++} OR dsgac.chart_of_accounts_id IS NULL)`;
      params.push(chart_of_accounts_id);
    }

    query += ` ORDER BY ga.account_number, dsgac.valid_from DESC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching GL account categories:', error);
    res.status(500).json({ error: 'Failed to fetch GL account categories', message: error.message });
  }
});

// POST assign item category to GL account
router.post('/gl-account-categories', async (req: Request, res: Response) => {
  try {
    const { gl_account_id, gl_account_number, item_category_id, chart_of_accounts_id, valid_from, valid_to } = req.body;

    if (!item_category_id || (!gl_account_id && !gl_account_number)) {
      return res.status(400).json({
        error: 'item_category_id and gl_account_id or gl_account_number are required'
      });
    }

    // Get gl_account_id if only account number provided
    let finalGlAccountId = gl_account_id;
    if (!finalGlAccountId && gl_account_number) {
      const accountResult = await pool.query(
        'SELECT id FROM gl_accounts WHERE account_number = $1 LIMIT 1',
        [gl_account_number]
      );
      if (accountResult.rows.length === 0) {
        return res.status(400).json({ error: 'GL account not found' });
      }
      finalGlAccountId = accountResult.rows[0].id;
    }

    const result = await pool.query(`
      INSERT INTO document_splitting_gl_account_categories (
        gl_account_id, gl_account_number, item_category_id, chart_of_accounts_id,
        valid_from, valid_to, is_active, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, true, NOW(), NOW())
      RETURNING *
    `, [
      finalGlAccountId,
      gl_account_number || null,
      item_category_id,
      chart_of_accounts_id || null,
      valid_from || new Date().toISOString().split('T')[0],
      valid_to || null
    ]);

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Error assigning item category:', error);
    if (error.code === '23505') {
      res.status(409).json({ error: 'Item category assignment already exists for this GL account and valid_from date' });
    } else {
      res.status(500).json({ error: 'Failed to assign item category', message: error.message });
    }
  }
});

// Splitting Methods

// GET splitting methods
router.get('/methods', async (req: Request, res: Response) => {
  try {
    const { active } = req.query;

    let query = `
      SELECT 
        id, code, name, description, method_type, is_active,
        created_at, updated_at
      FROM document_splitting_methods
      WHERE 1=1
    `;

    const params: any[] = [];
    if (active !== undefined) {
      query += ` AND is_active = $1`;
      params.push(active === 'true');
    }

    query += ` ORDER BY code`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching splitting methods:', error);
    res.status(500).json({ error: 'Failed to fetch splitting methods', message: error.message });
  }
});

// POST create splitting method
router.post('/methods', async (req: Request, res: Response) => {
  try {
    const { code, name, description, method_type } = req.body;

    if (!code || !name || !method_type) {
      return res.status(400).json({ error: 'Code, name, and method_type are required' });
    }

    const result = await pool.query(`
      INSERT INTO document_splitting_methods (
        code, name, description, method_type, is_active, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, true, NOW(), NOW())
      RETURNING *
    `, [code, name, description || null, method_type]);

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Error creating splitting method:', error);
    if (error.code === '23505') {
      res.status(409).json({ error: 'Splitting method with this code already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create splitting method', message: error.message });
    }
  }
});

// PUT update splitting method
router.put('/methods/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { code, name, description, method_type, is_active } = req.body;

    if (!code || !name || !method_type) {
      return res.status(400).json({ error: 'Code, name, and method_type are required' });
    }

    const result = await pool.query(`
      UPDATE document_splitting_methods
      SET code = $1, name = $2, description = $3, method_type = $4,
          is_active = $5, updated_at = NOW()
      WHERE id = $6
      RETURNING *
    `, [code, name, description || null, method_type, is_active !== undefined ? is_active : true, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Splitting method not found' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error updating splitting method:', error);
    if (error.code === '23505') {
      res.status(409).json({ error: 'Splitting method with this code already exists' });
    } else {
      res.status(500).json({ error: 'Failed to update splitting method', message: error.message });
    }
  }
});

// DELETE splitting method (soft delete)
router.delete('/methods/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(`
      UPDATE document_splitting_methods
      SET is_active = false, updated_at = NOW()
      WHERE id = $1
      RETURNING id
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Splitting method not found' });
    }

    res.json({ message: 'Splitting method deactivated successfully' });
  } catch (error: any) {
    console.error('Error deleting splitting method:', error);
    res.status(500).json({ error: 'Failed to delete splitting method', message: error.message });
  }
});

// Simulate document splitting
router.post('/simulate', async (req: Request, res: Response) => {
  try {
    const { items, document_type, company_code, ledger_id } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Items array is required' });
    }

    if (!document_type || !company_code) {
      return res.status(400).json({ error: 'document_type and company_code are required' });
    }

    const { documentSplittingService } = await import('../../services/document-splitting-service.js');

    const splitResult = await documentSplittingService.splitDocument(
      items,
      document_type,
      company_code,
      ledger_id
    );

    res.json(splitResult);
  } catch (error: any) {
    console.error('Error simulating document splitting:', error);
    res.status(500).json({
      error: 'Failed to simulate document splitting',
      message: error.message
    });
  }
});

export default router;

