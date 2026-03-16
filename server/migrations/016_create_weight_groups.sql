-- Create weight_groups table (SAP OVL2)
CREATE TABLE IF NOT EXISTS weight_groups (
    id SERIAL PRIMARY KEY,
    code VARCHAR(4) UNIQUE NOT NULL,
    description VARCHAR(20) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by INTEGER,
    updated_by INTEGER
);

-- Indexes for performance
CREATE INDEX idx_weight_groups_code ON weight_groups(code);
CREATE INDEX idx_weight_groups_active ON weight_groups(is_active);

-- NO sample data (per user request - no hardcoded data)
