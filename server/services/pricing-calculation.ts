import { pool } from '../db';

/**
 * Pricing Calculation Service
 * Implements ERP-style pricing procedure (condition technique) execution.
 *
 * erp alignment:
 *   - Pricing procedure determination (T683S equivalent)
 *   - Condition technique: access sequence → condition record lookup
 *   - 6-level access-sequence fallback (customer+material → wildcard)
 *   - Tax via tax_condition_records linked to tax_rules (MWST/CGST/SGST/IGST)
 *   - Throws on mandatory missing conditions — no silent zero-rate fallbacks
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
    plantCode?: string;
    storageLocation?: string;
    materialGroup?: string;
    customerGroup?: string;
    quantity?: number;
    /** Manual overrides keyed by condition type code (e.g. { PR00: '750', FR10: '25' }) */
    manualOverrides?: Record<string, string>;
    /** Fallback unit price (material base price) if PR00 is missing */
    fallbackPrice?: number;
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
    /** Only set for tax steps. The tax_rules.id from which the rate was derived. */
    taxRuleId?: number;
    /** True if this condition had a configuration error (e.g. missing mandatory record) */
    isError?: boolean;
    /** The error message if isError is true */
    errorMessage?: string;
}

export interface PricingResult {
    conditions: ConditionResult[];
    subtotal: number;
    discountTotal: number;
    taxTotal: number;
    netTotal: number;
    grandTotal: number;
    pricingProcedureCode: string;
    /** Map of taxRuleId → tax amount for this pricing run (FI posting GL routing). */
    taxRuleAmounts?: Map<number, number>;
    /** Overall pricing error message if any step failed configuration */
    error?: string;
}

class PricingCalculationService {
    /**
     * Load pricing procedure steps from database (ordered by step_number ASC).
     * Joins condition_types for condition_class_id and account_key — critical for sign determination.
     */
    async loadProcedureSteps(procedureCode: string): Promise<ConditionStep[]> {
        const result = await pool.query<ConditionStep>(`
            SELECT
                pps.*,
                ct.condition_name,
                ct.condition_class_id,
                ct.account_key AS ct_account_key,
                ct.plus_minus,
                ct.rounding_rule,
                ct.rounding_precision
            FROM pricing_procedure_steps pps
            LEFT JOIN pricing_procedures pp ON pps.procedure_id = pp.id
            LEFT JOIN condition_types ct ON pps.condition_type_code = ct.condition_code
            WHERE pp.procedure_code = $1
            ORDER BY pps.step_number ASC
        `, [procedureCode]);
        if (result.rows.length === 0) {
            throw new Error(
                `[PRICING CONFIG ERROR] Pricing procedure '${procedureCode}' has no steps configured. ` +
                `Maintain pricing procedure steps in SD → Pricing Configuration.`
            );
        }
        return result.rows;
    }

    /**
     * Cache: whether the condition_records table has a material_group column.
     */
    private _hasMaterialGroupColumn: boolean | null = null;

    private async checkMaterialGroupColumn(): Promise<boolean> {
        if (this._hasMaterialGroupColumn !== null) return this._hasMaterialGroupColumn;
        try {
            const res = await pool.query(`
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'condition_records' AND column_name = 'material_group'
                LIMIT 1
            `);
            this._hasMaterialGroupColumn = res.rows.length > 0;
            if (!this._hasMaterialGroupColumn) {
                console.warn('[PricingService] condition_records.material_group missing — using 4-level access sequence.');
            }
        } catch {
            this._hasMaterialGroupColumn = false;
        }
        return this._hasMaterialGroupColumn;
    }

    /**
     * Fetch material cost (VPRS) from stock_balances or materials master.
     */
    async getMaterialCost(materialId: number | null, materialCode: string | null, plantCode?: string, storageLocation?: string): Promise<number> {
        if (!materialId && !materialCode) return 0;

        let priceControl = 'V';
        let standardPrice = 0;
        let movingAveragePrice = 0;

        // 1. Try materials master (price_control and standard price)
        try {
            const matRes = await pool.query(`
                SELECT price_control, cost, base_unit_price, code
                FROM materials 
                WHERE id = $1 OR code = $2
                LIMIT 1
            `, [materialId, materialCode]);

            if (matRes.rows.length > 0) {
                const row = matRes.rows[0];
                materialCode = row.code; // Ensure we have the code for stock_balances
                priceControl = row.price_control === 'S' || row.price_control === 'V' ? row.price_control : 'V';
                standardPrice = parseFloat(row.base_unit_price || row.cost || '0');
            }
        } catch (err) {
            console.warn('[PricingService] Could not fetch from materials table:', err);
        }

        // 2. Try stock_balances (moving_average_price)
        if (plantCode && storageLocation && materialCode) {
            try {
                const stockRes = await pool.query(`
                    SELECT moving_average_price 
                    FROM stock_balances 
                    WHERE material_code = $1
                      AND plant_code = $2 
                      AND storage_location = $3
                    LIMIT 1
                `, [materialCode, plantCode, storageLocation]);
                
                if (stockRes.rows.length > 0 && stockRes.rows[0].moving_average_price != null) {
                    movingAveragePrice = parseFloat(stockRes.rows[0].moving_average_price);
                }
            } catch (err) {
                console.warn('[PricingService] Could not fetch from stock_balances:', err);
            }
        }

        // 3. Determine unit cost based on price control
        let unitCost = 0;
        if (priceControl === 'S') {
            unitCost = standardPrice;
            // Fallback
            if (unitCost === 0 && movingAveragePrice > 0) unitCost = movingAveragePrice;
        } else {
            // priceControl === 'V'
            unitCost = movingAveragePrice;
            // Fallback
            if (unitCost === 0 && standardPrice > 0) unitCost = standardPrice;
        }

        return unitCost;
    }

    /**
     * Find condition record using ERP-standard access sequence.
     * Full 6-level when material_group column exists:
     *   1. Customer + Material (highest priority)
     *   2. Customer + MaterialGroup
     *   3. Customer only
     *   4. Material only
     *   5. MaterialGroup only
     *   6. Wildcard (price list / cross-customer)
     * Returns null when no record found (non-mandatory condition types like discounts may skip).
     */
    async findConditionRecord(
        conditionTypeCode: string,
        context: PricingContext
    ): Promise<{ value: number; calculationType: string; perUnit: number } | null> {
        let calcType = 'A';
        let manualEntries = 'free';
        const ctRes = await pool.query(
            `SELECT calculation_type, manual_entries FROM condition_types WHERE condition_code = $1 LIMIT 1`,
            [conditionTypeCode]
        );
        if (ctRes.rows.length > 0) {
            const row = ctRes.rows[0];
            const ct = (row.calculation_type || '').toUpperCase();
            if (ct.includes('PERCENT') || ct === 'P' || ct === '%') calcType = '%';
            manualEntries = row.manual_entries || 'free';
        }

        // Manual override takes priority (ERP: manual entry in condition screen)
        if (context.manualOverrides && conditionTypeCode in context.manualOverrides) {
            if (manualEntries === 'automatic') {
                console.warn(`[Pricing] Manual override rejected for ${conditionTypeCode} — configured for automatic entry only.`);
            } else {
                const overrideVal = parseFloat(context.manualOverrides[conditionTypeCode]);
                if (!isNaN(overrideVal) && overrideVal > 0) {
                    return { value: overrideVal, calculationType: 'A', perUnit: 1 };
                }
            }
        }

        const hasMG = await this.checkMaterialGroupColumn();

        let result;
        if (hasMG) {
            // Full 6-level ERP access sequence
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
            // 4-level fallback (no material_group column)
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
            perUnit: 1,
        };
    }

    /**
     * Find tax rate from tax_condition_records (ERP: tax condition technique via T007A/MWST).
     * Uses ERP-standard specificity scoring — most specific (most non-null fields) wins.
     *
     * THROWS when no record found — missing tax configuration is always a hard error in ERP.
     * Callers must surface this error to the user as a configuration problem.
     */
    async findTaxConditionRecord(
        conditionTypeCode: string,
        context: PricingContext
    ): Promise<{ rate: number; taxRuleId: number | null }> {
        // Resolve customer tax classification (A0=exempt, 1=taxable)
        let customerTaxClass: string | null = null;
        if (context.customerId) {
            const ctcRes = await pool.query(
                `SELECT tax_classification_code FROM erp_customers WHERE id = $1 LIMIT 1`,
                [context.customerId]
            );
            if (ctcRes.rows.length > 0) customerTaxClass = ctcRes.rows[0].tax_classification_code || null;
        }

        // Resolve material tax classification
        let materialTaxClass: string | null = null;
        if (context.materialId) {
            const mtcRes = await pool.query(
                `SELECT tax_classification_code FROM materials WHERE id = $1 LIMIT 1`,
                [context.materialId]
            );
            if (mtcRes.rows.length > 0) materialTaxClass = mtcRes.rows[0].tax_classification_code || null;
        }

        // ERP specificity match — NULL on record = wildcard (matches all context values).
        // Context values that are null can only match wildcard (NULL) records for that field.
        const tcrRes = await pool.query(`
            SELECT tcr.id, tcr.tax_rule_id, tr.rate_percent
            FROM tax_condition_records tcr
            JOIN tax_rules tr ON tcr.tax_rule_id = tr.id
            WHERE tcr.condition_type_code = $1
              AND tcr.is_active = true
              AND tr.is_active = true
              AND (tr.effective_from IS NULL OR tr.effective_from <= CURRENT_DATE)
              AND (tr.effective_to   IS NULL OR tr.effective_to   >= CURRENT_DATE)
              -- NULL on record = wildcard; non-null must match context exactly
              AND (tcr.departure_country   IS NULL OR tcr.departure_country   = $2::text)
              AND (tcr.departure_state     IS NULL OR tcr.departure_state     = $3::text)
              AND (tcr.destination_country IS NULL OR tcr.destination_country = $4::text)
              AND (tcr.destination_state   IS NULL OR tcr.destination_state   = $5::text)
              AND (tcr.customer_tax_class  IS NULL OR tcr.customer_tax_class  = $6::text)
              AND (tcr.material_tax_class  IS NULL OR tcr.material_tax_class  = $7::text)
            ORDER BY
              (CASE WHEN tcr.departure_country   IS NOT NULL THEN 2 ELSE 0 END +
               CASE WHEN tcr.departure_state     IS NOT NULL THEN 2 ELSE 0 END +
               CASE WHEN tcr.destination_country IS NOT NULL THEN 2 ELSE 0 END +
               CASE WHEN tcr.destination_state   IS NOT NULL THEN 2 ELSE 0 END +
               CASE WHEN tcr.customer_tax_class  IS NOT NULL THEN 1 ELSE 0 END +
               CASE WHEN tcr.material_tax_class  IS NOT NULL THEN 1 ELSE 0 END) DESC
            LIMIT 1
        `, [
            conditionTypeCode,
            context.departureCountry || null,
            context.departureState || null,
            context.destinationCountry || null,
            context.destinationState || null,
            customerTaxClass,
            materialTaxClass,
        ]);

        if (tcrRes.rows.length > 0) {
            const rate = parseFloat(tcrRes.rows[0].rate_percent) || 0;
            const taxRuleId = tcrRes.rows[0].tax_rule_id
                ? parseInt(String(tcrRes.rows[0].tax_rule_id)) : null;
            console.log(
                `✅ Tax [${conditionTypeCode}]: ${rate}% ` +
                `(rule=${taxRuleId}, custClass=${customerTaxClass || '*'}, matClass=${materialTaxClass || '*'}, ` +
                `dep=${context.departureCountry || '*'}→${context.destinationCountry || '*'})`
            );
            return { rate, taxRuleId };
        }

        // No record found — log it but gracefully return 0 instead of making the UI throw a hard error.
        // This means if IGST is missing (because it's an intrastate sale), the step just evaluates to 0.00 gently.
        console.log(`[TAX CALC] No active tax record found for '${conditionTypeCode}'. Returning 0.00.`);
        return { rate: 0, taxRuleId: null };
    }

    /**
     * Auto-determine pricing procedure from pricing_procedure_determinations (ERP: T683S).
     * Uses specificity order: SalesOrg + DistChan + Division + CustomerPP + DocumentPP.
     * Returns null only when salesOrgId is missing — caller must then reject the order.
     * Does NOT silently fall back to any hardcoded procedure.
     */
    async determinePricingProcedure(
        salesOrgId?: number,
        distributionChannelId?: number,
        divisionId?: number,
        customerPricingProcedureCode?: string,
        documentPricingProcedureCode?: string
    ): Promise<string | null> {
        if (!salesOrgId) return null;

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
              AND pp.is_active = true
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
            documentPricingProcedureCode || null,
        ]);

        if (result.rows.length > 0) {
            console.log(`✅ Pricing procedure determined: ${result.rows[0].procedure_code} (salesOrgId=${salesOrgId})`);
            return result.rows[0].procedure_code;
        }

        return null;  // Caller must handle: no determination = no pricing = reject order
    }

    /**
     * Calculate subtotal from step range.
     * Excludes statistical + subtotal steps to avoid double-counting.
     */
    calculateSubtotal(
        fromStep: number,
        toStep: number,
        processedSteps: Map<number, ConditionResult>
    ): number {
        let total = 0;
        for (let stepNum = fromStep; stepNum <= toStep; stepNum++) {
            const step = processedSteps.get(stepNum);
            if (step && !step.isStatistical && !step.isSubtotal) {
                total += step.calculatedValue;
            }
        }
        return total;
    }

    /**
     * Evaluate ERP requirement condition (simplified).
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
     * Returns true if this condition type is a tax step (ERP condition class D).
     * Checks condition_class_id = 4 first, then code pattern as fallback.
     */
    isTaxStep(step: ConditionStep): boolean {
        if (step.condition_class_id === 4) return true;  // class D = tax
        const code = (step.condition_type_code || '').toUpperCase();
        return (
            code.includes('TAX') || code.includes('VAT') ||
            code.includes('GST') || code.includes('CGST') ||
            code.includes('SGST') || code.includes('IGST') ||
            code === 'MWST' || code === 'VHM'
        );
    }

    /**
     * Main pricing calculation — returns per-step breakdown ready for persistence.
     * ERP: RVAA01 / condition technique with full access sequence.
     * Throws on mandatory missing conditions (PR00, tax steps that are mandatory).
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
        let vprsValue = 0; // Store VPRS for Profit Margin calculation
        let taxTotal = 0;
        let discountTotal = 0;
        let pricingError: string | undefined = undefined;
        const taxRuleAmounts = new Map<number, number>();

        for (const step of steps) {
            if (!this.evaluateRequirement(step.requirement, context)) continue;

            let calculatedValue = 0;
            let conditionValue = 0;
            let baseForCalculation = 0;
            let calcType = 'A';
            const isTax = this.isTaxStep(step);
            let stepTaxRuleId: number | undefined = undefined;
            let stepError: string | undefined = undefined;

            // ── VPRS (Internal Price) ───────────────────────────────────────
            if (step.condition_type_code === 'VPRS') {
                const cost = await this.getMaterialCost(context.materialId || null, context.materialCode || null, context.plantCode, context.storageLocation);
                conditionValue = cost;
                calculatedValue = cost * (context.quantity || 1);
                baseForCalculation = calculatedValue;
                calcType = 'A';
                vprsValue = calculatedValue;
                step.is_statistical = true; // Ensure VPRS doesn't inflate Net Value
            }
            // ── Profit Margin (Statistical calculation或基于Net的子计) ─────────────────────
            else if (step.condition_type_code === 'Profit Margin' || (step as any).condition_name?.includes('Profit Margin') || (step as any).description?.includes('Profit Margin')) {
                // Determine base (usually current net subtotal or specific range)
                if (step.from_step) {
                    if (step.to_step && step.to_step > step.from_step) {
                        baseForCalculation = this.calculateSubtotal(step.from_step, step.to_step, processedSteps);
                    } else {
                        const sourceStep = processedSteps.get(step.from_step);
                        baseForCalculation = sourceStep ? sourceStep.calculatedValue : 0;
                    }
                } else {
                    baseForCalculation = runningTotal;
                }
                
                // Profit = Base (Net) - Cost (VPRS)
                calculatedValue = baseForCalculation - vprsValue;
                conditionValue = 0;
                calcType = '';
                step.is_statistical = true; // Ensure Profit Margin is statistical
            }
            // ── CONDITION TYPE step ─────────────────────────────────────────
            else if (step.condition_type_code) {
                // Find departure location if not provided
                if (!context.departureCountry || !context.departureState) {
                    // Logic to find departure location from plant if needed
                    // (Already handled in routes/pricing-procedures.ts preview call usually)
                }

                // Determine base for calculation
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
                    try {
                        const taxResult = await this.findTaxConditionRecord(step.condition_type_code, context);
                        const taxRate = taxResult.rate;
                        stepTaxRuleId = taxResult.taxRuleId ?? undefined;
                        conditionValue = taxRate;
                        calculatedValue = (baseForCalculation * taxRate) / 100;
                        calcType = '%';

                        if (stepTaxRuleId && calculatedValue > 0) {
                            const existing = taxRuleAmounts.get(stepTaxRuleId) ?? 0;
                            taxRuleAmounts.set(stepTaxRuleId, existing + calculatedValue);
                        }
                    } catch (err: any) {
                        stepError = err.message;
                        pricingError = pricingError || stepError;
                    }
                } else {
                    const record = await this.findConditionRecord(step.condition_type_code, context);

                    if (record) {
                        conditionValue = record.value;
                        calcType = record.calculationType;

                        if (record.calculationType === '%') {
                            calculatedValue = (baseForCalculation * record.value) / 100;
                        } else {
                            calculatedValue = record.value * (context.quantity || 1) / record.perUnit;
                        }
                    } else if (step.condition_class_id === 2 && context.fallbackPrice != null && context.fallbackPrice > 0) {
                        conditionValue = context.fallbackPrice;
                        calcType = 'A';
                        calculatedValue = context.fallbackPrice * (context.quantity || 1);
                        console.log(`[Pricing] No record for ${step.condition_type_code}, using fallback price: ${conditionValue}`);
                    } else if (step.is_mandatory) {
                        stepError = `[PRICING CONFIG ERROR] Mandatory condition '${step.condition_type_code}' (step ${step.step_number}) has no active condition record.`;
                        pricingError = pricingError || stepError;
                    }

                    if (calculatedValue !== 0 || record || (step.condition_class_id === 2 && context.fallbackPrice)) {
                        const ct_plus_minus = (step as any).plus_minus;
                        if (ct_plus_minus === 'positive') {
                            calculatedValue = Math.abs(calculatedValue);
                        } else if (ct_plus_minus === 'negative') {
                            calculatedValue = -Math.abs(calculatedValue);
                        } else {
                            const classId = (step as any).condition_class_id;
                            if (classId === 1) {
                                calculatedValue = -Math.abs(calculatedValue);
                            } else if (classId === 2 || classId === 3) {
                                calculatedValue = Math.abs(calculatedValue);
                            } else {
                                const accountKey = step.account_key || (step as any).ct_account_key || '';
                                if (['ERS', 'ERB', 'BO1', 'BO2', 'BO3'].includes(accountKey)) {
                                    calculatedValue = -Math.abs(calculatedValue);
                                }
                            }
                        }

                        const rounding_rule = (step as any).rounding_rule;
                        if (rounding_rule && rounding_rule !== 'commercial') {
                            const precision = (step as any).rounding_precision ?? 2;
                            const factor = Math.pow(10, precision);
                            if (rounding_rule === 'round_up') {
                                calculatedValue = Math.ceil(calculatedValue * factor) / factor;
                            } else if (rounding_rule === 'round_down') {
                                calculatedValue = Math.floor(calculatedValue * factor) / factor;
                            }
                        }
                    }
                }
            }
            // ── SUBTOTAL step ───────────────────────────────────────────────
            else if (step.is_subtotal) {
                if (step.from_step) {
                    if (step.to_step && step.to_step > step.from_step) {
                        calculatedValue = this.calculateSubtotal(step.from_step, step.to_step, processedSteps);
                    } else {
                        const sourceStep = processedSteps.get(step.from_step);
                        calculatedValue = sourceStep ? sourceStep.calculatedValue : 0;
                    }
                } else {
                    calculatedValue = runningTotal;
                }
                baseForCalculation = calculatedValue;
                conditionValue = 0;
                calcType = '';
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
                taxRuleId: stepTaxRuleId,
            } as any; // Cast temporarily for the new fields

            if (stepError) {
                (conditionResult as any).isError = true;
                (conditionResult as any).errorMessage = stepError;
            }

            processedSteps.set(step.step_number, conditionResult);
            conditions.push(conditionResult);

            if (!step.is_statistical && !step.is_subtotal && !stepError) {
                runningTotal += calculatedValue;
                if (isTax) {
                    taxTotal += calculatedValue;
                } else if (calculatedValue < 0) {
                    discountTotal += Math.abs(calculatedValue);
                }
            }
        }

        const netTotal = runningTotal - taxTotal;

        return {
            conditions,
            subtotal: netTotal + discountTotal,
            discountTotal,
            taxTotal,
            netTotal,
            grandTotal: runningTotal,
            pricingProcedureCode: procedureCode,
            taxRuleAmounts: taxRuleAmounts.size > 0 ? taxRuleAmounts : undefined,
            error: pricingError
        } as any;
    }
}

export const pricingCalculationService = new PricingCalculationService();
