import pg from 'pg';
const { Client } = pg;

const client = new Client({
    connectionString: process.env.DATABASE_URL || "postgresql://postgres:Mokshith@21@localhost:5432/mallyerp"
});

async function migrate() {
    try {
        await client.connect();
        console.log("Connected to database");

        // 1. Rename 'code' to 'sales_office_id' if 'code' exists and 'sales_office_id' does not
        const codeCheck = await client.query(`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'sd_sales_offices' AND column_name = 'code'
    `);

        const idCheck = await client.query(`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'sd_sales_offices' AND column_name = 'sales_office_id'
    `);

        if (codeCheck.rows.length > 0 && idCheck.rows.length === 0) {
            console.log("Renaming 'code' column to 'sales_office_id'...");
            await client.query(`ALTER TABLE sd_sales_offices RENAME COLUMN code TO sales_office_id;`);
        } else {
            console.log("Column 'code' not found or 'sales_office_id' already exists. Skipping rename.");
        }

        // 2. Add missing columns: region, country, is_active
        const columnsToAdd = [
            { name: 'region', type: 'VARCHAR(50)' },
            { name: 'country', type: 'VARCHAR(50)' },
            { name: 'is_active', type: 'BOOLEAN DEFAULT true' }
        ];

        for (const col of columnsToAdd) {
            const colCheck = await client.query(`
            SELECT column_name FROM information_schema.columns 
            WHERE table_name = 'sd_sales_offices' AND column_name = '${col.name}'
        `);

            if (colCheck.rows.length === 0) {
                console.log(`Adding missing column '${col.name}'...`);
                await client.query(`ALTER TABLE sd_sales_offices ADD COLUMN ${col.name} ${col.type};`);
            } else {
                console.log(`Column '${col.name}' already exists.`);
            }
        }

        console.log("Migration completed successfully.");

    } catch (err) {
        console.error("Migration failed:", err);
    } finally {
        await client.end();
    }
}

migrate();
