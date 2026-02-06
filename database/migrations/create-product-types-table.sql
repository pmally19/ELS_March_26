-- Migration: Create product_types table
-- Date: 2024-10-12
-- Description: Create a table for managing product types dynamically

-- Create product_types table
CREATE TABLE IF NOT EXISTS product_types (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add comments for documentation
COMMENT ON TABLE product_types IS 'Master table for product type classifications.';
COMMENT ON COLUMN product_types.code IS 'Unique code for the product type (e.g., FINISHED_PRODUCT).';
COMMENT ON COLUMN product_types.name IS 'Display name for the product type (e.g., Finished Product).';
COMMENT ON COLUMN product_types.description IS 'Detailed description of the product type.';
COMMENT ON COLUMN product_types.is_active IS 'Indicates if the product type is active and available for use.';
COMMENT ON COLUMN product_types.sort_order IS 'Order for displaying product types in dropdowns.';

-- Insert default product types
INSERT INTO product_types (code, name, description, sort_order) VALUES
('FINISHED_PRODUCT', 'Finished Product', 'Products that are ready for sale and delivery to customers', 1),
('SEMI_FINISHED_PRODUCT', 'Semi-Finished Product', 'Products that are partially completed and require further processing', 2),
('RAW_MATERIAL', 'Raw Material', 'Basic materials used in manufacturing processes', 3),
('COMPONENT', 'Component', 'Parts and components used in assembly or manufacturing', 4),
('CONSUMABLE', 'Consumable', 'Items that are consumed during operations or manufacturing', 5)
ON CONFLICT (code) DO NOTHING;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_product_types_code ON product_types(code);
CREATE INDEX IF NOT EXISTS idx_product_types_active ON product_types(is_active);
CREATE INDEX IF NOT EXISTS idx_product_types_sort_order ON product_types(sort_order);

-- Update products table to reference product_types
ALTER TABLE products 
ADD CONSTRAINT fk_products_product_type 
FOREIGN KEY (type) REFERENCES product_types(code);

-- Add comment to products.type column
COMMENT ON COLUMN products.type IS 'Product type code referencing product_types table.';
