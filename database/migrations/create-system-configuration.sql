-- Create system_configuration table for dynamic configuration
CREATE TABLE IF NOT EXISTS system_configuration (
    id SERIAL PRIMARY KEY,
    config_key VARCHAR(255) UNIQUE NOT NULL,
    config_value TEXT NOT NULL,
    description TEXT,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert default system configuration values
INSERT INTO system_configuration (config_key, config_value, description) VALUES
('default_plant_id', '2', 'Default plant ID for new sales orders'),
('default_sales_org_id', '1', 'Default sales organization ID'),
('default_company_code_id', '1', 'Default company code ID'),
('default_currency_id', '1', 'Default currency ID (e.g., USD)'),
('default_tax_rate', '0.10', 'Default tax rate (e.g., 0.10 for 10%)'),
('approval_threshold_amount', '10000', 'Orders above this amount require approval'),
('credit_check_enabled', 'true', 'Enable or disable credit checks'),
('reserve_inventory_on_order', 'true', 'Automatically reserve inventory when sales order is created')
ON CONFLICT (config_key) DO UPDATE SET
    config_value = EXCLUDED.config_value,
    description = EXCLUDED.description,
    updated_at = CURRENT_TIMESTAMP;
