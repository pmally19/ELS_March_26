// Test creating a pricing procedure via direct database insert
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:12345@localhost:5432/mallyerp',
});

async function testCreate() {
    const client = await pool.connect();

    try {
        console.log('🧪 Testing pricing procedure creation...\n');

        // 1. Get company code ID
        console.log('1. Getting company code ID for DOM01...');
        const companyResult = await client.query(`
      SELECT id FROM company_codes WHERE code = $1
    `, ['DOM01']);

        if (companyResult.rows.length === 0) {
            console.error('   ❌ Company DOM01 not found!');
            return;
        }

        const company_code_id = companyResult.rows[0].id;
        console.log(`   ✅ Found company ID: ${company_code_id}\n`);

        // 2. Create a test procedure
        console.log('2. Creating test procedure...');
        const procedure = await client.query(`
      INSERT INTO pricing_procedures (
        procedure_code, procedure_name, description, is_active, company_code_id
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, ['TEST001', 'Test Pricing Procedure', 'Testing via Node.js script', true, company_code_id]);

        console.log('   ✅ Created procedure:', procedure.rows[0]);
        console.log(`   ID: ${procedure.rows[0].id}\n`);

        // 3. Add steps to the procedure
        console.log('3. Adding steps to procedure...');

        const steps = [
            { step: 10, code: 'PR00', mandatory: true, base: 'gross' },
            { step: 20, code: 'K007', mandatory: false, base: 'net' },
            { step: 30, code: 'MWST', mandatory: true, base: 'net' }
        ];

        for (const step of steps) {
            await client.query(`
        INSERT INTO pricing_procedure_steps (
          procedure_id, condition_type_code, step_number, is_mandatory, calculation_base
        ) VALUES ($1, $2, $3, $4, $5)
      `, [procedure.rows[0].id, step.code, step.step, step.mandatory, step.base]);

            console.log(`   ✅ Added step ${step.step}: ${step.code}`);
        }

        console.log('\n4. Fetching created procedure with steps...');
        const result = await client.query(`
      SELECT pp.*, cc.name as company_name,
             COALESCE(
               JSON_AGG(
                 JSON_BUILD_OBJECT(
                   'id', pps.id,
                   'step_number', pps.step_number,
                   'condition_type_code', pps.condition_type_code,
                   'is_mandatory', pps.is_mandatory,
                   'calculation_base', pps.calculation_base
                 ) ORDER BY pps.step_number
               ) FILTER (WHERE pps.id IS NOT NULL), '[]'::json
             ) as steps
      FROM pricing_procedures pp
      LEFT JOIN company_codes cc ON pp.company_code_id = cc.id
      LEFT JOIN pricing_procedure_steps pps ON pp.id = pps.procedure_id
      WHERE pp.id = $1
      GROUP BY pp.id, cc.name
    `, [procedure.rows[0].id]);

        console.log('\n✅ Full procedure:');
        console.log(JSON.stringify(result.rows[0], null, 2));

        console.log('\n✅ Test successful! Procedure and steps created correctly.');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Detail:', error.detail);
    } finally {
        client.release();
        await pool.end();
    }
}

testCreate();
