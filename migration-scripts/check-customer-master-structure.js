const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://postgres:Mokshith%4021@localhost:5432/mallyerp'
});

async function checkStructure() {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type, character_maximum_length, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'customer_master'
      ORDER BY ordinal_position
    `);
    
    console.log('Customer Master Table Structure:');
    console.table(result.rows);
    
    // Check if type column exists
    const typeColumn = result.rows.find(r => r.column_name === 'type');
    if (typeColumn) {
      console.log('\n✅ Type column exists:', typeColumn);
    } else {
      console.log('\n❌ Type column does not exist');
    }
    
    pool.end();
  } catch (error) {
    console.error('Error:', error.message);
    pool.end();
  }
}

checkStructure();
