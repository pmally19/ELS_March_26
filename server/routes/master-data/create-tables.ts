import { db } from "../../db";
import { sql } from "drizzle-orm";

export async function createMissingTables() {
  console.log("Creating missing organizational tables...");

  try {
    // Create purchase_organizations table
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
        CONSTRAINT fk_purchase_org_company_code FOREIGN KEY (company_code_id) REFERENCES company_codes(id)
      );
    `);

    // Create credit_control_areas table
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
        CONSTRAINT fk_credit_control_company_code FOREIGN KEY (company_code_id) REFERENCES company_codes(id)
      );
    `);

    // Create Customer Account Assignment Groups table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS sd_customer_account_assignment_groups (
        id SERIAL PRIMARY KEY,
        code VARCHAR(2) NOT NULL UNIQUE,
        name VARCHAR(50) NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create Material Account Assignment Groups table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS sd_material_account_assignment_groups (
        id SERIAL PRIMARY KEY,
        code VARCHAR(2) NOT NULL UNIQUE,
        name VARCHAR(50) NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    console.log("Missing tables created successfully");
    return { success: true, message: "Tables created successfully" };
  } catch (error) {
    console.error("Error creating tables:", error);
    return { success: false, message: "Error creating tables", error };
  }
}