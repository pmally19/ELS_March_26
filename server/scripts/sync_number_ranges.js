
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
    connectionString: 'postgresql://postgres:Mokshith@21@localhost:5432/mallyerp'
});

async function checkAndFix() {
    try {
        console.log('--- Analyzing Number Ranges by Material Type ---');

        // 1. Get all product types and their number range codes
        const typesRes = await pool.query('SELECT code, number_range_code FROM product_types WHERE number_range_code IS NOT NULL');
        console.log('Product Types with Ranges:', typesRes.rows);

        // 2. Get all number ranges
        const rangeRes = await pool.query('SELECT * FROM number_ranges');
        const rangesMap = new Map();
        rangeRes.rows.forEach(r => rangesMap.set(r.number_range_code, r));

        // 3. For each unique number range used by product types, find the max code in materials
        const uniqueRangeCodes = [...new Set(typesRes.rows.map(t => t.number_range_code))];

        for (const rangeCode of uniqueRangeCodes) {
            const range = rangesMap.get(rangeCode);
            if (!range) {
                console.log(`Warning: Range code ${rangeCode} referenced but not found in number_ranges table.`);
                continue;
            }

            // Find all material types using this range
            const materialTypesUsingRange = typesRes.rows
                .filter(t => t.number_range_code === rangeCode)
                .map(t => t.code);

            console.log(`\nChecking Range ${rangeCode} (${range.range_from} - ${range.range_to}) used by types: ${materialTypesUsingRange.join(', ')}`);
            console.log(`Current 'current_number' in DB: ${range.current_number}`);

            // Query max code for these material types
            // We only care about codes that look numeric and fall essentially within range logic (or just max numeric code for these types)
            const query = `
           SELECT code 
           FROM materials 
           WHERE type = ANY($1) 
             AND code ~ '^[0-9]+$'
           ORDER BY CAST(code AS BIGINT) DESC 
           LIMIT 1
       `;

            const maxRes = await pool.query(query, [materialTypesUsingRange]);

            if (maxRes.rows.length > 0) {
                const maxCode = parseInt(maxRes.rows[0].code);
                console.log(`Found max material code for these types: ${maxCode}`);

                const currentNum = range.current_number ? parseInt(range.current_number) : parseInt(range.range_from) - 1; // -1 because next is +1

                // If the actual used code is greater than what current_number tracks, we have a problem.
                if (maxCode > currentNum) {
                    console.log(`!!! MISMATCH !!! Range thinks ${currentNum}, but ${maxCode} exists.`);
                    console.log(`Updating range ${rangeCode} to current_number = ${maxCode}`);

                    await pool.query(
                        'UPDATE number_ranges SET current_number = $1, updated_at = NOW() WHERE number_range_code = $2',
                        [maxCode, rangeCode]
                    );
                    console.log('✅ Updated.');
                } else {
                    console.log(`Range is OK. (Max used: ${maxCode} <= Current tracked: ${currentNum})`);
                }
            } else {
                console.log('No materials found for these types.');
            }
        }

    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

checkAndFix();
