
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'mallyerp',
    user: 'postgres',
    password: 'Mokshith@21'
});

async function inspectTable() {
    try {
        const res = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'accounting_documents'
      ORDER BY ordinal_position;
    `);

        console.log('Columns in accounting_documents:');
        res.rows.forEach(row => {
            console.log(`- ${row.column_name} (${row.data_type})`);
        });
    } catch (err) {
        console.error('Error inspecting table:', err);
    } finally {
        await pool.end();
    }
}

inspectTable();
