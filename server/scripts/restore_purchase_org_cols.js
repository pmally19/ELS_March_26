
import pg from 'pg';
const { Pool } = pg;

// Use credentials provided by the user
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'mallyerp',
    password: 'Mokshith@21',
    port: 5432,
});

async function restore() {
    console.log('🛠️ Restoring accidentally dropped Purchase Org columns...');

    try {
        const columnsToRestore = [
            { name: 'address', type: 'TEXT' },
            { name: 'city', type: 'VARCHAR(100)' },
            { name: 'state', type: 'VARCHAR(50)' },
            { name: 'country', type: 'VARCHAR(50)' },
            { name: 'postal_code', type: 'VARCHAR(20)' },
            { name: 'phone', type: 'VARCHAR(50)' },
            { name: 'email', type: 'VARCHAR(100)' },
            { name: 'manager', type: 'VARCHAR(100)' } // Restoring 'manager' specifically as used in UI
        ];

        for (const col of columnsToRestore) {
            const check = await pool.query(`
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'purchase_organizations' AND column_name = $1
            `, [col.name]);

            if (check.rows.length === 0) {
                console.log(`   + Restoring column: ${col.name}`);
                await pool.query(`ALTER TABLE purchase_organizations ADD COLUMN ${col.name} ${col.type}`);
            } else {
                console.log(`   = Column ${col.name} already exists.`);
            }
        }

        console.log('✅ Column creation complete.');

    } catch (err) {
        console.error('❌ Restoration failed:', err);
    } finally {
        await pool.end();
        console.log('🏁 Restoration script finished.');
    }
}

restore();
