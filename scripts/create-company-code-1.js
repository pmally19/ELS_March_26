import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'mallyerp',
    user: 'postgres',
    password: 'Mokshith@21',
});

console.log('Creating company code ID 1...\n');

try {
    // Check if code 1000 is taken
    const existing = await pool.query("SELECT id, code FROM company_codes WHERE code = '1000'");

    let codeToUse = '1001';
    if (existing.rows.length > 0) {
        console.log(`Code 1000 exists with ID: ${existing.rows[0].id}`);
        console.log(`Using code ${codeToUse} instead...`);
    }

    // Insert company code with ID 1
    await pool.query(`
    INSERT INTO company_codes (id, code, name, currency, country, is_active, created_at)
    VALUES (1, $1, 'Default Company', 'USD', 'US', true, NOW())
    ON CONFLICT (id) DO UPDATE 
    SET name = 'Default Company', currency = 'USD'
  `, [codeToUse]);

    console.log('✅ Company code ID 1 created/updated successfully');

    // Verify
    const verify = await pool.query('SELECT id, code, name FROM company_codes WHERE id = 1');
    console.log(`\nVerified: ID ${verify.rows[0].id}, Code ${verify.rows[0].code}, Name: ${verify.rows[0].name}`);

} catch (error) {
    console.error('❌ Error:', error.message);
} finally {
    await pool.end();
}
