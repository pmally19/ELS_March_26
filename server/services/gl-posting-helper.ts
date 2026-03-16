/**
 * Shared GL Posting Helper — SAP BKPF/BSEG Pattern
 *
 * ALL modules must use this helper to post to GL.
 * Writes to: journal_entries (header) + journal_entry_line_items (lines)
 * 
 * This replaces all direct INSERT INTO gl_entries calls across every module.
 *
 * Posting Key convention (dynamic, per SAP):
 *   40 = GL Debit   (expense, asset, clearing debit)
 *   50 = GL Credit  (liability, revenue, clearing credit)
 *   01 = Customer Invoice Debit
 *   11 = Customer Credit
 *   15 = Customer Clearing Credit
 *   21 = Vendor Debit
 *   25 = Vendor Clearing Debit
 *   31 = Vendor Credit (AP payable)
 */

import { pool } from '../db';

export interface GLLineItem {
    glAccountId?: number;         // FK to gl_accounts.id (preferred)
    glAccount?: string;           // Account number text (fallback if id not available)
    postingKey: string;           // '40'=Dr GL, '50'=Cr GL, '31'=Cr Vendor, '01'=Dr Customer
    debitCredit: 'D' | 'C';      // Derived from postingKey but kept explicit for clarity
    amount: number;               // Always positive
    description?: string;         // BSEG: SGTXT — line item text
    costCenterId?: number;
    profitCenterId?: number;
    partnerId?: number;           // Vendor / Customer id
    taxCode?: string;
    taxAmount?: number;
    paymentTerms?: string;
    dueDate?: Date;
    baselineDate?: Date;
    assignment?: string;
    reference?: string;
    clearingStatus?: string;
    paymentStatus?: string;
    sourceModule?: string;
    sourceDocumentId?: number;
    sourceDocumentType?: string;
    bankTransactionId?: number;
}

export interface GLDocumentHeader {
    documentNumber: string;       // BKPF: BELNR
    documentType: string;         // BKPF: BLART (WE, KR, RV, SA, AC, PR, MM, AF...)
    companyCodeId?: number;       // BKPF: BUKRS
    postingDate: Date;            // BKPF: BUDAT
    documentDate?: Date;          // BKPF: BLDAT
    fiscalYear?: number;          // BKPF: GJAHR
    fiscalPeriod?: number | string; // BKPF: MONAT
    currencyId?: number;
    exchangeRate?: number;
    reference?: string;           // BKPF: XBLNR
    headerText?: string;          // BKPF: BKTXT
    createdBy?: number | string;
    sourceModule?: string;        // Extension: module that triggered posting
    sourceDocumentId?: number;
    sourceDocumentType?: string;
    reversalOfId?: number;        // BKPF: STBLG — reversal of which document
    reversalReasonCode?: string;  // BKPF: STGRD
    isReversal?: boolean;
}

export interface PostGLResult {
    success: boolean;
    journalEntryId?: number;
    documentNumber?: string;
    error?: string;
}

/**
 * Post a complete FI document: header + line items.
 * Uses an EXISTING database client (must be within a transaction).
 */
export async function postGLDocument(
    client: any,
    header: GLDocumentHeader,
    lines: GLLineItem[]
): Promise<PostGLResult> {
    try {
        if (lines.length === 0) {
            throw new Error('GL document must have at least one line item');
        }

        // Validate balanced entry (debit = credit)
        const totalDebit = lines.filter(l => l.debitCredit === 'D').reduce((s, l) => s + l.amount, 0);
        const totalCredit = lines.filter(l => l.debitCredit === 'C').reduce((s, l) => s + l.amount, 0);

        // Allow small rounding difference
        if (Math.abs(totalDebit - totalCredit) > 0.01) {
            throw new Error(`GL document ${header.documentNumber} is not balanced: Dr=${totalDebit} Cr=${totalCredit}`);
        }

        // ── Insert journal_entries header (BKPF) ─────────────────────────────
        const jeResult = await client.query(`
            INSERT INTO journal_entries (
                document_number, document_type, company_code_id,
                posting_date, document_date,
                fiscal_year, fiscal_period,
                currency_id, exchange_rate,
                reference_document, header_text,
                total_debit_amount, total_credit_amount,
                status, entry_date, active,
                source_module, source_document_id, source_document_type,
                reversal_of_id, reversal_reason_code, is_reversal,
                created_at, updated_at
            ) VALUES (
                $1, $2, $3,
                $4, $5,
                $6, $7,
                $8, $9,
                $10, $11,
                $12, $12,
                'POSTED', $4, true,
                $13, $14, $15,
                $16, $17, $18,
                NOW(), NOW()
            ) RETURNING id
        `, [
            header.documentNumber,
            header.documentType,
            header.companyCodeId || null,
            header.postingDate,
            header.documentDate || header.postingDate,
            header.fiscalYear || new Date().getFullYear(),
            header.fiscalPeriod?.toString() || String(header.postingDate.getMonth() + 1).padStart(2, '0'),
            header.currencyId || null,
            header.exchangeRate || 1.0,
            header.reference || null,
            header.headerText || null,
            totalDebit,
            header.sourceModule || null,
            header.sourceDocumentId || null,
            header.sourceDocumentType || null,
            header.reversalOfId || null,
            header.reversalReasonCode || null,
            header.isReversal || false
        ]);

        const journalEntryId = jeResult.rows[0].id;

        // ── Insert journal_entry_line_items (BSEG) ───────────────────────────
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const lineNum = i + 1;

            // Resolve gl_account_id from text if needed
            let glAccountId = line.glAccountId || null;
            let glAccountText = line.glAccount || null;

            if (!glAccountId && glAccountText) {
                const gaRes = await client.query(
                    'SELECT id FROM gl_accounts WHERE account_number = $1 LIMIT 1',
                    [glAccountText]
                );
                if (gaRes.rows.length > 0) glAccountId = gaRes.rows[0].id;
            } else if (glAccountId && !glAccountText) {
                const gaRes = await client.query(
                    'SELECT account_number FROM gl_accounts WHERE id = $1 LIMIT 1',
                    [glAccountId]
                );
                if (gaRes.rows.length > 0) glAccountText = gaRes.rows[0].account_number;
            }

            await client.query(`
                INSERT INTO journal_entry_line_items (
                    journal_entry_id, line_item_number,
                    gl_account, gl_account_id,
                    account_type, posting_key,
                    debit_amount, credit_amount,
                    description, item_text, reference,
                    cost_center_id, profit_center_id,
                    partner_id,
                    tax_code, tax_amount,
                    payment_terms, due_date, baseline_date,
                    assignment, clearing_status, payment_status,
                    source_module, source_document_id, source_document_type,
                    bank_transaction_id,
                    created_at, updated_at
                ) VALUES (
                    $1, $2,
                    $3, $4,
                    $5, $6,
                    $7, $8,
                    $9, $9, $10,
                    $11, $12,
                    $13,
                    $14, $15,
                    $16, $17, $18,
                    $19, $20, $21,
                    $22, $23, $24,
                    $25,
                    NOW(), NOW()
                )
            `, [
                journalEntryId,
                lineNum,
                glAccountText,
                glAccountId,
                line.debitCredit,         // account_type = D or C
                line.postingKey,
                line.debitCredit === 'D' ? line.amount : 0,
                line.debitCredit === 'C' ? line.amount : 0,
                line.description || null,
                line.reference || header.reference || null,
                line.costCenterId || null,
                line.profitCenterId || null,
                line.partnerId || null,
                line.taxCode || null,
                line.taxAmount || 0,
                line.paymentTerms || null,
                line.dueDate || null,
                line.baselineDate || null,
                line.assignment || null,
                line.clearingStatus || null,
                line.paymentStatus || null,
                line.sourceModule || header.sourceModule || null,
                line.sourceDocumentId || header.sourceDocumentId || null,
                line.sourceDocumentType || header.sourceDocumentType || null,
                line.bankTransactionId || null
            ]);
        }

        return {
            success: true,
            journalEntryId,
            documentNumber: header.documentNumber
        };

    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

/**
 * Generate a FI document number in the format: {prefix}{YYYYMMDD}{sequence}
 * Examples: ACR20260301000001, PRV20260301000001, FIGR20260301000001
 */
export async function generateDocumentNumber(client: any, prefix: string): Promise<string> {
    const today = new Date();
    const datePart = today.toISOString().slice(0, 10).replace(/-/g, '');
    const seqResult = await client.query(`SELECT NEXTVAL('journal_entries_id_seq') AS seq`);
    const seq = String(seqResult.rows[0].seq).padStart(6, '0');
    return `${prefix}${datePart}${seq}`;
}

/**
 * Derive posting key from debit/credit + account type (SAP OB41 logic):
 *   GL Debit  → PK 40
 *   GL Credit → PK 50
 *   Vendor Credit → PK 31
 *   Customer Debit → PK 01
 *   Vendor Debit (clearing) → PK 21
 *   Customer Credit (clearing) → PK 11
 */
export function derivePostingKey(
    debitCredit: 'D' | 'C',
    accountCategory: 'GL' | 'VENDOR' | 'CUSTOMER' | 'ASSET' | 'BANK' = 'GL'
): string {
    const map: Record<string, string> = {
        'GL_D': '40', 'GL_C': '50',
        'VENDOR_C': '31', 'VENDOR_D': '21',
        'CUSTOMER_D': '01', 'CUSTOMER_C': '11',
        'ASSET_D': '70', 'ASSET_C': '75',
        'BANK_D': '10', 'BANK_C': '09',
    };
    return map[`${accountCategory}_${debitCredit}`] || (debitCredit === 'D' ? '40' : '50');
}
