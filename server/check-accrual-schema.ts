import { dbPool } from './database.js';

async function checkSchema() {
    const client = await dbPool.connect();

    try {
        console.log('🔍 Checking accrual_rules table...\n');

        // Check if table exists
        const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'accrual_rules'
      );
    `);

        if (tableCheck.rows[0].exists) {
            console.log('✅ accrual_rules table EXISTS\n');

            // Get table structure
            const columns = await client.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'accrual_rules'
        ORDER BY ordinal_position;
      `);

            console.log('📊 Table Structure:');
            columns.rows.forEach(col => {
                console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
            });

            // Get row count
            const count = await client.query('SELECT COUNT(*) FROM accrual_rules');
            console.log(`\n📈 Current row count: ${count.rows[0].count}`);

            // Sample data if exists
            if (parseInt(count.rows[0].count) > 0) {
                const sample = await client.query('SELECT * FROM accrual_rules LIMIT 3');
                console.log('\n📋 Sample data:');
                console.log(JSON.stringify(sample.rows, null, 2));
            }
        } else {
            console.log('❌ accrual_rules table DOES NOT EXIST');
            console.log('   Migration needs to be run: database/migrations/create-accruals-tables.sql');
        }

        // Check accrual_postings
        console.log('\n🔍 Checking accrual_postings table...\n');
        const postingsCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'accrual_postings'
      );
    `);

        console.log(postingsCheck.rows[0].exists ? '✅ accrual_postings table EXISTS' : '❌ accrual_postings table DOES NOT EXIST');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        client.release();
        await dbPool.end();
    }
}

checkSchema();
