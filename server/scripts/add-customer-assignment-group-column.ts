import { pool } from '../db';

async function addCustomerAssignmentGroupColumn() {
    const client = await pool.connect();
    try {
        console.log('🔍 Checking if customer_assignment_group_id column exists in erp_customers table...');

        // Check if column exists
        const checkColumn = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'erp_customers' 
        AND column_name = 'customer_assignment_group_id'
    `);

        if (checkColumn.rows.length === 0) {
            console.log('➕ Adding customer_assignment_group_id column...');

            await client.query(`
        ALTER TABLE erp_customers 
        ADD COLUMN customer_assignment_group_id INTEGER 
        REFERENCES sd_Customer_account_assignment_groups(id)
      `);

            console.log('✅ Added customer_assignment_group_id column');

            // Add index for performance
            await client.query(`
        CREATE INDEX idx_erp_customers_assignment_group 
        ON erp_customers(customer_assignment_group_id)
      `);

            console.log('✅ Added index on customer_assignment_group_id');
        } else {
            console.log('✅ Column customer_assignment_group_id already exists');
        }

        console.log('🎉 Migration completed successfully!');
    } catch (error) {
        console.error('❌ Error during migration:', error);
        throw error;
    } finally {
        client.release();
    }
}

addCustomerAssignmentGroupColumn()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
