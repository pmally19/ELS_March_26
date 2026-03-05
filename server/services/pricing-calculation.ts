import { pool } from '../db';

/**
 * Pricing Calculation Service
 * Implements SAP-style pricing procedure execution
 */

export interface PricingContext {
    customerCode?: string;
    materialCode?: string;
    materialId?: number;
    customerId?: number;
    salesOrgId?: number;
    distributionChannelId?: number;
    divisionId?: number;
    departureCountry?: string;
    departureState?: string;
    destinationCountry?: string;
    destinationState?: string;
    materialGroup?: string;
    customerGroup?: string;
    quantity?: number;
    /** Manual overrides keyed by condition type code (e.g. { PR00: '750', FR10: '25' }) */
    manualOverrides?: Record<string, string>;
}

interface ConditionStep {
    id: number;
    step_number: number;
    condition_type_code?: string;
    condition_class_id?: number;
    condition_name?: string;
    is_mandatory: boolean;
    account_key?: string;
    from_step?: number;
    to_step?: number;
    requirement?: string;
    is_statistical: boolean;
    is_subtotal: boolean;
    manual_entry: boolean;
}

interface ConditionRecordRow {
    amount: string;
    currency: string | null;
    unit: string | null;
    calc_type: string | null;
}

export interface ConditionResult {
    step: number;
    conditionType?: string;
    description?: string;
    baseValue: number;
    rate: number;
    conditionValue: number;
    calculatedValue: number;
    calculationType: string;
    isStatistical: boolean;
    isSubtotal: boolean;
    isTax: boolean;
    accountKey?: string;
    /** Only set for tax steps. The tax_rules.id from which the rate was derived. Used to resolve tax GL via tax_account_determination. */
    taxRuleId?: number;
}

export interface PricingResult {
    conditions: ConditionResult[];
    subtotal: number;
    discountTotal: number;
    taxTotal: number;
    netTotal: number;
    grandTotal: number;
    pricingProcedureCode: string;
    /** Map of taxRuleId → tax amount for this pricing run. Enables FI posting to route each tax bucket to the correct GL. */
    taxRuleAmounts?: Map<number, number>;
}

class PricingCalculationService {
    /**
     * Load pricing procedure steps from database
     */
    async loadProcedureSteps(procedureCode: string): Promise<ConditionStep[]> {
        const result = await pool.query<ConditionStep>(`
    SELECT
      pps.*,
      ct.condition_name,
      ct.condition_class_id,
      ct.account_key as ct_account_key
    FROM pricing_procedure_steps pps
    LEFT JOIN pricing_procedures pp ON pps.procedure_id = pp.id
    LEFT JOIN condition_types ct ON pps.condition_type_code = ct.condition_code
    WHERE pp.procedure_code = $1
    ORDER BY pps.step_number ASC
  `, [procedureCode]);
        return result.rows;
    }

    /**
     * Cache: whether the condition_records table has a material_group column.
     * Checked once per process startup, cached after that.
     */
    private _hasMaterialGroupColumn: boolean | null = null;

    private async checkMaterialGroupColumn(): Promise<boolean> {
        if (this._hasMaterialGroupColumn !== null) return this._hasMaterialGroupColumn;
        try {
            const res = await pool.query(`
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'condition_records'
                  AND column_name = 'material_group'
                LIMIT 1
            `);
            this._hasMaterialGroupColumn = res.rows.length > 0;
            if (!this._hasMaterialGroupColumn) {
                console.warn('[PricingService] condition_records.material_group column not found — run migration. Using 4-level fallback access sequence.');
            }
        } catch {
            this._hasMaterialGroupColumn = false;
        }
        return this._hasMaterialGroupColumn;
    }

    /**
     * Find condition record — SAP-standard access sequence.
     * Full 6-level when material_group column exists:
     *   1. Customer + Material
     *   2. Customer + MaterialGroup
     *   3. Customer only
     *   4. Material only
     *   5. MaterialGroup only
     *   6. Wildcard
     * 4-level fallback when column missing (skips MaterialGroup levels).
     */
    async findConditionRecord(
        conditionTypeCode: string,
        context: PricingContext
    ): Promise<{ value: number; calculationType: string; perUnit: number } | null> {
        try {
            // ── Manual override takes priority ──────────────────────────────
            if (context.manualOverrides && conditionTypeCode in context.manualOverrides) {
                const overrideVal = parseFloat(context.manualOverrides[conditionTypeCode]);
                if (!isNaN(overrideVal) && overrideVal > 0) {
                    return { value: overrideVal, calculationType: 'A', perUnit: 1 };
                }
            }

            // Resolve calculation type from condition_types master
            let calcType = 'A';
            try {
                const ctRes = await pool.query(
                    `SELECT calculation_type FROM condition_types WHERE condition_code = $1 LIMIT 1`,
                    [conditionTypeCode]
                );
                if (ctRes.rows.length > 0) {
                    const ct = (ctRes.rows[0].calculation_type || '').toUpperCase();
                    if (ct.includes('PERCENT') || ct === 'P' || ct === '%') calcType = '%';
                }
            } catch { /* ignore */ }

            const hasMG = await this.checkMaterialGroupColumn();

            let result;

            if (hasMG) {
                // ── Full 6-level SAP access sequence ────────────────────────
                result = await pool.query<ConditionRecordRow>(`
                    SELECT amount, currency, unit
                    FROM condition_records
                    WHERE condition_type = $1
                      AND is_active = true
                      AND valid_from <= CURRENT_DATE
                      AND valid_to   >= CURRENT_DATE
                      AND (
                        (customer_id = $2 AND material_id = $3) OR
                        (customer_id = $2 AND material_group = $4 AND material_id IS NULL) OR
                        (customer_id = $2 AND material_id IS NULL AND material_group IS NULL) OR
                        (customer_id IS NULL AND material_id = $3) OR
                        (customer_id IS NULL AND material_group = $4 AND material_id IS NULL) OR
                        (customer_id IS NULL AND material_id IS NULL AND material_group IS NULL)
                      )
                    ORDER BY
                      CASE
                        WHEN customer_id IS NOT NULL AND material_id IS NOT NULL THEN 1
                        WHEN customer_id IS NOT NULL AND material_group IS NOT NULL THEN 2
                        WHEN customer_id IS NOT NULL THEN 3
                        WHEN material_id IS NOT NULL THEN 4
                        WHEN material_group IS NOT NULL THEN 5
                        ELSE 6
                      END
                    LIMIT 1
                `, [
                    conditionTypeCode,
                    context.customerId || null,
                    context.materialId || null,
                    context.materialGroup || null,
                ]);
            } else {
                // ── 4-level fallback (no material_group column yet) ──────────
                result = await pool.query<ConditionRecordRow>(`
                    SELECT amount, currency, unit
                    FROM condition_records
                    WHERE condition_type = $1
                      AND is_active = true
                      AND valid_from <= CURRENT_DATE
                      AND valid_to   >= CURRENT_DATE
                      AND (
                        (customer_id = $2 AND material_id = $3) OR
                        (customer_id = $2 AND material_id IS NULL) OR
                        (customer_id IS NULL AND material_id = $3) OR
                        (customer_id IS NULL AND material_id IS NULL)
                      )
                    ORDER BY
                      CASE
                        WHEN customer_id IS NOT NULL AND material_id IS NOT NULL THEN 1
                        WHEN customer_id IS NOT NULL THEN 2
                        WHEN material_id IS NOT NULL THEN 3
                        ELSE 4
                      END
                    LIMIT 1
                `, [
                    conditionTypeCode,
                    context.customerId || null,
                    context.materialId || null,
                ]);
            }

            if (result.rows.length === 0) return null;

            const row = result.rows[0];
            return {
                value: parseFloat(row.amount) || 0,
                calculationType: calcType,
                perUnit: 1
            };
        } catch (error) {
            console.error(`Error finding condition record for ${conditionTypeCode}:`, error);
            return null;
        }
    }

    /**
     * Find tax rate from tax_condition_records based on country/state/tax class context
     */
    async findTaxConditionRecord(
        conditionTypeCode: string,
        context: PricingContext
    ): Promise<{ rate: number; taxRuleId: number | null }> {
        try {
            // Step 1: Resolve customer tax class from erp_customers
            let customerTaxClass: string | null = null;
            if (context.customerId) {
                try {
                    const ctcRes = await pool.query(`
          SELECT tax_classification_code FROM erp_customers
          WHERE id = $1 LIMIT 1
        `, [context.customerId]);
                    if (ctcRes.rows.length > 0) {
                        customerTaxClass = ctcRes.rows[0].tax_classification_code || null;
                    }
                } catch { /* ignore */ }
            }

            // Step 2: Resolve material tax class
            let materialTaxClass: string | null = null;
            if (context.materialId) {
                try {
                    const mtcRes = await pool.query(`
          SELECT tax_classification_code FROM materials
          WHERE id = $1 LIMIT 1
        `, [context.materialId]);
                    if (mtcRes.rows.length > 0) {
                        materialTaxClass = mtcRes.rows[0].tax_classification_code || null;
                    }
                } catch { /* ignore */ }
            }

            // Step 3: Query tax_condition_records (linked to tax_rules configured in Tax Management UI)
            // Most specific match first (specificity score DESC)
            const tcrRes = await pool.query(`
        SELECT tcr.id, tcr.tax_rule_id, tr.rate_percent
        FROM tax_condition_records tcr
        JOIN tax_rules tr ON tcr.tax_rule_id = tr.id
        WHERE tcr.condition_type_code = $1
          AND tcr.is_active = true
          AND tr.is_active = true
          AND (tr.effective_from IS NULL OR tr.effective_from <= CURRENT_DATE)
          AND (tr.effective_to IS NULL OR tr.effective_to >= CURRENT_DATE)
          AND (tcr.departure_country IS NULL OR $2::text IS NULL OR tcr.departure_country = $2::text)
          AND (tcr.departure_state IS NULL OR $3::text IS NULL OR tcr.departure_state = $3::text)
          AND (tcr.destination_country IS NULL OR $4::text IS NULL OR tcr.destination_country = $4::text)
          AND (tcr.destination_state IS NULL OR $5::text IS NULL OR tcr.destination_state = $5::text)
          AND (tcr.customer_tax_class IS NULL OR $6::text IS NULL OR tcr.customer_tax_class = $6::text)
          AND (tcr.material_tax_class IS NULL OR $7::text IS NULL OR tcr.material_tax_class = $7::text)
        ORDER BY
          (CASE WHEN tcr.departure_country IS NOT NULL THEN 1 ELSE 0 END +
           CASE WHEN tcr.departure_state IS NOT NULL THEN 1 ELSE 0 END +
           CASE WHEN tcr.destination_country IS NOT NULL THEN 1 ELSE 0 END +
           CASE WHEN tcr.destination_state IS NOT NULL THEN 1 ELSE 0 END +
           CASE WHEN tcr.customer_tax_class IS NOT NULL THEN 1 ELSE 0 END +
           CASE WHEN tcr.material_tax_class IS NOT NULL THEN 1 ELSE 0 END) DESC
        LIMIT 1
      `, [
                conditionTypeCode,
                context.departureCountry || null,
                context.departureState || null,
                context.destinationCountry || null,
                context.destinationState || null,
                customerTaxClass,
                materialTaxClass
            ]);

            if (tcrRes.rows.length > 0) {
                const rate = parseFloat(tcrRes.rows[0].rate_percent) || 0;
                const taxRuleId = tcrRes.rows[0].tax_rule_id ? parseInt(String(tcrRes.rows[0].tax_rule_id)) : null;
                console.log(`✅ Tax condition: ${conditionTypeCode} → ${rate}% (ruleId=${taxRuleId}, customer: ${customerTaxClass}, material: ${materialTaxClass})`);
                return { rate, taxRuleId };
            }

            console.warn(`⚠️ No tax condition record found for ${conditionTypeCode} (customer: ${customerTaxClass}, material: ${materialTaxClass})`);
            return { rate: 0, taxRuleId: null };
        } catch (error) {
            console.error(`Error finding tax condition record for ${conditionTypeCode}:`, error);
            return { rate: 0, taxRuleId: null };
        }
    }

    /**
     * Auto-determine pricing procedure from pricing_procedure_determinations
     * Falls back to provided code or null if no determination found
     */
    async determinePricingProcedure(
        salesOrgId?: number,
        distributionChannelId?: number,
        divisionId?: number,
        customerPricingProcedureCode?: string,
        documentPricingProcedureCode?: string
    ): Promise<string | null> {
        if (!salesOrgId) return null;
        try {
            const result = await pool.query(`
        SELECT pp.procedure_code
        FROM pricing_procedure_determinations ppd
        JOIN sd_sales_organizations so ON ppd.sales_organization_id = so.id
        JOIN pricing_procedures pp ON ppd.pricing_procedure_id = pp.id
        LEFT JOIN sd_distribution_channels dc ON ppd.distribution_channel_id = dc.id
        LEFT JOIN sd_divisions dv ON ppd.division_id = dv.id
        LEFT JOIN customer_pricing_procedures cpp ON ppd.customer_pricing_procedure_id = cpp.id
        LEFT JOIN document_pricing_procedures dpp ON ppd.document_pricing_procedure_id = dpp.id
        WHERE so.id = $1
          AND (ppd.distribution_channel_id IS NULL OR dc.id = $2)
          AND (ppd.division_id IS NULL OR dv.id = $3)
          AND (ppd.customer_pricing_procedure_id IS NULL OR cpp.procedure_code = $4)
          AND (ppd.document_pricing_procedure_id IS NULL OR dpp.procedure_code = $5)
        ORDER BY
          (CASE WHEN ppd.distribution_channel_id IS NOT NULL THEN 1 ELSE 0 END +
           CASE WHEN ppd.division_id IS NOT NULL THEN 1 ELSE 0 END +
           CASE WHEN ppd.customer_pricing_procedure_id IS NOT NULL THEN 1 ELSE 0 END +
           CASE WHEN ppd.document_pricing_procedure_id IS NOT NULL THEN 1 ELSE 0 END) DESC
        LIMIT 1
      `, [
                salesOrgId,
                distributionChannelId || null,
                divisionId || null,
                customerPricingProcedureCode || null,
                documentPricingProcedureCode || null
            ]);

            if (result.rows.length > 0) {
                console.log(`✅ Pricing procedure determined: ${result.rows[0].procedure_code}`);
                return result.rows[0].procedure_code;
            }

            return null;
        } catch (error) {
            console.error('Error determining pricing procedure:', error);
            return null;
        }
    }

    /**
     * Calculate subtotal from step range.
     * Only sums ACTUAL condition steps — subtotals and statistical steps are excluded
     * so they don't get double-counted when multiple subtotals share the same range.
     */
    calculateSubtotal(
        fromStep: number,
        toStep: number,
        processedSteps: Map<number, ConditionResult>
    ): number {
        let total = 0;
        for (let stepNum = fromStep; stepNum <= toStep; stepNum++) {
            const step = processedSteps.get(stepNum);
            // Exclude: statistical steps (informational only) and subtotal steps
            // (intermediate subtotals are reference points, not additive values)
            if (step && !step.isStatistical && !step.isSubtotal) {
                total += step.calculatedValue;
            }
        }
        return total;
    }

    /**
     * Evaluate requirement condition
     */
    evaluateRequirement(requirementCode: string | undefined, context: PricingContext): boolean {
        if (!requirementCode) return true;
        switch (requirementCode) {
            case '1': return true;
            case '2': return !!context.materialCode;
            case '3': return !!context.customerCode;
            case '6': return true;
            case '55': return (context.quantity || 0) > 50;
            case '57': return !!context.customerCode && !!context.materialCode;
            default: return true;
        }
    }

    /**
     * Returns true if this condition type is a tax step
     * Checks condition_class = 'D' first, then falls back to code pattern
     */
    isTaxStep(step: ConditionStep): boolean {
        if (step.condition_class_id === 4) return true; // class D = tax in SAP (stored as ID)
        const code = (step.condition_type_code || '').toUpperCase();
        return code.includes('TAX') || code.includes('VAT') || code.includes('GST') ||
            code.includes('CGST') || code.includes('SGST') || code.includes('IGST') ||
            code.includes('VHM') || code.includes('MWST');
    }

    /**
     * Main pricing calculation — returns per-step breakdown ready for persistence
     */
    async calculatePricing(
        procedureCode: string,
        baseValue: number,
        context: PricingContext
    ): Promise<PricingResult> {
        const steps = await this.loadProcedureSteps(procedureCode);

        const processedSteps = new Map<number, ConditionResult>();
        const conditions: ConditionResult[] = [];

        let runningTotal = 0;
        let taxTotal = 0;
        let discountTotal = 0;  // sum of absolute values of discount steps
        // Track taxRuleId → accumulated tax amount for FI posting
        const taxRuleAmounts = new Map<number, number>();

        for (const step of steps) {
            if (!this.evaluateRequirement(step.requirement, context)) continue;

            let calculatedValue = 0;
            let conditionValue = 0;
            let baseForCalculation = 0;
            let calcType = 'A';
            const isTax = this.isTaxStep(step);
            let stepTaxRuleId: number | undefined = undefined;

            // ── SUBTOTAL step ────────────────────────────────────────────────
            if (step.is_subtotal && step.from_step && step.to_step) {
                calculatedValue = this.calculateSubtotal(step.from_step, step.to_step, processedSteps);
                baseForCalculation = calculatedValue;
                conditionValue = 0; // Subtotals don't have a rate
                calcType = '';      // Subtotals don't have a calculation type
            }
            // ── CONDITION TYPE step ─────────────────────────────────────────
            else if (step.condition_type_code) {

                // Determine base for calculation (from_step/to_step or running total)
                if (step.from_step) {
                    if (step.to_step && step.to_step > step.from_step) {
                        baseForCalculation = this.calculateSubtotal(step.from_step, step.to_step, processedSteps);
                    } else {
                        const sourceStep = processedSteps.get(step.from_step);
                        baseForCalculation = sourceStep ? sourceStep.calculatedValue : 0;
                    }
                } else {
                    baseForCalculation = runningTotal || baseValue;
                }

                if (isTax) {
                    // ── TAX STEP: look up tax_condition_records (linked to Tax Management UI config) ──
                    const taxResult = await this.findTaxConditionRecord(step.condition_type_code, context);
                    const taxRate = taxResult.rate;
                    stepTaxRuleId = taxResult.taxRuleId ?? undefined;
                    conditionValue = taxRate;
                    calculatedValue = (baseForCalculation * taxRate) / 100;
                    calcType = '%';

                    // Accumulate per-rule tax amounts (for FI posting GL routing)
                    if (stepTaxRuleId && calculatedValue > 0) {
                        const existing = taxRuleAmounts.get(stepTaxRuleId) ?? 0;
                        taxRuleAmounts.set(stepTaxRuleId, existing + calculatedValue);
                    }
                } else {
                    // ── PRICE / DISCOUNT STEP: look up condition_records ─────
                    const record = await this.findConditionRecord(step.condition_type_code, context);
                    if (record) {
                        conditionValue = record.value;
                        calcType = record.calculationType;

                        if (record.calculationType === '%') {
                            // Percentage of base
                            calculatedValue = (baseForCalculation * record.value) / 100;
                        } else {
                            // Fixed amount — per unit
                            calculatedValue = record.value * (context.quantity || 1) / record.perUnit;
                        }

                        // ── SAP-standard sign determination ──────────────────────────────
                        // Use condition_class_id (populated via the condition_types JOIN in
                        // loadProcedureSteps). This is the authoritative source for sign:
                        //   Class A (id=1) = Discount/Surcharge → NEGATIVE (deduction)
                        //   Class B (id=2) = Prices             → POSITIVE
                        //   Class C (id=3) = Expense Reimb.     → POSITIVE
                        //   Class D (id=4) = Tax                → handled separately as isTax
                        const classId = (step as any).condition_class_id;
                        if (classId === 1) {
                            // Discount/Surcharge → deduct
                            calculatedValue = -Math.abs(calculatedValue);
                        } else if (classId === 2 || classId === 3) {
                            // Price or Expense → always positive
                            calculatedValue = Math.abs(calculatedValue);
                        } else {
                            // Fallback when class_id not set: only ERS/ERB are deductions
                            // ERL = Revenue (positive!) — NOT a deduction
                            const accountKey = step.account_key || (step as any).ct_account_key || '';
                            if (['ERS', 'ERB', 'BO1', 'BO2', 'BO3'].includes(accountKey)) {
                                calculatedValue = -Math.abs(calculatedValue);
                            }
                        }
                    } else {
                        conditionValue = 0;
                        calculatedValue = 0;
                    }
                }
            }

            const conditionResult: ConditionResult = {
                step: step.step_number,
                conditionType: step.condition_type_code,
                description: (step as any).condition_name || `Step ${step.step_number}`,
                baseValue: baseForCalculation,
                rate: conditionValue,
                conditionValue,
                calculatedValue,
                calculationType: calcType,
                isStatistical: step.is_statistical,
                isSubtotal: step.is_subtotal,
                isTax,
                accountKey: step.account_key || (step as any).ct_account_key || undefined,
                taxRuleId: stepTaxRuleId
            };

            processedSteps.set(step.step_number, conditionResult);
            conditions.push(conditionResult);

            // Subtotal steps are reference-only (display/base for next calculation).
            // They must NOT be added to runningTotal — that would double-count.
            if (!step.is_statistical && !step.is_subtotal) {
                runningTotal += calculatedValue;
                if (isTax) {
                    taxTotal += calculatedValue;
                } else if (calculatedValue < 0) {
                    // Track discount amounts (negative non-tax, non-statistical steps)
                    discountTotal += Math.abs(calculatedValue);
                }
            }
        }

        const netTotal = runningTotal - taxTotal;   // net before tax

        return {
            conditions,
            subtotal: netTotal + discountTotal,   // gross price before discounts
            discountTotal,
            taxTotal,
            netTotal,
            grandTotal: runningTotal,
            pricingProcedureCode: procedureCode,
            taxRuleAmounts: taxRuleAmounts.size > 0 ? taxRuleAmounts : undefined
        };
    }
}

export const pricingCalculationService = new PricingCalculationService();
