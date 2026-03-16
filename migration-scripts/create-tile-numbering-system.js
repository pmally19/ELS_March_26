/**
 * Comprehensive Tile Numbering System for MallyERP
 * 
 * Creates a centralized tile registry with systematic numbering:
 * - Standard: MD001-MD999, TR001-TR999, etc.
 * - Extended: MDA001-MDZ999, TRA001-TRZ999, etc.
 * 
 * Provides complete tile identification across all business modules
 */

import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function createTileNumberingSystem() {
  const client = await pool.connect();
  
  try {
    console.log('🔢 Creating Comprehensive Tile Numbering System...');
    
    // 1. Create Tile Registry with Extended Numbering Support
    await client.query(`
      CREATE TABLE IF NOT EXISTS tile_registry (
        id SERIAL PRIMARY KEY,
        tile_number VARCHAR(10) UNIQUE NOT NULL,
        tile_name VARCHAR(100) NOT NULL,
        tile_category VARCHAR(50) NOT NULL,
        module_code VARCHAR(2) NOT NULL,
        module_name VARCHAR(50) NOT NULL,
        route_path VARCHAR(200),
        description TEXT,
        icon_name VARCHAR(50),
        is_active BOOLEAN DEFAULT true,
        display_order INTEGER DEFAULT 0,
        parent_tile_number VARCHAR(10),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (parent_tile_number) REFERENCES tile_registry(tile_number)
      );
    `);

    // 2. Create Tile Numbering Rules
    await client.query(`
      CREATE TABLE IF NOT EXISTS tile_numbering_rules (
        id SERIAL PRIMARY KEY,
        module_code VARCHAR(2) UNIQUE NOT NULL,
        module_name VARCHAR(50) NOT NULL,
        current_number INTEGER DEFAULT 1,
        current_extension VARCHAR(1) DEFAULT NULL,
        max_standard_number INTEGER DEFAULT 999,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. Insert Module Numbering Rules
    const modules = [
      { code: 'MD', name: 'Master Data', description: 'Core business data and organizational structure' },
      { code: 'TR', name: 'Transactions', description: 'Business transaction processing and workflows' },
      { code: 'SL', name: 'Sales', description: 'Sales management and customer operations' },
      { code: 'IN', name: 'Inventory', description: 'Stock management and warehouse operations' },
      { code: 'FI', name: 'Finance', description: 'Financial accounting and reporting' },
      { code: 'PU', name: 'Purchase', description: 'Procurement and vendor management' },
      { code: 'PR', name: 'Production', description: 'Manufacturing and production planning' },
      { code: 'HR', name: 'Human Resources', description: 'Employee management and payroll' },
      { code: 'QM', name: 'Quality Management', description: 'Quality control and assurance' },
      { code: 'PM', name: 'Plant Maintenance', description: 'Equipment and facility maintenance' },
      { code: 'RP', name: 'Reporting', description: 'Business intelligence and analytics' },
      { code: 'AD', name: 'Administration', description: 'System administration and configuration' }
    ];

    for (const module of modules) {
      await client.query(`
        INSERT INTO tile_numbering_rules (module_code, module_name, description)
        VALUES ($1, $2, $3)
        ON CONFLICT (module_code) DO UPDATE SET
          module_name = EXCLUDED.module_name,
          description = EXCLUDED.description,
          updated_at = CURRENT_TIMESTAMP
      `, [module.code, module.name, module.description]);
    }

    // 4. Create Tile Number Generation Function
    await client.query(`
      CREATE OR REPLACE FUNCTION generate_tile_number(p_module_code VARCHAR(2))
      RETURNS VARCHAR(10) AS $$
      DECLARE
        current_num INTEGER;
        current_ext VARCHAR(1);
        new_number VARCHAR(10);
      BEGIN
        -- Get current numbering state
        SELECT current_number, current_extension
        INTO current_num, current_ext
        FROM tile_numbering_rules
        WHERE module_code = p_module_code;
        
        IF NOT FOUND THEN
          RAISE EXCEPTION 'Module code % not found in numbering rules', p_module_code;
        END IF;
        
        -- Generate number based on current state
        IF current_ext IS NULL THEN
          -- Standard numbering: MD001-MD999
          new_number := p_module_code || LPAD(current_num::TEXT, 3, '0');
          
          -- Check if we need to move to extended numbering
          IF current_num >= 999 THEN
            UPDATE tile_numbering_rules 
            SET current_number = 1, current_extension = 'A'
            WHERE module_code = p_module_code;
          ELSE
            UPDATE tile_numbering_rules 
            SET current_number = current_num + 1
            WHERE module_code = p_module_code;
          END IF;
        ELSE
          -- Extended numbering: MDA001-MDZ999
          new_number := p_module_code || current_ext || LPAD(current_num::TEXT, 3, '0');
          
          -- Increment for next call
          IF current_num >= 999 THEN
            -- Move to next letter
            IF current_ext = 'Z' THEN
              RAISE EXCEPTION 'Maximum tile numbers reached for module %', p_module_code;
            ELSE
              UPDATE tile_numbering_rules 
              SET current_number = 1, current_extension = CHR(ASCII(current_ext) + 1)
              WHERE module_code = p_module_code;
            END IF;
          ELSE
            UPDATE tile_numbering_rules 
            SET current_number = current_num + 1
            WHERE module_code = p_module_code;
          END IF;
        END IF;
        
        RETURN new_number;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // 5. Populate Master Data Tiles
    const masterDataTiles = [
      // Organizational Structure
      { name: 'Company Code', category: 'Organizational', route: '/master-data/company-code', icon: 'Building' },
      { name: 'Plant', category: 'Organizational', route: '/master-data/plant', icon: 'Factory' },
      { name: 'Storage Location', category: 'Organizational', route: '/master-data/storage-location', icon: 'Package' },
      { name: 'Sales Organization', category: 'Organizational', route: '/master-data/sales-organization', icon: 'Users' },
      { name: 'Purchase Organization', category: 'Organizational', route: '/master-data/purchase-organization', icon: 'ShoppingCart' },
      
      // Core Master Data
      { name: 'Customer Master', category: 'Core', route: '/master-data/customer-master', icon: 'User' },
      { name: 'Vendor Master', category: 'Core', route: '/master-data/vendor-master', icon: 'Truck' },
      { name: 'Material Master', category: 'Core', route: '/master-data/material-master', icon: 'Package2' },
      { name: 'Bill of Materials', category: 'Core', route: '/master-data/bill-of-materials', icon: 'FileText' },
      { name: 'Work Center', category: 'Core', route: '/master-data/work-center', icon: 'Settings' },
      { name: 'Cost Center', category: 'Core', route: '/master-data/cost-center', icon: 'DollarSign' },
      { name: 'Profit Center', category: 'Core', route: '/master-data/profit-center', icon: 'TrendingUp' },
      
      // Financial Configuration
      { name: 'Chart of Accounts', category: 'Financial', route: '/master-data/chart-of-accounts', icon: 'BookOpen' },
      { name: 'GL Account', category: 'Financial', route: '/master-data/gl-account', icon: 'CreditCard' },
      { name: 'Fiscal Year Variant', category: 'Financial', route: '/master-data/fiscal-year-variant', icon: 'Calendar' },
      { name: 'Currency', category: 'Financial', route: '/master-data/currency', icon: 'DollarSign' },
      { name: 'Exchange Rate', category: 'Financial', route: '/master-data/exchange-rate', icon: 'RefreshCw' },
      { name: 'Tax Code', category: 'Financial', route: '/master-data/tax-code', icon: 'FileText' },
      { name: 'Payment Terms', category: 'Financial', route: '/master-data/payment-terms', icon: 'CreditCard' },
      { name: 'Credit Control Area', category: 'Financial', route: '/master-data/credit-control-area', icon: 'Shield' },
      
      // Sales Configuration
      { name: 'Price List', category: 'Sales', route: '/master-data/price-lists', icon: 'DollarSign' },
      { name: 'Discount Group', category: 'Sales', route: '/master-data/discount-group', icon: 'Percent' },
      { name: 'Credit Limit Group', category: 'Sales', route: '/master-data/credit-limit-group', icon: 'CreditCard' },
      { name: 'Shipping Condition', category: 'Sales', route: '/master-data/shipping-condition', icon: 'Truck' },
      { name: 'Incoterms', category: 'Sales', route: '/master-data/incoterms', icon: 'Globe' },
      
      // Logistics Configuration
      { name: 'Transportation Zone', category: 'Logistics', route: '/master-data/transportation-zone', icon: 'Map' },
      { name: 'Route Schedule', category: 'Logistics', route: '/master-data/route-schedule', icon: 'Clock' },
      { name: 'Warehouse Type', category: 'Logistics', route: '/master-data/warehouse-type', icon: 'Package' },
      { name: 'Movement Type', category: 'Logistics', route: '/master-data/movement-types', icon: 'ArrowRightLeft' },
      
      // Quality Management
      { name: 'Quality Grade', category: 'Quality', route: '/master-data/quality-grade', icon: 'Award' },
      { name: 'Batch Class', category: 'Quality', route: '/master-data/batch-class', icon: 'Package2' },
      
      // Inventory Configuration
      { name: 'Serial Number Profile', category: 'Inventory', route: '/master-data/serial-number-profile', icon: 'Hash' },
      { name: 'Reason Code', category: 'Inventory', route: '/master-data/reason-code', icon: 'MessageSquare' },
      
      // System Configuration
      { name: 'Document Type', category: 'System', route: '/master-data/document-types', icon: 'FileText' },
      { name: 'Number Range', category: 'System', route: '/master-data/number-ranges', icon: 'Hash' },
      { name: 'Unit of Measure', category: 'System', route: '/master-data/unit-of-measure', icon: 'Ruler' },
      
      // Additional Configuration
      { name: 'Approval Level', category: 'Additional', route: '/master-data/approval-level', icon: 'CheckCircle' },
      { name: 'Global Company Code', category: 'Additional', route: '/master-data/global-company-code', icon: 'Globe' },
      { name: 'VAT Registration', category: 'Additional', route: '/master-data/vat-registration', icon: 'FileText' },
      { name: 'Account Group', category: 'Additional', route: '/master-data/account-group', icon: 'Users' },
      { name: 'Reconciliation Account', category: 'Additional', route: '/master-data/reconciliation-account', icon: 'RotateCcw' },
      { name: 'Valuation Class', category: 'Additional', route: '/master-data/valuation-class', icon: 'TrendingUp' },
      { name: 'Material Type', category: 'Additional', route: '/master-data/material-type', icon: 'Package2' },
      
      // Cross-Reference
      { name: 'Cross Reference Analysis', category: 'Analysis', route: '/master-data/cross-reference', icon: 'Network' },
      
      // Configuration Tools
      { name: 'Movement Classes Config', category: 'Configuration', route: '/master-data/movement-classes-config', icon: 'Settings' },
      { name: 'Transaction Types Config', category: 'Configuration', route: '/master-data/transaction-types-config', icon: 'Settings' },
      { name: 'Baseline Date Config', category: 'Configuration', route: '/master-data/baseline-date-config', icon: 'Calendar' },
      { name: 'Document Categories Config', category: 'Configuration', route: '/master-data/document-categories-config', icon: 'FileText' },
      { name: 'Account Types Config', category: 'Configuration', route: '/master-data/account-types-config', icon: 'CreditCard' },
      { name: 'Number Range Objects Config', category: 'Configuration', route: '/master-data/number-range-objects-config', icon: 'Hash' },
      { name: 'Inventory Directions Config', category: 'Configuration', route: '/master-data/inventory-directions-config', icon: 'ArrowRightLeft' }
    ];

    // Insert Master Data tiles with generated numbers
    for (const tile of masterDataTiles) {
      const tileNumber = await client.query(`SELECT generate_tile_number('MD') as number`);
      await client.query(`
        INSERT INTO tile_registry (tile_number, tile_name, tile_category, module_code, module_name, route_path, icon_name)
        VALUES ($1, $2, $3, 'MD', 'Master Data', $4, $5)
        ON CONFLICT (tile_number) DO UPDATE SET
          tile_name = EXCLUDED.tile_name,
          tile_category = EXCLUDED.tile_category,
          route_path = EXCLUDED.route_path,
          icon_name = EXCLUDED.icon_name,
          updated_at = CURRENT_TIMESTAMP
      `, [tileNumber.rows[0].number, tile.name, tile.category, tile.route, tile.icon]);
    }

    // 6. Create Tile Display View
    await client.query(`
      CREATE OR REPLACE VIEW tile_display_view AS
      SELECT 
        tile_number,
        tile_name,
        tile_category,
        module_code,
        module_name,
        route_path,
        icon_name,
        is_active,
        display_order,
        CASE 
          WHEN LENGTH(tile_number) = 5 THEN 'Standard'
          ELSE 'Extended'
        END as numbering_type,
        CASE 
          WHEN parent_tile_number IS NOT NULL THEN 'Sub-tile'
          ELSE 'Main-tile'
        END as tile_type,
        created_at
      FROM tile_registry
      ORDER BY module_code, tile_number;
    `);

    // 7. Create Statistics View
    await client.query(`
      CREATE OR REPLACE VIEW tile_statistics_view AS
      SELECT 
        module_code,
        module_name,
        COUNT(*) as total_tiles,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active_tiles,
        COUNT(CASE WHEN LENGTH(tile_number) = 5 THEN 1 END) as standard_numbered,
        COUNT(CASE WHEN LENGTH(tile_number) > 5 THEN 1 END) as extended_numbered,
        MIN(tile_number) as first_tile,
        MAX(tile_number) as last_tile
      FROM tile_registry
      GROUP BY module_code, module_name
      ORDER BY module_code;
    `);

    console.log('✅ Comprehensive Tile Numbering System Created Successfully');
    console.log('📊 Master Data tiles populated with systematic numbering');
    console.log('🔧 Extended numbering support: MD001-MD999, then MDA001-MDZ999');
    
  } catch (error) {
    console.error('❌ Error creating tile numbering system:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  createTileNumberingSystem()
    .then(() => {
      console.log('🎉 Tile Numbering System setup complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Setup failed:', error);
      process.exit(1);
    });
}

export { createTileNumberingSystem };