import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'mallyerp',
    user: 'postgres',
    password: 'Mokshith@21',
});

console.log('🔧 FIXING SYSTEM CONFIGURATION FOR PAYMENTS\n');
console.log('='.repeat(80));

async function fixSystemConfig() {
    try {
        // Check if system_configuration table exists
        const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'system_configuration'
      )
    `);

        if (!tableExists.rows[0].exists) {
            console.log('❌ system_configuration table does NOT exist!');
            console.log('   Creating table...\n');

            await pool.query(`
        CREATE TABLE IF NOT EXISTS system_configuration (
          id SERIAL PRIMARY KEY,
          config_key VARCHAR(255) NOT NULL UNIQUE,
          config_value TEXT,
          description TEXT,
          active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
            console.log('✅ Table created\n');
        } else {
            console.log('✅ system_configuration table exists\n');
        }

        // Required configuration keys for payment processing
        const requiredConfigs = [
            { key: 'ar_status_open', value: 'OPEN', description: 'AR Open status' },
            { key: 'ar_status_partial', value: 'PARTIAL', description: 'AR Partial payment status' },
            { key: 'ar_status_cleared', value: 'CLEARED', description: 'AR Cleared status' },
            { key: 'default_payment_method', value: 'BANK_TRANSFER', description: 'Default payment method' },
            { key: 'payment_posting_status', value: 'POSTED', description: 'Default payment posting status' },
            { key: 'system_user_id', value: '1', description: 'System user ID' },
            { key: 'default_currency', value: 'USD', description: 'Default currency' }
        ];

        console.log('Checking/adding required configuration keys...\n');

        for (const config of requiredConfigs) {
            const exists = await pool.query(
                'SELECT id, config_value, active FROM system_configuration WHERE config_key = $1',
                [config.key]
            );

            if (exists.rows.length === 0) {
                await pool.query(`
          INSERT INTO system_configuration (config_key, config_value, description, active)
          VALUES ($1, $2, $3, true)
        `, [config.key, config.value, config.description]);
                console.log(`  ✅ Added: ${config.key} = ${config.value}`);
            } else {
                const row = exists.rows[0];
                if (row.active) {
                    console.log(`  ✓  Exists: ${config.key} = ${row.config_value}`);
                } else {
                    await pool.query(
                        'UPDATE system_configuration SET active = true WHERE config_key = $1',
                        [config.key]
                    );
                    console.log(`  ✅ Activated: ${config.key}`);
                }
            }
        }

        console.log('\n' + '='.repeat(80));
        console.log('\n✅ SYSTEM CONFIGURATION COMPLETE!\n');
        console.log('Payment processing should now work correctly.');
        console.log('The route will no longer throw errors about missing configuration.\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

fixSystemConfig();
