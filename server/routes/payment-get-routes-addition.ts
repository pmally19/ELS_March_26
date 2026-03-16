// ========================================
// PAYMENT RETRIEVAL ROUTES
// ========================================

/**
 * GET /order-to-cash/customer-payments
 * Retrieve list of customer payments with filters
 */
router.get('/customer-payments', async (req, res) => {
    try {
        const { customerId, status, startDate, endDate, limit = '50' } = req.query;

        // Build dynamic query
        const conditions: any[] = [];

        if (customerId) {
            conditions.push(`cp.customer_id = ${parseInt(String(customerId))}`);
        }

        if (status) {
            conditions.push(`cp.posting_status = '${String(status)}'`);
        }

        if (startDate) {
            conditions.push(`cp.payment_date >= '${String(startDate)}'`);
        }

        if (endDate) {
            conditions.push(`cp.payment_date <= '${String(endDate)}'`);
        }

        const whereClause = conditions.length > 0 ? 'AND ' + conditions.join(' AND ') : '';

        const result = await db.execute(sql`
      SELECT 
        cp.id,
        cp.payment_number,
        cp.customer_id,
        ec.name as customer_name,
        cp.payment_date,
        cp.payment_amount,
        cp.payment_method,
        cp.reference,
        cp.posting_status,
        cp.currency,
        cp.description,
        cp.created_at,
        COUNT(pa.id) as applications_count,
        COALESCE(SUM(pa.applied_amount), 0) as total_applied
      FROM customer_payments cp
      LEFT JOIN erp_customers ec ON cp.customer_id = ec.id
      LEFT JOIN payment_applications pa ON cp.id = pa.payment_id
      WHERE 1=1 ${sql.raw(whereClause)}
      GROUP BY cp.id, ec.name
      ORDER BY cp.payment_date DESC, cp.id DESC
      LIMIT ${parseInt(String(limit))}
    `);

        res.json({
            success: true,
            data: result.rows,
            count: result.rows.length
        });
    } catch (error: any) {
        console.error('Error fetching customer payments:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch customer payments'
        });
    }
});

/**
 * GET /order-to-cash/payment-applications
 * Get payment applications for a specific payment
 */
router.get('/payment-applications', async (req, res) => {
    try {
        const { paymentId } = req.query;

        if (!paymentId) {
            return res.status(400).json({
                success: false,
                error: 'paymentId is required'
            });
        }

        const result = await db.execute(sql`
      SELECT 
        pa.id,
        pa.payment_id,
        pa.billing_id,
        pa.applied_amount,
        pa.application_date,
        cp.payment_number,
        bd.billing_number,
        bd.total_amount as invoice_total,
        bd.outstanding_amount as invoice_outstanding,
        ec.name as customer_name
      FROM payment_applications pa
      LEFT JOIN customer_payments cp ON pa.payment_id = cp.id
      LEFT JOIN billing_documents bd ON pa.billing_id = bd.id
      LEFT JOIN erp_customers ec ON bd.customer_id = ec.id
      WHERE pa.payment_id = ${parseInt(String(paymentId))}
      ORDER BY pa.application_date DESC
    `);

        res.json({
            success: true,
            data: result.rows,
            count: result.rows.length
        });
    } catch (error: any) {
        console.error('Error fetching payment applications:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'Failed to fetch payment applications'
        });
    }
});
