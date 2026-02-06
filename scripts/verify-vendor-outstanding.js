
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
    connectionString: 'postgresql://postgres:Mokshith@21@localhost:5432/mallyerp'
});

async function run() {
    try {
        console.log("Testing updated Vendor Outstanding logic...");

        // This query matches the one I just implemented in apRoutes.ts
        const vendorsResult = await pool.query(`
      WITH VendorStats AS (
        SELECT 
          vendor_id,
          COUNT(DISTINCT id) as po_count,
          COALESCE(SUM(total_amount), 0) as total_spend_po
        FROM purchase_orders
        WHERE (active = true OR active IS NULL)
          AND vendor_id IS NOT NULL
        GROUP BY vendor_id
      ),
      APStats AS (
        SELECT 
          vendor_id,
          COUNT(DISTINCT id) as invoice_count,
          COALESCE(SUM(amount), 0) as total_spend_ap
        FROM accounts_payable
        WHERE (active = true OR active IS NULL)
        GROUP BY vendor_id
      ),
      OpenItemStats AS (
         SELECT 
            vendor_id,
            COALESCE(SUM(outstanding_amount), 0) as real_outstanding
         FROM ap_open_items
         WHERE status != 'Cleared'
         GROUP BY vendor_id
      )
      SELECT 
        v.id,
        COALESCE(v.code, 'V-' || LPAD(v.id::text, 4, '0')) as vendor_code,
        v.name,
        COALESCE(ois.real_outstanding, 0) as outstanding_amount
      FROM vendors v
      LEFT JOIN VendorStats vs ON v.id = vs.vendor_id
      LEFT JOIN APStats aps ON v.id = aps.vendor_id
      LEFT JOIN OpenItemStats ois ON v.id = ois.vendor_id
      WHERE v.status != 'deleted' AND v.code IN ('80001', '80002')
      ORDER BY v.name
    `);

        console.log(JSON.stringify(vendorsResult.rows, null, 2));

    } catch (err) {
        console.error("Database Error:", err);
    } finally {
        await pool.end();
    }
}

run();
