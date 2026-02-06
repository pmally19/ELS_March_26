import express, { Request, Response } from "express";
import { pool } from "../../db";
import { ensureActivePool } from "../../database";
import { sendDunningNotice } from "../../services/dunning-email";
import { executeDunningRun } from "../../services/dunning-scheduler";

const router = express.Router();

// Check if dunning tables exist (tables should be created via migration)
async function checkDunningTables(): Promise<boolean> {
  try {
    await pool.query('SELECT 1 FROM dunning_procedures LIMIT 1');
    await pool.query('SELECT 1 FROM dunning_history LIMIT 1');
    return true;
  } catch (error) {
    console.error('Dunning tables not found. Please run the migration: database/migrations/create-dunning-tables.sql');
    return false;
  }
}

// GET /api/dunning/procedures - Get all dunning procedures
router.get("/procedures", async (req: Request, res: Response) => {
  try {
    ensureActivePool();
    const tablesExist = await checkDunningTables();
    if (!tablesExist) {
      return res.status(503).json({ message: "Dunning tables not found. Please run the migration." });
    }

    const result = await pool.query(`
      SELECT 
        id,
        procedure_code,
        procedure_name,
        level1_days,
        level2_days,
        level3_days,
        final_notice_days,
        blocking_days,
        legal_action_days,
        minimum_amount,
        interest_rate,
        dunning_fee,
        is_active,
        created_at
      FROM dunning_procedures
      WHERE is_active = true
      ORDER BY procedure_code
    `);

    return res.json(result.rows);
  } catch (error: any) {
    console.error("Error fetching dunning procedures:", error);
    return res.status(500).json({ message: "Failed to fetch dunning procedures", error: error.message });
  }
});

// GET /api/dunning/history - Get dunning history with customer details
router.get("/history", async (req: Request, res: Response) => {
  try {
    ensureActivePool();
    const tablesExist = await checkDunningTables();
    if (!tablesExist) {
      return res.status(503).json({ message: "Dunning tables not found. Please run the migration." });
    }

    const { customer_id, status, level, limit = 100 } = req.query;

    let query = `
      SELECT 
        dh.id,
        dh.customer_id,
        dh.dunning_procedure_id,
        dh.invoice_id,
        dh.dunning_level,
        dh.dunning_date,
        dh.outstanding_amount,
        dh.dunning_amount,
        dh.interest_amount,
        dh.dunning_status,
        dh.dunning_text,
        dh.letter_sent,
        dh.email_sent,
        dh.response_date,
        dh.payment_received,
        dh.escalated_to_legal,
        dh.created_by,
        dh.created_at,
        c.customer_code,
        c.name as customer_name,
        c.email as customer_email,
        dp.procedure_code,
        dp.procedure_name
      FROM dunning_history dh
      LEFT JOIN erp_customers c ON dh.customer_id = c.id
      LEFT JOIN dunning_procedures dp ON dh.dunning_procedure_id = dp.id
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramCount = 1;

    if (customer_id) {
      query += ` AND dh.customer_id = $${paramCount}`;
      params.push(parseInt(String(customer_id)));
      paramCount++;
    }

    if (status) {
      query += ` AND dh.dunning_status = $${paramCount}`;
      params.push(String(status));
      paramCount++;
    }

    if (level) {
      query += ` AND dh.dunning_level = $${paramCount}`;
      params.push(parseInt(String(level)));
      paramCount++;
    }

    query += ` ORDER BY dh.dunning_date DESC, dh.created_at DESC LIMIT $${paramCount}`;
    params.push(parseInt(String(limit)));

    const result = await pool.query(query, params);

    return res.json(result.rows);
  } catch (error: any) {
    console.error("Error fetching dunning history:", error);
    return res.status(500).json({ message: "Failed to fetch dunning history", error: error.message });
  }
});

// GET /api/dunning/overdue-accounts - Get customers with overdue invoices for dunning
router.get("/overdue-accounts", async (req: Request, res: Response) => {
  try {
    ensureActivePool();

    const { procedure_id, min_amount } = req.query;

    // Get dunning procedure configuration
    let procedureConfig = null;
    if (procedure_id) {
      const procResult = await pool.query(
        'SELECT * FROM dunning_procedures WHERE id = $1 AND is_active = true',
        [parseInt(String(procedure_id))]
      );
      if (procResult.rows.length > 0) {
        procedureConfig = procResult.rows[0];
      }
    }

    // Get overdue invoices from billing_documents
    let query = `
      SELECT 
        c.id as customer_id,
        c.customer_code,
        c.name as customer_name,
        c.email as customer_email,
        c.phone as customer_phone,
        COALESCE(SUM(COALESCE(bd.outstanding_amount, bd.total_amount - COALESCE(bd.paid_amount, 0), bd.total_amount)), 0) as total_overdue,
        COUNT(bd.id) as overdue_invoice_count,
        MAX(bd.due_date) as oldest_due_date,
        MIN(bd.due_date) as newest_due_date,
        (CURRENT_DATE - MAX(bd.due_date))::integer as days_overdue
      FROM erp_customers c
      INNER JOIN billing_documents bd ON c.id = bd.customer_id
      WHERE COALESCE(bd.outstanding_amount, bd.total_amount - COALESCE(bd.paid_amount, 0), bd.total_amount) > 0
        AND bd.due_date IS NOT NULL
        AND bd.due_date < CURRENT_DATE
        AND (bd.posting_status = 'POSTED' OR bd.posting_status = 'OPEN')
        AND c.is_active = true
    `;

    const params: any[] = [];
    let paramCount = 1;

    if (min_amount) {
      query += ` AND COALESCE(bd.outstanding_amount, bd.total_amount - COALESCE(bd.paid_amount, 0), bd.total_amount) >= $${paramCount}`;
      params.push(parseFloat(String(min_amount)));
      paramCount++;
    }

    query += `
      GROUP BY c.id, c.customer_code, c.name, c.email, c.phone
      HAVING COALESCE(SUM(COALESCE(bd.outstanding_amount, bd.total_amount - COALESCE(bd.paid_amount, 0), bd.total_amount)), 0) > 0
      ORDER BY days_overdue DESC, total_overdue DESC
    `;

    const result = await pool.query(query, params);

    // Calculate dunning level for each customer based on procedure
    const accounts = result.rows.map((row: any) => {
      let dunningLevel = 1;
      if (procedureConfig) {
        const daysOverdue = parseInt(row.days_overdue) || 0;
        if (daysOverdue >= procedureConfig.legal_action_days) {
          dunningLevel = 4; // Final/Legal
        } else if (daysOverdue >= procedureConfig.final_notice_days) {
          dunningLevel = 3;
        } else if (daysOverdue >= procedureConfig.level3_days) {
          dunningLevel = 3;
        } else if (daysOverdue >= procedureConfig.level2_days) {
          dunningLevel = 2;
        } else if (daysOverdue >= procedureConfig.level1_days) {
          dunningLevel = 1;
        }
      }

      return {
        ...row,
        dunning_level: dunningLevel,
        recommended_procedure_id: procedureConfig?.id || null
      };
    });

    return res.json(accounts);
  } catch (error: any) {
    console.error("Error fetching overdue accounts:", error);
    return res.status(500).json({ message: "Failed to fetch overdue accounts", error: error.message });
  }
});

// GET /api/dunning/statistics - Get dunning statistics
router.get("/statistics", async (req: Request, res: Response) => {
  try {
    ensureActivePool();
    const tablesExist = await checkDunningTables();
    if (!tablesExist) {
      return res.status(503).json({ message: "Dunning tables not found. Please run the migration." });
    }

    // Get statistics by level
    const levelStats = await pool.query(`
      SELECT 
        dunning_level,
        COUNT(*) as count,
        SUM(outstanding_amount) as total_outstanding,
        SUM(dunning_amount) as total_dunning_amount,
        SUM(interest_amount) as total_interest
      FROM dunning_history
      WHERE payment_received = false
      GROUP BY dunning_level
      ORDER BY dunning_level
    `);

    // Get statistics by status
    const statusStats = await pool.query(`
      SELECT 
        dunning_status,
        COUNT(*) as count,
        SUM(outstanding_amount) as total_outstanding
      FROM dunning_history
      GROUP BY dunning_status
      ORDER BY dunning_status
    `);

    // Get total overdue accounts
    const overdueResult = await pool.query(`
      SELECT COUNT(DISTINCT customer_id) as total_customers
      FROM dunning_history
      WHERE payment_received = false
    `);

    return res.json({
      byLevel: levelStats.rows,
      byStatus: statusStats.rows,
      totalCustomers: parseInt(overdueResult.rows[0]?.total_customers || '0'),
      totalOutstanding: levelStats.rows.reduce((sum: number, row: any) => sum + parseFloat(row.total_outstanding || 0), 0)
    });
  } catch (error: any) {
    console.error("Error fetching dunning statistics:", error);
    return res.status(500).json({ message: "Failed to fetch dunning statistics", error: error.message });
  }
});

// POST /api/dunning/generate - Generate dunning notices for overdue accounts
router.post("/generate", async (req: Request, res: Response) => {
  try {
    ensureActivePool();
    const tablesExist = await checkDunningTables();
    if (!tablesExist) {
      return res.status(503).json({ message: "Dunning tables not found. Please run the migration." });
    }

    const { procedure_id, send_emails = true, send_letters = false, test_run = false } = req.body;

    if (!procedure_id) {
      return res.status(400).json({ message: "Procedure ID is required" });
    }

    // Use the dunning scheduler service
    const result = await executeDunningRun('manual', {
      procedureId: parseInt(String(procedure_id)),
      testRun: test_run,
      sendEmails: send_emails && !test_run,
      sendLetters: send_letters && !test_run,
    });

    return res.json({
      success: true,
      test_run: test_run,
      run_id: result.runId,
      generated_count: result.noticesGenerated,
      total_amount: result.totalAmount,
      errors: result.errors.length > 0 ? result.errors : undefined,
    });
  } catch (error: any) {
    console.error("Error generating dunning notices:", error);
    return res.status(500).json({ message: "Failed to generate dunning notices", error: error.message });
  }
});

// POST /api/dunning/run-scheduled - Run scheduled dunning for all procedures (admin only)
router.post("/run-scheduled", async (req: Request, res: Response) => {
  try {
    ensureActivePool();

    const { send_emails = true, send_letters = false } = req.body;

    const result = await executeDunningRun('manual', {
      sendEmails: send_emails,
      sendLetters: send_letters,
    });

    return res.json({
      success: true,
      run_id: result.runId,
      generated_count: result.noticesGenerated,
      total_amount: result.totalAmount,
      errors: result.errors.length > 0 ? result.errors : undefined,
    });
  } catch (error: any) {
    console.error("Error running scheduled dunning:", error);
    return res.status(500).json({ message: "Failed to run scheduled dunning", error: error.message });
  }
});

// POST /api/dunning/procedures - Create new dunning procedure
router.post("/procedures", async (req: Request, res: Response) => {
  try {
    ensureActivePool();
    const tablesExist = await checkDunningTables();
    if (!tablesExist) {
      return res.status(503).json({ message: "Dunning tables not found. Please run the migration." });
    }

    const {
      procedure_code,
      procedure_name,
      level1_days,
      level2_days,
      level3_days,
      final_notice_days,
      blocking_days,
      legal_action_days,
      minimum_amount,
      interest_rate,
      dunning_fee
    } = req.body;

    if (!procedure_code || !procedure_name) {
      return res.status(400).json({ message: "Procedure code and name are required" });
    }

    // Check if procedure code already exists
    const existing = await pool.query(
      'SELECT id FROM dunning_procedures WHERE procedure_code = $1',
      [procedure_code]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({ message: "Procedure code already exists" });
    }

    const result = await pool.query(
      `INSERT INTO dunning_procedures (
        procedure_code, procedure_name, level1_days, level2_days, level3_days,
        final_notice_days, blocking_days, legal_action_days, minimum_amount,
        interest_rate, dunning_fee, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true)
      RETURNING *`,
      [
        procedure_code,
        procedure_name,
        parseInt(String(level1_days || 7)),
        parseInt(String(level2_days || 14)),
        parseInt(String(level3_days || 21)),
        parseInt(String(final_notice_days || 30)),
        parseInt(String(blocking_days || 45)),
        parseInt(String(legal_action_days || 60)),
        parseFloat(String(minimum_amount || 0)),
        parseFloat(String(interest_rate || 0)),
        parseFloat(String(dunning_fee || 0))
      ]
    );

    return res.status(201).json(result.rows[0]);
  } catch (error: any) {
    console.error("Error creating dunning procedure:", error);
    return res.status(500).json({ message: "Failed to create dunning procedure", error: error.message });
  }
});

// PUT /api/dunning/history/:id - Update dunning history record
router.put("/history/:id", async (req: Request, res: Response) => {
  try {
    ensureActivePool();
    const tablesExist = await checkDunningTables();
    if (!tablesExist) {
      return res.status(503).json({ message: "Dunning tables not found. Please run the migration." });
    }

    const { id } = req.params;
    const {
      dunning_status,
      payment_received,
      letter_sent,
      email_sent,
      response_date,
      escalated_to_legal
    } = req.body;

    const updates: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    if (dunning_status !== undefined) {
      updates.push(`dunning_status = $${paramCount}`);
      params.push(String(dunning_status));
      paramCount++;
    }

    if (payment_received !== undefined) {
      updates.push(`payment_received = $${paramCount}`);
      params.push(Boolean(payment_received));
      paramCount++;
    }

    if (letter_sent !== undefined) {
      updates.push(`letter_sent = $${paramCount}`);
      params.push(Boolean(letter_sent));
      paramCount++;
    }

    if (email_sent !== undefined) {
      updates.push(`email_sent = $${paramCount}`);
      params.push(Boolean(email_sent));
      paramCount++;
    }

    if (response_date !== undefined) {
      updates.push(`response_date = $${paramCount}`);
      params.push(response_date ? String(response_date) : null);
      paramCount++;
    }

    if (escalated_to_legal !== undefined) {
      updates.push(`escalated_to_legal = $${paramCount}`);
      params.push(Boolean(escalated_to_legal));
      paramCount++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: "No fields to update" });
    }

    params.push(parseInt(id));
    const result = await pool.query(
      `UPDATE dunning_history SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Dunning history record not found" });
    }

    // If payment_received is being set to true, update related billing documents
    if (payment_received === true) {
      const dunningRecord = result.rows[0];

      try {
        // Clear billing documents for this customer
        await pool.query(
          `UPDATE billing_documents
           SET outstanding_amount = 0,
               paid_amount = total_amount,
               posting_status = 'CLEARED'
           WHERE customer_id = $1
           AND outstanding_amount > 0
           AND due_date <= $2`,
          [dunningRecord.customer_id, dunningRecord.dunning_date]
        );

        // Clear AR open items if they exist
        const arTableExists = await pool.query(
          `SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'ar_open_items'
          )`
        );

        if (arTableExists.rows[0].exists) {
          await pool.query(
            `UPDATE ar_open_items
             SET clearing_date = CURRENT_DATE,
                 clearing_document = $1
             WHERE customer_id = $2
             AND clearing_date IS NULL
             AND due_date <= $3`,
            [`DUNNING-${id}`, dunningRecord.customer_id, dunningRecord.dunning_date]
          );
        }

        // Unblock customer dunning if they're blocked
        await pool.query(
          `UPDATE erp_customers
           SET dunning_block = false
           WHERE id = $1 AND dunning_block = true`,
          [dunningRecord.customer_id]
        );

        console.log(`✓ Cleared billing documents and AR items for customer ${dunningRecord.customer_id}`);
      } catch (clearError: any) {
        console.error('Error clearing billing documents:', clearError);
        // Don't fail the whole request if clearing fails
      }
    }

    return res.json(result.rows[0]);
  } catch (error: any) {
    console.error("Error updating dunning history:", error);
    return res.status(500).json({ message: "Failed to update dunning history", error: error.message });
  }
});

export default router;

