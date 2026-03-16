import { db } from "../db";
import { sql } from "drizzle-orm";

async function checkGLData() {
    console.log("Checking GL Data for Period 1/2026 Company 1000...");

    try {
        // Check Company ID
        const company = await db.execute(sql`SELECT id FROM company_codes WHERE code = '1000'`);
        if (company.rows.length === 0) {
            console.log("Company 1000 not found");
            return;
        }
        const companyId = company.rows[0].id;
        console.log(`Company ID: ${companyId}`);

        // Check GL Entries
        const glEntries = await db.execute(sql`
      SELECT count(*) as count, sum(amount) as total
      FROM gl_entries ge
      JOIN gl_accounts ga ON ge.gl_account_id = ga.id
      WHERE ge.fiscal_year = 2026 
      AND ge.fiscal_period = 1
      AND ga.company_code_id = ${companyId}
    `);
        console.log("GL Entries (legacy):", glEntries.rows[0]);

        // Check Accounting Documents
        const accDocs = await db.execute(sql`
      SELECT count(*) as count, sum(total_amount) as total
      FROM accounting_documents ad
      WHERE ad.fiscal_year = 2026
      AND ad.period = 1
      AND ad.company_code = '1000'
    `);
        console.log("Accounting Documents (new):", accDocs.rows[0]);

        // Check specific AD Document sample for Status
        const sampleAD = await db.execute(sql`
            SELECT id, document_number, status, company_code 
            FROM accounting_documents 
            WHERE fiscal_year = 2026 AND period = 1 AND company_code = '1000'
            LIMIT 1
        `);
        console.log("Sample AD Entry:", sampleAD.rows[0]);

        // Check Totals using the ROBUST query structure (LEFT JOIN + Fallback)
        const totals = await db.execute(sql`
        SELECT 
            COALESCE(SUM(
            CASE WHEN adi.id IS NOT NULL THEN adi.debit_amount
            ELSE ad.total_amount END
            ), 0) as total_debits,
            COALESCE(SUM(
            CASE WHEN adi.id IS NOT NULL THEN adi.credit_amount
            ELSE ad.total_amount END
            ), 0) as total_credits
        FROM accounting_documents ad
        LEFT JOIN accounting_document_items adi ON ad.id = adi.document_id
        WHERE ad.fiscal_year = 2026 
        AND ad.period = 1
        AND ad.status ILIKE 'posted'
        AND ad.company_code = '1000'
        `);
        console.log("Calculated Totals (Robust):", totals.rows[0]);

        console.log("Calculated Totals:", totals.rows[0]);

        if (sampleAD.rows.length > 0) {
            const docId = sampleAD.rows[0].id;
            console.log(`Checking items for Document ID ${docId}...`);
            const items = await db.execute(sql`
                SELECT * FROM accounting_document_items WHERE document_id = ${docId}
            `);
            console.log(`Found ${items.rows.length} items:`, items.rows);
        }

        // Check specific GL Entry sample
        const sampleGL = await db.execute(sql`
        SELECT ge.id, ge.fiscal_year, ge.fiscal_period, ge.posting_status, ga.company_code_id
        FROM gl_entries ge
        JOIN gl_accounts ga ON ge.gl_account_id = ga.id
        LIMIT 1
    `);
        console.log("Sample GL Entry:", sampleGL.rows[0]);

    } catch (err) {
        console.error("Error Checking Data:", err);
    } finally {
        process.exit(0);
    }
}

checkGLData();
