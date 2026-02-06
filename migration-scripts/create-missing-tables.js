import pg from 'pg';
const { Pool } = pg
import dotenv from 'dotenv';
dotenv.config();
import { purchaseOrganizations, creditControlAreas } from '../shared/organizational-schema.js';
import { migrate } from 'drizzle-orm/neon-serverless/migrator';


import { drizzle } from 'drizzle-orm/neon-serverless';
// Create a connection to the database
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

async function createMissingTables() {
  console.log('Creating missing organizational tables...');
  
  try {
    // Check if purchase_organizations table exists
    const purchaseOrgExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'purchase_organizations'
      );
    `);
    
    if (!purchaseOrgExists[0].exists) {
      console.log('Creating purchase_organizations table...');
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS purchase_organizations (
          id SERIAL PRIMARY KEY,
          code VARCHAR(10) NOT NULL,
          name VARCHAR(100) NOT NULL,
          description TEXT,
          company_code_id INTEGER NOT NULL,
          currency VARCHAR(3) DEFAULT 'USD',
          purchasing_manager VARCHAR(100),
          email VARCHAR(100),
          phone VARCHAR(50),
          address TEXT,
          is_active BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
          created_by INTEGER,
          updated_by INTEGER,
          CONSTRAINT fk_company_code FOREIGN KEY (company_code_id) REFERENCES company_codes(id)
        );
      `);
      console.log('purchase_organizations table created successfully.');
    } else {
      console.log('purchase_organizations table already exists.');
    }
    
    // Check if credit_control_areas table exists
    const creditControlExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'credit_control_areas'
      );
    `);
    
    if (!creditControlExists[0].exists) {
      console.log('Creating credit_control_areas table...');
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS credit_control_areas (
          id SERIAL PRIMARY KEY,
          code VARCHAR(10) NOT NULL,
          name VARCHAR(100) NOT NULL,
          description TEXT,
          company_code_id INTEGER NOT NULL,
          credit_checking_group VARCHAR(50),
          credit_period INTEGER DEFAULT 30,
          grace_percentage DECIMAL DEFAULT 10,
          blocking_reason VARCHAR(100),
          review_frequency VARCHAR(20) DEFAULT 'monthly',
          currency VARCHAR(3) DEFAULT 'USD',
          credit_approver VARCHAR(100),
          status VARCHAR(20) DEFAULT 'active',
          is_active BOOLEAN DEFAULT TRUE,
          notes TEXT,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
          created_by INTEGER,
          updated_by INTEGER,
          CONSTRAINT fk_company_code FOREIGN KEY (company_code_id) REFERENCES company_codes(id)
        );
      `);
      console.log('credit_control_areas table created successfully.');
    } else {
      console.log('credit_control_areas table already exists.');
    }
    
    console.log('All missing tables created successfully!');
  } catch (error) {
    console.error('Error creating tables:', error);
  } finally {
    await pool.end();
  }
}

createMissingTables();