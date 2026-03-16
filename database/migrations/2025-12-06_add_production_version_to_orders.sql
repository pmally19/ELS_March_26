-- Add production_version_id column to production_orders table
ALTER TABLE production_orders 
ADD COLUMN IF NOT EXISTS production_version_id INTEGER REFERENCES production_versions(id);

CREATE INDEX IF NOT EXISTS idx_production_orders_production_version ON production_orders(production_version_id);

COMMENT ON COLUMN production_orders.production_version_id IS 'Reference to production version that defines BOM and Routing for this order';

