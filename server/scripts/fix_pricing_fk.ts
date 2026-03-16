
import { pool } from "../db";

async function fixPricingFK() {
    console.log("Starting Pricing Procedure FK Fix...");

    try {
        // 1. Drop the incorrect constraint
        console.log("Dropping incorrect constraint 'pricing_procedure_determinations_division_id_fkey'...");
        await pool.query(`
      ALTER TABLE pricing_procedure_determinations 
      DROP CONSTRAINT IF EXISTS pricing_procedure_determinations_division_id_fkey;
    `);
        console.log("Constraint dropped.");

        // 2. Validate strict existence of sd_divisions
        // We want to ensure we are pointing to the correct table
        const checkTable = await pool.query(`
      SELECT to_regclass('public.sd_divisions');
    `);

        if (!checkTable.rows[0].to_regclass) {
            throw new Error("Target table 'sd_divisions' does not exist!");
        }

        // 3. Add the correct constraint referencing sd_divisions
        // We use ON DELETE CASCADE or SET NULL based on typical requirements, assumign CASCADE for now or RESTRICT
        // Defaulting to NO ACTION (RESTRICT) to be safe, or just standard FK
        console.log("Adding correct constraint referencing 'sd_divisions'...");
        await pool.query(`
      ALTER TABLE pricing_procedure_determinations 
      ADD CONSTRAINT pricing_procedure_determinations_division_id_fkey 
      FOREIGN KEY (division_id) 
      REFERENCES sd_divisions(id);
    `);
        console.log("New constraint added successfully.");

        // 4. Verify other FKs while we are at it?
        // User only asked for divisions, but let's just log them for inspection
        const constraints = await pool.query(`
        SELECT conname, confrelid::regclass
        FROM pg_constraint
        WHERE conrelid = 'pricing_procedure_determinations'::regclass
        AND contype = 'f';
    `);
        console.log("Current Constraints on pricing_procedure_determinations:", constraints.rows);

    } catch (error) {
        console.error("Error fixing FK:", error);
    } finally {
        process.exit(0);
    }
}

fixPricingFK();
