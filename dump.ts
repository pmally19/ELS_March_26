import { pool } from './server/db';
async function run() {
  try {
    console.log("--- FETCHING REAL EXAMPLE DATA ---");

    // 1. Get a customer with a reconciliation account mapping
    const customerQuery = await pool.query(`
      SELECT 
        c.id, c.customer_number, c.name, c.reconciliation_account_id,
        g.account_number as recon_account_number, g.account_name as recon_account_name
      FROM erp_customers c
      JOIN gl_accounts g ON c.reconciliation_account_id = g.id
      LIMIT 1
    `);
    
    // If no erp_customer, try sales_customers
    let customer = customerQuery.rows[0];
    if (!customer) {
        const salesCustomerQuery = await pool.query(`
        SELECT 
            c.id, c.customer_number, c.name, c.reconciliation_account_id,
            g.account_number as recon_account_number, g.account_name as recon_account_name
        FROM sales_customers c
        JOIN gl_accounts g ON c.reconciliation_account_id = g.id
        LIMIT 1
        `);
        customer = salesCustomerQuery.rows[0];
    }

    if (customer) {
      console.log("CUSTOMER:");
      console.log(customer);
      
      // 2. Get a billing document (invoice) for this customer
      const currentYear = new Date().getFullYear();
      let billingQuery = await pool.query(`
        SELECT id, invoice_number, total_amount, status
        FROM invoices
        WHERE customer_id = $1
        LIMIT 1
      `, [customer.id]);
      
      if(billingQuery.rows.length === 0) {
        billingQuery = await pool.query(`
            SELECT id, billing_document as invoice_number, net_value as total_amount
            FROM billing_documents
            WHERE customer_id = $1
            LIMIT 1
          `, [customer.id]);
      }

      console.log("\nBILLING DOCUMENT (INVOICE):");
      console.log(billingQuery.rows[0] || { invoice_number: "INV-10001", total_amount: "500.00", note: "Simulated for example as no invoice found in DB for this customer" });
    } else {
      console.log("No customer found with a reconciliation account mapping.");
    }

    // 3. Get a bank account with its G/L account mapping
    const bankQuery = await pool.query(`
      SELECT 
        b.id, b.account_number, b.bank_name, b.gl_account_id,
        g.account_number as bank_gl_number, g.account_name as bank_gl_name
      FROM bank_accounts b
      JOIN gl_accounts g ON b.gl_account_id = g.id
      LIMIT 1
    `);
    
    console.log("\nBANK ACCOUNT:");
    console.log(bankQuery.rows[0] || "No bank account found with a G/L account mapping.");

    process.exit(0);
  } catch(e) { console.error(e); process.exit(1); }
}
run();
