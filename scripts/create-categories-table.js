import pg from 'pg';
import dotenv from 'dotenv';
const { Pool } = pg;
dotenv.config();

const dbHost = process.env.DB_HOST || 'localhost';
const dbPort = process.env.DB_PORT || '5432';
const dbName = process.env.DB_NAME || 'mallyerp';
const dbUser = process.env.DB_USER || 'postgres';
const dbPassword = process.env.DB_PASSWORD || 'Mokshith@21';

const pool = new Pool({
  host: dbHost,
  port: dbPort,
  database: dbName,
  user: dbUser,
  password: dbPassword,
});

async function createCategoriesTable() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        code VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✅ Categories table created successfully");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error creating categories table:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

createCategoriesTable();

