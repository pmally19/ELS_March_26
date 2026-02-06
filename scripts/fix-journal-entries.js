import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'mallyerp',
    user: 'postgres',
    password: 'Mokshith@21',
});

const r = await pool.query(`
  SELECT column_name 
  FROM information_schema.columns 
  WHERE table_name='journal_entries' 
  ORDER BY ordinal_position
`);

console.log('journal_entries columns:');
r.rows.forEach(x => console.log('  ' + x.column_name));

// Add missing columns
const addCols = [
    'ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS gl_account VARCHAR(20)',
    'ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS account_type VARCHAR(50)',
    'ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS company_code_id INTEGER REFERENCES company_codes(id)'
];

for (const sql of addCols) {
    try {
        await pool.query(sql);
        console.log(`✅ ${sql.split('ADD COLUMN IF NOT EXISTS')[1]?.split(' ')[1] || 'column'} added/verified`);
    } catch (e) {
        console.log(`⚠️  ${e.message}`);
    }
}

await pool.end();
