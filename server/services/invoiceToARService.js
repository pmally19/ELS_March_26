const { pool } = require('../db');

/**
 * Invoice to AR Document Auto-Creation Service
 * Per SAP Standard: When invoice is posted, automatically:
 * 1. Create AR document in accounts_receivable table
 * 2. Auto-generate AR document number (AR-DOC-XXXXXX)
 * 3. Use invoice number as reference
 * 4. Post GL entries (Debit AR, Credit Revenue)
 */

/**
 * Auto-create AR document when invoice is posted
 * @param {Object} invoiceData - Invoice data with id, invoice_number, customer_id, total_amount, etc.
 * @returns {Promise<Object>} Created AR document
 */
async function autoCreateARDocument(invoiceData) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const {
      invoice_id,
      invoice_number,
      customer_id,
      invoice_date,
      due_date,
      total_amount,
      tax_amount = 0,
      net_amount,
      currency = 'USD',
      payment_terms,
      sales_order_id = null,
      company_code_id = null,
      plant_id = null
    } = invoiceData;

    // Step 1: Generate auto-incremented AR document number (SAP Standard Format: AR-DOC-YYYYMM-XXXXXX)
    const currentYear = new Date().getFullYear();
    const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');
    const yearMonth = `${currentYear}${currentMonth}`;

    // Get next AR document number for this year/month
    const docNumberResult = await client.query(`
      SELECT COALESCE(MAX(CAST(SUBSTRING(ar_document_number FROM 9 FOR 6) AS INTEGER)), 0) + 1 as next_number
      FROM accounts_receivable
      WHERE ar_document_number LIKE $1
    `, [`AR-DOC-${yearMonth}-%`]);

    const nextNumber = docNumberResult.rows[0].next_number;
    const arDocumentNumber = `AR-DOC-${yearMonth}-${String(nextNumber).padStart(6, '0')}`;

    // Step 2: Create AR document in accounts_receivable table
    // Note: Using invoice_number as reference (SAP Standard)
    // AR document number can be stored in notes or we can add ar_document_number column via migration
    const arDocResult = await client.query(`
      INSERT INTO accounts_receivable (
        customer_id,
        invoice_number,
        invoice_date,
        due_date,
        amount,
        tax_amount,
        net_amount,
        currency_id,
        company_code_id,
        plant_id,
        sales_order_id,
        payment_terms,
        status,
        notes,
        created_by,
        created_at,
        updated_at,
        active
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, 
              (SELECT id FROM currencies WHERE code = $8 LIMIT 1),
              $9, $10, $11, $12, 'open', 
              'AR Doc: ' || $13 || ' | Invoice Reference: ' || $2, 
              1, NOW(), NOW(), true)
      RETURNING *
    `, [
      customer_id,
      invoice_number,        // Invoice number as reference (SAP Standard)
      invoice_date || new Date().toISOString().split('T')[0],
      due_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      total_amount,
      tax_amount,
      net_amount || (total_amount - tax_amount),
      currency,
      company_code_id,
      plant_id,
      sales_order_id,
      payment_terms || 'NET30',
      arDocumentNumber      // Store AR document number in notes for now
    ]);

    const arDocument = arDocResult.rows[0];

    // Step 3: Post GL Entries (SAP Standard: Debit AR, Credit Revenue)
    await createGLPosting(client, {
      ar_document_number: arDocumentNumber,
      invoice_number: invoice_number,
      invoice_id: invoice_id,
      total_amount: total_amount,
      net_amount: net_amount || (total_amount - tax_amount),
      tax_amount: tax_amount,
      currency: currency
    });

    await client.query('COMMIT');

    console.log(`✅ AR Document auto-created: ${arDocumentNumber} for Invoice: ${invoice_number}`);

    return arDocument;

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error auto-creating AR document:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Create GL posting entries via the shared helper (BKPF/BSEG pattern)
 * Dr: Accounts Receivable (01), Cr: Revenue (50), Cr: Tax Payable (50)
 */
async function createGLPosting(client, data) {
  const { postGLDocument } = await import('../services/gl-posting-helper.js');
  const {
    ar_document_number,
    invoice_number,
    invoice_id,
    total_amount,
    net_amount,
    tax_amount,
    currency
  } = data;

  const postingDate = new Date();
  const description = `Invoice ${invoice_number} - AR Document ${ar_document_number}`;
  const fiscalYear = postingDate.getFullYear();
  const fiscalPeriod = postingDate.getMonth() + 1;

  // Resolve GL account IDs for AR, Revenue, Tax
  const arAccountRes = await client.query(
    `SELECT id FROM gl_accounts WHERE account_number = '1200' OR account_name ILIKE '%Accounts Receivable%' LIMIT 1`
  );
  const revenueAccountRes = await client.query(
    `SELECT id FROM gl_accounts WHERE account_number = '4000' OR account_name ILIKE '%Revenue%' LIMIT 1`
  );

  const arAccountId = arAccountRes.rows[0]?.id || null;
  const revenueAccountId = revenueAccountRes.rows[0]?.id || null;

  const lines = [];

  // Dr: Accounts Receivable (PK 01)
  if (arAccountId) {
    lines.push({
      glAccountId: arAccountId,
      glAccount: '1200',
      postingKey: '01',
      debitCredit: 'D',
      amount: total_amount,
      description: `${description} - Debit AR`,
      sourceModule: 'SD',
      sourceDocumentId: invoice_id,
      sourceDocumentType: 'INVOICE'
    });
  }

  // Cr: Revenue (PK 50)
  if (revenueAccountId) {
    lines.push({
      glAccountId: revenueAccountId,
      glAccount: '4000',
      postingKey: '50',
      debitCredit: 'C',
      amount: net_amount,
      description: `${description} - Credit Revenue`,
      sourceModule: 'SD',
      sourceDocumentId: invoice_id,
      sourceDocumentType: 'INVOICE'
    });
  }

  // Cr: Tax Payable (PK 50) if tax > 0
  if (tax_amount > 0) {
    const taxAccountRes = await client.query(
      `SELECT id FROM gl_accounts WHERE account_number = '2200' OR account_name ILIKE '%Tax Payable%' LIMIT 1`
    );
    const taxAccountId = taxAccountRes.rows[0]?.id || null;
    if (taxAccountId) {
      lines.push({
        glAccountId: taxAccountId,
        glAccount: '2200',
        postingKey: '50',
        debitCredit: 'C',
        amount: tax_amount,
        description: `${description} - Credit Tax Payable`,
        sourceModule: 'SD',
        sourceDocumentId: invoice_id,
        sourceDocumentType: 'INVOICE'
      });
    }
  }

  if (lines.length === 0) {
    console.warn(`[AR GL] No GL accounts found for posting ${ar_document_number} — check GL account setup.`);
    return;
  }

  const header = {
    documentNumber: ar_document_number,
    documentType: 'RV',
    postingDate,
    fiscalYear,
    fiscalPeriod,
    reference: invoice_number,
    headerText: description,
    sourceModule: 'SD',
    sourceDocumentId: invoice_id,
    sourceDocumentType: 'INVOICE'
  };

  const result = await postGLDocument(client, header, lines);
  if (!result.success) throw new Error(`GL posting failed for AR doc ${ar_document_number}: ${result.error}`);

  console.log(`✅ GL Posting created for AR Document: ${ar_document_number}`);
}




/**
 * Check if AR document already exists for an invoice
 */
async function arDocumentExists(invoiceId, invoiceNumber) {
  const result = await pool.query(`
    SELECT id, invoice_number, notes
    FROM accounts_receivable
    WHERE invoice_number = $1
    LIMIT 1
  `, [invoiceNumber]);

  return result.rows.length > 0 ? result.rows[0] : null;
}

export {
  autoCreateARDocument,
  createGLPosting,
  arDocumentExists
};
