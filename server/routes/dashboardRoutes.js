import express from 'express';
import { pool } from '../db';

const router = express.Router();

// Get dashboard config for a user
router.get('/config', async (req, res) => {
  try {
    // Query to get saved dashboard configuration
    // This would be enhanced with user-specific configs in a production app
    const result = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'dashboard_configs'
      );
    `);
    
    if (result.rows[0].exists) {
      const configResult = await pool.query(`
        SELECT config 
        FROM dashboard_configs 
        WHERE user_id = $1 
        ORDER BY created_at DESC 
        LIMIT 1
      `, [1]); // Default user ID 1
      
      if (configResult.rows.length > 0) {
        return res.json(configResult.rows[0].config);
      }
    }
    
    // Default configuration if none exists
    return res.json({
      widgets: []
    });
  } catch (error) {
    console.error('Error fetching dashboard config:', error);
    res.status(500).json({ message: 'Failed to fetch dashboard configuration' });
  }
});

// Save dashboard config for a user
router.post('/config', async (req, res) => {
  try {
    const { widgets } = req.body;
    
    // Create the table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS dashboard_configs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL,
        config JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Save the configuration
    const result = await pool.query(`
      INSERT INTO dashboard_configs (user_id, config)
      VALUES ($1, $2)
      RETURNING id
    `, [1, { widgets }]); // Default user ID 1
    
    res.status(201).json({ 
      message: 'Dashboard configuration saved',
      id: result.rows[0].id
    });
  } catch (error) {
    console.error('Error saving dashboard config:', error);
    res.status(500).json({ message: 'Failed to save dashboard configuration' });
  }
});

// Get sales metrics for dashboard
router.get('/sales-metrics', async (req, res) => {
  try {
    // Check if sales_invoices table exists
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'sales_invoices'
      );
    `);
    
    if (tableExists.rows[0].exists) {
      // Query actual sales metrics
      const result = await pool.query(`
        SELECT
          COUNT(*) as total_invoices,
          SUM(grand_total) as total_revenue,
          AVG(grand_total) as average_order_value,
          COUNT(DISTINCT customer_name) as unique_customers
        FROM sales_invoices
        WHERE invoice_date >= NOW() - INTERVAL '30 days'
      `);
      
      if (result.rows.length > 0) {
        return res.json({
          totalInvoices: parseInt(result.rows[0].total_invoices) || 0,
          totalRevenue: parseFloat(result.rows[0].total_revenue) || 0,
          averageOrderValue: parseFloat(result.rows[0].average_order_value) || 0,
          uniqueCustomers: parseInt(result.rows[0].unique_customers) || 0
        });
      }
    }
    
    // Return sample data if table doesn't exist or query fails
    res.json({
      totalInvoices: 157,
      totalRevenue: 283450.75,
      averageOrderValue: 1805.42,
      uniqueCustomers: 89
    });
  } catch (error) {
    console.error('Error fetching sales metrics:', error);
    res.status(500).json({ message: 'Failed to fetch sales metrics' });
  }
});

// Get inventory metrics for dashboard
router.get('/inventory-metrics', async (req, res) => {
  try {
    // Check if inventory tables exist
    const materialsExist = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'materials'
      );
    `);
    
    if (materialsExist.rows[0].exists) {
      // Query actual inventory data
      const result = await pool.query(`
        SELECT
          COUNT(*) as total_items,
          SUM(CASE WHEN quantity <= reorder_point THEN 1 ELSE 0 END) as low_stock_items,
          SUM(quantity * unit_price) as inventory_value
        FROM materials
      `);
      
      if (result.rows.length > 0) {
        return res.json({
          totalItems: parseInt(result.rows[0].total_items) || 0,
          lowStockItems: parseInt(result.rows[0].low_stock_items) || 0,
          inventoryValue: parseFloat(result.rows[0].inventory_value) || 0
        });
      }
    }
    
    // Return sample data if table doesn't exist or query fails
    res.json({
      totalItems: 245,
      lowStockItems: 18,
      inventoryValue: 187325.50
    });
  } catch (error) {
    console.error('Error fetching inventory metrics:', error);
    res.status(500).json({ message: 'Failed to fetch inventory metrics' });
  }
});

// Get available widget types
router.get('/widget-types', (req, res) => {
  const widgetTypes = [
    {
      id: 'sales-overview',
      name: 'Sales Overview',
      description: 'Key sales metrics and trends',
      category: 'sales',
      minWidth: 2,
      defaultHeight: 'medium'
    },
    {
      id: 'revenue-by-category',
      name: 'Revenue by Category',
      description: 'Pie chart showing revenue distribution',
      category: 'sales',
      minWidth: 1,
      defaultHeight: 'medium'
    },
    {
      id: 'inventory-status',
      name: 'Inventory Status',
      description: 'Current inventory levels and alerts',
      category: 'inventory',
      minWidth: 1,
      defaultHeight: 'medium'
    },
    {
      id: 'top-products',
      name: 'Top Selling Products',
      description: 'Most popular products by sales volume',
      category: 'sales',
      minWidth: 1,
      defaultHeight: 'medium'
    },
    {
      id: 'recent-activity',
      name: 'Recent Activity',
      description: 'Latest system events and activities',
      category: 'system',
      minWidth: 1,
      defaultHeight: 'medium'
    },
    {
      id: 'purchase-orders',
      name: 'Purchase Orders',
      description: 'Recent and pending purchase orders',
      category: 'purchasing',
      minWidth: 1,
      defaultHeight: 'medium'
    },
    {
      id: 'production-status',
      name: 'Production Status',
      description: 'Current production orders and capacity',
      category: 'production',
      minWidth: 1,
      defaultHeight: 'medium'
    },
    {
      id: 'finance-summary',
      name: 'Finance Summary',
      description: 'Key financial metrics and status',
      category: 'finance',
      minWidth: 1,
      defaultHeight: 'medium'
    },
    // Custom specialized widgets
    {
      id: 'production-summary',
      name: 'Production Summary',
      description: 'Detailed summary of production activities',
      category: 'production',
      minWidth: 2,
      defaultHeight: 'medium'
    },
    {
      id: 'orders-comparison',
      name: 'Orders Comparison',
      description: 'Compare orders between time periods',
      category: 'sales',
      minWidth: 2,
      defaultHeight: 'medium'
    },
    {
      id: 'orders-key-metrics',
      name: 'Orders Key Metrics',
      description: 'Important metrics for order management',
      category: 'sales',
      minWidth: 2,
      defaultHeight: 'medium'
    }
  ];
  
  res.json(widgetTypes);
});

// Get orders sales metrics for the Orders Key Metrics widget
router.get('/sales/orders-metrics', async (req, res) => {
  try {
    // Check if sales_orders table exists
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'sales_orders'
      );
    `);
    
    if (tableExists.rows[0].exists) {
      // Get current period data
      const currentPeriodData = await pool.query(`
        SELECT
          COUNT(*) as total_orders,
          SUM(total_amount) as total_order_value,
          AVG(total_amount) as average_order_value,
          COUNT(CASE WHEN status = 'Completed' OR status = 'Delivered' THEN 1 END)::float / 
            NULLIF(COUNT(*), 0) as order_completion
        FROM sales_orders
        WHERE created_at >= NOW() - INTERVAL '30 days'
      `);
      
      // Get previous period data for comparison
      const previousPeriodData = await pool.query(`
        SELECT
          COUNT(*) as total_orders,
          SUM(total_amount) as total_order_value,
          AVG(total_amount) as average_order_value,
          COUNT(CASE WHEN status = 'Completed' OR status = 'Delivered' THEN 1 END)::float / 
            NULLIF(COUNT(*), 0) as order_completion
        FROM sales_orders
        WHERE created_at >= NOW() - INTERVAL '60 days' AND created_at < NOW() - INTERVAL '30 days'
      `);
      
      // Calculate percentage changes
      const current = currentPeriodData.rows[0];
      const previous = previousPeriodData.rows[0];
      
      const calculatePercentageChange = (current, previous) => {
        if (!previous || previous === 0) return 0;
        return ((current - previous) / previous) * 100;
      };
      
      const metrics = {
        totalOrders: parseInt(current.total_orders) || 0,
        totalOrderValue: parseFloat(current.total_order_value) || 0,
        averageOrderValue: parseFloat(current.average_order_value) || 0,
        orderCompletion: parseFloat(current.order_completion) || 0,
        changePercentages: {
          totalOrders: calculatePercentageChange(
            parseInt(current.total_orders) || 0, 
            parseInt(previous.total_orders) || 0
          ),
          totalOrderValue: calculatePercentageChange(
            parseFloat(current.total_order_value) || 0, 
            parseFloat(previous.total_order_value) || 0
          ),
          averageOrderValue: calculatePercentageChange(
            parseFloat(current.average_order_value) || 0, 
            parseFloat(previous.average_order_value) || 0
          ),
          orderCompletion: calculatePercentageChange(
            parseFloat(current.order_completion) || 0, 
            parseFloat(previous.order_completion) || 0
          )
        }
      };
      
      return res.json(metrics);
    }
    
    // Return sample data if table doesn't exist or query fails
    res.json({
      totalOrders: 254,
      totalOrderValue: 125783.42,
      averageOrderValue: 495.21,
      orderCompletion: 0.92,
      changePercentages: {
        totalOrders: 12.5,
        totalOrderValue: 18.7,
        averageOrderValue: 5.3,
        orderCompletion: -2.1
      }
    });
  } catch (error) {
    console.error('Error fetching orders metrics:', error);
    res.status(500).json({ message: 'Failed to fetch orders metrics' });
  }
});

// Get orders comparison data for the Orders Comparison widget
router.get('/sales/orders-comparison', async (req, res) => {
  try {
    const type = req.query.type || 'monthly';
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'sales_orders'
      );
    `);
    
    if (tableExists.rows[0].exists) {
      let sqlQuery;
      let currentPeriodStart, previousPeriodStart;
      let currentPeriodEnd = 'NOW()';
      let previousPeriodEnd;
      let groupByFormat;
      
      // Set time periods and formats based on comparison type
      if (type === 'monthly') {
        currentPeriodStart = "NOW() - INTERVAL '6 months'";
        previousPeriodStart = "NOW() - INTERVAL '12 months'";
        previousPeriodEnd = "NOW() - INTERVAL '6 months'";
        groupByFormat = "TO_CHAR(created_at, 'Mon')";
      } else if (type === 'quarterly') {
        currentPeriodStart = "NOW() - INTERVAL '12 months'";
        previousPeriodStart = "NOW() - INTERVAL '24 months'";
        previousPeriodEnd = "NOW() - INTERVAL '12 months'";
        groupByFormat = "CONCAT('Q', EXTRACT(QUARTER FROM created_at))";
      } else { // weekly
        currentPeriodStart = "NOW() - INTERVAL '7 days'";
        previousPeriodStart = "NOW() - INTERVAL '14 days'";
        previousPeriodEnd = "NOW() - INTERVAL '7 days'";
        groupByFormat = "TO_CHAR(created_at, 'Dy')";
      }
      
      // Query for current period
      const currentPeriodQuery = `
        SELECT 
          ${groupByFormat} as period_name,
          COUNT(*) as order_count
        FROM 
          sales_orders
        WHERE 
          created_at >= ${currentPeriodStart} AND created_at <= ${currentPeriodEnd}
        GROUP BY 
          ${groupByFormat}
        ORDER BY 
          MIN(created_at)
      `;
      
      // Query for previous period
      const previousPeriodQuery = `
        SELECT 
          ${groupByFormat} as period_name,
          COUNT(*) as order_count
        FROM 
          sales_orders
        WHERE 
          created_at >= ${previousPeriodStart} AND created_at <= ${previousPeriodEnd}
        GROUP BY 
          ${groupByFormat}
        ORDER BY 
          MIN(created_at)
      `;
      
      const currentPeriodResult = await pool.query(currentPeriodQuery);
      const previousPeriodResult = await pool.query(previousPeriodQuery);
      
      // Transform results into required format
      const currentPeriodData = currentPeriodResult.rows.reduce((acc, row) => {
        acc[row.period_name] = parseInt(row.order_count);
        return acc;
      }, {});
      
      const previousPeriodData = previousPeriodResult.rows.reduce((acc, row) => {
        acc[row.period_name] = parseInt(row.order_count);
        return acc;
      }, {});
      
      // Combine data for all periods
      const allPeriods = new Set([
        ...Object.keys(currentPeriodData),
        ...Object.keys(previousPeriodData)
      ]);
      
      const comparisonData = Array.from(allPeriods).map(periodName => ({
        name: periodName,
        current: currentPeriodData[periodName] || 0,
        previous: previousPeriodData[periodName] || 0
      }));
      
      return res.json(comparisonData);
    }
    
    // Return sample data if table doesn't exist or query fails
    let comparisonData;
    
    if (type === 'monthly') {
      comparisonData = [
        { name: "Jan", current: 65, previous: 50 },
        { name: "Feb", current: 59, previous: 55 },
        { name: "Mar", current: 80, previous: 65 },
        { name: "Apr", current: 81, previous: 75 },
        { name: "May", current: 56, previous: 60 },
        { name: "Jun", current: 55, previous: 50 }
      ];
    } else if (type === 'quarterly') {
      comparisonData = [
        { name: "Q1", current: 180, previous: 150 },
        { name: "Q2", current: 220, previous: 185 },
        { name: "Q3", current: 240, previous: 195 },
        { name: "Q4", current: 280, previous: 225 }
      ];
    } else { // weekly
      comparisonData = [
        { name: "Mon", current: 12, previous: 10 },
        { name: "Tue", current: 15, previous: 12 },
        { name: "Wed", current: 18, previous: 15 },
        { name: "Thu", current: 14, previous: 13 },
        { name: "Fri", current: 20, previous: 17 },
        { name: "Sat", current: 23, previous: 20 },
        { name: "Sun", current: 17, previous: 15 }
      ];
    }
    
    res.json(comparisonData);
  } catch (error) {
    console.error('Error fetching orders comparison data:', error);
    res.status(500).json({ message: 'Failed to fetch orders comparison data' });
  }
});

export default router;