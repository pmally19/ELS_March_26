-- Create production_order_types configuration table
-- Defines order type configurations
CREATE TABLE IF NOT EXISTS production_order_types (
    id SERIAL PRIMARY KEY,
    order_type_code VARCHAR(10) NOT NULL UNIQUE,
    description TEXT,
    
    -- Default values
    default_status VARCHAR(20) DEFAULT 'CREATED',
    default_priority VARCHAR(20) DEFAULT 'NORMAL',
    
    -- Settlement configuration
    settlement_profile VARCHAR(20),
    settlement_rule VARCHAR(20),
    cost_center_id INTEGER REFERENCES cost_centers(id),
    
    -- Status control
    allow_partial_release BOOLEAN DEFAULT false,
    require_approval BOOLEAN DEFAULT false,
    auto_release BOOLEAN DEFAULT false,
    
    -- Plant restrictions (stored as JSON array of plant IDs)
    allowed_plant_ids INTEGER[],
    
    -- Metadata
    is_active BOOLEAN DEFAULT true,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default order types
INSERT INTO production_order_types (order_type_code, description, default_status, default_priority) VALUES
('PROD01', 'Standard Production Order', 'CREATED', 'NORMAL'),
('PROD02', 'Rush Production Order', 'CREATED', 'HIGH'),
('REWORK', 'Rework Order', 'CREATED', 'NORMAL'),
('SAMPLE', 'Sample Production', 'CREATED', 'LOW')
ON CONFLICT (order_type_code) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_production_order_types_active ON production_order_types(is_active) WHERE is_active = true;

COMMENT ON TABLE production_order_types IS 'Configuration for production order types';
COMMENT ON COLUMN production_order_types.allowed_plant_ids IS 'Array of plant IDs where this order type is allowed';

