
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
    connectionString: 'postgresql://postgres:Mokshith@21@localhost:5432/mallyerp'
});

async function run() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Get the invoice details, INCLUDING company_code_id
        const invoiceRes = await client.query(`
        SELECT id, vendor_id, amount, net_amount, purchase_order_id, company_code_id 
        FROM accounts_payable 
        WHERE invoice_number = 'VINV-2026-000001'
    `);

        if (invoiceRes.rows.length === 0) {
            throw new Error("Invoice not found");
        }
        const invoice = invoiceRes.rows[0];
        const amount = parseFloat(invoice.amount || invoice.net_amount);
        // Default company code to 1 if missing (though strictly it should exist)
        const companyCodeId = invoice.company_code_id || 1;

        console.log(`Processing Manual Payment for Invoice ${invoice.id}, Amount: ${amount}, CompanyCode: ${companyCodeId}`);

        // 2. Insert Manual Payment
        const paymentRes = await client.query(`
        INSERT INTO vendor_payments (
            payment_number, vendor_id, invoice_id, purchase_order_id,
            payment_amount, payment_method, payment_date, status,
            currency, created_by, notes, 
            accounting_document_number, company_code_id, created_at, updated_at
        ) VALUES (
            'MANUAL-FIX-100K', $1, $2, $3,
            $4, 'BANK_TRANSFER', NOW(), 'POSTED',
            'USD', 1, 'Manual fix for user reported paid invoice',
            'KZ-FIX-100K-001', $5, NOW(), NOW()
        ) RETURNING id
    `, [invoice.vendor_id, invoice.id, invoice.purchase_order_id, amount, companyCodeId]);

        console.log(`Created Payment ID: ${paymentRes.rows[0].id}`);

        // 3. Update Invoice Status
        await client.query(`
        UPDATE accounts_payable SET status = 'paid', updated_at = NOW() WHERE id = $1
    `, [invoice.id]);
        console.log("Updated Invoice status to 'paid'");

        // 4. Update Open Item
        await client.query(`
        UPDATE ap_open_items 
        SET status = 'Cleared', outstanding_amount = 0, last_payment_date = NOW()
        WHERE invoice_number = 'VINV-2026-000001'
    `, []);
        console.log("Updated Open Item to 'Cleared'");

        await client.query('COMMIT');
        console.log("Fix applied successfully.");

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Database Error:", err);
    } finally {
        client.release();
        await pool.end();
    }
}

run();
