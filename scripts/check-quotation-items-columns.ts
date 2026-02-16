
import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function checkQuotationItemsColumns() {
    console.log("Checking columns for table 'quotation_items'...");
    try {
        const result = await db.execute(sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'quotation_items'
    `);
        console.log("Columns:", result.rows);
    } catch (error) {
        console.error("Error checking columns:", error);
    } finally {
        process.exit(0);
    }
}

checkQuotationItemsColumns();
