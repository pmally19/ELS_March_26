import { pool } from "../server/db";

async function createSourceListsTable() {
    const client = await pool.connect();
    try {
        console.log("Creating source_lists table...");

        await client.query(`
      CREATE TABLE IF NOT EXISTS source_lists (
        id SERIAL PRIMARY KEY,
        material_id INTEGER NOT NULL REFERENCES materials(id),
        plant_id INTEGER,
        vendor_id INTEGER NOT NULL REFERENCES vendors(id),
        valid_from DATE NOT NULL,
        valid_to DATE NOT NULL,
        is_fixed BOOLEAN DEFAULT false,
        is_blocked BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        created_by INTEGER,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_by INTEGER,
        version INTEGER DEFAULT 1 NOT NULL,
        is_active BOOLEAN DEFAULT true NOT NULL,
        notes TEXT
      )
    `);

        console.log("source_lists table created successfully!");
    } catch (error) {
        console.error("Error creating table:", error);
    } finally {
        client.release();
        process.exit(0);
    }
}

createSourceListsTable();
