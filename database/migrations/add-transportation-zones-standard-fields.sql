-- Add Standard Fields to Transportation Zones
-- This migration adds all standard fields per ERP standards without SAP terminology

-- Postal Code Range - From
ALTER TABLE transportation_zones 
  ADD COLUMN IF NOT EXISTS postal_code_from VARCHAR(20);

-- Postal Code Range - To
ALTER TABLE transportation_zones 
  ADD COLUMN IF NOT EXISTS postal_code_to VARCHAR(20);

-- Company Code - Reference to company codes
ALTER TABLE transportation_zones 
  ADD COLUMN IF NOT EXISTS company_code_id INTEGER;

-- Add foreign key constraint for company code
DO $$ 
BEGIN
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
END $$;

-- Base Freight Rate - Base shipping cost
ALTER TABLE transportation_zones 
  ADD COLUMN IF NOT EXISTS base_freight_rate DECIMAL(10,2);

-- Currency - Currency for freight rates
ALTER TABLE transportation_zones 
  ADD COLUMN IF NOT EXISTS currency VARCHAR(3);

-- Transportation Type - Type of transportation
ALTER TABLE transportation_zones 
  ADD COLUMN IF NOT EXISTS transportation_type VARCHAR(20);

-- Distance - Distance in kilometers
ALTER TABLE transportation_zones 
  ADD COLUMN IF NOT EXISTS distance_km DECIMAL(10,2);

-- Shipping Point - Reference to shipping points
ALTER TABLE transportation_zones 
  ADD COLUMN IF NOT EXISTS shipping_point_id INTEGER;

-- Add foreign key constraint for shipping point (if shipping_points table exists)
DO $$ 
BEGIN
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

-- Block Indicator - Blocks the zone from being used
ALTER TABLE transportation_zones 
  ADD COLUMN IF NOT EXISTS block_indicator BOOLEAN DEFAULT false;

-- System Fields
ALTER TABLE transportation_zones 
  ADD COLUMN IF NOT EXISTS created_by INTEGER;

ALTER TABLE transportation_zones 
  ADD COLUMN IF NOT EXISTS updated_by INTEGER;

-- Create indexes for new fields
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transportation_zones' AND column_name = 'company_code_id') THEN
    CREATE INDEX IF NOT EXISTS idx_transportation_zones_company_code_id ON transportation_zones(company_code_id);
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transportation_zones' AND column_name = 'postal_code_from') THEN
    CREATE INDEX IF NOT EXISTS idx_transportation_zones_postal_code_from ON transportation_zones(postal_code_from);
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transportation_zones' AND column_name = 'postal_code_to') THEN
    CREATE INDEX IF NOT EXISTS idx_transportation_zones_postal_code_to ON transportation_zones(postal_code_to);
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'transportation_zones' AND column_name = 'shipping_point_id') THEN
    CREATE INDEX IF NOT EXISTS idx_transportation_zones_shipping_point_id ON transportation_zones(shipping_point_id);
  END IF;
END $$;

-- Add comments for documentation
COMMENT ON COLUMN transportation_zones.postal_code_from IS 'Starting postal code for the transportation zone';
COMMENT ON COLUMN transportation_zones.postal_code_to IS 'Ending postal code for the transportation zone';
COMMENT ON COLUMN transportation_zones.company_code_id IS 'Reference to company code for multi-company support';
COMMENT ON COLUMN transportation_zones.base_freight_rate IS 'Base shipping cost for this zone';
COMMENT ON COLUMN transportation_zones.currency IS 'Currency code for freight rates (e.g., USD, EUR)';
COMMENT ON COLUMN transportation_zones.transportation_type IS 'Type of transportation (e.g., standard, express, overnight)';
COMMENT ON COLUMN transportation_zones.distance_km IS 'Distance in kilometers for this zone';
COMMENT ON COLUMN transportation_zones.shipping_point_id IS 'Reference to shipping point';
COMMENT ON COLUMN transportation_zones.block_indicator IS 'Blocks the zone from being used if set';
COMMENT ON COLUMN transportation_zones.created_by IS 'User ID who created the zone';
COMMENT ON COLUMN transportation_zones.updated_by IS 'User ID who last updated the zone';

