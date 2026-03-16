
import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function main() {
    console.log("Initializing Assignment Group Tables...");

    try {
        // Create Customer Account Assignment Groups table
        console.log("Creating sd_customer_account_assignment_groups...");
        await db.execute(sql`
      CREATE TABLE IF NOT EXISTS sd_customer_account_assignment_groups (
        id SERIAL PRIMARY KEY,
        code VARCHAR(2) NOT NULL UNIQUE,
        name VARCHAR(50) NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
        console.log("Created sd_customer_account_assignment_groups.");

        // Create Material Account Assignment Groups table
        console.log("Creating sd_material_account_assignment_groups...");
        await db.execute(sql`
      CREATE TABLE IF NOT EXISTS sd_material_account_assignment_groups (
        id SERIAL PRIMARY KEY,
        code VARCHAR(2) NOT NULL UNIQUE,
        name VARCHAR(50) NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
        console.log("Created sd_material_account_assignment_groups.");

        console.log("✅ Tables initialized successfully.");
        process.exit(0);
    } catch (error) {
        console.error("❌ Error initializing tables:", error);
        process.exit(1);
    }
}

main();
