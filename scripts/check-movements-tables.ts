import { pool } from '../server/db';

async function checkTables() {
    try {
        const mmCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'material_movements'
      );
    `);

        const smCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'stock_movements'
      );
    `);

        console.log('material_movements exists:', mmCheck.rows[0].exists);
        console.log('stock_movements exists:', smCheck.rows[0].exists);

        if (smCheck.rows[0].exists) {
            console.log('\nSample from stock_movements:');
            const sample = await pool.query(`SELECT * FROM stock_movements LIMIT 1`);
            console.log(sample.rows);
        }

        if (mmCheck.rows[0].exists) {
            console.log('\nSample from material_movements:');
            const sample = await pool.query(`SELECT * FROM material_movements LIMIT 1`);
            console.log(sample.rows);
        }

        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

checkTables();
