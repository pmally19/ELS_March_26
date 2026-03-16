-- Create product_warehouses table for SKU-warehouse integration
-- This table manages the relationship between products and warehouses/storage locations

CREATE TABLE IF NOT EXISTS product_warehouses (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL,
    storage_location_id INTEGER NOT NULL,
    stock_quantity INTEGER DEFAULT 0 NOT NULL,
    min_stock INTEGER DEFAULT 0,
    max_stock INTEGER DEFAULT 0,
    reorder_point INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
    
    -- Foreign key constraints
    CONSTRAINT fk_product_warehouses_product 
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT fk_product_warehouses_storage_location 
        FOREIGN KEY (storage_location_id) REFERENCES storage_locations(id) ON DELETE CASCADE,
    
    -- Unique constraint to prevent duplicate product-warehouse combinations
    CONSTRAINT uk_product_warehouses_unique 
        UNIQUE (product_id, storage_location_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_product_warehouses_product_id ON product_warehouses(product_id);
CREATE INDEX IF NOT EXISTS idx_product_warehouses_storage_location_id ON product_warehouses(storage_location_id);
CREATE INDEX IF NOT EXISTS idx_product_warehouses_active ON product_warehouses(is_active);

-- Add comments for documentation
COMMENT ON TABLE product_warehouses IS 'Manages the relationship between products and warehouses/storage locations with stock quantities';
COMMENT ON COLUMN product_warehouses.product_id IS 'Reference to the product';
COMMENT ON COLUMN product_warehouses.storage_location_id IS 'Reference to the warehouse/storage location';
COMMENT ON COLUMN product_warehouses.stock_quantity IS 'Current stock quantity for this product in this warehouse';
COMMENT ON COLUMN product_warehouses.min_stock IS 'Minimum stock level for this product in this warehouse';
COMMENT ON COLUMN product_warehouses.max_stock IS 'Maximum stock level for this product in this warehouse';
COMMENT ON COLUMN product_warehouses.reorder_point IS 'Reorder point for this product in this warehouse';

-- Create a trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_product_warehouses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_product_warehouses_updated_at
    BEFORE UPDATE ON product_warehouses
    FOR EACH ROW
    EXECUTE FUNCTION update_product_warehouses_updated_at();
