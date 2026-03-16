import { db } from "../db";
import { documentNumberSequences } from "@shared/document-number-schema";

/**
 * Run database migration to create document_number_sequences table
 * and seed initial data
 */
async function runMigration() {
    try {
        console.log("Creating document_number_sequences table...");

        // The table will be created by Drizzle based on the schema
        // We just need to insert initial data
        await db.insert(documentNumberSequences).values([
            {
                documentType: 'QUOTATION',
                prefix: 'QUOT',
                currentNumber: 0,
                resetFrequency: 'NEVER',
            },
            {
                documentType: 'SALES_ORDER',
                prefix: 'SO',
                currentNumber: 0,
                resetFrequency: 'NEVER',
            },
        ]).onConflictDoNothing();

        console.log("✅ Migration completed successfully!");
        console.log("- Created QUOTATION sequence with prefix 'QUOT'");
        console.log("- Created SALES_ORDER sequence with prefix 'SO'");

    } catch (error) {
        console.error("❌ Migration failed:", error);
        throw error;
    }
}

// Run if executed directly
if (require.main === module) {
    runMigration()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}

export { runMigration };
