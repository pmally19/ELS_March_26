
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function checkSpecificPeriod() {
    try {
        const year = 2026;
        const period = 1;

        console.log(`--- Checking 2026 Period 1 ---`);

        // 1. Fiscal Period
        const fiscalPeriod = await pool.query(`
      SELECT * FROM fiscal_periods 
      WHERE year = $1 AND period = $2
    `, [year, period]);

        console.log('Fiscal Period Record:');
        console.table(fiscalPeriod.rows.map(r => ({
            id: r.id,
            year: r.year,
            period: r.period,
            status: r.status,
            posting_allowed: r.posting_allowed,
            company: r.company_code_id
        })));

        // 2. Posting Period Control
        const controls = await pool.query(`
      SELECT * FROM posting_period_controls
      WHERE fiscal_year = $1 
      AND period_from <= $2 
      AND period_to >= $2
    `, [year, period]);

        console.log('\nPosting Period Controls (Priority):');
        if (controls.rows.length === 0) {
            console.log('No matching controls.');
        } else {
            console.table(controls.rows.map(r => ({
                id: r.id,
                fiscal_year: r.fiscal_year,
                range: `${r.period_from}-${r.period_to}`,
                status: r.posting_status,
                allow_posting: r.allow_posting,
                company: r.company_code_id
            })));
        }

        // 3. Period End Closing
        const closing = await pool.query(`
      SELECT * FROM period_end_closing
      WHERE year = $1 AND period = $2
    `, [year, period]);

        console.log('\nPeriod End Closing Record:');
        console.table(closing.rows.map(r => ({
            id: r.id,
            status: r.status,
            company: r.company_code_id
        })));

    } catch (err) {
        console.error('Error executing query', err);
    } finally {
        await pool.end();
    }
}

checkSpecificPeriod();
