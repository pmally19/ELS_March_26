
import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function checkQuotationsColumns() {
    console.log("Checking columns for table 'quotations'...");
    try {
        const result = await db.execute(sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'quotations'
    `);
        console.log("Columns:", result.rows);
    } catch (error) {
        console.error("Error checking columns:", error);
    } finally {
        process.exit(0);
    }
}

checkQuotationsColumns();
