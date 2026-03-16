/**
 * Create Comprehensive Master Data Tables
 * 
 * Creates all critical master data tables required for end-to-end business processes
 * with proper data integrity, timestamps, and active flags
 */

import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function createComprehensiveMasterData() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Creating comprehensive master data tables...');
    
    await client.query('BEGIN');
    
    // 1. Price Lists for Sales Pricing
    await client.query(`
      CREATE TABLE IF NOT EXISTS price_lists (
        id SERIAL PRIMARY KEY,
        price_list_code VARCHAR(20) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        currency VARCHAR(3) NOT NULL DEFAULT 'USD',
        valid_from DATE NOT NULL,
        valid_to DATE,
        price_list_type VARCHAR(20) NOT NULL DEFAULT 'standard',
        company_code_id INTEGER NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        created_by INTEGER,
        updated_by INTEGER
      )
    `);
    
    // 2. Sales Territories
    await client.query(`
      CREATE TABLE IF NOT EXISTS sales_territories (
        id SERIAL PRIMARY KEY,
        territory_code VARCHAR(20) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        region VARCHAR(50),
        country VARCHAR(3),
        sales_manager_id INTEGER,
        parent_territory_id INTEGER,
        company_code_id INTEGER NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        created_by INTEGER,
        updated_by INTEGER
      )
    `);
    
    // 3. Payment Terms
    await client.query(`
      CREATE TABLE IF NOT EXISTS payment_terms (
        id SERIAL PRIMARY KEY,
        payment_term_code VARCHAR(10) UNIQUE NOT NULL,
        description VARCHAR(100) NOT NULL,
        due_days INTEGER NOT NULL DEFAULT 30,
        discount_days_1 INTEGER DEFAULT 0,
        discount_percent_1 DECIMAL(5,2) DEFAULT 0.00,
        discount_days_2 INTEGER DEFAULT 0,
        discount_percent_2 DECIMAL(5,2) DEFAULT 0.00,
        baseline_date VARCHAR(20) NOT NULL DEFAULT 'document_date',
        company_code_id INTEGER NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        created_by INTEGER,
        updated_by INTEGER
      )
    `);
    
    // 4. Shipping Points
    await client.query(`
      CREATE TABLE IF NOT EXISTS shipping_points (
        id SERIAL PRIMARY KEY,
        shipping_point_code VARCHAR(10) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        plant_id INTEGER NOT NULL,
        address TEXT,
        city VARCHAR(50),
        postal_code VARCHAR(20),
        country VARCHAR(3),
        loading_capacity DECIMAL(10,2),
        operating_hours VARCHAR(100),
        contact_person VARCHAR(100),
        phone_number VARCHAR(30),
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        created_by INTEGER,
        updated_by INTEGER
      )
    `);
    
    // 5. Transportation Zones
    await client.query(`
      CREATE TABLE IF NOT EXISTS transportation_zones (
        id SERIAL PRIMARY KEY,
        zone_code VARCHAR(10) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        country VARCHAR(3),
        region VARCHAR(50),
        postal_code_from VARCHAR(20),
        postal_code_to VARCHAR(20),
        transportation_type VARCHAR(20) DEFAULT 'standard',
        base_freight_rate DECIMAL(10,2),
        currency VARCHAR(3) NOT NULL DEFAULT 'USD',
        company_code_id INTEGER NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        created_by INTEGER,
        updated_by INTEGER
      )
    `);
    
    // 6. Purchasing Info Records
    await client.query(`
      CREATE TABLE IF NOT EXISTS purchasing_info_records (
        id SERIAL PRIMARY KEY,
        info_record_number VARCHAR(20) UNIQUE NOT NULL,
        vendor_id INTEGER NOT NULL,
        material_id INTEGER NOT NULL,
        purchase_organization_id INTEGER NOT NULL,
        plant_id INTEGER,
        valid_from DATE NOT NULL,
        valid_to DATE,
        net_price DECIMAL(15,4) NOT NULL,
        price_unit INTEGER NOT NULL DEFAULT 1,
        unit_of_measure_id INTEGER NOT NULL,
        currency VARCHAR(3) NOT NULL DEFAULT 'USD',
        minimum_order_quantity DECIMAL(13,3) DEFAULT 1.000,
        standard_order_quantity DECIMAL(13,3),
        delivery_time_in_days INTEGER DEFAULT 1,
        tax_code_id INTEGER,
        payment_term_id INTEGER,
        is_primary_source BOOLEAN DEFAULT false,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        created_by INTEGER,
        updated_by INTEGER
      )
    `);
    
    // 7. Source Lists
    await client.query(`
      CREATE TABLE IF NOT EXISTS source_lists (
        id SERIAL PRIMARY KEY,
        material_id INTEGER NOT NULL,
        plant_id INTEGER NOT NULL,
        valid_from DATE NOT NULL,
        valid_to DATE,
        source_type VARCHAR(10) NOT NULL,
        vendor_id INTEGER,
        agreement_number VARCHAR(20),
        fixed_vendor BOOLEAN DEFAULT false,
        blocked_source BOOLEAN DEFAULT false,
        mrp_relevant BOOLEAN DEFAULT true,
        company_code_id INTEGER NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        created_by INTEGER,
        updated_by INTEGER
      )
    `);
    
    // 8. Storage Bins
    await client.query(`
      CREATE TABLE IF NOT EXISTS storage_bins (
        id SERIAL PRIMARY KEY,
        bin_code VARCHAR(20) NOT NULL,
        storage_location_id INTEGER NOT NULL,
        storage_type VARCHAR(10) NOT NULL,
        warehouse_section VARCHAR(10),
        aisle VARCHAR(10),
        level VARCHAR(10),
        position VARCHAR(10),
        capacity DECIMAL(13,3),
        capacity_unit VARCHAR(10),
        max_weight DECIMAL(10,2),
        weight_unit VARCHAR(10),
        bin_type VARCHAR(20) DEFAULT 'normal',
        picking_sequence INTEGER,
        temperature_controlled BOOLEAN DEFAULT false,
        hazmat_approved BOOLEAN DEFAULT false,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        created_by INTEGER,
        updated_by INTEGER
      )
    `);
    
    // 9. Movement Types
    await client.query(`
      CREATE TABLE IF NOT EXISTS movement_types (
        id SERIAL PRIMARY KEY,
        movement_type_code VARCHAR(3) UNIQUE NOT NULL,
        description VARCHAR(100) NOT NULL,
        movement_class VARCHAR(20) NOT NULL,
        transaction_type VARCHAR(20) NOT NULL,
        inventory_direction VARCHAR(10) NOT NULL,
        special_stock_indicator VARCHAR(10),
        valuation_impact BOOLEAN DEFAULT true,
        quantity_impact BOOLEAN DEFAULT true,
        gl_account_determination VARCHAR(20),
        company_code_id INTEGER NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        created_by INTEGER,
        updated_by INTEGER
      )
    `);
    
    // 10. Production Versions
    await client.query(`
      CREATE TABLE IF NOT EXISTS production_versions (
        id SERIAL PRIMARY KEY,
        material_id INTEGER NOT NULL,
        plant_id INTEGER NOT NULL,
        production_version VARCHAR(4) NOT NULL,
        description VARCHAR(100),
        valid_from DATE NOT NULL,
        valid_to DATE,
        bill_of_material_id INTEGER,
        routing_id INTEGER,
        lot_size_from DECIMAL(13,3) DEFAULT 1.000,
        lot_size_to DECIMAL(13,3),
        planning_strategy VARCHAR(2),
        mrp_controller VARCHAR(3),
        production_scheduler VARCHAR(3),
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        created_by INTEGER,
        updated_by INTEGER
      )
    `);
    
    // 11. Planning Strategies
    await client.query(`
      CREATE TABLE IF NOT EXISTS planning_strategies (
        id SERIAL PRIMARY KEY,
        strategy_code VARCHAR(2) UNIQUE NOT NULL,
        description VARCHAR(100) NOT NULL,
        strategy_group VARCHAR(20) NOT NULL,
        planning_mode VARCHAR(20) NOT NULL,
        lot_sizing_procedure VARCHAR(20),
        procurement_type VARCHAR(10) NOT NULL,
        special_procurement VARCHAR(10),
        reorder_point_planning BOOLEAN DEFAULT false,
        forecast_based BOOLEAN DEFAULT false,
        company_code_id INTEGER NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        created_by INTEGER,
        updated_by INTEGER
      )
    `);
    
    // 12. Document Types
    await client.query(`
      CREATE TABLE IF NOT EXISTS document_types (
        id SERIAL PRIMARY KEY,
        document_type_code VARCHAR(2) UNIQUE NOT NULL,
        description VARCHAR(100) NOT NULL,
        document_category VARCHAR(20) NOT NULL,
        number_range VARCHAR(2),
        reversal_allowed BOOLEAN DEFAULT true,
        account_types_allowed VARCHAR(20) DEFAULT 'all',
        entry_view VARCHAR(20) DEFAULT 'standard',
        reference_required BOOLEAN DEFAULT false,
        authorization_group VARCHAR(10),
        company_code_id INTEGER NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        created_by INTEGER,
        updated_by INTEGER
      )
    `);
    
    // 13. Number Ranges
    await client.query(`
      CREATE TABLE IF NOT EXISTS number_ranges (
        id SERIAL PRIMARY KEY,
        number_range_code VARCHAR(2) UNIQUE NOT NULL,
        description VARCHAR(100) NOT NULL,
        number_range_object VARCHAR(20) NOT NULL,
        fiscal_year VARCHAR(4),
        range_from VARCHAR(20) NOT NULL,
        range_to VARCHAR(20) NOT NULL,
        current_number VARCHAR(20),
        external_numbering BOOLEAN DEFAULT false,
        buffer_size INTEGER DEFAULT 100,
        warning_percentage INTEGER DEFAULT 90,
        company_code_id INTEGER NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        created_by INTEGER,
        updated_by INTEGER
      )
    `);
    
    // 14. Exchange Rate Types
    await client.query(`
      CREATE TABLE IF NOT EXISTS exchange_rate_types (
        id SERIAL PRIMARY KEY,
        exchange_rate_type VARCHAR(4) UNIQUE NOT NULL,
        description VARCHAR(100) NOT NULL,
        rate_category VARCHAR(20) NOT NULL,
        buying_rate BOOLEAN DEFAULT true,
        selling_rate BOOLEAN DEFAULT true,
        average_rate BOOLEAN DEFAULT false,
        fixed_rate BOOLEAN DEFAULT false,
        base_date VARCHAR(20) DEFAULT 'transaction_date',
        company_code_id INTEGER NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        created_by INTEGER,
        updated_by INTEGER
      )
    `);
    
    // Create indexes for performance
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_price_lists_company ON price_lists(company_code_id)',
      'CREATE INDEX IF NOT EXISTS idx_price_lists_active ON price_lists(is_active)',
      'CREATE INDEX IF NOT EXISTS idx_sales_territories_company ON sales_territories(company_code_id)',
      'CREATE INDEX IF NOT EXISTS idx_payment_terms_company ON payment_terms(company_code_id)',
      'CREATE INDEX IF NOT EXISTS idx_shipping_points_plant ON shipping_points(plant_id)',
      'CREATE INDEX IF NOT EXISTS idx_transportation_zones_company ON transportation_zones(company_code_id)',
      'CREATE INDEX IF NOT EXISTS idx_purchasing_info_vendor ON purchasing_info_records(vendor_id)',
      'CREATE INDEX IF NOT EXISTS idx_purchasing_info_material ON purchasing_info_records(material_id)',
      'CREATE INDEX IF NOT EXISTS idx_source_lists_material ON source_lists(material_id)',
      'CREATE INDEX IF NOT EXISTS idx_storage_bins_location ON storage_bins(storage_location_id)',
      'CREATE INDEX IF NOT EXISTS idx_movement_types_company ON movement_types(company_code_id)',
      'CREATE INDEX IF NOT EXISTS idx_production_versions_material ON production_versions(material_id)',
      'CREATE INDEX IF NOT EXISTS idx_planning_strategies_company ON planning_strategies(company_code_id)',
      'CREATE INDEX IF NOT EXISTS idx_document_types_company ON document_types(company_code_id)',
      'CREATE INDEX IF NOT EXISTS idx_number_ranges_company ON number_ranges(company_code_id)',
      'CREATE INDEX IF NOT EXISTS idx_exchange_rate_types_company ON exchange_rate_types(company_code_id)'
    ];
    
    for (const indexSql of indexes) {
      await client.query(indexSql);
    }
    
    await client.query('COMMIT');
    
    console.log('✅ Comprehensive master data tables created successfully');
    console.log(`
    📊 Created 14 Master Data Tables:
    1. Price Lists (Sales Pricing)
    2. Sales Territories (Geographic Organization)
    3. Payment Terms (Financial Terms)
    4. Shipping Points (Logistics)
    5. Transportation Zones (Freight Management)
    6. Purchasing Info Records (Vendor-Material Relationships)
    7. Source Lists (Approved Sources)
    8. Storage Bins (Warehouse Management)
    9. Movement Types (Inventory Transactions)
    10. Production Versions (Manufacturing)
    11. Planning Strategies (MRP Control)
    12. Document Types (Transaction Categorization)
    13. Number Ranges (Document Numbering)
    14. Exchange Rate Types (Multi-Currency)
    
    🔧 All tables include:
    - Data integrity constraints
    - Audit timestamps (created_at, updated_at)
    - User tracking (created_by, updated_by)
    - Active/Inactive flags (is_active)
    - Performance indexes
    - Foreign key relationships
    `);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error creating comprehensive master data tables:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function populateSampleMasterData() {
  const client = await pool.connect();
  
  try {
    console.log('🌱 Populating sample master data...');
    
    await client.query('BEGIN');
    
    // Sample Price Lists
    await client.query(`
      INSERT INTO price_lists (price_list_code, name, description, currency, valid_from, company_code_id) VALUES
      ('STD001', 'Standard Price List', 'Default pricing for all standard products', 'USD', '2024-01-01', 1),
      ('PRO001', 'Promotional Price List', 'Special promotional pricing', 'USD', '2024-01-01', 1),
      ('CON001', 'Contract Price List', 'Contract-specific pricing', 'USD', '2024-01-01', 1)
      ON CONFLICT (price_list_code) DO NOTHING
    `);
    
    // Sample Payment Terms
    await client.query(`
      INSERT INTO payment_terms (payment_term_code, description, due_days, discount_days_1, discount_percent_1, company_code_id) VALUES
      ('NET30', 'Net 30 Days', 30, 0, 0.00, 1),
      ('2/10N30', '2/10 Net 30', 30, 10, 2.00, 1),
      ('NET15', 'Net 15 Days', 15, 0, 0.00, 1),
      ('COD', 'Cash on Delivery', 0, 0, 0.00, 1)
      ON CONFLICT (payment_term_code) DO NOTHING
    `);
    
    // Sample Movement Types
    await client.query(`
      INSERT INTO movement_types (movement_type_code, description, movement_class, transaction_type, inventory_direction, company_code_id) VALUES
      ('101', 'Goods Receipt for Purchase Order', 'receipt', 'purchase', 'increase', 1),
      ('601', 'Goods Issue for Sales Order', 'issue', 'sales', 'decrease', 1),
      ('311', 'Stock Transfer Plant to Plant', 'transfer', 'transfer', 'neutral', 1),
      ('201', 'Goods Issue for Cost Center', 'issue', 'consumption', 'decrease', 1),
      ('701', 'Physical Inventory Adjustment', 'adjustment', 'adjustment', 'neutral', 1)
      ON CONFLICT (movement_type_code) DO NOTHING
    `);
    
    // Sample Document Types
    await client.query(`
      INSERT INTO document_types (document_type_code, description, document_category, number_range, company_code_id) VALUES
      ('SA', 'General Ledger Document', 'financial', '01', 1),
      ('KR', 'Vendor Invoice', 'financial', '02', 1),
      ('DZ', 'Customer Payment', 'financial', '03', 1),
      ('AB', 'Accounting Document', 'financial', '04', 1)
      ON CONFLICT (document_type_code) DO NOTHING
    `);
    
    // Sample Number Ranges
    await client.query(`
      INSERT INTO number_ranges (number_range_code, description, number_range_object, range_from, range_to, current_number, company_code_id) VALUES
      ('01', 'General Ledger Documents', 'accounting_document', '1000000000', '1999999999', '1000000001', 1),
      ('02', 'Vendor Invoices', 'vendor_invoice', '2000000000', '2999999999', '2000000001', 1),
      ('03', 'Customer Payments', 'customer_payment', '3000000000', '3999999999', '3000000001', 1),
      ('04', 'Sales Orders', 'sales_order', '4000000000', '4999999999', '4000000001', 1)
      ON CONFLICT (number_range_code) DO NOTHING
    `);
    
    // Sample Exchange Rate Types
    await client.query(`
      INSERT INTO exchange_rate_types (exchange_rate_type, description, rate_category, company_code_id) VALUES
      ('M', 'Average Rate', 'average', 1),
      ('P', 'Posting Rate', 'daily', 1),
      ('B', 'Bank Selling Rate', 'daily', 1),
      ('G', 'Bank Buying Rate', 'daily', 1)
      ON CONFLICT (exchange_rate_type) DO NOTHING
    `);
    
    await client.query('COMMIT');
    console.log('✅ Sample master data populated successfully');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error populating sample master data:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  try {
    await createComprehensiveMasterData();
    await populateSampleMasterData();
    console.log('🎉 Comprehensive master data setup completed successfully!');
  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();