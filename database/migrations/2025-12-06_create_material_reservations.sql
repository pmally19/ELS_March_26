-- Create material_reservations table
-- Tracks material reservations for production orders
CREATE TABLE IF NOT EXISTS material_reservations (
    id SERIAL PRIMARY KEY,
    production_order_id INTEGER NOT NULL REFERENCES production_orders(id) ON DELETE CASCADE,
    material_code VARCHAR(50) NOT NULL,
    material_id INTEGER REFERENCES materials(id),
    plant_id INTEGER REFERENCES plants(id),
    storage_location VARCHAR(20),
    
    -- Quantities
    reserved_quantity NUMERIC NOT NULL,
    withdrawn_quantity NUMERIC DEFAULT 0,
    remaining_quantity NUMERIC GENERATED ALWAYS AS (reserved_quantity - withdrawn_quantity) STORED,
    
    -- Dates
    reservation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    requirement_date DATE,
    
    -- Status
    status VARCHAR(20) DEFAULT 'ACTIVE', -- ACTIVE, PARTIAL, COMPLETED, CANCELLED
    reservation_type VARCHAR(20) DEFAULT 'PRODUCTION',
    
    -- Metadata
    created_by INTEGER REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_material_reservations_po ON material_reservations(production_order_id);
CREATE INDEX IF NOT EXISTS idx_material_reservations_material ON material_reservations(material_code, plant_id);
CREATE INDEX IF NOT EXISTS idx_material_reservations_status ON material_reservations(status) WHERE status = 'ACTIVE';
CREATE INDEX IF NOT EXISTS idx_material_reservations_requirement_date ON material_reservations(requirement_date);

COMMENT ON TABLE material_reservations IS 'Material reservations for production orders';
COMMENT ON COLUMN material_reservations.remaining_quantity IS 'Calculated field: reserved_quantity - withdrawn_quantity';

