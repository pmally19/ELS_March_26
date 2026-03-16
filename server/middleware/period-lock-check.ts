import { Request, Response, NextFunction } from 'express';
import { pool } from '../db';

/**
 * Period Lock Validation Middleware
 * Prevents posting to closed or locked fiscal periods
 */

export interface PeriodLockCheckOptions {
    companyCodeId?: number;
    postingDate?: Date | string;
    documentType?: 'normal' | 'adjustment' | 'reversal';
    bypassCheck?: boolean; // For super admin override
    module?: string; // e.g., 'INVENTORY', 'ASSETS'
}

export class PeriodLockError extends Error {
    constructor(
        message: string,
        public periodStatus: string,
        public period: number,
        public fiscalYear: number,
        public controlReason?: string,
        public module: string = 'ALL'
    ) {
        super(message);
        this.name = 'PeriodLockError';
    }
}

/**
 * Check if posting is allowed for a specific period
 */
export async function checkPeriodLock(
    companyCodeId: number,
    postingDate: Date | string,
    documentType: 'normal' | 'adjustment' | 'reversal' = 'normal',
    module: string = 'ALL'
): Promise<{
    allowed: boolean;
    postingStatus?: string;
    controlReason?: string;
    period: number;
    fiscalYear: number;
    effectiveModule?: string;
}> {
    try {
        const date = new Date(postingDate);
        const period = date.getMonth() + 1;
        const fiscalYear = date.getFullYear();

        // Check posting_period_controls
        // Logic: specific module takes precedence, then 'ALL'
        const controlCheck = await pool.query(
            `SELECT 
        posting_status,
        allow_posting,
        allow_adjustments,
        allow_reversals,
        control_reason,
        module
      FROM posting_period_controls
      WHERE company_code_id = $1
        AND fiscal_year = $2
        AND period_from <= $3
        AND period_to >= $3
        AND is_active = TRUE
        AND module IN ($4, 'ALL')
      ORDER BY 
        CASE WHEN module = $4 THEN 1 ELSE 2 END, -- Prioritize specific module
        period_from DESC
      LIMIT 1`,
            [companyCodeId, fiscalYear, period, module]
        );

        if (controlCheck.rows.length > 0) {
            const control = controlCheck.rows[0];

            // Check if period is LOCKED
            if (control.posting_status === 'LOCKED') {
                return {
                    allowed: false,
                    postingStatus: 'LOCKED',
                    controlReason: control.control_reason,
                    period,
                    fiscalYear,
                    effectiveModule: control.module
                };
            }

            // Check if period is CLOSED
            if (control.posting_status === 'CLOSED') {
                // Allow adjustments if flag is set
                if (documentType === 'adjustment' && control.allow_adjustments) {
                    return { allowed: true, postingStatus: 'CLOSED', period, fiscalYear, effectiveModule: control.module };
                }

                // Allow reversals if flag is set
                if (documentType === 'reversal' && control.allow_reversals) {
                    return { allowed: true, postingStatus: 'CLOSED', period, fiscalYear, effectiveModule: control.module };
                }

                // Otherwise, not allowed
                if (!control.allow_posting) {
                    return {
                        allowed: false,
                        postingStatus: 'CLOSED',
                        controlReason: control.control_reason,
                        period,
                        fiscalYear,
                        effectiveModule: control.module
                    };
                }
            }

            // Period is OPEN
            if (!control.allow_posting && documentType === 'normal') {
                return {
                    allowed: false,
                    postingStatus: control.posting_status,
                    controlReason: control.control_reason,
                    period,
                    fiscalYear,
                    effectiveModule: control.module
                };
            }
        }

        // Also check fiscal_periods table (global fallback)
        const fiscalPeriodCheck = await pool.query(
            `SELECT status, posting_allowed
      FROM fiscal_periods
      WHERE year = $1
        AND period = $2
        AND (company_code_id = $3 OR company_code_id IS NULL)
        AND active = TRUE
      LIMIT 1`,
            [fiscalYear, period, companyCodeId]
        );

        if (fiscalPeriodCheck.rows.length > 0) {
            const fiscalPeriod = fiscalPeriodCheck.rows[0];

            if (fiscalPeriod.status === 'Closed' && !fiscalPeriod.posting_allowed) {
                return {
                    allowed: false,
                    postingStatus: 'CLOSED',
                    controlReason: 'Fiscal period is closed',
                    period,
                    fiscalYear,
                    effectiveModule: 'Global'
                };
            }
        }

        // No controls found or period is open - allow posting
        return {
            allowed: true,
            postingStatus: 'OPEN',
            period,
            fiscalYear,
            effectiveModule: 'None'
        };

    } catch (error) {
        console.error('Error checking period lock:', error);
        // On error, default to allowing (fail open for safety)
        const date = new Date(postingDate);
        return {
            allowed: true,
            postingStatus: 'OPEN',
            period: date.getMonth() + 1,
            fiscalYear: date.getFullYear(),
            effectiveModule: 'Error'
        };
    }
}

/**
 * Express middleware to validate period lock before posting
 * Usage: Add to any route that creates/modifies financial documents
 */
export function validatePeriodLock(options?: {
    companyCodeIdField?: string;
    postingDateField?: string;
    documentTypeField?: string;
    module?: string;
}) {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            // Extract values from request body
            const companyCodeIdField = options?.companyCodeIdField || 'company_code_id';
            const postingDateField = options?.postingDateField || 'posting_date';
            const documentTypeField = options?.documentTypeField || 'document_type';
            const module = options?.module || 'ALL';

            const companyCodeId = req.body[companyCodeIdField];
            const postingDate = req.body[postingDateField];
            const documentType = req.body[documentTypeField] || 'normal';

            // Skip if no posting date or company code (let other validation handle it)
            if (!companyCodeId || !postingDate) {
                return next();
            }

            // Check period lock
            const result = await checkPeriodLock(
                parseInt(companyCodeId),
                postingDate,
                documentType,
                module
            );

            if (!result.allowed) {
                const errorMessage =
                    `Posting not allowed for period ${result.period}/${result.fiscalYear} [${result.effectiveModule}]. ` +
                    `Period status: ${result.postingStatus}. ` +
                    `${result.controlReason ? `Reason: ${result.controlReason}` : ''}`;

                return res.status(403).json({
                    success: false,
                    error: 'Period is locked',
                    message: errorMessage,
                    details: {
                        period: result.period,
                        fiscalYear: result.fiscalYear,
                        postingStatus: result.postingStatus,
                        controlReason: result.controlReason,
                        module: result.effectiveModule
                    }
                });
            }

            // Period is open, continue
            next();
        } catch (error: any) {
            console.error('Period lock validation error:', error);
            // On error, continue (fail open)
            next();
        }
    };
}

/**
 * Standalone function for use in route handlers
 */
export async function enforcePeriodLock(
    companyCodeId: number,
    postingDate: Date | string,
    documentType: 'normal' | 'adjustment' | 'reversal' = 'normal',
    module: string = 'ALL'
): Promise<void> {
    const result = await checkPeriodLock(companyCodeId, postingDate, documentType, module);

    if (!result.allowed) {
        throw new PeriodLockError(
            `Period ${result.period}/${result.fiscalYear} is ${result.postingStatus}`,
            result.postingStatus || 'LOCKED',
            result.period,
            result.fiscalYear,
            result.controlReason,
            result.effectiveModule
        );
    }
}

/**
 * Get current open period for a company
 */
export async function getCurrentOpenPeriod(companyCodeId: number): Promise<{
    year: number;
    period: number;
    name: string;
} | null> {
    try {
        const result = await pool.query(
            `SELECT year, period, name
      FROM fiscal_periods
      WHERE (company_code_id = $1 OR company_code_id IS NULL)
        AND status = 'Open'
        AND posting_allowed = TRUE
        AND active = TRUE
        AND start_date <= CURRENT_DATE
        AND end_date >= CURRENT_DATE
      ORDER BY year DESC, period DESC
      LIMIT 1`,
            [companyCodeId]
        );

        if (result.rows.length > 0) {
            return result.rows[0];
        }

        return null;
    } catch (error) {
        console.error('Error getting current open period:', error);
        return null;
    }
}
