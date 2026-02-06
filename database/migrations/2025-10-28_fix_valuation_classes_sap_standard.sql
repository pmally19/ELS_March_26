-- Migration: Fix valuation_classes table to match SAP standards
-- Date: 2025-10-28
-- Description: 
--   - Simplify to only: class_code (4 chars), description, is_active
--   - Remove unwanted fields: class_name, valuation_method, price_control, moving_price, standard_price, active
--   - Create junction table for allowed material types relationship
--   - Add unique constraint on junction table

BEGIN;

-- Step 1: Backup existing data
CREATE TABLE IF NOT EXISTS valuation_classes_backup AS 
SELECT * FROM valuation_classes;

-- Step 2: Validate existing data before migration
-- Ensure all class_code values are 4 characters or less
DO $$
DECLARE
    invalid_codes INTEGER;
BEGIN
    SELECT COUNT(*) INTO invalid_codes
    FROM valuation_classes
    WHERE LENGTH(class_code) > 4;
    
    IF invalid_codes > 0 THEN
        RAISE EXCEPTION 'Cannot migrate: % rows have class_code longer than 4 characters. Please fix data first.', invalid_codes;
    END IF;
END $$;

-- Step 3: Remove unwanted columns
ALTER TABLE valuation_classes 
    DROP COLUMN IF EXISTS class_name,
    DROP COLUMN IF EXISTS valuation_method,
    DROP COLUMN IF EXISTS price_control,
    DROP COLUMN IF EXISTS moving_price,
    DROP COLUMN IF EXISTS standard_price;

-- Step 4: Rename 'active' to 'is_active' if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'valuation_classes' 
        AND column_name = 'active'
    ) THEN
        ALTER TABLE valuation_classes RENAME COLUMN active TO is_active;
    END IF;
END $$;

-- Step 5: Alter class_code to varchar(4) if needed
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'valuation_classes' 
        AND column_name = 'class_code'
        AND character_maximum_length > 4
    ) THEN
        ALTER TABLE valuation_classes 
            ALTER COLUMN class_code TYPE varchar(4) USING LEFT(class_code, 4);
    END IF;
END $$;

-- Step 6: Make created_at and updated_at NOT NULL
ALTER TABLE valuation_classes 
    ALTER COLUMN created_at SET NOT NULL,
    ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP,
    ALTER COLUMN updated_at SET NOT NULL,
    ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP;

-- Step 7: Create junction table for valuation class - material type relationship
CREATE TABLE IF NOT EXISTS valuation_class_material_types (
    id SERIAL PRIMARY KEY,
    valuation_class_id INTEGER NOT NULL,
    material_type_id INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    CONSTRAINT fk_valuation_class_material_types_valuation_class
        FOREIGN KEY (valuation_class_id) 
        REFERENCES valuation_classes(id) 
        ON DELETE CASCADE,
    
    CONSTRAINT fk_valuation_class_material_types_material_type
        FOREIGN KEY (material_type_id) 
        REFERENCES material_types(id) 
        ON DELETE CASCADE,
    
    -- Unique constraint: prevent duplicate material type assignments
    CONSTRAINT uk_valuation_class_material_types
        UNIQUE (valuation_class_id, material_type_id)
);

-- Step 8: Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_valuation_class_material_types_valuation_class_id 
    ON valuation_class_material_types(valuation_class_id);

CREATE INDEX IF NOT EXISTS idx_valuation_class_material_types_material_type_id 
    ON valuation_class_material_types(material_type_id);

COMMIT;
