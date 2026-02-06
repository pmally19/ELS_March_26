import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'mallyerp',
    user: 'postgres',
    password: 'Mokshith@21'
});

async function createHolidayCalendarTables() {
    const client = await pool.connect();

    try {
        console.log('🚀 Starting Holiday Calendar Database Migration...\n');

        // 1. Create holiday_calendars table
        console.log('📅 Creating holiday_calendars table...');
        await client.query(`
      CREATE TABLE IF NOT EXISTS holiday_calendars (
        holiday_calendar_id VARCHAR(10) PRIMARY KEY,
        calendar_code VARCHAR(50) NOT NULL UNIQUE,
        description VARCHAR(200) NOT NULL,
        country_code VARCHAR(3),
        region VARCHAR(50),
        valid_from DATE,
        valid_to DATE,
        status VARCHAR(20) DEFAULT 'ACTIVE',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
        console.log('✅ holiday_calendars table created\n');

        // 2. Create public_holidays table
        console.log('🎉 Creating public_holidays table...');
        await client.query(`
      CREATE TABLE IF NOT EXISTS public_holidays (
        id SERIAL PRIMARY KEY,
        holiday_calendar_id VARCHAR(10) REFERENCES holiday_calendars(holiday_calendar_id) ON DELETE CASCADE,
        holiday_date DATE NOT NULL,
        holiday_name VARCHAR(100) NOT NULL,
        holiday_type VARCHAR(50) DEFAULT 'PUBLIC',
        is_working_day BOOLEAN DEFAULT FALSE,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_holiday_per_calendar UNIQUE(holiday_calendar_id, holiday_date)
      );
    `);
        console.log('✅ public_holidays table created\n');

        // 3. Add FK constraint from factory_calendars to holiday_calendars
        console.log('🔗 Adding foreign key constraint to factory_calendars...');
        try {
            await client.query(`
        ALTER TABLE factory_calendars
        ADD CONSTRAINT fk_factory_calendar_holiday
        FOREIGN KEY (holiday_calendar) 
        REFERENCES holiday_calendars(holiday_calendar_id)
        ON DELETE SET NULL
        ON UPDATE CASCADE;
      `);
            console.log('✅ Foreign key constraint added\n');
        } catch (error) {
            if (error.code === '42P07' || error.message.includes('already exists')) {
                console.log('⚠️  Foreign key constraint already exists, skipping\n');
            } else {
                throw error;
            }
        }

        // 4. Insert seed data for holiday calendars
        console.log('📝 Inserting holiday calendar seed data...');
        await client.query(`
      INSERT INTO holiday_calendars (holiday_calendar_id, calendar_code, description, country_code, region, status)
      VALUES
        ('US_PUBLIC', 'US_PUBLIC', 'United States Federal Holidays', 'USA', 'Federal', 'ACTIVE'),
        ('UK_PUBLIC', 'UK_PUBLIC', 'United Kingdom Bank Holidays', 'GBR', 'England & Wales', 'ACTIVE'),
        ('EU_COMMON', 'EU_COMMON', 'European Union Common Holidays', 'EUR', 'EU', 'ACTIVE'),
        ('IN_PUBLIC', 'IN_PUBLIC', 'India National Holidays', 'IND', 'National', 'ACTIVE'),
        ('CN_PUBLIC', 'CN_PUBLIC', 'China Public Holidays', 'CHN', 'National', 'ACTIVE')
      ON CONFLICT (holiday_calendar_id) DO NOTHING;
    `);
        console.log('✅ Holiday calendar seed data inserted\n');

        // 5. Insert sample public holidays for US (2024)
        console.log('🎊 Inserting sample US public holidays for 2024...');
        await client.query(`
      INSERT INTO public_holidays (holiday_calendar_id, holiday_date, holiday_name, holiday_type, description)
      VALUES
        ('US_PUBLIC', '2024-01-01', 'New Year''s Day', 'PUBLIC', 'Federal holiday'),
        ('US_PUBLIC', '2024-01-15', 'Martin Luther King Jr. Day', 'PUBLIC', 'Federal holiday'),
        ('US_PUBLIC', '2024-02-19', 'Presidents'' Day', 'PUBLIC', 'Federal holiday'),
        ('US_PUBLIC', '2024-05-27', 'Memorial Day', 'PUBLIC', 'Federal holiday'),
        ('US_PUBLIC', '2024-07-04', 'Independence Day', 'PUBLIC', 'Federal holiday'),
        ('US_PUBLIC', '2024-09-02', 'Labor Day', 'PUBLIC', 'Federal holiday'),
        ('US_PUBLIC', '2024-10-14', 'Columbus Day', 'PUBLIC', 'Federal holiday'),
        ('US_PUBLIC', '2024-11-11', 'Veterans Day', 'PUBLIC', 'Federal holiday'),
        ('US_PUBLIC', '2024-11-28', 'Thanksgiving Day', 'PUBLIC', 'Federal holiday'),
        ('US_PUBLIC', '2024-12-25', 'Christmas Day', 'PUBLIC', 'Federal holiday')
      ON CONFLICT DO NOTHING;
    `);
        console.log('✅ US public holidays inserted\n');

        // 6. Insert sample UK bank holidays for 2024
        console.log('🇬🇧 Inserting sample UK bank holidays for 2024...');
        await client.query(`
      INSERT INTO public_holidays (holiday_calendar_id, holiday_date, holiday_name, holiday_type, description)
      VALUES
        ('UK_PUBLIC', '2024-01-01', 'New Year''s Day', 'PUBLIC', 'Bank holiday'),
        ('UK_PUBLIC', '2024-03-29', 'Good Friday', 'PUBLIC', 'Bank holiday'),
        ('UK_PUBLIC', '2024-04-01', 'Easter Monday', 'PUBLIC', 'Bank holiday'),
        ('UK_PUBLIC', '2024-05-06', 'Early May bank holiday', 'PUBLIC', 'Bank holiday'),
        ('UK_PUBLIC', '2024-05-27', 'Spring bank holiday', 'PUBLIC', 'Bank holiday'),
        ('UK_PUBLIC', '2024-08-26', 'Summer bank holiday', 'PUBLIC', 'Bank holiday'),
        ('UK_PUBLIC', '2024-12-25', 'Christmas Day', 'PUBLIC', 'Bank holiday'),
        ('UK_PUBLIC', '2024-12-26', 'Boxing Day', 'PUBLIC', 'Bank holiday')
      ON CONFLICT DO NOTHING;
    `);
        console.log('✅ UK bank holidays inserted\n');

        // 7. Verify tables and data
        console.log('🔍 Verifying migration results...\n');

        const calendarCount = await client.query('SELECT COUNT(*) FROM holiday_calendars');
        const holidayCount = await client.query('SELECT COUNT(*) FROM public_holidays');

        console.log(`📊 Summary:`);
        console.log(`   - Holiday Calendars: ${calendarCount.rows[0].count}`);
        console.log(`   - Public Holidays: ${holidayCount.rows[0].count}`);

        console.log('\n✅ Holiday Calendar database migration completed successfully!');

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.error('Stack:', error.stack);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

createHolidayCalendarTables();
