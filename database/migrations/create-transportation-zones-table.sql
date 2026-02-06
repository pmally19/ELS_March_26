-- Create Transportation Zones Table with All Standard Fields
-- This migration creates the transportation_zones table per ERP standards without SAP terminology

CREATE TABLE IF NOT EXISTS transportation_zones (
  id SERIAL PRIMARY KEY,
  code VARCHAR(10) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  region VARCHAR(50),
  country VARCHAR(3),
  zone_type VARCHAR(20),
  transit_time INTEGER,
  shipping_multiplier DECIMAL(5,2) DEFAULT 1.00,
  -- Standard fields
  postal_code_from VARCHAR(20),
  postal_code_to VARCHAR(20),
  company_code_id INTEGER,
  base_freight_rate DECIMAL(10,2),
  currency VARCHAR(3),
  transportation_type VARCHAR(20),
  distance_km DECIMAL(10,2),
  shipping_point_id INTEGER,
  block_indicator BOOLEAN DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by INTEGER,
  updated_by INTEGER
);

-- Add foreign key constraints
DO $$ 
BEGIN
  -- Company code foreign key
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'company_codes') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE conname = 'fk_transportation_zones_company_code'
    ) THEN
      ALTER TABLE transportation_zones
      ADD CONSTRAINT fk_transportation_zones_company_code 
      FOREIGN KEY (company_code_id) 
      REFERENCES company_codes(id)
      ON DELETE SET NULL;
    END IF;
  END IF;
  
  -- Shipping point foreign key (if table exists)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'shipping_points') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE conname = 'fk_transportation_zones_shipping_point'
    ) THEN
      ALTER TABLE transportation_zones
      ADD CONSTRAINT fk_transportation_zones_shipping_point 
      FOREIGN KEY (shipping_point_id) 
      REFERENCES shipping_points(id)
      ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_transportation_zones_code ON transportation_zones(code);
CREATE INDEX IF NOT EXISTS idx_transportation_zones_country ON transportation_zones(country);
CREATE INDEX IF NOT EXISTS idx_transportation_zones_region ON transportation_zones(region);
CREATE INDEX IF NOT EXISTS idx_transportation_zones_company_code_id ON transportation_zones(company_code_id);
CREATE INDEX IF NOT EXISTS idx_transportation_zones_postal_code_from ON transportation_zones(postal_code_from);
CREATE INDEX IF NOT EXISTS idx_transportation_zones_postal_code_to ON transportation_zones(postal_code_to);
CREATE INDEX IF NOT EXISTS idx_transportation_zones_shipping_point_id ON transportation_zones(shipping_point_id);
CREATE INDEX IF NOT EXISTS idx_transportation_zones_is_active ON transportation_zones(is_active);

-- Add comments for documentation
COMMENT ON TABLE transportation_zones IS 'Transportation zones for geographic shipping areas without SAP terminology';
COMMENT ON COLUMN transportation_zones.code IS 'Unique code for the transportation zone';
COMMENT ON COLUMN transportation_zones.name IS 'Display name of the transportation zone';
COMMENT ON COLUMN transportation_zones.description IS 'Detailed description of the zone';
COMMENT ON COLUMN transportation_zones.region IS 'Geographic region';
COMMENT ON COLUMN transportation_zones.country IS 'Country code (ISO 3-letter)';
COMMENT ON COLUMN transportation_zones.zone_type IS 'Type of zone (e.g., domestic, international)';
COMMENT ON COLUMN transportation_zones.transit_time IS 'Transit time in days';
COMMENT ON COLUMN transportation_zones.shipping_multiplier IS 'Multiplier for shipping cost calculations';
COMMENT ON COLUMN transportation_zones.postal_code_from IS 'Starting postal code for the zone';
COMMENT ON COLUMN transportation_zones.postal_code_to IS 'Ending postal code for the zone';
COMMENT ON COLUMN transportation_zones.company_code_id IS 'Reference to company code for multi-company support';
COMMENT ON COLUMN transportation_zones.base_freight_rate IS 'Base shipping cost for this zone';
COMMENT ON COLUMN transportation_zones.currency IS 'Currency code for freight rates';
COMMENT ON COLUMN transportation_zones.transportation_type IS 'Type of transportation service';
COMMENT ON COLUMN transportation_zones.distance_km IS 'Distance in kilometers';
COMMENT ON COLUMN transportation_zones.shipping_point_id IS 'Reference to shipping point';
COMMENT ON COLUMN transportation_zones.block_indicator IS 'Blocks the zone from being used if set';

