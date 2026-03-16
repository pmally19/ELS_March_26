
import { pool } from '../db';
import { postGLDocument, GLLineItem, GLDocumentHeader } from './gl-posting-helper.js';

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
  currency: string;
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
    return res.rows[0]?.id || 1;
  }

  /**
   * Creates a journal entry (GL Document)
   * Now writes to journal_entries + journal_entry_line_items (BKPF/BSEG pattern)
   * Must be called within an existing transaction context (client)
   */
  async createJournalEntry(client: any, params: CreateJournalEntryParams): Promise<string> {
    const fiscalYear = params.postingDate.getFullYear();
    const fiscalPeriod = params.postingDate.getMonth() + 1;
    const currencyId = await this.getCurrencyId(client, params.currency);

    // Generate document number using journal_entries sequence
    const prefix = params.documentType.substring(0, 2).toUpperCase();
    const seqRes = await client.query(`SELECT NEXTVAL('journal_entries_id_seq') AS seq`);
    const seq = String(seqRes.rows[0].seq).padStart(6, '0');
    const documentNumber = `${prefix}-${fiscalYear}-${seq}`;

    // Build GL lines from items
    const lines: GLLineItem[] = [];
    for (const item of params.items) {
      const amount = item.debitAmount > 0 ? item.debitAmount : item.creditAmount;
      const dc: 'D' | 'C' = item.debitAmount > 0 ? 'D' : 'C';
      lines.push({
        glAccount: item.glAccount,
        postingKey: dc === 'D' ? '40' : '50',
        debitCredit: dc,
        amount,
        description: item.description,
        partnerId: item.partnerId,
        sourceModule: params.sourceModule,
        sourceDocumentId: params.sourceDocumentId,
        sourceDocumentType: params.sourceDocumentType
      });
    }

    const header: GLDocumentHeader = {
      documentNumber,
      documentType: params.documentType,
      companyCodeId: params.companyCodeId,
      postingDate: params.postingDate,
      documentDate: params.documentDate,
      fiscalYear,
      fiscalPeriod,
      currencyId,
      reference: params.reference,
      headerText: params.headerText,
      sourceModule: params.sourceModule,
      sourceDocumentId: params.sourceDocumentId,
      sourceDocumentType: params.sourceDocumentType
    };

    const result = await postGLDocument(client, header, lines);
    if (!result.success) throw new Error(result.error);

    return documentNumber;
  }
}

export const accountingService = new AccountingService();
