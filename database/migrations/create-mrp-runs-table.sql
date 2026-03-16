-- ================================================================
-- MIGRATION: Create MRP Runs Table
-- Purpose: Track MRP (Material Requirements Planning) execution runs
-- ================================================================

CREATE TABLE IF NOT EXISTS mrp_runs (
  id SERIAL PRIMARY KEY,
  
  -- Run identification
  run_number VARCHAR(50) UNIQUE NOT NULL,
  run_date TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Run parameters
  run_type VARCHAR(20) DEFAULT 'AUTOMATIC',  -- AUTOMATIC, MANUAL, SCHEDULED
  plant_id INTEGER,
  material_id INTEGER,
  
  -- Run results
  sales_orders_analyzed INTEGER DEFAULT 0,
  planned_orders_created INTEGER DEFAULT 0,
  purchase_requisitions_created INTEGER DEFAULT 0,
  
  -- Execution details
  status VARCHAR(20) DEFAULT 'COMPLETED',
  execution_time_ms INTEGER,
  error_message TEXT,
  
  -- Audit
  run_by INTEGER,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add foreign keys (if tables exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'plants') THEN
    ALTER TABLE mrp_runs
      DROP CONSTRAINT IF EXISTS fk_mrp_runs_plant,
      ADD CONSTRAINT fk_mrp_runs_plant 
        FOREIGN KEY (plant_id) 
        REFERENCES plants(id) 
        ON DELETE SET NULL;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'products') THEN
    ALTER TABLE mrp_runs
      DROP CONSTRAINT IF EXISTS fk_mrp_runs_material,
      ADD CONSTRAINT fk_mrp_runs_material 
        FOREIGN KEY (material_id) 
        REFERENCES products(id) 
        ON DELETE SET NULL;
  END IF;
END $$;

-- Add check constraints
ALTER TABLE mrp_runs
  DROP CONSTRAINT IF EXISTS chk_mrp_runs_type,
  ADD CONSTRAINT chk_mrp_runs_type
  CHECK (run_type IN ('AUTOMATIC', 'MANUAL', 'SCHEDULED'));

ALTER TABLE mrp_runs
  DROP CONSTRAINT IF EXISTS chk_mrp_runs_status,
  ADD CONSTRAINT chk_mrp_runs_status
  CHECK (status IN ('RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED'));

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_mrp_runs_date 
  ON mrp_runs(run_date DESC);

CREATE INDEX IF NOT EXISTS idx_mrp_runs_status 
  ON mrp_runs(status);

CREATE INDEX IF NOT EXISTS idx_mrp_runs_number 
  ON mrp_runs(run_number);

CREATE INDEX IF NOT EXISTS idx_mrp_runs_plant 
  ON mrp_runs(plant_id) WHERE plant_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_mrp_runs_material 
  ON mrp_runs(material_id) WHERE material_id IS NOT NULL;

-- Add comments
COMMENT ON TABLE mrp_runs IS 'Tracks MRP (Material Requirements Planning) execution runs (SAP MD01/MD02)';
COMMENT ON COLUMN mrp_runs.run_number IS 'Unique MRP run identifier';
COMMENT ON COLUMN mrp_runs.run_type IS 'Type of MRP run: AUTOMATIC, MANUAL, SCHEDULED';
COMMENT ON COLUMN mrp_runs.sales_orders_analyzed IS 'Number of sales orders analyzed in this run';
COMMENT ON COLUMN mrp_runs.planned_orders_created IS 'Number of planned orders created';
COMMENT ON COLUMN mrp_runs.status IS 'Run status: RUNNING, COMPLETED, FAILED, CANCELLED';

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'MRP runs table created successfully';
END $$;
