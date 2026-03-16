
CREATE TABLE IF NOT EXISTS shipping_point_determination (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    shipping_condition_key VARCHAR(4) NOT NULL,
    loading_group_code VARCHAR(4) NOT NULL,
    plant_code VARCHAR(4) NOT NULL,
    proposed_shipping_point VARCHAR(4) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by INTEGER,
    updated_by INTEGER
);

-- Create a unique index to prevent duplicate rules for the same combination
CREATE UNIQUE INDEX IF NOT EXISTS idx_shipping_point_determination_unique 
ON shipping_point_determination (shipping_condition_key, loading_group_code, plant_code);
