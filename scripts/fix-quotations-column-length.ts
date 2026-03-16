
import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function fixQuotationsColumnLength() {
    console.log("Fixing column lengths for quotations table...");
    try {
        // Fix document_type (from 1 to 4)
        await db.execute(sql`
      ALTER TABLE quotations ALTER COLUMN document_type TYPE VARCHAR(4);
    `);
        console.log("Updated document_type to VARCHAR(4)");

        // Fix currency (from 1 to 3)
        await db.execute(sql`
      ALTER TABLE quotations ALTER COLUMN currency TYPE VARCHAR(3);
    `);
        console.log("Updated currency to VARCHAR(3)");

        // Fix status (from 1 to 20)
        await db.execute(sql`
      ALTER TABLE quotations ALTER COLUMN status TYPE VARCHAR(20);
    `);
        console.log("Updated status to VARCHAR(20)");

    } catch (error) {
        console.error("Error fixing column lengths:", error);
    } finally {
        process.exit(0);
    }
}

fixQuotationsColumnLength();
