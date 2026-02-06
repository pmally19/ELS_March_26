import pkg from 'pg';
const { Pool } = pkg;
import 'dotenv/config';

async function seedTaxJurisdictionsData() {
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
    console.log('🔄 Starting seed: Add sample tax jurisdictions data...');
    client = await pool.connect();

    // Check if table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'tax_jurisdictions'
      );
    `);

    if (!tableCheck.rows[0].exists) {
      console.log('❌ Table tax_jurisdictions does not exist. Please run create-tax-jurisdictions-table.js first.');
      return;
    }

    // Sample tax jurisdictions data - hierarchical structure
    const taxJurisdictions = [
      // Federal/National Level
      {
        code: 'US-FED',
        name: 'United States Federal',
        type: 'Federal',
        parentId: null,
        country: 'US',
        stateProvince: null,
        county: null,
        city: null,
        postalCodePattern: null,
        isActive: true
      },
      {
        code: 'CA-FED',
        name: 'Canada Federal',
        type: 'Federal',
        parentId: null,
        country: 'CA',
        stateProvince: null,
        county: null,
        city: null,
        postalCodePattern: null,
        isActive: true
      },
      {
        code: 'UK-FED',
        name: 'United Kingdom National',
        type: 'Federal',
        parentId: null,
        country: 'GB',
        stateProvince: null,
        county: null,
        city: null,
        postalCodePattern: null,
        isActive: true
      },

      // State/Province Level - United States
      {
        code: 'US-CA',
        name: 'California State',
        type: 'State',
        parentId: null, // Will set after inserting parent
        country: 'US',
        stateProvince: 'CA',
        county: null,
        city: null,
        postalCodePattern: '9####',
        isActive: true
      },
      {
        code: 'US-NY',
        name: 'New York State',
        type: 'State',
        parentId: null,
        country: 'US',
        stateProvince: 'NY',
        county: null,
        city: null,
        postalCodePattern: '1####',
        isActive: true
      },
      {
        code: 'US-TX',
        name: 'Texas State',
        type: 'State',
        parentId: null,
        country: 'US',
        stateProvince: 'TX',
        county: null,
        city: null,
        postalCodePattern: '7####',
        isActive: true
      },
      {
        code: 'US-FL',
        name: 'Florida State',
        type: 'State',
        parentId: null,
        country: 'US',
        stateProvince: 'FL',
        county: null,
        city: null,
        postalCodePattern: '3####',
        isActive: true
      },

      // State/Province Level - Canada
      {
        code: 'CA-ON',
        name: 'Ontario Province',
        type: 'Province',
        parentId: null,
        country: 'CA',
        stateProvince: 'ON',
        county: null,
        city: null,
        postalCodePattern: 'K#A #A#',
        isActive: true
      },
      {
        code: 'CA-BC',
        name: 'British Columbia Province',
        type: 'Province',
        parentId: null,
        country: 'CA',
        stateProvince: 'BC',
        county: null,
        city: null,
        postalCodePattern: 'V#A #A#',
        isActive: true
      },

      // County Level - California
      {
        code: 'US-CA-LA',
        name: 'Los Angeles County',
        type: 'County',
        parentId: null, // Will set after inserting
        country: 'US',
        stateProvince: 'CA',
        county: 'Los Angeles',
        city: null,
        postalCodePattern: '90###',
        isActive: true
      },
      {
        code: 'US-CA-SF',
        name: 'San Francisco County',
        type: 'County',
        parentId: null,
        country: 'US',
        stateProvince: 'CA',
        county: 'San Francisco',
        city: null,
        postalCodePattern: '94###',
        isActive: true
      },

      // City Level
      {
        code: 'US-CA-LA-LAX',
        name: 'Los Angeles City',
        type: 'City',
        parentId: null,
        country: 'US',
        stateProvince: 'CA',
        county: 'Los Angeles',
        city: 'Los Angeles',
        postalCodePattern: '900##',
        isActive: true
      },
      {
        code: 'US-CA-SF-SFO',
        name: 'San Francisco City',
        type: 'City',
        parentId: null,
        country: 'US',
        stateProvince: 'CA',
        county: 'San Francisco',
        city: 'San Francisco',
        postalCodePattern: '941##',
        isActive: true
      },
      {
        code: 'US-NY-NYC',
        name: 'New York City',
        type: 'City',
        parentId: null,
        country: 'US',
        stateProvince: 'NY',
        county: null,
        city: 'New York',
        postalCodePattern: '100##',
        isActive: true
      },

      // Additional jurisdictions
      {
        code: 'US-IL',
        name: 'Illinois State',
        type: 'State',
        parentId: null,
        country: 'US',
        stateProvince: 'IL',
        county: null,
        city: null,
        postalCodePattern: '6####',
        isActive: true
      },
      {
        code: 'US-WA',
        name: 'Washington State',
        type: 'State',
        parentId: null,
        country: 'US',
        stateProvince: 'WA',
        county: null,
        city: null,
        postalCodePattern: '98###',
        isActive: true
      },
      {
        code: 'DE-FED',
        name: 'Germany Federal',
        type: 'Federal',
        parentId: null,
        country: 'DE',
        stateProvince: null,
        county: null,
        city: null,
        postalCodePattern: null,
        isActive: true
      },
      {
        code: 'FR-FED',
        name: 'France National',
        type: 'Federal',
        parentId: null,
        country: 'FR',
        stateProvince: null,
        county: null,
        city: null,
        postalCodePattern: null,
        isActive: true
      },
      {
        code: 'IN-FED',
        name: 'India Federal',
        type: 'Federal',
        parentId: null,
        country: 'IN',
        stateProvince: null,
        county: null,
        city: null,
        postalCodePattern: null,
        isActive: true
      },
    ];

    console.log(`📝 Preparing to insert ${taxJurisdictions.length} tax jurisdictions...`);

    let inserted = 0;
    let skipped = 0;
    const parentIdMap = {};

    // First pass: Insert all jurisdictions and build parent ID map
    for (const tj of taxJurisdictions) {
      try {
        // Check if already exists
        const existsCheck = await client.query(
          `SELECT id FROM tax_jurisdictions WHERE jurisdiction_code = $1`,
          [tj.code]
        );

        if (existsCheck.rows.length > 0) {
          parentIdMap[tj.code] = existsCheck.rows[0].id;
          skipped++;
          console.log(`⏭️  Skipped: ${tj.code} - ${tj.name} (already exists)`);
          continue;
        }

        // Insert jurisdiction
        const result = await client.query(
          `INSERT INTO tax_jurisdictions (
            jurisdiction_code, 
            jurisdiction_name, 
            jurisdiction_type,
            parent_jurisdiction_id,
            country, 
            state_province, 
            county, 
            city, 
            postal_code_pattern, 
            is_active
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING id`,
          [
            tj.code,
            tj.name,
            tj.type,
            null, // Will update parent IDs in second pass
            tj.country || null,
            tj.stateProvince || null,
            tj.county || null,
            tj.city || null,
            tj.postalCodePattern || null,
            tj.isActive
          ]
        );

        const newId = result.rows[0].id;
        parentIdMap[tj.code] = newId;
        inserted++;
        console.log(`✅ Inserted: ${tj.code} - ${tj.name} (ID: ${newId})`);
      } catch (error) {
        console.error(`❌ Error inserting ${tj.code}:`, error.message);
      }
    }

    // Second pass: Update parent jurisdiction IDs for hierarchical relationships
    console.log(`\n🔄 Updating parent jurisdiction relationships...`);
    let updated = 0;

    for (const tj of taxJurisdictions) {
      if (!tj.parentId) continue; // Skip if no parent specified by code

      const childId = parentIdMap[tj.code];
      const parentId = parentIdMap[tj.parentId];

      if (childId && parentId) {
        try {
          await client.query(
            `UPDATE tax_jurisdictions 
             SET parent_jurisdiction_id = $1 
             WHERE id = $2`,
            [parentId, childId]
          );
          updated++;
          console.log(`✅ Updated parent: ${tj.code} -> ${tj.parentId}`);
        } catch (error) {
          console.error(`❌ Error updating parent for ${tj.code}:`, error.message);
        }
      }
    }

    // Set logical parent-child relationships based on hierarchy
    const hierarchyUpdates = [
      { child: 'US-CA-LA', parent: 'US-CA' },
      { child: 'US-CA-SF', parent: 'US-CA' },
      { child: 'US-CA-LA-LAX', parent: 'US-CA-LA' },
      { child: 'US-CA-SF-SFO', parent: 'US-CA-SF' },
    ];

    for (const { child, parent } of hierarchyUpdates) {
      const childId = parentIdMap[child];
      const parentId = parentIdMap[parent];

      if (childId && parentId) {
        try {
          await client.query(
            `UPDATE tax_jurisdictions 
             SET parent_jurisdiction_id = $1 
             WHERE id = $2 
             AND (parent_jurisdiction_id IS NULL OR parent_jurisdiction_id != $1)`,
            [parentId, childId]
          );
          console.log(`✅ Set hierarchy: ${child} -> ${parent}`);
        } catch (error) {
          // Ignore if already set
        }
      }
    }

    console.log(`\n✅ Seed completed successfully!`);
    console.log(`   - Inserted: ${inserted} new tax jurisdictions`);
    console.log(`   - Skipped: ${skipped} existing tax jurisdictions`);
    console.log(`   - Updated: ${updated + hierarchyUpdates.length} parent relationships`);
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

seedTaxJurisdictionsData()
  .then(() => {
    console.log('🎉 Seed script finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Seed script failed:', error);
    process.exit(1);
  });

