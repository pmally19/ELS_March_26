import { pool } from '../db';

/**
 * Pricing Calculation Service
 * Implements SAP-style pricing procedure execution
 */

interface PricingContext {
    customerCode?: string;
    materialCode?: string;
    salesOrgId?: number;
    distributionChannelId?: number;
    divisionId?: number;
    materialGroup?: string;
    customerGroup?: string;
    quantity?: number;
}

interface ConditionStep {
    id: number;
    step_number: number;
    condition_type_code?: string;
    is_mandatory: boolean;
    account_key?: string;
    from_step?: number;
    to_step?: number;
    requirement?: string;
    is_statistical: boolean;
    is_subtotal: boolean;
    manual_entry: boolean;
}

interface ConditionResult {
    step: number;
    conditionType?: string;
    description?: string;
    baseValue: number;
    conditionValue: number;
    calculatedValue: number;
    isStatistical: boolean;
    isSubtotal: boolean;
}

interface PricingResult {
    conditions: ConditionResult[];
    subtotal: number;
    taxTotal: number;
    grandTotal: number;
}

class PricingCalculationService {

    /**
     * Load pricing procedure steps for a given procedure
     */
    async loadProcedureSteps(procedureCode: string): Promise<ConditionStep[]> {
        const result = await pool.query(`
      SELECT pps.*, ct.condition_name
      FROM pricing_procedure_steps pps
      LEFT JOIN pricing_procedures pp ON pps.procedure_id = pp.id
      LEFT JOIN condition_types ct ON pps.condition_type_code = ct.condition_code
      WHERE pp.procedure_code = $1
      ORDER BY pps.step_number ASC
    `, [procedureCode]);

        return result.rows;
    }

    /**
     * Find condition record value for a given condition type and context
     */
    async findConditionRecord(
        conditionTypeCode: string,
        context: PricingContext
    ): Promise<number | null> {
        try {
            const result = await pool.query(`
        SELECT condition_value, calculation_type, per_unit
        FROM condition_records
        WHERE condition_type_code = $1
          AND is_active = true
          AND valid_from <= CURRENT_DATE
          AND valid_to >= CURRENT_DATE
          AND (
            (customer_code = $2 AND material_code = $3) OR
            (customer_code = $2 AND material_code IS NULL) OR
            (customer_code IS NULL AND material_code = $3) OR
            (customer_group = $4 AND material_group = $5) OR
            (customer_code IS NULL AND material_code IS NULL AND customer_group IS NULL AND material_group IS NULL)
          )
          AND (
            $6::decimal IS NULL OR
            scale_quantity_from IS NULL OR
            ($6 >= scale_quantity_from AND $6 <= scale_quantity_to)
          )
        ORDER BY
          CASE
            WHEN customer_code IS NOT NULL AND material_code IS NOT NULL THEN 1
            WHEN customer_code IS NOT NULL THEN 2
            WHEN material_code IS NOT NULL THEN 3
            WHEN customer_group IS NOT NULL AND material_group IS NOT NULL THEN 4
            ELSE 5
          END,
          CASE WHEN scale_quantity_from IS NOT NULL THEN 1 ELSE 2 END
        LIMIT 1
      `, [
                conditionTypeCode,
                context.customerCode || null,
                context.materialCode || null,
                context.customerGroup || null,
                context.materialGroup || null,
                context.quantity || null
            ]);

            if (result.rows.length === 0) {
                return null;
            }

            return parseFloat(result.rows[0].condition_value) || 0;
        } catch (error) {
            console.error(`Error finding condition record for ${conditionTypeCode}:`, error);
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
     * Evaluate requirement condition (simplified - can be enhanced with formula engine)
     */
    evaluateRequirement(requirementCode: string | undefined, context: PricingContext): boolean {
        // If no requirement, always execute
        if (!requirementCode) {
            return true;
        }

        // Simple requirement evaluation (can be extended)
        // In full SAP, this would be a formula language evaluator
        switch (requirementCode) {
            case '1': // Always execute
                return true;
            case '2': // Material-dependent
                return !!context.materialCode;
            case '3': // Customer-dependent  
                return !!context.customerCode;
            case '6': // Tax-related
                return true; // Simplified - always apply tax
            case '55': // Volume discount eligibility
                return (context.quantity || 0) > 50;
            case '57': // Combination condition
                return !!context.customerCode && !!context.materialCode;
            default:
                // Unknown requirement - default to execute
                return true;
        }
    }

    /**
     * Main pricing calculation function
     */
    async calculatePricing(
        procedureCode: string,
        baseValue: number,
        context: PricingContext
    ): Promise<PricingResult> {
        // Load procedure steps
        const steps = await this.loadProcedureSteps(procedureCode);

        const processedSteps = new Map<number, ConditionResult>();
        const conditions: ConditionResult[] = [];

        let runningTotal = 0;
        let taxTotal = 0;

        // Process each step in sequence
        for (const step of steps) {
            // Evaluate requirement - skip if not met
            if (!this.evaluateRequirement(step.requirement, context)) {
                continue;
            }

            let calculatedValue = 0;
            let conditionValue = 0;
            let baseForCalculation = 0;

            // Handle subtotal steps
            if (step.is_subtotal && step.from_step && step.to_step) {
                calculatedValue = this.calculateSubtotal(step.from_step, step.to_step, processedSteps);
                baseForCalculation = calculatedValue;
            }
            // Handle condition type steps
            else if (step.condition_type_code) {
                // Find condition record
                conditionValue = await this.findConditionRecord(step.condition_type_code, context) || 0;

                // Determine base value for calculation
                if (step.from_step) {
                    if (step.to_step && step.to_step > step.from_step) {
                        // If range provided, sum the calculated values in that range
                        baseForCalculation = this.calculateSubtotal(step.from_step, step.to_step, processedSteps);
                    } else {
                        // If specific step provided (e.g. from 200 to 200), use that step's value
                        const sourceStep = processedSteps.get(step.from_step);
                        baseForCalculation = sourceStep ? sourceStep.calculatedValue : 0;
                    }
                } else {
                    // Default to Running Total or Item Base Value
                    baseForCalculation = runningTotal || baseValue;
                }

                // Calculate step value
                calculatedValue = conditionValue;

                // Handle percentage vs absolute
                // (In full implementation, this would check calculation_type from condition_records)
            }

            // Create condition result
            const conditionResult: ConditionResult = {
                step: step.step_number,
                conditionType: step.condition_type_code,
                // Prioritize manual description, then condition name, then fallback
                description: step.description || (step as any).condition_name || `Step ${step.step_number}`,
                baseValue: baseForCalculation,
                conditionValue,
                calculatedValue,
                isStatistical: step.is_statistical,
                isSubtotal: step.is_subtotal
            };

            processedSteps.set(step.step_number, conditionResult);
            conditions.push(conditionResult);

            // Update running total (unless statistical)
            if (!step.is_statistical) {
                runningTotal += calculatedValue;

                // Track tax (simple heuristic - condition types containing 'VAT' or 'TAX')
                if (step.condition_type_code?.includes('VAT') ||
                    step.condition_type_code?.includes('TAX') ||
                    step.condition_type_code?.includes('VHM')) {
                    taxTotal += calculatedValue;
                }
            }
        }

        return {
            conditions,
            subtotal: runningTotal - taxTotal,
            taxTotal,
            grandTotal: runningTotal
        };
    }
}

export const pricingCalculationService = new PricingCalculationService();
