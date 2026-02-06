import pkg from 'pg';
const { Pool } = pkg;
import 'dotenv/config';

async function seedStatesData() {
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
    console.log('🔄 Starting seed: Add sample states data...');
    client = await pool.connect();

    // Check if table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'states'
      );
    `);

    if (!tableCheck.rows[0].exists) {
      console.log('❌ Table states does not exist. Please run create-states-table.js first.');
      return;
    }

    // Get country IDs for reference
    const countriesResult = await client.query(`SELECT id, code FROM countries WHERE is_active = true`);
    const countryMap = {};
    countriesResult.rows.forEach(row => {
      countryMap[row.code] = row.id;
    });

    // Get tax jurisdiction IDs for reference
    const taxJurisdictionsResult = await client.query(`SELECT id, jurisdiction_code FROM tax_jurisdictions WHERE is_active = true`);
    const taxJurisdictionMap = {};
    taxJurisdictionsResult.rows.forEach(row => {
      taxJurisdictionMap[row.jurisdiction_code] = row.id;
    });

    // Sample states data
    const statesData = [
      // United States States
      {
        code: 'CA',
        name: 'California',
        description: 'State of California',
        countryCode: 'US',
        region: 'West Coast',
        taxJurisdictionCode: 'US-CA',
        isActive: true
      },
      {
        code: 'NY',
        name: 'New York',
        description: 'State of New York',
        countryCode: 'US',
        region: 'Northeast',
        taxJurisdictionCode: 'US-NY',
        isActive: true
      },
      {
        code: 'TX',
        name: 'Texas',
        description: 'State of Texas',
        countryCode: 'US',
        region: 'South',
        taxJurisdictionCode: 'US-TX',
        isActive: true
      },
      {
        code: 'FL',
        name: 'Florida',
        description: 'State of Florida',
        countryCode: 'US',
        region: 'Southeast',
        taxJurisdictionCode: 'US-FL',
        isActive: true
      },
      {
        code: 'IL',
        name: 'Illinois',
        description: 'State of Illinois',
        countryCode: 'US',
        region: 'Midwest',
        taxJurisdictionCode: 'US-IL',
        isActive: true
      },
      {
        code: 'WA',
        name: 'Washington',
        description: 'State of Washington',
        countryCode: 'US',
        region: 'West Coast',
        taxJurisdictionCode: 'US-WA',
        isActive: true
      },
      {
        code: 'GA',
        name: 'Georgia',
        description: 'State of Georgia',
        countryCode: 'US',
        region: 'Southeast',
        isActive: true
      },
      {
        code: 'NC',
        name: 'North Carolina',
        description: 'State of North Carolina',
        countryCode: 'US',
        region: 'Southeast',
        isActive: true
      },

      // Canadian Provinces
      {
        code: 'ON',
        name: 'Ontario',
        description: 'Province of Ontario',
        countryCode: 'CA',
        region: 'Central',
        taxJurisdictionCode: 'CA-ON',
        isActive: true
      },
      {
        code: 'BC',
        name: 'British Columbia',
        description: 'Province of British Columbia',
        countryCode: 'CA',
        region: 'West Coast',
        taxJurisdictionCode: 'CA-BC',
        isActive: true
      },
      {
        code: 'QC',
        name: 'Quebec',
        description: 'Province of Quebec',
        countryCode: 'CA',
        region: 'East',
        isActive: true
      },

      // Other countries
      {
        code: 'ENG',
        name: 'England',
        description: 'England',
        countryCode: 'GB',
        region: 'United Kingdom',
        isActive: true
      },
      {
        code: 'SCOT',
        name: 'Scotland',
        description: 'Scotland',
        countryCode: 'GB',
        region: 'United Kingdom',
        isActive: true
      },
      {
        code: 'BY',
        name: 'Bayern',
        description: 'Free State of Bavaria',
        countryCode: 'DE',
        region: 'South',
        isActive: true
      },
      {
        code: 'NW',
        name: 'Nordrhein-Westfalen',
        description: 'North Rhine-Westphalia',
        countryCode: 'DE',
        region: 'West',
        isActive: true
      },
      {
        code: 'IDF',
        name: 'Île-de-France',
        description: 'Paris Region',
        countryCode: 'FR',
        region: 'North',
        isActive: true
      },
      {
        code: 'MH',
        name: 'Maharashtra',
        description: 'State of Maharashtra',
        countryCode: 'IN',
        region: 'West',
        isActive: true
      },
      {
        code: 'DL',
        name: 'Delhi',
        description: 'National Capital Territory of Delhi',
        countryCode: 'IN',
        region: 'North',
        isActive: true
      },
    ];

    console.log(`📝 Preparing to insert ${statesData.length} states...`);

    let inserted = 0;
    let skipped = 0;

    for (const state of statesData) {
      try {
        // Check if already exists
        const existsCheck = await client.query(
          `SELECT id FROM states WHERE code = $1 AND ($2::INTEGER IS NULL OR country_id = $2)`,
          [state.code, countryMap[state.countryCode] || null]
        );

        if (existsCheck.rows.length > 0) {
          skipped++;
          console.log(`⏭️  Skipped: ${state.code} - ${state.name} (already exists)`);
          continue;
        }

        // Get country ID
        const countryId = countryMap[state.countryCode] || null;
        const taxJurisdictionId = state.taxJurisdictionCode ? (taxJurisdictionMap[state.taxJurisdictionCode] || null) : null;

        // Insert state
        const result = await client.query(
          `INSERT INTO states (
            code, 
            name, 
            description,
            country_id,
            region, 
            tax_jurisdiction_id,
            is_active
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT DO NOTHING
          RETURNING id`,
          [
            state.code,
            state.name,
            state.description || null,
            countryId,
            state.region || null,
            taxJurisdictionId,
            state.isActive
          ]
        );

        if (result.rows.length > 0) {
          inserted++;
          console.log(`✅ Inserted: ${state.code} - ${state.name} (ID: ${result.rows[0].id})`);
        } else {
          skipped++;
          console.log(`⏭️  Skipped: ${state.code} - ${state.name} (conflict)`);
        }
      } catch (error) {
        console.error(`❌ Error inserting ${state.code}:`, error.message);
      }
    }

    console.log(`\n✅ Seed completed successfully!`);
    console.log(`   - Inserted: ${inserted} new states`);
    console.log(`   - Skipped: ${skipped} existing states`);
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

seedStatesData()
  .then(() => {
    console.log('🎉 Seed script finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Seed script failed:', error);
    process.exit(1);
  });

