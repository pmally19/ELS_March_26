import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'mallyerp',
    password: 'Mokshith@21',
    port: 5432,
});

async function quickVerify() {
    try {
        console.log('\n🔍 WORKFLOW SCHEMA VERIFICATION\n');

        // Asset Master - critical fields
        console.log('1️⃣ ASSET_MASTER - Key Fields:');
        const am = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'asset_master' 
      AND column_name IN (
        'asset_number', 'name', 'description', 'asset_class_id',
        'acquisition_date', 'acquisition_cost', 'company_code_id',
        'cost_center_id', 'depreciation_method', 'useful_life_years',
        'residual_value', 'status', 'location', 'is_active',
        'capitalization_date', 'retirement_date'
      )
    `);
        am.rows.forEach(r => console.log(`  ✓ ${r.column_name}`));

        // Depreciation Methods
        console.log('\n2️⃣ DEPRECIATION_METHODS - Key Fields:');
        const dm = await pool.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'depreciation_methods'
      AND column_name IN (
        'code', 'name', 'description', 'calculation_type',
        'base_value_type', 'depreciation_rate', 'useful_life_years',
        'residual_value_percent', 'time_basis', 'supports_partial_periods',
        'method_switching_allowed', 'company_code_id', 'is_active', 'is_default'
      )
    `);
        dm.rows.forEach(r => console.log(`  ✓ ${r.column_name}`));

        // Sample counts
        console.log('\n3️⃣ DATA COUNTS:');
        const counts = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM company_codes WHERE is_active = true) as companies,
        (SELECT COUNT(*) FROM asset_classes WHERE is_active = true) as classes,
        (SELECT COUNT(*) FROM depreciation_methods WHERE is_active = true) as methods,
        (SELECT COUNT(*) FROM cost_centers) as cost_centers,
        (SELECT COUNT(*) FROM asset_master WHERE is_active = true) as assets
    `);
        const c = counts.rows[0];
        console.log(`  Companies: ${c.companies}`);
        console.log(`  Asset Classes: ${c.classes}`);
        console.log(`  Depreciation Methods: ${c.methods}`);
        console.log(`  Cost Centers: ${c.cost_centers}`);
        console.log(`  Active Assets: ${c.assets}`);

        console.log('\n✅ Verification complete!\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

quickVerify();
