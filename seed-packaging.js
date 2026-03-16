const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://postgres:Mokshith@21@localhost:5432/mallyerp' });

async function seed() {
    try {
        const res = await pool.query(`
      INSERT INTO packaging_material_types (code, name, max_weight, weight_unit, is_active)
      VALUES 
        ('P001', 'Standard Wooden Pallet', 1000.0, 'KG', true),
        ('P002', 'Euro Pallet', 1500.0, 'KG', true),
        ('BX01', 'Small Cardboard Box', 5.0, 'KG', true),
        ('BX02', 'Medium Cardboard Box', 15.0, 'KG', true),
        ('BX03', 'Large Cardboard Box', 30.0, 'KG', true),
        ('CR01', 'Wooden Shipping Crate', 500.0, 'KG', true)
      ON CONFLICT (code) DO NOTHING
      RETURNING *;
    `);
        console.log('Seeded successfully!', res.rows.length, 'rows inserted.');
    } catch (err) {
        if (err.code === '42P10') { // unique constraint code is 23505 usually, but checking conflict
            console.log('Unique conflict, but we used DO NOTHING. Msg:', err.message);
        } else {
            console.error('Error seeding data:', err);
        }
    } finally {
        await pool.end();
    }
}

seed();
