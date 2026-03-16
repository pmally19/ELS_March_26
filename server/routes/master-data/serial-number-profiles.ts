import express, { Request, Response } from "express";
import { pool } from "../../db";

const router = express.Router();

async function ensureTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS public.serial_number_profiles (
      id SERIAL PRIMARY KEY,
      code VARCHAR(50) NOT NULL UNIQUE,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      serial_number_format VARCHAR(255),
      serial_number_length INTEGER,
      tracking_level VARCHAR(50),
      warranty_tracking BOOLEAN DEFAULT false,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

router.get('/', async (_req: Request, res: Response) => {
  try {
    await ensureTable();
    const result = await pool.query('SELECT * FROM public.serial_number_profiles ORDER BY id');
    const rows = result.rows.map((r: any) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      description: r.description || '',
      serialNumberFormat: r.serial_number_format || '',
      serialNumberLength: r.serial_number_length ?? null,
      trackingLevel: r.tracking_level || '',
      warrantyTracking: r.warranty_tracking === true,
      isActive: r.is_active !== false,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
    res.json(rows);
  } catch (error: any) {
    console.error('Error fetching serial number profiles:', error);
    res.status(500).json({ message: 'Failed to fetch serial number profiles', error: error.message });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    await ensureTable();
    const body = req.body || {};
    const code = (body.code || '').toString().trim();
    const name = (body.name || '').toString().trim();
    if (!code || !name) {
      return res.status(400).json({ message: 'code and name are required' });
    }
    const description = body.description ?? '';
    const serial_number_format = body.serialNumberFormat ?? body.serial_number_format ?? '';
    const serial_number_length = body.serialNumberLength ?? body.serial_number_length ?? null;
    const tracking_level = body.trackingLevel ?? body.tracking_level ?? '';
    const warranty_tracking = body.warrantyTracking ?? body.warranty_tracking ?? false;
    const is_active = body.isActive ?? body.is_active ?? true;

    const result = await pool.query(
      `INSERT INTO public.serial_number_profiles
       (code, name, description, serial_number_format, serial_number_length, tracking_level, warranty_tracking, is_active, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8, NOW(), NOW())
       RETURNING *`,
      [code, name, description, serial_number_format, serial_number_length, tracking_level, warranty_tracking, is_active]
    );
    const r = result.rows[0];
    res.status(201).json({
      id: r.id,
      code: r.code,
      name: r.name,
      description: r.description || '',
      serialNumberFormat: r.serial_number_format || '',
      serialNumberLength: r.serial_number_length ?? null,
      trackingLevel: r.tracking_level || '',
      warrantyTracking: r.warranty_tracking === true,
      isActive: r.is_active !== false,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    });
  } catch (error: any) {
    console.error('Error creating serial number profile:', error);
    res.status(500).json({ message: 'Failed to create serial number profile', error: error.message });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    await ensureTable();
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ message: 'Invalid id' });

    const body = req.body || {};
    const fields: string[] = [];
    const values: any[] = [];
    let i = 1;

    const setField = (col: string, val: any, mapper?: (v: any) => any) => {
      if (val === undefined) return;
      fields.push(`${col} = $${i++}`);
      values.push(mapper ? mapper(val) : val);
    };

    setField('code', body.code);
    setField('name', body.name);
    setField('description', body.description);
    setField('serial_number_format', body.serialNumberFormat ?? body.serial_number_format);
    setField('serial_number_length', body.serialNumberLength ?? body.serial_number_length, (v) => (v === null || v === '' ? null : Number(v)));
    setField('tracking_level', body.trackingLevel ?? body.tracking_level);
    setField('warranty_tracking', body.warrantyTracking ?? body.warranty_tracking, (v) => Boolean(v));
    setField('is_active', body.isActive ?? body.is_active, (v) => Boolean(v));
    fields.push('updated_at = NOW()');

    if (values.length === 0 && fields.length === 1) {
      return res.status(200).json({ message: 'No changes to apply' });
    }

    values.push(id);
    const sql = `UPDATE public.serial_number_profiles SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`;
    const result = await pool.query(sql, values);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Not found' });
    const r = result.rows[0];
    res.json({
      id: r.id,
      code: r.code,
      name: r.name,
      description: r.description || '',
      serialNumberFormat: r.serial_number_format || '',
      serialNumberLength: r.serial_number_length ?? null,
      trackingLevel: r.tracking_level || '',
      warrantyTracking: r.warranty_tracking === true,
      isActive: r.is_active !== false,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    });
  } catch (error: any) {
    console.error('Error updating serial number profile:', error);
    res.status(500).json({ message: 'Failed to update serial number profile', error: error.message });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    await ensureTable();
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ message: 'Invalid id' });
    const result = await pool.query('DELETE FROM public.serial_number_profiles WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) return res.status(404).json({ message: 'Not found' });
    res.json({ message: 'Serial number profile deleted successfully', id });
  } catch (error: any) {
    console.error('Error deleting serial number profile:', error);
    res.status(500).json({ message: 'Failed to delete serial number profile', error: error.message });
  }
});

export default router;


