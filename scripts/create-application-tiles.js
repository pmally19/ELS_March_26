// Script to create application_tiles table if it doesn't exist
// and populate it with data from the existing system

import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:Mokshith%4021@localhost:5432/mallyerp'
});

async function createApplicationTilesTable() {
    console.log('Checking if application_tiles table exists...');

    try {
        // Check if table exists
        const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'application_tiles'
      );
    `);

        const tableExists = tableCheck.rows[0].exists;
        console.log('Table exists:', tableExists);

        if (!tableExists) {
            console.log('Creating application_tiles table...');

            await pool.query(`
        CREATE TABLE application_tiles (
          id SERIAL PRIMARY KEY,
          tile_name VARCHAR(255) NOT NULL,
          tile_description TEXT,
          tile_category VARCHAR(100),
          tile_status VARCHAR(50) DEFAULT 'active',
          tile_type VARCHAR(50) DEFAULT 'general',
          tile_url VARCHAR(500),
          tile_icon VARCHAR(100) DEFAULT 'square',
          tile_order INTEGER DEFAULT 100,
          module_name VARCHAR(100),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

            console.log('Table created successfully!');

            // Populate with sample data from existing modules
            console.log('Populating with module data...');

            const modules = [
                // Master Data
                { name: 'Company Codes', category: 'Master Data', type: 'master-data', url: '/master-data/company-codes', status: 'active', module: 'Master Data' },
                { name: 'Plants', category: 'Master Data', type: 'master-data', url: '/master-data/plants', status: 'active', module: 'Master Data' },
                { name: 'Customers', category: 'Master Data', type: 'master-data', url: '/master-data/customers', status: 'active', module: 'Master Data' },
                { name: 'Vendors', category: 'Master Data', type: 'master-data', url: '/master-data/vendors', status: 'active', module: 'Master Data' },
                { name: 'Materials', category: 'Master Data', type: 'master-data', url: '/master-data/materials', status: 'active', module: 'Master Data' },
                { name: 'Products', category: 'Master Data', type: 'master-data', url: '/master-data/products', status: 'active', module: 'Master Data' },
                { name: 'Storage Locations', category: 'Master Data', type: 'master-data', url: '/master-data/storage-locations', status: 'active', module: 'Master Data' },
                { name: 'Purchase Organizations', category: 'Master Data', type: 'master-data', url: '/master-data/purchase-organization', status: 'active', module: 'Master Data' },
                { name: 'Work Centers', category: 'Master Data', type: 'master-data', url: '/master-data/work-centers', status: 'active', module: 'Master Data' },

                // Sales
                { name: 'Sales Orders', category: 'Sales', type: 'transaction', url: '/sales', status: 'active', module: 'Sales' },
                { name: 'Leads', category: 'Sales', type: 'transaction', url: '/sales', status: 'active', module: 'Sales' },
                { name: 'Opportunities', category: 'Sales', type: 'transaction', url: '/sales', status: 'active', module: 'Sales' },
                { name: 'Quotes', category: 'Sales', type: 'transaction', url: '/sales', status: 'active', module: 'Sales' },
                { name: 'Invoices', category: 'Sales', type: 'transaction', url: '/sales', status: 'active', module: 'Sales' },
                { name: 'Returns', category: 'Sales', type: 'transaction', url: '/sales', status: 'active', module: 'Sales' },

                // Finance
                { name: 'General Ledger', category: 'Finance', type: 'transaction', url: '/finance/gl', status: 'active', module: 'Finance' },
                { name: 'Accounts Receivable', category: 'Finance', type: 'transaction', url: '/finance/ar', status: 'active', module: 'Finance' },
                { name: 'Accounts Payable', category: 'Finance', type: 'transaction', url: '/finance/ap', status: 'active', module: 'Finance' },
                { name: 'Billing Documents', category: 'Finance', type: 'transaction', url: '/finance/billing', status: 'active', module: 'Finance' },
                { name: 'Payments', category: 'Finance', type: 'transaction', url: '/finance/payments', status: 'active', module: 'Finance' },

                // Inventory
                { name: 'Stock Overview', category: 'Inventory', type: 'transaction', url: '/inventory', status: 'active', module: 'Inventory' },
                { name: 'Stock Movements', category: 'Inventory', type: 'transaction', url: '/inventory/movements', status: 'active', module: 'Inventory' },
                { name: 'Goods Receipt', category: 'Inventory', type: 'transaction', url: '/inventory/goods-receipt', status: 'active', module: 'Inventory' },
                { name: 'Goods Issue', category: 'Inventory', type: 'transaction', url: '/inventory/goods-issue', status: 'active', module: 'Inventory' },

                // Production
                { name: 'Production Orders', category: 'Production', type: 'transaction', url: '/production', status: 'active', module: 'Production' },
                { name: 'Bill of Materials', category: 'Production', type: 'master-data', url: '/production/bom', status: 'active', module: 'Production' },
                { name: 'Routings', category: 'Production', type: 'master-data', url: '/production/routings', status: 'active', module: 'Production' },

                // Procurement
                { name: 'Purchase Orders', category: 'Procurement', type: 'transaction', url: '/procurement', status: 'active', module: 'Purchase' },
                { name: 'Purchase Requisitions', category: 'Procurement', type: 'transaction', url: '/procurement/requisitions', status: 'active', module: 'Purchase' },
                { name: 'Supplier Invoices', category: 'Procurement', type: 'transaction', url: '/procurement/invoices', status: 'active', module: 'Purchase' },

                // Controlling
                { name: 'Cost Centers', category: 'Controlling', type: 'master-data', url: '/controlling/cost-centers', status: 'active', module: 'Controlling' },
                { name: 'Profit Centers', category: 'Controlling', type: 'master-data', url: '/controlling/profit-centers', status: 'active', module: 'Controlling' },
                { name: 'Internal Orders', category: 'Controlling', type: 'transaction', url: '/controlling/internal-orders', status: 'active', module: 'Controlling' },
            ];

            for (const tile of modules) {
                await pool.query(`
          INSERT INTO application_tiles (tile_name, tile_description, tile_category, tile_status, tile_type, tile_url, module_name)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT DO NOTHING
        `, [tile.name, `${tile.name} management`, tile.category, tile.status, tile.type, tile.url, tile.module]);
            }

            console.log('Populated', modules.length, 'tiles');
        }

        // Count tiles
        const countResult = await pool.query('SELECT COUNT(*) FROM application_tiles');
        console.log('Total tiles in application_tiles:', countResult.rows[0].count);

        // Show sample data
        const sampleResult = await pool.query('SELECT id, tile_name, tile_category, tile_status, module_name FROM application_tiles ORDER BY module_name, tile_name LIMIT 10');
        console.log('\nSample tiles:');
        console.table(sampleResult.rows);

        console.log('\n✅ Application tiles table is ready!');

    } catch (error) {
        console.error('Error:', error.message);
        throw error;
    } finally {
        await pool.end();
    }
}

createApplicationTilesTable().catch(console.error);
