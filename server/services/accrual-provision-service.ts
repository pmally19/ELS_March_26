import { pool } from '../db.js';
import { postGLDocument, GLDocumentHeader, GLLineItem } from './gl-posting-helper.js';

export interface CreateProvisionParams {
  companyCodeId: number;
  provisionTypeId: number;
  amount: number;
  currencyId: number;
  postingDate: Date;
  fiscalYear: number;
  fiscalPeriod: number;
  expenseAccountId: number;
  provisionAccountId: number;
  costCenterId?: number;
  profitCenterId?: number;
  isAccrual: boolean;
  description: string;
  userId: number;
}

export class AccrualProvisionService {
  /**
   * Create a new draft provision or accrual
   */
  async createEntry(params: CreateProvisionParams): Promise<any> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const result = await client.query(`
        INSERT INTO provision_entries (
          company_code_id, provision_type_id, amount, currency_id,
          posting_date, fiscal_year, fiscal_period, 
          expense_account_id, provision_account_id,
          cost_center_id, profit_center_id,
          is_accrual, description, status, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'DRAFT', $14)
        RETURNING *
      `, [
        params.companyCodeId, params.provisionTypeId, params.amount, params.currencyId,
        params.postingDate, params.fiscalYear, params.fiscalPeriod,
        params.expenseAccountId, params.provisionAccountId,
        params.costCenterId || null, params.profitCenterId || null,
        params.isAccrual, params.description, params.userId
      ]);

      await client.query('COMMIT');
      return result.rows[0];
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Submit an entry for approval
   */
  async submitForApproval(entryId: number, userId: number): Promise<void> {
    const result = await pool.query(`
      UPDATE provision_entries 
      SET status = 'PENDING_APPROVAL', updated_at = NOW() 
      WHERE id = $1 AND status = 'DRAFT'
      RETURNING id
    `, [entryId]);

    if (result.rows.length === 0) {
      throw new Error('Entry not found or not in DRAFT status');
    }
  }

  /**
   * Approve an entry
   */
  async approveEntry(entryId: number, userId: number): Promise<void> {
    const result = await pool.query(`
      UPDATE provision_entries 
      SET status = 'APPROVED', approved_by = $2, updated_at = NOW() 
      WHERE id = $1 AND status = 'PENDING_APPROVAL'
      RETURNING id
    `, [entryId, userId]);

    if (result.rows.length === 0) {
      throw new Error('Entry not found or not pending approval');
    }
  }

  /**
   * Reject an entry
   */
  async rejectEntry(entryId: number, userId: number): Promise<void> {
    const result = await pool.query(`
      UPDATE provision_entries 
      SET status = 'REJECTED', updated_at = NOW() 
      WHERE id = $1 AND status = 'PENDING_APPROVAL'
      RETURNING id
    `, [entryId]);

    if (result.rows.length === 0) {
      throw new Error('Entry not found or not pending approval');
    }
  }

  /**
   * Post an approved entry to GL
   */
  async postToGL(entryId: number, userId: number): Promise<string> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Get Entry details
      const entryResult = await client.query(`
        SELECT p.*, c.code as company_code
        FROM provision_entries p
        JOIN company_codes c ON p.company_code_id = c.id
        WHERE p.id = $1 AND p.status = 'APPROVED'
      `, [entryId]);

      if (entryResult.rows.length === 0) {
        throw new Error('Entry not found or not approved');
      }

      const entry = entryResult.rows[0];

      // 2. Generate Document Number
      const prefix = entry.is_accrual ? 'ACR' : 'PRV';
      const year = entry.fiscal_year;
      const countResult = await client.query(`
        SELECT COUNT(*) + 1 as next_num 
        FROM provision_entries 
        WHERE is_accrual = $1 AND fiscal_year = $2 AND status IN ('POSTED', 'REVERSED')
      `, [entry.is_accrual, year]);

      const nextNum = String(countResult.rows[0].next_num).padStart(5, '0');
      const documentNumber = `${prefix}${year}${nextNum}`;

      // 3. Prepare GL Header and Lines mapping
      const header: GLDocumentHeader = {
        documentNumber,
        documentType: entry.is_accrual ? 'AC' : 'PR', // AC = Accrual, PR = Provision
        companyCodeId: entry.company_code_id,
        postingDate: entry.posting_date,
        fiscalYear: entry.fiscal_year,
        fiscalPeriod: entry.fiscal_period,
        headerText: entry.description || `${prefix} Posting`,
        sourceDocumentType: entry.is_accrual ? 'ACCRUAL' : 'PROVISION'
      };

      const lines: GLLineItem[] = [
        {
          glAccountId: entry.expense_account_id,
          postingKey: '40', // Debit Expense
          debitCredit: 'D',
          amount: parseFloat(entry.amount),
          description: entry.description || 'Expense Entry',
          costCenterId: entry.cost_center_id,
          profitCenterId: entry.profit_center_id,
          sourceModule: 'FI',
          sourceDocumentId: entry.id,
          sourceDocumentType: entry.is_accrual ? 'ACCRUAL' : 'PROVISION'
        },
        {
          glAccountId: entry.provision_account_id,
          postingKey: '50', // Credit Payable/Provision Account
          debitCredit: 'C',
          amount: parseFloat(entry.amount),
          description: entry.description || 'Liability/Provision Entry',
          costCenterId: entry.cost_center_id,
          profitCenterId: entry.profit_center_id,
          sourceModule: 'FI',
          sourceDocumentId: entry.id,
          sourceDocumentType: entry.is_accrual ? 'ACCRUAL' : 'PROVISION'
        }
      ];

      // 4. Post using standardized GL helper (journal_entries + journal_entry_line_items)
      const postResult = await postGLDocument(client, header, lines);
      if (!postResult.success) {
        throw new Error(`GL Posting failed: ${postResult.error}`);
      }

      // 5. Update Entry Status
      await client.query(`
        UPDATE provision_entries 
        SET status = 'POSTED', document_number = $1, updated_at = NOW() 
        WHERE id = $2
        `, [documentNumber, entryId]);

      await client.query('COMMIT');
      return documentNumber;

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Reverse a posted entry
   */
  async reverseEntry(entryId: number, reversalReasonId: number, reversalDate: Date, userId: number): Promise<string> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Get Entry details
      const entryResult = await client.query(`
        SELECT p.*, j.id as journal_entry_id
        FROM provision_entries p
        LEFT JOIN journal_entries j ON j.document_number = p.document_number
        WHERE p.id = $1 AND p.status = 'POSTED'
        `, [entryId]);

      if (entryResult.rows.length === 0) {
        throw new Error('Entry not found or missing POSTED status');
      }

      const entry = entryResult.rows[0];

      // 2. We can create a reversing GL entry via helper (e.g. reverse signs or keys)
      // Standard SAP reversal inverts debit/credit or uses negative amounts.
      // We'll reverse debit/credit for simplicity
      const prefix = entry.is_accrual ? 'ACRV' : 'PRVR';
      const year = reversalDate.getFullYear();
      const countResult = await client.query(`
        SELECT COUNT(*) + 1 as next_num 
        FROM provision_entries 
        WHERE reversal_document_number LIKE $1
                `, [`${prefix}${year}% `]);

      const nextNum = String(countResult.rows[0].next_num).padStart(5, '0');
      const reversalDocumentNumber = `${prefix}${year}${nextNum} `;

      const header: GLDocumentHeader = {
        documentNumber: reversalDocumentNumber,
        documentType: entry.is_accrual ? 'AC' : 'PR',
        companyCodeId: entry.company_code_id,
        postingDate: reversalDate,
        fiscalYear: year,
        fiscalPeriod: reversalDate.getMonth() + 1,
        headerText: `Reversal of ${entry.document_number}`,
        sourceModule: 'FI',
        sourceDocumentId: entry.id,
        sourceDocumentType: entry.is_accrual ? 'ACCRUAL_REVERSAL' : 'PROVISION_REVERSAL',
        reversalReasonCode: String(reversalReasonId),
        isReversal: true
      };

      const lines: GLLineItem[] = [
        {
          glAccountId: entry.expense_account_id,
          postingKey: '50', // Credit Expense (Reversal)
          debitCredit: 'C',
          amount: parseFloat(entry.amount),
          description: `Reversal: ${entry.description}`,
          costCenterId: entry.cost_center_id,
          profitCenterId: entry.profit_center_id,
          sourceModule: 'FI',
          sourceDocumentId: entry.id,
          sourceDocumentType: entry.is_accrual ? 'ACCRUAL_REVERSAL' : 'PROVISION_REVERSAL'
        },
        {
          glAccountId: entry.provision_account_id,
          postingKey: '40', // Debit Payable/Provision (Reversal)
          debitCredit: 'D',
          amount: parseFloat(entry.amount),
          description: `Reversal: ${entry.description}`,
          costCenterId: entry.cost_center_id,
          profitCenterId: entry.profit_center_id,
          sourceModule: 'FI',
          sourceDocumentId: entry.id,
          sourceDocumentType: entry.is_accrual ? 'ACCRUAL_REVERSAL' : 'PROVISION_REVERSAL'
        }
      ];

      const postResult = await postGLDocument(client, header, lines);
      if (!postResult.success) {
        throw new Error(`Reversal GL Posting failed: ${postResult.error}`);
      }

      // 3. Mark the original GL Document as Reversed if the helper doesn't do it
      if (entry.journal_entry_id) {
        await client.query(`
          UPDATE journal_entries
          SET status = 'REVERSED', reversal_reason = $1, reversal_date = $2, updated_at = NOW()
          WHERE id = $3
        `, [String(reversalReasonId), reversalDate, entry.journal_entry_id]);
      }

      // 4. Update Entry Status
      await client.query(`
        UPDATE provision_entries 
        SET status = 'REVERSED',
        reversal_date = $1,
        reversal_reason_id = $2,
        reversal_document_number = $3,
        updated_at = NOW() 
        WHERE id = $4
        `, [reversalDate, reversalReasonId, reversalDocumentNumber, entryId]);

      await client.query('COMMIT');
      return reversalDocumentNumber;

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
