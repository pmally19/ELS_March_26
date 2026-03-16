import { Router, Request, Response } from 'express';
import { db, pool } from '../../db';
import { eq } from 'drizzle-orm';

const router = Router();

// GET /api/master-data/tax-codes - Fetch all tax codes with jurisdiction details
router.get('/', async (req: Request, res: Response) => {
  try {
    console.log('📊 Fetching tax codes...');
    
    const result = await pool.query(`
      SELECT 
        tc.*,
        tj.jurisdiction_code,
        tj.jurisdiction_name,
        tj.jurisdiction_type,
        tj.state_province as jurisdiction_state
      FROM tax_codes tc
      LEFT JOIN tax_jurisdictions tj ON tc.tax_jurisdiction_id = tj.id
      ORDER BY tc.id DESC
    `);
    
    console.log(`✅ Tax codes fetched: ${result.rows.length} records`);
    res.json(result.rows);
  } catch (error: any) {
    console.error('❌ Error fetching tax codes:', error);
    res.status(500).json({ 
      message: 'Failed to fetch tax codes',
      error: error.message 
    });
  }
});

// GET /api/master-data/tax-codes/:id - Fetch single tax code
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    console.log(`📊 Fetching tax code with ID: ${id}`);
    
    const result = await pool.query(`
      SELECT 
        tc.*,
        tj.jurisdiction_code,
        tj.jurisdiction_name,
        tj.jurisdiction_type,
        tj.state_province as jurisdiction_state
      FROM tax_codes tc
      LEFT JOIN tax_jurisdictions tj ON tc.tax_jurisdiction_id = tj.id
      WHERE tc.id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Tax code not found' });
    }
    
    console.log(`✅ Tax code found:`, result.rows[0]);
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('❌ Error fetching tax code:', error);
    res.status(500).json({ 
      message: 'Failed to fetch tax code',
      error: error.message 
    });
  }
});

// POST /api/master-data/tax-codes - Create new tax code
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      tax_code,
      description,
      tax_rate,
      tax_type,
      country,
      jurisdiction,
      tax_jurisdiction_id,
      effective_from,
      effective_to,
      tax_account,
      tax_base_account,
      is_active
    } = req.body;
    
    console.log('📝 Creating tax code:', req.body);
    
    // Validate required fields
    if (!tax_code || !description || tax_rate === undefined) {
      return res.status(400).json({ 
        message: 'Tax code, description, and tax rate are required' 
      });
    }
    
    const result = await pool.query(`
      INSERT INTO tax_codes (
        tax_code, description, tax_rate, tax_type, country,
        jurisdiction, tax_jurisdiction_id, effective_from, effective_to,
        tax_account, tax_base_account, is_active,
        created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
      RETURNING *
    `, [
      tax_code,
      description,
      tax_rate,
      tax_type || null,
      country || null,
      jurisdiction || null,
      tax_jurisdiction_id || null,
      effective_from || null,
      effective_to || null,
      tax_account || null,
      tax_base_account || null,
      is_active !== false
    ]);
    
    console.log('✅ Tax code created:', result.rows[0]);
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error('❌ Error creating tax code:', error);
    res.status(500).json({ 
      message: 'Failed to create tax code',
      error: error.message 
    });
  }
});

// PUT /api/master-data/tax-codes/:id - Update tax code
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      tax_code,
      description,
      tax_rate,
      tax_type,
      country,
      jurisdiction,
      tax_jurisdiction_id,
      effective_from,
      effective_to,
      tax_account,
      tax_base_account,
      is_active
    } = req.body;
    
    console.log(`📝 Updating tax code ${id}:`, req.body);
    
    const result = await pool.query(`
      UPDATE tax_codes
      SET 
        tax_code = $1,
        description = $2,
        tax_rate = $3,
        tax_type = $4,
        country = $5,
        jurisdiction = $6,
        tax_jurisdiction_id = $7,
        effective_from = $8,
        effective_to = $9,
        tax_account = $10,
        tax_base_account = $11,
        is_active = $12,
        updated_at = NOW()
      WHERE id = $13
      RETURNING *
    `, [
      tax_code,
      description,
      tax_rate,
      tax_type || null,
      country || null,
      jurisdiction || null,
      tax_jurisdiction_id || null,
      effective_from || null,
      effective_to || null,
      tax_account || null,
      tax_base_account || null,
      is_active !== false,
      id
    ]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Tax code not found' });
    }
    
    console.log('✅ Tax code updated:', result.rows[0]);
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('❌ Error updating tax code:', error);
    res.status(500).json({ 
      message: 'Failed to update tax code',
      error: error.message 
    });
  }
});

// DELETE /api/master-data/tax-codes/:id - Delete tax code
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    console.log(`🗑️ Deleting tax code with ID: ${id}`);
    
    const result = await pool.query(`
      DELETE FROM tax_codes
      WHERE id = $1
      RETURNING *
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Tax code not found' });
    }
    
    console.log('✅ Tax code deleted:', result.rows[0]);
    res.json({ message: 'Tax code deleted successfully', id });
  } catch (error: any) {
    console.error('❌ Error deleting tax code:', error);
    res.status(500).json({ 
      message: 'Failed to delete tax code',
      error: error.message 
    });
  }
});

export default router;

