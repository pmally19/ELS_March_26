
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:Mokshith@21@localhost:5432/mallyerp',
});

async function checkTables() {
    const client = await pool.connect();
    try {
        console.log('🔍 Checking Finance Tables...\n');

        const tablesToCheck = [
            'period_end_closing',
            'fiscal_periods',
            'gl_entries',
            'accounting_documents'
        ];

        for (const table of tablesToCheck) {
            const res = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = $1
      `, [table]);

            if (res.rows.length > 0) {
                console.log(`✅ Table '${table}' exists with ${res.rows.length} columns.`);
                // console.log(res.rows.map(r => `   - ${r.column_name} (${r.data_type})`).join('\n'));
            } else {
                console.log(`❌ Table '${table}' DOES NOT EXIST.`);

                if (table === 'period_end_closing') {
                    console.log(`\n⚠️  CREATING MISSING TABLE: period_end_closing`);
                    await client.query(`
                CREATE TABLE IF NOT EXISTS period_end_closing (
                    id SERIAL PRIMARY KEY,
                    fiscal_period_id INTEGER,
                    company_code_id INTEGER,
                    year INTEGER NOT NULL,
                    period INTEGER NOT NULL,
                    closing_type VARCHAR(50),
                    description TEXT,
                    notes TEXT,
                    status VARCHAR(50) DEFAULT 'pending',
                    validated_entries INTEGER DEFAULT 0,
                    unbalanced_entries INTEGER DEFAULT 0,
                    total_debits DECIMAL(15,2) DEFAULT 0,
                    total_credits DECIMAL(15,2) DEFAULT 0,
                    closing_date TIMESTAMP,
                    started_at TIMESTAMP,
                    completed_at TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
             `);
                    console.log(`   ✅ Created 'period_end_closing'`);
                }
            }
        }

    } catch (err) {
        console.error('Error:', err);
    } finally {
        client.release();
        pool.end();
    }
}

checkTables();
