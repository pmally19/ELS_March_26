import { Router } from 'express';
import { db } from '../db.js';
import { sql } from 'drizzle-orm';
import { AccrualProvisionService } from '../services/accrual-provision-service.js';

const router = Router();
const service = new AccrualProvisionService();

// Get provisions and accruals
router.get('/accruals-provisions', async (req, res) => {
  try {
    const { type, status, companyCodeId } = req.query;

    let query = `
      SELECT p.*,
        c.code as company_code_name,
        pt.code as provision_type_code,
        pt.description as provision_type_desc,
        cr.currency_code,
        ea.account_number as expense_account_number,
        ea.account_name as expense_account_name,
        pa.account_number as provision_account_number,
        pa.account_name as provision_account_name,
        u1.username as created_by_name,
        u2.username as approved_by_name
      FROM provision_entries p
      LEFT JOIN company_codes c ON p.company_code_id = c.id
      LEFT JOIN provision_types pt ON p.provision_type_id = pt.id
      LEFT JOIN currencies cr ON p.currency_id = cr.id
      LEFT JOIN gl_accounts ea ON p.expense_account_id = ea.id
      LEFT JOIN gl_accounts pa ON p.provision_account_id = pa.id
      LEFT JOIN users u1 ON p.created_by = u1.id
      LEFT JOIN users u2 ON p.approved_by = u2.id
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramIndex = 1;

    if (type) {
      if (type === 'ACCRUAL') {
        query += ` AND p.is_accrual = true`;
      } else if (type === 'PROVISION') {
        query += ` AND p.is_accrual = false`;
      }
    }

    if (status) {
      query += ` AND p.status = $${paramIndex++}`;
      params.push(status);
    }

    if (companyCodeId) {
      query += ` AND p.company_code_id = $${paramIndex++}`;
      params.push(companyCodeId);
    }

    query += ` ORDER BY p.created_at DESC`;

    const result = await db.execute(sql.raw(query), params);
    res.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching accruals/provisions:', error);
    res.status(500).json({ message: 'Error fetching records', error: error.message });
  }
});

// Create draft entry
router.post('/accruals-provisions', async (req, res) => {
  try {
    const userId = req.user?.id || 1; // Fallback for dev
    const entry = await service.createEntry({ ...req.body, userId });
    res.status(201).json(entry);
  } catch (error: any) {
    console.error('Error creating entry:', error);
    res.status(500).json({ message: 'Error creating entry', error: error.message });
  }
});

// Submit for approval
router.post('/accruals-provisions/:id/submit', async (req, res) => {
  try {
    const userId = req.user?.id || 1;
    await service.submitForApproval(parseInt(req.params.id), userId);
    res.json({ success: true, message: 'Submitted for approval' });
  } catch (error: any) {
    res.status(500).json({ message: 'Error submitting entry', error: error.message });
  }
});

// Approve entry
router.post('/accruals-provisions/:id/approve', async (req, res) => {
  try {
    const userId = req.user?.id || 1;
    await service.approveEntry(parseInt(req.params.id), userId);
    res.json({ success: true, message: 'Entry approved' });
  } catch (error: any) {
    res.status(500).json({ message: 'Error approving entry', error: error.message });
  }
});

// Reject entry
router.post('/accruals-provisions/:id/reject', async (req, res) => {
  try {
    const userId = req.user?.id || 1;
    await service.rejectEntry(parseInt(req.params.id), userId);
    res.json({ success: true, message: 'Entry rejected' });
  } catch (error: any) {
    res.status(500).json({ message: 'Error rejecting entry', error: error.message });
  }
});

// Post to GL
router.post('/accruals-provisions/:id/post', async (req, res) => {
  try {
    const userId = req.user?.id || 1;
    const documentNumber = await service.postToGL(parseInt(req.params.id), userId);
    res.json({ success: true, documentNumber, message: 'Successfully posted to GL' });
  } catch (error: any) {
    console.error('Error posting to GL:', error);
    res.status(500).json({ message: 'Error posting to GL', error: error.message });
  }
});

// Reverse entry
router.post('/accruals-provisions/:id/reverse', async (req, res) => {
  try {
    const userId = req.user?.id || 1;
    const { reversalReasonId, reversalDate } = req.body;

    if (!reversalReasonId || !reversalDate) {
      return res.status(400).json({ message: 'Reversal reason and date are required' });
    }

    const reversalDocumentNumber = await service.reverseEntry(
      parseInt(req.params.id),
      parseInt(reversalReasonId),
      new Date(reversalDate),
      userId
    );

    res.json({ success: true, reversalDocumentNumber, message: 'Successfully reversed entry' });
  } catch (error: any) {
    console.error('Error reversing entry:', error);
    res.status(500).json({ message: 'Error reversing entry', error: error.message });
  }
});

// Get reference data (types, reversal reasons)
router.get('/accruals-provisions/reference-data', async (req, res) => {
  try {
    const types = await db.execute(sql`SELECT * FROM provision_types WHERE is_active = true ORDER BY code`);
    const reasons = await db.execute(sql`SELECT * FROM reversal_reasons WHERE is_active = true ORDER BY code`);

    res.json({
      provisionTypes: types.rows,
      reversalReasons: reasons.rows
    });
  } catch (error: any) {
    console.error('Error fetching reference data:', error);
    res.status(500).json({ message: 'Error fetching reference data' });
  }
});

export default router;
