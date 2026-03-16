/**
 * Authorization Validation Service
 * Validates user authorization limits and enforces payment approval rules
 */

export interface ValidationResult {
    authorized: boolean;
    reason?: string;
    requiresDualApproval?: boolean;
    userLimits?: any;
    canProceed: boolean;
}

export interface UserLimits {
    daily_limit: number;
    single_payment_limit: number;
    dual_approval_threshold: number;
    can_authorize: boolean;
}

/**
 * Check if user can authorize a payment
 * @param userId User ID attempting to authorize
 * @param paymentAmount Amount of payment
 * @param db Database connection
 * @returns Validation result with authorization status
 */
export async function canAuthorizePayment(
    userId: number,
    paymentAmount: number,
    db: any
): Promise<ValidationResult> {
    try {
        // Step 1: Get user authorization limits
        const userLimitsQuery = await db.query(
            `SELECT 
        daily_limit, 
        single_payment_limit, 
        dual_approval_threshold,
        can_authorize,
        role
       FROM user_authorization_limits 
       WHERE user_id = $1 AND can_authorize = true
       LIMIT 1`,
            [userId]
        );

        if (!userLimitsQuery.rows[0]) {
            return {
                authorized: false,
                reason: 'User is not authorized to approve payments. Please contact your administrator.',
                canProceed: false
            };
        }

        const limits: UserLimits = userLimitsQuery.rows[0];

        // Step 2: Check single payment limit
        if (paymentAmount > limits.single_payment_limit) {
            return {
                authorized: false,
                reason: `Payment amount $${paymentAmount.toLocaleString()} exceeds your authorization limit of $${limits.single_payment_limit.toLocaleString()}. Please request approval from a higher authority.`,
                userLimits: limits,
                canProceed: false
            };
        }

        // Step 3: Check daily limit
        const today = new Date().toISOString().split('T')[0];
        const dailyUsageQuery = await db.query(
            `SELECT total_authorized 
       FROM daily_authorization_tracking 
       WHERE user_id = $1 AND authorization_date = $2`,
            [userId, today]
        );

        const usedToday = dailyUsageQuery.rows[0]?.total_authorized
            ? parseFloat(dailyUsageQuery.rows[0].total_authorized)
            : 0;

        const dailyLimit = parseFloat(limits.daily_limit.toString());
        const remainingDaily = dailyLimit - usedToday;

        if (usedToday + paymentAmount > dailyLimit) {
            return {
                authorized: false,
                reason: `This payment would exceed your daily authorization limit. Daily limit: $${dailyLimit.toLocaleString()}, Used today: $${usedToday.toLocaleString()}, Remaining: $${remainingDaily.toLocaleString()}`,
                userLimits: limits,
                canProceed: false
            };
        }

        // Step 4: Check if dual approval is required
        const dualThreshold = parseFloat(limits.dual_approval_threshold.toString());
        if (paymentAmount > dualThreshold) {
            return {
                authorized: true,
                requiresDualApproval: true,
                reason: `Payment requires dual approval (amount exceeds $${dualThreshold.toLocaleString()} threshold)`,
                userLimits: limits,
                canProceed: true
            };
        }

        // Step 5: All checks passed
        return {
            authorized: true,
            requiresDualApproval: false,
            userLimits: limits,
            canProceed: true
        };

    } catch (error: any) {
        console.error('Authorization validation error:', error);
        return {
            authorized: false,
            reason: `System error: ${error.message}`,
            canProceed: false
        };
    }
}

/**
 * Record authorization action in audit trail
 * @param paymentId Payment ID
 * @param userId User who authorized
 * @param status Approval status
 * @param notes Optional notes
 * @param db Database connection
 */
export async function recordAuthorization(
    paymentId: number,
    userId: number,
    status: 'APPROVED' | 'REJECTED' | 'PENDING',
    notes: string | null,
    db: any
): Promise<void> {
    // Get current approval count
    const paymentQuery = await db.query(
        `SELECT approval_count FROM vendor_payments WHERE id = $1`,
        [paymentId]
    );

    const approvalOrder = (paymentQuery.rows[0]?.approval_count || 0) + 1;

    // Insert authorization record
    await db.query(
        `INSERT INTO payment_authorizations 
     (payment_id, authorized_by, authorization_status, authorization_notes, approval_order)
     VALUES ($1, $2, $3, $4, $5)`,
        [paymentId, userId, status, notes, approvalOrder]
    );
}

/**
 * Update daily authorization tracking
 * @param userId User ID
 * @param amount Amount authorized
 * @param db Database connection
 */
export async function updateDailyTracking(
    userId: number,
    amount: number,
    db: any
): Promise<void> {
    const today = new Date().toISOString().split('T')[0];

    await db.query(
        `INSERT INTO daily_authorization_tracking 
     (user_id, authorization_date, total_authorized, payment_count, last_updated)
     VALUES ($1, $2, $3, 1, NOW())
     ON CONFLICT (user_id, authorization_date)
     DO UPDATE SET 
       total_authorized = daily_authorization_tracking.total_authorized + $3,
       payment_count = daily_authorization_tracking.payment_count + 1,
       last_updated = NOW()`,
        [userId, today, amount]
    );
}

/**
 * Check if payment has already been authorized by this user
 * @param paymentId Payment ID
 * @param userId User ID
 * @param db Database connection
 * @returns Whether user has already authorized this payment
 */
export async function hasUserAuthorized(
    paymentId: number,
    userId: number,
    db: any
): Promise<boolean> {
    const result = await db.query(
        `SELECT COUNT(*) as count 
     FROM payment_authorizations 
     WHERE payment_id = $1 AND authorized_by = $2 AND authorization_status = 'APPROVED'`,
        [paymentId, userId]
    );

    return parseInt(result.rows[0]?.count || '0') > 0;
}

/**
 * Check segregation of duties - user cannot authorize payment they created
 * @param paymentId Payment ID
 * @param userId User ID attempting to authorize
 * @param db Database connection
 * @returns Whether segregation check passes
 */
export async function checkSegregationOfDuties(
    paymentId: number,
    userId: number,
    db: any
): Promise<{ valid: boolean; reason?: string }> {
    const paymentQuery = await db.query(
        `SELECT created_by FROM vendor_payments WHERE id = $1`,
        [paymentId]
    );

    if (!paymentQuery.rows[0]) {
        return { valid: false, reason: 'Payment not found' };
    }

    if (paymentQuery.rows[0].created_by === userId) {
        return {
            valid: false,
            reason: 'Segregation of duties violation: You cannot authorize a payment you created'
        };
    }

    return { valid: true };
}
