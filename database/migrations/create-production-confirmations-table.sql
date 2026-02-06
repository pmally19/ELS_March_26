-- ================================================================
-- MIGRATION: Create Production Confirmations Table
-- Purpose: Track production order confirmations and operation completions
-- ================================================================

CREATE TABLE IF NOT EXISTS production_confirmations (
  id SERIAL PRIMARY KEY,
  
  -- Link to production order
  production_order_id INTEGER NOT NULL,
  
  -- Link to specific operation (optional)
  operation_id INTEGER,
  
  -- Confirmation details
  confirmation_number VARCHAR(50) UNIQUE NOT NULL,
  confirmation_date TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Quantities
  confirmed_quantity DECIMAL(15, 3) NOT NULL,
  scrap_quantity DECIMAL(15, 3) DEFAULT 0,
  unit_of_measure VARCHAR(10),
  
  -- Work center and user
  work_center_id INTEGER,
  confirmed_by INTEGER,
  
  -- Status and notes
  status VARCHAR(20) DEFAULT 'CONFIRMED',
  notes TEXT,
  
  -- Audit fields
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add foreign key to production_orders
ALTER TABLE production_confirmations
  DROP CONSTRAINT IF EXISTS fk_prod_confirmations_production_order,
  ADD CONSTRAINT fk_prod_confirmations_production_order 
    FOREIGN KEY (production_order_id) 
    REFERENCES production_orders(id) 
    ON DELETE CASCADE;

-- Add foreign key to users (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
    ALTER TABLE production_confirmations
      DROP CONSTRAINT IF EXISTS fk_prod_confirmations_user,
      ADD CONSTRAINT fk_prod_confirmations_user 
        FOREIGN KEY (confirmed_by) 
        REFERENCES users(id) 
        ON DELETE SET NULL;
  END IF;
END $$;

-- Add check constraint for status
ALTER TABLE production_confirmations
  DROP CONSTRAINT IF EXISTS chk_prod_confirmations_status,
  ADD CONSTRAINT chk_prod_confirmations_status
  CHECK (status IN ('CONFIRMED', 'REVERSED', 'CANCELLED'));

-- Add check constraint for quantities
ALTER TABLE production_confirmations
  ADD CONSTRAINT chk_prod_confirmations_quantities
  CHECK (confirmed_quantity > 0);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_prod_confirmations_order 
  ON production_confirmations(production_order_id);

CREATE INDEX IF NOT EXISTS idx_prod_confirmations_date 
  ON production_confirmations(confirmation_date);

CREATE INDEX IF NOT EXISTS idx_prod_confirmations_status 
  ON production_confirmations(status);

CREATE INDEX IF NOT EXISTS idx_prod_confirmations_number 
  ON production_confirmations(confirmation_number);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_production_confirmations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_production_confirmations_updated_at ON production_confirmations;
CREATE TRIGGER trg_production_confirmations_updated_at
  BEFORE UPDATE ON production_confirmations
  FOR EACH ROW
  EXECUTE FUNCTION update_production_confirmations_updated_at();

-- Add comments for documentation
COMMENT ON TABLE production_confirmations IS 'Tracks production order confirmations and operation completions (SAP CO11N)';
COMMENT ON COLUMN production_confirmations.confirmation_number IS 'Unique confirmation number (auto-generated)';
COMMENT ON COLUMN production_confirmations.confirmed_quantity IS 'Quantity confirmed/completed';
COMMENT ON COLUMN production_confirmations.scrap_quantity IS 'Scrap/waste quantity';
COMMENT ON COLUMN production_confirmations.status IS 'Confirmation status: CONFIRMED, REVERSED, CANCELLED';

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Production confirmations table created successfully';
END $$;
