
import { pool } from '../db';

async function fixCreditRating() {
    try {
        console.log('🔄 Fixing credit_rating column length...');
        await pool.query('ALTER TABLE erp_customers ALTER COLUMN credit_rating TYPE varchar(20)');
        console.log('✅ Successfully updated credit_rating column length to 20');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error updating column:', error);
        process.exit(1);
    }
}

fixCreditRating();
