/**
 * Tax Determination Service
 * Resolves the correct tax rate for a sales order line item using
 * SAP-style Condition Record lookup based on:
 *   - Departure country/state  (from plant)
 *   - Destination country/state (from ship-to customer / ship-to party)
 *   - Customer Tax Classification Code
 *   - Material Tax Classification Code
 *
 * The lookup hits `tax_condition_records` which links to `tax_rules` (configured
 * via the Tax Management UI). This ensures the pricing procedure always reflects
 * what the user has configured in the Tax Management tile.
 *
 * Priority order for matching (most-specific first → fallback to general):
 *   1. country + state + customer_class + material_class (exact)
 *   2. country + (any state) + customer_class + material_class
 *   3. country + state + (any classes)
 *   4. country + (any state) + (any classes)
 *   5. No country filter (global fallback)
 */

import { db } from '../db.js';
import { sql } from 'drizzle-orm';

export interface TaxDetermineParams {
    departureCountry: string;
    departureState?: string;
    destinationCountry: string;
    destinationState?: string;
    customerTaxClass?: string;
    materialTaxClass?: string;
    conditionTypeCode?: string; // e.g. 'MWST' — leave blank to match any
}

export interface TaxDetermineResult {
    taxRuleCode: string;
    taxRuleTitle: string;
    ratePercent: number;
    conditionRecordId: number;
    /** The tax_rules.id for this matched rule — used to resolve GL via tax_account_determination */
    taxRuleId: number;
    matchType: string; // describes how specific the match was
}

async function buildQuery(
    client: typeof db,
    departureCountry: string,
    departureState: string | undefined,
    destinationCountry: string,
    destinationState: string | undefined,
    customerTaxClass: string | undefined,
    materialTaxClass: string | undefined,
    conditionTypeCode: string | undefined
): Promise<TaxDetermineResult | null> {

    // Build dynamic WHERE clause with decreasing specificity
    const attempts: Array<{ label: string; whereClause: string; params: any[] }> = [];

    // Attempt 1: Full exact match with states and classes
    if (departureState && destinationState && customerTaxClass && materialTaxClass) {
        attempts.push({
            label: 'exact (country+state+customer_class+material_class)',
            whereClause: `
        tcr.departure_country = $1 AND (tcr.departure_state = $2 OR tcr.departure_state IS NULL)
        AND tcr.destination_country = $3 AND (tcr.destination_state = $4 OR tcr.destination_state IS NULL)
        AND tcr.customer_tax_class = $5 AND tcr.material_tax_class = $6
      `,
            params: [departureCountry, departureState, destinationCountry, destinationState, customerTaxClass, materialTaxClass],
        });
    }

    // Attempt 2: country + classes only (no state filter on departure or destination)
    if (customerTaxClass && materialTaxClass) {
        attempts.push({
            label: 'country+classes (no state)',
            whereClause: `
        tcr.departure_country = $1
        AND tcr.destination_country = $2
        AND tcr.customer_tax_class = $3 AND tcr.material_tax_class = $4
      `,
            params: [departureCountry, destinationCountry, customerTaxClass, materialTaxClass],
        });
    }

    // Attempt 3: country + customer class only
    if (customerTaxClass) {
        attempts.push({
            label: 'country+customer_class only',
            whereClause: `
        tcr.departure_country = $1
        AND tcr.destination_country = $2
        AND tcr.customer_tax_class = $3
      `,
            params: [departureCountry, destinationCountry, customerTaxClass],
        });
    }

    // Attempt 4: country only (class wildcard)
    attempts.push({
        label: 'country only (class wildcard)',
        whereClause: `
      tcr.departure_country = $1
      AND tcr.destination_country = $2
    `,
        params: [departureCountry, destinationCountry],
    });

    // Attempt 5: global fallback
    attempts.push({
        label: 'global fallback',
        whereClause: `TRUE`,
        params: [],
    });

    for (const attempt of attempts) {
        const condTypeFilter = conditionTypeCode
            ? `AND tcr.condition_type_code = '${conditionTypeCode}'`
            : '';

        const rawQuery = `
      SELECT
        tcr.id AS condition_record_id,
        tcr.tax_rule_id,
        tr.id AS tr_id,
        tr.rate_percent,
        tr.rule_code AS tax_rule_code,
        tr.title AS tax_rule_title
      FROM tax_condition_records tcr
      JOIN tax_rules tr ON tr.id = tcr.tax_rule_id
      WHERE tcr.is_active = true
        AND tr.is_active = true
        ${condTypeFilter}
        AND (tr.effective_from IS NULL OR tr.effective_from <= CURRENT_DATE)
        AND (tr.effective_to IS NULL OR tr.effective_to >= CURRENT_DATE)
        AND ${attempt.whereClause}
      ORDER BY
        CASE WHEN tcr.departure_state IS NOT NULL THEN 0 ELSE 1 END,
        CASE WHEN tcr.destination_state IS NOT NULL THEN 0 ELSE 1 END,
        CASE WHEN tcr.customer_tax_class IS NOT NULL THEN 0 ELSE 1 END,
        CASE WHEN tcr.material_tax_class IS NOT NULL THEN 0 ELSE 1 END,
        tr.rate_percent DESC
      LIMIT 1
    `;

        let result: any;
        if (attempt.params.length > 0) {
            const rows = await db.execute(
                sql.raw(
                    rawQuery.replace(/\$(\d+)/g, (_: any, n: string) => {
                        const val = attempt.params[parseInt(n) - 1];
                        if (val === null || val === undefined) return 'NULL';
                        return `'${String(val).replace(/'/g, "''")}'`;
                    })
                )
            );
            result = (rows as any).rows ?? rows;
        } else {
            const rows = await db.execute(sql.raw(rawQuery));
            result = (rows as any).rows ?? rows;
        }

        if (result && result.length > 0) {
            const row = result[0];
            return {
                taxRuleCode: row.tax_rule_code,
                taxRuleTitle: row.tax_rule_title,
                ratePercent: parseFloat(row.rate_percent),
                conditionRecordId: row.condition_record_id,
                taxRuleId: row.tax_rule_id ?? row.tr_id,
                matchType: attempt.label,
            };
        }
    }

    return null;
}

/**
 * Main entry point.
 * Fetches plant state/country, customer state/country/tax_class,
 * material tax_class, then runs condition record lookup.
 */
export async function determineTaxForItem(params: {
    plantId?: number | string;
    customerId?: number | string;
    materialId?: number | string;
    conditionTypeCode?: string;
}): Promise<TaxDetermineResult | null> {
    try {
        const { plantId, customerId, materialId, conditionTypeCode } = params;

        // Fetch plant details (departure state + country)
        let departureCountry = 'IN';
        let departureState: string | undefined = undefined;

        if (plantId) {
            const plantRows = await db.execute(sql`
        SELECT country, state, region FROM plants WHERE id = ${Number(plantId)} LIMIT 1
      `);
            const plantRecs = (plantRows as any).rows ?? plantRows;
            if (plantRecs.length > 0) {
                departureCountry = plantRecs[0].country || 'IN';
                departureState = plantRecs[0].state || plantRecs[0].region || undefined;
            }
        }

        // Fetch customer details (destination state + country + tax_class)
        let destinationCountry = departureCountry;
        let destinationState: string | undefined = undefined;
        let customerTaxClass: string | undefined = undefined;

        if (customerId) {
            const custRows = await db.execute(sql`
        SELECT country, state, tax_classification_code FROM erp_customers WHERE id = ${Number(customerId)} LIMIT 1
      `);
            const custRecs = (custRows as any).rows ?? custRows;
            if (custRecs.length > 0) {
                destinationCountry = custRecs[0].country || departureCountry;
                destinationState = custRecs[0].state || undefined;
                customerTaxClass = custRecs[0].tax_classification_code || undefined;
            }
        }

        // Fetch material tax classification
        let materialTaxClass: string | undefined = undefined;
        if (materialId) {
            const matRows = await db.execute(sql`
        SELECT tax_classification_code FROM materials WHERE id = ${Number(materialId)} LIMIT 1
      `);
            const matRecs = (matRows as any).rows ?? matRows;
            if (matRecs.length > 0) {
                materialTaxClass = matRecs[0].tax_classification_code || undefined;
            }
        }

        console.log(`🔍 Tax determination: departure=${departureCountry}/${departureState}, destination=${destinationCountry}/${destinationState}, custClass=${customerTaxClass}, matClass=${materialTaxClass}`);

        const result = await buildQuery(
            db,
            departureCountry,
            departureState,
            destinationCountry,
            destinationState,
            customerTaxClass,
            materialTaxClass,
            conditionTypeCode
        );

        if (result) {
            console.log(`✅ Tax matched: ${result.ratePercent}% via ${result.matchType} (rule: ${result.taxRuleCode}, ruleId: ${result.taxRuleId})`);
        } else {
            console.log(`⚠️  No tax condition record matched — tax will be 0% or use fallback`);
        }

        return result;
    } catch (err: any) {
        console.error('❌ taxDeterminationService error:', err.message);
        return null;
    }
}

/**
 * Resolve the tax GL account number for a given tax rule from `tax_account_determination`.
 * Returns the GL account number string if found, or null.
 *
 * This is used during billing/FI posting to determine where to post the tax amount.
 * It mirrors the SAP "Tax Account Determination" step (KOFI/Account Key → GL).
 */
export async function resolveGLForTaxRule(taxRuleId: number, accountKey = 'MWS'): Promise<string | null> {
    try {
        const rows = await db.execute(sql`
      SELECT gl.account_number
      FROM tax_account_determination tad
      JOIN gl_accounts gl ON tad.gl_account_id = gl.id
      WHERE tad.tax_rule_id = ${taxRuleId}
        AND tad.account_key = ${accountKey}
        AND tad.is_active = true
        AND gl.is_active = true
      ORDER BY tad.id
      LIMIT 1
    `);
        const recs = (rows as any).rows ?? rows;
        if (recs.length > 0 && recs[0].account_number) {
            console.log(`✅ [TaxGL] Resolved GL ${recs[0].account_number} for tax_rule_id=${taxRuleId}, key=${accountKey}`);
            return String(recs[0].account_number);
        }

        // Fallback: any active mapping for this account key regardless of rule
        const fallbackRows = await db.execute(sql`
      SELECT gl.account_number
      FROM tax_account_determination tad
      JOIN gl_accounts gl ON tad.gl_account_id = gl.id
      WHERE tad.account_key = ${accountKey}
        AND tad.is_active = true
        AND gl.is_active = true
      ORDER BY tad.id
      LIMIT 1
    `);
        const fallbackRecs = (fallbackRows as any).rows ?? fallbackRows;
        if (fallbackRecs.length > 0 && fallbackRecs[0].account_number) {
            console.log(`✅ [TaxGL] Fallback GL ${fallbackRecs[0].account_number} for key=${accountKey} (no rule-specific mapping)`);
            return String(fallbackRecs[0].account_number);
        }

        return null;
    } catch (err: any) {
        console.error('❌ resolveGLForTaxRule error:', err.message);
        return null;
    }
}
