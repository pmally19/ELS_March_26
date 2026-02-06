import { db, pool } from '../db';
import { sql } from 'drizzle-orm';
import { vendorPaymentService } from './vendorPaymentService';

/**
 * Payment Authorization Service
 * 
 * Handles the complete authorization workflow:
 * 1. Determines required authorization level based on amount
 * 2. Checks user permissions
 * 3. Handles dual approval logic
 * 4. Records authorization audit trail
 * 5. Triggers payment processing when fully authorized
 */

export interface AuthorizationRequest {
    paymentId: number;          // Purchase Order ID or Payment ID
    paymentAmount: number;      // Amount to authorize
    authorizedBy: number;       // User ID of authorizer
    authorizedByName?: string;  // User name for audit
    notes?: string;             // Authorization notes
    companyCodeId?: number;     // Company code for context
    paymentMethod?: string;     // Payment method (ACH, WIRE, CHECK)
    bankAccountId?: number;     // Bank account for payment
    sourceType?: 'PO' | 'AP';   // Source of the payment (Purchase Order or Accounts Payable)
}

export interface AuthorizationResult {
    success: boolean;
    status: 'AUTHORIZED' | 'PENDING_DUAL_APPROVAL' | 'REJECTED' | 'INSUFFICIENT_PERMISSION' | 'ERROR';
    message: string;
    requiresDualApproval: boolean;
    currentApprovalCount: number;
    requiredApprovals: number;
    authorizationLevel?: string;
    paymentTriggered: boolean;
    paymentResult?: any;
}

// ... existing interfaces ...
export interface AuthorizationLevel {
    id: number;
    level_name: string;
    level_order: number;
    min_amount: number;
    max_amount: number | null;
    requires_dual_approval: boolean;
}

export interface UserAuthorizationLimit {
    id: number;
    user_id: number;
    role: string;
    daily_limit: number;
    single_payment_limit: number;
    dual_approval_threshold: number;
    can_authorize: boolean;
    authorization_level_id: number | null;
    authorization_level?: AuthorizationLevel;
}

export class PaymentAuthorizationService {
    // ... existing methods getRequiredAuthorizationLevel, getUserAuthorizationLimits, canUserAuthorize, getUserDailyTotal, updateDailyTracking ...
    /**
     * Get the required authorization level for a payment amount
     */
    async getRequiredAuthorizationLevel(amount: number): Promise<AuthorizationLevel | null> {
        const result = await pool.query(`
      SELECT id, level_name, level_order, min_amount, max_amount, requires_dual_approval
      FROM payment_authorization_levels
      WHERE is_active = true
        AND min_amount <= $1
        AND (max_amount IS NULL OR max_amount >= $1)
      ORDER BY level_order ASC
      LIMIT 1
    `, [amount]);

        if (result.rows.length === 0) {
            // Fallback to highest level if no match
            const fallback = await pool.query(`
        SELECT id, level_name, level_order, min_amount, max_amount, requires_dual_approval
        FROM payment_authorization_levels
        WHERE is_active = true
        ORDER BY level_order DESC
        LIMIT 1
      `);
            return fallback.rows[0] || null;
        }

        return {
            id: result.rows[0].id,
            level_name: result.rows[0].level_name,
            level_order: result.rows[0].level_order,
            min_amount: parseFloat(result.rows[0].min_amount),
            max_amount: result.rows[0].max_amount ? parseFloat(result.rows[0].max_amount) : null,
            requires_dual_approval: result.rows[0].requires_dual_approval
        };
    }

    /**
     * Get user's authorization limits
     */
    async getUserAuthorizationLimits(userId: number, companyCodeId?: number): Promise<UserAuthorizationLimit | null> {
        const query = companyCodeId
            ? `SELECT ul.*, pal.level_name, pal.level_order, pal.min_amount as level_min, pal.max_amount as level_max
         FROM user_authorization_limits ul
         LEFT JOIN payment_authorization_levels pal ON ul.authorization_level_id = pal.id
         WHERE ul.user_id = $1 AND (ul.company_code_id = $2 OR ul.company_code_id IS NULL)
         ORDER BY ul.company_code_id DESC NULLS LAST
         LIMIT 1`
            : `SELECT ul.*, pal.level_name, pal.level_order, pal.min_amount as level_min, pal.max_amount as level_max
         FROM user_authorization_limits ul
         LEFT JOIN payment_authorization_levels pal ON ul.authorization_level_id = pal.id
         WHERE ul.user_id = $1
         LIMIT 1`;

        const params = companyCodeId ? [userId, companyCodeId] : [userId];
        const result = await pool.query(query, params);

        if (result.rows.length === 0) {
            return null;
        }

        const row = result.rows[0];
        return {
            id: row.id,
            user_id: row.user_id,
            role: row.role,
            daily_limit: parseFloat(row.daily_limit),
            single_payment_limit: parseFloat(row.single_payment_limit),
            dual_approval_threshold: parseFloat(row.dual_approval_threshold),
            can_authorize: row.can_authorize,
            authorization_level_id: row.authorization_level_id,
            authorization_level: row.authorization_level_id ? {
                id: row.authorization_level_id,
                level_name: row.level_name,
                level_order: row.level_order,
                min_amount: parseFloat(row.level_min || 0),
                max_amount: row.level_max ? parseFloat(row.level_max) : null,
                requires_dual_approval: false
            } : undefined
        };
    }

    /**
     * Check if user can authorize a payment of given amount
     */
    async canUserAuthorize(userId: number, amount: number, companyCodeId?: number): Promise<{
        canAuthorize: boolean;
        reason?: string;
        userLimits?: UserAuthorizationLimit;
    }> {
        const userLimits = await this.getUserAuthorizationLimits(userId, companyCodeId);

        // If no limits defined, allow with warning (for admin users)
        if (!userLimits) {
            return {
                canAuthorize: true, // Allow if no limits defined (likely admin)
                reason: 'No user limits defined - proceeding with authorization',
                userLimits: undefined
            };
        }

        // Check if user can authorize at all
        if (!userLimits.can_authorize) {
            return {
                canAuthorize: false,
                reason: 'User does not have authorization permission',
                userLimits
            };
        }

        // Check single payment limit
        if (amount > userLimits.single_payment_limit) {
            return {
                canAuthorize: false,
                reason: `Payment amount ($${amount.toLocaleString()}) exceeds your single payment limit ($${userLimits.single_payment_limit.toLocaleString()})`,
                userLimits
            };
        }

        // Check daily limit
        const todayTotal = await this.getUserDailyTotal(userId);
        if (todayTotal + amount > userLimits.daily_limit) {
            return {
                canAuthorize: false,
                reason: `This payment would exceed your daily limit ($${userLimits.daily_limit.toLocaleString()}). Today's authorized total: $${todayTotal.toLocaleString()}`,
                userLimits
            };
        }

        return {
            canAuthorize: true,
            userLimits
        };
    }

    /**
     * Get user's total authorized amount for today
     */
    async getUserDailyTotal(userId: number): Promise<number> {
        const result = await pool.query(`
      SELECT COALESCE(total_authorized, 0) as total
      FROM daily_authorization_tracking
      WHERE user_id = $1 AND authorization_date = CURRENT_DATE
    `, [userId]);

        return result.rows.length > 0 ? parseFloat(result.rows[0].total) : 0;
    }

    /**
     * Update user's daily authorization tracking
     */
    async updateDailyTracking(userId: number, amount: number): Promise<void> {
        await pool.query(`
      INSERT INTO daily_authorization_tracking (user_id, authorization_date, total_authorized, payment_count, last_updated)
      VALUES ($1, CURRENT_DATE, $2, 1, NOW())
      ON CONFLICT (user_id, authorization_date)
      DO UPDATE SET 
        total_authorized = daily_authorization_tracking.total_authorized + $2,
        payment_count = daily_authorization_tracking.payment_count + 1,
        last_updated = NOW()
    `, [userId, amount]);
    }

    /**
     * Get current authorization status for a payment (vendor_payments or purchase_orders or accounts_payable)
     */
    async getPaymentAuthorizationStatus(paymentId: number, sourceType: 'PO' | 'AP' = 'PO'): Promise<{
        approvalCount: number;
        firstAuthorizedBy: number | null;
        secondAuthorizedBy: number | null;
        authorizationStatus: string;
        requiresDualApproval: boolean;
        paymentAmount: number;
    } | null> {
        // First try vendor_payments (works for both, linked by purchase_order_id or invoice_id)
        let query = `
      SELECT 
        vp.id, vp.payment_amount, vp.approval_count, 
        vp.first_authorized_by, vp.second_authorized_by,
        vp.authorization_status, vp.requires_dual_approval
      FROM vendor_payments vp
      WHERE ${sourceType === 'PO' ? 'vp.purchase_order_id' : 'vp.invoice_id'} = $1
    `;

        let result = await pool.query(query, [paymentId]);

        if (result.rows.length > 0) {
            const row = result.rows[0];
            return {
                approvalCount: row.approval_count || 0,
                firstAuthorizedBy: row.first_authorized_by,
                secondAuthorizedBy: row.second_authorized_by,
                authorizationStatus: row.authorization_status || 'PENDING',
                requiresDualApproval: row.requires_dual_approval || false,
                paymentAmount: parseFloat(row.payment_amount)
            };
        }

        if (sourceType === 'PO') {
            // Fall back to purchase_orders
            result = await pool.query(`
        SELECT 
            po.id, po.total_amount as payment_amount, 
            po.status as authorization_status
        FROM purchase_orders po
        WHERE po.id = $1
        `, [paymentId]);

            if (result.rows.length > 0) {
                const row = result.rows[0];
                return {
                    approvalCount: row.authorization_status === 'Approved' ? 1 : 0,
                    firstAuthorizedBy: null,
                    secondAuthorizedBy: null,
                    authorizationStatus: row.authorization_status || 'Pending',
                    requiresDualApproval: false, // Will be determined by amount
                    paymentAmount: parseFloat(row.payment_amount || 0)
                };
            }
        } else {
            // Fall back to accounts_payable
            result = await pool.query(`
             SELECT 
                 ap.id, ap.amount as payment_amount, 
                 ap.status as authorization_status
             FROM accounts_payable ap
             WHERE ap.id = $1
             `, [paymentId]);

            if (result.rows.length > 0) {
                const row = result.rows[0];
                const isApproved = ['Approved', 'approved', 'Authorized', 'TP', 'POSTED'].includes(row.authorization_status);
                return {
                    approvalCount: isApproved ? 1 : 0,
                    firstAuthorizedBy: null,
                    secondAuthorizedBy: null,
                    authorizationStatus: row.authorization_status || 'Open',
                    requiresDualApproval: false, // Will be determined by amount
                    paymentAmount: parseFloat(row.payment_amount || 0)
                };
            }
        }

        return null;
    }

    /**
     * Record authorization in audit table
     */
    async recordAuthorization(
        paymentId: number,
        authorizedBy: number,
        level: string,
        status: 'APPROVED' | 'REJECTED' | 'PENDING',
        notes: string,
        approvalOrder: number
    ): Promise<void> {
        // NOTE: paymentId here MUST be the ID from vendor_payments table, NOT the PO/Invoice ID
        await pool.query(`
      INSERT INTO payment_authorizations (
        payment_id, authorized_by, authorization_level,
        authorization_date, authorization_status, authorization_notes,
        approval_order, created_at
      ) VALUES ($1, $2, $3, NOW(), $4, $5, $6, NOW())
    `, [paymentId, authorizedBy, level, status, notes, approvalOrder]);
    }

    /**
     * Main authorization method - handles the complete flow
     */
    async authorizePayment(request: AuthorizationRequest): Promise<AuthorizationResult> {
        try {
            const { paymentId, paymentAmount, authorizedBy, authorizedByName, notes, companyCodeId, paymentMethod, bankAccountId, sourceType = 'PO' } = request;

            // 1. Get required authorization level for this amount
            const requiredLevel = await this.getRequiredAuthorizationLevel(paymentAmount);
            if (!requiredLevel) {
                return {
                    success: false,
                    status: 'ERROR',
                    message: 'Could not determine authorization level for this amount',
                    requiresDualApproval: false,
                    currentApprovalCount: 0,
                    requiredApprovals: 1,
                    paymentTriggered: false
                };
            }

            // 2. Check if user can authorize this amount
            const canAuth = await this.canUserAuthorize(authorizedBy, paymentAmount, companyCodeId);
            if (!canAuth.canAuthorize) {
                return {
                    success: false,
                    status: 'INSUFFICIENT_PERMISSION',
                    message: canAuth.reason || 'User cannot authorize this payment',
                    requiresDualApproval: requiredLevel.requires_dual_approval,
                    currentApprovalCount: 0,
                    requiredApprovals: requiredLevel.requires_dual_approval ? 2 : 1,
                    authorizationLevel: requiredLevel.level_name,
                    paymentTriggered: false
                };
            }

            // 3. Get current authorization status
            let currentStatus = await this.getPaymentAuthorizationStatus(paymentId, sourceType);

            // 4. Determine if dual approval is needed
            const requiresDual = requiredLevel.requires_dual_approval;
            const requiredApprovals = requiresDual ? 2 : 1;

            // 5. Check for existing authorizations
            let currentApprovalCount = currentStatus?.approvalCount || 0;
            let firstAuthorizedBy = currentStatus?.firstAuthorizedBy;

            // 6. Handle dual approval logic
            if (requiresDual && currentApprovalCount === 1) {
                // This is the second approval
                if (firstAuthorizedBy === authorizedBy) {
                    return {
                        success: false,
                        status: 'REJECTED',
                        message: 'Dual approval requires two different approvers. You already approved this payment.',
                        requiresDualApproval: true,
                        currentApprovalCount: 1,
                        requiredApprovals: 2,
                        authorizationLevel: requiredLevel.level_name,
                        paymentTriggered: false
                    };
                }
            }

            // 7. Process authorization
            const newApprovalCount = currentApprovalCount + 1;
            const isFullyAuthorized = newApprovalCount >= requiredApprovals;

            // 8. Update purchase_orders or accounts_payable AND vendor_payments
            let vendorPaymentRecordId: number;

            if (currentStatus && (currentStatus.firstAuthorizedBy !== undefined || currentStatus.approvalCount > 0)) {
                // Check if vendor_payments entry exists by checking firstAuthorizedBy/approvalCount from generic check
                // We should ideally check specifically if it came from vendor_payments table
                const checkVp = await pool.query(`
                    SELECT id FROM vendor_payments WHERE ${sourceType === 'PO' ? 'purchase_order_id' : 'invoice_id'} = $1
                 `, [paymentId]);

                if (checkVp.rows.length > 0) {
                    vendorPaymentRecordId = checkVp.rows[0].id; // Capture existing ID
                    // Update vendor_payments
                    await pool.query(`
                    UPDATE vendor_payments
                    SET 
                        authorization_status = $1,
                        requires_dual_approval = $2,
                        approval_count = $3,
                        first_authorized_by = COALESCE(first_authorized_by, $4),
                        first_authorized_date = CASE WHEN first_authorized_by IS NULL THEN NOW() ELSE first_authorized_date END,
                        second_authorized_by = CASE WHEN $3 = 2 THEN $4 ELSE second_authorized_by END,
                        second_authorized_date = CASE WHEN $3 = 2 THEN NOW() ELSE second_authorized_date END,
                        updated_at = NOW()
                    WHERE id = $5
                    `, [
                        isFullyAuthorized ? 'AUTHORIZED' : 'PENDING_DUAL_APPROVAL',
                        requiresDual,
                        newApprovalCount,
                        authorizedBy,
                        vendorPaymentRecordId
                    ]);
                } else {
                    // Fetch vendor_id and other missing details from source
                    let vendorId: number | null = null;
                    let fetchedCurrency = 'USD';
                    let fetchedCompanyCodeId = companyCodeId || 1;

                    if (sourceType === 'PO') {
                        const poDetails = await pool.query('SELECT vendor_id, currency, company_code_id FROM purchase_orders WHERE id = $1', [paymentId]);
                        if (poDetails.rows.length > 0) {
                            vendorId = poDetails.rows[0].vendor_id;
                            fetchedCurrency = poDetails.rows[0].currency || 'USD';
                            fetchedCompanyCodeId = poDetails.rows[0].company_code_id || fetchedCompanyCodeId;
                        }
                    } else {
                        const apDetails = await pool.query('SELECT vendor_id, currency_id, company_code_id FROM accounts_payable WHERE id = $1', [paymentId]);
                        if (apDetails.rows.length > 0) {
                            vendorId = apDetails.rows[0].vendor_id;
                            fetchedCompanyCodeId = apDetails.rows[0].company_code_id || fetchedCompanyCodeId;
                            if (apDetails.rows[0].currency_id) {
                                const curRes = await pool.query('SELECT code FROM currencies WHERE id = $1', [apDetails.rows[0].currency_id]);
                                fetchedCurrency = curRes.rows[0]?.code || 'USD';
                            }
                        }
                    }

                    if (!vendorId) {
                        throw new Error(`Could not determine vendor_id for ${sourceType} ${paymentId}`);
                    }

                    // Generate payment number
                    const paymentCountResult = await pool.query(`
                        SELECT COUNT(*)::integer as count 
                        FROM vendor_payments 
                        WHERE EXTRACT(YEAR FROM payment_date) = EXTRACT(YEAR FROM CURRENT_DATE)
                    `);
                    const paymentCount = paymentCountResult.rows[0]?.count || 0;
                    const paymentNumber = `PAY-${new Date().getFullYear()}-${String(paymentCount + 1).padStart(6, '0')}`;

                    // Create vendor_payment entry if it doesn't exist (first auth)
                    const insertResult = await pool.query(`
                        INSERT INTO vendor_payments (
                            ${sourceType === 'PO' ? 'purchase_order_id' : 'invoice_id'},
                            payment_number,
                            vendor_id,
                            payment_amount,
                            approval_count,
                            requires_dual_approval,
                            authorization_status,
                            first_authorized_by,
                            first_authorized_date,
                            payment_date,
                            currency,
                            company_code_id,
                            payment_method,
                            created_at,
                            updated_at
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW(), $9, $10, $11, NOW(), NOW())
                        RETURNING id
                     `, [
                        paymentId,
                        paymentNumber,
                        vendorId,
                        paymentAmount,
                        newApprovalCount,
                        requiresDual,
                        isFullyAuthorized ? 'AUTHORIZED' : 'PENDING_DUAL_APPROVAL',
                        authorizedBy,
                        fetchedCurrency,
                        fetchedCompanyCodeId,
                        paymentMethod || 'BANK_TRANSFER'
                    ]);
                    vendorPaymentRecordId = insertResult.rows[0].id;
                }
            } else {
                // Fetch vendor_id and other missing details from source
                let vendorId: number | null = null;
                let fetchedCurrency = 'USD';
                let fetchedCompanyCodeId = companyCodeId || 1;

                if (sourceType === 'PO') {
                    const poDetails = await pool.query('SELECT vendor_id, currency, company_code_id FROM purchase_orders WHERE id = $1', [paymentId]);
                    if (poDetails.rows.length > 0) {
                        vendorId = poDetails.rows[0].vendor_id;
                        fetchedCurrency = poDetails.rows[0].currency || 'USD';
                        fetchedCompanyCodeId = poDetails.rows[0].company_code_id || fetchedCompanyCodeId;
                    }
                } else {
                    const apDetails = await pool.query('SELECT vendor_id, currency_id, company_code_id FROM accounts_payable WHERE id = $1', [paymentId]);
                    if (apDetails.rows.length > 0) {
                        vendorId = apDetails.rows[0].vendor_id;
                        fetchedCompanyCodeId = apDetails.rows[0].company_code_id || fetchedCompanyCodeId;
                        if (apDetails.rows[0].currency_id) {
                            const curRes = await pool.query('SELECT code FROM currencies WHERE id = $1', [apDetails.rows[0].currency_id]);
                            fetchedCurrency = curRes.rows[0]?.code || 'USD';
                        }
                    }
                }

                if (!vendorId) {
                    throw new Error(`Could not determine vendor_id for ${sourceType} ${paymentId}`);
                }

                // Generate payment number
                const paymentCountResult = await pool.query(`
                    SELECT COUNT(*)::integer as count 
                    FROM vendor_payments 
                    WHERE payment_date::date = CURRENT_DATE
                `);
                const paymentCount = paymentCountResult.rows[0]?.count || 0;
                const paymentNumber = `PAY-${new Date().getFullYear()}-${String(paymentCount + 1).padStart(6, '0')}`;

                // Create initial vendor_payments record
                const insertResult = await pool.query(`
                    INSERT INTO vendor_payments (
                        ${sourceType === 'PO' ? 'purchase_order_id' : 'invoice_id'},
                        payment_number,
                        vendor_id,
                        payment_amount,
                        approval_count,
                        requires_dual_approval,
                        authorization_status,
                        first_authorized_by,
                        first_authorized_date,
                        payment_date,
                        currency,
                        company_code_id,
                        payment_method,
                        created_at,
                        updated_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW(), $9, $10, $11, NOW(), NOW())
                    RETURNING id
                 `, [
                    paymentId,
                    paymentNumber,
                    vendorId,
                    paymentAmount,
                    newApprovalCount,
                    requiresDual,
                    isFullyAuthorized ? 'AUTHORIZED' : 'PENDING_DUAL_APPROVAL',
                    authorizedBy,
                    fetchedCurrency,
                    fetchedCompanyCodeId,
                    paymentMethod || 'BANK_TRANSFER'
                ]);
                vendorPaymentRecordId = insertResult.rows[0].id;
            }

            if (sourceType === 'PO') {
                // Update purchase_orders
                await pool.query(`
                UPDATE purchase_orders
                SET 
                status = $1,
                approved_by = $2,
                approval_date = NOW(),
                notes = CASE 
                    WHEN notes IS NULL THEN $3
                    WHEN $3 IS NOT NULL AND $3 != '' THEN notes || E'\\n' || $3
                    ELSE notes
                END,
                updated_at = NOW()
                WHERE id = $4
            `, [
                    isFullyAuthorized ? 'Approved' : 'Pending Approval',
                    authorizedByName || `User ${authorizedBy}`,
                    notes || '',
                    paymentId
                ]);
            } else {
                // Update accounts_payable
                // Status 'Approved' implies it's ready for payment or paid. 
                // Creating a manual invoice makes it 'Open'. Authenticating it should make it 'Approved' or keep it 'Open' but authorized?
                // Let's set it to 'Approved'
                // Or maybe 'Authorized'?
                // apTilesRoutes uses: ap.status IN ('pending', ..., 'approved', 'Approved', 'Open')
                // Let's use 'Approved'
                await pool.query(`
                 UPDATE accounts_payable
                 SET 
                   status = $1,
                   updated_at = NOW()
                 WHERE id = $2
             `, [
                    isFullyAuthorized ? 'Approved' : 'Pending Approval',
                    paymentId
                ]);
            }

            // 9. Record in audit table
            // USE THE VENDOR PAYMENT RECORD ID for the FK
            await this.recordAuthorization(
                vendorPaymentRecordId,
                authorizedBy,
                requiredLevel.level_name,
                isFullyAuthorized ? 'APPROVED' : 'PENDING',
                notes || '',
                newApprovalCount
            );

            // 10. Update daily tracking
            if (isFullyAuthorized) {
                await this.updateDailyTracking(authorizedBy, paymentAmount);
            }

            // 11. Trigger payment processing if fully authorized
            let paymentResult = null;
            let paymentTriggered = false;

            if (isFullyAuthorized && bankAccountId) {
                try {
                    const paymentPayload: any = {
                        paymentAmount: paymentAmount,
                        paymentMethod: (paymentMethod as any) || 'BANK_TRANSFER',
                        paymentDate: new Date(),
                        bankAccountId: bankAccountId,
                        createdBy: authorizedBy,
                        notes: `Authorized by ${authorizedByName || 'User ' + authorizedBy}${requiresDual ? ' (Dual approval)' : ''}`
                    };

                    if (sourceType === 'PO') {
                        paymentPayload.purchaseOrderId = paymentId;
                    } else {
                        paymentPayload.invoiceId = paymentId;
                    }

                    paymentResult = await vendorPaymentService.processVendorPayment(paymentPayload);
                    paymentTriggered = paymentResult.success;
                } catch (paymentError: any) {
                    console.error('Payment processing failed after authorization:', paymentError.message);
                    // Don't fail the authorization, just note that payment wasn't triggered
                }
            }

            // 12. Return result
            const resultStatus = isFullyAuthorized ? 'AUTHORIZED' : 'PENDING_DUAL_APPROVAL';
            const message = isFullyAuthorized
                ? `Payment authorized successfully${paymentTriggered ? ' and payment processed' : '. Payment will need to be processed separately.'}`
                : `First approval recorded. Awaiting second approval from a different authorizer.`;

            return {
                success: true,
                status: resultStatus,
                message,
                requiresDualApproval: requiresDual,
                currentApprovalCount: newApprovalCount,
                requiredApprovals,
                authorizationLevel: requiredLevel.level_name,
                paymentTriggered,
                paymentResult: paymentResult
            };

        } catch (error: any) {
            console.error('Authorization error:', error);
            return {
                success: false,
                status: 'ERROR',
                message: error.message || 'Authorization failed',
                requiresDualApproval: false,
                currentApprovalCount: 0,
                requiredApprovals: 1,
                paymentTriggered: false
            };
        }
    }

    /**
     * Get all authorization levels
     */
    async getAllAuthorizationLevels(): Promise<AuthorizationLevel[]> {
        const result = await pool.query(`
      SELECT id, level_name, level_order, min_amount, max_amount, requires_dual_approval
      FROM payment_authorization_levels
      WHERE is_active = true
      ORDER BY level_order ASC
    `);

        return result.rows.map(row => ({
            id: row.id,
            level_name: row.level_name,
            level_order: row.level_order,
            min_amount: parseFloat(row.min_amount),
            max_amount: row.max_amount ? parseFloat(row.max_amount) : null,
            requires_dual_approval: row.requires_dual_approval
        }));
    }

    /**
     * Get pending payments for authorization
     */
    async getPendingPayments(): Promise<any[]> {
        const result = await pool.query(`
      SELECT 
        po.id,
        po.order_number as invoice_number,
        po.total_amount as amount,
        po.vendor_name,
        po.status,
        po.created_at,
        po.delivery_date as due_date,
        CASE 
          WHEN po.total_amount > 100000 THEN 'high'
          WHEN po.total_amount > 50000 THEN 'medium'
          ELSE 'low'
        END as risk_level,
        COALESCE(vp.approval_count, 0) as approval_count,
        COALESCE(vp.requires_dual_approval, false) as requires_dual_approval,
        COALESCE(vp.authorization_status, 'PENDING') as authorization_status,
        pal.level_name as required_level
      FROM purchase_orders po
      LEFT JOIN vendor_payments vp ON vp.purchase_order_id = po.id
      LEFT JOIN payment_authorization_levels pal ON (
        pal.min_amount <= po.total_amount 
        AND (pal.max_amount IS NULL OR pal.max_amount >= po.total_amount)
        AND pal.is_active = true
      )
      WHERE (po.active = true OR po.active IS NULL)
        AND po.status NOT IN ('Paid', 'Cancelled', 'Closed', 'Approved')
        AND po.vendor_id IS NOT NULL
      ORDER BY po.total_amount DESC, po.created_at ASC
    `);

        return result.rows;
    }
}

export const paymentAuthorizationService = new PaymentAuthorizationService();
