import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'mallyerp',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'Mokshith@21'
});

async function migrateAssetDepreciationAssignments() {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        console.log('🔄 Migrating existing assets to depreciation area assignments...\n');

        // Step 1: Get default depreciation areas (BOOK area as default)
        const defaultAreaResult = await client.query(`
      SELECT id, code, name FROM depreciation_areas 
      WHERE UPPER(code) IN ('BOOK', '01', '001')
      AND is_active = true
      ORDER BY code
      LIMIT 1
    `);

        let defaultAreaId;
        if (defaultAreaResult.rows.length === 0) {
            console.log('⚠️  No default depreciation area found. Creating BOOK area...');
            const createResult = await client.query(`
        INSERT INTO depreciation_areas (
          code, name, description, is_active, 
          posting_indicator, currency_type, base_method, period_control,
          created_at, updated_at
        )
        VALUES (
          'BOOK', 'Book Depreciation', 'Standard book depreciation for financial reporting',
          true, 'REALTIME', 'LOCAL', 'ACQUISITION_COST', 'MONTHLY',
          NOW(), NOW()
        )
        RETURNING id, code, name
      `);
            defaultAreaId = createResult.rows[0].id;
            console.log(`✅ Created default area: ${createResult.rows[0].code} - ${createResult.rows[0].name}`);
        } else {
            defaultAreaId = defaultAreaResult.rows[0].id;
            console.log(`📍 Using default area: ${defaultAreaResult.rows[0].code} - ${defaultAreaResult.rows[0].name}\n`);
        }

        // Step 2: Get all active assets that don't have assignments
        const assetsResult = await client.query(`
      SELECT 
        am.id,
        am.asset_number,
        am.name,
        am.depreciation_method,
        am.useful_life_years,
        am.acquisition_cost,
        am.accumulated_depreciation,
        am.net_book_value,
        am.last_depreciation_year,
        am.last_depreciation_period,
        am.last_depreciation_date,
        am.value_date,
        am.depreciation_start_date
      FROM asset_master am
      WHERE am.is_active = true
        AND am.acquisition_cost > 0
        AND NOT EXISTS (
          SELECT 1 FROM asset_depreciation_area_assignments adaa
          WHERE adaa.asset_id = am.id AND adaa.depreciation_area_id = $1
        )
      ORDER BY am.id
    `, [defaultAreaId]);

        console.log(`🔍 Found ${assetsResult.rows.length} assets to migrate\n`);

        if (assetsResult.rows.length === 0) {
            console.log('✅ All assets are already assigned to depreciation areas!');
            await client.query('COMMIT');
            return;
        }

        // Step 3: Create assignments for each asset
        let migrated = 0;
        let skipped = 0;

        for (const asset of assetsResult.rows) {
            try {
                // Validate useful life
                const usefulLife = asset.useful_life_years && asset.useful_life_years > 0
                    ? asset.useful_life_years
                    : 10; // Default to 10 years if not set

                // Determine start date
                const startDate = asset.depreciation_start_date || asset.value_date || new Date();

                await client.query(`
          INSERT INTO asset_depreciation_area_assignments (
            asset_id,
            depreciation_area_id,
            depreciation_method_code,
            useful_life_years,
            depreciation_start_date,
            acquisition_cost,
            accumulated_depreciation,
            net_book_value,
            last_depreciation_year,
            last_depreciation_period,
            last_depreciation_date,
            post_to_gl,
            is_active,
            created_at,
            updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
          ON CONFLICT (asset_id, depreciation_area_id) DO NOTHING
        `, [
                    asset.id,
                    defaultAreaId,
                    asset.depreciation_method || null,
                    usefulLife,
                    startDate,
                    asset.acquisition_cost || 0,
                    asset.accumulated_depreciation || 0,
                    asset.net_book_value || asset.acquisition_cost || 0,
                    asset.last_depreciation_year,
                    asset.last_depreciation_period,
                    asset.last_depreciation_date,
                    true, // post_to_gl
                    true  // is_active
                ]);

                migrated++;
                if (migrated % 10 === 0) {
                    console.log(`  ✓ Migrated ${migrated} assets...`);
                }

            } catch (error) {
                console.error(`  ✗ Error migrating asset ${asset.asset_number} (ID: ${asset.id}):`, error.message);
                skipped++;
            }
        }

        await client.query('COMMIT');

        console.log('\n═══════════════════════════════════════');
        console.log('✅ Migration Complete!');
        console.log('═══════════════════════════════════════');
        console.log(`📊 Total assets processed: ${assetsResult.rows.length}`);
        console.log(`✅ Successfully migrated: ${migrated}`);
        console.log(`⚠️  Skipped (errors): ${skipped}`);
        console.log('═══════════════════════════════════════\n');

        // Step 4: Verification query
        const verifyResult = await client.query(`
      SELECT 
        da.code as area_code,
        da.name as area_name,
        COUNT(adaa.id) as assignment_count,
        SUM(adaa.acquisition_cost) as total_acquisition_cost
      FROM depreciation_areas da
      LEFT JOIN asset_depreciation_area_assignments adaa ON da.id = adaa.depreciation_area_id
      WHERE da.is_active = true
      GROUP BY da.id, da.code, da.name
      ORDER BY da.code
    `);

        console.log('📊 Current Area Assignments Summary:');
        console.log('─────────────────────────────────────');
        verifyResult.rows.forEach(row => {
            console.log(`  ${row.area_code} (${row.area_name}): ${row.assignment_count} assets, $${parseFloat(row.total_acquisition_cost || 0).toLocaleString()}`);
        });
        console.log('');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

migrateAssetDepreciationAssignments();
