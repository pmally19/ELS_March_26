
import { db } from "../db";
import { sql } from "drizzle-orm";

async function checkColumns() {
    try {
        const result = await db.execute(sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'materials'
    `);
        const names = result.rows.map((r: any) => r.column_name);
        console.log("Columns in materials:", names.join(", "));
    } catch (error) {
        console.error("Error checking columns:", error);
    }
    process.exit(0);
}

checkColumns();
