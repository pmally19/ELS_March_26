import pkg from 'pg';
const { Pool } = pkg;

// Database connection configuration
const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'mallyerp',
    user: 'mallyerp',
    password: 'Mokshith@21',
});

async function dropCompanyChartAssignments() {
    const client = await pool.connect();

    try {
        console.log('🗑️  Starting removal of company_code_chart_assignments table...');

        // Drop the table and sequence directly
        const sql = `
      -- Drop the table (this will also drop dependent triggers and constraints)
      DROP TABLE IF EXISTS company_code_chart_assignments CASCADE;
      
      -- Drop the sequence if it exists
      DROP SEQUENCE IF EXISTS company_code_chart_assignments_id_seq CASCADE;
    `;

        // Execute the SQL
        await client.query(sql);

        console.log('✅ Successfully dropped company_code_chart_assignments table');
        console.log('✅ All related sequences and constraints removed');

    } catch (error) {
        console.error('❌ Error dropping table:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

// Run the migration
dropCompanyChartAssignments()
    .then(() => {
        console.log('✅ Cleanup completed successfully');
        process.exit(0);
    })
    .catch(error => {
        console.error('❌ Cleanup failed:', error);
        process.exit(1);
    });
