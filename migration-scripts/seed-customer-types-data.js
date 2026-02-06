import pkg from 'pg';
const { Pool } = pkg;
import 'dotenv/config';

async function seedCustomerTypesData() {
  const dbHost = process.env.DB_HOST || 'localhost';
  const dbPort = process.env.DB_PORT || '5432';
  const dbName = process.env.DB_NAME || 'mallyerp';
  const dbUser = process.env.DB_USER || 'postgres';
  const dbPassword = process.env.DB_PASSWORD || 'Mokshith@21';

  const connectionString = `postgresql://${dbUser}:${encodeURIComponent(dbPassword)}@${dbHost}:${dbPort}/${dbName}`;

  const pool = new Pool({
    connectionString: connectionString,
  });

  let client;
  try {
    console.log('🔄 Starting seed: Add sample customer types data...');
    client = await pool.connect();

    // Check if table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'customer_types'
      );
    `);

    if (!tableCheck.rows[0].exists) {
      console.log('❌ Table customer_types does not exist. Please create it first.');
      return;
    }

    // Sample customer types data
    const customerTypes = [
      {
        code: 'IND',
        name: 'Individual',
        description: 'Individual customers or personal accounts',
        category: 'Consumer',
        requiresTaxId: false,
        requiresRegistration: false,
        defaultPaymentTerms: 'NET30',
        defaultCreditLimit: '5000.00',
        defaultCurrency: 'USD',
        businessRules: null,
        sortOrder: 1,
        isActive: true
      },
      {
        code: 'CORP',
        name: 'Corporate',
        description: 'Corporations and business entities',
        category: 'Business',
        requiresTaxId: true,
        requiresRegistration: true,
        defaultPaymentTerms: 'NET45',
        defaultCreditLimit: '50000.00',
        defaultCurrency: 'USD',
        businessRules: null,
        sortOrder: 2,
        isActive: true
      },
      {
        code: 'SME',
        name: 'Small & Medium Enterprise',
        description: 'Small and medium-sized businesses',
        category: 'Business',
        requiresTaxId: true,
        requiresRegistration: true,
        defaultPaymentTerms: 'NET30',
        defaultCreditLimit: '25000.00',
        defaultCurrency: 'USD',
        businessRules: null,
        sortOrder: 3,
        isActive: true
      },
      {
        code: 'GOV',
        name: 'Government',
        description: 'Government agencies and departments',
        category: 'Institutional',
        requiresTaxId: true,
        requiresRegistration: true,
        defaultPaymentTerms: 'NET60',
        defaultCreditLimit: '100000.00',
        defaultCurrency: 'USD',
        businessRules: null,
        sortOrder: 4,
        isActive: true
      },
      {
        code: 'NPO',
        name: 'Non-Profit Organization',
        description: 'Non-profit organizations and charities',
        category: 'Institutional',
        requiresTaxId: true,
        requiresRegistration: true,
        defaultPaymentTerms: 'NET30',
        defaultCreditLimit: '10000.00',
        defaultCurrency: 'USD',
        businessRules: null,
        sortOrder: 5,
        isActive: true
      },
      {
        code: 'EDU',
        name: 'Educational',
        description: 'Educational institutions (schools, universities)',
        category: 'Institutional',
        requiresTaxId: true,
        requiresRegistration: true,
        defaultPaymentTerms: 'NET45',
        defaultCreditLimit: '30000.00',
        defaultCurrency: 'USD',
        businessRules: null,
        sortOrder: 6,
        isActive: true
      },
      {
        code: 'HEALTH',
        name: 'Healthcare',
        description: 'Healthcare providers and medical facilities',
        category: 'Business',
        requiresTaxId: true,
        requiresRegistration: true,
        defaultPaymentTerms: 'NET30',
        defaultCreditLimit: '40000.00',
        defaultCurrency: 'USD',
        businessRules: null,
        sortOrder: 7,
        isActive: true
      },
      {
        code: 'RETAIL',
        name: 'Retailer',
        description: 'Retail stores and shops',
        category: 'Business',
        requiresTaxId: true,
        requiresRegistration: true,
        defaultPaymentTerms: 'NET30',
        defaultCreditLimit: '20000.00',
        defaultCurrency: 'USD',
        businessRules: null,
        sortOrder: 8,
        isActive: true
      },
      {
        code: 'DIST',
        name: 'Distributor',
        description: 'Wholesale distributors and resellers',
        category: 'Business',
        requiresTaxId: true,
        requiresRegistration: true,
        defaultPaymentTerms: 'NET45',
        defaultCreditLimit: '75000.00',
        defaultCurrency: 'USD',
        businessRules: null,
        sortOrder: 9,
        isActive: true
      },
      {
        code: 'PARTNER',
        name: 'Partner',
        description: 'Business partners and strategic alliances',
        category: 'Business',
        requiresTaxId: true,
        requiresRegistration: true,
        defaultPaymentTerms: 'NET60',
        defaultCreditLimit: '100000.00',
        defaultCurrency: 'USD',
        businessRules: null,
        sortOrder: 10,
        isActive: true
      }
    ];

    let inserted = 0;
    let skipped = 0;

    for (const ct of customerTypes) {
      // Check if customer type already exists
      const existing = await client.query(
        'SELECT id FROM customer_types WHERE code = $1',
        [ct.code]
      );

      if (existing.rows.length > 0) {
        console.log(`⏭️  Skipping ${ct.code} - already exists`);
        skipped++;
        continue;
      }

      // Insert customer type
      await client.query(`
        INSERT INTO customer_types (
          code, name, description, category,
          requires_tax_id, requires_registration,
          default_payment_terms, default_credit_limit, default_currency,
          business_rules, sort_order, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `, [
        ct.code,
        ct.name,
        ct.description,
        ct.category,
        ct.requiresTaxId,
        ct.requiresRegistration,
        ct.defaultPaymentTerms,
        ct.defaultCreditLimit,
        ct.defaultCurrency,
        ct.businessRules,
        ct.sortOrder,
        ct.isActive
      ]);

      inserted++;
      console.log(`✅ Inserted customer type: ${ct.code} - ${ct.name}`);
    }

    console.log(`\n✅ Seed completed: ${inserted} inserted, ${skipped} skipped`);
  } catch (error) {
    console.error('❌ Error during seed:', error);
    throw error;
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

seedCustomerTypesData()
  .then(() => {
    console.log('🎉 Seed script finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Seed script failed:', error);
    process.exit(1);
  });

