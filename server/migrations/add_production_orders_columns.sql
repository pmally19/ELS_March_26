-- Migration: Add missing columns to production_orders table
-- This fixes the "column plant_id does not exist" error

-- Add plant_id column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'production_orders' AND column_name = 'plant_id') THEN
        ALTER TABLE production_orders ADD COLUMN plant_id INTEGER;
        ALTER TABLE production_orders ADD CONSTRAINT fk_production_orders_plant 
            FOREIGN KEY (plant_id) REFERENCES plants(id);
    END IF;
END $$;

-- Add other potentially missing columns for demand-driven production
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'production_orders' AND column_name = 'sales_order_id') THEN
        ALTER TABLE production_orders ADD COLUMN sales_order_id INTEGER;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'production_orders' AND column_name = 'sales_order_number') THEN
        ALTER TABLE production_orders ADD COLUMN sales_order_number VARCHAR(50);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'production_orders' AND column_name = 'planned_order_id') THEN
        ALTER TABLE production_orders ADD COLUMN planned_order_id INTEGER;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'production_orders' AND column_name = 'demand_source') THEN
        ALTER TABLE production_orders ADD COLUMN demand_source VARCHAR(50);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'production_orders' AND column_name = 'customer_name') THEN
        ALTER TABLE production_orders ADD COLUMN customer_name VARCHAR(255);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'production_orders' AND column_name = 'delivery_priority') THEN
        ALTER TABLE production_orders ADD COLUMN delivery_priority VARCHAR(20) DEFAULT 'NORMAL';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'production_orders' AND column_name = 'special_instructions') THEN
        ALTER TABLE production_orders ADD COLUMN special_instructions TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'production_orders' AND column_name = 'source_document_number') THEN
        ALTER TABLE production_orders ADD COLUMN source_document_number VARCHAR(50);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'production_orders' AND column_name = 'source_document_type') THEN
        ALTER TABLE production_orders ADD COLUMN source_document_type VARCHAR(50);
    END IF;
END $$;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_production_orders_plant_id ON production_orders(plant_id);
CREATE INDEX IF NOT EXISTS idx_production_orders_sales_order_id ON production_orders(sales_order_id);
CREATE INDEX IF NOT EXISTS idx_production_orders_demand_source ON production_orders(demand_source);

COMMENT ON COLUMN production_orders.plant_id IS 'Production plant where the order will be executed';
COMMENT ON COLUMN production_orders.demand_source IS 'Source of demand: SALES_ORDER, PLANNED_ORDER, FORECAST, STOCK_REPLENISHMENT, MANUAL';
