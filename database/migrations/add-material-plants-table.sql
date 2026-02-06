-- Create material_plants junction table to link materials to plants
-- This allows a material to be assigned to multiple plants

CREATE TABLE IF NOT EXISTS material_plants (
    id SERIAL PRIMARY KEY,
    material_id INTEGER NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
    plant_id INTEGER NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    created_by INTEGER,
    updated_by INTEGER,
    UNIQUE(material_id, plant_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_material_plants_material_id ON material_plants(material_id);
CREATE INDEX IF NOT EXISTS idx_material_plants_plant_id ON material_plants(plant_id);
CREATE INDEX IF NOT EXISTS idx_material_plants_active ON material_plants(is_active);

-- Add comment
COMMENT ON TABLE material_plants IS 'Junction table to link materials to plants. A material can be assigned to multiple plants.';
COMMENT ON COLUMN material_plants.material_id IS 'Reference to materials table';
COMMENT ON COLUMN material_plants.plant_id IS 'Reference to plants table';
COMMENT ON COLUMN material_plants.is_active IS 'Whether this material-plant assignment is active';

