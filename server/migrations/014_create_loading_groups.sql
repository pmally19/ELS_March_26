-- Migration: Create loading_groups table (SAP Standard - OVL1)
-- Loading Groups are used to categorize materials for loading operations

CREATE TABLE IF NOT EXISTS loading_groups (
    id SERIAL PRIMARY KEY,
    code VARCHAR(2) UNIQUE NOT NULL,
    description VARCHAR(20) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by INTEGER,
    updated_by INTEGER
);

-- Indexes
CREATE INDEX idx_loading_groups_code ON loading_groups(code);
CREATE INDEX idx_loading_groups_active ON loading_groups(is_active);

-- Sample data (SAP standard examples)
INSERT INTO loading_groups (code, description, is_active) VALUES
('01', 'Palletized Goods', true),
('02', 'Bulk Materials', true),
('03', 'Dangerous Goods', true),
('04', 'Heavy Equipment', true)
ON CONFLICT (code) DO NOTHING;
