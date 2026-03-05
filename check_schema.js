const { Client } = require('pg');

const client = new Client({
    connectionString: 'postgresql://postgres:Mokshith@21@localhost:5432/mallyerp'
});

client.connect()
    .then(() => client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'sales_order_item_conditions' 
    ORDER BY ordinal_position;
  `))
    .then(r => {
        console.table(r.rows);
        return client.query(`
      SELECT * 
      FROM sales_order_item_conditions 
      ORDER BY created_at DESC 
      LIMIT 1;
    `);
    })
    .then(r => {
        console.log("Latest condition record:");
        console.dir(r.rows, { depth: null });
        process.exit(0);
    })
    .catch(e => {
        console.error(e);
        process.exit(1);
    });
