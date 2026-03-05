import { Router, Request, Response } from 'express';
import { pool } from '../../db';
import { insertLedgerSchema, updateLedgerSchema } from '@shared/ledgers-schema';
import { z } from 'zod';

const router = Router();

// GET all ledgers
router.get('/', async (req: Request, res: Response) => {
  try {
    const { active, type, category } = req.query;

    let query = `
      SELECT 
        l.id,
        l.code,
        l.name,
        l.description,
        l.ledger_type,
        l.ledger_category,
        l.fiscal_year_variant_id,
        fyv.variant_id as fiscal_year_variant_code,
        fyv.description as fiscal_year_variant_name,
        l.default_currency_code,
        l.parallel_currency_code,
        l.ledger_group_id,
        lg.code as ledger_group_code,
        lg.name as ledger_group_name,
        l.accounting_principle,
        l.base_ledger_id,
        bl.code as base_ledger_code,
        bl.name as base_ledger_name,
        l.extension_type,
        l.chart_of_accounts_id,
        coa.chart_id as chart_of_accounts_code,
        coa.description as chart_of_accounts_name,
        l.company_code_id,
        cc.code as company_code,
        cc.name as company_name,
        l.company_code_currency_active,
        l.group_currency_active,
        l.hard_currency_active,
        l.index_currency_active,
        l.index_currency_code,
        l.document_splitting_active,
        l.posting_period_control_id,
        l.allow_postings,
        l.is_consolidation_ledger,
        l.requires_approval,
        l.display_order,
        l.sort_key,
        l.is_active,
        l.is_default,
        l.created_at,
        l.updated_at,
        l.created_by,
        l.updated_by,
        l."_tenantId" as tenant_id
      FROM ledgers l
      LEFT JOIN fiscal_year_variants fyv ON l.fiscal_year_variant_id = fyv.id
      LEFT JOIN ledger_groups lg ON l.ledger_group_id = lg.id
      LEFT JOIN ledgers bl ON l.base_ledger_id = bl.id
      LEFT JOIN chart_of_accounts coa ON l.chart_of_accounts_id = coa.id
      LEFT JOIN company_codes cc ON l.company_code_id = cc.id
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramCount = 1;

    if (active !== undefined) {
      query += ` AND l.is_active = $${paramCount++}`;
      params.push(active === 'true');
    }

    if (type) {
      query += ` AND l.ledger_type = $${paramCount++}`;
      params.push(type);
    }

    if (category) {
      query += ` AND l.ledger_category = $${paramCount++}`;
      params.push(category);
    }

    query += ` ORDER BY l.display_order, l.code`;

    const result = await pool.query(query, params);

    res.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching ledgers:', error);
    res.status(500).json({ error: 'Failed to fetch ledgers', message: error.message });
  }
});

// GET ledger by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }

    const result = await pool.query(`
      SELECT 
        l.id,
        l.code,
        l.name,
        l.description,
        l.ledger_type,
        l.ledger_category,
        l.fiscal_year_variant_id,
        fyv.variant_id as fiscal_year_variant_code,
        fyv.description as fiscal_year_variant_name,
        l.default_currency_code,
        l.parallel_currency_code,
        l.ledger_group_id,
        lg.code as ledger_group_code,
        lg.name as ledger_group_name,
        l.accounting_principle,
        l.base_ledger_id,
        bl.code as base_ledger_code,
        bl.name as base_ledger_name,
        l.extension_type,
        l.chart_of_accounts_id,
        coa.chart_id as chart_of_accounts_code,
        coa.description as chart_of_accounts_name,
        l.company_code_id,
        cc.code as company_code,
        cc.name as company_name,
        l.company_code_currency_active,
        l.group_currency_active,
        l.hard_currency_active,
        l.index_currency_active,
        l.index_currency_code,
        l.document_splitting_active,
        l.posting_period_control_id,
        l.allow_postings,
        l.is_consolidation_ledger,
        l.requires_approval,
        l.display_order,
        l.sort_key,
        l.is_active,
        l.is_default,
        l.created_at,
        l.updated_at,
        l.created_by,
        l.updated_by,
        l."_tenantId" as tenant_id
      FROM ledgers l
      LEFT JOIN fiscal_year_variants fyv ON l.fiscal_year_variant_id = fyv.id
      LEFT JOIN ledger_groups lg ON l.ledger_group_id = lg.id
      LEFT JOIN ledgers bl ON l.base_ledger_id = bl.id
      LEFT JOIN chart_of_accounts coa ON l.chart_of_accounts_id = coa.id
      LEFT JOIN company_codes cc ON l.company_code_id = cc.id
      WHERE l.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ledger not found' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error fetching ledger:', error);
    res.status(500).json({ error: 'Failed to fetch ledger', message: error.message });
  }
});

// POST create ledger
router.post('/', async (req: Request, res: Response) => {
  try {
    const validationResult = insertLedgerSchema.safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Validation error',
        details: validationResult.error.errors
      });
    }

    const data = validationResult.data;

    // Check if code already exists
    const existingCheck = await pool.query(
      'SELECT id FROM ledgers WHERE code = $1',
      [data.code]
    );

    if (existingCheck.rows.length > 0) {
      return res.status(409).json({
        error: `Ledger with code "${data.code}" already exists`
      });
    }

    // If this is set as default, unset other defaults
    if (data.isDefault) {
      await pool.query(
        'UPDATE ledgers SET is_default = FALSE WHERE is_default = TRUE AND is_active = TRUE'
      );
    }

    // Validate fiscal year variant if provided
    if (data.fiscalYearVariantId) {
      const fyvCheck = await pool.query(
        'SELECT id FROM fiscal_year_variants WHERE id = $1',
        [data.fiscalYearVariantId]
      );
      if (fyvCheck.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid fiscal year variant ID' });
      }
    }

    // Insert ledger
    const result = await pool.query(`
      INSERT INTO ledgers (
        code, name, description, ledger_type, ledger_category,
        fiscal_year_variant_id, default_currency_code, parallel_currency_code,
        ledger_group_id, accounting_principle, base_ledger_id, extension_type,
        chart_of_accounts_id, company_code_id, company_code_currency_active, group_currency_active,
        hard_currency_active, index_currency_active, index_currency_code,
        document_splitting_active, posting_period_control_id, allow_postings, 
        is_consolidation_ledger, requires_approval, display_order, sort_key, 
        is_active, is_default, created_by, updated_by, "_tenantId"
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 
        $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31
      )
      RETURNING *
    `, [
      data.code,
      data.name,
      data.description || null,
      data.ledgerType,
      data.ledgerCategory || null,
      data.fiscalYearVariantId || null,
      data.defaultCurrencyCode,
      data.parallelCurrencyCode || null,
      data.ledgerGroupId || null,
      (data.accountingPrinciple && String(data.accountingPrinciple).trim() !== "") ? String(data.accountingPrinciple) : null,
      data.baseLedgerId || null,
      data.extensionType || null,
      data.chartOfAccountsId || null,
      data.companyCodeId || null,
      data.companyCodeCurrencyActive !== undefined ? data.companyCodeCurrencyActive : true,
      data.groupCurrencyActive !== undefined ? data.groupCurrencyActive : false,
      data.hardCurrencyActive !== undefined ? data.hardCurrencyActive : false,
      data.indexCurrencyActive !== undefined ? data.indexCurrencyActive : false,
      data.indexCurrencyCode || null,
      data.documentSplittingActive !== undefined ? data.documentSplittingActive : false,
      data.postingPeriodControlId || null,
      data.allowPostings !== undefined ? data.allowPostings : true,
      data.isConsolidationLedger !== undefined ? data.isConsolidationLedger : false,
      data.requiresApproval !== undefined ? data.requiresApproval : false,
      data.displayOrder !== undefined ? data.displayOrder : 0,
      data.sortKey || null,
      data.isActive !== undefined ? data.isActive : true,
      data.isDefault !== undefined ? data.isDefault : false,
      (req as any).user?.id || 1,
      (req as any).user?.id || 1,
      (req as any).user?.tenantId || '001',
    ]);

    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Error creating ledger:', error);
    if (error.code === '23505') {
      res.status(409).json({ error: 'Ledger with this code already exists' });
    } else if (error.code === '23503') {
      res.status(400).json({ error: 'Invalid foreign key reference' });
    } else {
      res.status(500).json({ error: 'Failed to create ledger', message: error.message });
    }
  }
});

// PUT update ledger
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }

    const validationResult = updateLedgerSchema.safeParse(req.body);

    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Validation error',
        details: validationResult.error.errors
      });
    }

    const data = validationResult.data;

    // Check if ledger exists
    const existingCheck = await pool.query(
      'SELECT id, code, is_default FROM ledgers WHERE id = $1',
      [id]
    );

    if (existingCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Ledger not found' });
    }

    // Check if code is being changed and if it conflicts
    if (data.code && data.code !== existingCheck.rows[0].code) {
      const codeCheck = await pool.query(
        'SELECT id FROM ledgers WHERE code = $1 AND id != $2',
        [data.code, id]
      );
      if (codeCheck.rows.length > 0) {
        return res.status(409).json({ error: 'Ledger with this code already exists' });
      }
    }

    // If this is being set as default, unset other defaults
    if (data.isDefault && !existingCheck.rows[0].is_default) {
      await pool.query(
        'UPDATE ledgers SET is_default = FALSE WHERE is_default = TRUE AND is_active = TRUE AND id != $1',
        [id]
      );
    }

    // Validate fiscal year variant if provided
    if (data.fiscalYearVariantId) {
      const fyvCheck = await pool.query(
        'SELECT id FROM fiscal_year_variants WHERE id = $1',
        [data.fiscalYearVariantId]
      );
      if (fyvCheck.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid fiscal year variant ID' });
      }
    }

    // Build update query dynamically
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramCount = 1;

    if (data.code !== undefined) {
      updateFields.push(`code = $${paramCount++}`);
      updateValues.push(data.code);
    }
    if (data.name !== undefined) {
      updateFields.push(`name = $${paramCount++}`);
      updateValues.push(data.name);
    }
    if (data.description !== undefined) {
      updateFields.push(`description = $${paramCount++}`);
      updateValues.push(data.description);
    }
    if (data.ledgerType !== undefined) {
      updateFields.push(`ledger_type = $${paramCount++}`);
      updateValues.push(data.ledgerType);
    }
    if (data.ledgerCategory !== undefined) {
      updateFields.push(`ledger_category = $${paramCount++}`);
      updateValues.push((data.ledgerCategory && String(data.ledgerCategory).trim() !== "") ? String(data.ledgerCategory) : null);
    }
    if (data.fiscalYearVariantId !== undefined) {
      updateFields.push(`fiscal_year_variant_id = $${paramCount++}`);
      updateValues.push(data.fiscalYearVariantId);
    }
    if (data.defaultCurrencyCode !== undefined) {
      updateFields.push(`default_currency_code = $${paramCount++}`);
      updateValues.push(data.defaultCurrencyCode);
    }
    if (data.parallelCurrencyCode !== undefined) {
      updateFields.push(`parallel_currency_code = $${paramCount++}`);
      updateValues.push((data.parallelCurrencyCode && String(data.parallelCurrencyCode).trim() !== "") ? String(data.parallelCurrencyCode) : null);
    }
    if (data.ledgerGroupId !== undefined) {
      updateFields.push(`ledger_group_id = $${paramCount++}`);
      updateValues.push(data.ledgerGroupId);
    }
    if (data.allowPostings !== undefined) {
      updateFields.push(`allow_postings = $${paramCount++}`);
      updateValues.push(data.allowPostings);
    }
    if (data.isConsolidationLedger !== undefined) {
      updateFields.push(`is_consolidation_ledger = $${paramCount++}`);
      updateValues.push(data.isConsolidationLedger);
    }
    if (data.requiresApproval !== undefined) {
      updateFields.push(`requires_approval = $${paramCount++}`);
      updateValues.push(data.requiresApproval);
    }
    if (data.displayOrder !== undefined) {
      updateFields.push(`display_order = $${paramCount++}`);
      updateValues.push(data.displayOrder);
    }
    if (data.sortKey !== undefined) {
      updateFields.push(`sort_key = $${paramCount++}`);
      updateValues.push((data.sortKey && String(data.sortKey).trim() !== "") ? String(data.sortKey) : null);
    }
    if (data.accountingPrinciple !== undefined) {
      updateFields.push(`accounting_principle = $${paramCount++}`);
      updateValues.push((data.accountingPrinciple && String(data.accountingPrinciple).trim() !== "") ? String(data.accountingPrinciple) : null);
    }
    if (data.baseLedgerId !== undefined) {
      updateFields.push(`base_ledger_id = $${paramCount++}`);
      updateValues.push(data.baseLedgerId);
    }
    if (data.extensionType !== undefined) {
      updateFields.push(`extension_type = $${paramCount++}`);
      updateValues.push(data.extensionType);
    }
    if (data.chartOfAccountsId !== undefined) {
      updateFields.push(`chart_of_accounts_id = $${paramCount++}`);
      updateValues.push(data.chartOfAccountsId);
    }
    if (data.companyCodeId !== undefined) {
      updateFields.push(`company_code_id = $${paramCount++}`);
      updateValues.push(data.companyCodeId);
    }
    if (data.companyCodeCurrencyActive !== undefined) {
      updateFields.push(`company_code_currency_active = $${paramCount++}`);
      updateValues.push(data.companyCodeCurrencyActive);
    }
    if (data.groupCurrencyActive !== undefined) {
      updateFields.push(`group_currency_active = $${paramCount++}`);
      updateValues.push(data.groupCurrencyActive);
    }
    if (data.hardCurrencyActive !== undefined) {
      updateFields.push(`hard_currency_active = $${paramCount++}`);
      updateValues.push(data.hardCurrencyActive);
    }
    if (data.indexCurrencyActive !== undefined) {
      updateFields.push(`index_currency_active = $${paramCount++}`);
      updateValues.push(data.indexCurrencyActive);
    }
    if (data.indexCurrencyCode !== undefined) {
      updateFields.push(`index_currency_code = $${paramCount++}`);
      updateValues.push((data.indexCurrencyCode && String(data.indexCurrencyCode).trim() !== "") ? String(data.indexCurrencyCode) : null);
    }
    if (data.documentSplittingActive !== undefined) {
      updateFields.push(`document_splitting_active = $${paramCount++}`);
      updateValues.push(data.documentSplittingActive);
    }
    if (data.postingPeriodControlId !== undefined) {
      updateFields.push(`posting_period_control_id = $${paramCount++}`);
      updateValues.push(data.postingPeriodControlId);
    }
    if (data.isActive !== undefined) {
      updateFields.push(`is_active = $${paramCount++}`);
      updateValues.push(data.isActive);
    }
    if (data.isDefault !== undefined) {
      updateFields.push(`is_default = $${paramCount++}`);
      updateValues.push(data.isDefault);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updateFields.push(`updated_at = NOW()`);
    updateFields.push(`updated_by = $${paramCount++}`);
    updateValues.push((req as any).user?.id || 1);

    updateValues.push(id);

    const result = await pool.query(
      `UPDATE ledgers SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      updateValues
    );

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error updating ledger:', error);
    if (error.code === '23505') {
      res.status(409).json({ error: 'Ledger with this code already exists' });
    } else if (error.code === '23503') {
      res.status(400).json({ error: 'Invalid foreign key reference' });
    } else {
      res.status(500).json({ error: 'Failed to update ledger', message: error.message });
    }
  }
});

// DELETE ledger
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }

    // Check if ledger exists
    const existingCheck = await pool.query(
      'SELECT id FROM ledgers WHERE id = $1',
      [id]
    );

    if (existingCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Ledger not found' });
    }

    // Check if ledger is in use (you might want to check gl_entries or other tables)
    // For now, we'll just delete it

    await pool.query('DELETE FROM ledgers WHERE id = $1', [id]);

    res.status(200).json({ message: 'Ledger deleted successfully', id });
  } catch (error: any) {
    console.error('Error deleting ledger:', error);
    if (error.code === '23503') {
      res.status(400).json({ error: 'Cannot delete ledger: it is referenced by other records' });
    } else {
      res.status(500).json({ error: 'Failed to delete ledger', message: error.message });
    }
  }
});

export default router;

