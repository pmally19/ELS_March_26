import pkg from 'pg';
const { Pool } = pkg;
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'mallyerp',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'Mokshith@21',
});

async function insertV3() {
  const client = await pool.connect();
  try {
    console.log('🔄 Inserting V3 Fiscal Year Variant...');
    
    // Check if V3 already exists
    const checkResult = await client.query(
      "SELECT * FROM fiscal_year_variants WHERE variant_id = 'V3'"
    );
    
    if (checkResult.rows.length > 0) {
      console.log('ℹ️  V3 variant already exists:');
      console.log(JSON.stringify(checkResult.rows[0], null, 2));
      return;
    }
    
    // Insert V3
    const insertResult = await client.query(`
      INSERT INTO fiscal_year_variants (variant_id, description, posting_periods, special_periods, year_shift, active)
      VALUES ('V3', 'Fiscal Year Variant V3 (Standard 12 Periods)', 12, 0, 0, true)
      RETURNING *
    `);
    
    console.log('✅ V3 Fiscal Year Variant inserted successfully!');
    console.log('\n📋 V3 Variant Details:');
    const v3 = insertResult.rows[0];
    console.log(`   - Variant ID: ${v3.variant_id}`);
    console.log(`   - Description: ${v3.description}`);
    console.log(`   - Posting Periods: ${v3.posting_periods}`);
    console.log(`   - Special Periods: ${v3.special_periods}`);
    console.log(`   - Year Shift: ${v3.year_shift}`);
    console.log(`   - Active: ${v3.active}`);
    
    // Show total count
    const countResult = await client.query('SELECT COUNT(*) as count FROM fiscal_year_variants');
    console.log(`\n📊 Total fiscal year variants: ${countResult.rows[0].count}`);
    
  } catch (error) {
    if (error.code === '23505') {
      console.log('ℹ️  V3 variant already exists in the table');
      // Fetch and display it
      const result = await client.query("SELECT * FROM fiscal_year_variants WHERE variant_id = 'V3'");
      if (result.rows.length > 0) {
        console.log('\n📋 Existing V3 Variant:');
        const v3 = result.rows[0];
        console.log(`   - Variant ID: ${v3.variant_id}`);
        console.log(`   - Description: ${v3.description}`);
        console.log(`   - Posting Periods: ${v3.posting_periods}`);
        console.log(`   - Special Periods: ${v3.special_periods}`);
      }
    } else {
      console.error('❌ Insert failed:', error);
      throw error;
    }
  } finally {
    client.release();
    await pool.end();
  }
}

insertV3().catch(console.error);
