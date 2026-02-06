import pg from 'pg';
const { Pool } = pg
import dotenv from 'dotenv';
dotenv.config();
import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
// Configure neon for WebSocket


// Check if DATABASE_URL is defined
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL environment variable is not set');
  process.exit(1);
}

// Connect to the database
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

async function createSalesOrganizationsTable() {
  console.log('Creating sales_organizations table if it does not exist...');
  
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS sales_organizations (
        id SERIAL PRIMARY KEY,
        code VARCHAR(10) NOT NULL,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        company_code_id INTEGER NOT NULL,
        region VARCHAR(50),
        distribution_channel VARCHAR(50),
        industry VARCHAR(50),
        currency VARCHAR(3) NOT NULL DEFAULT 'USD',
        address TEXT,
        city VARCHAR(100),
        state VARCHAR(100),
        country VARCHAR(100),
        postal_code VARCHAR(20),
        phone VARCHAR(20),
        email VARCHAR(100),
        manager VARCHAR(100),
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        is_active BOOLEAN NOT NULL DEFAULT true,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    console.log('✅ sales_organizations table created or already exists');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating sales_organizations table:', error);
    process.exit(1);
  }
}

createSalesOrganizationsTable();