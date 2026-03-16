import express from 'express';
import { getPool } from '../../database.js';

const router = express.Router();
const pool = getPool();

// Get all depreciation areas
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        da.id,
        da.code,
        da.name,
        da.description,
        da.is_active,
        da.useful_life_years,
        da.depreciation_rate,
        da.calculation_method,
        da.company_code_id,
        da.sort_order,
        da.posting_indicator,
        da.ledger_group,
        da.currency_type,
        da.fiscal_year_variant_id,
        da.base_method,
        da.period_control,
        da.created_at,
        da.updated_at,
        cc.code as company_code,
        cc.name as company_name,
        fyv.variant_id as fiscal_year_variant_code
      FROM depreciation_areas da
      LEFT JOIN company_codes cc ON da.company_code_id = cc.id
      LEFT JOIN fiscal_year_variants fyv ON da.fiscal_year_variant_id = fyv.id
      ORDER BY da.sort_order NULLS LAST, da.code, da.name
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching depreciation areas:', error);
    res.status(500).json({ message: 'Error fetching depreciation areas', error: error.message });
  }
});

// Get depreciation area by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT 
        da.id,
        da.code,
        da.name,
        da.description,
        da.is_active,
        da.useful_life_years,
        da.depreciation_rate,
        da.calculation_method,
        da.company_code_id,
        da.sort_order,
        da.created_at,
        da.updated_at,
        cc.code as company_code,
        cc.name as company_name
      FROM depreciation_areas da
      LEFT JOIN company_codes cc ON da.company_code_id = cc.id
      WHERE da.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Depreciation area not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching depreciation area:', error);
    res.status(500).json({ message: 'Error fetching depreciation area', error: error.message });
  }
});

// Create depreciation area
router.post('/', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const {
      code,
      name,
      description,
      is_active = true,
      useful_life_years,
      depreciation_rate,
      calculation_method,
      company_code_id,
      sort_order,
      posting_indicator = 'REALTIME',
      ledger_group,
      currency_type = 'LOCAL',
      fiscal_year_variant_id,
      base_method = 'ACQUISITION_COST',
      period_control = 'MONTHLY'
    } = req.body;

    // Validate required fields
    if (!code || !name) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Code and name are required' });
    }

    // Check if code already exists
    const existingCheck = await client.query(
      'SELECT id FROM depreciation_areas WHERE code = $1',
      [code]
    );

    if (existingCheck.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ message: 'Depreciation area with this code already exists' });
    }

    // Insert new depreciation area
    const result = await client.query(`
      INSERT INTO depreciation_areas (
        code,
        name,
        description,
        is_active,
        useful_life_years,
        depreciation_rate,
        calculation_method,
        company_code_id,
        sort_order,
        posting_indicator,
        ledger_group,
        currency_type,
        fiscal_year_variant_id,
        base_method,
        period_control,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW())
      RETURNING *
    `, [
      code,
      name,
      description || null,
      is_active,
      useful_life_years || null,
      depreciation_rate || null,
      calculation_method || null,
      company_code_id || null,
      sort_order || null,
      posting_indicator,
      ledger_group || null,
      currency_type,
      fiscal_year_variant_id || null,
      base_method,
      period_control
    ]);

    await client.query('COMMIT');
    res.status(201).json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating depreciation area:', error);
    res.status(500).json({ message: 'Error creating depreciation area', error: error.message });
  } finally {
    client.release();
  }
});

// Update depreciation area
router.put('/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { id } = req.params;
    const {
      code,
      name,
      description,
      is_active,
      useful_life_years,
      depreciation_rate,
      calculation_method,
      company_code_id,
      sort_order,
      posting_indicator,
      ledger_group,
      currency_type,
      fiscal_year_variant_id,
      base_method,
      period_control
    } = req.body;

    // Check if depreciation area exists
    const existingCheck = await client.query(
      'SELECT id FROM depreciation_areas WHERE id = $1',
      [id]
    );

    if (existingCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Depreciation area not found' });
    }

    // Check if code already exists for another area
    if (code) {
      const codeCheck = await client.query(
        'SELECT id FROM depreciation_areas WHERE code = $1 AND id != $2',
        [code, id]
      );

      if (codeCheck.rows.length > 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: 'Depreciation area with this code already exists' });
      }
    }

    // Update depreciation area
    const result = await client.query(`
      UPDATE depreciation_areas
      SET
        code = COALESCE($1, code),
        name = COALESCE($2, name),
        description = $3,
        is_active = COALESCE($4, is_active),
        useful_life_years = $5,
        depreciation_rate = $6,
        calculation_method = $7,
        company_code_id = $8,
        sort_order = $9,
        posting_indicator = COALESCE($10, posting_indicator),
        ledger_group = $11,
        currency_type = COALESCE($12, currency_type),
        fiscal_year_variant_id = $13,
        base_method = COALESCE($14, base_method),
        period_control = COALESCE($15, period_control),
        updated_at = NOW()
      WHERE id = $16
      RETURNING *
    `, [
      code,
      name,
      description !== undefined ? description : null,
      is_active,
      useful_life_years !== undefined ? useful_life_years : null,
      depreciation_rate !== undefined ? depreciation_rate : null,
      calculation_method !== undefined ? calculation_method : null,
      company_code_id !== undefined ? company_code_id : null,
      sort_order !== undefined ? sort_order : null,
      posting_indicator,
      ledger_group !== undefined ? ledger_group : null,
      currency_type,
      fiscal_year_variant_id !== undefined ? fiscal_year_variant_id : null,
      base_method,
      period_control,
      id
    ]);

    await client.query('COMMIT');
    res.json(result.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating depreciation area:', error);
    res.status(500).json({ message: 'Error updating depreciation area', error: error.message });
  } finally {
    client.release();
  }
});

// Delete depreciation area
router.delete('/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { id } = req.params;

    // Check if depreciation area exists
    const existingCheck = await client.query(
      'SELECT id FROM depreciation_areas WHERE id = $1',
      [id]
    );

    if (existingCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Depreciation area not found' });
    }

    // Check if area is used in asset depreciation area assignments
    const usageCheck = await client.query(
      'SELECT COUNT(*) as count FROM asset_depreciation_area_assignments WHERE depreciation_area_id = $1',
      [id]
    );

    if (parseInt(usageCheck.rows[0].count) > 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        message: 'Cannot delete depreciation area. It is assigned to one or more assets.'
      });
    }

    // Delete depreciation area
    await client.query('DELETE FROM depreciation_areas WHERE id = $1', [id]);

    await client.query('COMMIT');
    res.json({ message: 'Depreciation area deleted successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error deleting depreciation area:', error);
    res.status(500).json({ message: 'Error deleting depreciation area', error: error.message });
  } finally {
    client.release();
  }
});

export default router;

