
import pkg from 'pg';
const { Pool } = pkg;
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Explicit configuration provided by user
const dbConfig = {
    host: 'localhost',
    port: 5432,
    database: 'mallyerp',
    user: 'postgres',
    password: 'Mokshith@21',
    // ssl: { rejectUnauthorized: false } // Disabled for local connection
};

// Try 'mallyerp' if 'postgres' doesn't work, but typically pooler uses postgres as the db name in the string 
// and routes based on user. However, user specified 'mallyerp'.
// Let's try 'mallyerp' first as requested.
// dbConfig.database = 'mallyerp';

console.log('Connecting to database...');
console.log(`Host: ${dbConfig.host}`);
console.log(`User: ${dbConfig.user}`);
console.log(`Database: ${dbConfig.database}`);

const pool = new Pool(dbConfig);

async function runSQL(filePath) {
    try {
        const sql = fs.readFileSync(filePath, 'utf8');
        const fileName = path.basename(filePath);
        console.log(`\n---------------------------------------------------`);
        console.log(`Executing ${fileName}...`);
        console.log(`---------------------------------------------------`);

        await pool.query(sql);

        console.log(`✅ SUCCESS: ${fileName} executed.`);
        return true;
    } catch (err) {
        console.error(`❌ FAILED: ${path.basename(filePath)}`);
        console.error(err.message);
        return false;
    }
}

async function main() {
    try {
        // 1. Test connection
        const res = await pool.query('SELECT version()');
        console.log('✅ Connection successful!');
        console.log('Server version:', res.rows[0].version);

        // 2. Run Migrations
        await runSQL(path.join(__dirname, 'migrations', '1105-create-vendor-invoices-view.sql'));
        await runSQL(path.join(__dirname, 'migrations', '1107-add-status-to-accounting-documents.sql'));

        console.log('\n🎉 Migration process completed.');

        // Verification
        console.log('\nVerifying changes...');

        try {
            const viewLinks = await pool.query('SELECT COUNT(*) FROM vendor_invoices');
            console.log(`✅ vendor_invoices VIEW works (Count: ${viewLinks.rows[0].count})`);
        } catch (e) { console.log('❌ vendor_invoices VIEW check failed'); }

    } catch (err) {
        console.error('❌ Connection failed:', err.message);
        console.error('Hint: If "Tenant or user not found", check the Project Ref part of the hostname or the User string.');
    } finally {
        await pool.end();
    }
}

main();
