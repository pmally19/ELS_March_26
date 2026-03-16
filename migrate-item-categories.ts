import { db, pool } from './server/db.ts';

async function migrateItemCategories() {
  console.log('Starting migration for Item Category Determination...');
  
  try {
    // 1. Create table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sd_item_category_determination (
        id SERIAL PRIMARY KEY,
        document_type VARCHAR(4) NOT NULL,
        item_category_group VARCHAR(10) NOT NULL,
        item_usage VARCHAR(10),
        higher_level_item_category VARCHAR(4),
        default_item_category VARCHAR(4) NOT NULL,
        manual_item_category_1 VARCHAR(4),
        manual_item_category_2 VARCHAR(4),
        manual_item_category_3 VARCHAR(4),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('Table sd_item_category_determination ensured.');

    // 2. Add composite index if it doesn't exist
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_sd_item_cat_det 
      ON sd_item_category_determination (document_type, item_category_group);
    `);
    console.log('Index ensured.');

    // 3. Populate default standard SAP combinations
    const defaultRules = [
      // Standard Orders (OR)
      { doc: 'OR', icg: 'NORM', def: 'TAN', m1: 'TAP', m2: 'TAQ', m3: 'TANN' },
      { doc: 'OR', icg: 'BANS', def: 'TAS', m1: 'TATX', m2: null, m3: null },
      { doc: 'OR', icg: 'BANC', def: 'TAB', m1: 'TATX', m2: null, m3: null },
      { doc: 'OR', icg: 'DIEN', def: 'TAD', m1: 'TAW', m2: null, m3: null },
      { doc: 'OR', icg: 'LEIH', def: 'TAL', m1: null, m2: null, m3: null },
      { doc: 'OR', icg: 'NLAG', def: 'TATX', m1: null, m2: null, m3: null },
      { doc: 'OR', icg: 'VERP', def: 'ZVER', m1: null, m2: null, m3: null },
      
      // Inquiry (IN)
      { doc: 'IN', icg: 'NORM', def: 'AFN', m1: null, m2: null, m3: null },
      
      // Quotation (QT)
      { doc: 'QT', icg: 'NORM', def: 'AGN', m1: null, m2: null, m3: null },

      // Returns (RE)
      { doc: 'RE', icg: 'NORM', def: 'REN', m1: null, m2: null, m3: null },
      
      // Credit Memo Request (CR)
      { doc: 'CR', icg: 'NORM', def: 'G2N', m1: null, m2: null, m3: null },
      
      // Debit Memo Request (DR)
      { doc: 'DR', icg: 'NORM', def: 'L2N', m1: null, m2: null, m3: null },
      
      // Consignment Fill-up (KB)
      { doc: 'KB', icg: 'NORM', def: 'KBN', m1: null, m2: null, m3: null },
      
      // Consignment Issue (KE)
      { doc: 'KE', icg: 'NORM', def: 'KEN', m1: null, m2: null, m3: null }
    ];

    console.log('Inserting default SAP standard rules...');
    let insertedCount = 0;
    
    for (const rule of defaultRules) {
      // Check if rule already exists
      const existing = await pool.query(
        `SELECT id FROM sd_item_category_determination WHERE document_type = $1 AND item_category_group = $2`,
        [rule.doc, rule.icg]
      );

      if (existing.rows.length === 0) {
        await pool.query(
          `INSERT INTO sd_item_category_determination 
          (document_type, item_category_group, default_item_category, manual_item_category_1, manual_item_category_2, manual_item_category_3)
          VALUES ($1, $2, $3, $4, $5, $6)`,
          [rule.doc, rule.icg, rule.def, rule.m1, rule.m2, rule.m3]
        );
        insertedCount++;
      }
    }

    console.log(`Migration complete. Inserted ${insertedCount} rules.`);
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    process.exit(0);
  }
}

migrateItemCategories();
