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

async function addInventoryFinanceCostFields() {
  const client = await pool.connect();
  try {
    console.log('📊 Adding Finance & Cost Integration Fields to Inventory Tables...\n');
    
    const sql = readFileSync(
      join(__dirname, '../database/migrations/add-inventory-finance-cost-fields.sql'),
      'utf8'
    );
    
    await client.query('BEGIN');
    
    // Parse SQL file - extract DO blocks and regular statements
    const lines = sql.split('\n');
    let currentStatement = '';
    let inDoBlock = false;
    let doBlockDepth = 0;
    let section = '';
    const statements = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Track section headers
      if (line.includes('--') && line.includes('===')) {
        section = line.replace(/--.*?===\s*/, '').replace(/\s*===.*/, '').trim();
        if (section) {
          console.log(`\n📋 ${section}\n`);
        }
        continue;
      }
      
      // Skip comment-only lines
      if (line.startsWith('--') || line.length === 0) {
        continue;
      }
      
      // Track DO block start
      if (line.includes('DO $$')) {
        inDoBlock = true;
        doBlockDepth = 1;
        currentStatement = line;
        continue;
      }
      
      // Track DO block end
      if (inDoBlock) {
        currentStatement += '\n' + line;
        if (line.includes('END $$')) {
          doBlockDepth--;
          if (doBlockDepth === 0) {
            statements.push({ type: 'DO', sql: currentStatement });
            currentStatement = '';
            inDoBlock = false;
          }
        } else if (line.includes('DO $$')) {
          doBlockDepth++;
        }
        continue;
      }
      
      // Regular statements
      if (line && !line.startsWith('COMMENT ON')) {
        currentStatement += (currentStatement ? '\n' : '') + line;
        
        // Check if statement is complete (ends with semicolon)
        if (line.endsWith(';')) {
          statements.push({ type: 'REGULAR', sql: currentStatement });
          currentStatement = '';
        }
      }
    }
    
    // Execute statements
    for (const stmt of statements) {
      try {
        await client.query(stmt.sql);
        const preview = stmt.sql.replace(/\s+/g, ' ').substring(0, 80);
        console.log(`✓ ${preview}...`);
      } catch (error) {
        if (error.message.includes('already exists') || 
            error.message.includes('duplicate') ||
            error.message.includes('does not exist') ||
            error.code === '42710' ||
            error.code === '42P07' ||
            error.code === '42P16' ||
            error.code === '42704') {
          const preview = stmt.sql.replace(/\s+/g, ' ').substring(0, 80);
          console.log(`⚠ Skipped (already exists/not applicable): ${preview}...`);
        } else {
          console.error(`❌ Error: ${error.message}`);
          console.error(`Statement preview: ${stmt.sql.substring(0, 200)}`);
          throw error;
        }
      }
    }
    
    // Add comments separately
    console.log('\n📝 Adding comments...');
    const commentStatements = sql.match(/COMMENT ON COLUMN[^;]+;/g) || [];
    for (const comment of commentStatements) {
      try {
        await client.query(comment);
        const preview = comment.replace(/\s+/g, ' ').substring(0, 60);
        console.log(`✓ ${preview}...`);
      } catch (error) {
        if (error.code === '42704') { // undefined_object
          console.log(`⚠ Skipped comment (object may not exist yet)`);
        } else {
          console.log(`⚠ Comment error (non-critical): ${error.message}`);
        }
      }
    }
    
    await client.query('COMMIT');
    
    console.log('\n✅ Successfully added Finance & Cost Integration Fields!');
    
    // Verify the structure
    const stockMovementsResult = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'stock_movements' 
      AND column_name IN ('cost_center_id', 'profit_center_id', 'cogs_amount', 'total_landed_cost', 'overhead_amount', 'wip_amount', 'variance_amount', 'financial_posting_status')
      ORDER BY column_name
    `);
    
    console.log(`\n📊 Added fields in stock_movements: ${stockMovementsResult.rows.length}`);
    stockMovementsResult.rows.forEach(row => {
      console.log(`   - ${row.column_name} (${row.data_type})`);
    });
    
    console.log('\n✅ Migration completed successfully!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

addInventoryFinanceCostFields();

