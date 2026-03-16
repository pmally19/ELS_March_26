-- Create ATP (Available-to-Promise) check related tables
-- ATP checks material availability considering reservations and planned receipts

-- ATP check results cache (optional, for performance)
CREATE TABLE IF NOT EXISTS atp_check_results (
    id SERIAL PRIMARY KEY,
    material_code VARCHAR(50) NOT NULL,
    plant_id INTEGER REFERENCES plants(id),
    storage_location VARCHAR(20),
    check_date TIMESTAMP NOT NULL,
    
    -- Availability data
    current_stock NUMERIC DEFAULT 0,
    reserved_quantity NUMERIC DEFAULT 0,
    available_quantity NUMERIC DEFAULT 0,
    planned_receipts NUMERIC DEFAULT 0,
    planned_issues NUMERIC DEFAULT 0,
    
    -- Requirements
    required_quantity NUMERIC NOT NULL,
    requirement_date DATE NOT NULL,
    
    -- Result
    is_available BOOLEAN DEFAULT false,
    available_date DATE,
    shortage_quantity NUMERIC DEFAULT 0,
    
    -- Metadata
    checked_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(material_code, plant_id, storage_location, requirement_date, check_date)
);

CREATE INDEX IF NOT EXISTS idx_atp_check_material_plant ON atp_check_results(material_code, plant_id);
CREATE INDEX IF NOT EXISTS idx_atp_check_date ON atp_check_results(check_date);
CREATE INDEX IF NOT EXISTS idx_atp_check_requirement_date ON atp_check_results(requirement_date);

COMMENT ON TABLE atp_check_results IS 'Cached ATP check results for performance optimization';

-- ATP requirement tracking
CREATE TABLE IF NOT EXISTS atp_requirements (
    id SERIAL PRIMARY KEY,
    material_code VARCHAR(50) NOT NULL,
    material_id INTEGER REFERENCES materials(id),
    plant_id INTEGER REFERENCES plants(id),
    storage_location VARCHAR(20),
    
    -- Requirement details
    requirement_type VARCHAR(20) NOT NULL, -- PRODUCTION_ORDER, SALES_ORDER, TRANSFER, etc.
    requirement_reference_id INTEGER, -- ID of the source document
    requirement_reference_number VARCHAR(50), -- Document number
    
    -- Quantities and dates
    required_quantity NUMERIC NOT NULL,
    requirement_date DATE NOT NULL,
    priority INTEGER DEFAULT 0,
    
    -- Status
    status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, RESERVED, FULFILLED, CANCELLED
    reserved_quantity NUMERIC DEFAULT 0,
    
    -- Metadata
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_atp_requirements_material_plant ON atp_requirements(material_code, plant_id);
CREATE INDEX IF NOT EXISTS idx_atp_requirements_date ON atp_requirements(requirement_date);
CREATE INDEX IF NOT EXISTS idx_atp_requirements_status ON atp_requirements(status);
CREATE INDEX IF NOT EXISTS idx_atp_requirements_reference ON atp_requirements(requirement_type, requirement_reference_id);

COMMENT ON TABLE atp_requirements IS 'Tracks material requirements for ATP calculations';
COMMENT ON COLUMN atp_requirements.requirement_type IS 'Type of requirement: PRODUCTION_ORDER, SALES_ORDER, TRANSFER, etc.';

