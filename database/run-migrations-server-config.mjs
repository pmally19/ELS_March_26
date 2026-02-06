
// Run specific migrations using the server's existing connection pool
// This bypasses connection issues by using the configuration that is already working for the app

import pkg from 'pg';
const { Pool } = pkg;
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load env vars
dotenv.config();

// Replicate the exact connection config from server/database.ts
const dbConfig = {
    host: process.env.DB_HOST || 'aws-0-ap-south-1.pooler.supabase.com',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'postgres',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    // ssl: { rejectUnauthorized: false } // Comment out SSL for local connection
};

console.log('Connecting with config:', {
    ...dbConfig,
    password: '****'
});

const pool = new Pool(dbConfig);

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function runSQL(filePath) {
    try {
        const sql = fs.readFileSync(filePath, 'utf8');
        console.log(`\nExecuting ${path.basename(filePath)}...`);
        await pool.query(sql);
        console.log('✅ Success!');
        return true;
    } catch (err) {
        console.error(`❌ Failed: ${err.message}`);
        return false;
    }
}

async function main() {
    try {
        // 1. Validate connection first
        const res = await pool.query('SELECT NOW()');
        console.log('✅ Connected to database at', res.rows[0].now);

        // 2. Run Migration 1105
        await runSQL(path.join(__dirname, 'migrations', '1105-create-vendor-invoices-view.sql'));

        // 3. Run Migration 1106
        await runSQL(path.join(__dirname, 'migrations', '1106-create-company-code-chart-assignments.sql'));

        console.log('\n🎉 All migrations attempted.');
    } catch (err) {
        console.error('❌ Connection failed:', err.message);
    } finally {
        await pool.end();
    }
}

main();
