import pkg from 'pg';
const { Pool } = pkg;
import 'dotenv/config';

async function addTaxJurisdictionToTaxRules() {
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
    console.log('🔄 Starting migration: Add tax_jurisdiction_id to tax_rules table...');
    client = await pool.connect();

    // Check if column already exists
    const columnCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'tax_rules'
      AND column_name = 'tax_jurisdiction_id';
    `);

    if (columnCheck.rows.length > 0) {
      console.log('⚠️  Column tax_jurisdiction_id already exists in tax_rules table.');
    } else {
      // Check if tax_jurisdictions table exists
      const tableCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'tax_jurisdictions'
        );
      `);

      if (!tableCheck.rows[0].exists) {
        console.log('⚠️  Warning: tax_jurisdictions table does not exist. Adding column without foreign key constraint.');
        await client.query(`
          ALTER TABLE tax_rules 
          ADD COLUMN tax_jurisdiction_id INTEGER;
        `);
        console.log('✅ Added tax_jurisdiction_id column (without foreign key constraint)');
      } else {
        // Add column with foreign key constraint
        await client.query(`
          ALTER TABLE tax_rules 
          ADD COLUMN tax_jurisdiction_id INTEGER REFERENCES tax_jurisdictions(id);
        `);
        console.log('✅ Added tax_jurisdiction_id column with foreign key constraint');
      }

      // Create index for better query performance
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_tax_rules_tax_jurisdiction_id 
        ON tax_rules (tax_jurisdiction_id);
      `);
      console.log('✅ Created index on tax_jurisdiction_id');
    }

    console.log('✅ Migration completed successfully');
  } catch (error) {
    console.error('❌ Error during migration:', error);
    throw error;
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

addTaxJurisdictionToTaxRules()
  .then(() => {
    console.log('🎉 Migration script finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Migration script failed:', error);
    process.exit(1);
  });

