
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
    connectionString: 'postgresql://postgres:Mokshith@21@localhost:5432/mallyerp'
});

async function migrate() {
    try {
        console.log('Checking if purchase_organization column exists in materials table...');
        const check = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'materials' AND column_name = 'purchase_organization'
    `);

        if (check.rows.length === 0) {
            console.log('Adding purchase_organization column...');
            await pool.query('ALTER TABLE materials ADD COLUMN purchase_organization character varying(100)');
            console.log('✅ Column added successfully.');
        } else {
            console.log('ℹ️ Column already exists.');
        }

    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        pool.end();
    }
}

migrate();
