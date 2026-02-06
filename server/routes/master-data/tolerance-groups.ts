import { Router, Request, Response } from 'express';
import { pool } from '../../db';
import { insertToleranceGroupSchema, updateToleranceGroupSchema } from '@shared/tolerance-groups-schema';

const router = Router();

// GET all tolerance groups
router.get('/', async (req: Request, res: Response) => {
  try {
    const { active, company_code } = req.query;
    let query = 'SELECT * FROM tolerance_groups WHERE 1=1';
    const params: any[] = [];
    
    if (active !== undefined) {
      query += ` AND is_active = $${params.length + 1}`;
      params.push(active === 'true');
    }
    
    if (company_code) {
      query += ` AND company_code = $${params.length + 1}`;
      params.push(company_code);
    }
    
    query += ' ORDER BY code';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching tolerance groups:', error);
    res.status(500).json({ error: 'Failed to fetch tolerance groups', message: error.message });
  }
});

// GET tolerance group by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }
    
    const result = await pool.query(
      'SELECT * FROM tolerance_groups WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tolerance group not found' });
    }
    
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error fetching tolerance group:', error);
    res.status(500).json({ error: 'Failed to fetch tolerance group', message: error.message });
  }
});

// POST create new tolerance group
router.post('/', async (req: Request, res: Response) => {
  try {
    const validationResult = insertToleranceGroupSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: validationResult.error.errors 
      });
    }
    
    const data = validationResult.data;
    
    // Check if code already exists
    const codeCheck = await pool.query(
      'SELECT id FROM tolerance_groups WHERE code = $1',
      [data.code]
    );
    
    if (codeCheck.rows.length > 0) {
      return res.status(409).json({ 
        error: 'Tolerance group with this code already exists',
        existingCode: data.code
      });
    }
    
    // Insert tolerance group
    const result = await pool.query(`
      INSERT INTO tolerance_groups (
        code, name, description, company_code, user_type, 
        upper_amount_limit, percentage_limit, absolute_amount_limit,
        payment_difference_tolerance, cash_discount_tolerance, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [
      data.code,
      data.name,
      data.description || null,
      data.companyCode,
      data.userType,
      data.upperAmountLimit || null,
      data.percentageLimit || null,
      data.absoluteAmountLimit || null,
      data.paymentDifferenceTolerance || null,
      data.cashDiscountTolerance || null,
      data.isActive !== undefined ? data.isActive : true, // Default only if not provided
    ]);
    
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('Error creating tolerance group:', error);
    if (error.code === '23505') {
      res.status(409).json({ error: 'Tolerance group with this code already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create tolerance group', message: error.message });
    }
  }
});

// PUT update tolerance group
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }
    
    const validationResult = updateToleranceGroupSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: validationResult.error.errors 
      });
    }
    
    const data = validationResult.data;
    
    // Check if tolerance group exists
    const existingCheck = await pool.query(
      'SELECT id, code FROM tolerance_groups WHERE id = $1',
      [id]
    );
    
    if (existingCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Tolerance group not found' });
    }
    
    // Check if code is being changed and if it conflicts
    if (data.code && data.code !== existingCheck.rows[0].code) {
      const codeCheck = await pool.query(
        'SELECT id FROM tolerance_groups WHERE code = $1 AND id != $2',
        [data.code, id]
      );
      if (codeCheck.rows.length > 0) {
        return res.status(409).json({ error: 'Tolerance group with this code already exists' });
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
    if (data.companyCode !== undefined) {
      updateFields.push(`company_code = $${paramCount++}`);
      updateValues.push(data.companyCode);
    }
    if (data.userType !== undefined) {
      updateFields.push(`user_type = $${paramCount++}`);
      updateValues.push(data.userType);
    }
    if (data.upperAmountLimit !== undefined) {
      updateFields.push(`upper_amount_limit = $${paramCount++}`);
      updateValues.push(data.upperAmountLimit || null);
    }
    if (data.percentageLimit !== undefined) {
      updateFields.push(`percentage_limit = $${paramCount++}`);
      updateValues.push(data.percentageLimit || null);
    }
    if (data.absoluteAmountLimit !== undefined) {
      updateFields.push(`absolute_amount_limit = $${paramCount++}`);
      updateValues.push(data.absoluteAmountLimit || null);
    }
    if (data.paymentDifferenceTolerance !== undefined) {
      updateFields.push(`payment_difference_tolerance = $${paramCount++}`);
      updateValues.push(data.paymentDifferenceTolerance || null);
    }
    if (data.cashDiscountTolerance !== undefined) {
      updateFields.push(`cash_discount_tolerance = $${paramCount++}`);
      updateValues.push(data.cashDiscountTolerance || null);
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
      UPDATE tolerance_groups 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;
    
    const result = await pool.query(query, updateValues);
    
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error updating tolerance group:', error);
    if (error.code === '23505') {
      res.status(409).json({ error: 'Tolerance group with this code already exists' });
    } else {
      res.status(500).json({ error: 'Failed to update tolerance group', message: error.message });
    }
  }
});

// DELETE tolerance group
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid ID format' });
    }
    
    // Check if tolerance group exists
    const existingCheck = await pool.query(
      'SELECT id FROM tolerance_groups WHERE id = $1',
      [id]
    );
    
    if (existingCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Tolerance group not found' });
    }
    
    // Delete tolerance group
    await pool.query('DELETE FROM tolerance_groups WHERE id = $1', [id]);
    
    res.status(200).json({ message: 'Tolerance group deleted successfully', id });
  } catch (error: any) {
    console.error('Error deleting tolerance group:', error);
    res.status(500).json({ error: 'Failed to delete tolerance group', message: error.message });
  }
});

export { router as toleranceGroupsRouter };
