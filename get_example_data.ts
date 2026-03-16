import { pool } from './server/db';

async function getExampleData() {
  try {
    console.log("--- FETCHING REAL EXAMPLE DATA ---");

    // 1. Get a customer with a reconciliation account
    const customerQuery = await pool.query(`
      SELECT 
        c.id as customer_id, 
        c.customer_number, 
        c.name, 
        c.reconciliation_account_id,
        g.account_number as recon_account_number,
        g.account_name as recon_account_name
      FROM customers c
      JOIN gl_accounts g ON c.reconciliation_account_id = g.id
      LIMIT 1
    `);
    
    const customer = customerQuery.rows[0];
    if (customer) {
      console.log("CUSTOMER:");
      console.log(customer);
      
      // 2. Get a billing document (invoice) for this customer
      const billingQuery = await pool.query(`
        SELECT id, billing_document, net_value, tax_amount
        FROM billing_documents
        WHERE customer_id = $1
        LIMIT 1
      `, [customer.customer_id]);
      console.log("\nBILLING DOCUMENT (INVOICE):");
      console.log(billingQuery.rows[0] || "No billing document found for this customer.");
    } else {
      console.log("No customer found with a reconciliation account mapping.");
    }

    // 3. Get a bank account with its G/L account mapping
    const bankQuery = await pool.query(`
      SELECT 
        b.id as bank_account_id,
        b.account_number,
        b.bank_name,
        b.gl_account_id,
        g.account_number as bank_gl_number,
        g.account_name as bank_gl_name
      FROM bank_accounts b
      JOIN gl_accounts g ON b.gl_account_id = g.id
      LIMIT 1
    `);
    
    console.log("\nBANK ACCOUNT:");
    console.log(bankQuery.rows[0] || "No bank account found with a G/L account mapping.");

    process.exit(0);
  } catch (error) {
    console.error("Error fetching data:", error);
    process.exit(1);
  }
}

getExampleData();
