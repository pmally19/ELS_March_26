import pkg from 'pg';
const { Pool } = pkg;
import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = join(__filename, '..');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'mallyerp',
  user: 'postgres',
  password: 'Mokshith@21'
});

async function addTransportationZonesStandardFields() {
  const client = await pool.connect();
  try {
    console.log('Adding standard fields to transportation_zones table...');
    const sql = readFileSync(
      join(__dirname, '../database/migrations/add-transportation-zones-standard-fields.sql'),
      'utf8'
    );
    
    await client.query('BEGIN');
    
    // Split SQL into statements, preserving DO $$ blocks
    const statements = [];
    let currentStatement = '';
    let inDoBlock = false;
    let doBlockDepth = 0;
    
    const lines = sql.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.startsWith('--')) continue;
      
      currentStatement += line + '\n';
      
      // Track DO $$ blocks
      if (line.includes('DO $$') || line.includes('DO$')) {
        inDoBlock = true;
        doBlockDepth = 0;
      }
      if (inDoBlock) {
        if (line.includes('$$')) doBlockDepth++;
        if (line.includes('END $$') || (line.includes('END') && line.includes('$$'))) {
          doBlockDepth--;
          if (doBlockDepth <= 0) {
            inDoBlock = false;
            if (line.endsWith(';')) {
              statements.push(currentStatement.trim());
              currentStatement = '';
            }
          }
        }
      } else if (line.endsWith(';')) {
        statements.push(currentStatement.trim());
        currentStatement = '';
      }
    }
    
    if (currentStatement.trim()) {
      statements.push(currentStatement.trim());
    }
    
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await client.query(statement);
          const preview = statement.replace(/\s+/g, ' ').substring(0, 60);
          console.log(`✓ ${preview}...`);
        } catch (error) {
          // Ignore "already exists" errors
          if (error.message.includes('already exists') || 
              error.code === '42710' || // duplicate_object
              error.code === '42P07' || // duplicate_table
              error.code === '42704') { // undefined_object
            const preview = statement.replace(/\s+/g, ' ').substring(0, 60);
            console.log(`⚠ Skipped (already exists/not applicable): ${preview}...`);
          } else {
            console.error(`❌ Error in statement: ${statement.substring(0, 100)}`);
            throw error;
          }
        }
      }
    }
    
    await client.query('COMMIT');
    
    console.log('\n✅ Successfully added standard fields to transportation_zones table!');
    
    // Verify the structure
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'transportation_zones' 
      ORDER BY ordinal_position
    `);
    console.log(`\n📊 Total fields in transportation_zones table: ${result.rows.length}\n`);
    
    console.log('✅ Migration completed successfully!');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

addTransportationZonesStandardFields();

