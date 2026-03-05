import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'mallyerp',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'Mokshith@21'
});

async function fix() {
    try {
        const check02 = await pool.query("SELECT id FROM number_ranges WHERE number_range_code = '02'");
        if (check02.rows.length === 0) {
            await pool.query(`
        INSERT INTO number_ranges (
          number_range_code, description, number_range_object, fiscal_year,
          range_from, range_to, current_number, external_numbering, company_code_id, is_active
        ) VALUES (
          '02', 'AP Invoices', 'accounting_document', '2026',
          '2000000000', '2999999999', '2000000000', false, 1, true
        )
      `);
            console.log('Inserted number range 02');
        }

        const check49 = await pool.query("SELECT id FROM number_ranges WHERE number_range_code = '49'");
        if (check49.rows.length === 0) {
            await pool.query(`
        INSERT INTO number_ranges (
          number_range_code, description, number_range_object, fiscal_year,
          range_from, range_to, current_number, external_numbering, company_code_id, is_active
        ) VALUES (
          '49', 'Goods Receipts', 'material_doc', '2026',
          '4900000000', '4999999999', '4900000000', false, 1, true
        )
      `);
            console.log('Inserted number range 49');
        }

        const weType = await pool.query("SELECT id FROM document_types WHERE document_type_code = 'WE' LIMIT 1");
        if (weType.rows.length > 0) {
            await pool.query("UPDATE movement_types SET document_type_id = $1 WHERE movement_type_code = '101'", [weType.rows[0].id]);
            console.log('Updated movement_type 101 to use WE document type ID:', weType.rows[0].id);
        }

        console.log("Fix applied successfully.");
    } catch (e) {
        console.error("Error applying fix:", e);
    } finally {
        await pool.end();
    }
}

fix();
