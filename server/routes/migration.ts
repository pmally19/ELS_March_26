import { Request, Response, Router } from 'express';
import { ensureActivePool } from '../database';
import fs from 'fs';
import path from 'path';

const router = Router();

// Migration endpoint to fix movement types columns
router.post('/fix-movement-types-columns', async (req: Request, res: Response) => {
  try {
    const pool = ensureActivePool();
    console.log('Starting movement types column migration...');
    
    // Read the migration SQL file
    const sqlPath = path.join(__dirname, '../../migration-scripts/fix-movement-types-columns.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Execute the migration
    await pool.query(sql);
    
    console.log('✅ Movement types migration completed successfully');
    
    // Verify the columns exist
    const result = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'movement_types' AND table_schema = 'public'
      ORDER BY column_name
    `);
    
    const columns = result.rows.map(row => row.column_name);
    console.log('📋 Current movement_types columns:', columns);
    
    res.status(200).json({
      success: true,
      message: 'Movement types migration completed successfully',
      columns: columns
    });
    
  } catch (error: any) {
    console.error('❌ Movement types migration failed:', error.message);
    res.status(500).json({
      success: false,
      message: 'Movement types migration failed',
      error: error.message
    });
  }
});

// Migration endpoint to fix workcenters columns
router.post('/fix-workcenters-columns', async (req: Request, res: Response) => {
  try {
    const pool = ensureActivePool();
    console.log('Starting workcenters column migration...');
    
    // Read the migration SQL file
    const sqlPath = path.join(__dirname, '../../migration-scripts/fix-workcenters-columns.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Execute the migration
    await pool.query(sql);
    
    console.log('✅ Migration completed successfully');
    
    // Verify the columns exist
    const result = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'work_centers' AND table_schema = 'public'
      ORDER BY column_name
    `);
    
    const columns = result.rows.map(row => row.column_name);
    console.log('📋 Current work_centers columns:', columns);
    
    res.status(200).json({
      success: true,
      message: 'Migration completed successfully',
      columns: columns
    });
    
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    res.status(500).json({
      success: false,
      message: 'Migration failed',
      error: error.message
    });
  }
});

export default router;
