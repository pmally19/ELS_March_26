import pg from 'pg';

const pool = new pg.Pool({
    host: 'localhost',
    port: 5432,
    database: 'mallyerp',
    user: 'postgres',
    password: 'Mokshith@21'
});

async function runMigration() {
    try {
        console.log('\n🚀 Running time_entries table migration...\n');

        // Drop existing table if it exists
        await pool.query('DROP TABLE IF EXISTS time_entries CASCADE');
        console.log('✓ Dropped existing time_entries table (if existed)');

        // Create time_entries table
        await pool.query(`
      CREATE TABLE time_entries (
        id SERIAL PRIMARY KEY,
        employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        work_date DATE NOT NULL,
        time_type VARCHAR(50) NOT NULL DEFAULT 'Regular Hours',
        start_time TIME,
        end_time TIME,
        duration_hours DECIMAL(5,2) DEFAULT 0,
        work_order VARCHAR(20),
        activity VARCHAR(200),
        status VARCHAR(20) NOT NULL DEFAULT 'Draft',
        approved_by INTEGER REFERENCES employees(id) ON DELETE SET NULL,
        approved_date DATE,
        company_code VARCHAR(4) DEFAULT '1000',
        cost_center_id INTEGER REFERENCES cost_centers(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        active BOOLEAN DEFAULT true,
        
        CONSTRAINT chk_time_entry_status CHECK (status IN ('Draft', 'Submitted', 'Approved', 'Rejected')),
        CONSTRAINT chk_time_type CHECK (time_type IN ('Regular Hours', 'Overtime', 'Sick Leave', 'Vacation', 'Training', 'Maintenance')),
        CONSTRAINT chk_duration_positive CHECK (duration_hours >= 0)
      )
    `);
        console.log('✓ Created time_entries table');

        // Create indexes
        await pool.query('CREATE INDEX idx_time_entries_employee_id ON time_entries(employee_id)');
        await pool.query('CREATE INDEX idx_time_entries_work_date ON time_entries(work_date)');
        await pool.query('CREATE INDEX idx_time_entries_status ON time_entries(status)');
        await pool.query('CREATE INDEX idx_time_entries_company_code ON time_entries(company_code)');
        await pool.query('CREATE INDEX idx_time_entries_employee_date ON time_entries(employee_id, work_date)');
        console.log('✓ Created indexes');

        // Verify the table
        const result = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'time_entries'
      ORDER BY ordinal_position
    `);

        console.log('\n✅ Migration completed successfully!\n');
        console.log('Table schema:');
        result.rows.forEach(col => {
            console.log(`  - ${col.column_name.padEnd(20)} ${col.data_type.padEnd(25)} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
        });

        // Check count
        const count = await pool.query('SELECT COUNT(*) FROM time_entries');
        console.log(`\n📊 Total records: ${count.rows[0].count}\n`);

    } catch (error) {
        console.error('\n❌ Migration failed:', error.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

runMigration();
