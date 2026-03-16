import { pool } from './db.js';

console.log('🔍 Verifying Prerequisites for Material Account Determination (OBYC)...\n');

const checks = [];
let allPassed = true;

async function checkTable(tableName, requiredColumns = []) {
    try {
        const result = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = $1
      ORDER BY ordinal_position
    `, [tableName]);

        if (result.rows.length === 0) {
            checks.push({
                name: `Table: ${tableName}`,
                status: '❌ MISSING',
                message: `Table does not exist`
            });
            return false;
        }

        const columns = result.rows.map(r => r.column_name);
        const missingColumns = requiredColumns.filter(col => !columns.includes(col));

        if (missingColumns.length > 0) {
            checks.push({
                name: `Table: ${tableName}`,
                status: '⚠️  INCOMPLETE',
                message: `Missing columns: ${missingColumns.join(', ')}`
            });
            return false;
        }

        checks.push({
            name: `Table: ${tableName}`,
            status: '✅ EXISTS',
            message: `${columns.length} columns`
        });
        return true;
    } catch (error) {
        checks.push({
            name: `Table: ${tableName}`,
            status: '❌ ERROR',
            message: error.message
        });
        return false;
    }
}

async function checkData(tableName, displayName) {
    try {
        const result = await pool.query(`SELECT COUNT(*) as count FROM ${tableName}`);
        const count = parseInt(result.rows[0].count);

        if (count === 0) {
            checks.push({
                name: `Data: ${displayName}`,
                status: '⚠️  EMPTY',
                message: 'No records found'
            });
            return false;
        }

        checks.push({
            name: `Data: ${displayName}`,
            status: '✅ HAS DATA',
            message: `${count} records`
        });
        return true;
    } catch (error) {
        checks.push({
            name: `Data: ${displayName}`,
            status: '❌ ERROR',
            message: error.message
        });
        return false;
    }
}

async function checkSampleData(tableName, displayName, sampleQuery) {
    try {
        const result = await pool.query(sampleQuery);
        if (result.rows.length > 0) {
            const samples = result.rows.map(r => r.code || r.account_number || r.name).join(', ');
            checks.push({
                name: `Sample: ${displayName}`,
                status: '✅ AVAILABLE',
                message: `Examples: ${samples.substring(0, 50)}${samples.length > 50 ? '...' : ''}`
            });
            return true;
        } else {
            checks.push({
                name: `Sample: ${displayName}`,
                status: '⚠️  NO SAMPLES',
                message: 'Query returned no results'
            });
            return false;
        }
    } catch (error) {
        checks.push({
            name: `Sample: ${displayName}`,
            status: '❌ ERROR',
            message: error.message
        });
        return false;
    }
}

async function runChecks() {
    try {
        console.log('📋 CHECKING REQUIRED TABLES...\n');

        // 1. Chart of Accounts
        await checkTable('chart_of_accounts', ['id', 'code', 'name']);
        await checkData('chart_of_accounts', 'Chart of Accounts');
        await checkSampleData('chart_of_accounts', 'CoA Codes', 'SELECT code FROM chart_of_accounts LIMIT 3');

        // 2. Valuation Grouping Codes
        await checkTable('valuation_grouping_codes', ['id', 'code', 'name']);
        await checkData('valuation_grouping_codes', 'Valuation Grouping Codes');
        await checkSampleData('valuation_grouping_codes', 'Grouping Codes', 'SELECT code, name FROM valuation_grouping_codes LIMIT 3');

        // 3. Valuation Classes
        await checkTable('valuation_classes', ['id', 'class_code', 'class_name']);
        await checkData('valuation_classes', 'Valuation Classes');
        await checkSampleData('valuation_classes', 'Val. Classes', 'SELECT class_code, class_name FROM valuation_classes LIMIT 3');

        // 4. Account Category References
        await checkTable('account_category_references', ['id', 'code', 'name']);
        await checkData('account_category_references', 'Account Category References');
        await checkSampleData('account_category_references', 'Category Refs', 'SELECT code, name FROM account_category_references LIMIT 3');

        // 5. GL Accounts with Chart of Accounts
        await checkTable('gl_accounts', ['id', 'chart_of_accounts', 'account_number', 'account_name']);
        await checkData('gl_accounts', 'GL Accounts');
        await checkSampleData('gl_accounts', 'GL Accounts by CoA', `
      SELECT DISTINCT chart_of_accounts, COUNT(*) as count 
      FROM gl_accounts 
      GROUP BY chart_of_accounts 
      LIMIT 3
    `);

        // 6. Plants with Valuation Grouping Code
        const plantCheck = await checkTable('plants', ['id', 'plant_code', 'name']);
        if (plantCheck) {
            const plantValGroupCheck = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'plants' AND column_name = 'valuation_grouping_code'
      `);

            if (plantValGroupCheck.rows.length > 0) {
                checks.push({
                    name: 'Plant Integration',
                    status: '✅ READY',
                    message: 'Plants have valuation_grouping_code field'
                });
            } else {
                checks.push({
                    name: 'Plant Integration',
                    status: '⚠️  MISSING',
                    message: 'Plants table missing valuation_grouping_code column'
                });
            }
        }

        // Print results
        console.log('\n' + '='.repeat(80));
        console.log('VERIFICATION RESULTS');
        console.log('='.repeat(80) + '\n');

        checks.forEach(check => {
            console.log(`${check.status.padEnd(15)} ${check.name.padEnd(35)} ${check.message}`);
            if (check.status.includes('❌') || check.status.includes('⚠️')) {
                allPassed = false;
            }
        });

        console.log('\n' + '='.repeat(80));
        if (allPassed) {
            console.log('✅ ALL PREREQUISITES VERIFIED - Ready to implement Material Account Determination!');
        } else {
            console.log('⚠️  SOME ISSUES FOUND - Review above and fix before implementation');
            console.log('\nRECOMMENDATIONS:');
            checks.forEach(check => {
                if (check.status.includes('❌ MISSING')) {
                    console.log(`  • Create missing table/column: ${check.name}`);
                } else if (check.status.includes('⚠️  EMPTY')) {
                    console.log(`  • Add sample data for: ${check.name}`);
                }
            });
        }
        console.log('='.repeat(80) + '\n');

    } catch (error) {
        console.error('❌ Fatal error during verification:', error);
        process.exit(1);
    } finally {
        await pool.end();
    }

    process.exit(allPassed ? 0 : 1);
}

runChecks();
