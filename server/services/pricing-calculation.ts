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
}

export interface PricingResult {
    conditions: ConditionResult[];
    subtotal: number;
    taxTotal: number;
    grandTotal: number;
    pricingProcedureCode: string;
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
     * Find condition record — matches the ACTUAL condition_records table schema
     * Columns: condition_type, material_id, customer_id, sales_organization, amount, currency, unit
     * Returns null if no record found
     */
    async findConditionRecord(
        conditionTypeCode: string,
        context: PricingContext
    ): Promise<{ value: number; calculationType: string; perUnit: number } | null> {
        try {
            // Look up the calculation_type from condition_types (since condition_records doesn't have it)
            let calcType = 'A'; // default: fixed amount
            try {
                const ctRes = await pool.query(`
          SELECT calculation_type FROM condition_types
          WHERE condition_code = $1 LIMIT 1
        `, [conditionTypeCode]);
                if (ctRes.rows.length > 0) {
                    const ct = (ctRes.rows[0].calculation_type || '').toUpperCase();
                    if (ct.includes('PERCENT') || ct === 'P' || ct === '%') {
                        calcType = '%';
                    }
                }
            } catch { }

            // Query the ACTUAL condition_records table
            const result = await pool.query<ConditionRecordRow>(`
        SELECT amount, currency, unit
        FROM condition_records
        WHERE condition_type = $1
          AND is_active = true
          AND valid_from <= CURRENT_DATE
          AND valid_to >= CURRENT_DATE
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

            if (result.rows.length === 0) return null;

            const row = result.rows[0];
            return {
                value: parseFloat(row.amount) || 0,
                calculationType: calcType,
                perUnit: 1  // condition_records table has no per_unit column
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
    ): Promise<number> {
        try {
            // Step 1: Resolve customer tax class from sd_customer_tax_classification
            let customerTaxClass: string | null = null;
            if (context.customerId) {
                const ctcRes = await pool.query(`
          SELECT tax_code FROM sd_customer_tax_classification
          WHERE customer_id = $1 LIMIT 1
        `, [context.customerId]);
                if (ctcRes.rows.length > 0) {
                    customerTaxClass = ctcRes.rows[0].tax_code;
                }
            }

            // Step 2: Resolve material tax class from sd_material_tax_classification
            let materialTaxClass: string | null = null;
            if (context.materialId) {
                const mtcRes = await pool.query(`
          SELECT tax_code FROM sd_material_tax_classification
          WHERE material_id = $1 LIMIT 1
        `, [context.materialId]);
                if (mtcRes.rows.length > 0) {
                    materialTaxClass = mtcRes.rows[0].tax_code;
                }
            }

            // Step 3: Query tax_condition_records with all available keys
            // Priority: most specific → least specific
            const tcrRes = await pool.query(`
        SELECT tcr.id, tr.rate_percent
        FROM tax_condition_records tcr
        JOIN tax_rules tr ON tcr.tax_rule_id = tr.id
        WHERE tcr.condition_type_code = $1
          AND tcr.is_active = true
          AND (tcr.departure_country IS NULL OR tcr.departure_country = $2)
          AND (tcr.departure_state IS NULL OR tcr.departure_state = $3)
          AND (tcr.destination_country IS NULL OR tcr.destination_country = $4)
          AND (tcr.destination_state IS NULL OR tcr.destination_state = $5)
          AND (tcr.customer_tax_class IS NULL OR tcr.customer_tax_class = $6)
          AND (tcr.material_tax_class IS NULL OR tcr.material_tax_class = $7)
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
                console.log(`✅ Tax condition: ${conditionTypeCode} → ${rate}% (customer class: ${customerTaxClass}, material class: ${materialTaxClass})`);
                return rate;
            }

            console.warn(`⚠️ No tax condition record found for ${conditionTypeCode} (customer: ${customerTaxClass}, material: ${materialTaxClass})`);
            return 0;
        } catch (error) {
            console.error(`Error finding tax condition record for ${conditionTypeCode}:`, error);
            return 0;
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
     * Calculate subtotal from step range
     */
    calculateSubtotal(
        fromStep: number,
        toStep: number,
        processedSteps: Map<number, ConditionResult>
    ): number {
        let total = 0;
        for (let stepNum = fromStep; stepNum <= toStep; stepNum++) {
            const step = processedSteps.get(stepNum);
            if (step && !step.isStatistical) {
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

        for (const step of steps) {
            if (!this.evaluateRequirement(step.requirement, context)) continue;

            let calculatedValue = 0;
            let conditionValue = 0;
            let baseForCalculation = 0;
            let calcType = 'A';
            const isTax = this.isTaxStep(step);

            // ── SUBTOTAL step ────────────────────────────────────────────────
            if (step.is_subtotal && step.from_step && step.to_step) {
                calculatedValue = this.calculateSubtotal(step.from_step, step.to_step, processedSteps);
                baseForCalculation = calculatedValue;
                conditionValue = calculatedValue;
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
                    // ── TAX STEP: look up tax_condition_records ──────────────
                    const taxRate = await this.findTaxConditionRecord(step.condition_type_code, context);
                    conditionValue = taxRate;
                    calculatedValue = (baseForCalculation * taxRate) / 100;
                    calcType = '%';
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
                            // Fixed amount — can be per unit
                            calculatedValue = record.value * (context.quantity || 1) / record.perUnit;
                        }
                        // Discounts are stored as positive, subtract them
                        // Determine from account_key if this is a discount
                        const accountKey = step.account_key || (step as any).ct_account_key || '';
                        if (['ERS', 'ERL', 'ERB'].includes(accountKey)) {
                            calculatedValue = -Math.abs(calculatedValue);
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
                accountKey: step.account_key || (step as any).ct_account_key || undefined
            };

            processedSteps.set(step.step_number, conditionResult);
            conditions.push(conditionResult);

            if (!step.is_statistical) {
                runningTotal += calculatedValue;
                if (isTax) {
                    taxTotal += calculatedValue;
                }
            }
        }

        return {
            conditions,
            subtotal: runningTotal - taxTotal,
            taxTotal,
            grandTotal: runningTotal,
            pricingProcedureCode: procedureCode
        };
    }
}

export const pricingCalculationService = new PricingCalculationService();
