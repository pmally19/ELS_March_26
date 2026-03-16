/**
 * Controlling Profit Center Routes
 * Handles profit center operations for controlling module
 */

import express from 'express';
// Reuse centralized pool to ensure same DB config
import { pool } from '../db.js';
const router = express.Router();

// Get all profit centers (compatible with multiple schemas)
router.get('/api/controlling/profit-centers', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        id,
        COALESCE(code, profit_center)               AS code,
        COALESCE(name, description, '')            AS name,
        COALESCE(description, name, '')            AS description,
        COALESCE(company_code_id, NULL)            AS company_code_id,
        COALESCE(person_responsible, NULL)         AS person_responsible,
        COALESCE(cost_center_id, NULL)             AS cost_center_id,
        COALESCE(active, true)                     AS active,
        created_at,
        COALESCE(updated_at, created_at)           AS updated_at
      FROM profit_centers
      WHERE COALESCE(active, true) = true
      ORDER BY id
    `);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching profit centers:', error);
    res.status(500).json({ message: 'Error fetching profit centers', error: error.message });
  }
});

// Create new profit center
router.post('/api/controlling/profit-centers', async (req, res) => {
  try {
    let { code, name, description, company_code_id, person_responsible, cost_center_id } = req.body || {};
    code = (code || '').toString().trim();
    name = (name || '').toString().trim();
    description = (description || name || '').toString().trim();
    if (!code || !name) {
      return res.status(400).json({ message: 'code and name are required' });
    }

    // Detect column set
    const cols = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name='profit_centers'`);
    const set = new Set(cols.rows.map(r => r.column_name));

    // Build portable INSERT
    const colCode = set.has('code') ? 'code' : 'profit_center';
    const colName = set.has('name') ? 'name' : (set.has('description') ? 'description' : null);
    const colDesc = set.has('description') ? 'description' : (set.has('name') ? 'name' : null);
    const colCompany = set.has('company_code_id') ? 'company_code_id' : (set.has('company_code') ? 'company_code' : null);
    const colPerson = set.has('person_responsible') ? 'person_responsible' : null;
    const colCost = set.has('cost_center_id') ? 'cost_center_id' : null;
    const colActive = set.has('active') ? 'active' : null;

    const fields = [];
    const values = [];
    const params = [];

    const pushField = (col, val) => { if (col) { fields.push(col); params.push(val); values.push(`$${params.length}`); } };
    pushField(colCode, code);
    // Avoid writing to the same column twice
    if (colName && colDesc && colName === colDesc) {
      // Single text column available; choose description if provided, else name
      pushField(colName, description || name);
    } else {
      pushField(colName, name);
      pushField(colDesc, description);
    }
    pushField(colCompany, colCompany === 'company_code_id' ? (company_code_id ?? null) : (company_code_id ?? null));
    pushField(colPerson, person_responsible ?? null);
    pushField(colCost, cost_center_id ?? null);
    pushField(colActive, true);
    if (set.has('created_at')) { fields.push('created_at'); values.push('NOW()'); }
    if (set.has('updated_at')) { fields.push('updated_at'); values.push('NOW()'); }

    const sql = `INSERT INTO profit_centers (${fields.join(',')}) VALUES (${values.join(',')}) RETURNING *`;
    const result = await pool.query(sql, params);
    return res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating profit center:', error);
    res.status(500).json({ message: 'Error creating profit center', error: error.message });
  }
});

// Update profit center
router.put('/api/controlling/profit-centers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { code, name, description, company_code_id, person_responsible, cost_center_id, active } = req.body || {};
    const cols = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name='profit_centers'`);
    const set = new Set(cols.rows.map(r => r.column_name));

    const updates = [];
    const params = [];
    const add = (col, val) => { if (col !== null && val !== undefined) { params.push(val); updates.push(`${col} = $${params.length}`); } };

    add(set.has('code') ? 'code' : (set.has('profit_center') ? 'profit_center' : null), code);
    if (set.has('name')) add('name', name);
    if (set.has('description')) add('description', description);
    add(set.has('company_code_id') ? 'company_code_id' : (set.has('company_code') ? 'company_code' : null), company_code_id);
    if (set.has('person_responsible')) add('person_responsible', person_responsible);
    if (set.has('cost_center_id')) add('cost_center_id', cost_center_id);
    if (set.has('active')) add('active', active);
    if (set.has('updated_at')) updates.push('updated_at = NOW()');

    if (updates.length === 0) {
      return res.status(400).json({ message: 'No updatable fields provided' });
    }

    params.push(id);
    const result = await pool.query(`UPDATE profit_centers SET ${updates.join(', ')} WHERE id = $${params.length} RETURNING *`, params);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Not found' });
    return res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating profit center:', error);
    res.status(500).json({ message: 'Error updating profit center', error: error.message });
  }
});

// Delete (soft delete if active column exists)
router.delete('/api/controlling/profit-centers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const cols = await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name='profit_centers'`);
    const set = new Set(cols.rows.map(r => r.column_name));
    if (set.has('active')) {
      const result = await pool.query(`UPDATE profit_centers SET active = false, updated_at = NOW() WHERE id = $1 RETURNING id`, [id]);
      if (result.rows.length === 0) return res.status(404).json({ message: 'Not found' });
      return res.json({ message: 'Deactivated successfully' });
    }
    const result = await pool.query(`DELETE FROM profit_centers WHERE id = $1 RETURNING id`, [id]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Not found' });
    return res.json({ message: 'Deleted successfully' });
  } catch (error) {
    console.error('Error deleting profit center:', error);
    res.status(500).json({ message: 'Error deleting profit center', error: error.message });
  }
});

export default router;