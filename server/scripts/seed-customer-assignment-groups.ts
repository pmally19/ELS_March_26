import { pool } from '../db';

async function seedAssignmentGroups() {
    try {
        console.log('🌱 Seeding customer assignment groups...');

        // Check current count
        const check = await pool.query('SELECT COUNT(*) FROM sd_Customer_account_assignment_groups');
        console.log(`📊 Current count: ${check.rows[0].count} assignment groups`);

        // Insert sample data (safely handles duplicates)
        const sampleData = [
            { code: '001', name: 'Domestic Sales', description: 'Assignment group for domestic sales customers' },
            { code: '002', name: 'Export Sales', description: 'Assignment group for export  customers' },
            { code: '003', name: 'Wholesale', description: 'Assignment group for wholesale customers' },
            { code: '004', name: 'Retail', description: 'Assignment group for retail customers' },
            { code: '005', name: 'VIP Customers', description: 'Assignment group for VIP customers' },
        ];

        for (const data of sampleData) {
            await pool.query(`
        INSERT INTO sd_Customer_account_assignment_groups (code, name, description, is_active, created_at, updated_at)
        VALUES ($1, $2, $3, true, NOW(), NOW())
        ON CONFLICT (code) DO NOTHING
      `, [data.code, data.name, data.description]);
        }

        console.log(`✅ Seeded ${sampleData.length} customer assignment groups`);

        // Verify
        const result = await pool.query('SELECT * FROM sd_Customer_account_assignment_groups ORDER BY code');
        console.log('\n📋 All assignment groups:');
        result.rows.forEach(row => {
            console.log(`  - ${row.code}: ${row.name} ${row.is_active ? '✓' : '✗'}`);
        });

    } catch (error) {
        console.error('❌ Error seeding assignment groups:', error);
        throw error;
    } finally {
        await pool.end();
    }
}

seedAssignmentGroups();
