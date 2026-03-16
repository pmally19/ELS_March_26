import { Router, Request, Response } from 'express';
import { pool } from '../../db';
import { insertAccountingPrincipleSchema, updateAccountingPrincipleSchema } from '@shared/accounting-principles-schema';

const router = Router();

// GET all accounting principles
router.get('/', async (req: Request, res: Response) => {
  try {
    const { active } = req.query;
    let query = 'SELECT * FROM accounting_principles WHERE 1=1';
    const params: any[] = [];
    
    if (active !== undefined) {
      query += ' AND is_active = $1';
      params.push(active === 'true');
    }
    
    query += ' ORDER BY code';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching accounting principles:', error);
    res.status(500).json({ error: 'Failed to fetch accounting principles', message: error.message });
  }
});

// GET accounting principle by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }
    
    const result = await pool.query(
      'SELECT * FROM accounting_principles WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Accounting principle not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error fetching accounting principle:', error);
    res.status(500).json({ error: 'Failed to fetch accounting principle', message: error.message });
  }
});

// POST create new accounting principle
router.post('/', async (req: Request, res: Response) => {
  try {
    const validationResult = insertAccountingPrincipleSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: validationResult.error.errors 
      });
    }
    
    const data = validationResult.data;
    
    // Check if code already exists
    const codeCheck = await pool.query(
      'SELECT id FROM accounting_principles WHERE code = $1',
      [data.code]
    );
    
    if (codeCheck.rows.length > 0) {
      return res.status(409).json({ 
        error: 'Accounting principle with this code already exists',
        existingCode: data.code
      });
    }
    
    // Insert accounting principle
    const result = await pool.query(`
      INSERT INTO accounting_principles (
        code, name, description, standard_type, jurisdiction, effective_date, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [
      data.code,
      data.name,
      data.description || null,
      data.standardType || null,
      data.jurisdiction || null,
      data.effectiveDate || null,
      data.isActive !== undefined ? data.isActive : true,
    ]);
    
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Error creating accounting principle:', error);
    if (error.code === '23505') {
      res.status(409).json({ error: 'Accounting principle with this code already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create accounting principle', message: error.message });
    }
  }
});

// PUT update accounting principle
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }
    
    const validationResult = updateAccountingPrincipleSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: validationResult.error.errors 
      });
    }
    
    const data = validationResult.data;
    
    // Check if accounting principle exists
    const existingCheck = await pool.query(
      'SELECT id, code FROM accounting_principles WHERE id = $1',
      [id]
    );
    
    if (existingCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Accounting principle not found' });
    }
    
    // Check if code is being changed and if it conflicts
    if (data.code && data.code !== existingCheck.rows[0].code) {
      const codeCheck = await pool.query(
        'SELECT id FROM accounting_principles WHERE code = $1 AND id != $2',
        [data.code, id]
      );
      if (codeCheck.rows.length > 0) {
        return res.status(409).json({ error: 'Accounting principle with this code already exists' });
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
      updateValues.push(data.description || null);
    }
    if (data.standardType !== undefined) {
      updateFields.push(`standard_type = $${paramCount++}`);
      updateValues.push(data.standardType || null);
    }
    if (data.jurisdiction !== undefined) {
      updateFields.push(`jurisdiction = $${paramCount++}`);
      updateValues.push(data.jurisdiction || null);
    }
    if (data.effectiveDate !== undefined) {
      updateFields.push(`effective_date = $${paramCount++}`);
      updateValues.push(data.effectiveDate || null);
    }
    if (data.isActive !== undefined) {
      updateFields.push(`is_active = $${paramCount++}`);
      updateValues.push(data.isActive);
    }
    
    updateFields.push(`updated_at = NOW()`);
    updateValues.push(id);
    
    if (updateFields.length === 1) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    const query = `
      UPDATE accounting_principles 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;
    
    const result = await pool.query(query, updateValues);
    
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error updating accounting principle:', error);
    if (error.code === '23505') {
      res.status(409).json({ error: 'Accounting principle with this code already exists' });
    } else {
      res.status(500).json({ error: 'Failed to update accounting principle', message: error.message });
    }
  }
});

// DELETE accounting principle
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }
    
    // Check if accounting principle exists
    const existingCheck = await pool.query(
      'SELECT id FROM accounting_principles WHERE id = $1',
      [id]
    );
    
    if (existingCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Accounting principle not found' });
    }
    
    // Check for references in ledgers table
    const ledgerCheck = await pool.query(
      'SELECT id FROM ledgers WHERE accounting_principle = (SELECT code FROM accounting_principles WHERE id = $1) LIMIT 1',
      [id]
    );
    
    if (ledgerCheck.rows.length > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete accounting principle. It is referenced by one or more ledgers.' 
      });
    }
    
    // Delete accounting principle
    await pool.query('DELETE FROM accounting_principles WHERE id = $1', [id]);
    
    res.status(200).json({ message: 'Accounting principle deleted successfully', id });
  } catch (error: any) {
    console.error('Error deleting accounting principle:', error);
    res.status(500).json({ error: 'Failed to delete accounting principle', message: error.message });
  }
});

export default router;

