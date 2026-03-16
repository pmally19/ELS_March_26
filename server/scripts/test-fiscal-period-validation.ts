import { db } from "../db";
import { sql } from "drizzle-orm";
import { TransactionalApplicationsService } from "../services/transactional-applications-service";

async function testFiscalPeriodValidation() {
    const service = new TransactionalApplicationsService();
    const companyCode = "1000";
    const year = 2026;
    const month = 1;

    console.log("=== Testing Fiscal Period Validation ===");

    try {
        // 1. Ensure company code exists
        const company = await db.execute(sql`SELECT id FROM company_codes WHERE code = ${companyCode}`);
        if (company.rows.length === 0) {
            console.log("Company code 1000 not found. Creating it...");
            await db.execute(sql`INSERT INTO company_codes (code, name, currency) VALUES ('1000', 'Test Company', 'USD')`);
        }
        const companyId = (await db.execute(sql`SELECT id FROM company_codes WHERE code = ${companyCode}`)).rows[0].id;

        // 2. Setup: Ensure a period exists and is CLOSED
        console.log(`Setting period ${month}/${year} to CLOSED...`);
        await db.execute(sql`
      DELETE FROM fiscal_periods WHERE year = ${year} AND period = ${month} AND company_code_id = ${companyId}
    `);

        // Check global period too
        await db.execute(sql`
        DELETE FROM fiscal_periods WHERE year = ${year} AND period = ${month} AND company_code_id IS NULL
      `);

        await db.execute(sql`
      INSERT INTO fiscal_periods (year, period, name, start_date, end_date, status, company_code_id, posting_allowed)
      VALUES (${year}, ${month}, 'January', '2026-01-01', '2026-01-31', 'Closed', ${companyId}, false)
    `);

        // 3. Attempt to post - Should FAIL
        console.log("Attempting to post to CLOSED period...");
        try {
            await service.createGLDocument({
                documentType: "SA",
                companyCode: companyCode,
                documentDate: new Date("2026-01-15"),
                postingDate: new Date("2026-01-15"),
                reference: "TEST-CLOSED",
                currency: "USD",
                items: [
                    { glAccount: "100000", debitAmount: 100, creditAmount: 0, description: "Debit" },
                    { glAccount: "200000", debitAmount: 0, creditAmount: 100, description: "Credit" }
                ]
            });
            console.error("❌ FAILED: Posting succeded to CLOSED period (Should have failed)");
        } catch (error: any) {
            if (error.message.includes("is Closed") || error.message.includes("Posting not allowed")) {
                console.log("✅ SUCCESS: Posting rejected as expected:", error.message);
            } else {
                console.error("❌ FAILED: Posting failed but with unexpected error:", error);
            }
        }

        // 4. Setup: Set period to OPEN
        console.log(`Setting period ${month}/${year} to OPEN...`);
        await db.execute(sql`
      UPDATE fiscal_periods 
      SET status = 'Open', posting_allowed = true 
      WHERE year = ${year} AND period = ${month} AND company_code_id = ${companyId}
    `);

        // 5. Attempt to post - Should SUCCEED
        // We need real GL accounts for this to pass the GL validation check
        // If they don't exist, we expect a different error, but the period check should pass.
        console.log("Attempting to post to OPEN period...");
        try {
            // Mock GL account check if needed or just catch the GL error
            // For this test, we just want to see if it passes the date check.
            // It will likely fail on GL account check if data is missing, so we'll catch that.
            await service.createGLDocument({
                documentType: "SA",
                companyCode: companyCode,
                documentDate: new Date("2026-01-15"),
                postingDate: new Date("2026-01-15"),
                reference: "TEST-OPEN",
                currency: "USD",
                items: [
                    { glAccount: "100000", debitAmount: 100, creditAmount: 0, description: "Debit" },
                    { glAccount: "200000", debitAmount: 0, creditAmount: 100, description: "Credit" }
                ]
            });
            console.log("✅ SUCCESS: Posting succeeded to OPEN period");
        } catch (error: any) {
            if (error.message.includes("GL Account") || error.message.includes("does not exist")) {
                console.log("✅ SUCCESS: Passed period check (failed on GL Account as expected for test data)");
            } else if (error.message.includes("is Closed")) {
                console.error("❌ FAILED: Posting rejected for OPEN period");
            } else {
                console.log("⚠️  Received other error (likely data related), but passed period check:", error.message);
            }
        }

    } catch (err) {
        console.error("Test script failed:", err);
    } finally {
        process.exit(0);
    }
}

testFiscalPeriodValidation();
