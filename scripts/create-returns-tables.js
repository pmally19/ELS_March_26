import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'mallyerp',
    user: 'postgres',
    password: 'Mokshith@21',
});

async function createReturnsTables() {
    console.log('🔧 Creating Sales Returns Tables...\n');

    try {
        // 1. Sales Returns Header
        console.log('1. Creating sales_returns table...');
        await pool.query(`
      CREATE TABLE IF NOT EXISTS sales_returns (
        id SERIAL PRIMARY KEY,
        return_number VARCHAR(50) UNIQUE NOT NULL,
        sales_order_id INTEGER REFERENCES sales_orders(id),
        billing_document_id INTEGER REFERENCES billing_documents(id),
        customer_id INTEGER NOT NULL REFERENCES erp_customers(id),
        return_date DATE NOT NULL DEFAULT CURRENT_DATE,
        return_reason VARCHAR(200),
        total_amount NUMERIC(15,2) DEFAULT 0,
        tax_amount NUMERIC(15,2) DEFAULT 0,
        net_amount NUMERIC(15,2) DEFAULT 0,
        status VARCHAR(20) DEFAULT 'DRAFT',
        approval_status VARCHAR(20),
        approved_by INTEGER,
        approved_at TIMESTAMP,
        notes TEXT,
        company_code_id INTEGER REFERENCES company_codes(id),
        currency VARCHAR(3),
        created_at TIMESTAMP DEFAULT NOW(),
        created_by INTEGER,
        updated_at TIMESTAMP DEFAULT NOW(),
        updated_by INTEGER,
        active BOOLEAN DEFAULT true
      )
    `);
        console.log('   ✅ sales_returns created\n');

        // 2. Sales Return Items
        console.log('2. Creating sales_return_items table...');
        await pool.query(`
      CREATE TABLE IF NOT EXISTS sales_return_items (
        id SERIAL PRIMARY KEY,
        return_id INTEGER NOT NULL REFERENCES sales_returns(id) ON DELETE CASCADE,
        sales_order_item_id INTEGER REFERENCES sales_order_items(id),
        billing_item_id INTEGER REFERENCES billing_items(id),
        product_id INTEGER NOT NULL REFERENCES products(id),
        quantity NUMERIC(15,3) NOT NULL,
        unit_price NUMERIC(15,2),
        total_amount NUMERIC(15,2),
        tax_amount NUMERIC(15,2),
        return_reason VARCHAR(200),
        condition VARCHAR(50),
        disposition VARCHAR(50),
        plant_id INTEGER REFERENCES plants(id),
        storage_location_id INTEGER REFERENCES storage_locations(id),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
        console.log('   ✅ sales_return_items created\n');

        // 3. Credit Memos
        console.log('3. Creating credit_memos table...');
        await pool.query(`
      CREATE TABLE IF NOT EXISTS credit_memos (
        id SERIAL PRIMARY KEY,
        credit_memo_number VARCHAR(50) UNIQUE NOT NULL,
        return_id INTEGER REFERENCES sales_returns(id),
        billing_document_id INTEGER NOT NULL REFERENCES billing_documents(id),
        customer_id INTEGER NOT NULL REFERENCES erp_customers(id),
        credit_date DATE NOT NULL DEFAULT CURRENT_DATE,
        due_date DATE,
        total_amount NUMERIC(15,2) NOT NULL,
        tax_amount NUMERIC(15,2) DEFAULT 0,
        net_amount NUMERIC(15,2),
        currency VARCHAR(3),
        posting_status VARCHAR(20) DEFAULT 'DRAFT',
        accounting_document_number VARCHAR(50),
        reference VARCHAR(100),
        notes TEXT,
        company_code_id INTEGER REFERENCES company_codes(id),
        payment_terms VARCHAR(50),
        created_at TIMESTAMP DEFAULT NOW(),
        created_by INTEGER,
        updated_at TIMESTAMP DEFAULT NOW(),
        updated_by INTEGER,
        active BOOLEAN DEFAULT true
      )
    `);
        console.log('   ✅ credit_memos created\n');

        // 4. Credit Memo Items
        console.log('4. Creating credit_memo_items table...');
        await pool.query(`
      CREATE TABLE IF NOT EXISTS credit_memo_items (
        id SERIAL PRIMARY KEY,
        credit_memo_id INTEGER NOT NULL REFERENCES credit_memos(id) ON DELETE CASCADE,
        return_item_id INTEGER REFERENCES sales_return_items(id),
        billing_item_id INTEGER REFERENCES billing_items(id),
        product_id INTEGER NOT NULL REFERENCES products(id),
        quantity NUMERIC(15,3) NOT NULL,
        unit_price NUMERIC(15,2),
        total_amount NUMERIC(15,2),
        tax_amount NUMERIC(15,2),
        gl_account_id INTEGER REFERENCES account_id_master(id),
        cost_center_id INTEGER REFERENCES cost_centers(id),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
        console.log('   ✅ credit_memo_items created\n');

        // 5. Return Deliveries
        console.log('5. Creating return_deliveries table...');
        await pool.query(`
      CREATE TABLE IF NOT EXISTS return_deliveries (
        id SERIAL PRIMARY KEY,
        return_delivery_number VARCHAR(50) UNIQUE NOT NULL,
        return_id INTEGER NOT NULL REFERENCES sales_returns(id),
        receipt_date DATE NOT NULL DEFAULT CURRENT_DATE,
        plant_id INTEGER REFERENCES plants(id),
        storage_location_id INTEGER REFERENCES storage_locations(id),
        status VARCHAR(20) DEFAULT 'PENDING',
        inventory_posting_status VARCHAR(20),
        inventory_document_number VARCHAR(50),
        receiver_name VARCHAR(100),
        notes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        created_by INTEGER,
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
        console.log('   ✅ return_deliveries created\n');

        // 6. Return Delivery Items
        console.log('6. Creating return_delivery_items table...');
        await pool.query(`
      CREATE TABLE IF NOT EXISTS return_delivery_items (
        id SERIAL PRIMARY KEY,
        return_delivery_id INTEGER NOT NULL REFERENCES return_deliveries(id) ON DELETE CASCADE,
        return_item_id INTEGER NOT NULL REFERENCES sales_return_items(id),
        product_id INTEGER NOT NULL REFERENCES products(id),
        quantity_received NUMERIC(15,3) NOT NULL,
        quantity_accepted NUMERIC(15,3),
        quantity_rejected NUMERIC(15,3),
        condition VARCHAR(50),
        disposition VARCHAR(50),
        batch_number VARCHAR(50),
        serial_number VARCHAR(50),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
        console.log('   ✅ return_delivery_items created\n');

        // Create indexes
        console.log('7. Creating indexes...');
        await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_sales_returns_customer_id ON sales_returns(customer_id);
      CREATE INDEX IF NOT EXISTS idx_sales_returns_order_id ON sales_returns(sales_order_id);
      CREATE INDEX IF NOT EXISTS idx_sales_returns_billing_id ON sales_returns(billing_document_id);
      CREATE INDEX IF NOT EXISTS idx_return_items_return_id ON sales_return_items(return_id);
      CREATE INDEX IF NOT EXISTS idx_credit_memos_customer_id ON credit_memos(customer_id);
      CREATE INDEX IF NOT EXISTS idx_credit_memos_billing_id ON credit_memos(billing_document_id);
    `);
        console.log('   ✅ Indexes created\n');

        console.log('✅ All Sales Returns tables created successfully!\n');

        // Verify
        const tables = ['sales_returns', 'sales_return_items', 'credit_memos', 'credit_memo_items', 'return_deliveries', 'return_delivery_items'];
        console.log('Verification:');
        for (const table of tables) {
            const result = await pool.query(`SELECT COUNT(*) FROM information_schema.columns WHERE table_name = $1`, [table]);
            console.log(`  ✅ ${table.padEnd(30)} ${result.rows[0].count} columns`);
        }

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error(error.stack);
    } finally {
        await pool.end();
    }
}

createReturnsTables();
