-- Migration: Add storage_location_id to products table
-- Date: 2024-10-12
-- Description: Add primary storage location field to products table for easier management

-- Add storage_location_id column
ALTER TABLE products 
ADD COLUMN storage_location_id INTEGER;

-- Add foreign key constraint to storage_locations table
ALTER TABLE products 
ADD CONSTRAINT fk_products_storage_location 
FOREIGN KEY (storage_location_id) REFERENCES storage_locations(id);

-- Add comment for documentation
COMMENT ON COLUMN products.storage_location_id IS 'Primary storage location for this product. References storage_locations table.';

-- Create index for better query performance
CREATE INDEX idx_products_storage_location ON products(storage_location_id);

-- Update existing products with storage locations from product_warehouses table
-- Set the storage location with the highest stock quantity as the primary location
UPDATE products 
SET storage_location_id = (
  SELECT pw.storage_location_id 
  FROM product_warehouses pw 
  WHERE pw.product_id = products.id 
    AND pw.is_active = true
  ORDER BY pw.stock_quantity DESC 
  LIMIT 1
)
WHERE storage_location_id IS NULL 
  AND EXISTS (
    SELECT 1 FROM product_warehouses pw 
    WHERE pw.product_id = products.id 
      AND pw.is_active = true
  );
