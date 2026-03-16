import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'mallyerp',
  password: 'Mokshith@21',
  port: 5432,
});

async function updateSplittingRule() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    console.log('🔧 Updating Splitting Rule\n');
    console.log('='.repeat(60));

    // Get EXPENSE category ID
    const expenseCatResult = await client.query(`
      SELECT id FROM document_splitting_item_categories 
      WHERE code = 'EXPENSE' AND is_active = true
      LIMIT 1
    `);
    
    if (expenseCatResult.rows.length === 0) {
      console.log('   ❌ EXPENSE category not found');
      await client.query('ROLLBACK');
      return;
    }
    const expenseCategoryId = expenseCatResult.rows[0].id;
    console.log(`   ✅ Found EXPENSE category (ID: ${expenseCategoryId})`);

    // Get VENDOR category ID
    const vendorCatResult = await client.query(`
      SELECT id FROM document_splitting_item_categories 
      WHERE code = 'VENDOR' AND is_active = true
      LIMIT 1
    `);
    
    if (vendorCatResult.rows.length === 0) {
      console.log('   ❌ VENDOR category not found');
      await client.query('ROLLBACK');
      return;
    }
    const vendorCategoryId = vendorCatResult.rows[0].id;
    console.log(`   ✅ Found VENDOR category (ID: ${vendorCategoryId})`);

    // Update splitting rule to use EXPENSE as target
    console.log('\n2. Updating Splitting Rule...');
    const updateResult = await client.query(`
      UPDATE document_splitting_rules
      SET target_item_category_id = $1,
          updated_at = NOW()
      WHERE source_item_category_id = $2
        AND target_item_category_id IS NULL
        AND is_active = true
      RETURNING id, source_item_category_id, target_item_category_id
    `, [expenseCategoryId, vendorCategoryId]);
    
    if (updateResult.rows.length > 0) {
      console.log(`   ✅ Updated ${updateResult.rows.length} splitting rule(s)`);
      updateResult.rows.forEach(rule => {
        console.log(`      Rule ID: ${rule.id}`);
        console.log(`      Source: VENDOR (ID: ${rule.source_item_category_id})`);
        console.log(`      Target: EXPENSE (ID: ${rule.target_item_category_id})`);
      });
    } else {
      console.log('   ⚠️  No rules updated. Checking existing rules...');
      const existingRules = await client.query(`
        SELECT id, source_item_category_id, target_item_category_id
        FROM document_splitting_rules
        WHERE source_item_category_id = $1
      `, [vendorCategoryId]);
      
      if (existingRules.rows.length > 0) {
        existingRules.rows.forEach(rule => {
          console.log(`      Rule ID: ${rule.id}, Source: ${rule.source_item_category_id}, Target: ${rule.target_item_category_id || 'NULL'}`);
        });
      }
    }

    await client.query('COMMIT');
    console.log('\n' + '='.repeat(60));
    console.log('✅ Splitting Rule Updated Successfully!');
    console.log('\n💡 Next step: Test document splitting again');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

updateSplittingRule()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Update failed:', error);
    process.exit(1);
  });

