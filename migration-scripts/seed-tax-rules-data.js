import pkg from 'pg';
const { Pool } = pkg;
import 'dotenv/config';

async function seedTaxRulesData() {
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
    console.log('🔄 Starting seed: Add sample tax rules data...');
    client = await pool.connect();

    // Check if tables exist
    const tablesCheck = await client.query(`
      SELECT 
        EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tax_rules') as rules_exists,
        EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tax_profiles') as profiles_exists,
        EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tax_jurisdictions') as jurisdictions_exists;
    `);

    if (!tablesCheck.rows[0].rules_exists) {
      console.log('❌ Table tax_rules does not exist. Please create it first.');
      return;
    }
    if (!tablesCheck.rows[0].profiles_exists) {
      console.log('❌ Table tax_profiles does not exist. Please create it first.');
      return;
    }

    // Get existing tax profiles
    const profilesResult = await client.query('SELECT id, profile_code FROM tax_profiles WHERE is_active = true');
    const profiles = profilesResult.rows;
    
    if (profiles.length === 0) {
      console.log('⚠️  No active tax profiles found. Creating tax rules requires at least one tax profile.');
      return;
    }

    console.log(`✅ Found ${profiles.length} active tax profiles`);

    // Get existing tax jurisdictions
    const jurisdictionsResult = await client.query('SELECT id, jurisdiction_code FROM tax_jurisdictions WHERE is_active = true LIMIT 20');
    const jurisdictions = jurisdictionsResult.rows;
    
    console.log(`✅ Found ${jurisdictions.length} active tax jurisdictions`);

    // Get profile IDs by code
    const profileMap = {};
    profiles.forEach(p => {
      profileMap[p.profile_code] = p.id;
    });

    // Get jurisdiction IDs by code (first 5 for variety)
    const jurisdictionMap = {};
    jurisdictions.slice(0, 5).forEach(j => {
      jurisdictionMap[j.jurisdiction_code] = j.id;
    });

    // Sample tax rules data
    const taxRules = [
      {
        profileId: profileMap['US01'] || profiles[0].id,
        ruleCode: 'US-STD',
        title: 'US Standard Sales Tax',
        ratePercent: 8.25,
        jurisdiction: 'US',
        taxJurisdictionId: jurisdictionMap['US-FED'] || jurisdictions[0]?.id || null,
        appliesTo: 'Goods',
        postingAccount: '2000',
        effectiveFrom: '2024-01-01',
        effectiveTo: null,
        isActive: true
      },
      {
        profileId: profileMap['US01'] || profiles[0].id,
        ruleCode: 'US-CA',
        title: 'California Sales Tax',
        ratePercent: 7.25,
        jurisdiction: 'US-CA',
        taxJurisdictionId: jurisdictionMap['US-CA'] || jurisdictions[1]?.id || null,
        appliesTo: 'Goods',
        postingAccount: '2001',
        effectiveFrom: '2024-01-01',
        effectiveTo: null,
        isActive: true
      },
      {
        profileId: profileMap['US01'] || profiles[0].id,
        ruleCode: 'US-NY',
        title: 'New York Sales Tax',
        ratePercent: 8.0,
        jurisdiction: 'US-NY',
        taxJurisdictionId: jurisdictionMap['US-NY'] || jurisdictions[2]?.id || null,
        appliesTo: 'Goods',
        postingAccount: '2002',
        effectiveFrom: '2024-01-01',
        effectiveTo: null,
        isActive: true
      },
      {
        profileId: profileMap['IN01'] || profiles[1]?.id || profiles[0].id,
        ruleCode: 'IN-GST',
        title: 'India GST Standard',
        ratePercent: 18.0,
        jurisdiction: 'IN',
        taxJurisdictionId: jurisdictionMap['IN-FED'] || jurisdictions[3]?.id || null,
        appliesTo: 'Goods',
        postingAccount: '2100',
        effectiveFrom: '2024-01-01',
        effectiveTo: null,
        isActive: true
      },
      {
        profileId: profileMap['IN01'] || profiles[1]?.id || profiles[0].id,
        ruleCode: 'IN-GST-LOW',
        title: 'India GST Reduced Rate',
        ratePercent: 5.0,
        jurisdiction: 'IN',
        taxJurisdictionId: jurisdictionMap['IN-FED'] || jurisdictions[3]?.id || null,
        appliesTo: 'Goods',
        postingAccount: '2101',
        effectiveFrom: '2024-01-01',
        effectiveTo: null,
        isActive: true
      },
      {
        profileId: profileMap['UK01'] || profiles[2]?.id || profiles[0].id,
        ruleCode: 'UK-VAT',
        title: 'UK VAT Standard',
        ratePercent: 20.0,
        jurisdiction: 'UK',
        taxJurisdictionId: jurisdictionMap['UK-FED'] || jurisdictions[4]?.id || null,
        appliesTo: 'Goods',
        postingAccount: '2200',
        effectiveFrom: '2024-01-01',
        effectiveTo: null,
        isActive: true
      },
      {
        profileId: profileMap['UK01'] || profiles[2]?.id || profiles[0].id,
        ruleCode: 'UK-VAT-RED',
        title: 'UK VAT Reduced Rate',
        ratePercent: 5.0,
        jurisdiction: 'UK',
        taxJurisdictionId: jurisdictionMap['UK-FED'] || jurisdictions[4]?.id || null,
        appliesTo: 'Goods',
        postingAccount: '2201',
        effectiveFrom: '2024-01-01',
        effectiveTo: null,
        isActive: true
      },
      {
        profileId: profileMap['US01'] || profiles[0].id,
        ruleCode: 'US-SERV',
        title: 'US Service Tax',
        ratePercent: 6.5,
        jurisdiction: 'US',
        taxJurisdictionId: jurisdictionMap['US-FED'] || jurisdictions[0]?.id || null,
        appliesTo: 'Services',
        postingAccount: '2003',
        effectiveFrom: '2024-01-01',
        effectiveTo: null,
        isActive: true
      },
      {
        profileId: profileMap['US01'] || profiles[0].id,
        ruleCode: 'US-TX',
        title: 'Texas Sales Tax',
        ratePercent: 6.25,
        jurisdiction: 'US-TX',
        taxJurisdictionId: jurisdictionMap['US-TX'] || jurisdictions[1]?.id || null,
        appliesTo: 'Goods',
        postingAccount: '2004',
        effectiveFrom: '2024-01-01',
        effectiveTo: null,
        isActive: true
      },
      {
        profileId: profileMap['US01'] || profiles[0].id,
        ruleCode: 'US-FL',
        title: 'Florida Sales Tax',
        ratePercent: 6.0,
        jurisdiction: 'US-FL',
        taxJurisdictionId: jurisdictionMap['US-FL'] || jurisdictions[2]?.id || null,
        appliesTo: 'Goods',
        postingAccount: '2005',
        effectiveFrom: '2024-01-01',
        effectiveTo: null,
        isActive: true
      }
    ];

    let inserted = 0;
    let skipped = 0;

    for (const rule of taxRules) {
      // Check if rule already exists
      const existing = await client.query(
        'SELECT id FROM tax_rules WHERE rule_code = $1',
        [rule.ruleCode]
      );

      if (existing.rows.length > 0) {
        console.log(`⏭️  Skipping ${rule.ruleCode} - already exists`);
        skipped++;
        continue;
      }

      // Insert tax rule
      await client.query(`
        INSERT INTO tax_rules (
          profile_id, rule_code, title, rate_percent, 
          jurisdiction, tax_jurisdiction_id, applies_to, 
          posting_account, effective_from, effective_to, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      `, [
        rule.profileId,
        rule.ruleCode,
        rule.title,
        rule.ratePercent,
        rule.jurisdiction,
        rule.taxJurisdictionId,
        rule.appliesTo,
        rule.postingAccount,
        rule.effectiveFrom,
        rule.effectiveTo,
        rule.isActive
      ]);

      inserted++;
      console.log(`✅ Inserted tax rule: ${rule.ruleCode} - ${rule.title}`);
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

seedTaxRulesData()
  .then(() => {
    console.log('🎉 Seed script finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Seed script failed:', error);
    process.exit(1);
  });

