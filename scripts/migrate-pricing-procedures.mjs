// Migration to fix pricing_procedures table
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:12345@localhost:5432/mallyerp',
});

async function migrate() {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        console.log('🔧 Starting migration...\n');

        // 1. Add company_code_id column to pricing_procedures
        console.log('1. Adding company_code_id column...');
        await client.query(`
      ALTER TABLE pricing_procedures 
      ADD COLUMN IF NOT EXISTS company_code_id INTEGER REFERENCES company_codes(id)
    `);
        console.log('   ✅ Added company_code_id column\n');

        // 2. Update procedure_code to be procedure_code for consistency
        console.log('2. Renaming columns for consistency...');
        const hasCode = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name='pricing_procedures' AND column_name='code'
    `);

        if (hasCode.rows.length === 0) {
            // Already has procedure_code, good
            console.log('   ✅ Columns already correct\n');
        } else {
            await client.query(`
        ALTER TABLE pricing_procedures RENAME COLUMN code TO procedure_code
      `);
            console.log('   ✅ Renamed code to procedure_code\n');
        }

        // 3. Rename name to procedure_name
        const hasName = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name='pricing_procedures' AND column_name='name'
    `);

        if (hasName.rows.length > 0) {
            await client.query(`
        ALTER TABLE pricing_procedures RENAME COLUMN name TO procedure_name
      `);
            console.log('   ✅ Renamed name to procedure_name\n');
        }

        // 4. Create pricing_procedure_steps table if not exists
        console.log('3. Creating pricing_procedure_steps table...');
        await client.query(`
      CREATE TABLE IF NOT EXISTS pricing_procedure_steps (
        id SERIAL PRIMARY KEY,
        procedure_id INTEGER NOT NULL REFERENCES pricing_procedures(id) ON DELETE CASCADE,
        step_number INTEGER NOT NULL,
        condition_type_code VARCHAR(10) NOT NULL,
        is_mandatory BOOLEAN DEFAULT false,
        calculation_base VARCHAR(20) DEFAULT 'net',
        account_key VARCHAR(10),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(procedure_id, step_number)
      )
    `);
        console.log('   ✅ Created pricing_procedure_steps table\n');

        // 5. Update existing records to have a default company code
        console.log('4. Setting default company code for existing records...');
        const defaultCompany = await client.query(`
      SELECT id FROM company_codes WHERE code = 'DOM01' LIMIT 1
    `);

        if (defaultCompany.rows.length > 0) {
            await client.query(`
        UPDATE pricing_procedures 
        SET company_code_id = $1 
        WHERE company_code_id IS NULL
      `, [defaultCompany.rows[0].id]);
            console.log('   ✅ Updated existing records\n');
        }

        await client.query('COMMIT');

        console.log('✅ Migration completed successfully!\n');

        // Show final structure
        const structure = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'pricing_procedures'
      ORDER BY ordinal_position
    `);

        console.log('Final pricing_procedures structure:');
        structure.rows.forEach(col => {
            console.log(`  - ${col.column_name}: ${col.data_type}`);
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Migration failed:', error.message);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

migrate().catch(err => {
    console.error('Fatal:', err);
    process.exit(1);
});
