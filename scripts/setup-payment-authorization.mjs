import pg from 'pg';
import fs from 'fs';
import path from 'path';

const { Pool } = pg;

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'mallyerp',
    user: 'postgres',
    password: 'Mokshith@21'
});

async function setupPaymentAuthorizationLevels() {
    const client = await pool.connect();

    console.log('='.repeat(60));
    console.log('SETTING UP PAYMENT AUTHORIZATION LEVELS');
    console.log('='.repeat(60));

    try {
        // 1. Create payment_authorization_levels table
        console.log('\n1. Creating payment_authorization_levels table...');

        await client.query(`
      CREATE TABLE IF NOT EXISTS payment_authorization_levels (
        id SERIAL PRIMARY KEY,
        level_name VARCHAR(50) NOT NULL,
        level_order INTEGER NOT NULL,
        min_amount DECIMAL(15,2) DEFAULT 0,
        max_amount DECIMAL(15,2),
        requires_dual_approval BOOLEAN DEFAULT FALSE,
        company_code_id INTEGER,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
        console.log('   ✅ Table created');

        // 2. Create user_authorization_limits table
        console.log('\n2. Creating user_authorization_limits table...');

        await client.query(`
      CREATE TABLE IF NOT EXISTS user_authorization_limits (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        role VARCHAR(50) NOT NULL,
        daily_limit DECIMAL(15,2) NOT NULL DEFAULT 50000,
        single_payment_limit DECIMAL(15,2) NOT NULL DEFAULT 10000,
        dual_approval_threshold DECIMAL(15,2) NOT NULL DEFAULT 25000,
        can_authorize BOOLEAN DEFAULT TRUE,
        authorization_level_id INTEGER REFERENCES payment_authorization_levels(id),
        company_code_id INTEGER,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, company_code_id)
      )
    `);
        console.log('   ✅ Table created');

        // 3. Create payment_authorizations tracking table
        console.log('\n3. Creating payment_authorizations table...');

        await client.query(`
      CREATE TABLE IF NOT EXISTS payment_authorizations (
        id SERIAL PRIMARY KEY,
        payment_id INTEGER REFERENCES vendor_payments(id) ON DELETE CASCADE,
        authorized_by INTEGER NOT NULL,
        authorization_level VARCHAR(50),
        authorization_date TIMESTAMP DEFAULT NOW(),
        authorization_status VARCHAR(20) CHECK (authorization_status IN ('APPROVED', 'REJECTED', 'PENDING')),
        authorization_notes TEXT,
        ip_address VARCHAR(50),
        approval_order INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
        console.log('   ✅ Table created');

        // 4. Create daily_authorization_tracking table
        console.log('\n4. Creating daily_authorization_tracking table...');

        await client.query(`
      CREATE TABLE IF NOT EXISTS daily_authorization_tracking (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        authorization_date DATE NOT NULL,
        total_authorized DECIMAL(15,2) DEFAULT 0,
        payment_count INTEGER DEFAULT 0,
        last_updated TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, authorization_date)
      )
    `);
        console.log('   ✅ Table created');

        // 5. Seed default authorization levels
        console.log('\n5. Seeding default authorization levels...');

        // Check if levels already exist
        const existingLevels = await client.query('SELECT COUNT(*) as count FROM payment_authorization_levels');

        if (parseInt(existingLevels.rows[0].count) === 0) {
            await client.query(`
        INSERT INTO payment_authorization_levels (level_name, level_order, min_amount, max_amount, requires_dual_approval)
        VALUES 
          ('AP Clerk', 1, 0, 5000, FALSE),
          ('Manager', 2, 5001, 25000, FALSE),
          ('Finance Manager', 3, 25001, 100000, TRUE),
          ('CFO', 4, 100001, NULL, TRUE)
      `);
            console.log('   ✅ Default levels created:');
            console.log('      - AP Clerk: $0 - $5,000 (no dual approval)');
            console.log('      - Manager: $5,001 - $25,000 (no dual approval)');
            console.log('      - Finance Manager: $25,001 - $100,000 (dual approval required)');
            console.log('      - CFO: $100,001+ (dual approval required)');
        } else {
            console.log('   ℹ️ Authorization levels already exist');
        }

        // 6. Create a default admin user limit
        console.log('\n6. Creating default admin user limit...');

        try {
            await client.query(`
        INSERT INTO user_authorization_limits (user_id, role, daily_limit, single_payment_limit, dual_approval_threshold, authorization_level_id)
        VALUES (1, 'CFO', 1000000, 500000, 100000, 4)
        ON CONFLICT (user_id, company_code_id) DO NOTHING
      `);
            console.log('   ✅ Default admin user configured');
        } catch (e) {
            console.log('   ℹ️ Default admin already exists');
        }

        // 7. Create indexes
        console.log('\n7. Creating indexes...');

        await client.query(`CREATE INDEX IF NOT EXISTS idx_auth_levels_amount ON payment_authorization_levels(min_amount, max_amount)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_user_auth_limits_user ON user_authorization_limits(user_id)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_payment_auth_payment ON payment_authorizations(payment_id)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_payment_auth_status ON payment_authorizations(authorization_status)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_daily_auth_user_date ON daily_authorization_tracking(user_id, authorization_date)`);
        console.log('   ✅ Indexes created');

        // 8. Show current configuration
        console.log('\n' + '='.repeat(60));
        console.log('CURRENT AUTHORIZATION CONFIGURATION');
        console.log('='.repeat(60));

        const levels = await client.query(`
      SELECT level_name, level_order, min_amount, max_amount, requires_dual_approval
      FROM payment_authorization_levels
      ORDER BY level_order
    `);

        console.log('\nAuthorization Levels:');
        console.log('-'.repeat(60));
        console.log('Level Name        | Min Amount  | Max Amount   | Dual Approval');
        console.log('-'.repeat(60));

        for (const level of levels.rows) {
            const maxAmt = level.max_amount ? `$${level.max_amount.toLocaleString()}` : 'Unlimited';
            const dual = level.requires_dual_approval ? 'YES' : 'NO';
            console.log(`${level.level_name.padEnd(17)} | $${level.min_amount.toLocaleString().padEnd(10)} | ${maxAmt.padEnd(12)} | ${dual}`);
        }

        console.log('\n✅ Payment Authorization System is now configured!');

    } catch (error) {
        console.error('Error:', error.message);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

setupPaymentAuthorizationLevels();
