import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'mallyerp',
    user: 'postgres',
    password: 'Mokshith@21'
});

console.log('🔍 VENDOR CRUD ALIGNMENT VERIFICATION\n');
console.log('='.repeat(80));

async function checkDatabaseSchema() {
    console.log('\n📊 1. DATABASE SCHEMA - vendors table');
    console.log('-'.repeat(80));

    const result = await pool.query(`
    SELECT 
      column_name,
      data_type,
      is_nullable,
      column_default
    FROM information_schema.columns
    WHERE table_name = 'vendors'
    ORDER BY ordinal_position
  `);

    console.log('\nColumns in vendors table:');
    const dbColumns = {};
    result.rows.forEach(col => {
        dbColumns[col.column_name] = {
            type: col.data_type,
            nullable: col.is_nullable,
            default: col.column_default
        };
        console.log(`  ✓ ${col.column_name.padEnd(30)} ${col.data_type.padEnd(20)} ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });

    return dbColumns;
}

async function checkBackendRoutes() {
    console.log('\n\n🔧 2. BACKEND API - vendor routes');
    console.log('-'.repeat(80));

    try {
        // Check if vendorsRoutes.ts exists
        const routesPath = path.join(__dirname, '..', 'server', 'routes', 'vendorsRoutes.ts');
        if (fs.existsSync(routesPath)) {
            console.log('\n✓ Backend routes file exists: server/routes/vendorsRoutes.ts');

            // Read the file to check for POST/PATCH routes
            const content = fs.readFileSync(routesPath, 'utf8');

            if (content.includes('router.post')) {
                console.log('  ✓ POST endpoint for creating vendors');
            }
            if (content.includes('router.patch') || content.includes('router.put')) {
                console.log('  ✓ PATCH/PUT endpoint for updating vendors');
            }
            if (content.includes('router.get')) {
                console.log('  ✓ GET endpoint for fetching vendors');
            }
            if (content.includes('router.delete')) {
                console.log('  ✓ DELETE endpoint for deleting vendors');
            }
        } else {
            console.log('\n❌ Backend routes file NOT found at expected path');
        }
    } catch (error) {
        console.log('\n⚠️  Error checking backend routes:', error.message);
    }
}

async function checkFrontendForm() {
    console.log('\n\n💻 3. FRONTEND FORM - Vendor.tsx');
    console.log('-'.repeat(80));

    try {
        const vendorTsxPath = path.join(__dirname, '..', 'client', 'src', 'pages', 'master-data', 'Vendor.tsx');
        if (fs.existsSync(vendorTsxPath)) {
            console.log('\n✓ Frontend form file exists: client/src/pages/master-data/Vendor.tsx');

            const content = fs.readFileSync(vendorTsxPath, 'utf8');

            // Extract Zod schema fields
            const schemaMatch = content.match(/const vendorFormSchema = z\.object\(\{([\s\S]*?)\}\);/);
            if (schemaMatch) {
                const schemaContent = schemaMatch[1];
                const fields = schemaContent.match(/\w+:/g);

                console.log('\nForm schema fields (from vendorFormSchema):');
                const formFields = {};
                if (fields) {
                    fields.forEach(field => {
                        const fieldName = field.replace(':', '');
                        formFields[fieldName] = true;
                        const isRequired = schemaContent.includes(`${fieldName}:`) && schemaContent.includes('.min(1');
                        console.log(`  ${isRequired ? '✓' : '○'} ${fieldName.padEnd(30)} ${isRequired ? '(Required)' : '(Optional)'}`);
                    });
                }

                return formFields;
            }
        } else {
            console.log('\n❌ Frontend form file NOT found');
        }
    } catch (error) {
        console.log('\n⚠️  Error checking frontend form:', error.message);
    }

    return {};
}

async function checkCriticalFields() {
    console.log('\n\n🔑 4. CRITICAL FIELDS VERIFICATION');
    console.log('-'.repeat(80));

    // Check if vendors have required data
    const vendorCheck = await pool.query(`
    SELECT 
      COUNT(*) as total_vendors,
      COUNT(account_group_id) as with_account_group,
      COUNT(currency) as with_currency,
      COUNT(type) as with_type,
      COUNT(name) as with_name
    FROM vendors
  `);

    const stats = vendorCheck.rows[0];
    console.log('\nVendor Data Completeness:');
    console.log(`  Total vendors: ${stats.total_vendors}`);
    console.log(`  With account_group_id: ${stats.with_account_group} ${stats.with_account_group === stats.total_vendors ? '✅' : '⚠️'}`);
    console.log(`  With currency: ${stats.with_currency} ${stats.with_currency === stats.total_vendors ? '✅' : '⚠️'}`);
    console.log(`  With type: ${stats.with_type} ${stats.with_type === stats.total_vendors ? '✅' : '⚠️'}`);
    console.log(`  With name: ${stats.with_name} ${stats.with_name === stats.total_vendors ? '✅' : '⚠️'}`);

    // Sample vendor data
    console.log('\nSample vendor records (first 3):');
    const sampleVendors = await pool.query(`
    SELECT id, code, name, type, account_group_id, currency, 
           company_code_id, purchase_organization_id
    FROM vendors
    LIMIT 3
  `);

    console.table(sampleVendors.rows);
}

async function checkFieldMapping() {
    console.log('\n\n🔄 5. FIELD NAME MAPPING (DB ↔ Frontend)');
    console.log('-'.repeat(80));

    const mappings = {
        'account_group_id': 'accountGroupId',
        'company_code_id': 'companyCodeId',
        'purchase_organization_id': 'purchaseOrganizationId',
        'purchasing_group_id': 'purchasingGroupId',
        'legal_name': 'legalName',
        'search_term': 'searchTerm',
        'sort_field': 'sortField',
        'industry_key': 'industryKey',
        'industry_classification': 'industryClassification',
        'tax_id': 'taxId',
        'tax_id_2': 'taxId2',
        'tax_id_3': 'taxId3',
        'vat_number': 'vatNumber',
        'registration_number': 'registrationNumber',
        'postal_code': 'postalCode',
        'po_box': 'poBox',
        'po_box_postal_code': 'poBoxPostalCode',
        'time_zone': 'timeZone',
        'tax_jurisdiction': 'taxJurisdiction',
        'alt_phone': 'altPhone',
        'payment_terms': 'paymentTerms',
        'payment_method': 'paymentMethod',
        'alternative_payee': 'alternativePayee',
        'payment_block': 'paymentBlock',
        'house_bank': 'houseBank',
        'check_double_invoice': 'checkDoubleInvoice',
        'bank_name': 'bankName',
        'bank_account': 'bankAccount',
        'bank_routing_number': 'bankRoutingNumber',
        'swift_code': 'swiftCode',
        'bank_country': 'bankCountry',
        'bank_key': 'bankKey',
        'account_type': 'accountType',
        'bank_type_key': 'bankTypeKey',
        'minimum_order_value': 'minimumOrderValue',
        'evaluation_score': 'evaluationScore',
        'lead_time': 'leadTime',
        'authorization_group': 'authorizationGroup',
        'corporate_group': 'corporateGroup',
        'created_at': 'createdAt',
        'updated_at': 'updatedAt',
        'created_by': 'createdBy',
        'updated_by': 'updatedBy',
        'is_active': 'isActive'
    };

    console.log('\nDatabase (snake_case) → Frontend (camelCase):');
    Object.entries(mappings).forEach(([dbField, frontendField]) => {
        console.log(`  ${dbField.padEnd(35)} → ${frontendField}`);
    });
}

async function testAPIEndpoint() {
    console.log('\n\n🌐 6. API ENDPOINT TEST');
    console.log('-'.repeat(80));

    try {
        // Test if the server is running
        const response = await fetch('http://localhost:5001/api/master-data/vendor');
        if (response.ok) {
            const vendors = await response.json();
            console.log(`\n✅ API endpoint working: GET /api/master-data/vendor`);
            console.log(`   Returned ${vendors.length} vendors`);

            if (vendors.length > 0) {
                const sampleVendor = vendors[0];
                console.log('\n   Sample vendor object keys:');
                Object.keys(sampleVendor).forEach(key => {
                    console.log(`     - ${key}`);
                });
            }
        } else {
            console.log(`\n❌ API endpoint returned error: ${response.status} ${response.statusText}`);
        }
    } catch (error) {
        console.log(`\n⚠️  Could not connect to API: ${error.message}`);
        console.log('   Make sure the dev server is running (npm run dev)');
    }
}

async function main() {
    try {
        const dbColumns = await checkDatabaseSchema();
        await checkBackendRoutes();
        const formFields = await checkFrontendForm();
        await checkCriticalFields();
        await checkFieldMapping();
        await testAPIEndpoint();

        console.log('\n\n' + '='.repeat(80));
        console.log('✅ VERIFICATION COMPLETE');
        console.log('='.repeat(80));

    } catch (error) {
        console.error('\n❌ Error during verification:', error);
    } finally {
        await pool.end();
    }
}

main();
