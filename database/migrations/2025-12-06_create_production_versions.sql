-- Create production_versions table
-- Links Bill of Materials and Routing for a material/plant combination
CREATE TABLE IF NOT EXISTS production_versions (
    id SERIAL PRIMARY KEY,
    material_id INTEGER NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
    plant_id INTEGER NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
    version_number VARCHAR(10) NOT NULL,
    bom_id INTEGER NOT NULL REFERENCES bill_of_materials(id),
    routing_id INTEGER, -- Can reference routing_master.id or routings.routing_id
    routing_model_type VARCHAR(20) DEFAULT 'legacy', -- 'legacy' for routings table, 'modern' for routing_master
    valid_from DATE NOT NULL,
    valid_to DATE,
    lot_size_from NUMERIC DEFAULT 0,
    lot_size_to NUMERIC,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(material_id, plant_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_production_versions_material_plant ON production_versions(material_id, plant_id);
CREATE INDEX IF NOT EXISTS idx_production_versions_active ON production_versions(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_production_versions_bom ON production_versions(bom_id);
CREATE INDEX IF NOT EXISTS idx_production_versions_validity ON production_versions(valid_from, valid_to);

COMMENT ON TABLE production_versions IS 'Links Bill of Materials and Routing for production planning';
COMMENT ON COLUMN production_versions.version_number IS 'Version identifier (e.g., 01, 02)';
COMMENT ON COLUMN production_versions.routing_model_type IS 'Type of routing model: legacy (routings table) or modern (routing_master table)';

