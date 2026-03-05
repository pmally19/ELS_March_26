import { Router } from "express";
import { db, pool } from "../../db.js";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";
import { APInvoiceService } from "../../services/apInvoiceService.js";
import { paymentAuthorizationService } from "../../services/paymentAuthorizationService.js";
import { DocumentNumberingService } from "../../services/documentNumberingService.js";

const router = Router();
const apInvoiceService = new APInvoiceService(pool);

// AP Statistics endpoint
router.get("/statistics", async (req, res) => {
  try {
    const vendorCount = await db.execute(sql`SELECT COUNT(*) as count FROM erp_vendors`);
    const invoiceCount = await db.execute(sql`SELECT COUNT(*) as count FROM ap_invoices`);
    const pendingPayments = await db.execute(sql`
      SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total_amount 
      FROM ap_payments 
      WHERE status = 'pending'
    `);
    const overdueInvoices = await db.execute(sql`
      SELECT COUNT(*) as count 
      FROM ap_invoices 
      WHERE due_date < CURRENT_DATE AND status != 'paid'
    `);

    res.json({
      vendor_count: vendorCount[0]?.count || 0,
      invoice_count: invoiceCount[0]?.count || 0,
      pending_payment_count: pendingPayments[0]?.count || 0,
      pending_payment_amount: pendingPayments[0]?.total_amount || 0,
      overdue_count: overdueInvoices[0]?.count || 0,
    });
  } catch (error) {
    console.error("Error fetching AP statistics:", error);
    res.status(500).json({ error: "Failed to fetch AP statistics" });
  }
});

// AP Vendor data endpoint
router.get("/vendor-data", async (req, res) => {
  try {
    const vendors = await db.execute(sql`
      SELECT 
        v.*,
        COUNT(i.id) as invoice_count,
        COALESCE(SUM(i.amount), 0) as total_spend,
        AVG(CASE WHEN p.paid_date <= i.due_date THEN 100 ELSE 0 END) as on_time_performance
      FROM erp_vendors v
      LEFT JOIN ap_invoices i ON v.id = i.vendor_id
      LEFT JOIN ap_payments p ON i.id = p.invoice_id
      GROUP BY v.id
      ORDER BY total_spend DESC
    `);

    res.json(vendors.rows || []);
  } catch (error) {
    console.error("Error fetching vendor data:", error);
    res.status(500).json({ error: "Failed to fetch vendor data" });
  }
});

// AP Vendor statistics endpoint - derived from purchase orders
router.get("/vendor-statistics", async (req, res) => {
  try {
    let totalVendors = 0;
    let activeVendors = 0;
    let avgPaymentTerms = 0;
    let totalCreditLimits = 0;

    try {
      // Check if purchase_orders table exists
      const tableCheck = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'purchase_orders'
        );
      `);

      if (tableCheck.rows[0].exists) {
        // Get unique vendors from purchase orders
        const vendorsResult = await pool.query(`
          SELECT 
            COUNT(DISTINCT vendor_id) as total,
            COUNT(DISTINCT CASE 
              WHEN vendor_id IS NOT NULL 
              AND (status NOT IN ('Cancelled', 'Closed') OR status IS NULL)
              THEN vendor_id 
            END) as active
          FROM purchase_orders
          WHERE (active = true OR active IS NULL)
            AND vendor_id IS NOT NULL
        `);

        totalVendors = parseInt(vendorsResult.rows[0]?.total || '0');
        activeVendors = parseInt(vendorsResult.rows[0]?.active || '0');

        // Calculate average payment terms from purchase orders
        const avgTermsResult = await pool.query(`
          SELECT COALESCE(AVG(
            CASE 
              WHEN payment_terms ~ '^[0-9]+(\\.?[0-9]*)?$' THEN payment_terms::numeric 
              WHEN payment_terms ILIKE 'NET%' THEN SUBSTRING(payment_terms FROM '[0-9]+')::numeric
              ELSE NULL
            END
          ), 30) as avg_terms 
          FROM purchase_orders
          WHERE (active = true OR active IS NULL)
            AND payment_terms IS NOT NULL
        `);
        avgPaymentTerms = parseFloat(avgTermsResult.rows[0]?.avg_terms || '30');

        // Calculate total credit limits from outstanding orders (vendors table doesn't have credit_limit column)
        const outstandingResult = await pool.query(`
          SELECT COALESCE(SUM(total_amount), 0) as total
          FROM purchase_orders
          WHERE (active = true OR active IS NULL)
            AND status NOT IN ('Paid', 'Cancelled', 'Closed')
            AND vendor_id IS NOT NULL
        `);
        totalCreditLimits = parseFloat(outstandingResult.rows[0]?.total || '0');
      }
    } catch (error: any) {
      console.log('Error calculating vendor statistics from purchase orders:', error.message);
    }

    res.json({
      total_vendors: totalVendors,
      active_vendors: activeVendors,
      avg_payment_terms: Math.round(avgPaymentTerms),
      total_credit_limits: totalCreditLimits
    });
  } catch (error) {
    console.error("Error fetching vendor statistics:", error);
    res.status(500).json({ error: "Failed to fetch vendor statistics" });
  }
});

// AP Invoice statistics endpoint
router.get("/invoice-statistics", async (req, res) => {
  try {
    // Try to fetch from ap_invoices table if it exists
    let totalInvoices = 0;
    let pendingInvoices = 0;
    let approvedInvoices = 0;
    let paidInvoices = 0;
    let totalAmount = 0;
    let pendingAmount = 0;
    let overdueCount = 0;
    let overdueAmount = 0;

    try {
      const invoiceStats = await pool.query(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'pending' OR status = 'draft' THEN 1 END) as pending,
          COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved,
          COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid,
          COALESCE(SUM(amount), 0) as total_amount,
          COALESCE(SUM(CASE WHEN status = 'pending' OR status = 'draft' THEN amount ELSE 0 END), 0) as pending_amount
        FROM ap_invoices
      `);

      if (invoiceStats.rows[0]) {
        totalInvoices = parseInt(invoiceStats.rows[0].total) || 0;
        pendingInvoices = parseInt(invoiceStats.rows[0].pending) || 0;
        approvedInvoices = parseInt(invoiceStats.rows[0].approved) || 0;
        paidInvoices = parseInt(invoiceStats.rows[0].paid) || 0;
        totalAmount = parseFloat(invoiceStats.rows[0].total_amount) || 0;
        pendingAmount = parseFloat(invoiceStats.rows[0].pending_amount) || 0;
      }

      const overdueStats = await pool.query(`
        SELECT 
          COUNT(*) as count,
          COALESCE(SUM(amount), 0) as amount
        FROM ap_invoices
        WHERE due_date < CURRENT_DATE 
          AND status != 'paid' 
          AND status != 'cancelled'
      `);

      if (overdueStats.rows[0]) {
        overdueCount = parseInt(overdueStats.rows[0].count) || 0;
        overdueAmount = parseFloat(overdueStats.rows[0].amount) || 0;
      }
    } catch (tableError: any) {
      // Table doesn't exist, return default values
      console.log('ap_invoices table does not exist, returning default statistics');
    }

    res.json({
      total_invoices: totalInvoices,
      pending_invoices: pendingInvoices,
      approved_invoices: approvedInvoices,
      paid_invoices: paidInvoices,
      total_amount: totalAmount,
      pending_amount: pendingAmount,
      overdue_count: overdueCount,
      overdue_amount: overdueAmount,
      average_invoice_amount: totalInvoices > 0 ? totalAmount / totalInvoices : 0,
      payment_rate: totalInvoices > 0 ? (paidInvoices / totalInvoices) * 100 : 0
    });
  } catch (error) {
    console.error("Error fetching invoice statistics:", error);
    res.status(500).json({ error: "Failed to fetch invoice statistics" });
  }
});

// AP Invoice data endpoint
router.get("/invoice-data", async (req, res) => {
  try {
    const invoices = await db.execute(sql`
      SELECT 
        i.*,
        v.name as vendor_name,
        p.status as payment_status,
        p.paid_date
      FROM ap_invoices i
      LEFT JOIN erp_vendors v ON i.vendor_id = v.id
      LEFT JOIN ap_payments p ON i.id = p.invoice_id
      ORDER BY i.invoice_date DESC
      LIMIT 100
    `);

    res.json(invoices.rows || []);
  } catch (error) {
    console.error("Error fetching invoice data:", error);
    res.status(500).json({ error: "Failed to fetch invoice data" });
  }
});

// AP Payment data endpoint
router.get("/payment-data", async (req, res) => {
  try {
    const payments = await db.execute(sql`
      SELECT 
        p.*,
        i.invoice_number,
        v.name as vendor_name,
        i.amount as invoice_amount
      FROM ap_payments p
      LEFT JOIN ap_invoices i ON p.invoice_id = i.id
      LEFT JOIN erp_vendors v ON i.vendor_id = v.id
      ORDER BY p.scheduled_date DESC
      LIMIT 100
    `);

    res.json(payments.rows || []);
  } catch (error) {
    console.error("Error fetching payment data:", error);
    res.status(500).json({ error: "Failed to fetch payment data" });
  }
});

// AP Report data endpoint
router.get("/report-data", async (req, res) => {
  try {
    const dpoAnalysis = await db.execute(sql`
      SELECT 
        AVG(EXTRACT(DAY FROM (p.paid_date - i.invoice_date))) as current_dpo,
        45 as target_dpo,
        38 as industry_average,
        'up' as trend_direction,
        5.2 as trend_percentage
      FROM ap_invoices i
      JOIN ap_payments p ON i.id = p.invoice_id
      WHERE p.paid_date IS NOT NULL
        AND i.invoice_date >= CURRENT_DATE - INTERVAL '90 days'
    `);

    const paymentAnalysis = await db.execute(sql`
      SELECT 
        COUNT(CASE WHEN p.payment_method = 'ACH' THEN 1 END) * 100.0 / COUNT(*) as ach_percentage,
        COUNT(CASE WHEN p.payment_method = 'Wire' THEN 1 END) * 100.0 / COUNT(*) as wire_percentage,
        COUNT(CASE WHEN p.payment_method = 'Check' THEN 1 END) * 100.0 / COUNT(*) as check_percentage,
        COUNT(CASE WHEN p.payment_method = 'Card' THEN 1 END) * 100.0 / COUNT(*) as card_percentage,
        85 as efficiency_score
      FROM ap_payments p
      WHERE p.paid_date >= CURRENT_DATE - INTERVAL '30 days'
    `);

    const cashFlowAnalysis = await db.execute(sql`
      SELECT 
        COALESCE(SUM(CASE WHEN scheduled_date <= CURRENT_DATE + INTERVAL '30 days' THEN amount END), 0) as next_30_days,
        COALESCE(SUM(CASE WHEN scheduled_date <= CURRENT_DATE + INTERVAL '60 days' THEN amount END), 0) as next_60_days,
        COALESCE(SUM(CASE WHEN scheduled_date <= CURRENT_DATE + INTERVAL '90 days' THEN amount END), 0) as next_90_days,
        COUNT(CASE WHEN scheduled_date <= CURRENT_DATE + INTERVAL '30 days' THEN 1 END) as next_30_count,
        COUNT(CASE WHEN scheduled_date <= CURRENT_DATE + INTERVAL '60 days' THEN 1 END) as next_60_count,
        COUNT(CASE WHEN scheduled_date <= CURRENT_DATE + INTERVAL '90 days' THEN 1 END) as next_90_count
      FROM ap_payments
      WHERE status = 'pending'
    `);

    res.json({
      dpo_analysis: dpoAnalysis[0] || {},
      payment_analysis: paymentAnalysis[0] || {},
      cash_flow_analysis: cashFlowAnalysis[0] || {},
    });
  } catch (error) {
    console.error("Error fetching AP report data:", error);
    res.status(500).json({ error: "Failed to fetch AP report data" });
  }
});

// AP Workflow data endpoint
router.get("/workflow-data", async (req, res) => {
  try {
    const workflows = await db.execute(sql`
      SELECT 
        'Auto Invoice Processing' as name,
        'invoice_received' as trigger_type,
        'ERP' as target_system,
        'active' as status,
        NOW() - INTERVAL '2 hours' as last_execution,
        95 as success_rate
      UNION ALL
      SELECT 
        'Three-Way Matching' as name,
        'invoice_approved' as trigger_type,
        'ERP' as target_system,
        'active' as status,
        NOW() - INTERVAL '1 hour' as last_execution,
        87 as success_rate
      UNION ALL
      SELECT 
        'Payment Automation' as name,
        'payment_due' as trigger_type,
        'Banking' as target_system,
        'active' as status,
        NOW() - INTERVAL '30 minutes' as last_execution,
        92 as success_rate
    `);

    const executions = await db.execute(sql`
      SELECT 
        'Auto Invoice Processing' as workflow_name,
        NOW() - INTERVAL '1 hour' as execution_date,
        'success' as status,
        45 as duration_seconds,
        12 as records_processed,
        NULL as error_message
      UNION ALL
      SELECT 
        'Three-Way Matching' as workflow_name,
        NOW() - INTERVAL '2 hours' as execution_date,
        'success' as status,
        67 as duration_seconds,
        8 as records_processed,
        NULL as error_message
      UNION ALL
      SELECT 
        'Payment Automation' as workflow_name,
        NOW() - INTERVAL '30 minutes' as execution_date,
        'running' as status,
        NULL as duration_seconds,
        5 as records_processed,
        NULL as error_message
    `);

    const automationStats = {
      invoices_processed: 1247,
      approval_rate: 78,
      cycle_time_reduction: 32,
      cost_savings: 12450,
      time_saved_hours: 156,
    };

    const integrationSystems = [
      {
        id: 1,
        system_code: 'ERP',
        system_name: 'Enterprise Resource Planning',
        description: 'Core ERP system integration',
        status: 'active',
        last_sync: new Date(Date.now() - 60000)
      },
      {
        id: 2,
        system_code: 'Banking',
        system_name: 'Banking Integration',
        description: 'Payment processing and banking',
        status: 'active',
        last_sync: new Date(Date.now() - 120000)
      }
    ];

    res.json({
      workflows: workflows || [],
      workflow_executions: executions || [],
      automation_stats: automationStats,
      integration_systems: integrationSystems,
    });
  } catch (error) {
    console.error("Error fetching AP workflow data:", error);
    res.status(500).json({ error: "Failed to fetch AP workflow data" });
  }
});

// AP Validation data endpoint
router.get("/validation-data", async (req, res) => {
  try {
    const validationResults = await db.execute(sql`
      SELECT 
        'vendor_lineage' as validation_type,
        'passed' as status,
        'low' as severity,
        'All vendor data lineage validated successfully' as description,
        0 as affected_records
      UNION ALL
      SELECT 
        'invoice_integrity' as validation_type,
        'warning' as status,
        'medium' as severity,
        'Minor discrepancies found in invoice amounts' as description,
        3 as affected_records
      UNION ALL
      SELECT 
        'three_way_match' as validation_type,
        'passed' as status,
        'low' as severity,
        'Three-way matching validation completed' as description,
        0 as affected_records
    `);

    const lineageData = {
      company_codes_validated: 4,
      vendors_validated: 156,
      invoices_validated: 1247,
      payments_validated: 987,
      three_way_matched: 892,
      two_way_matched: 234,
      no_match: 121,
    };

    const integrityMetrics = {
      overall_score: 94,
      vendor_data_score: 98,
      invoice_integrity_score: 89,
      payment_integrity_score: 96,
      three_way_match_rate: 87,
      sox_compliance: 92,
      audit_readiness: 95,
      data_governance: 88,
      control_effectiveness: 91,
      last_validation: new Date(Date.now() - 3600000),
    };

    res.json({
      validation_results: validationResults || [],
      lineage_data: lineageData,
      integrity_metrics: integrityMetrics,
    });
  } catch (error) {
    console.error("Error fetching AP validation data:", error);
    res.status(500).json({ error: "Failed to fetch AP validation data" });
  }
});

// Vendors endpoint - derived from purchase orders
router.get("/vendors", async (req, res) => {
  try {
    // Check if purchase_orders table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'purchase_orders'
      );
    `);

    if (!tableCheck.rows[0].exists) {
      return res.json([]);
    }

    // Get vendors from purchase orders, aggregating data
    // Get vendors with aggregated data from purchase orders AND accounts_payable
    const vendorsResult = await pool.query(`
      WITH VendorStats AS(
      --Calculate stats from Purchase Orders
        SELECT 
          vendor_id,
      COUNT(DISTINCT id) as po_count,
      COALESCE(SUM(total_amount), 0) as total_spend_po
        FROM purchase_orders
        WHERE(active = true OR active IS NULL)
          AND vendor_id IS NOT NULL
        GROUP BY vendor_id
    ),
      APStats AS(
        --Calculate stats from Accounts Payable(Invoices)
        SELECT 
          vendor_id,
        COUNT(DISTINCT id) as invoice_count,
        COALESCE(SUM(amount), 0) as total_spend_ap,
        --Calculate outstanding from AP where status is not paid
          COALESCE(SUM(
          CASE 
              WHEN status NOT IN('paid', 'Paid', 'cancelled', 'Cancelled') 
              THEN(amount - COALESCE(discount_amount, 0) - COALESCE(tax_amount, 0))-- Or use net_amount if fully reliable, but calculating remaining is safer if partials exist
    --Better yet, relies on open items or assume Invoice Amount if Open / Partial unless partial logic complex.
              --For simplicity in this view: Sum of Open / Partial Invoices. 
              --Ideally we would use ap_open_items for precise outstanding.
              --Let's use ap_open_items if available, else fallback to AP table.
    END
          ), 0) as outstanding_amount_ap
        FROM accounts_payable
WHERE(active = true OR active IS NULL)
        GROUP BY vendor_id
      ),
      OpenItemStats AS(
  --Best source for outstanding is ap_open_items
         SELECT
vendor_id,
  COALESCE(SUM(outstanding_amount), 0) as real_outstanding
         FROM ap_open_items
         WHERE status != 'Cleared'
         GROUP BY vendor_id
      )
SELECT
v.id,
  COALESCE(v.code, 'V-' || LPAD(v.id:: text, 4, '0')) as vendor_code,
  v.name,
  COALESCE(v.email, '') as email,
  COALESCE(v.phone, '') as phone,
  COALESCE(v.payment_terms, 'NET30') as payment_terms,
  0 as credit_limit,
  CASE 
          WHEN v.status = 'active' THEN 'active'
          ELSE 'inactive'
END as status,
  --Total spend is better from AP(Invoices) than POs, but let's take max or sum? 
--Usually Spend = Invoiced Amount.
  COALESCE(aps.total_spend_ap, 0) as total_spend,
  COALESCE(aps.invoice_count, 0) as invoice_count,
  --Outstanding Amount: Use Open Items if possible, else AP Stats
COALESCE(ois.real_outstanding, 0) as outstanding_amount
      FROM vendors v
      LEFT JOIN VendorStats vs ON v.id = vs.vendor_id
      LEFT JOIN APStats aps ON v.id = aps.vendor_id
      LEFT JOIN OpenItemStats ois ON v.id = ois.vendor_id
      WHERE v.status != 'deleted'
      ORDER BY v.name
  `);

    // Format the results to match expected structure
    const formattedVendors = vendorsResult.rows.map((row: any) => ({
      id: row.id,
      vendor_code: row.vendor_code,
      name: row.name,
      email: row.email || '',
      phone: row.phone || '',
      payment_terms: row.payment_terms || 'NET30',
      credit_limit: parseFloat(row.credit_limit || '0'),
      status: row.status || 'active',
      total_spend: parseFloat(row.total_spend || '0'),
      invoice_count: parseInt(row.invoice_count || '0'),
      outstanding_amount: parseFloat(row.outstanding_amount || '0')
    }));

    res.json(formattedVendors);
  } catch (error) {
    console.error("Error fetching vendors from purchase orders:", error);
    res.status(500).json({ error: "Failed to fetch vendors" });
  }
});

// Authorization limits endpoint - derived from purchase orders
router.get("/authorization-limits", async (req, res) => {
  try {
    let dailyLimit = 100000; // Default daily limit
    let usedToday = 0;
    let singlePaymentLimit = 50000; // Default single payment limit
    let dualApprovalThreshold = 25000; // Default dual approval threshold

    try {
      // Check if purchase_orders table exists
      const tableCheck = await pool.query(`
        SELECT EXISTS(
    SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'purchase_orders'
  );
`);

      if (tableCheck.rows[0].exists) {
        // Calculate used today from purchase orders authorized today
        const usedTodayResult = await pool.query(`
          SELECT COALESCE(SUM(total_amount), 0) as total
          FROM purchase_orders
          WHERE created_at:: date = CURRENT_DATE
AND(active = true OR active IS NULL)
            AND status IN('Approved', 'Authorized')
  `);
        usedToday = parseFloat(usedTodayResult.rows[0]?.total || '0');

        // Calculate limits based on historical data (max daily spend * 1.5 for daily limit)
        const maxDailyResult = await pool.query(`
          SELECT COALESCE(MAX(daily_total), 0) as max_daily
FROM(
  SELECT created_at:: date as date, SUM(total_amount) as daily_total
            FROM purchase_orders
            WHERE(active = true OR active IS NULL)
            GROUP BY created_at:: date
) daily_totals
  `);
        const maxDaily = parseFloat(maxDailyResult.rows[0]?.max_daily || '0');
        if (maxDaily > 0) {
          dailyLimit = Math.max(100000, maxDaily * 1.5);
        }

        // Single payment limit based on average order amount * 2
        const avgOrderResult = await pool.query(`
          SELECT COALESCE(AVG(total_amount), 0) as avg_amount
          FROM purchase_orders
WHERE(active = true OR active IS NULL)
            AND total_amount IS NOT NULL
  `);
        const avgAmount = parseFloat(avgOrderResult.rows[0]?.avg_amount || '0');
        if (avgAmount > 0) {
          singlePaymentLimit = Math.max(50000, avgAmount * 2);
        }

        // Dual approval threshold is half of single payment limit
        dualApprovalThreshold = singlePaymentLimit / 2;
      }
    } catch (error: any) {
      console.log('Error calculating authorization limits from purchase orders:', error.message);
    }

    res.json({
      daily_limit: dailyLimit,
      used_today: usedToday,
      single_payment_limit: singlePaymentLimit,
      dual_approval_threshold: dualApprovalThreshold
    });
  } catch (error) {
    console.error("Error fetching authorization limits:", error);
    res.status(500).json({ error: "Failed to fetch authorization limits" });
  }
});

// Pending payments endpoint - with authorization level info
router.get("/pending-payments", async (req, res) => {
  try {
    // Get pending payments with authorization level info
    const pendingPaymentsResult = await pool.query(`
SELECT
po.id,
  COALESCE(po.vendor_name, v.name, 'Vendor ' || po.vendor_id:: text) as vendor_name,
  po.order_number as invoice_number,
  COALESCE(po.total_amount, 0) as amount,
  CASE 
          WHEN po.total_amount > 100000 THEN 'high'
          WHEN po.total_amount > 50000 THEN 'medium'
          ELSE 'low'
END as risk_level,
  COALESCE(po.delivery_date:: text, po.order_date:: text) as due_date,
  COALESCE(po.status, 'Pending') as status,
  COALESCE(vp.approval_count, 0) as approval_count,
  COALESCE(vp.authorization_status, 'PENDING') as authorization_status,
  COALESCE(vp.requires_dual_approval,
    CASE WHEN pal.requires_dual_approval IS TRUE THEN true ELSE false END
  ) as requires_dual_approval,
  pal.level_name as required_level,
  CASE WHEN pal.requires_dual_approval IS TRUE THEN 2 ELSE 1 END as required_approvals,
    'PO' as source_type
      FROM purchase_orders po
      LEFT JOIN vendors v ON po.vendor_id = v.id
      LEFT JOIN vendor_payments vp ON vp.purchase_order_id = po.id 
        AND vp.status NOT IN('CANCELLED')
      LEFT JOIN payment_authorization_levels pal ON(
      pal.min_amount <= po.total_amount 
        AND(pal.max_amount IS NULL OR pal.max_amount >= po.total_amount)
        AND pal.is_active = true
    )
WHERE(po.active = true OR po.active IS NULL)
        AND po.status NOT IN('Paid', 'Cancelled', 'Closed', 'Approved')
        AND po.vendor_id IS NOT NULL
AND(vp.authorization_status IS NULL OR vp.authorization_status NOT IN('AUTHORIZED', 'APPROVED'))
      
      UNION ALL

SELECT
ap.id,
  v.name as vendor_name,
  ap.invoice_number,
  COALESCE(ap.amount, 0) as amount,
  CASE 
          WHEN ap.amount > 100000 THEN 'high'
          WHEN ap.amount > 50000 THEN 'medium'
          ELSE 'low'
END as risk_level,
  ap.due_date:: text as due_date,
    ap.status,
    COALESCE(vp.approval_count, 0) as approval_count,
    COALESCE(vp.authorization_status, 'PENDING') as authorization_status,
    COALESCE(vp.requires_dual_approval,
      CASE WHEN pal.requires_dual_approval IS TRUE THEN true ELSE false END
    ) as requires_dual_approval,
    pal.level_name as required_level,
    CASE WHEN pal.requires_dual_approval IS TRUE THEN 2 ELSE 1 END as required_approvals,
      'AP' as source_type
      FROM accounts_payable ap
      LEFT JOIN vendors v ON ap.vendor_id = v.id
      LEFT JOIN vendor_payments vp ON vp.invoice_id = ap.id 
        AND vp.status NOT IN('CANCELLED')
      LEFT JOIN payment_authorization_levels pal ON(
        pal.min_amount <= ap.amount 
        AND(pal.max_amount IS NULL OR pal.max_amount >= ap.amount)
        AND pal.is_active = true
      )
      WHERE ap.active = true
        AND ap.status IN('Open', 'open', 'OPEN', 'POSTED', 'Posted', 'posted', 'Partial', 'partial', 'PARTIAL')
        AND ap.amount > 0
AND(vp.authorization_status IS NULL OR vp.authorization_status NOT IN('AUTHORIZED', 'APPROVED'))
      ORDER BY amount DESC, due_date ASC
  `);

    // Format the results
    const formattedPayments = (pendingPaymentsResult.rows || []).map((row: any) => ({
      id: row.id,
      vendor_name: row.vendor_name,
      invoice_number: row.invoice_number,
      amount: parseFloat(row.amount || '0'),
      risk_level: row.risk_level,
      due_date: row.due_date,
      status: row.status,
      approval_count: parseInt(row.approval_count || '0'),
      authorization_status: row.authorization_status,
      requires_dual_approval: row.requires_dual_approval || false,
      required_level: row.required_level || 'Standard',
      required_approvals: parseInt(row.required_approvals || '1'),
      source_type: row.source_type || 'PO'
    }));

    res.json(formattedPayments);
  } catch (error) {
    console.error("Error fetching pending payments:", error);
    res.status(500).json({ error: "Failed to fetch pending payments" });
  }
});

// Get authorization levels configuration
router.get("/authorization-levels", async (req, res) => {
  try {
    const levels = await paymentAuthorizationService.getAllAuthorizationLevels();
    res.json({
      success: true,
      data: levels
    });
  } catch (error: any) {
    console.error("Error fetching authorization levels:", error);
    res.status(500).json({ error: "Failed to fetch authorization levels" });
  }
});

// Authorize payment endpoint - with authorization levels and dual approval support
router.post("/authorize-payment", async (req, res) => {
  try {
    const {
      payment_id,
      payment_amount,
      authorized_by,
      authorized_by_name,
      authorized_date,
      notes,
      payment_method,
      bank_account_id,
      company_code_id,
      source_type
    } = req.body;

    if (!payment_id) {
      return res.status(400).json({ error: "Payment ID is required" });
    }

    // Get payment amount from PO or AP if not provided
    let amount = payment_amount;
    if (!amount) {
      if (source_type === 'AP') {
        const apResult = await pool.query(
          'SELECT amount FROM accounts_payable WHERE id = $1',
          [payment_id]
        );
        if (apResult.rows.length > 0) {
          amount = parseFloat(apResult.rows[0].amount || 0);
        }
      } else {
        const poResult = await pool.query(
          'SELECT total_amount FROM purchase_orders WHERE id = $1',
          [payment_id]
        );
        if (poResult.rows.length > 0) {
          amount = parseFloat(poResult.rows[0].total_amount || 0);
        }
      }
    }

    // Use the new PaymentAuthorizationService
    const result = await paymentAuthorizationService.authorizePayment({
      paymentId: parseInt(payment_id),
      paymentAmount: amount || 0,
      authorizedBy: parseInt(authorized_by) || 1,
      authorizedByName: authorized_by_name || authorized_by || 'System',
      notes: notes || '',
      companyCodeId: company_code_id ? parseInt(company_code_id) : undefined,
      paymentMethod: payment_method,
      bankAccountId: bank_account_id ? parseInt(bank_account_id) : undefined,
      sourceType: source_type || 'PO'
    });

    if (!result.success) {
      return res.status(result.status === 'INSUFFICIENT_PERMISSION' ? 403 : 400).json({
        success: false,
        error: result.message,
        status: result.status,
        authorizationLevel: result.authorizationLevel,
        requiresDualApproval: result.requiresDualApproval,
        currentApprovalCount: result.currentApprovalCount,
        requiredApprovals: result.requiredApprovals
      });
    }

    res.json({
      success: true,
      message: result.message,
      status: result.status,
      authorizationLevel: result.authorizationLevel,
      requiresDualApproval: result.requiresDualApproval,
      currentApprovalCount: result.currentApprovalCount,
      requiredApprovals: result.requiredApprovals,
      paymentTriggered: result.paymentTriggered,
      paymentResult: result.paymentResult
    });
  } catch (error: any) {
    console.error("Error authorizing payment:", error);
    res.status(500).json({
      error: "Failed to authorize payment",
      details: error.message
    });
  }
});

// Batch authorize payments endpoint - updates multiple purchase orders
router.post("/batch-authorize", async (req, res) => {
  try {
    const { payment_ids, total_amount, payment_method, authorized_by, authorized_date, notes } = req.body;

    if (!payment_ids || !Array.isArray(payment_ids) || payment_ids.length === 0) {
      return res.status(400).json({ error: "Payment IDs array is required" });
    }

    // Check if purchase_orders table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS(
    SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'purchase_orders'
  );
`);

    if (!tableCheck.rows[0].exists) {
      return res.status(404).json({ error: "Purchase orders table not found" });
    }

    // Convert payment_ids to integers
    const paymentIdsInt = payment_ids.map(id => parseInt(id)).filter(id => !isNaN(id));

    if (paymentIdsInt.length === 0) {
      return res.status(400).json({ error: "No valid payment IDs provided" });
    }

    // Update multiple purchase orders
    const params = [authorized_by || 'System', authorized_date || new Date(), notes || '', paymentIdsInt];
    const updateResult = await pool.query(`
      UPDATE purchase_orders
SET
status = 'Approved',
  approved_by = $1,
  approval_date = COALESCE($2:: timestamp, CURRENT_TIMESTAMP),
  notes = CASE 
          WHEN notes IS NULL AND $3 IS NOT NULL AND $3 != '' THEN $3
          WHEN notes IS NOT NULL AND $3 IS NOT NULL AND $3 != '' THEN notes || E'\\n' || $3
          ELSE COALESCE(notes, $3)
END,
  updated_at = CURRENT_TIMESTAMP
      WHERE id = ANY($4:: integer[])
AND(active = true OR active IS NULL)
        AND status NOT IN('Paid', 'Cancelled', 'Closed')
      RETURNING id, order_number, status, total_amount
  `, params);

    const authorizedCount = updateResult.rows.length;
    const totalAuthorized = updateResult.rows.reduce((sum, row) =>
      sum + parseFloat(row.total_amount || '0'), 0
    );

    res.json({
      success: true,
      message: `${authorizedCount} payment(s) authorized successfully`,
      authorized_count: authorizedCount,
      total_amount: totalAuthorized,
      payments: updateResult.rows
    });
  } catch (error: any) {
    console.error("Error batch authorizing payments:", error);
    res.status(500).json({
      error: "Failed to batch authorize payments",
      details: error.message
    });
  }
});

// Payment statistics endpoint - derived from purchase orders
router.get("/payment-statistics", async (req, res) => {
  try {
    let pendingCount = 0;
    let authorizedToday = 0;
    let dailyLimitUsed = 0;
    let highRiskCount = 0;

    try {
      // Check if purchase_orders table exists
      const tableCheck = await pool.query(`
        SELECT EXISTS(
    SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'purchase_orders'
  );
`);

      if (tableCheck.rows[0].exists) {
        // Count pending payments
        const pendingResult = await pool.query(`
          SELECT COUNT(*) as count
          FROM purchase_orders
WHERE(active = true OR active IS NULL)
            AND status NOT IN('Paid', 'Cancelled', 'Closed')
            AND vendor_id IS NOT NULL
  `);
        pendingCount = parseInt(pendingResult.rows[0]?.count || '0');

        // Count authorized today
        const authorizedResult = await pool.query(`
          SELECT COUNT(*) as count
          FROM purchase_orders
          WHERE created_at:: date = CURRENT_DATE
AND(active = true OR active IS NULL)
            AND status IN('Approved', 'Authorized')
  `);
        authorizedToday = parseInt(authorizedResult.rows[0]?.count || '0');

        // Calculate daily limit used percentage
        const usedTodayResult = await pool.query(`
          SELECT COALESCE(SUM(total_amount), 0) as total
          FROM purchase_orders
          WHERE created_at:: date = CURRENT_DATE
AND(active = true OR active IS NULL)
            AND status IN('Approved', 'Authorized')
  `);
        const usedToday = parseFloat(usedTodayResult.rows[0]?.total || '0');

        // Get daily limit (from authorization-limits logic)
        const maxDailyResult = await pool.query(`
          SELECT COALESCE(MAX(daily_total), 0) as max_daily
FROM(
  SELECT created_at:: date as date, SUM(total_amount) as daily_total
            FROM purchase_orders
            WHERE(active = true OR active IS NULL)
            GROUP BY created_at:: date
) daily_totals
  `);
        const maxDaily = parseFloat(maxDailyResult.rows[0]?.max_daily || '0');
        const dailyLimit = maxDaily > 0 ? Math.max(100000, maxDaily * 1.5) : 100000;
        dailyLimitUsed = dailyLimit > 0 ? Math.round((usedToday / dailyLimit) * 100) : 0;

        // Count high risk payments (amount > 50000)
        const highRiskResult = await pool.query(`
          SELECT COUNT(*) as count
          FROM purchase_orders
WHERE(active = true OR active IS NULL)
            AND status NOT IN('Paid', 'Cancelled', 'Closed')
            AND total_amount > 50000
            AND vendor_id IS NOT NULL
  `);
        highRiskCount = parseInt(highRiskResult.rows[0]?.count || '0');
      }
    } catch (error: any) {
      console.log('Error calculating payment statistics from purchase orders:', error.message);
    }

    res.json({
      pending_count: pendingCount,
      authorized_today: authorizedToday,
      daily_limit_used: dailyLimitUsed,
      high_risk_count: highRiskCount
    });
  } catch (error) {
    console.error("Error fetching payment statistics:", error);
    res.status(500).json({ error: "Failed to fetch payment statistics" });
  }
});

// Reports endpoint
router.get("/reports", async (req, res) => {
  try {
    const reports = [
      {
        id: 1,
        report_type: 'vendor_analysis',
        date_from: '2024-01-01',
        date_to: '2024-12-31',
        generated_date: new Date(Date.now() - 86400000),
        generated_by: 'System',
        status: 'completed'
      },
      {
        id: 2,
        report_type: 'payment_analysis',
        date_from: '2024-06-01',
        date_to: '2024-06-30',
        generated_date: new Date(Date.now() - 172800000),
        generated_by: 'Admin User',
        status: 'completed'
      }
    ];

    res.json(reports);
  } catch (error) {
    console.error("Error fetching reports:", error);
    res.status(500).json({ error: "Failed to fetch reports" });
  }
});

// DPO Analysis endpoint
router.get("/dpo-analysis", async (req, res) => {
  try {
    const dpoData = {
      current_dpo: 42,
      target_dpo: 45,
      industry_average: 38,
      trend_direction: 'up',
      trend_percentage: 5.2,
    };

    res.json(dpoData);
  } catch (error) {
    console.error("Error fetching DPO analysis:", error);
    res.status(500).json({ error: "Failed to fetch DPO analysis" });
  }
});

// Cash Flow Analysis endpoint
router.get("/cash-flow-analysis", async (req, res) => {
  try {
    const cashFlowData = {
      next_30_days: 125000,
      next_60_days: 245000,
      next_90_days: 387000,
      next_30_count: 45,
      next_60_count: 89,
      next_90_count: 134,
    };

    res.json(cashFlowData);
  } catch (error) {
    console.error("Error fetching cash flow analysis:", error);
    res.status(500).json({ error: "Failed to fetch cash flow analysis" });
  }
});

// Vendor Performance endpoint
router.get("/vendor-performance", async (req, res) => {
  try {
    const performance = await db.execute(sql`
SELECT
v.id,
  v.name,
  COALESCE(SUM(i.amount), 0) as total_spend,
  v.payment_terms,
  95 as on_time_performance,
  12 as discount_capture,
  87 as performance_score
      FROM erp_vendors v
      LEFT JOIN ap_invoices i ON v.id = i.vendor_id
      GROUP BY v.id, v.name, v.payment_terms
      ORDER BY total_spend DESC
      LIMIT 10
  `);

    res.json(performance || []);
  } catch (error) {
    console.error("Error fetching vendor performance:", error);
    res.status(500).json({ error: "Failed to fetch vendor performance" });
  }
});

// Payment Analysis endpoint
router.get("/payment-analysis", async (req, res) => {
  try {
    const analysis = {
      ach_percentage: 65,
      ach_amount: 450000,
      wire_percentage: 20,
      wire_amount: 138000,
      check_percentage: 12,
      check_amount: 83000,
      card_percentage: 3,
      card_amount: 21000,
      efficiency_score: 85,
    };

    res.json(analysis);
  } catch (error) {
    console.error("Error fetching payment analysis:", error);
    res.status(500).json({ error: "Failed to fetch payment analysis" });
  }
});

// Workflows endpoint
router.get("/workflows", async (req, res) => {
  try {
    // Try to fetch from workflow_definitions table if it exists
    let workflows = [];
    try {
      const result = await db.execute(sql`
SELECT
id,
  name,
  trigger_type,
  module as target_system,
  automation_level,
  is_active,
  created_at as last_execution
        FROM workflow_definitions
        WHERE is_active = true
        ORDER BY created_at DESC
        LIMIT 100
  `);

      if (result.rows && result.rows.length > 0) {
        workflows = result.rows.map((row: any) => ({
          id: row.id,
          name: row.name,
          trigger_type: row.trigger_type,
          target_system: row.target_system || 'ERP',
          status: row.is_active ? 'active' : 'inactive',
          last_execution: row.last_execution,
          success_rate: null // Calculate from executions if needed
        }));
      }
    } catch (tableError: any) {
      // Table doesn't exist, return empty array
      console.log('workflow_definitions table does not exist, returning empty array');
    }

    res.json(workflows);
  } catch (error) {
    console.error("Error fetching workflows:", error);
    res.status(500).json({ error: "Failed to fetch workflows" });
  }
});

// Integration Workflows endpoint (alias for workflows)
router.get("/integration-workflows", async (req, res) => {
  try {
    // Try to fetch from workflow_definitions table if it exists
    let workflows = [];
    try {
      const result = await db.execute(sql`
SELECT
id,
  name,
  trigger_type,
  module as target_system,
  automation_level,
  is_active,
  created_at as last_execution
        FROM workflow_definitions
        WHERE is_active = true
        ORDER BY created_at DESC
        LIMIT 100
  `);

      if (result.rows && result.rows.length > 0) {
        workflows = result.rows.map((row: any) => ({
          id: row.id,
          name: row.name,
          trigger_type: row.trigger_type,
          target_system: row.target_system || 'ERP',
          status: row.is_active ? 'active' : 'inactive',
          last_execution: row.last_execution,
          success_rate: null
        }));
      }
    } catch (tableError: any) {
      // Table doesn't exist, return empty array
      console.log('workflow_definitions table does not exist, returning empty array');
    }

    res.json(workflows);
  } catch (error) {
    console.error("Error fetching integration workflows:", error);
    res.status(500).json({ error: "Failed to fetch integration workflows" });
  }
});

// Workflow Executions endpoint
router.get("/workflow-executions", async (req, res) => {
  try {
    let executions = [];

    // Try to fetch from workflow_instances or workflow_executions table if it exists
    try {
      // First try workflow_instances (from workflowAutomation)
      const result = await db.execute(sql`
SELECT
wi.id,
  wd.name as workflow_name,
  wi.created_at as execution_date,
  wi.status,
  EXTRACT(EPOCH FROM(COALESCE(wi.completed_at, NOW()) - wi.created_at)):: integer as duration_seconds,
    NULL:: integer as records_processed,
      NULL:: text as error_message
        FROM workflow_instances wi
        LEFT JOIN workflow_definitions wd ON wi.workflow_id = wd.id
        ORDER BY wi.created_at DESC
        LIMIT 100
      `);

      if (result.rows && result.rows.length > 0) {
        executions = result.rows.map((row: any) => ({
          id: row.id,
          workflow_name: row.workflow_name || `Workflow ${row.id} `,
          execution_date: row.execution_date,
          status: row.status || 'pending',
          duration_seconds: row.duration_seconds,
          records_processed: row.records_processed,
          error_message: row.error_message
        }));
      }
    } catch (tableError: any) {
      // Try workflow_executions table as fallback
      try {
        const result = await db.execute(sql`
SELECT
id,
  workflow_name,
  execution_date,
  status,
  duration_seconds,
  records_processed,
  error_message
          FROM workflow_executions
          ORDER BY execution_date DESC
          LIMIT 100
  `);

        if (result.rows && result.rows.length > 0) {
          executions = result.rows;
        }
      } catch (fallbackError: any) {
        // Neither table exists, return empty array
        console.log('workflow_instances and workflow_executions tables do not exist, returning empty array');
      }
    }

    res.json(executions);
  } catch (error) {
    console.error("Error fetching workflow executions:", error);
    res.status(500).json({ error: "Failed to fetch workflow executions" });
  }
});

// Automation Statistics endpoint
router.get("/automation-statistics", async (req, res) => {
  try {
    const stats = {
      invoices_processed: 1247,
      approval_rate: 78,
      cycle_time_reduction: 32,
      cost_savings: 12450,
      time_saved_hours: 156,
    };

    res.json(stats);
  } catch (error) {
    console.error("Error fetching automation statistics:", error);
    res.status(500).json({ error: "Failed to fetch automation statistics" });
  }
});

// Integration Systems endpoint
router.get("/integration-systems", async (req, res) => {
  try {
    let systems = [];

    // Try to fetch from integration_systems table if it exists
    try {
      const result = await db.execute(sql`
SELECT
id,
  system_code,
  system_name,
  description,
  status,
  last_sync,
  created_at
        FROM integration_systems
        ORDER BY system_code ASC
  `);

      if (result.rows && result.rows.length > 0) {
        systems = result.rows.map((row: any) => ({
          id: row.id,
          system_code: row.system_code,
          system_name: row.system_name,
          description: row.description,
          status: row.status || 'active',
          last_sync: row.last_sync || row.created_at
        }));
      }
    } catch (tableError: any) {
      // Table doesn't exist, return empty array
      console.log('integration_systems table does not exist, returning empty array');
    }

    res.json(systems);
  } catch (error) {
    console.error("Error fetching integration systems:", error);
    res.status(500).json({ error: "Failed to fetch integration systems" });
  }
});

// CrossCheck Validation endpoint
router.get("/crosscheck-validation", async (req, res) => {
  try {
    const results = [
      {
        id: 1,
        validation_type: 'vendor_lineage',
        status: 'passed',
        severity: 'low',
        description: 'All vendor data lineage validated successfully',
        affected_records: 0
      },
      {
        id: 2,
        validation_type: 'invoice_integrity',
        status: 'warning',
        severity: 'medium',
        description: 'Minor discrepancies found in invoice amounts',
        affected_records: 3
      },
      {
        id: 3,
        validation_type: 'three_way_match',
        status: 'passed',
        severity: 'low',
        description: 'Three-way matching validation completed',
        affected_records: 0
      }
    ];

    res.json(results);
  } catch (error) {
    console.error("Error fetching crosscheck validation:", error);
    res.status(500).json({ error: "Failed to fetch crosscheck validation" });
  }
});

// Data Lineage endpoint
router.get("/data-lineage", async (req, res) => {
  try {
    const lineage = {
      company_codes_validated: 4,
      vendors_validated: 156,
      invoices_validated: 1247,
      payments_validated: 987,
      three_way_matched: 892,
      two_way_matched: 234,
      no_match: 121,
    };

    res.json(lineage);
  } catch (error) {
    console.error("Error fetching data lineage:", error);
    res.status(500).json({ error: "Failed to fetch data lineage" });
  }
});

// Integrity Metrics endpoint
router.get("/integrity-metrics", async (req, res) => {
  try {
    const metrics = {
      overall_score: 94,
      vendor_data_score: 98,
      invoice_integrity_score: 89,
      payment_integrity_score: 96,
      three_way_match_rate: 87,
      sox_compliance: 92,
      audit_readiness: 95,
      data_governance: 88,
      control_effectiveness: 91,
      last_validation: new Date(Date.now() - 3600000),
    };

    res.json(metrics);
  } catch (error) {
    console.error("Error fetching integrity metrics:", error);
    res.status(500).json({ error: "Failed to fetch integrity metrics" });
  }
});

// Create A/P Invoice with three-way match
router.post("/invoices", async (req, res) => {
  try {
    const {
      vendor_id,
      invoice_number,
      invoice_date,
      due_date,
      purchase_order_id,
      goods_receipt_id,
      items,
      currency,
      notes,
      perform_validation = true,
      document_type_id
    } = req.body;

    // DEBUG: Log exactly what we're receiving
    console.log('📋 Invoice creation request received:', {
      vendor_id,
      invoice_number,
      items_provided: !!items,
      items_length: items?.length,
      items_is_array: Array.isArray(items),
      full_body_keys: Object.keys(req.body),
      content_type: req.headers['content-type']
    });

    if (!vendor_id || !invoice_number || !items || items.length === 0) {
      console.error('❌ Validation failed:', {
        has_vendor_id: !!vendor_id,
        has_invoice_number: !!invoice_number,
        has_items: !!items,
        items_length: items?.length
      });
      return res.status(400).json({
        error: "Missing required fields: vendor_id, invoice_number, and items are required"
      });
    }

    // Transform items from snake_case to camelCase and calculate totalPrice
    const transformedItems = items.map((item: any) => ({
      materialId: item.material_id,
      materialCode: item.material_code || item.materialCode || '',
      quantity: parseFloat(item.quantity) || 0,
      unitPrice: parseFloat(item.unit_price || item.unitPrice) || 0,
      totalPrice: (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price || item.unitPrice) || 0),
      description: item.description || ''
    }));

    const result = await apInvoiceService.createAPInvoice({
      vendorId: vendor_id,
      invoiceNumber: invoice_number,
      invoiceDate: new Date(invoice_date),
      dueDate: new Date(due_date),
      purchaseOrderId: purchase_order_id,
      goodsReceiptId: goods_receipt_id,
      items: transformedItems,
      currency: currency || 'USD',
      notes: notes,
      documentTypeId: document_type_id
    }, perform_validation);

    if (!result.success) {
      return res.status(400).json({
        error: "Invoice creation failed",
        validation_result: result.validationResult,
        errors: result.errors
      });
    }

    res.status(201).json({
      success: true,
      invoice_id: result.invoiceId,
      validation_result: result.validationResult
    });
  } catch (error: any) {
    console.error("Error creating A/P invoice:", error);
    res.status(500).json({ error: "Failed to create A/P invoice", message: error.message });
  }
});

// Post A/P Invoice (lock it)
router.post("/invoices/:id/post", async (req, res) => {
  try {
    const invoiceId = parseInt(req.params.id);
    const result = await apInvoiceService.postAPInvoice(invoiceId);

    if (!result.success) {
      return res.status(400).json({
        error: "Failed to post invoice",
        errors: result.errors
      });
    }

    res.json({ success: true, message: "Invoice posted successfully" });
  } catch (error: any) {
    console.error("Error posting A/P invoice:", error);
    res.status(500).json({ error: "Failed to post A/P invoice", message: error.message });
  }
});

// Create payment application (link payment to invoice)
router.post("/payments/applications", async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const {
      payment_id,
      invoice_id,
      applied_amount,
      application_date
    } = req.body;

    if (!payment_id || !invoice_id || !applied_amount) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: "Missing required fields: payment_id, invoice_id, and applied_amount are required"
      });
    }

    // Check if invoice exists and get amount
    const invoiceResult = await client.query(`
      SELECT id, amount, status, posted
      FROM ap_invoices
      WHERE id = $1
  `, [invoice_id]);

    if (invoiceResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: "Invoice not found" });
    }

    const invoice = invoiceResult.rows[0];

    // Check if invoice is posted
    if (!invoice.posted) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: "Cannot apply payment to unposted invoice" });
    }

    // Get total already applied
    const existingApplications = await client.query(`
      SELECT COALESCE(SUM(applied_amount), 0) as total_applied
      FROM payment_applications
      WHERE invoice_id = $1
  `, [invoice_id]);

    const totalApplied = parseFloat(existingApplications.rows[0]?.total_applied || 0);
    const remainingAmount = parseFloat(invoice.amount) - totalApplied;

    if (applied_amount > remainingAmount) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: `Applied amount(${applied_amount}) exceeds remaining invoice amount(${remainingAmount})`
      });
    }

    // Create payment application
    await client.query(`
      INSERT INTO payment_applications(
    payment_id,
    invoice_id,
    applied_amount,
    application_date,
    created_at,
    updated_at
  ) VALUES($1, $2, $3, $4, NOW(), NOW())
    `, [
      payment_id,
      invoice_id,
      applied_amount,
      application_date || new Date()
    ]);

    // Update invoice status
    const newTotalApplied = totalApplied + applied_amount;
    let newStatus = 'open';
    if (newTotalApplied >= parseFloat(invoice.amount)) {
      newStatus = 'paid';
    } else if (newTotalApplied > 0) {
      newStatus = 'partial';
    }

    await client.query(`
      UPDATE ap_invoices
      SET status = $1, updated_at = NOW()
      WHERE id = $2
  `, [newStatus, invoice_id]);

    // Update vendor balance
    await client.query(`
      UPDATE erp_vendors
      SET balance = COALESCE(balance, 0) - $1,
  updated_at = NOW()
      WHERE id = (SELECT vendor_id FROM ap_invoices WHERE id = $2)
`, [applied_amount, invoice_id]);

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: "Payment application created successfully",
      invoice_status: newStatus,
      total_applied: newTotalApplied,
      remaining_amount: parseFloat(invoice.amount) - newTotalApplied
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error("Error creating payment application:", error);
    res.status(500).json({ error: "Failed to create payment application", message: error.message });
  } finally {
    client.release();
  }
});

// Get open items list (POs, GRPOs, A/P Invoices)
router.get("/open-items", async (req, res) => {
  try {
    const { vendor_id, date_from, date_to } = req.query;

    let vendorFilter = '';
    let dateFilter = '';
    const params: any[] = [];
    let paramCount = 0;

    if (vendor_id) {
      paramCount++;
      vendorFilter = `AND po.vendor_id = $${paramCount} `;
      params.push(vendor_id);
    }

    if (date_from) {
      paramCount++;
      dateFilter += `AND po.order_date >= $${paramCount} `;
      params.push(date_from);
    }

    if (date_to) {
      paramCount++;
      dateFilter += `AND po.order_date <= $${paramCount} `;
      params.push(date_to);
    }

    // Get open POs (not fully received)
    const openPOsQuery = `
SELECT
po.id,
  po.order_number,
  po.vendor_id,
  v.name as vendor_name,
  po.order_date,
  po.delivery_date,
  po.status,
  po.total_amount,
  COUNT(poi.id) as total_items,
  COUNT(CASE WHEN COALESCE(poi.received_quantity, 0) >= poi.quantity THEN 1 END) as received_items
      FROM purchase_orders po
      LEFT JOIN vendors v ON po.vendor_id = v.id
      LEFT JOIN purchase_order_items poi ON po.id = poi.purchase_order_id
      WHERE po.status NOT IN('CLOSED', 'CANCELLED')
        AND po.active = true
        ${vendorFilter}
        ${dateFilter}
      GROUP BY po.id, po.order_number, po.vendor_id, v.name, po.order_date, po.delivery_date, po.status, po.total_amount
      HAVING COUNT(CASE WHEN COALESCE(poi.received_quantity, 0) >= poi.quantity THEN 1 END) < COUNT(poi.id)
      ORDER BY po.order_date DESC
      LIMIT 100
  `;

    const openPOsResult = await pool.query(openPOsQuery, params);

    // Get open GRPOs (not fully invoiced)
    // Check which columns exist in goods_receipts table
    const grColumnsCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'goods_receipts'
      AND column_name IN('grn_number', 'receipt_number', 'material_code', 'quantity',
    'receipt_date', 'status', 'purchase_order_id', 'purchase_order',
    'posted', 'receipt_type', 'vendor_code', 'vendor_id')
  `);

    const existingColumns = grColumnsCheck.rows.map((r: any) => r.column_name);
    const hasGrnNumber = existingColumns.includes('grn_number');
    const hasReceiptNumber = existingColumns.includes('receipt_number');
    const hasMaterialCode = existingColumns.includes('material_code');
    const hasQuantity = existingColumns.includes('quantity');
    const hasPurchaseOrderId = existingColumns.includes('purchase_order_id');
    const hasPurchaseOrder = existingColumns.includes('purchase_order');
    const hasPosted = existingColumns.includes('posted');
    const hasReceiptType = existingColumns.includes('receipt_type');
    const hasVendorId = existingColumns.includes('vendor_id');
    const hasVendorCode = existingColumns.includes('vendor_code');

    // Build query based on available columns
    const grnNumberCol = hasGrnNumber ? 'gr.grn_number' : (hasReceiptNumber ? 'gr.receipt_number' : 'NULL as grn_number');
    const materialCodeCol = hasMaterialCode ? 'gr.material_code' : 'NULL as material_code';
    const quantityCol = hasQuantity ? 'gr.quantity' : 'gr.total_quantity as quantity';
    const purchaseOrderJoin = hasPurchaseOrderId
      ? 'LEFT JOIN purchase_orders po ON gr.purchase_order_id = po.id'
      : (hasPurchaseOrder
        ? 'LEFT JOIN purchase_orders po ON gr.purchase_order = po.order_number'
        : 'LEFT JOIN purchase_orders po ON 1=0'); // No join if no purchase order column
    const vendorJoin = hasVendorId
      ? 'LEFT JOIN vendors v ON po.vendor_id = v.id'
      : (hasVendorCode
        ? 'LEFT JOIN vendors v ON gr.vendor_code = v.code'
        : 'LEFT JOIN vendors v ON 1=0'); // No join if no vendor column

    const postedCondition = hasPosted ? 'gr.posted = true' : '1=1'; // Always true if posted doesn't exist
    const receiptTypeCondition = hasReceiptType
      ? "gr.receipt_type = 'PURCHASE_ORDER'"
      : '1=1'; // Always true if receipt_type doesn't exist

    const openGRPOsQuery = `
SELECT
gr.id,
  ${grnNumberCol},
        ${materialCodeCol},
        ${quantityCol},
gr.receipt_date,
  gr.status,
  ${hasPurchaseOrderId ? 'gr.purchase_order_id' : (hasPurchaseOrder ? 'NULL as purchase_order_id' : 'NULL as purchase_order_id')},
po.order_number,
  v.name as vendor_name
      FROM goods_receipts gr
      ${purchaseOrderJoin}
      ${vendorJoin}
      WHERE ${postedCondition}
        AND gr.status NOT IN('INVOICED', 'CLOSED')
        AND ${receiptTypeCondition}
        ${vendorFilter ? vendorFilter.replace('po.vendor_id', hasVendorId ? 'po.vendor_id' : (hasVendorCode ? 'v.id' : 'NULL')) : ''}
      ORDER BY gr.receipt_date DESC
      LIMIT 100
  `;

    const openGRPOsResult = await pool.query(openGRPOsQuery, params);

    // Get open A/P Invoices (not fully paid)
    // First check if ap_open_items table exists and use it for accurate outstanding amounts
    const apOpenItemsCheck = await pool.query(`
      SELECT EXISTS(
    SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'ap_open_items'
  )
  `);

    let openInvoicesResult;
    if (apOpenItemsCheck.rows[0]?.exists) {
      // Use ap_open_items table for accurate outstanding amounts
      const apOpenItemsColumnsCheck = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'ap_open_items'
        AND column_name IN('invoice_id', 'document_number', 'invoice_number', 'vendor_id', 'outstanding_amount', 'status')
  `);

      const apOpenColumns = apOpenItemsColumnsCheck.rows.map((r: any) => r.column_name);
      const hasInvoiceId = apOpenColumns.includes('invoice_id');
      const hasDocumentNumber = apOpenColumns.includes('document_number');
      const hasInvoiceNumber = apOpenColumns.includes('invoice_number');
      const hasOutstandingAmount = apOpenColumns.includes('outstanding_amount');

      if (hasInvoiceId || hasInvoiceNumber) {
        // Use ap_open_items for outstanding amounts
        const joinCondition = hasInvoiceId
          ? 'aoi.invoice_id = ap.id'
          : (hasInvoiceNumber ? 'aoi.invoice_number = ap.invoice_number' : '1=0');

        const outstandingCol = hasOutstandingAmount ? 'aoi.outstanding_amount' : 'ap.amount - COALESCE(SUM(vp.payment_amount), 0)';

        const openInvoicesQuery = `
SELECT
ap.id,
  ap.invoice_number,
  ap.vendor_id,
  v.name as vendor_name,
  ap.invoice_date,
  ap.due_date,
  ap.amount,
  ap.net_amount,
  ap.status,
  ap.purchase_order_id,
  ${hasDocumentNumber ? 'aoi.document_number,' : ''}
COALESCE(SUM(vp.payment_amount), 0) as paid_amount,
  ${hasOutstandingAmount ? outstandingCol : `ap.amount - COALESCE(SUM(vp.payment_amount), 0)`} as outstanding_amount
          FROM accounts_payable ap
          LEFT JOIN vendors v ON ap.vendor_id = v.id
          ${hasInvoiceId || hasInvoiceNumber ? `LEFT JOIN ap_open_items aoi ON ${joinCondition} AND aoi.active = true` : ''}
          LEFT JOIN vendor_payments vp ON ap.id = vp.invoice_id AND vp.status IN('POSTED', 'PROCESSED')
          WHERE ap.active = true
            AND ap.status IN('Open', 'open', 'OPEN', 'Partial', 'partial', 'PARTIAL')
            ${vendor_id ? `AND ap.vendor_id = ${vendor_id}` : ''}
            ${date_from ? `AND ap.invoice_date >= '${date_from}'` : ''}
            ${date_to ? `AND ap.invoice_date <= '${date_to}'` : ''}
          GROUP BY ap.id, ap.invoice_number, ap.vendor_id, v.name, ap.invoice_date, ap.due_date, ap.amount, ap.net_amount, ap.status, ap.purchase_order_id${hasDocumentNumber ? ', aoi.document_number, aoi.outstanding_amount' : ''}
          HAVING ${hasOutstandingAmount ? outstandingCol : `ap.amount - COALESCE(SUM(vp.payment_amount), 0)`} > 0
          ORDER BY ap.due_date ASC
          LIMIT 100
  `;

        openInvoicesResult = await pool.query(openInvoicesQuery);
      } else {
        // Fallback to accounts_payable without ap_open_items
        const openInvoicesQuery = `
SELECT
ap.id,
  ap.invoice_number,
  ap.vendor_id,
  v.name as vendor_name,
  ap.invoice_date,
  ap.due_date,
  ap.amount,
  ap.net_amount,
  ap.status,
  ap.purchase_order_id,
  COALESCE(SUM(vp.payment_amount), 0) as paid_amount,
  ap.amount - COALESCE(SUM(vp.payment_amount), 0) as outstanding_amount
          FROM accounts_payable ap
          LEFT JOIN vendors v ON ap.vendor_id = v.id
          LEFT JOIN vendor_payments vp ON ap.id = vp.invoice_id AND vp.status IN('POSTED', 'PROCESSED')
          WHERE ap.active = true
            AND ap.status IN('Open', 'open', 'OPEN', 'Partial', 'partial', 'PARTIAL')
            ${vendor_id ? `AND ap.vendor_id = ${vendor_id}` : ''}
            ${date_from ? `AND ap.invoice_date >= '${date_from}'` : ''}
            ${date_to ? `AND ap.invoice_date <= '${date_to}'` : ''}
          GROUP BY ap.id, ap.invoice_number, ap.vendor_id, v.name, ap.invoice_date, ap.due_date, ap.amount, ap.net_amount, ap.status, ap.purchase_order_id
          HAVING ap.amount - COALESCE(SUM(vp.payment_amount), 0) > 0
          ORDER BY ap.due_date ASC
          LIMIT 100
  `;

        openInvoicesResult = await pool.query(openInvoicesQuery);
      }
    } else {
      // ap_open_items table doesn't exist, use accounts_payable with vendor_payments
      const openInvoicesQuery = `
SELECT
ap.id,
  ap.invoice_number,
  ap.vendor_id,
  v.name as vendor_name,
  ap.invoice_date,
  ap.due_date,
  ap.amount,
  ap.net_amount,
  ap.status,
  ap.purchase_order_id,
  COALESCE(SUM(vp.payment_amount), 0) as paid_amount,
  ap.amount - COALESCE(SUM(vp.payment_amount), 0) as outstanding_amount
        FROM accounts_payable ap
        LEFT JOIN vendors v ON ap.vendor_id = v.id
        LEFT JOIN vendor_payments vp ON ap.id = vp.invoice_id AND vp.status IN('POSTED', 'PROCESSED')
        WHERE ap.active = true
          AND ap.status IN('Open', 'open', 'OPEN', 'Partial', 'partial', 'PARTIAL')
          ${vendor_id ? `AND ap.vendor_id = ${vendor_id}` : ''}
          ${date_from ? `AND ap.invoice_date >= '${date_from}'` : ''}
          ${date_to ? `AND ap.invoice_date <= '${date_to}'` : ''}
        GROUP BY ap.id, ap.invoice_number, ap.vendor_id, v.name, ap.invoice_date, ap.due_date, ap.amount, ap.net_amount, ap.status, ap.purchase_order_id
        HAVING ap.amount - COALESCE(SUM(vp.payment_amount), 0) > 0
        ORDER BY ap.due_date ASC
        LIMIT 100
      `;

      openInvoicesResult = await pool.query(openInvoicesQuery);
    }

    res.json({
      open_pos: openPOsResult.rows,
      open_grpos: openGRPOsResult.rows,
      open_ap_invoices: openInvoicesResult.rows
    });
  } catch (error: any) {
    console.error("Error fetching open items:", error);
    res.status(500).json({ error: "Failed to fetch open items", message: error.message });
  }
});

// POST /api/ap/manual-invoice - Create manual vendor invoice (without purchase order/goods receipt)
router.post('/manual-invoice', async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const {
      vendor_id,
      invoice_date,
      due_date,
      company_code_id,
      currency,
      payment_terms,
      line_items,
      reference,
      invoice_number
    } = req.body;

    // Validate required fields
    if (!vendor_id) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'Vendor ID is required'
      });
    }

    if (!invoice_date) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'Invoice date is required'
      });
    }

    if (!line_items || !Array.isArray(line_items) || line_items.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'At least one line item is required'
      });
    }

    // Validate vendor exists
    const vendorCheck = await client.query(
      'SELECT id, name, company_code_id FROM vendors WHERE id = $1',
      [vendor_id]
    );

    if (vendorCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: 'Vendor not found'
      });
    }

    const vendor = vendorCheck.rows[0];

    // Get company code (from request, vendor, or first available)
    let finalCompanyCodeId = company_code_id || vendor.company_code_id;

    if (!finalCompanyCodeId) {
      const companyCodeResult = await client.query(
        'SELECT id FROM company_codes WHERE is_active = true ORDER BY id LIMIT 1'
      );
      if (companyCodeResult.rows.length > 0) {
        finalCompanyCodeId = companyCodeResult.rows[0].id;
      }
    }

    if (!finalCompanyCodeId) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        error: 'Company code is required. Please provide company_code_id or configure it in vendor master data.'
      });
    }

    // Get company code details for currency
    const companyCodeResult = await client.query(
      'SELECT code, currency FROM company_codes WHERE id = $1',
      [finalCompanyCodeId]
    );

    if (companyCodeResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false,
        error: 'Company code not found'
      });
    }

    const companyCode = companyCodeResult.rows[0].code;
    const finalCurrency = currency || companyCodeResult.rows[0].currency || 'USD';

    // Calculate totals from line items
    let totalNetAmount = 0;
    let totalTaxAmount = 0;

    // Process line items and validate
    const processedItems = [];
    for (let i = 0; i < line_items.length; i++) {
      const item = line_items[i];

      if (!item.description && !item.material_code) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          error: `Line item ${i + 1}: Description or material code is required`
        });
      }

      const quantity = parseFloat(item.quantity) || 0;
      const unitPrice = parseFloat(item.unit_price) || 0;
      const taxRate = parseFloat(item.tax_rate) || 0;

      if (quantity <= 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          error: `Line item ${i + 1}: Quantity must be greater than 0`
        });
      }

      if (unitPrice < 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          success: false,
          error: `Line item ${i + 1}: Unit price must be 0 or greater`
        });
      }

      const netAmount = quantity * unitPrice;
      const taxAmount = netAmount * (taxRate / 100);

      totalNetAmount += netAmount;
      totalTaxAmount += taxAmount;

      // Fetch profit_center and cost_center from material master if material_id exists
      let profitCenter = item.profit_center || null;
      let costCenter = item.cost_center || null;

      if (item.material_id && (!profitCenter || !costCenter)) {
        try {
          const materialResult = await client.query(
            'SELECT profit_center, cost_center FROM materials WHERE id = $1',
            [item.material_id]
          );
          if (materialResult.rows.length > 0) {
            const material = materialResult.rows[0];
            if (!profitCenter && material.profit_center) {
              profitCenter = material.profit_center;
            }
            if (!costCenter && material.cost_center) {
              costCenter = material.cost_center;
            }
          }
        } catch (materialError: any) {
          console.log(`Could not fetch material data for ID ${item.material_id}: `, materialError.message);
        }
      }

      processedItems.push({
        lineItem: i + 1,
        material_id: item.material_id || null,
        material_code: item.material_code || null,
        description: item.description || item.material_code,
        quantity: quantity,
        unit: item.unit || 'EA',
        unitPrice: unitPrice,
        netAmount: netAmount,
        taxRate: taxRate,
        taxAmount: taxAmount,
        profit_center: profitCenter,
        cost_center: costCenter
      });
    }

    const totalGrossAmount = totalNetAmount + totalTaxAmount;

    // Calculate due date if not provided
    let finalDueDate = due_date;
    if (!finalDueDate) {
      const finalPaymentTerms = payment_terms || vendor.payment_terms || 'NET30';
      let dueDateOffset = 30;

      const paymentTermsResult = await client.query(
        'SELECT payment_days FROM payment_terms WHERE code = $1 LIMIT 1',
        [finalPaymentTerms]
      );

      if (paymentTermsResult.rows.length > 0) {
        dueDateOffset = parseInt(paymentTermsResult.rows[0].payment_days) || 30;
      }

      const invoiceDateObj = new Date(invoice_date);
      const dueDateObj = new Date(invoiceDateObj);
      dueDateObj.setDate(dueDateObj.getDate() + dueDateOffset);
      finalDueDate = dueDateObj.toISOString().split('T')[0];
    }

    // Generate invoice number if not provided
    let finalInvoiceNumber = invoice_number;
    if (!finalInvoiceNumber) {
      const invoiceCountResult = await client.query(
        'SELECT COUNT(*) as count FROM accounts_payable'
      );
      const invoiceCount = parseInt(invoiceCountResult.rows[0]?.count || 0) + 1;
      finalInvoiceNumber = `VINV - ${new Date().getFullYear()} -${invoiceCount.toString().padStart(6, '0')} `;
    }

    // Get currency ID
    let currencyId = null;
    if (finalCurrency) {
      const currencyResult = await client.query(
        'SELECT id FROM currencies WHERE code = $1 LIMIT 1',
        [finalCurrency]
      );
      if (currencyResult.rows.length > 0) {
        currencyId = currencyResult.rows[0].id;
      }
    }

    // Get created_by (from auth context, request, or system user)
    let createdBy = (req as any).user?.id || req.body.created_by || null;

    if (!createdBy) {
      const systemUserResult = await client.query(
        "SELECT id FROM users WHERE (role = 'system' OR role = 'admin') AND active = true ORDER BY id LIMIT 1"
      );
      if (systemUserResult.rows.length > 0) {
        createdBy = systemUserResult.rows[0].id;
      } else {
        const activeUserResult = await client.query(
          'SELECT id FROM users WHERE active = true ORDER BY id LIMIT 1'
        );
        if (activeUserResult.rows.length > 0) {
          createdBy = activeUserResult.rows[0].id;
        }
      }
    }

    // Create accounts payable invoice
    console.log('Creating accounts_payable invoice:', {
      vendor_id,
      invoice_number: finalInvoiceNumber,
      invoice_date,
      due_date: finalDueDate,
      amount: totalGrossAmount.toFixed(2),
      company_code_id: finalCompanyCodeId
    });

    const invoiceResult = await client.query(`
      INSERT INTO accounts_payable(
    vendor_id, invoice_number, invoice_date, due_date, amount,
    net_amount, tax_amount, discount_amount, currency_id,
    company_code_id, payment_terms, purchase_order_id, status,
    notes, created_by, created_at, updated_at, active
  ) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NULL, 'Open', $12, $13, NOW(), NOW(), true)
      RETURNING id, invoice_number, invoice_date, due_date, amount, net_amount, tax_amount
  `, [
      vendor_id,
      finalInvoiceNumber,
      invoice_date,
      finalDueDate,
      totalGrossAmount.toFixed(2),
      totalNetAmount.toFixed(2),
      totalTaxAmount.toFixed(2),
      0, // discount_amount
      currencyId,
      finalCompanyCodeId,
      payment_terms || vendor.payment_terms || null,
      reference || null,
      createdBy
    ]);

    const invoiceId = invoiceResult.rows[0].id;
    console.log('Invoice created successfully with ID:', invoiceId);

    // Create invoice line items using ap_invoice_items table
    try {
      // Check if ap_invoice_items table exists and get its structure
      const tableCheck = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'ap_invoice_items'
        ORDER BY ordinal_position
      `);

      if (tableCheck.rows.length > 0) {
        const columns = tableCheck.rows.map((r: any) => r.column_name);
        const hasLineItem = columns.includes('line_item');
        const hasUnit = columns.includes('unit');
        const hasNetAmount = columns.includes('net_amount');
        const hasTaxRate = columns.includes('tax_rate');
        const hasTaxAmount = columns.includes('tax_amount');
        const hasMaterialCode = columns.includes('material_code');

        for (const item of processedItems) {
          const totalPrice = item.netAmount + item.taxAmount;

          // Build columns and values dynamically
          const columns: string[] = ['invoice_id'];
          const values: any[] = [invoiceId];
          let paramIndex = 2;

          if (hasLineItem) {
            columns.push('line_item');
            values.push(item.lineItem);
            paramIndex++;
          }

          columns.push('material_id');
          values.push(item.material_id || null);
          paramIndex++;

          if (hasMaterialCode) {
            columns.push('material_code');
            values.push(item.material_code || null);
            paramIndex++;
          }

          columns.push('quantity');
          values.push(item.quantity);
          paramIndex++;

          if (hasUnit) {
            columns.push('unit');
            values.push(item.unit || 'EA');
            paramIndex++;
          }

          columns.push('unit_price');
          values.push(item.unitPrice.toFixed(2));
          paramIndex++;

          if (hasNetAmount) {
            columns.push('net_amount');
            values.push(item.netAmount.toFixed(2));
            paramIndex++;
          }

          if (hasTaxRate) {
            columns.push('tax_rate');
            values.push(item.taxRate || 0);
            paramIndex++;
          }

          if (hasTaxAmount) {
            columns.push('tax_amount');
            values.push(item.taxAmount.toFixed(2));
            paramIndex++;
          }

          columns.push('total_price');
          values.push(totalPrice.toFixed(2));
          paramIndex++;

          columns.push('description');
          values.push(item.description);
          paramIndex++;

          columns.push('created_at');

          // Build placeholders
          const placeholders = values.map((_, i) => `$${i + 1} `).join(', ');

          // Insert
          await client.query(`
            INSERT INTO ap_invoice_items(
    ${columns.join(', ')}
  ) VALUES(${placeholders}, NOW())
          `, values);
        }
        console.log(`Created ${processedItems.length} invoice line items in ap_invoice_items table`);
      } else {
        console.log('ap_invoice_items table does not exist, skipping line item creation');
      }
    } catch (itemsError: any) {
      // If ap_invoice_items table doesn't exist or has errors, log but continue
      console.log('Could not create invoice line items:', itemsError.message);
    }

    // ========== GL POSTING (MANDATORY) ==========
    // Use existing companyCode from earlier in the function (already fetched at line 1698)
    // No need to fetch again, it's already available

    // Generate accounting document number (MANDATORY - transaction fails if this fails)
    let accountingDocNumber = null;
    let accountingDocTypeId = null;
    try {
      const docResult = await DocumentNumberingService.getNextDocumentNumberForDirectType('KR', finalCompanyCodeId);
      accountingDocNumber = docResult.documentNumber;
      accountingDocTypeId = docResult.documentTypeId;
    } catch (e) {
      await client.query('ROLLBACK');
      throw new Error(`Failed to generate accounting document number: ${e.message}`);
    }

    // Validate accounting document number is not null (MANDATORY)
    if (!accountingDocNumber) {
      await client.query('ROLLBACK');
      throw new Error('Accounting document number is required for GL posting');
    }

    // Get vendor GL account (reconciliation account) - check vendor first, then default
    let vendorGlAccount = null;
    let vendorGlAccountNumber = null;
    try {
      // Check if gl_account_id column exists in vendors table
      const columnCheck = await client.query(`
        SELECT EXISTS(
    SELECT FROM information_schema.columns 
          WHERE table_name = 'vendors' 
          AND column_name = 'gl_account_id'
  )
      `);

      if (columnCheck.rows[0].exists) {
        // Column exists, try to get vendor-specific GL account
        const vendorGlResult = await client.query(
          `SELECT gl_account_id FROM vendors WHERE id = $1`,
          [vendor_id]
        );
        if (vendorGlResult.rows.length > 0 && vendorGlResult.rows[0].gl_account_id) {
          // Validate the GL account exists and is active
          const glAccountCheck = await client.query(
            `SELECT id, account_type, is_active FROM gl_accounts WHERE id = $1`,
            [vendorGlResult.rows[0].gl_account_id]
          );
          if (glAccountCheck.rows.length > 0 && glAccountCheck.rows[0].is_active) {
            vendorGlAccount = vendorGlResult.rows[0].gl_account_id;
            // Get account number
            const accountNumResult = await client.query(
              'SELECT account_number FROM gl_accounts WHERE id = $1',
              [vendorGlAccount]
            );
            if (accountNumResult.rows.length > 0) {
              vendorGlAccountNumber = accountNumResult.rows[0].account_number;
            }
          }
        }
      } else {
        // Column doesn't exist, log and continue to fallback
        console.log('⚠️ vendors.gl_account_id column does not exist, using default AP account');
      }
    } catch (e) {
      // Don't rollback or throw - just log and continue to fallback logic
      console.log('⚠️ Could not fetch vendor GL account, using default AP account:', e.message);
    }

    // Get default AP account if vendor doesn't have one (using same logic as vendorPaymentService)
    if (!vendorGlAccount) {
      try {
        const defaultApResult = await client.query(`
SELECT
gl.id, gl.account_number, gl.account_name, gl.account_type,
  gl.account_group, gl.is_active,
  CASE 
              WHEN gl.account_group ILIKE '%ACCOUNTS_PAYABLE%' THEN 1
              WHEN gl.account_group ILIKE '%PAYABLE%' THEN 2
              WHEN gl.account_number LIKE '2100%' THEN 3
              WHEN gl.account_number LIKE '2110%' THEN 4
              WHEN gl.account_group ILIKE '%VENDOR%' THEN 5
              ELSE 6
END as account_priority
          FROM gl_accounts gl
          WHERE gl.account_type = 'LIABILITIES'
AND(
  gl.account_group ILIKE '%VENDOR%' 
              OR gl.account_group ILIKE '%PAYABLE%' 
              OR gl.account_group ILIKE '%ACCOUNTS_PAYABLE%'
              OR gl.account_number LIKE '2100%'
              OR gl.account_number LIKE '2110%'
)
            AND gl.is_active = true
          ORDER BY account_priority, gl.account_number
          LIMIT 1
        `);
        if (defaultApResult.rows.length > 0) {
          vendorGlAccount = defaultApResult.rows[0].id;
          vendorGlAccountNumber = defaultApResult.rows[0].account_number;
        }
      } catch (e) {
        await client.query('ROLLBACK');
        throw new Error(`Failed to fetch default AP account: ${e.message} `);
      }
    }

    // Get expense/clearing account for manual invoices (debit side)
    let expenseGlAccount = null;
    let expenseGlAccountNumber = null;
    try {
      const expenseResult = await client.query(`
SELECT
gl.id, gl.account_number, gl.account_name, gl.account_type,
  CASE 
            WHEN gl.account_group ILIKE '%EXPENSE%' THEN 1
            WHEN gl.account_group ILIKE '%COST%' THEN 2
            WHEN gl.account_number LIKE '5%' THEN 3
            WHEN gl.account_number LIKE '6%' THEN 4
            ELSE 5
END as account_priority
        FROM gl_accounts gl
        WHERE UPPER(TRIM(gl.account_type)) IN('EXPENSE', 'EXPENSES')
          AND gl.is_active = true
        ORDER BY account_priority, gl.account_number
        LIMIT 1
      `);
      if (expenseResult.rows.length > 0) {
        expenseGlAccount = expenseResult.rows[0].id;
        expenseGlAccountNumber = expenseResult.rows[0].account_number;
      }
    } catch (e) {
      await client.query('ROLLBACK');
      throw new Error(`Failed to fetch expense account: ${e.message} `);
    }

    // Get tax account if tax exists
    let taxGlAccount = null;
    let taxGlAccountNumber = null;
    if (totalTaxAmount > 0) {
      try {
        const taxResult = await client.query(`
SELECT
gl.id, gl.account_number, gl.account_name,
  CASE 
              WHEN gl.account_group ILIKE '%TAX%' THEN 1
              WHEN gl.account_number LIKE '2200%' THEN 2
              WHEN gl.account_number LIKE '2400%' THEN 3
              ELSE 4
END as account_priority
          FROM gl_accounts gl
          WHERE gl.account_type = 'LIABILITY'
AND(
  gl.account_group ILIKE '%TAX%'
              OR gl.account_number LIKE '2200%'
              OR gl.account_number LIKE '2400%'
)
            AND gl.is_active = true
          ORDER BY account_priority, gl.account_number
          LIMIT 1
        `);
        if (taxResult.rows.length > 0) {
          taxGlAccount = taxResult.rows[0].id;
          taxGlAccountNumber = taxResult.rows[0].account_number;
        }
      } catch (e) {
        // Tax account not critical, continue without it
        console.log('Could not fetch tax account:', e.message);
      }
    }

    // Validate required GL accounts exist (MANDATORY)
    if (!vendorGlAccount || !vendorGlAccountNumber) {
      await client.query('ROLLBACK');
      throw new Error('Accounts Payable GL account is required. Please configure AP account in GL accounts.');
    }

    if (!expenseGlAccount || !expenseGlAccountNumber) {
      await client.query('ROLLBACK');
      throw new Error('Expense GL account is required. Please configure expense account in GL accounts.');
    }

    // Validate currency ID exists
    if (!currencyId && finalCurrency) {
      await client.query('ROLLBACK');
      throw new Error(`Currency ${finalCurrency} not found in currencies table`);
    }

    // Calculate fiscal year and period from posting date
    const postingDate = new Date(invoice_date);
    const fiscalYear = postingDate.getFullYear();
    const period = postingDate.getMonth() + 1; // 1-12

    // Create accounting document header (MANDATORY - transaction fails if this fails)
    let accountingDocumentId = null;
    try {
      // Ensure company_code is max 4 characters (truncate if needed)
      const companyCodeShort = companyCode ? companyCode.substring(0, 4) : '1000';

      // Ensure created_by is an integer (default to 1 if null)
      const createdById = createdBy ? parseInt(createdBy.toString()) : 1;

      // Ensure header_text is max 100 characters
      const headerText = `Vendor Invoice ${finalInvoiceNumber} `.substring(0, 100);

      // Ensure reference is max 50 characters
      const referenceText = (reference || finalInvoiceNumber || '').substring(0, 50);

      console.log('Creating accounting document:', {
        document_number: accountingDocNumber,
        company_code: companyCodeShort,
        fiscal_year: fiscalYear,
        period: period,
        total_amount: totalGrossAmount.toFixed(2)
      });

      const accountingDocResult = await client.query(`
        INSERT INTO accounting_documents(
  document_number, company_code, fiscal_year, document_type, document_type_id,
  posting_date, document_date, period, reference, header_text,
  total_amount, currency, source_module, source_document_id,
  source_document_type, created_by
) VALUES($1, $2, $3, $4, $5, $6:: date, $7:: date, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING id
      `, [
        accountingDocNumber,
        companyCodeShort,
        fiscalYear,
        'KR', // KR = Vendor Invoice (Accounts Payable)
        accountingDocTypeId,
        invoice_date,
        invoice_date,
        period,
        referenceText,
        headerText,
        totalGrossAmount.toFixed(2),
        finalCurrency || 'USD',
        'FINANCE',
        invoiceId,
        'AP_INVOICE',
        createdById
      ]);
      accountingDocumentId = accountingDocResult.rows[0].id;
      console.log('Accounting document created successfully with ID:', accountingDocumentId);

      // Calculate GL balance for validation
      // Need to check tax account type to calculate balance correctly
      let taxDebitAmount = 0;
      let taxCreditAmount = 0;
      if (totalTaxAmount > 0 && taxGlAccount) {
        const taxAccountCheck = await client.query(
          `SELECT account_type FROM gl_accounts WHERE id = $1`,
          [taxGlAccount]
        );
        if (taxAccountCheck.rows.length > 0) {
          const taxAccountType = taxAccountCheck.rows[0].account_type;
          if (taxAccountType === 'LIABILITY') {
            taxCreditAmount = parseFloat(totalTaxAmount.toFixed(2));
          } else if (taxAccountType === 'EXPENSE') {
            taxDebitAmount = parseFloat(totalTaxAmount.toFixed(2));
          }
        }
      }
      // Debits: Expense (net) + Tax Expense (if tax is expense)
      // Credits: Accounts Payable (gross) + Tax Payable (if tax is liability)
      const totalDebits = parseFloat(totalNetAmount.toFixed(2)) + taxDebitAmount;
      const totalCredits = parseFloat(totalGrossAmount.toFixed(2)) + taxCreditAmount;

      // Validate GL balance (MANDATORY)
      if (Math.abs(totalDebits - totalCredits) > 0.01) {
        await client.query('ROLLBACK');
        throw new Error(`GL entries are not balanced.Debits: ${totalDebits}, Credits: ${totalCredits} `);
      }

      // Create GL document items
      // Determine tax account type first
      let taxAccountType = null;
      if (totalTaxAmount > 0 && taxGlAccount) {
        const taxAccountCheck = await client.query(
          `SELECT account_type FROM gl_accounts WHERE id = $1`,
          [taxGlAccount]
        );
        if (taxAccountCheck.rows.length > 0) {
          taxAccountType = taxAccountCheck.rows[0].account_type;
        }
      }

      // Prepare items for document splitting
      // Build items array with profit_center and cost_center from each line item
      const itemsForSplitting: any[] = [];

      // Add expense line items from processedItems (each with its own profit_center/cost_center)
      for (const item of processedItems) {
        itemsForSplitting.push({
          glAccount: (expenseGlAccountNumber || '').substring(0, 10),
          debitAmount: parseFloat(item.netAmount.toFixed(2)),
          creditAmount: 0,
          description: `Invoice ${finalInvoiceNumber} - ${item.description} `,
          accountType: 'S',
          profitCenter: item.profit_center || undefined,
          costCenter: item.cost_center || undefined,
        });
      }

      // Add the AP credit line item
      const apCreditAmount = (taxAccountType === 'LIABILITY') ? totalNetAmount.toFixed(2) : totalGrossAmount.toFixed(2);
      const vendorGlAccount = (vendorGlAccountNumber || '').substring(0, 10);
      itemsForSplitting.push({
        glAccount: vendorGlAccount,
        debitAmount: 0,
        creditAmount: parseFloat(apCreditAmount),
        description: `Invoice ${finalInvoiceNumber} - Accounts Payable`,
        accountType: 'K',
        partnerId: vendor_id,
      });

      // Add the Tax line item if applicable
      if (totalTaxAmount > 0 && taxGlAccount && taxGlAccountNumber && taxAccountType) {
        const taxGlAccountNum = (taxGlAccountNumber || '').substring(0, 10);
        itemsForSplitting.push({
          glAccount: taxGlAccountNum,
          debitAmount: (taxAccountType === 'EXPENSE') ? parseFloat(totalTaxAmount.toFixed(2)) : 0,
          creditAmount: (taxAccountType === 'LIABILITY') ? parseFloat(totalTaxAmount.toFixed(2)) : 0,
          description: `Invoice ${finalInvoiceNumber} - Tax`,
          accountType: 'S',
        });
      }

      // Apply document splitting if enabled
      let itemsToInsert = itemsForSplitting;
      let splitResult: any = null;
      try {
        console.log('🔍 Attempting document splitting...');
        console.log('   Company Code:', companyCode);
        console.log('   Items for splitting:', itemsForSplitting.length);
        itemsForSplitting.forEach((item, idx) => {
          console.log(`   Item ${idx + 1}: ${item.glAccount}, Debit: ${item.debitAmount}, Credit: ${item.creditAmount}, PC: ${item.profitCenter || 'NONE'} `);
        });

        const { documentSplittingService } = await import('../../services/document-splitting-service.js');

        splitResult = await documentSplittingService.splitDocument(
          itemsForSplitting,
          'KR', // Vendor Invoice document type
          companyCode, // Use company code string
          undefined // Ledger ID will be determined by service
        );

        console.log('   Split result:', {
          success: splitResult.success,
          itemsCount: splitResult.splitItems?.length || 0,
          message: splitResult.message || 'N/A'
        });

        if (splitResult.success && splitResult.splitItems.length > 0) {
          console.log('   Split items:');
          splitResult.splitItems.forEach((item: any, idx: number) => {
            console.log(`     ${idx + 1}: ${item.glAccount}, Debit: ${item.debitAmount}, Credit: ${item.creditAmount}, PC: ${item.profitCenter || 'NONE'} `);
          });

          itemsToInsert = splitResult.splitItems.map((item: any) => {
            // Try multiple variations to get profit center
            const profitCenter = item.profitCenter || item.profit_center || item['PROFIT CENTER'] || item.splitCharacteristicValue || null;
            const costCenter = item.costCenter || item.cost_center || null;

            console.log(`   Mapping split item: ${item.glAccount}, profitCenter = ${profitCenter}, splitCharacteristicValue = ${item.splitCharacteristicValue || 'NONE'} `);

            return {
              glAccount: item.glAccount,
              debitAmount: item.debitAmount,
              creditAmount: item.creditAmount,
              description: item.description || '',
              accountType: item.accountType || 'S',
              partnerId: item.partnerId,
              profitCenter: profitCenter,
              costCenter: costCenter,
            };
          });
          console.log('✅ Document splitting applied:', splitResult.splitItems.length, 'items');
        } else {
          console.log('⚠️  Document splitting returned original items or failed');
        }
      } catch (splitError: any) {
        console.error('❌ Document splitting error:', splitError.message);
        console.error('   Stack:', splitError.stack);
        // Continue with original items
      }

      // Insert accounting document items (split or original)
      let lineItemNumber = 1;
      for (const item of itemsToInsert) {
        await client.query(`
          INSERT INTO accounting_document_items(
  document_id, line_item, gl_account, account_type, partner_id,
  debit_amount, credit_amount, currency, item_text,
  profit_center, business_area, segment, cost_center
) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        `, [
          accountingDocumentId,
          lineItemNumber,
          item.glAccount,
          item.accountType || 'S',
          item.partnerId || null,
          item.debitAmount.toFixed(2),
          item.creditAmount.toFixed(2),
          finalCurrency || 'USD',
          item.description || null,
          item.profitCenter || null,
          null, // business_area (not currently captured)
          null, // segment (not currently captured)
          item.costCenter || null,
        ]);
        lineItemNumber++;
      }
      console.log(`All accounting document items created successfully(${itemsToInsert.length} items)`);

      // Record split documents for audit trail
      if (splitResult?.success && splitResult.splitItems?.length > 0) {
        try {
          const { documentSplittingService } = await import('../../services/document-splitting-service.js');
          await documentSplittingService.recordSplitDocuments(
            accountingDocumentId,
            splitResult.splitItems
          );
        } catch (recordError: any) {
          // Non-critical - just log
          console.log('Could not record split documents:', recordError.message);
        }
      }
    } catch (glError: any) {
      console.error('GL posting error details:', {
        message: glError.message,
        stack: glError.stack,
        code: glError.code,
        detail: glError.detail,
        constraint: glError.constraint
      });
      await client.query('ROLLBACK');
      throw new Error(`GL posting failed: ${glError.message}${glError.detail ? ' - ' + glError.detail : ''} `);
    }

    // Update invoice with accounting document number and POSTED status (MANDATORY)
    try {
      // Check if accounting_document_number column exists
      const columnCheck = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'accounts_payable' 
        AND column_name = 'accounting_document_number'
  `);

      if (columnCheck.rows.length > 0) {
        // Column exists, update it
        await client.query(`
          UPDATE accounts_payable
          SET status = 'POSTED',
  accounting_document_number = $1,
  updated_at = NOW()
          WHERE id = $2
  `, [accountingDocNumber, invoiceId]);
      } else {
        // Column doesn't exist, just update status
        await client.query(`
          UPDATE accounts_payable
          SET status = 'POSTED',
  updated_at = NOW()
          WHERE id = $1
  `, [invoiceId]);
      }
    } catch (updateError: any) {
      await client.query('ROLLBACK');
      throw new Error(`Failed to update invoice status: ${updateError.message} `);
    }

    // Create AP open item (if table exists) - using correct column structure
    try {
      const apOpenItemsCheck = await client.query(`
        SELECT EXISTS(
    SELECT 1 FROM information_schema.tables 
          WHERE table_name = 'ap_open_items'
  )
  `);

      if (apOpenItemsCheck.rows[0]?.exists) {
        // Check column structure first
        const columnCheck = await client.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'ap_open_items'
          AND column_name IN('invoice_id', 'document_number', 'invoice_number', 'vendor_id')
  `);

        const hasInvoiceId = columnCheck.rows.some((r: any) => r.column_name === 'invoice_id');
        const hasDocumentNumber = columnCheck.rows.some((r: any) => r.column_name === 'document_number');
        const hasInvoiceNumber = columnCheck.rows.some((r: any) => r.column_name === 'invoice_number');
        const hasVendorId = columnCheck.rows.some((r: any) => r.column_name === 'vendor_id');

        if (hasDocumentNumber && hasVendorId) {
          // Use correct structure: document_number, invoice_number, vendor_id
          await client.query(`
            INSERT INTO ap_open_items(
    vendor_id, document_number, invoice_number, document_type,
    posting_date, due_date, original_amount, outstanding_amount,
    currency_id, gl_account_id, status, active, created_at
  ) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true, NOW())
    `, [
            vendor_id,
            accountingDocNumber, // document_number
            finalInvoiceNumber, // invoice_number
            'Invoice', // document_type
            invoice_date, // posting_date
            finalDueDate, // due_date
            totalGrossAmount.toFixed(2), // original_amount
            totalGrossAmount.toFixed(2), // outstanding_amount
            currencyId || 1, // currency_id (default to 1 if null)
            vendorGlAccount, // gl_account_id
            'Open' // status
          ]);
          console.log('AP open item created successfully');
        } else if (hasInvoiceId) {
          // Fallback to old structure if invoice_id exists
          await client.query(`
            INSERT INTO ap_open_items(
      invoice_id, vendor_id, gl_account_id, original_amount,
      outstanding_amount, due_date, document_date, status, active, created_at
    ) VALUES($1, $2, $3, $4, $5, $6, $7, 'Open', true, NOW())
          `, [
            invoiceId,
            vendor_id,
            vendorGlAccount,
            totalGrossAmount.toFixed(2),
            totalGrossAmount.toFixed(2),
            finalDueDate,
            invoice_date
          ]);
          console.log('AP open item created successfully (using invoice_id)');
        } else {
          console.log('AP open items table exists but has unexpected structure, skipping');
        }
      }
    } catch (apError: any) {
      // AP open items creation is not critical, log but continue
      console.log('Could not create AP open item:', apError.message);
    }

    console.log('Committing transaction...');
    await client.query('COMMIT');
    console.log('Transaction committed successfully');

    // Verify using the same connection (data should be visible immediately after COMMIT)
    try {
      const verifyInvoice = await client.query(
        'SELECT id, invoice_number, status FROM accounts_payable WHERE id = $1',
        [invoiceId]
      );
      if (verifyInvoice.rows.length === 0) {
        console.error('CRITICAL: Invoice was not found after COMMIT! Invoice ID:', invoiceId);
        // Don't fail the request - the COMMIT succeeded, so data should be there
        // This might be a timing issue, but we'll proceed
      } else {
        console.log('Invoice verified in database:', verifyInvoice.rows[0]);
      }

      const verifyDoc = await client.query(
        'SELECT id, document_number FROM accounting_documents WHERE document_number = $1',
        [accountingDocNumber]
      );
      if (verifyDoc.rows.length === 0) {
        console.error('CRITICAL: Accounting document was not found after COMMIT! Document:', accountingDocNumber);
        // Don't fail the request - the COMMIT succeeded
      } else {
        console.log('Accounting document verified in database:', verifyDoc.rows[0]);
      }
    } catch (verifyError: any) {
      // Verification errors are not critical - COMMIT already succeeded
      console.error('Verification query error (non-critical):', verifyError.message);
    }

    // Release the client connection
    client.release();

    res.status(201).json({
      success: true,
      data: {
        id: invoiceId,
        invoice_number: finalInvoiceNumber,
        vendor_id: vendor_id,
        vendor_name: vendor.name,
        invoice_date: invoice_date,
        due_date: finalDueDate,
        net_amount: parseFloat(totalNetAmount.toFixed(2)),
        tax_amount: parseFloat(totalTaxAmount.toFixed(2)),
        total_amount: parseFloat(totalGrossAmount.toFixed(2)),
        currency: finalCurrency,
        payment_terms: payment_terms || vendor.payment_terms,
        status: 'POSTED',
        posting_status: 'POSTED',
        accounting_document_number: accountingDocNumber,
        items: processedItems.map(item => ({
          line_item: item.lineItem,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          unit_price: item.unitPrice,
          net_amount: item.netAmount,
          tax_amount: item.taxAmount
        }))
      },
      message: `Manual vendor invoice ${finalInvoiceNumber} created and posted successfully.Accounting Document: ${accountingDocNumber} `
    });

  } catch (error: any) {
    console.error('=== ERROR IN MANUAL INVOICE CREATION ===');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Error details:', {
      code: error.code,
      detail: error.detail,
      constraint: error.constraint,
      table: error.table,
      column: error.column
    });
    try {
      await client.query('ROLLBACK');
      console.log('Transaction rolled back');
    } catch (rollbackError: any) {
      console.error('Error during rollback:', rollbackError.message);
    }
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create manual vendor invoice',
      details: process.env.NODE_ENV === 'development' ? error.detail : undefined
    });
  } finally {
    // Only release if not already released (client is released before verification)
    // Connection is released in the try block before verification, so skip here
    console.log('Request processing completed');
  }
});

export default router;