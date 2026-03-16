-- Migration: Add plant and storage location fields to sales_order_items table
-- Date: 2024-10-12
-- Description: Add plant and storage location fields to sales order items for better inventory tracking

-- Add plant fields to sales_order_items table
ALTER TABLE sales_order_items 
ADD COLUMN plant_id INTEGER,
ADD COLUMN plant_code VARCHAR(10);

-- Add storage location fields to sales_order_items table
ALTER TABLE sales_order_items 
ADD COLUMN storage_location_id INTEGER,
ADD COLUMN storage_location_code VARCHAR(10);

-- Add foreign key constraints
ALTER TABLE sales_order_items 
ADD CONSTRAINT fk_sales_order_items_plant 
    FOREIGN KEY (plant_id) REFERENCES plants(id);

ALTER TABLE sales_order_items 
ADD CONSTRAINT fk_sales_order_items_storage_location 
    FOREIGN KEY (storage_location_id) REFERENCES storage_locations(id);

-- Add comments for documentation
COMMENT ON COLUMN sales_order_items.plant_id IS 'Plant ID from master data where the product is stored';
COMMENT ON COLUMN sales_order_items.plant_code IS 'Plant code for easy reference';
COMMENT ON COLUMN sales_order_items.storage_location_id IS 'Storage location ID where the product is stored';
COMMENT ON COLUMN sales_order_items.storage_location_code IS 'Storage location code for easy reference';

-- Create indexes for better query performance
CREATE INDEX idx_sales_order_items_plant_id ON sales_order_items(plant_id);
CREATE INDEX idx_sales_order_items_storage_location_id ON sales_order_items(storage_location_id);
CREATE INDEX idx_sales_order_items_plant_code ON sales_order_items(plant_code);
CREATE INDEX idx_sales_order_items_storage_location_code ON sales_order_items(storage_location_code);
