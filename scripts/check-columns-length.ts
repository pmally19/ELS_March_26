
import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function checkColumnLengths() {
    console.log("Checking column lengths...");
    try {
        const tables = ['quotations', 'quotation_items'];

        for (const table of tables) {
            console.log(`\nTable: ${table}`);
            const result = await db.execute(sql`
        SELECT column_name, data_type, character_maximum_length 
        FROM information_schema.columns 
        WHERE table_name = ${table}
        ORDER BY column_name
      `);
            console.table(result.rows);
        }
    } catch (error) {
        console.error("Error checking columns:", error);
    } finally {
        process.exit(0);
    }
}

checkColumnLengths();
