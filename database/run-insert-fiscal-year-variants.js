import pkg from 'pg';
const { Pool } = pkg;
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'mallyerp',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'Mokshith@21',
});

async function insertData() {
  const client = await pool.connect();
  try {
    console.log('🔄 Inserting Fiscal Year Variants data...');
    
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, 'migrations', 'insert-fiscal-year-variants-data.sql'),
      'utf8'
    );
    
    await client.query('BEGIN');
    
    // Split the SQL by semicolons and execute each statement
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    for (const statement of statements) {
      if (statement.trim()) {
        await client.query(statement);
      }
    }
    
    await client.query('COMMIT');
    
    console.log('✅ Fiscal Year Variants data inserted successfully!');
    
    // Verify the data
    const countResult = await client.query('SELECT COUNT(*) as count FROM fiscal_year_variants');
    console.log(`\n📊 Total fiscal year variants: ${countResult.rows[0].count}`);
    
    const dataResult = await client.query(`
      SELECT variant_id, description, posting_periods, special_periods, active 
      FROM fiscal_year_variants 
      ORDER BY variant_id
    `);
    
    console.log('\n📋 Fiscal Year Variants:');
    dataResult.rows.forEach(row => {
      console.log(`   - ${row.variant_id}: ${row.description} (${row.posting_periods} periods, ${row.special_periods} special)`);
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Insert failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

insertData().catch(console.error);

