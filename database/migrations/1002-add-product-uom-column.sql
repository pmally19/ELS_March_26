-- ==================================================================================
-- ADD UNIT OF MEASURE TO PRODUCTS TABLE
-- ==================================================================================
-- Purpose: Add unit_of_measure_id column to track product UOM
-- ==================================================================================

BEGIN;

-- Add unit_of_measure_id column
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS unit_of_measure_id INTEGER 
REFERENCES units_of_measure(id);

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_products_uom 
ON products(unit_of_measure_id);

-- Add comment
COMMENT ON COLUMN products.unit_of_measure_id IS 
'Foreign key to units_of_measure table - defines the base unit for this product';

COMMIT;

-- Verification
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'products' 
  AND column_name = 'unit_of_measure_id';
