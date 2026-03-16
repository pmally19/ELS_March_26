import pkg from 'pg';
const { Pool } = pkg;
import 'dotenv/config';

async function seedCountriesData() {
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
    console.log('🔄 Starting seed: Inserting countries data...');
    client = await pool.connect();

    // 10 countries data
    const countriesData = [
      {
        code: 'US',
        name: 'United States',
        description: 'United States of America',
        region: 'North America',
        currency_code: 'USD',
        language_code: 'en-US',
        is_active: true
      },
      {
        code: 'GB',
        name: 'United Kingdom',
        description: 'United Kingdom of Great Britain and Northern Ireland',
        region: 'Europe',
        currency_code: 'GBP',
        language_code: 'en-GB',
        is_active: true
      },
      {
        code: 'DE',
        name: 'Germany',
        description: 'Federal Republic of Germany',
        region: 'Europe',
        currency_code: 'EUR',
        language_code: 'de-DE',
        is_active: true
      },
      {
        code: 'FR',
        name: 'France',
        description: 'French Republic',
        region: 'Europe',
        currency_code: 'EUR',
        language_code: 'fr-FR',
        is_active: true
      },
      {
        code: 'JP',
        name: 'Japan',
        description: 'Japan',
        region: 'Asia',
        currency_code: 'JPY',
        language_code: 'ja-JP',
        is_active: true
      },
      {
        code: 'CN',
        name: 'China',
        description: "People's Republic of China",
        region: 'Asia',
        currency_code: 'CNY',
        language_code: 'zh-CN',
        is_active: true
      },
      {
        code: 'IN',
        name: 'India',
        description: 'Republic of India',
        region: 'Asia',
        currency_code: 'INR',
        language_code: 'en-IN',
        is_active: true
      },
      {
        code: 'CA',
        name: 'Canada',
        description: 'Canada',
        region: 'North America',
        currency_code: 'CAD',
        language_code: 'en-CA',
        is_active: true
      },
      {
        code: 'AU',
        name: 'Australia',
        description: 'Commonwealth of Australia',
        region: 'Oceania',
        currency_code: 'AUD',
        language_code: 'en-AU',
        is_active: true
      },
      {
        code: 'BR',
        name: 'Brazil',
        description: 'Federative Republic of Brazil',
        region: 'South America',
        currency_code: 'BRL',
        language_code: 'pt-BR',
        is_active: true
      }
    ];

    let inserted = 0;
    let skipped = 0;

    for (const country of countriesData) {
      try {
        // Check if country already exists
        const checkResult = await client.query(
          'SELECT id FROM countries WHERE code = $1',
          [country.code]
        );

        if (checkResult.rows.length > 0) {
          console.log(`⏭️  Country ${country.code} (${country.name}) already exists. Skipping...`);
          skipped++;
          continue;
        }

        // Insert country
        await client.query(
          `INSERT INTO countries (code, name, description, region, currency_code, language_code, is_active, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())`,
          [
            country.code,
            country.name,
            country.description,
            country.region,
            country.currency_code,
            country.language_code,
            country.is_active
          ]
        );

        console.log(`✅ Inserted: ${country.code} - ${country.name}`);
        inserted++;
      } catch (error) {
        console.error(`❌ Error inserting ${country.code} (${country.name}):`, error.message);
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   ✅ Inserted: ${inserted} countries`);
    console.log(`   ⏭️  Skipped: ${skipped} countries (already exist)`);
    console.log(`✅ Seed completed successfully`);
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

seedCountriesData()
  .then(() => {
    console.log('🎉 Seed script finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Seed script failed:', error);
    process.exit(1);
  });

