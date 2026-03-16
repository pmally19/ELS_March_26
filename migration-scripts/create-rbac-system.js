/**
 * Role-Based Access Control (RBAC) System Implementation
 * 
 * Creates comprehensive user permission management with tile-level access control
 * Including unique tile IDs, role management, and permission matrices
 */

import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function createRBACSystem() {
  const client = await pool.connect();
  
  try {
    console.log('🔐 Creating RBAC System...');
    
    // 1. Create Tiles Registry with Unique IDs
    await client.query(`
      CREATE TABLE IF NOT EXISTS system_tiles (
        id SERIAL PRIMARY KEY,
        tile_id VARCHAR(10) UNIQUE NOT NULL,
        tile_name VARCHAR(100) NOT NULL,
        tile_category VARCHAR(50) NOT NULL,
        route_path VARCHAR(200),
        description TEXT,
        module_group VARCHAR(50) NOT NULL,
        icon_name VARCHAR(50),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Create User Roles
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_roles (
        id SERIAL PRIMARY KEY,
        role_name VARCHAR(50) UNIQUE NOT NULL,
        role_description TEXT,
        role_level INTEGER DEFAULT 1, -- 1=lowest, 5=highest
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. Create Users Table (if not exists)
    await client.query(`
      CREATE TABLE IF NOT EXISTS system_users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255),
        first_name VARCHAR(50),
        last_name VARCHAR(50),
        role_id INTEGER REFERENCES user_roles(id),
        is_active BOOLEAN DEFAULT true,
        last_login TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 4. Create Permission Actions
    await client.query(`
      CREATE TABLE IF NOT EXISTS permission_actions (
        id SERIAL PRIMARY KEY,
        action_name VARCHAR(20) UNIQUE NOT NULL,
        action_description TEXT,
        action_level INTEGER DEFAULT 1
      );
    `);

    // 5. Create Role Permissions Matrix
    await client.query(`
      CREATE TABLE IF NOT EXISTS role_tile_permissions (
        id SERIAL PRIMARY KEY,
        role_id INTEGER REFERENCES user_roles(id),
        tile_id VARCHAR(10) REFERENCES system_tiles(tile_id),
        action_id INTEGER REFERENCES permission_actions(id),
        is_granted BOOLEAN DEFAULT false,
        created_by INTEGER REFERENCES system_users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(role_id, tile_id, action_id)
      );
    `);

    // 6. Create Audit Trail for Permission Changes
    await client.query(`
      CREATE TABLE IF NOT EXISTS permission_audit_log (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES system_users(id),
        action_type VARCHAR(50), -- GRANT, REVOKE, MODIFY
        tile_id VARCHAR(10),
        role_id INTEGER,
        permission_details JSONB,
        ip_address INET,
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 7. Insert Permission Actions
    await client.query(`
      INSERT INTO permission_actions (action_name, action_description, action_level) VALUES
      ('VIEW', 'View and read data', 1),
      ('CREATE', 'Create new records', 2),
      ('EDIT', 'Modify existing records', 3),
      ('COPY', 'Duplicate existing records', 2),
      ('DEACTIVATE', 'Soft delete (deactivate) records', 4),
      ('EXPORT', 'Export data to files', 2),
      ('IMPORT', 'Import data from files', 3),
      ('APPROVE', 'Approve workflows and changes', 4),
      ('ADMIN', 'Full administrative access', 5)
      ON CONFLICT (action_name) DO NOTHING;
    `);

    // 8. Insert Default Roles
    await client.query(`
      INSERT INTO user_roles (role_name, role_description, role_level) VALUES
      ('Super Admin', 'Full system access and user management', 5),
      ('Finance Manager', 'Full finance module access', 4),
      ('Sales Manager', 'Full sales module access', 4),
      ('Inventory Controller', 'Full inventory and warehouse access', 4),
      ('Purchase Manager', 'Full procurement and vendor access', 4),
      ('Production Manager', 'Full manufacturing and planning access', 4),
      ('Master Data Specialist', 'Create and maintain master data', 3),
      ('Data Entry Clerk', 'Create and edit specific data', 2),
      ('Auditor', 'View-only access across modules', 1),
      ('Guest User', 'Limited view access', 1)
      ON CONFLICT (role_name) DO NOTHING;
    `);

    console.log('✅ RBAC System created successfully');
    
  } catch (error) {
    console.error('❌ Error creating RBAC system:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function populateTileRegistry() {
  const client = await pool.connect();
  
  try {
    console.log('📋 Populating Tile Registry with Unique IDs...');
    
    const tiles = [
      // Master Data Tiles (MD001-MD049)
      { tile_id: 'MD001', name: 'Company Code', category: 'Organizational', route: '/master-data/company-code', module: 'Master Data', icon: 'Building' },
      { tile_id: 'MD002', name: 'Plant', category: 'Organizational', route: '/master-data/plant', module: 'Master Data', icon: 'Factory' },
      { tile_id: 'MD003', name: 'Storage Location', category: 'Organizational', route: '/master-data/storage-location', module: 'Master Data', icon: 'Package' },
      { tile_id: 'MD004', name: 'Sales Organization', category: 'Organizational', route: '/master-data/sales-organization', module: 'Master Data', icon: 'Store' },
      { tile_id: 'MD005', name: 'Purchase Organization', category: 'Organizational', route: '/master-data/purchase-organization', module: 'Master Data', icon: 'ShoppingBag' },
      { tile_id: 'MD006', name: 'Purchase References', category: 'Organizational', route: '/master-data/purchase-references', module: 'Master Data', icon: 'FileText' },
      { tile_id: 'MD007', name: 'Credit Control', category: 'Organizational', route: '/master-data/credit-control', module: 'Master Data', icon: 'CreditCard' },
      
      { tile_id: 'MD008', name: 'Material Master', category: 'Core', route: '/master-data/material-master', module: 'Master Data', icon: 'Package2' },
      { tile_id: 'MD009', name: 'Bill of Materials', category: 'Core', route: '/master-data/bill-of-materials', module: 'Master Data', icon: 'ClipboardCheck' },
      { tile_id: 'MD010', name: 'Units of Measure', category: 'Core', route: '/master-data/units-of-measure', module: 'Master Data', icon: 'Ruler' },
      { tile_id: 'MD011', name: 'Customer Master', category: 'Core', route: '/master-data/customer-master', module: 'Master Data', icon: 'Users' },
      { tile_id: 'MD012', name: 'Vendor Master', category: 'Core', route: '/master-data/vendor-master', module: 'Master Data', icon: 'Building' },
      { tile_id: 'MD013', name: 'Currencies', category: 'Core', route: '/master-data/currencies', module: 'Master Data', icon: 'DollarSign' },
      { tile_id: 'MD014', name: 'Supply Types', category: 'Core', route: '/master-data/supply-types', module: 'Master Data', icon: 'Truck' },
      { tile_id: 'MD015', name: 'Cost Centers', category: 'Core', route: '/master-data/cost-centers', module: 'Master Data', icon: 'Calculator' },
      
      // Categorized Master Data (MD016-MD036)
      { tile_id: 'MD016', name: 'Account Groups', category: 'Financial', route: '/master-data/account-groups', module: 'Master Data', icon: 'Users2' },
      { tile_id: 'MD017', name: 'Reconciliation Accounts', category: 'Financial', route: '/master-data/reconciliation-accounts', module: 'Master Data', icon: 'BookOpen' },
      { tile_id: 'MD018', name: 'Valuation Classes', category: 'Financial', route: '/master-data/valuation-classes', module: 'Master Data', icon: 'Calculator' },
      { tile_id: 'MD019', name: 'Payment Terms', category: 'Financial', route: '/master-data/payment-terms', module: 'Master Data', icon: 'CreditCard' },
      { tile_id: 'MD020', name: 'Tax Codes', category: 'Financial', route: '/master-data/tax-codes', module: 'Master Data', icon: 'Receipt' },
      
      { tile_id: 'MD021', name: 'Material Types', category: 'Materials', route: '/master-data/material-types', module: 'Master Data', icon: 'Package2' },
      
      { tile_id: 'MD022', name: 'Price Lists', category: 'Sales', route: '/master-data/price-lists', module: 'Master Data', icon: 'DollarSign' },
      { tile_id: 'MD023', name: 'Discount Groups', category: 'Sales', route: '/master-data/discount-groups', module: 'Master Data', icon: 'Percent' },
      { tile_id: 'MD024', name: 'Credit Limit Groups', category: 'Sales', route: '/master-data/credit-limit-groups', module: 'Master Data', icon: 'Shield' },
      
      { tile_id: 'MD025', name: 'Incoterms', category: 'Logistics', route: '/master-data/incoterms', module: 'Master Data', icon: 'Truck' },
      { tile_id: 'MD026', name: 'Shipping Conditions', category: 'Logistics', route: '/master-data/shipping-conditions', module: 'Master Data', icon: 'Package' },
      { tile_id: 'MD027', name: 'Transportation Zones', category: 'Logistics', route: '/master-data/transportation-zones', module: 'Master Data', icon: 'Map' },
      { tile_id: 'MD028', name: 'Route Schedules', category: 'Logistics', route: '/master-data/route-schedules', module: 'Master Data', icon: 'Clock' },
      
      { tile_id: 'MD029', name: 'Warehouse Types', category: 'Inventory', route: '/master-data/warehouse-types', module: 'Master Data', icon: 'Warehouse' },
      { tile_id: 'MD030', name: 'Movement Types', category: 'Inventory', route: '/master-data/movement-types', module: 'Master Data', icon: 'ArrowUpDown' },
      
      { tile_id: 'MD031', name: 'Reason Codes', category: 'Operations', route: '/master-data/reason-codes', module: 'Master Data', icon: 'FileText' },
      
      { tile_id: 'MD032', name: 'Quality Grades', category: 'Quality', route: '/master-data/quality-grades', module: 'Master Data', icon: 'Award' },
      { tile_id: 'MD033', name: 'Batch Classes', category: 'Quality', route: '/master-data/batch-classes', module: 'Master Data', icon: 'Package2' },
      
      { tile_id: 'MD034', name: 'Serial Number Profiles', category: 'Tracking', route: '/master-data/serial-number-profiles', module: 'Master Data', icon: 'Hash' },
      
      { tile_id: 'MD035', name: 'Document Types', category: 'System', route: '/master-data/document-types', module: 'Master Data', icon: 'FileText' },
      { tile_id: 'MD036', name: 'Number Ranges', category: 'System', route: '/master-data/number-ranges', module: 'Master Data', icon: 'Hash' },
      
      // Sales Tiles (SL001-SL010)
      { tile_id: 'SL001', name: 'Sales Overview', category: 'Dashboard', route: '/sales', module: 'Sales', icon: 'BarChart3' },
      { tile_id: 'SL002', name: 'Sales Orders', category: 'Transactions', route: '/sales/orders', module: 'Sales', icon: 'ShoppingCart' },
      { tile_id: 'SL003', name: 'Leads Management', category: 'CRM', route: '/sales/leads', module: 'Sales', icon: 'Users' },
      { tile_id: 'SL004', name: 'Opportunities', category: 'CRM', route: '/sales/opportunities', module: 'Sales', icon: 'Target' },
      { tile_id: 'SL005', name: 'Quotes & Estimates', category: 'Documents', route: '/sales/quotes', module: 'Sales', icon: 'FileText' },
      { tile_id: 'SL006', name: 'Sales Invoices', category: 'Documents', route: '/sales/invoices', module: 'Sales', icon: 'Receipt' },
      { tile_id: 'SL007', name: 'Returns & Refunds', category: 'Service', route: '/sales/returns', module: 'Sales', icon: 'RotateCcw' },
      { tile_id: 'SL008', name: 'Customer Management', category: 'Master Data', route: '/sales/customers', module: 'Sales', icon: 'Users2' },
      { tile_id: 'SL009', name: 'Sales Configuration', category: 'Setup', route: '/sales/configuration', module: 'Sales', icon: 'Settings' },
      { tile_id: 'SL010', name: 'Sales Customization', category: 'Advanced', route: '/sales/customization', module: 'Sales', icon: 'Wrench' },
      
      // Finance Tiles (FI001-FI006)
      { tile_id: 'FI001', name: 'Finance Dashboard', category: 'Dashboard', route: '/finance', module: 'Finance', icon: 'DollarSign' },
      { tile_id: 'FI002', name: 'General Ledger', category: 'Accounting', route: '/general-ledger', module: 'Finance', icon: 'BookOpen' },
      { tile_id: 'FI003', name: 'Accounts Payable', category: 'Accounting', route: '/finance/accounts-payable', module: 'Finance', icon: 'CreditCard' },
      { tile_id: 'FI004', name: 'Accounts Receivable', category: 'Accounting', route: '/finance/accounts-receivable', module: 'Finance', icon: 'Banknote' },
      { tile_id: 'FI005', name: 'Financial Reports', category: 'Reporting', route: '/finance/reports', module: 'Finance', icon: 'FileBarChart' },
      { tile_id: 'FI006', name: 'Budget Management', category: 'Planning', route: '/finance/budget', module: 'Finance', icon: 'Calculator' },
      
      // Inventory Tiles (IN001-IN004)
      { tile_id: 'IN001', name: 'Inventory Dashboard', category: 'Dashboard', route: '/inventory', module: 'Inventory', icon: 'Package' },
      { tile_id: 'IN002', name: 'Stock Management', category: 'Operations', route: '/inventory/stock', module: 'Inventory', icon: 'Boxes' },
      { tile_id: 'IN003', name: 'Warehouse Operations', category: 'Operations', route: '/inventory/warehouse', module: 'Inventory', icon: 'Warehouse' },
      { tile_id: 'IN004', name: 'Inventory Reports', category: 'Reporting', route: '/inventory/reports', module: 'Inventory', icon: 'BarChart3' },
      
      // Purchase Tiles (PU001-PU008)
      { tile_id: 'PU001', name: 'Purchase Dashboard', category: 'Dashboard', route: '/purchase', module: 'Purchase', icon: 'ShoppingBag' },
      { tile_id: 'PU002', name: 'Purchase Orders', category: 'Documents', route: '/purchase/orders', module: 'Purchase', icon: 'FileText' },
      { tile_id: 'PU003', name: 'Purchase Requisitions', category: 'Requests', route: '/purchase/requisitions', module: 'Purchase', icon: 'FileInput' },
      { tile_id: 'PU004', name: 'Vendor Management', category: 'Master Data', route: '/purchase/vendors', module: 'Purchase', icon: 'Building2' },
      { tile_id: 'PU005', name: 'Goods Receipt', category: 'Operations', route: '/purchase/goods-receipt', module: 'Purchase', icon: 'PackageCheck' },
      { tile_id: 'PU006', name: 'Invoice Verification', category: 'Approval', route: '/purchase/invoice-verification', module: 'Purchase', icon: 'CheckCircle' },
      { tile_id: 'PU007', name: 'Contract Management', category: 'Legal', route: '/purchase/contracts', module: 'Purchase', icon: 'FileSignature' },
      { tile_id: 'PU008', name: 'Sourcing & RFQ', category: 'Strategic', route: '/purchase/sourcing', module: 'Purchase', icon: 'Search' },
      
      // Production Tiles (PR001-PR012)
      { tile_id: 'PR001', name: 'Production Dashboard', category: 'Dashboard', route: '/production', module: 'Production', icon: 'Factory' },
      { tile_id: 'PR002', name: 'Production Planning', category: 'Planning', route: '/production/planning', module: 'Production', icon: 'Calendar' },
      { tile_id: 'PR003', name: 'Manufacturing Execution', category: 'Operations', route: '/production/execution', module: 'Production', icon: 'Play' },
      { tile_id: 'PR004', name: 'Work Center Management', category: 'Resources', route: '/production/work-centers', module: 'Production', icon: 'Settings' },
      { tile_id: 'PR005', name: 'Production Orders', category: 'Documents', route: '/production/orders', module: 'Production', icon: 'ListOrdered' },
      { tile_id: 'PR006', name: 'Capacity Planning', category: 'Planning', route: '/production/capacity', module: 'Production', icon: 'BarChart3' },
      { tile_id: 'PR007', name: 'Quality Control', category: 'Quality', route: '/production/quality', module: 'Production', icon: 'Award' },
      { tile_id: 'PR008', name: 'Material Requirements', category: 'Planning', route: '/production/mrp', module: 'Production', icon: 'Package' },
      { tile_id: 'PR009', name: 'Shop Floor Control', category: 'Operations', route: '/production/shop-floor', module: 'Production', icon: 'Monitor' },
      { tile_id: 'PR010', name: 'Resource Management', category: 'Resources', route: '/production/resources', module: 'Production', icon: 'Users' },
      { tile_id: 'PR011', name: 'Routing Operations', category: 'Planning', route: '/production/routing', module: 'Production', icon: 'Route' },
      { tile_id: 'PR012', name: 'Production Scheduling', category: 'Planning', route: '/production/scheduling', module: 'Production', icon: 'Clock' }
    ];

    for (const tile of tiles) {
      await client.query(`
        INSERT INTO system_tiles (tile_id, tile_name, tile_category, route_path, module_group, icon_name, description)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (tile_id) DO UPDATE SET
        tile_name = EXCLUDED.tile_name,
        tile_category = EXCLUDED.tile_category,
        route_path = EXCLUDED.route_path,
        module_group = EXCLUDED.module_group,
        icon_name = EXCLUDED.icon_name,
        updated_at = CURRENT_TIMESTAMP
      `, [tile.tile_id, tile.name, tile.category, tile.route, tile.module, tile.icon, `Access to ${tile.name} functionality`]);
    }

    console.log(`✅ Populated ${tiles.length} tiles in registry`);
    
  } catch (error) {
    console.error('❌ Error populating tile registry:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function createDefaultAdmin() {
  const client = await pool.connect();
  
  try {
    console.log('👤 Creating default admin user...');
    
    // Create default admin user
    await client.query(`
      INSERT INTO system_users (username, email, first_name, last_name, role_id, password_hash)
      SELECT 'admin', 'admin@mallya.com', 'System', 'Administrator', 
             (SELECT id FROM user_roles WHERE role_name = 'Super Admin' LIMIT 1),
             '$2b$10$hash.placeholder.for.admin.password'
      WHERE NOT EXISTS (SELECT 1 FROM system_users WHERE username = 'admin');
    `);

    // Grant all permissions to Super Admin role
    const superAdminRoleResult = await client.query(`
      SELECT id FROM user_roles WHERE role_name = 'Super Admin' LIMIT 1
    `);
    
    if (superAdminRoleResult.rows.length > 0) {
      const superAdminRoleId = superAdminRoleResult.rows[0].id;
      
      await client.query(`
        INSERT INTO role_tile_permissions (role_id, tile_id, action_id, is_granted)
        SELECT $1, st.tile_id, pa.id, true
        FROM system_tiles st
        CROSS JOIN permission_actions pa
        ON CONFLICT (role_id, tile_id, action_id) DO UPDATE SET
        is_granted = true,
        created_at = CURRENT_TIMESTAMP
      `, [superAdminRoleId]);
    }

    console.log('✅ Default admin user created with full permissions');
    
  } catch (error) {
    console.error('❌ Error creating default admin:', error);
    throw error;
  } finally {
    client.release();
  }
}

async function main() {
  try {
    await createRBACSystem();
    await populateTileRegistry();
    await createDefaultAdmin();
    
    console.log('\n🎉 RBAC System Implementation Complete!');
    console.log('📊 Summary:');
    console.log('   - System tiles with unique IDs created');
    console.log('   - User roles and permissions configured');
    console.log('   - Default admin user established');
    console.log('   - Permission audit trail enabled');
    console.log('\n🔑 Next Steps:');
    console.log('   1. Create Admin UI for permission management');
    console.log('   2. Implement middleware for route protection');
    console.log('   3. Add copy/deactivate functionality to tiles');
    
  } catch (error) {
    console.error('❌ Failed to create RBAC system:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();