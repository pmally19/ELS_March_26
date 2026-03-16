/**
 * Payment Risk Assessment Service
 * Calculates risk scores for vendor payments based on multiple factors
 */

export interface RiskAssessmentResult {
    riskLevel: 'HIGH' | 'MEDIUM' | 'LOW';
    riskScore: number;
    riskFactors: string[];
}

export interface PaymentData {
    amount: number;
    vendor_id: number;
    invoice_number: string;
    payment_date: string;
    due_date?: string;
}

export interface VendorHistory {
    amount: number;
    invoice_number: string;
    payment_date: string;
}

/**
 * Calculate comprehensive risk assessment for a payment
 * @param payment Payment details to assess
 * @param vendorHistory Historical payments to this vendor
 * @returns Risk assessment with level, score, and factors
 */
export function calculatePaymentRisk(
    payment: PaymentData,
    vendorHistory: VendorHistory[]
): RiskAssessmentResult {
    let riskScore = 0;
    const riskFactors: string[] = [];

    // ===== Factor 1: First-time vendor (30 points) =====
    if (!vendorHistory || vendorHistory.length === 0) {
        riskScore += 30;
        riskFactors.push('🆕 First-time vendor payment - requires additional verification');
    }

    // ===== Factor 2: Amount variance (25 points) =====
    if (vendorHistory && vendorHistory.length > 0) {
        const totalAmount = vendorHistory.reduce((sum, p) => sum + Number(p.amount), 0);
        const avgPayment = totalAmount / vendorHistory.length;
        const variance = payment.amount / avgPayment;

        if (variance > 2) {
            riskScore += 25;
            const percentAbove = ((variance - 1) * 100).toFixed(0);
            riskFactors.push(`📈 Amount is ${percentAbove}% above vendor average ($${avgPayment.toFixed(2)})`);
        } else if (variance > 1.5) {
            riskScore += 15;
            riskFactors.push(`⚠️ Amount moderately above average for this vendor`);
        }
    }

    // ===== Factor 3: Duplicate detection (40 points - CRITICAL) =====
    if (vendorHistory && vendorHistory.length > 0) {
        const duplicates = vendorHistory.filter(p => {
            // Check for exact invoice number match
            if (p.invoice_number === payment.invoice_number) {
                return true;
            }

            // Check for same amount within 30 days
            const amountMatch = Math.abs(Number(p.amount) - payment.amount) < 0.01;
            const paymentDate = new Date(payment.payment_date);
            const historyDate = new Date(p.payment_date);
            const daysDiff = Math.abs((paymentDate.getTime() - historyDate.getTime()) / (1000 * 60 * 60 * 24));

            return amountMatch && daysDiff < 30;
        });

        if (duplicates.length > 0) {
            riskScore += 40;
            riskFactors.push(`🚨 CRITICAL: Potential duplicate payment detected (${duplicates.length} similar payment(s))`);
        }
    }

    // ===== Factor 4: High-value payment (20 points) =====
    if (payment.amount > 100000) {
        riskScore += 20;
        riskFactors.push(`💰 High-value payment ($${payment.amount.toLocaleString()})`);
    } else if (payment.amount > 50000) {
        riskScore += 15;
        riskFactors.push(`💵 Significant payment amount`);
    } else if (payment.amount > 25000) {
        riskScore += 10;
        riskFactors.push(`💳 Above-average payment amount`);
    }

    // ===== Factor 5: Payment timing (15 points) =====
    if (payment.due_date) {
        const dueDate = new Date(payment.due_date);
        const paymentDate = new Date(payment.payment_date);
        const daysUntilDue = Math.floor((dueDate.getTime() - paymentDate.getTime()) / (1000 * 60 * 60 * 24));

        if (daysUntilDue > 30) {
            riskScore += 15;
            riskFactors.push(`⏰ Early payment: ${daysUntilDue} days before due date`);
        } else if (daysUntilDue < -7) {
            riskScore += 10;
            riskFactors.push(`⏱️ Late payment: ${Math.abs(daysUntilDue)} days overdue`);
        }
    }

    // ===== Factor 6: Round amount (10 points) =====
    // Round amounts are sometimes indicators of fraud
    if (payment.amount % 1000 === 0 && payment.amount >= 10000) {
        riskScore += 10;
        riskFactors.push(`🔢 Round amount ($${payment.amount.toLocaleString()}) - verify invoice details`);
    }

    // ===== Determine final risk level =====
    let riskLevel: 'HIGH' | 'MEDIUM' | 'LOW';

    if (riskScore >= 50) {
        riskLevel = 'HIGH';
    } else if (riskScore >= 25) {
        riskLevel = 'MEDIUM';
    } else {
        riskLevel = 'LOW';
    }

    // Add summary factor
    if (riskLevel === 'HIGH') {
        riskFactors.unshift(`⛔ HIGH RISK (Score: ${riskScore}) - Requires manager review`);
    } else if (riskLevel === 'MEDIUM') {
        riskFactors.unshift(`⚠️ MEDIUM RISK (Score: ${riskScore}) - Review recommended`);
    } else {
        riskFactors.unshift(`✅ LOW RISK (Score: ${riskScore}) - Normal processing`);
    }

    return {
        riskLevel,
        riskScore,
        riskFactors
    };
}

/**
 * Get risk level color for UI display
 * @param riskLevel Risk level
 * @returns Color class or hex code
 */
export function getRiskColor(riskLevel: string): string {
    switch (riskLevel) {
        case 'HIGH':
            return '#EF4444'; // Red
        case 'MEDIUM':
            return '#F59E0B'; // Orange
        case 'LOW':
            return '#10B981'; // Green
        default:
            return '#6B7280'; // Gray
    }
}

/**
 * Determine if payment requires additional approval based on risk
 * @param riskLevel Risk level
 * @param amount Payment amount
 * @returns Whether additional approval is needed
 */
export function requiresAdditionalApproval(riskLevel: string, amount: number): boolean {
    if (riskLevel === 'HIGH') {
        return true; // All high-risk payments need additional approval
    }

    if (riskLevel === 'MEDIUM' && amount > 50000) {
        return true; // Medium risk + high amount needs approval
    }

    return false;
}
