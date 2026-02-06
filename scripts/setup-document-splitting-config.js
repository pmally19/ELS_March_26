/**
 * Setup Document Splitting Configuration
 * This script ensures all required business transactions, document type mappings,
 * characteristics, and splitting rules are properly configured.
 * 
 * Run with: node scripts/setup-document-splitting-config.js
 */

import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'mallyerp',
    password: 'Mokshith@21',
    port: 5432,
});

async function setupDocumentSplitting() {
    const client = await pool.connect();

    try {
        console.log('🔧 Setting up Document Splitting Configuration...\n');

        // 1. Clean up duplicate characteristics
        console.log('1. Cleaning up duplicate characteristics...');

        // Find and keep only the best characteristic per type
        const charResult = await client.query(`
      SELECT id, code, name, characteristic_type, field_name 
      FROM document_splitting_characteristics 
      WHERE is_active = true 
      ORDER BY characteristic_type, id
    `);

        const charsByType = {};
        for (const char of charResult.rows) {
            const type = char.characteristic_type;
            if (!charsByType[type]) {
                charsByType[type] = [];
            }
            charsByType[type].push(char);
        }

        // For each type with duplicates, keep the one with correct field_name format
        for (const [type, chars] of Object.entries(charsByType)) {
            if (chars.length > 1) {
                console.log(`   Found ${chars.length} characteristics for type ${type}`);

                // Prefer the one with snake_case field_name
                const preferred = chars.find(c => c.field_name && c.field_name.includes('_')) || chars[0];
                const toDeactivate = chars.filter(c => c.id !== preferred.id);

                for (const char of toDeactivate) {
                    await client.query(
                        'UPDATE document_splitting_characteristics SET is_active = false WHERE id = $1',
                        [char.id]
                    );
                    console.log(`   ⚠️  Deactivated duplicate: ${char.code} (id: ${char.id})`);
                }
                console.log(`   ✅ Kept: ${preferred.code} with field_name: ${preferred.field_name}`);
            }
        }

        // 2. Ensure correct field_name format for active characteristics
        console.log('\n2. Fixing characteristic field names...');
        await client.query(`
      UPDATE document_splitting_characteristics 
      SET field_name = 'profit_center' 
      WHERE characteristic_type = 'PROFIT_CENTER' 
        AND is_active = true 
        AND field_name != 'profit_center'
    `);
        await client.query(`
      UPDATE document_splitting_characteristics 
      SET field_name = 'cost_center' 
      WHERE characteristic_type = 'COST_CENTER' 
        AND is_active = true 
        AND field_name != 'cost_center'
    `);
        await client.query(`
      UPDATE document_splitting_characteristics 
      SET field_name = 'business_area' 
      WHERE characteristic_type = 'BUSINESS_AREA' 
        AND is_active = true 
        AND field_name != 'business_area'
    `);
        await client.query(`
      UPDATE document_splitting_characteristics 
      SET field_name = 'segment' 
      WHERE characteristic_type = 'SEGMENT' 
        AND is_active = true 
        AND field_name != 'segment'
    `);
        console.log('   ✅ Field names standardized to snake_case');

        // 3. Ensure required business transactions exist
        console.log('\n3. Ensuring required business transactions exist...');

        const requiredTransactions = [
            { code: 'VENDOR_INV', name: 'Vendor Invoice', type: 'VENDOR_INVOICE', desc: 'Vendor invoice posting transaction' },
            { code: 'CUSTOMER_INV', name: 'Customer Invoice', type: 'CUSTOMER_INVOICE', desc: 'Customer invoice posting transaction' },
            { code: 'PAYMENT', name: 'Payment', type: 'PAYMENT', desc: 'Payment posting transaction' },
            { code: 'GL_POSTING', name: 'General Ledger Posting', type: 'GL_POSTING', desc: 'General ledger journal entry' },
            { code: 'GOODS_RECEIPT', name: 'Goods Receipt', type: 'GOODS_RECEIPT', desc: 'Goods receipt posting transaction' },
            { code: 'GOODS_ISSUE', name: 'Goods Issue', type: 'GOODS_ISSUE', desc: 'Goods issue posting transaction' },
        ];

        for (const bt of requiredTransactions) {
            const existing = await client.query(
                'SELECT id FROM document_splitting_business_transactions WHERE code = $1 OR transaction_type = $2',
                [bt.code, bt.type]
            );

            if (existing.rows.length === 0) {
                await client.query(`
          INSERT INTO document_splitting_business_transactions (code, name, description, transaction_type, is_active)
          VALUES ($1, $2, $3, $4, true)
        `, [bt.code, bt.name, bt.desc, bt.type]);
                console.log(`   ✅ Created business transaction: ${bt.code}`);
            } else {
                console.log(`   ℹ️  Business transaction exists: ${bt.code}`);
            }
        }

        // 4. Ensure item categories exist
        console.log('\n4. Ensuring required item categories exist...');

        const requiredCategories = [
            { code: 'VENDOR', name: 'Vendor Account', type: 'VENDOR' },
            { code: 'CUSTOMER', name: 'Customer Account', type: 'CUSTOMER' },
            { code: 'EXPENSE', name: 'Expense Account', type: 'EXPENSE' },
            { code: 'REVENUE', name: 'Revenue Account', type: 'REVENUE' },
            { code: 'TAX', name: 'Tax Account', type: 'TAX' },
            { code: 'ASSET', name: 'Asset Account', type: 'ASSET' },
            { code: 'LIABILITY', name: 'Liability Account', type: 'LIABILITY' },
        ];

        for (const cat of requiredCategories) {
            const existing = await client.query(
                'SELECT id FROM document_splitting_item_categories WHERE UPPER(code) = UPPER($1) OR category_type = $2',
                [cat.code, cat.type]
            );

            if (existing.rows.length === 0) {
                await client.query(`
          INSERT INTO document_splitting_item_categories (code, name, category_type, is_active)
          VALUES ($1, $2, $3, true)
        `, [cat.code, cat.name, cat.type]);
                console.log(`   ✅ Created item category: ${cat.code}`);
            } else {
                // Just update name and ensure active - don't change code to avoid unique constraint issues
                await client.query(`
          UPDATE document_splitting_item_categories 
          SET name = $1, is_active = true 
          WHERE id = $2
        `, [cat.name, existing.rows[0].id]);
                console.log(`   ℹ️  Item category exists: ${cat.code}`);
            }
        }

        // 5. Ensure splitting methods exist
        console.log('\n5. Ensuring splitting methods exist...');

        const requiredMethods = [
            { code: 'ACTIVE', name: 'Active Splitting', type: 'ACTIVE', desc: 'Split items based on assigned characteristics' },
            { code: 'PASSIVE', name: 'Passive Splitting', type: 'PASSIVE', desc: 'Inherit splits from original document' },
            { code: 'ZERO_BALANCE', name: 'Zero Balance Splitting', type: 'ZERO_BALANCE', desc: 'Generate zero balance entries' },
        ];

        for (const method of requiredMethods) {
            const existing = await client.query(
                'SELECT id FROM document_splitting_methods WHERE code = $1 OR method_type = $2',
                [method.code, method.type]
            );

            if (existing.rows.length === 0) {
                await client.query(`
          INSERT INTO document_splitting_methods (code, name, description, method_type, is_active)
          VALUES ($1, $2, $3, $4, true)
        `, [method.code, method.name, method.desc, method.type]);
                console.log(`   ✅ Created splitting method: ${method.code}`);
            } else {
                console.log(`   ℹ️  Splitting method exists: ${method.code}`);
            }
        }

        // 6. Ensure characteristics exist
        console.log('\n6. Ensuring characteristics exist...');

        const requiredChars = [
            { code: 'PROFIT_CENTER', name: 'Profit Center', type: 'PROFIT_CENTER', field: 'profit_center' },
            { code: 'COST_CENTER', name: 'Cost Center', type: 'COST_CENTER', field: 'cost_center' },
            { code: 'BUSINESS_AREA', name: 'Business Area', type: 'BUSINESS_AREA', field: 'business_area' },
            { code: 'SEGMENT', name: 'Segment', type: 'SEGMENT', field: 'segment' },
        ];

        for (const char of requiredChars) {
            const existing = await client.query(
                'SELECT id FROM document_splitting_characteristics WHERE code = $1 AND is_active = true',
                [char.code]
            );

            if (existing.rows.length === 0) {
                await client.query(`
          INSERT INTO document_splitting_characteristics 
          (code, name, characteristic_type, field_name, is_active, is_mandatory, requires_zero_balance)
          VALUES ($1, $2, $3, $4, true, false, false)
          ON CONFLICT (code) DO UPDATE SET 
            name = $2, 
            characteristic_type = $3, 
            field_name = $4, 
            is_active = true
        `, [char.code, char.name, char.type, char.field]);
                console.log(`   ✅ Created/updated characteristic: ${char.code}`);
            } else {
                console.log(`   ℹ️  Characteristic exists: ${char.code}`);
            }
        }

        // 7. Summary
        console.log('\n' + '='.repeat(60));
        console.log('✅ Document Splitting Configuration Complete!\n');

        // Show current configuration
        const btCount = await client.query('SELECT COUNT(*) as count FROM document_splitting_business_transactions WHERE is_active = true');
        const catCount = await client.query('SELECT COUNT(*) as count FROM document_splitting_item_categories WHERE is_active = true');
        const charCount = await client.query('SELECT COUNT(*) as count FROM document_splitting_characteristics WHERE is_active = true');
        const methodCount = await client.query('SELECT COUNT(*) as count FROM document_splitting_methods WHERE is_active = true');
        const ruleCount = await client.query('SELECT COUNT(*) as count FROM document_splitting_rules WHERE is_active = true');
        const activationCount = await client.query('SELECT COUNT(*) as count FROM document_splitting_activation WHERE is_active = true');

        console.log('📊 Configuration Summary:');
        console.log(`   Business Transactions: ${btCount.rows[0].count}`);
        console.log(`   Item Categories: ${catCount.rows[0].count}`);
        console.log(`   Characteristics: ${charCount.rows[0].count}`);
        console.log(`   Splitting Methods: ${methodCount.rows[0].count}`);
        console.log(`   Splitting Rules: ${ruleCount.rows[0].count}`);
        console.log(`   Activations: ${activationCount.rows[0].count}`);

    } catch (error) {
        console.error('❌ Error:', error.message);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

setupDocumentSplitting()
    .then(() => {
        console.log('\n🎉 Setup complete!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Setup failed:', error);
        process.exit(1);
    });
