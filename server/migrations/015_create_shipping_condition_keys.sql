-- Create shipping_condition_keys table (SAP OVLK)
CREATE TABLE IF NOT EXISTS shipping_condition_keys (
    id SERIAL PRIMARY KEY,
    key_code VARCHAR(3) UNIQUE NOT NULL,
    description VARCHAR(20) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by INTEGER,
    updated_by INTEGER
);

-- Indexes for performance
CREATE INDEX idx_shipping_condition_keys_code ON shipping_condition_keys(key_code);
CREATE INDEX idx_shipping_condition_keys_active ON shipping_condition_keys(is_active);

-- NO sample data (per user request - no hardcoded data)
