import pkg from 'pg';
const { Pool } = pkg;
import 'dotenv/config';

const dbHost = process.env.DB_HOST || 'localhost';
const dbPort = process.env.DB_PORT || '5432';
const dbName = process.env.DB_NAME || 'mallyerp';
const dbUser = process.env.DB_USER || 'postgres';
const dbPassword = process.env.DB_PASSWORD || 'Mokshith@21';

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = `postgresql://${dbUser}:${encodeURIComponent(dbPassword)}@${dbHost}:${dbPort}/${dbName}`;
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function dropSalesCategoriesTable() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check if table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'sales_categories'
      );
    `);

    if (tableCheck.rows[0].exists) {
      // Check for foreign key references
      const fkCheck = await client.query(`
        SELECT 
          tc.table_name, 
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
        AND ccu.table_name = 'sales_categories';
      `);

      if (fkCheck.rows.length > 0) {
        console.log('⚠️ Found foreign key references:');
        fkCheck.rows.forEach(fk => {
          console.log(`  - ${fk.table_name}.${fk.column_name} references sales_categories`);
        });
        
        // Drop foreign key constraints first
        for (const fk of fkCheck.rows) {
          try {
            await client.query(`
              ALTER TABLE ${fk.table_name}
              DROP CONSTRAINT IF EXISTS fk_${fk.table_name}_sales_category;
            `);
            console.log(`✅ Dropped foreign key from ${fk.table_name}`);
          } catch (error) {
            // Try alternative constraint name patterns
            const constraintCheck = await client.query(`
              SELECT constraint_name
              FROM information_schema.table_constraints
              WHERE table_name = $1
              AND constraint_type = 'FOREIGN KEY'
              AND constraint_name LIKE '%sales%category%';
            `, [fk.table_name]);
            
            if (constraintCheck.rows.length > 0) {
              for (const constraint of constraintCheck.rows) {
                await client.query(`
                  ALTER TABLE ${fk.table_name}
                  DROP CONSTRAINT IF EXISTS ${constraint.constraint_name} CASCADE;
                `);
                console.log(`✅ Dropped constraint ${constraint.constraint_name} from ${fk.table_name}`);
              }
            }
          }
        }
      }

      // Drop the table
      await client.query('DROP TABLE IF EXISTS sales_categories CASCADE;');
      console.log('✅ Sales categories table dropped');
    } else {
      console.log('✅ Sales categories table does not exist');
    }

    await client.query('COMMIT');
    console.log('✅ Table removal completed successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error dropping sales categories table:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

dropSalesCategoriesTable()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });

