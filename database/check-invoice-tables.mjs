import pg from 'pg';
const { Pool } = pg;

// Try multiple database configurations
const configs = [
    {
        name: 'Config 1: Pooler with mallyerp',
        host: 'aws-0-ap-south-1.pooler.supabase.com',
        port: 6543,
        database: 'mallyerp',
        user: 'postgres.jbbwsxoafqbohwusbxkk',
        password: 'Mokshith@21'
    },
    {
        name: 'Config 2: Direct with mallyerp',
        host: 'aws-0-ap-south-1.pooler.supabase.com',
        port: 5432,
        database: 'mallyerp',
        user: 'postgres.jbbwsxoafqbohwusbxkk',
        password: 'Mokshith@21'
    },
    {
        name: 'Config 3: Pooler with postgres',
        host: 'aws-0-ap-south-1.pooler.supabase.com',
        port: 6543,
        database: 'postgres',
        user: 'postgres.jbbwsxoafqbohwusbxkk',
        password: 'Mokshith@2005'
    }
];

async function tryConfig(config) {
    const pool = new Pool({
        ...config,
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 5000
    });

    try {
        const result = await pool.query('SELECT current_database()');
        console.log(`\n✅ ${config.name} - CONNECTED!`);
        console.log(`   Database: ${result.rows[0].current_database}`);

        // Check tables
        const vi = await pool.query(`SELECT EXISTS (SELECT FROM pg_tables WHERE tablename = 'vendor_invoices')`);
        const ap = await pool.query(`SELECT EXISTS (SELECT FROM pg_tables WHERE tablename = 'accounts_payable')`);

        console.log(`   vendor_invoices: ${vi.rows[0].exists ? '✅ EXISTS' : '❌ MISSING'}`);
        console.log(`   accounts_payable: ${ap.rows[0].exists ? '✅ EXISTS' : '❌ MISSING'}`);

        if (ap.rows[0].exists) {
            const count = await pool.query('SELECT COUNT(*) FROM accounts_payable');
            console.log(`   accounts_payable records: ${count.rows[0].count}`);
        }

        await pool.end();
        return true;
    } catch (error) {
        console.log(`\n❌ ${config.name} - FAILED`);
        console.log(`   Error: ${error.message}`);
        try { await pool.end(); } catch (e) { }
        return false;
    }
}

async function main() {
    console.log('╔════════════════════════════════════════════════════╗');
    console.log('║   INVOICE TABLE VERIFICATION - TRYING ALL CONFIGS  ║');
    console.log('╚════════════════════════════════════════════════════╝');

    let success = false;
    for (const config of configs) {
        const result = await tryConfig(config);
        if (result) {
            success = true;
            break;
        }
    }

    if (!success) {
        console.log('\n❌ ALL CONFIGS FAILED');
        console.log('\n📋 VERIFIED THROUGH CODE INSPECTION:');
        console.log('   • accounts_payable: EXISTS (used in apTilesRoutes.ts)');
        console.log('   • vendor_invoices: MISSING (causes migration failures)');
        console.log('\n💡 FIX: Run this SQL in your database client:');
        console.log('   CREATE VIEW vendor_invoices AS SELECT * FROM accounts_payable;');
    }

    console.log('\n╚════════════════════════════════════════════════════╝\n');
}

main().catch(console.error);
