-- Migration: Add material type configuration fields to product_types table
-- Date: 2025-12-03
-- Description: Add fields for inventory management, valuation, and number range assignment

-- Add new columns to product_types table
ALTER TABLE product_types
ADD COLUMN IF NOT EXISTS number_range_code VARCHAR(50),
ADD COLUMN IF NOT EXISTS valuation_class_id INTEGER,
ADD COLUMN IF NOT EXISTS inventory_management_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS quantity_update_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS value_update_enabled BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS price_control VARCHAR(20) DEFAULT 'STANDARD',
ADD COLUMN IF NOT EXISTS material_category VARCHAR(50),
ADD COLUMN IF NOT EXISTS allow_batch_management BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS allow_serial_number BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS allow_negative_stock BOOLEAN DEFAULT FALSE;

-- Add foreign key constraint for valuation_class_id if valuation_classes table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'valuation_classes') THEN
        -- Add foreign key constraint
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'fk_product_types_valuation_class'
        ) THEN
            ALTER TABLE product_types
            ADD CONSTRAINT fk_product_types_valuation_class
            FOREIGN KEY (valuation_class_id) 
            REFERENCES valuation_classes(id) 
            ON DELETE SET NULL;
        END IF;
    END IF;
END $$;

-- Add comments for documentation
COMMENT ON COLUMN product_types.number_range_code IS 'Number range code for material number assignment';
COMMENT ON COLUMN product_types.valuation_class_id IS 'Reference to valuation class for accounting valuation';
COMMENT ON COLUMN product_types.inventory_management_enabled IS 'Whether inventory tracking is enabled for this material type';
COMMENT ON COLUMN product_types.quantity_update_enabled IS 'Whether quantity updates are allowed for this material type';
COMMENT ON COLUMN product_types.value_update_enabled IS 'Whether value updates are allowed for this material type';
COMMENT ON COLUMN product_types.price_control IS 'Price control method: STANDARD or MOVING_AVERAGE';
COMMENT ON COLUMN product_types.material_category IS 'Material category classification';
COMMENT ON COLUMN product_types.allow_batch_management IS 'Whether batch management is allowed for this material type';
COMMENT ON COLUMN product_types.allow_serial_number IS 'Whether serial number tracking is allowed for this material type';
COMMENT ON COLUMN product_types.allow_negative_stock IS 'Whether negative stock is allowed for this material type';

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_product_types_valuation_class_id ON product_types(valuation_class_id);
CREATE INDEX IF NOT EXISTS idx_product_types_number_range_code ON product_types(number_range_code);
CREATE INDEX IF NOT EXISTS idx_product_types_inventory_management ON product_types(inventory_management_enabled);

