import express from 'express';
import { arOpenItemsService } from '../../services/arOpenItemsService';
import { db } from '../../db';
import { sql } from 'drizzle-orm';

const router = express.Router();

// Get AR open items ready to clear
router.get('/', async (req, res) => {
  try {
    const { status, customerId } = req.query;

    let query = sql`
      SELECT 
        aoi.*,
        bd.billing_number,
        ec.customer_name,
        ec.customer_code
      FROM ar_open_items aoi
      LEFT JOIN billing_documents bd ON aoi.billing_document_id = bd.id
      LEFT JOIN erp_customers ec ON aoi.customer_id = ec.id
      WHERE aoi.active = true
    `;

    if (status === 'ready_to_clear') {
      // Get status values from system configuration
      const statusConfigResult = await db.execute(sql`
        SELECT 
          (SELECT config_value FROM system_configuration WHERE config_key = 'ar_status_open' AND active = true LIMIT 1) as open_status,
          (SELECT config_value FROM system_configuration WHERE config_key = 'ar_status_partial' AND active = true LIMIT 1) as partial_status
      `);

      const openStatus = String(statusConfigResult.rows[0]?.open_status || '');
      const partialStatus = String(statusConfigResult.rows[0]?.partial_status || '');

      query = sql`
        SELECT 
          aoi.*,
          bd.billing_number,
          ec.customer_name,
          ec.customer_code
        FROM ar_open_items aoi
        LEFT JOIN billing_documents bd ON aoi.billing_document_id = bd.id
        LEFT JOIN erp_customers ec ON aoi.customer_id = ec.id
        WHERE aoi.active = true
          AND aoi.outstanding_amount <= 0.01
          AND (aoi.status = ${openStatus} OR aoi.status = ${partialStatus})
      `;
    }

    if (customerId) {
      query = sql`${query} AND aoi.customer_id = ${parseInt(String(customerId))}`;
    }

    query = sql`${query} ORDER BY aoi.due_date ASC, aoi.created_at ASC`;

    const result = await db.execute(query);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error: any) {
    console.error('Error fetching AR open items:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch AR open items'
    });
  }
});

// Get AR open item by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.execute(sql`
      SELECT 
        aoi.*,
        bd.billing_number,
        ec.customer_name,
        ec.customer_code
      FROM ar_open_items aoi
      LEFT JOIN billing_documents bd ON aoi.billing_document_id = bd.id
      LEFT JOIN erp_customers ec ON aoi.customer_id = ec.id
      WHERE aoi.id = ${parseInt(id)} AND aoi.active = true
    `);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'AR open item not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });
  } catch (error: any) {
    console.error('Error fetching AR open item:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch AR open item'
    });
  }
});

export default router;

