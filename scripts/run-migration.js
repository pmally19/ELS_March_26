import dotenv from 'dotenv';
dotenv.config(); // Load environment variables from .env file
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
const { Pool } = pg



// Check if DATABASE_URL is defined
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL environment variable is not set');
  process.exit(1);
}

// Connect to the database
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

async function createMissingTables() {
  console.log('Creating missing tables...');
  
  try {
    // Create sales_organizations table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS sales_organizations (
        id SERIAL PRIMARY KEY,
        code TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        description TEXT,
        company_code_id INTEGER NOT NULL REFERENCES company_codes(id),
        currency TEXT DEFAULT 'USD',
        region TEXT,
        distribution_channel TEXT,
        industry TEXT,
        address TEXT,
        city TEXT,
        state TEXT,
        country TEXT,
        postal_code TEXT,
        phone TEXT,
        email TEXT,
        manager TEXT,
        status TEXT DEFAULT 'active' NOT NULL,
        is_active BOOLEAN DEFAULT true NOT NULL,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        created_by INTEGER,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_by INTEGER,
        version INTEGER DEFAULT 1 NOT NULL
      )
    `);
    
    console.log('✅ sales_organizations table created successfully');

    // Create sd_shipping_conditions table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS sd_shipping_conditions (
        id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        condition_code VARCHAR(4) UNIQUE NOT NULL,
        description VARCHAR(100) NOT NULL,
        loading_group VARCHAR(4),
        plant_code VARCHAR(4),
        proposed_shipping_point VARCHAR(4),
        manual_shipping_point_allowed BOOLEAN DEFAULT true,
        country_of_departure VARCHAR(3),
        departure_zone VARCHAR(10),
        transportation_group VARCHAR(4),
        country_of_destination VARCHAR(3),
        receiving_zone VARCHAR(10),
        weight_group VARCHAR(4),
        proposed_route VARCHAR(6),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ sd_shipping_conditions table created successfully');

    // Create sd_incoterms table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS sd_incoterms (
        id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        incoterms_key VARCHAR(3) UNIQUE NOT NULL,
        description VARCHAR(100) NOT NULL,
        category VARCHAR(50) NOT NULL,
        applicable_version VARCHAR(10) NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ sd_incoterms table created successfully');

    // Create sd_customer_incoterms_defaults table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS sd_customer_incoterms_defaults (
        id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        customer_id INTEGER NOT NULL,
        incoterms_key VARCHAR(3) NOT NULL,
        incoterms_location VARCHAR(100) NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ sd_customer_incoterms_defaults table created successfully');

    // Create sd_sales_order_incoterms table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS sd_sales_order_incoterms (
        id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        sales_order_id INTEGER NOT NULL,
        incoterms_key VARCHAR(3) NOT NULL,
        incoterms_location VARCHAR(100) NOT NULL,
        is_defaulted BOOLEAN DEFAULT false,
        is_user_override BOOLEAN DEFAULT false,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ sd_sales_order_incoterms table created successfully');

    // Insert standard Incoterms 2020 data
    const standardIncoterms = [
      { key: 'EXW', description: 'Ex Works', category: 'All Modes', version: '2020' },
      { key: 'FCA', description: 'Free Carrier', category: 'All Modes', version: '2020' },
      { key: 'CPT', description: 'Carriage Paid To', category: 'All Modes', version: '2020' },
      { key: 'CIP', description: 'Carriage and Insurance Paid To', category: 'All Modes', version: '2020' },
      { key: 'DAP', description: 'Delivered at Place', category: 'All Modes', version: '2020' },
      { key: 'DPU', description: 'Delivered at Place Unloaded', category: 'All Modes', version: '2020' },
      { key: 'DDP', description: 'Delivered Duty Paid', category: 'All Modes', version: '2020' },
      { key: 'FAS', description: 'Free Alongside Ship', category: 'Sea/Inland Waterway', version: '2020' },
      { key: 'FOB', description: 'Free On Board', category: 'Sea/Inland Waterway', version: '2020' },
      { key: 'CFR', description: 'Cost and Freight', category: 'Sea/Inland Waterway', version: '2020' },
      { key: 'CIF', description: 'Cost, Insurance and Freight', category: 'Sea/Inland Waterway', version: '2020' }
    ];

    for (const incoterm of standardIncoterms) {
      try {
        await db.execute(sql`
          INSERT INTO sd_incoterms (incoterms_key, description, category, applicable_version)
          VALUES (${incoterm.key}, ${incoterm.description}, ${incoterm.category}, ${incoterm.version})
          ON CONFLICT (incoterms_key) DO NOTHING
        `);
      } catch (error) {
        console.log(`⚠️ Could not insert ${incoterm.key}: ${error.message}`);
      }
    }
    console.log('✅ Standard Incoterms 2020 data inserted successfully');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating tables:', error);
    process.exit(1);
  }
}

createMissingTables();