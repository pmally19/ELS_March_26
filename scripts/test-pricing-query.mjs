// Test pricing procedures API
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:12345@localhost:5432/mallyerp',
});

async function test() {
    const client = await pool.connect();

    try {
        console.log('📋 Testing pricing procedures query...\n');

        // Test the exact query from the API
        const result = await client.query(`
      SELECT pp.*, cc.name as company_name,
             COALESCE(
               JSON_AGG(
                 JSON_BUILD_OBJECT(
                   'id', pps.id,
                   'step_number', pps.step_number,
                   'condition_type_code', pps.condition_type_code,
                   'condition_name', ct.condition_name,
                   'is_mandatory', pps.is_mandatory,
                   'calculation_base', pps.calculation_base,
                   'account_key', pps.account_key
                 ) ORDER BY pps.step_number
               ) FILTER (WHERE pps.id IS NOT NULL), '[]'::json
             ) as steps
      FROM pricing_procedures pp
      LEFT JOIN company_codes cc ON pp.company_code_id = cc.id
      LEFT JOIN pricing_procedure_steps pps ON pp.id = pps.procedure_id
      LEFT JOIN condition_types ct ON pps.condition_type_code = ct.condition_code AND ct.company_code_id = pp.company_code_id
      WHERE cc.code = $1
      GROUP BY pp.id, cc.name
      ORDER BY pp.procedure_code
    `, ['DOM01']);

        console.log('✅ Query successful!');
        console.log(`Found ${result.rows.length} procedures\n`);

        result.rows.forEach(proc => {
            console.log(`- ${proc.procedure_code}: ${proc.procedure_name} (${proc.steps.length} steps)`);
        });

    } catch (error) {
        console.error('❌ Query failed:', error.message);
    } finally {
        client.release();
        await pool.end();
    }
}

test();
