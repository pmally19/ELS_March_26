
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
    connectionString: 'postgresql://postgres:Mokshith@21@localhost:5432/mallyerp'
});

async function run() {
    try {
        const invoiceNum = 'VINV-2026-000001';
        console.log(`Checking details for ${invoiceNum}...`);

        // 1. Check Accounts Payable
        console.log("--- Accounts Payable ---");
        const ap = await pool.query(`
      SELECT * FROM accounts_payable WHERE invoice_number = $1
    `, [invoiceNum]);
        console.log(JSON.stringify(ap.rows, null, 2));

        // 2. Check AP Open Items
        console.log("--- AP Open Items ---");
        const openItems = await pool.query(`
      SELECT * FROM ap_open_items WHERE invoice_number = $1
    `, [invoiceNum]);
        console.log(JSON.stringify(openItems.rows, null, 2));

        // 3. Check Vendor Payments linked to this invoice or PO
        if (ap.rows.length > 0) {
            const inv = ap.rows[0];
            console.log("--- Related Payments ---");
            const payments = await pool.query(`
            SELECT * FROM vendor_payments 
            WHERE invoice_id = $1 OR purchase_order_id = $2
        `, [inv.id, inv.purchase_order_id]);
            console.log(JSON.stringify(payments.rows, null, 2));
        }

        // 4. Check Vendor 80002 (mrf)
        console.log("--- Vendor Check ---");
        const vendor = await pool.query(`
        SELECT id, code, name FROM vendors WHERE code = '80002'
    `);
        console.log(JSON.stringify(vendor.rows, null, 2));

    } catch (err) {
        console.error("Database Error:", err);
    } finally {
        await pool.end();
    }
}

run();
