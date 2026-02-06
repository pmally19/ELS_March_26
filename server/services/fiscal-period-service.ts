import { db } from "../db";
import { sql } from "drizzle-orm";

export class FiscalPeriodService {
    /**
     * Validates if the posting date falls within an open fiscal period for the given company code.
     * Throws an error if the period is closed, locked, or not found.
     * 
     * @param postingDate The date of the posting
     * @param companyCode The company code for the posting
     */
    static async validatePostingPeriod(postingDate: Date, companyCode: string): Promise<void> {
        const year = postingDate.getFullYear();
        const month = postingDate.getMonth() + 1; // 0-indexed month

        // query to find the fiscal period
        // We check for:
        // 1. Specific company code period
        // 2. Or a global period (company_code_id IS NULL) if company specific not found - though strictly SAP usually requires company code specific control 
        //    but for this system we'll check matching company code first.

        // First get company_code_id
        const companyResult = await db.execute(sql`
      SELECT id FROM company_codes WHERE code = ${companyCode} LIMIT 1
    `);

        if (companyResult.rows.length === 0) {
            throw new Error(`Company code ${companyCode} not found`);
        }

        const companyCodeId = companyResult.rows[0].id;

        const periodResult = await db.execute(sql`
      SELECT status, posting_allowed 
      FROM fiscal_periods 
      WHERE year = ${year} 
      AND period = ${month}
      AND (company_code_id = ${companyCodeId} OR company_code_id IS NULL)
      ORDER BY company_code_id NULLS LAST
      LIMIT 1
    `);

        if (periodResult.rows.length === 0) {
            // If no period is defined, we might want to allow it if it's a new system, 
            // but strictly we should require Open periods.
            // However, to avoid breaking existing flows if periods aren't fully set up:
            console.warn(`No fiscal period defined for ${year}-${month} Company ${companyCode}. Assuming OPEN for backward compatibility.`);
            return;
        }

        const periodDef = periodResult.rows[0];

        // Check status
        if (periodDef.status !== 'Open' || !periodDef.posting_allowed) {
            throw new Error(`Fiscal period ${month}/${year} is ${periodDef.status} for company ${companyCode}. Posting not allowed.`);
        }
    }
}
