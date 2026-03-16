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
  password: 'Mokshith@21',
});

async function setupDiscountGroups() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Setting up discount_groups table...');
    
    // Read and execute migration
    const migrationPath = path.join(__dirname, '../database/migrations/create-discount-groups-table.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    await client.query(migrationSQL);
    console.log('✅ Migration executed successfully');
    
    // Check if data already exists
    const checkResult = await client.query('SELECT COUNT(*) as count FROM discount_groups');
    const count = parseInt(checkResult.rows[0].count);
    
    if (count > 0) {
      console.log(`ℹ️  Discount groups table already has ${count} records. Skipping seed.`);
      return;
    }
    
    // Seed sample data
    console.log('🌱 Seeding sample discount groups...');
    const seedData = [
      {
        code: 'STD',
        name: 'Standard Discount',
        description: 'Baseline percentage discount for regular customers',
        discount_percent: 5.00,
        discount_type: 'PERCENTAGE',
        minimum_order_value: 0.00,
        maximum_discount: null,
        is_active: true,
      },
      {
        code: 'VOL10',
        name: 'Volume Discount 10%',
        description: '10% discount for volume orders above minimum threshold',
        discount_percent: 10.00,
        discount_type: 'PERCENTAGE',
        minimum_order_value: 1000.00,
        maximum_discount: 500.00,
        is_active: true,
      },
      {
        code: 'VOL15',
        name: 'Volume Discount 15%',
        description: '15% discount for large volume orders',
        discount_percent: 15.00,
        discount_type: 'PERCENTAGE',
        minimum_order_value: 5000.00,
        maximum_discount: 2000.00,
        is_active: true,
      },
      {
        code: 'VIP',
        name: 'VIP Customer Discount',
        description: 'Special discount for VIP customers',
        discount_percent: 12.00,
        discount_type: 'PERCENTAGE',
        minimum_order_value: 0.00,
        maximum_discount: 1000.00,
        is_active: true,
      },
      {
        code: 'FIX50',
        name: 'Fixed Amount Discount',
        description: 'Flat discount amount for promotional orders',
        discount_percent: 50.00,
        discount_type: 'FIXED_AMOUNT',
        minimum_order_value: 200.00,
        maximum_discount: null,
        is_active: true,
      },
      {
        code: 'FIX100',
        name: 'Fixed Amount 100',
        description: 'Flat 100 discount for high value orders',
        discount_percent: 100.00,
        discount_type: 'FIXED_AMOUNT',
        minimum_order_value: 1000.00,
        maximum_discount: null,
        is_active: true,
      },
      {
        code: 'EARLY',
        name: 'Early Payment Discount',
        description: 'Discount for early payment customers',
        discount_percent: 2.00,
        discount_type: 'PERCENTAGE',
        minimum_order_value: 0.00,
        maximum_discount: 200.00,
        is_active: true,
      },
      {
        code: 'SEASON',
        name: 'Seasonal Discount',
        description: 'Seasonal promotional discount',
        discount_percent: 20.00,
        discount_type: 'PERCENTAGE',
        minimum_order_value: 500.00,
        maximum_discount: 1000.00,
        is_active: true,
      },
    ];
    
    const insertQuery = `
      INSERT INTO discount_groups (code, name, description, discount_percent, discount_type, minimum_order_value, maximum_discount, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (code) DO NOTHING
      RETURNING id, code, name
    `;
    
    let insertedCount = 0;
    for (const item of seedData) {
      const result = await client.query(insertQuery, [
        item.code,
        item.name,
        item.description,
        item.discount_percent,
        item.discount_type,
        item.minimum_order_value,
        item.maximum_discount,
        item.is_active,
      ]);
      if (result.rows.length > 0) {
        insertedCount++;
        console.log(`  ✓ Inserted: ${item.code} - ${item.name}`);
      }
    }
    
    console.log(`✅ Successfully seeded ${insertedCount} discount groups`);
    
  } catch (error) {
    console.error('❌ Error setting up discount groups:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

setupDiscountGroups()
  .then(() => {
    console.log('🎉 Discount groups setup completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Setup failed:', error);
    process.exit(1);
  });

