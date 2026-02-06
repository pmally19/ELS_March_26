-- Migration: Add plant fields to products table
-- Date: 2024-10-12
-- Description: Add plant fields to products table for better plant integration

-- Add plant fields to products table
ALTER TABLE products 
ADD COLUMN plant_id INTEGER,
ADD COLUMN plant_code VARCHAR(10);

-- Add foreign key constraint to plants table
ALTER TABLE products 
ADD CONSTRAINT fk_products_plant 
    FOREIGN KEY (plant_id) REFERENCES plants(id);

-- Add comments for documentation
COMMENT ON COLUMN products.plant_id IS 'Plant ID from master data where the product is manufactured or stored';
COMMENT ON COLUMN products.plant_code IS 'Plant code for easy reference';

-- Create indexes for better query performance
CREATE INDEX idx_products_plant_id ON products(plant_id);
CREATE INDEX idx_products_plant_code ON products(plant_code);
