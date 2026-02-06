-- OneProject Real-Time Synchronization Database Triggers
-- These triggers ensure 100% parallel synchronization between OneProject and business domain tables

-- Enable the plpgsql extension if not already enabled
CREATE EXTENSION IF NOT EXISTS plpgsql;

-- Create sync operation log table if it doesn't exist
CREATE TABLE IF NOT EXISTS sync_operation_log (
    id SERIAL PRIMARY KEY,
    operation_type VARCHAR(50) NOT NULL,
    source_table VARCHAR(100) NOT NULL,
    target_table VARCHAR(100) NOT NULL,
    record_id VARCHAR(100) NOT NULL,
    sync_status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    operation_data JSONB,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP,
    INDEX idx_sync_operation_log_status (sync_status),
    INDEX idx_sync_operation_log_tables (source_table, target_table),
    INDEX idx_sync_operation_log_created_at (created_at)
);

-- Create sync monitoring view
CREATE OR REPLACE VIEW sync_monitoring_view AS
SELECT 
    source_table,
    target_table,
    sync_status,
    COUNT(*) as operation_count,
    MIN(created_at) as first_operation,
    MAX(created_at) as last_operation,
    AVG(EXTRACT(EPOCH FROM (completed_at - created_at))) as avg_duration_seconds
FROM sync_operation_log
GROUP BY source_table, target_table, sync_status
ORDER BY source_table, target_table, sync_status;

-- Create sync notification function
CREATE OR REPLACE FUNCTION notify_oneproject_sync()
RETURNS TRIGGER AS $$
BEGIN
    -- Notify the sync agent about changes
    PERFORM pg_notify('oneproject_sync', json_build_object(
        'table', TG_TABLE_NAME,
        'operation', TG_OP,
        'record_id', CASE 
            WHEN TG_OP = 'DELETE' THEN OLD.id::text
            ELSE NEW.id::text
        END,
        'timestamp', NOW()
    )::text);
    
    RETURN CASE 
        WHEN TG_OP = 'DELETE' THEN OLD
        ELSE NEW
    END;
END;
$$ LANGUAGE plpgsql;

-- Create OneProject sync notification function
CREATE OR REPLACE FUNCTION notify_business_sync()
RETURNS TRIGGER AS $$
DECLARE
    changed_fields text[];
    field_name text;
BEGIN
    -- For OneProject table changes, determine which fields changed
    IF TG_OP = 'UPDATE' THEN
        changed_fields := ARRAY[]::text[];
        
        -- Check all possible business-related fields for changes
        IF OLD.customer_number IS DISTINCT FROM NEW.customer_number OR
           OLD.customer_name IS DISTINCT FROM NEW.customer_name OR
           OLD.customer_description IS DISTINCT FROM NEW.customer_description THEN
            changed_fields := array_append(changed_fields, 'customer_fields');
        END IF;
        
        IF OLD.sales_order_number IS DISTINCT FROM NEW.sales_order_number OR
           OLD.sales_order_date IS DISTINCT FROM NEW.sales_order_date OR
           OLD.sales_order_status IS DISTINCT FROM NEW.sales_order_status THEN
            changed_fields := array_append(changed_fields, 'sales_order_fields');
        END IF;
        
        IF OLD.material_number IS DISTINCT FROM NEW.material_number OR
           OLD.material_description IS DISTINCT FROM NEW.material_description OR
           OLD.material_type IS DISTINCT FROM NEW.material_type THEN
            changed_fields := array_append(changed_fields, 'material_fields');
        END IF;
        
        IF OLD.vendor_number IS DISTINCT FROM NEW.vendor_number OR
           OLD.vendor_name IS DISTINCT FROM NEW.vendor_name OR
           OLD.vendor_description IS DISTINCT FROM NEW.vendor_description THEN
            changed_fields := array_append(changed_fields, 'vendor_fields');
        END IF;
        
        IF OLD.purchase_order_number IS DISTINCT FROM NEW.purchase_order_number OR
           OLD.purchase_order_date IS DISTINCT FROM NEW.purchase_order_date OR
           OLD.purchase_order_status IS DISTINCT FROM NEW.purchase_order_status THEN
            changed_fields := array_append(changed_fields, 'purchase_order_fields');
        END IF;
        
        IF OLD.production_order_number IS DISTINCT FROM NEW.production_order_number OR
           OLD.production_order_date IS DISTINCT FROM NEW.production_order_date OR
           OLD.production_order_status IS DISTINCT FROM NEW.production_order_status THEN
            changed_fields := array_append(changed_fields, 'production_order_fields');
        END IF;
        
        IF OLD.gl_account_number IS DISTINCT FROM NEW.gl_account_number OR
           OLD.gl_account_name IS DISTINCT FROM NEW.gl_account_name OR
           OLD.gl_account_description IS DISTINCT FROM NEW.gl_account_description THEN
            changed_fields := array_append(changed_fields, 'gl_account_fields');
        END IF;
        
        IF OLD.cost_center_code IS DISTINCT FROM NEW.cost_center_code OR
           OLD.cost_center_name IS DISTINCT FROM NEW.cost_center_name OR
           OLD.cost_center_description IS DISTINCT FROM NEW.cost_center_description THEN
            changed_fields := array_append(changed_fields, 'cost_center_fields');
        END IF;
        
        -- Check company code fields
        IF OLD.company_code IS DISTINCT FROM NEW.company_code OR
           OLD.company_name IS DISTINCT FROM NEW.company_name OR
           OLD.company_description IS DISTINCT FROM NEW.company_description THEN
            changed_fields := array_append(changed_fields, 'company_code_fields');
        END IF;
        
        -- Check plant fields
        IF OLD.plant_code IS DISTINCT FROM NEW.plant_code OR
           OLD.plant_name IS DISTINCT FROM NEW.plant_name OR
           OLD.plant_description IS DISTINCT FROM NEW.plant_description THEN
            changed_fields := array_append(changed_fields, 'plant_fields');
        END IF;
    ELSE
        -- For INSERT/DELETE, sync all relevant fields
        changed_fields := ARRAY['all_fields'];
    END IF;
    
    -- Notify sync agent if any relevant fields changed
    IF array_length(changed_fields, 1) > 0 THEN
        PERFORM pg_notify('business_sync', json_build_object(
            'table', 'one_project',
            'operation', TG_OP,
            'record_id', CASE 
                WHEN TG_OP = 'DELETE' THEN OLD.id::text
                ELSE NEW.id::text
            END,
            'changed_fields', changed_fields,
            'timestamp', NOW()
        )::text);
    END IF;
    
    RETURN CASE 
        WHEN TG_OP = 'DELETE' THEN OLD
        ELSE NEW
    END;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS oneproject_sync_trigger ON one_project;
DROP TRIGGER IF EXISTS customers_sync_trigger ON customers;
DROP TRIGGER IF EXISTS sales_orders_sync_trigger ON sales_orders;
DROP TRIGGER IF EXISTS materials_sync_trigger ON materials;
DROP TRIGGER IF EXISTS vendors_sync_trigger ON vendors;
DROP TRIGGER IF EXISTS purchase_orders_sync_trigger ON purchase_orders;
DROP TRIGGER IF EXISTS production_orders_sync_trigger ON production_orders;
DROP TRIGGER IF EXISTS general_ledger_accounts_sync_trigger ON general_ledger_accounts;
DROP TRIGGER IF EXISTS cost_centers_sync_trigger ON cost_centers;
DROP TRIGGER IF EXISTS company_codes_sync_trigger ON company_codes;
DROP TRIGGER IF EXISTS plants_sync_trigger ON plants;

-- Create triggers for OneProject table (sync to business tables)
CREATE TRIGGER oneproject_sync_trigger
    AFTER INSERT OR UPDATE OR DELETE ON one_project
    FOR EACH ROW
    EXECUTE FUNCTION notify_business_sync();

-- Create triggers for business domain tables (sync to OneProject)

-- Company Codes table trigger
CREATE TRIGGER company_codes_sync_trigger
    AFTER INSERT OR UPDATE OR DELETE ON company_codes
    FOR EACH ROW
    EXECUTE FUNCTION notify_oneproject_sync();

-- Plants table trigger
CREATE TRIGGER plants_sync_trigger
    AFTER INSERT OR UPDATE OR DELETE ON plants
    FOR EACH ROW
    EXECUTE FUNCTION notify_oneproject_sync();

-- Customers table trigger
CREATE TRIGGER customers_sync_trigger
    AFTER INSERT OR UPDATE OR DELETE ON customers
    FOR EACH ROW
    EXECUTE FUNCTION notify_oneproject_sync();

-- Sales Orders table trigger
CREATE TRIGGER sales_orders_sync_trigger
    AFTER INSERT OR UPDATE OR DELETE ON sales_orders
    FOR EACH ROW
    EXECUTE FUNCTION notify_oneproject_sync();

-- Materials table trigger
CREATE TRIGGER materials_sync_trigger
    AFTER INSERT OR UPDATE OR DELETE ON materials
    FOR EACH ROW
    EXECUTE FUNCTION notify_oneproject_sync();

-- Vendors table trigger
CREATE TRIGGER vendors_sync_trigger
    AFTER INSERT OR UPDATE OR DELETE ON vendors
    FOR EACH ROW
    EXECUTE FUNCTION notify_oneproject_sync();

-- Purchase Orders table trigger
CREATE TRIGGER purchase_orders_sync_trigger
    AFTER INSERT OR UPDATE OR DELETE ON purchase_orders
    FOR EACH ROW
    EXECUTE FUNCTION notify_oneproject_sync();

-- Production Orders table trigger
CREATE TRIGGER production_orders_sync_trigger
    AFTER INSERT OR UPDATE OR DELETE ON production_orders
    FOR EACH ROW
    EXECUTE FUNCTION notify_oneproject_sync();

-- General Ledger Accounts table trigger
CREATE TRIGGER general_ledger_accounts_sync_trigger
    AFTER INSERT OR UPDATE OR DELETE ON general_ledger_accounts
    FOR EACH ROW
    EXECUTE FUNCTION notify_oneproject_sync();

-- Cost Centers table trigger
CREATE TRIGGER cost_centers_sync_trigger
    AFTER INSERT OR UPDATE OR DELETE ON cost_centers
    FOR EACH ROW
    EXECUTE FUNCTION notify_oneproject_sync();

-- Create sync monitoring view
CREATE OR REPLACE VIEW sync_monitoring_view AS
SELECT 
    sol.operation_type,
    sol.source_table,
    sol.target_table,
    sol.sync_status,
    COUNT(*) as operation_count,
    MAX(sol.created_at) as last_operation,
    AVG(EXTRACT(EPOCH FROM (sol.completed_at - sol.created_at))) as avg_sync_time_seconds
FROM sync_operation_log sol
WHERE sol.created_at > CURRENT_TIMESTAMP - INTERVAL '24 hours'
GROUP BY sol.operation_type, sol.source_table, sol.target_table, sol.sync_status
ORDER BY last_operation DESC;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sync_operation_log_created_at ON sync_operation_log(created_at);
CREATE INDEX IF NOT EXISTS idx_sync_operation_log_status ON sync_operation_log(sync_status);
CREATE INDEX IF NOT EXISTS idx_sync_operation_log_tables ON sync_operation_log(source_table, target_table);

-- Grant necessary permissions
GRANT ALL ON sync_operation_log TO PUBLIC;
GRANT ALL ON sync_monitoring_view TO PUBLIC;