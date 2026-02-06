-- Create material_groups table if it doesn't exist
-- This table stores material group master data

CREATE TABLE IF NOT EXISTS material_groups (
    id SERIAL PRIMARY KEY,
    code VARCHAR(10) NOT NULL UNIQUE,
    description VARCHAR(100) NOT NULL,
    material_group_hierarchy VARCHAR(50),
    general_item_category VARCHAR(20),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_material_groups_code ON material_groups(code);
CREATE INDEX IF NOT EXISTS idx_material_groups_hierarchy ON material_groups(material_group_hierarchy);
CREATE INDEX IF NOT EXISTS idx_material_groups_is_active ON material_groups(is_active);

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_material_groups_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_material_groups_updated_at
    BEFORE UPDATE ON material_groups
    FOR EACH ROW
    EXECUTE FUNCTION update_material_groups_updated_at();

-- Add comment to table
COMMENT ON TABLE material_groups IS 'Master data table for material groups - used to categorize materials';
COMMENT ON COLUMN material_groups.code IS 'Unique code for the material group (e.g., RAW, FERT, SEM)';
COMMENT ON COLUMN material_groups.description IS 'Description of the material group';
COMMENT ON COLUMN material_groups.material_group_hierarchy IS 'Hierarchical classification code';
COMMENT ON COLUMN material_groups.general_item_category IS 'General item category classification';

