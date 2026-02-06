-- Add material_master_id column to products table for integration
-- This allows products to be linked to material master data

-- Add the column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'products' 
        AND column_name = 'material_master_id'
    ) THEN
        ALTER TABLE products ADD COLUMN material_master_id INTEGER;
        
        -- Add foreign key constraint to materials table
        ALTER TABLE products 
        ADD CONSTRAINT fk_products_material_master 
        FOREIGN KEY (material_master_id) REFERENCES materials(id);
        
        -- Add index for better performance
        CREATE INDEX idx_products_material_master_id ON products(material_master_id);
        
        -- Add comment for documentation
        COMMENT ON COLUMN products.material_master_id IS 'Reference to material master data for enhanced product information';
    END IF;
END $$;

-- Update existing products to have NULL material_master_id (optional)
-- This allows existing products to continue working without material master integration
UPDATE products SET material_master_id = NULL WHERE material_master_id IS NULL;
