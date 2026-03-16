import { db } from "../db";
import { sql } from "drizzle-orm";

async function checkStatusColumn() {
    try {
        const result = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'accounting_documents' 
      AND column_name = 'status'
    `);

        if (result.rows.length > 0) {
            console.log("Column 'status' EXISTS in accounting_documents");
        } else {
            console.log("Column 'status' DOES NOT EXIST in accounting_documents");
        }
    } catch (err) {
        console.error("Error:", err);
    } finally {
        process.exit(0);
    }
}

checkStatusColumn();
