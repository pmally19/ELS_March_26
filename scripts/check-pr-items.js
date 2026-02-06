import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'mallyerp',
    user: 'postgres',
    password: 'Mokshith@21'
});

async function checkPRItems() {
    try {
        console.log('Connecting to database...\n');

        // Get row count
        const countQuery = 'SELECT COUNT(*) as total_rows FROM purchase_requisition_items;';
        const count = await pool.query(countQuery);
        const totalRows = parseInt(count.rows[0].total_rows);
        console.log(`=== TOTAL ROWS: ${totalRows} ===\n`);

        // Get all column names
        const columnsQuery = `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'purchase_requisition_items'
      ORDER BY ordinal_position;
    `;
        const columnsResult = await pool.query(columnsQuery);
        const columns = columnsResult.rows;

        console.log('=== CHECKING NULL VALUES FOR EACH COLUMN ===\n');

        const nullAnalysis = [];

        // Check NULL count for each column
        for (const col of columns) {
            const nullCheckQuery = `
        SELECT 
          COUNT(*) as total_count,
          COUNT(${col.column_name}) as non_null_count,
          COUNT(*) - COUNT(${col.column_name}) as null_count
        FROM purchase_requisition_items;
      `;

            const result = await pool.query(nullCheckQuery);
            const nullCount = parseInt(result.rows[0].null_count);
            const nonNullCount = parseInt(result.rows[0].non_null_count);
            const percentage = totalRows > 0 ? ((nonNullCount / totalRows) * 100).toFixed(1) : 0;

            nullAnalysis.push({
                column: col.column_name,
                data_type: col.data_type,
                nullable: col.is_nullable,
                filled: nonNullCount,
                empty: nullCount,
                completeness: `${percentage}%`,
                status: nullCount === 0 ? '✓ Complete' : `⚠ ${nullCount} NULL`
            });
        }

        console.table(nullAnalysis);

        // Summary
        const completeFields = nullAnalysis.filter(a => a.empty === 0);
        const incompleteFields = nullAnalysis.filter(a => a.empty > 0);

        console.log(`\n=== SUMMARY ===`);
        console.log(`Total Fields: ${nullAnalysis.length}`);
        console.log(`Complete Fields (100% filled): ${completeFields.length}`);
        console.log(`Incomplete Fields (has NULLs): ${incompleteFields.length}`);

        if (incompleteFields.length > 0) {
            console.log(`\n=== FIELDS WITH NULL VALUES ===`);
            incompleteFields.forEach(field => {
                console.log(`  - ${field.column}: ${field.empty}/${totalRows} rows are NULL (${100 - parseFloat(field.completeness)}% empty)`);
            });
        } else {
            console.log('\n✓ All fields are 100% populated! No NULL values found.');
        }

    } catch (error) {
        console.error('Error:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        await pool.end();
        console.log('\nDatabase connection closed.');
    }
}

checkPRItems();
