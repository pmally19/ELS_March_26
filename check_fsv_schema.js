import { Client } from 'pg';

const connectionString = 'postgresql://postgres:Mokshith@21@localhost:5432/mallyerp';

async function checkSchema() {
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    
    const tables = ['account_groups', 'financial_statements', 'gl_account_groups'];
    
    for (const table of tables) {
       const colQuery = `
         SELECT column_name, data_type 
         FROM information_schema.columns 
         WHERE table_name = $1;
       `;
       const colRes = await client.query(colQuery, [table]);
       console.log(`\nColumns in ${table} table:`);
       if (colRes.rows.length === 0) {
         console.log('  (Table does not exist or has no columns)');
       } else {
         colRes.rows.forEach(row => console.log(`  - ${row.column_name} (${row.data_type})`));
       }
    }

  } catch (err) {
    console.error('Error connecting or querying database:', err);
  } finally {
    await client.end();
  }
}

checkSchema();
