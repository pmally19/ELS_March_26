/**
 * Enterprise Transaction Registry CRUD Operations
 * Handles Sales to FI to GL integration with complete audit trail
 */

import { Router } from 'express';
import { db } from '../db';
import { sql } from 'drizzle-orm';

const router = Router();

// CREATE - Insert new enterprise transaction
router.post('/enterprise-transactions', async (req, res) => {
  try {
    const {
      business_entity_code,
      fiscal_period,
      transaction_category,
      source_application,
      reference_document,
      primary_account,
      offset_account,
      debit_amount = 0,
      credit_amount = 0,
      net_amount,
      currency_code = 'USD',
      cost_center_code,
      profit_center_code,
      customer_vendor_code,
      business_date,
      posting_date,
      created_by
    } = req.body;

    // Generate UUID for transaction
    const transaction_uuid = `ETR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Calculate base currency amount (assuming USD base)
    const base_currency_amount = net_amount;

    const result = await db.execute(sql`
      INSERT INTO enterprise_transaction_registry (
        transaction_uuid, business_entity_code, fiscal_period, transaction_category,
        source_application, reference_document, primary_account, offset_account,
        debit_amount, credit_amount, net_amount, base_currency_amount, currency_code,
        cost_center_code, profit_center_code, customer_vendor_code,
        business_date, posting_date, processing_status, approval_status,
        created_by, created_timestamp, version_number
      ) VALUES (
        ${transaction_uuid}, ${business_entity_code}, ${fiscal_period}, ${transaction_category},
        ${source_application}, ${reference_document}, ${primary_account}, ${offset_account},
        ${debit_amount}, ${credit_amount}, ${net_amount}, ${base_currency_amount}, ${currency_code},
        ${cost_center_code}, ${profit_center_code}, ${customer_vendor_code},
        ${business_date}, ${posting_date}, 'ACTIVE', 'APPROVED',
        ${created_by}, CURRENT_TIMESTAMP, 1
      ) RETURNING id, transaction_uuid, created_timestamp
    `);

    res.status(201).json({
      success: true,
      message: 'Enterprise transaction created successfully',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error creating enterprise transaction:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create enterprise transaction',
      error: error.message
    });
  }
});

// READ - Get enterprise transactions with filters
router.get('/enterprise-transactions', async (req, res) => {
  try {
    const {
      business_entity_code,
      transaction_category,
      source_application,
      date_from,
      date_to,
      processing_status = 'ACTIVE',
      limit = 100,
      offset = 0
    } = req.query;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (business_entity_code) {
      whereClause += ` AND business_entity_code = $${params.length + 1}`;
      params.push(business_entity_code);
    }

    if (transaction_category) {
      whereClause += ` AND transaction_category = $${params.length + 1}`;
      params.push(transaction_category);
    }

    if (source_application) {
      whereClause += ` AND source_application = $${params.length + 1}`;
      params.push(source_application);
    }

    if (date_from) {
      whereClause += ` AND business_date >= $${params.length + 1}`;
      params.push(date_from);
    }

    if (date_to) {
      whereClause += ` AND business_date <= $${params.length + 1}`;
      params.push(date_to);
    }

    if (processing_status) {
      whereClause += ` AND processing_status = $${params.length + 1}`;
      params.push(processing_status);
    }

    const queryText = `
      SELECT 
        id, transaction_uuid, business_entity_code, fiscal_period,
        transaction_category, source_application, reference_document,
        primary_account, offset_account, debit_amount, credit_amount, net_amount,
        currency_code, cost_center_code, profit_center_code, customer_vendor_code,
        business_date, posting_date, processing_status, approval_status,
        created_timestamp, modified_timestamp, version_number
      FROM enterprise_transaction_registry
      ${whereClause}
      ORDER BY created_timestamp DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    params.push(limit, offset);

    const result = await db.execute(sql.raw(queryText, params));

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM enterprise_transaction_registry
      ${whereClause}
    `;
    const countResult = await db.execute(sql.raw(countQuery, params.slice(0, -2)));

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        total: parseInt(countResult.rows[0].total),
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });

  } catch (error) {
    console.error('Error fetching enterprise transactions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch enterprise transactions',
      error: error.message
    });
  }
});

// READ - Get single enterprise transaction by ID or UUID
router.get('/enterprise-transactions/:identifier', async (req, res) => {
  try {
    const { identifier } = req.params;
    
    // Check if identifier is UUID or ID
    const isUUID = identifier.includes('-');
    const field = isUUID ? 'transaction_uuid' : 'id';

    const result = await db.execute(sql`
      SELECT * FROM enterprise_transaction_registry 
      WHERE ${sql.raw(field)} = ${identifier}
    `);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Enterprise transaction not found'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error fetching enterprise transaction:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch enterprise transaction',
      error: error.message
    });
  }
});

// UPDATE - Modify enterprise transaction (with audit trail)
router.put('/enterprise-transactions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      processing_status,
      approval_status,
      notes,
      modified_by,
      ...updateFields
    } = req.body;

    // Get current record for audit trail
    const currentRecord = await db.execute(sql`
      SELECT * FROM enterprise_transaction_registry WHERE id = ${id}
    `);

    if (currentRecord.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Enterprise transaction not found'
      });
    }

    const current = currentRecord.rows[0];
    
    // Build audit trail
    const auditTrail = {
      previous_version: current.version_number,
      modified_by: modified_by,
      modified_at: new Date().toISOString(),
      changes: {},
      notes: notes || 'Transaction updated'
    };

    // Track changes
    Object.keys(updateFields).forEach(key => {
      if (current[key] !== updateFields[key]) {
        auditTrail.changes[key] = {
          from: current[key],
          to: updateFields[key]
        };
      }
    });

    // Update record
    const updateQuery = `
      UPDATE enterprise_transaction_registry 
      SET 
        processing_status = COALESCE($1, processing_status),
        approval_status = COALESCE($2, approval_status),
        notes = COALESCE($3, notes),
        modified_by = $4,
        modified_timestamp = CURRENT_TIMESTAMP,
        version_number = version_number + 1,
        audit_trail = COALESCE(audit_trail, '[]'::jsonb) || $5::jsonb
      WHERE id = $6
      RETURNING id, transaction_uuid, version_number, modified_timestamp
    `;

    const result = await db.execute(sql.raw(updateQuery, [
      processing_status,
      approval_status,
      notes,
      modified_by,
      JSON.stringify([auditTrail]),
      id
    ]));

    res.json({
      success: true,
      message: 'Enterprise transaction updated successfully',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error updating enterprise transaction:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update enterprise transaction',
      error: error.message
    });
  }
});

// DELETE - Soft delete (mark as CANCELLED)
router.delete('/enterprise-transactions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { deleted_by, reason } = req.body;

    const result = await db.execute(sql`
      UPDATE enterprise_transaction_registry 
      SET 
        processing_status = 'CANCELLED',
        notes = COALESCE(notes || ' | ', '') || 'CANCELLED: ' || ${reason || 'No reason provided'},
        modified_by = ${deleted_by},
        modified_timestamp = CURRENT_TIMESTAMP,
        version_number = version_number + 1
      WHERE id = ${id} AND processing_status != 'CANCELLED'
      RETURNING id, transaction_uuid, processing_status
    `);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Enterprise transaction not found or already cancelled'
      });
    }

    res.json({
      success: true,
      message: 'Enterprise transaction cancelled successfully',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('Error cancelling enterprise transaction:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel enterprise transaction',
      error: error.message
    });
  }
});

// ANALYTICS - Sales to FI to GL flow analysis
router.get('/analytics/sales-to-gl-flow', async (req, res) => {
  try {
    const { date_from, date_to, business_entity_code } = req.query;

    let whereClause = "WHERE transaction_category IN ('SALES', 'PURCHASE', 'PRODUCTION')";
    const params = [];

    if (date_from) {
      whereClause += ` AND business_date >= $${params.length + 1}`;
      params.push(date_from);
    }

    if (date_to) {
      whereClause += ` AND business_date <= $${params.length + 1}`;
      params.push(date_to);
    }

    if (business_entity_code) {
      whereClause += ` AND business_entity_code = $${params.length + 1}`;
      params.push(business_entity_code);
    }

    const analyticsQuery = `
      SELECT 
        transaction_category,
        source_application,
        COUNT(*) as transaction_count,
        SUM(CASE WHEN debit_amount > 0 THEN debit_amount ELSE 0 END) as total_debits,
        SUM(CASE WHEN credit_amount > 0 THEN credit_amount ELSE 0 END) as total_credits,
        SUM(net_amount) as net_impact,
        COUNT(DISTINCT reference_document) as unique_documents,
        COUNT(DISTINCT customer_vendor_code) as unique_partners,
        MIN(business_date) as earliest_transaction,
        MAX(business_date) as latest_transaction
      FROM enterprise_transaction_registry
      ${whereClause}
      GROUP BY transaction_category, source_application
      ORDER BY ABS(SUM(net_amount)) DESC
    `;

    const result = await db.execute(sql.raw(analyticsQuery, params));

    res.json({
      success: true,
      message: 'Sales to GL flow analysis completed',
      data: result.rows,
      summary: {
        total_categories: result.rows.length,
        analysis_period: {
          from: date_from || 'All time',
          to: date_to || 'Present'
        }
      }
    });

  } catch (error) {
    console.error('Error in sales to GL flow analysis:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to analyze sales to GL flow',
      error: error.message
    });
  }
});

export default router;