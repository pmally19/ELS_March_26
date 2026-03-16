
import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function fixQuotationNumberRange() {
    console.log("Starting fix for Quotation number range (Attempt 2)...");

    try {
        // 1. Check if the range already exists
        const checkResult = await db.execute(sql`
      SELECT id FROM sd_number_ranges 
      WHERE object_code = 'QUOTATION' 
      AND range_number = 'ZS'
    `);

        if (checkResult.rows && checkResult.rows.length > 0) {
            console.log("Number range 'ZS' for 'QUOTATION' already exists. Skipping insertion.");
            return;
        }

        // 2. Insert the missing number range
        // Removing 'is_active' and 'description' as they might not exist
        const insertResult = await db.execute(sql`
      INSERT INTO sd_number_ranges (
        object_code, 
        range_number, 
        from_number, 
        to_number, 
        current_number, 
        updated_at
      ) VALUES (
        'QUOTATION',
        'ZS',
        '2000000000',
        '2999999999',
        '2000000000',
        NOW()
      )
      RETURNING object_code, range_number, current_number
    `);

        if (insertResult.rows && insertResult.rows.length > 0) {
            console.log("Successfully inserted number range 'ZS' for 'QUOTATION'.");
            console.log("Result:", insertResult.rows[0]);
        } else {
            console.error("Failed to insert number range.");
        }

    } catch (error) {
        console.error("Error fixing number range:", error);
    } finally {
        process.exit(0);
    }
}

fixQuotationNumberRange();
