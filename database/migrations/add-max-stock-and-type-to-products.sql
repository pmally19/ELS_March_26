-- Migration: Add max_stock and type columns to products table
-- Date: 2024-10-12
-- Description: Add max_stock and type fields to products table for better inventory management

-- Add max_stock column
ALTER TABLE products 
ADD COLUMN max_stock INTEGER DEFAULT 1000;

-- Add type column with enum-like constraint
ALTER TABLE products 
ADD COLUMN type VARCHAR(50) DEFAULT 'FINISHED_PRODUCT';

-- Make columns NOT NULL after adding them
ALTER TABLE products 
ALTER COLUMN max_stock SET NOT NULL;

ALTER TABLE products 
ALTER COLUMN type SET NOT NULL;

-- Add check constraint for type values
ALTER TABLE products 
ADD CONSTRAINT products_type_check 
CHECK (type IN ('FINISHED_PRODUCT', 'SEMI_FINISHED_PRODUCT', 'RAW_MATERIAL', 'COMPONENT', 'CONSUMABLE'));

-- Add comments for documentation
COMMENT ON COLUMN products.max_stock IS 'Maximum stock level for this product. Used for inventory management and reorder calculations.';
COMMENT ON COLUMN products.type IS 'Product type classification: FINISHED_PRODUCT, SEMI_FINISHED_PRODUCT, RAW_MATERIAL, COMPONENT, CONSUMABLE';

-- Update existing products to have appropriate types based on their current data
-- Products with material_master_id linked to FERT materials should be FINISHED_PRODUCT
UPDATE products 
SET type = 'FINISHED_PRODUCT'
WHERE material_master_id IS NOT NULL 
  AND material_master_id IN (
    SELECT id FROM materials WHERE type IN ('FERT', 'FINISHED_GOOD', 'FER')
  );

-- Products with material_master_id linked to SEMI_FINISHED materials should be SEMI_FINISHED_PRODUCT
UPDATE products 
SET type = 'SEMI_FINISHED_PRODUCT'
WHERE material_master_id IS NOT NULL 
  AND material_master_id IN (
    SELECT id FROM materials WHERE type = 'SEMI_FINISHED'
  );

-- Products with material_master_id linked to COMPONENT materials should be COMPONENT
UPDATE products 
SET type = 'COMPONENT'
WHERE material_master_id IS NOT NULL 
  AND material_master_id IN (
    SELECT id FROM materials WHERE type = 'COMPONENT'
  );

-- Products with material_master_id linked to RAW_MATERIAL materials should be RAW_MATERIAL
UPDATE products 
SET type = 'RAW_MATERIAL'
WHERE material_master_id IS NOT NULL 
  AND material_master_id IN (
    SELECT id FROM materials WHERE type = 'RAW_MATERIAL'
  );

-- Products without material_master_id (standalone products) remain as FINISHED_PRODUCT (default)

-- Set reasonable max_stock values based on current stock levels
UPDATE products 
SET max_stock = GREATEST(stock * 2, 100)
WHERE max_stock = 1000; -- Only update default values

-- Create index on type for better query performance
CREATE INDEX idx_products_type ON products(type);

-- Create index on max_stock for inventory management queries
CREATE INDEX idx_products_max_stock ON products(max_stock);
