
import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

async function seedAssetAccountDetermination() {
    const client = await pool.connect();
    try {
        console.log('Seeding asset_account_determination...');

        await client.query('BEGIN');

        // 1. Get GL Account IDs (assuming some standard accounts exist)
        const glAccounts = await client.query('SELECT id, account_number FROM gl_accounts');
        const getGLId = (num: string) => glAccounts.rows.find((r: any) => r.account_number === num)?.id;

        // Use a fallback if specific accounts don't exist, just to make it work for testing
        const defaultGLId = glAccounts.rows[0]?.id;

        if (!defaultGLId) {
            throw new Error('No GL Accounts found. Cannot seed account determination.');
        }

        // Map some standard accounts (adjust numbers as per your GL setup)
        const assetAccountGL = getGLId('160000') || defaultGLId; // Fixed Asset
        const wipAccountGL = getGLId('160099') || defaultGLId;   // AUC WIP
        const depExpenseGL = getGLId('600000') || defaultGLId;   // Depreciation Expense
        const accDepGL = getGLId('160050') || defaultGLId;       // Accumulated Depreciation

        // 2. Define rules to insert
        // Target Asset Classes to fix: 2 (Machinery?), and potentially others like 1, 3, 4
        // We will check what classes exist and add rules for them
        const assetClasses = await client.query('SELECT id, code FROM asset_classes');

        for (const cls of assetClasses.rows) {
            const classId = cls.id;
            console.log(`Configuring class ${cls.code} (ID: ${classId})...`);

            // CAPITALIZATION / ASSET_ACCOUNT
            await client.query(`
            INSERT INTO asset_account_determination (
                asset_class_id, transaction_type, account_category, gl_account_id, is_active, created_at, updated_at
            ) VALUES ($1, 'CAPITALIZATION', 'ASSET_ACCOUNT', $2, true, NOW(), NOW())
            ON CONFLICT DO NOTHING
        `, [classId, assetAccountGL]);

            // RETIREMENT / LOSS_ON_SALE
            await client.query(`
            INSERT INTO asset_account_determination (
                asset_class_id, transaction_type, account_category, gl_account_id, is_active, created_at, updated_at
            ) VALUES ($1, 'RETIREMENT', 'LOSS_ON_SALE', $2, true, NOW(), NOW())
            ON CONFLICT DO NOTHING
        `, [classId, depExpenseGL]);

            // DEPRECIATION / EXPENSE_ACCOUNT
            await client.query(`
            INSERT INTO asset_account_determination (
                asset_class_id, transaction_type, account_category, gl_account_id, is_active, created_at, updated_at
            ) VALUES ($1, 'DEPRECIATION', 'EXPENSE_ACCOUNT', $2, true, NOW(), NOW())
            ON CONFLICT DO NOTHING
        `, [classId, depExpenseGL]);

            // DEPRECIATION / ACCUMULATED_DEPRECIATION
            await client.query(`
            INSERT INTO asset_account_determination (
                asset_class_id, transaction_type, account_category, gl_account_id, is_active, created_at, updated_at
            ) VALUES ($1, 'DEPRECIATION', 'ACCUMULATED_DEPRECIATION', $2, true, NOW(), NOW())
            ON CONFLICT DO NOTHING
        `, [classId, accDepGL]);
        }

        await client.query('COMMIT');
        console.log('Successfully seeded asset_account_determination.');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error seeding asset_account_determination:', error);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

seedAssetAccountDetermination();
