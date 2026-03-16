/**
 * AR Advanced Reporting Routes
 * Cash flow forecasting, DSO analysis, customer profitability, collection effectiveness
 */

import express from 'express';
import pkg from 'pg';
const { Pool } = pkg;
const router = express.Router();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// 4. ADVANCED REPORTING

// Cash Flow Forecasting
router.get('/cash-flow-forecast', async (req, res) => {
  try {
    const { days_ahead = 90 } = req.query;
    
    const result = await pool.query(`
      WITH forecast_periods AS (
        SELECT 
          date_trunc('week', CURRENT_DATE + (interval '1 week' * generate_series(0, ${days_ahead}/7))) as period_start,
          date_trunc('week', CURRENT_DATE + (interval '1 week' * generate_series(1, ${days_ahead}/7 + 1))) as period_end
      ),
      expected_collections AS (
        SELECT 
          fp.period_start,
          fp.period_end,
          SUM(i.amount) as expected_amount,
          COUNT(i.id) as invoice_count,
          AVG(EXTRACT(days FROM (i.due_date - i.invoice_date))) as avg_collection_days
        FROM forecast_periods fp
        LEFT JOIN invoices i ON i.due_date >= fp.period_start 
          AND i.due_date < fp.period_end 
          AND i.status != 'paid'
        GROUP BY fp.period_start, fp.period_end
        ORDER BY fp.period_start
      )
      SELECT 
        period_start,
        period_end,
        COALESCE(expected_amount, 0) as expected_collections,
        COALESCE(invoice_count, 0) as invoices_due,
        COALESCE(avg_collection_days, 0) as avg_collection_days,
        -- Apply collection probability based on aging
        COALESCE(expected_amount, 0) * 
          CASE 
            WHEN avg_collection_days <= 30 THEN 0.95
            WHEN avg_collection_days <= 60 THEN 0.85
            WHEN avg_collection_days <= 90 THEN 0.70
            ELSE 0.50
          END as probable_collections
      FROM expected_collections
    `);

    res.json({
      forecast_period_days: days_ahead,
      forecast_data: result.rows,
      total_expected: result.rows.reduce((sum, row) => sum + parseFloat(row.expected_collections || 0), 0),
      total_probable: result.rows.reduce((sum, row) => sum + parseFloat(row.probable_collections || 0), 0)
    });
  } catch (error) {
    console.error('Error generating cash flow forecast:', error);
    res.status(500).json({ error: 'Failed to generate cash flow forecast' });
  }
});

// DSO (Days Sales Outstanding) Analysis
router.get('/dso-analysis', async (req, res) => {
  try {
    const result = await pool.query(`
      WITH monthly_sales AS (
        SELECT 
          date_trunc('month', invoice_date) as month,
          SUM(amount) as total_sales,
          COUNT(*) as invoice_count
        FROM invoices
        WHERE invoice_date >= CURRENT_DATE - INTERVAL '12 months'
        GROUP BY date_trunc('month', invoice_date)
      ),
      monthly_ar AS (
        SELECT 
          date_trunc('month', invoice_date) as month,
          SUM(
            CASE WHEN status != 'paid' THEN amount ELSE 0 END
          ) as outstanding_ar
        FROM invoices
        WHERE invoice_date >= CURRENT_DATE - INTERVAL '12 months'
        GROUP BY date_trunc('month', invoice_date)
      ),
      dso_calculation AS (
        SELECT 
          s.month,
          s.total_sales,
          s.invoice_count,
          ar.outstanding_ar,
          CASE 
            WHEN s.total_sales > 0 THEN 
              (ar.outstanding_ar / s.total_sales) * 30
            ELSE 0 
          END as dso_days
        FROM monthly_sales s
        LEFT JOIN monthly_ar ar ON s.month = ar.month
      )
      SELECT 
        month,
        total_sales,
        invoice_count,
        outstanding_ar,
        ROUND(dso_days, 2) as dso_days,
        LAG(dso_days) OVER (ORDER BY month) as previous_dso,
        ROUND(dso_days - LAG(dso_days) OVER (ORDER BY month), 2) as dso_change
      FROM dso_calculation
      ORDER BY month DESC
    `);

    // Calculate overall DSO trend
    const avgDSO = result.rows.reduce((sum, row) => sum + parseFloat(row.dso_days || 0), 0) / result.rows.length;
    const recentDSO = result.rows[0]?.dso_days || 0;
    const trend = recentDSO > avgDSO ? 'deteriorating' : 'improving';

    res.json({
      monthly_dso: result.rows,
      average_dso: Math.round(avgDSO * 100) / 100,
      current_dso: recentDSO,
      trend: trend,
      benchmark_comparison: {
        excellent: '< 30 days',
        good: '30-45 days',
        average: '45-60 days',
        poor: '> 60 days',
        current_rating: 
          recentDSO < 30 ? 'excellent' :
          recentDSO < 45 ? 'good' :
          recentDSO < 60 ? 'average' : 'poor'
      }
    });
  } catch (error) {
    console.error('Error calculating DSO analysis:', error);
    res.status(500).json({ error: 'Failed to calculate DSO analysis' });
  }
});

// Customer Profitability Analysis
router.get('/customer-profitability', async (req, res) => {
  try {
    const result = await pool.query(`
      WITH customer_metrics AS (
        SELECT 
          c.id,
          c.name,
          c.code,
          ccm.credit_rating,
          ccm.credit_limit,
          ccm.current_balance,
          -- Revenue metrics
          COUNT(i.id) as total_invoices,
          SUM(i.amount) as total_revenue,
          AVG(i.amount) as avg_invoice_amount,
          -- Payment behavior
          AVG(
            CASE WHEN cp.payment_date IS NOT NULL THEN 
              EXTRACT(days FROM (cp.payment_date - i.due_date))
            ELSE 
              EXTRACT(days FROM (CURRENT_DATE - i.due_date))
            END
          ) as avg_payment_delay,
          -- Collection costs (estimated)
          COUNT(ca.id) * 25 as estimated_collection_costs,
          -- Risk score
          ccm.risk_score
        FROM customers c
        LEFT JOIN customer_credit_management ccm ON c.id = ccm.customer_id
        LEFT JOIN invoices i ON c.id = i.customer_id
        LEFT JOIN customer_payments cp ON i.id = cp.id
        LEFT JOIN collection_activities ca ON c.id = ca.customer_id
        WHERE i.invoice_date >= CURRENT_DATE - INTERVAL '12 months'
        GROUP BY c.id, c.name, c.code, ccm.credit_rating, ccm.credit_limit, 
                 ccm.current_balance, ccm.risk_score
      )
      SELECT 
        *,
        -- Profitability calculation
        total_revenue - estimated_collection_costs as net_profit,
        CASE 
          WHEN total_revenue > 0 THEN 
            ROUND(((total_revenue - estimated_collection_costs) / total_revenue) * 100, 2)
          ELSE 0 
        END as profit_margin_percent,
        -- Customer score (higher is better)
        CASE 
          WHEN total_revenue = 0 THEN 0
          ELSE ROUND(
            (total_revenue / 1000) * 0.4 +  -- Revenue weight
            (100 - COALESCE(risk_score, 50)) * 0.3 +  -- Risk weight (inverted)
            GREATEST(0, (30 - COALESCE(avg_payment_delay, 60))) * 0.3  -- Payment behavior weight
          , 2)
        END as customer_score,
        -- Classification
        CASE 
          WHEN total_revenue >= 50000 AND COALESCE(avg_payment_delay, 0) <= 15 THEN 'A+ Premium'
          WHEN total_revenue >= 25000 AND COALESCE(avg_payment_delay, 0) <= 30 THEN 'A High Value'
          WHEN total_revenue >= 10000 AND COALESCE(avg_payment_delay, 0) <= 45 THEN 'B Standard'
          WHEN total_revenue >= 5000 THEN 'C Basic'
          ELSE 'D Minimal'
        END as customer_classification
      FROM customer_metrics
      WHERE total_revenue > 0
      ORDER BY net_profit DESC, customer_score DESC
    `);

    // Calculate portfolio summary
    const totalRevenue = result.rows.reduce((sum, row) => sum + parseFloat(row.total_revenue || 0), 0);
    const totalProfit = result.rows.reduce((sum, row) => sum + parseFloat(row.net_profit || 0), 0);
    
    const classifications = result.rows.reduce((acc, row) => {
      acc[row.customer_classification] = (acc[row.customer_classification] || 0) + 1;
      return acc;
    }, {});

    res.json({
      customer_profitability: result.rows,
      portfolio_summary: {
        total_customers: result.rows.length,
        total_revenue: totalRevenue,
        total_profit: totalProfit,
        overall_margin: totalRevenue > 0 ? Math.round((totalProfit / totalRevenue) * 10000) / 100 : 0,
        customer_classifications: classifications
      }
    });
  } catch (error) {
    console.error('Error calculating customer profitability:', error);
    res.status(500).json({ error: 'Failed to calculate customer profitability' });
  }
});

// Collection Effectiveness Metrics
router.get('/collection-effectiveness', async (req, res) => {
  try {
    const result = await pool.query(`
      WITH collection_metrics AS (
        SELECT 
          date_trunc('month', ca.activity_date) as month,
          ca.activity_type,
          COUNT(*) as activity_count,
          COUNT(CASE WHEN ca.outcome LIKE '%payment%' OR ca.outcome LIKE '%paid%' THEN 1 END) as successful_activities,
          AVG(
            CASE WHEN ca.outcome LIKE '%payment%' OR ca.outcome LIKE '%paid%' THEN 1 ELSE 0 END
          ) as success_rate
        FROM collection_activities ca
        WHERE ca.activity_date >= CURRENT_DATE - INTERVAL '12 months'
        GROUP BY date_trunc('month', ca.activity_date), ca.activity_type
      ),
      monthly_collections AS (
        SELECT 
          date_trunc('month', cp.payment_date) as month,
          SUM(cp.payment_amount) as total_collected,
          COUNT(*) as payment_count,
          AVG(cp.payment_amount) as avg_payment_size
        FROM customer_payments cp
        WHERE cp.payment_date >= CURRENT_DATE - INTERVAL '12 months'
        GROUP BY date_trunc('month', cp.payment_date)
      ),
      monthly_overdue AS (
        SELECT 
          date_trunc('month', i.due_date) as month,
          SUM(CASE WHEN i.status != 'paid' AND i.due_date < CURRENT_DATE THEN i.amount ELSE 0 END) as overdue_amount,
          COUNT(CASE WHEN i.status != 'paid' AND i.due_date < CURRENT_DATE THEN 1 END) as overdue_count
        FROM invoices i
        WHERE i.due_date >= CURRENT_DATE - INTERVAL '12 months'
        GROUP BY date_trunc('month', i.due_date)
      )
      SELECT 
        COALESCE(cm.month, mc.month, mo.month) as month,
        cm.activity_type,
        COALESCE(cm.activity_count, 0) as collection_activities,
        COALESCE(cm.successful_activities, 0) as successful_activities,
        COALESCE(cm.success_rate, 0) as activity_success_rate,
        COALESCE(mc.total_collected, 0) as total_collected,
        COALESCE(mc.payment_count, 0) as payment_count,
        COALESCE(mc.avg_payment_size, 0) as avg_payment_size,
        COALESCE(mo.overdue_amount, 0) as overdue_amount,
        COALESCE(mo.overdue_count, 0) as overdue_count,
        CASE 
          WHEN COALESCE(mo.overdue_amount, 0) > 0 THEN 
            COALESCE(mc.total_collected, 0) / mo.overdue_amount
          ELSE 0 
        END as collection_efficiency_ratio
      FROM collection_metrics cm
      FULL OUTER JOIN monthly_collections mc ON cm.month = mc.month
      FULL OUTER JOIN monthly_overdue mo ON COALESCE(cm.month, mc.month) = mo.month
      ORDER BY month DESC, cm.activity_type
    `);

    // Calculate overall effectiveness metrics
    const totalCollected = result.rows.reduce((sum, row) => sum + parseFloat(row.total_collected || 0), 0);
    const totalOverdue = result.rows.reduce((sum, row) => sum + parseFloat(row.overdue_amount || 0), 0);
    const totalActivities = result.rows.reduce((sum, row) => sum + parseFloat(row.collection_activities || 0), 0);
    const totalSuccessful = result.rows.reduce((sum, row) => sum + parseFloat(row.successful_activities || 0), 0);

    res.json({
      monthly_effectiveness: result.rows,
      overall_metrics: {
        total_collected: totalCollected,
        total_overdue: totalOverdue,
        collection_rate: totalOverdue > 0 ? Math.round((totalCollected / totalOverdue) * 10000) / 100 : 0,
        total_activities: totalActivities,
        total_successful: totalSuccessful,
        overall_success_rate: totalActivities > 0 ? Math.round((totalSuccessful / totalActivities) * 10000) / 100 : 0,
        avg_cost_per_collection: totalSuccessful > 0 ? Math.round((totalActivities * 25) / totalSuccessful * 100) / 100 : 0
      }
    });
  } catch (error) {
    console.error('Error calculating collection effectiveness:', error);
    res.status(500).json({ error: 'Failed to calculate collection effectiveness' });
  }
});

// Aging Analysis with Detailed Buckets
router.get('/detailed-aging-analysis', async (req, res) => {
  try {
    const result = await pool.query(`
      WITH aging_buckets AS (
        SELECT 
          i.id,
          i.invoice_number,
          i.customer_id,
          c.name as customer_name,
          c.code as customer_code,
          ccm.credit_rating,
          i.amount,
          i.invoice_date,
          i.due_date,
          i.status,
          (CURRENT_DATE - i.due_date) as days_overdue,
          CASE 
            WHEN i.status = 'paid' THEN 'Paid'
            WHEN (CURRENT_DATE - i.due_date) <= 0 THEN 'Current'
            WHEN (CURRENT_DATE - i.due_date) BETWEEN 1 AND 30 THEN '1-30 Days'
            WHEN (CURRENT_DATE - i.due_date) BETWEEN 31 AND 60 THEN '31-60 Days'
            WHEN (CURRENT_DATE - i.due_date) BETWEEN 61 AND 90 THEN '61-90 Days'
            WHEN (CURRENT_DATE - i.due_date) BETWEEN 91 AND 120 THEN '91-120 Days'
            ELSE '120+ Days'
          END as aging_bucket
        FROM invoices i
        JOIN customers c ON i.customer_id = c.id
        LEFT JOIN customer_credit_management ccm ON c.id = ccm.customer_id
        WHERE i.status != 'paid'
      )
      SELECT 
        aging_bucket,
        COUNT(*) as invoice_count,
        SUM(amount) as total_amount,
        AVG(amount) as avg_invoice_amount,
        MIN(days_overdue) as min_days_overdue,
        MAX(days_overdue) as max_days_overdue,
        AVG(days_overdue) as avg_days_overdue,
        -- Risk assessment
        COUNT(CASE WHEN credit_rating IN ('C', 'D') THEN 1 END) as high_risk_count,
        SUM(CASE WHEN credit_rating IN ('C', 'D') THEN amount ELSE 0 END) as high_risk_amount
      FROM aging_buckets
      GROUP BY aging_bucket
      ORDER BY 
        CASE aging_bucket
          WHEN 'Current' THEN 1
          WHEN '1-30 Days' THEN 2
          WHEN '31-60 Days' THEN 3
          WHEN '61-90 Days' THEN 4
          WHEN '91-120 Days' THEN 5
          WHEN '120+ Days' THEN 6
          ELSE 7
        END
    `);

    // Calculate summary metrics
    const totalAmount = result.rows.reduce((sum, row) => sum + parseFloat(row.total_amount || 0), 0);
    const totalInvoices = result.rows.reduce((sum, row) => sum + parseInt(row.invoice_count || 0), 0);

    res.json({
      aging_analysis: result.rows.map(row => ({
        ...row,
        percentage_of_total: totalAmount > 0 ? Math.round((parseFloat(row.total_amount) / totalAmount) * 10000) / 100 : 0
      })),
      summary: {
        total_outstanding: totalAmount,
        total_invoices: totalInvoices,
        weighted_avg_days: result.rows.reduce((sum, row) => 
          sum + (parseFloat(row.avg_days_overdue || 0) * parseInt(row.invoice_count || 0)), 0) / totalInvoices
      }
    });
  } catch (error) {
    console.error('Error generating detailed aging analysis:', error);
    res.status(500).json({ error: 'Failed to generate detailed aging analysis' });
  }
});

export default router;