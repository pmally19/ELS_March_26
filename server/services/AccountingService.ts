
import { pool } from '../db';

interface JournalEntryLineItem {
  glAccount: string; // Account Code
  accountType?: 'S' | 'H' | 'K' | 'D' | 'A' | 'M';
  debitAmount: number;
  creditAmount: number;
  description?: string;
  costCenter?: string;
  profitCenter?: string;
  partnerId?: number;
}

interface CreateJournalEntryParams {
  companyCodeId: number;
  documentType: string;
  documentDate: Date;
  postingDate: Date;
  currency: string; // Currency Code (e.g. USD)
  headerText?: string;
  reference?: string;
  items: JournalEntryLineItem[];
  sourceModule?: string;
  sourceDocumentId?: number;
  sourceDocumentType?: string;
  createdBy: number;
}

export class AccountingService {

  private async getCurrencyId(client: any, currencyCode: string): Promise<number> {
    const res = await client.query('SELECT id FROM currencies WHERE code = $1', [currencyCode]);
    return res.rows[0]?.id || 1; // Default to 1 (usually USD) if not found
  }

  private async getGlAccountId(client: any, accountCode: string): Promise<number> {
    const res = await client.query('SELECT id FROM gl_accounts WHERE account_number = $1', [accountCode]);
    if (res.rows.length === 0) throw new Error(`GL Account ${accountCode} not found`);
    return res.rows[0].id;
  }

  /**
   * Generates a unique accounting document number
   */
  private async generateDocumentNumber(client: any, documentType: string, fiscalYear: number): Promise<string> {
    const prefix = documentType.substring(0, 2).toUpperCase();

    // Count existing documents of this type for this year to generate sequence
    const pattern = `${prefix}-${fiscalYear}-%`;
    const result = await client.query(`
      SELECT count(*) as count 
      FROM gl_document_headers 
      WHERE document_number LIKE $1
    `, [pattern]);

    const count = parseInt(result.rows[0].count) + 1;
    const paddedCount = count.toString().padStart(6, '0');
    return `${prefix}-${fiscalYear}-${paddedCount}`;
  }

  /**
   * Creates a journal entry (GL Document)
   * Must be called within an existing transaction context (client)
   */
  async createJournalEntry(client: any, params: CreateJournalEntryParams): Promise<string> {
    const fiscalYear = params.postingDate.getFullYear();
    const fiscalPeriod = params.postingDate.getMonth() + 1;

    // Resolve IDs
    const currencyId = await this.getCurrencyId(client, params.currency);

    // Generate Document Number
    const documentNumber = await this.generateDocumentNumber(client, params.documentType, fiscalYear);

    // Calculate total amount (sum of debits)
    const totalAmount = params.items.reduce((sum, item) => sum + Number(item.debitAmount || 0), 0);

    // Create Header in gl_document_headers
    const headerResult = await client.query(`
      INSERT INTO gl_document_headers (
        document_number, company_code_id, 
        document_type, document_date, posting_date,
        reference, currency_id, total_amount,
        created_by, created_at, posted_at, status, active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW(), 'Posted', true)
      RETURNING id
    `, [
      documentNumber,
      params.companyCodeId,
      params.documentType,
      params.documentDate,
      params.postingDate,
      params.reference,
      currencyId,
      totalAmount,
      params.createdBy
    ]);

    // Create Line Items in gl_entries
    for (const item of params.items) {
      const glAccountId = await this.getGlAccountId(client, item.glAccount);

      const amount = item.debitAmount > 0 ? item.debitAmount : item.creditAmount;
      const indicator = item.debitAmount > 0 ? 'D' : 'C';

      await client.query(`
        INSERT INTO gl_entries (
          document_number, gl_account_id, amount, debit_credit_indicator,
          posting_status, posting_date, description,
          source_module, source_document_type, source_document_id,
          fiscal_year, fiscal_period, created_at
        ) VALUES ($1, $2, $3, $4, 'Posted', $5, $6, $7, $8, $9, $10, $11, NOW())
      `, [
        documentNumber,
        glAccountId,
        amount,
        indicator,
        params.postingDate,
        item.description,
        params.sourceModule,
        params.sourceDocumentType,
        params.sourceDocumentId,
        fiscalYear,
        fiscalPeriod
      ]);
    }

    return documentNumber; // Return the string ID (e.g., KZ-2026-000001)
  }
}

export const accountingService = new AccountingService();
