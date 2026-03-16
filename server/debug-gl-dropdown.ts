
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function inspectGLAccounts() {
    try {
        console.log('--- Inspecting gl_accounts Table ---');

        // 1. Check Table Structure (Columns)
        console.log('\n1. Column Information:');
        const columns = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'gl_accounts'
      ORDER BY column_name;
    `);
        console.table(columns.rows);

        // 2. Check Sample Data
        console.log('\n2. Sample Data (First 5 rows):');
        const sample = await pool.query('SELECT * FROM gl_accounts LIMIT 5');
        console.log(sample.rows);

        // 3. Check Chart of Accounts IDs present in gl_accounts
        console.log('\n3. Distinct chart_of_accounts_id in gl_accounts:');
        const distinctCoA = await pool.query(`
      SELECT chart_of_accounts_id, COUNT(*) 
      FROM gl_accounts 
      GROUP BY chart_of_accounts_id
    `);
        console.table(distinctCoA.rows);

        // 4. Check available Chart of Accounts
        console.log('\n4. Available Chart of Accounts (master table):');
        const coa = await pool.query('SELECT id, code, name FROM chart_of_accounts');
        console.table(coa.rows);

    } catch (error) {
        console.error('Error during inspection:', error);
    } finally {
        await pool.end();
    }
}

inspectGLAccounts();
