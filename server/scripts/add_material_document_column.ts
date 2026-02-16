import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'mallyerp',
    user: 'postgres',
    password: 'Mokshith@21'
});

async function addMaterialDocumentColumn() {
    const client = await pool.connect();
    try {
        console.log('Adding material_document column to stock_movements table...\n');

        // Check if column already exists
        const checkResult = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'stock_movements' 
      AND column_name = 'material_document'
    `);

        if (checkResult.rows.length > 0) {
            console.log('✅ material_document column already exists!');
        } else {
            // Add the column
            await client.query(`
        ALTER TABLE stock_movements 
        ADD COLUMN material_document VARCHAR(50)
      `);
            console.log('✅ material_document column added successfully!');
        }

        // Backfill existing records with document numbers
        console.log('\nBackfilling existing movements with document numbers...');

        const movementsResult = await client.query(`
      SELECT id, created_at 
      FROM stock_movements 
      WHERE material_document IS NULL 
      ORDER BY created_at ASC
    `);

        console.log(`Found ${movementsResult.rows.length} movements to update`);

        for (let i = 0; i < movementsResult.rows.length; i++) {
            const movement = movementsResult.rows[i];
            const year = new Date(movement.created_at).getFullYear();
            const docNumber = `${year}${(i + 1).toString().padStart(6, '0')}`;

            await client.query(
                'UPDATE stock_movements SET material_document = $1 WHERE id = $2',
                [docNumber, movement.id]
            );
        }

        console.log('✅ Backfill completed!');

        // Show sample data
        console.log('\n--- Sample Movement Records ---');
        const sampleResult = await client.query(`
      SELECT 
        id, 
        material_code, 
        material_document,
        movement_type, 
        quantity,
        posting_date,
        created_at
      FROM stock_movements 
      ORDER BY created_at DESC 
      LIMIT 5
    `);
        console.table(sampleResult.rows);

    } catch (error) {
        console.error('Error:', error.message);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

addMaterialDocumentColumn();
