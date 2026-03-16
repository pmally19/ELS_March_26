import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'Mokshith@21',
    database: 'mallyerp'
});

async function verifyUpdate() {
    try {
        console.log('=== VERIFYING MATERIAL 164 UPDATE ===\n');

        const result = await pool.query(`
      SELECT 
        id,
        code,
        name,
        purchase_organization,
        purchasing_group,
        updated_at
      FROM materials 
      WHERE id = 164
    `);

        if (result.rows.length > 0) {
            const material = result.rows[0];
            console.log('Material Details:');
            console.log(`  ID: ${material.id}`);
            console.log(`  Code: ${material.code}`);
            console.log(`  Name: ${material.name}`);
            console.log(`  Purchase Organization: ${material.purchase_organization || '(not set)'}`);
            console.log(`  Purchasing Group: ${material.purchasing_group || '(not set)'}`);
            console.log(`  Updated At: ${material.updated_at}`);

            if (material.purchase_organization && material.purchasing_group) {
                console.log('\n✅ SUCCESS! Both fields are saved in the database!');
            } else {
                console.log('\n❌ FAILED! Fields are still not saved in the database.');
            }
        } else {
            console.log('Material 164 not found.');
        }

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await pool.end();
    }
}

verifyUpdate();
