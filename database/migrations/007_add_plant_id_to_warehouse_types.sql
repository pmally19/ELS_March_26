-- Migration: Add Plant ID to Warehouse Types
-- Date: 2025-01-28
-- Description: Adds plant_id column to warehouse_types table to make warehouse types plant-specific as per SAP standards

-- Step 1: Add plant_id column (nullable initially for migration)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'warehouse_types' 
        AND column_name = 'plant_id'
    ) THEN
        ALTER TABLE warehouse_types ADD COLUMN plant_id INTEGER;
        RAISE NOTICE 'Added plant_id column to warehouse_types';
    END IF;
END $$;

-- Step 2: Set default plant_id for existing records (use first active plant)
-- This allows existing records to be migrated
-- Note: If no plants exist, this will leave plant_id as NULL, which should be handled manually
DO $$
DECLARE
    first_plant_id INTEGER;
BEGIN
    -- Get first active plant
    SELECT id INTO first_plant_id
    FROM plants 
    WHERE is_active = true AND status = 'active'
    ORDER BY id
    LIMIT 1;
    
    -- Update existing warehouse types if a plant exists
    IF first_plant_id IS NOT NULL THEN
        UPDATE warehouse_types
        SET plant_id = first_plant_id
        WHERE plant_id IS NULL;
        RAISE NOTICE 'Updated existing warehouse types with plant_id: %', first_plant_id;
    ELSE
        RAISE WARNING 'No active plants found. Existing warehouse types will have NULL plant_id. Please update manually.';
    END IF;
END $$;

-- Step 3: Add foreign key constraint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_schema = 'public' 
        AND table_name = 'warehouse_types' 
        AND constraint_name = 'fk_warehouse_types_plant'
    ) THEN
        ALTER TABLE warehouse_types 
        ADD CONSTRAINT fk_warehouse_types_plant 
        FOREIGN KEY (plant_id) REFERENCES plants(id) ON DELETE RESTRICT;
        RAISE NOTICE 'Added foreign key constraint fk_warehouse_types_plant';
    END IF;
END $$;

-- Step 4: Drop old unique constraint on code (if exists) and add composite unique constraint
DO $$
BEGIN
    -- Drop existing unique constraint on code if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_schema = 'public' 
        AND table_name = 'warehouse_types' 
        AND constraint_type = 'UNIQUE'
        AND constraint_name LIKE '%code%'
    ) THEN
        ALTER TABLE warehouse_types DROP CONSTRAINT IF EXISTS warehouse_types_code_key;
        RAISE NOTICE 'Dropped existing unique constraint on code';
    END IF;
    
    -- Add composite unique constraint on (plant_id, code)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_schema = 'public' 
        AND table_name = 'warehouse_types' 
        AND constraint_name = 'uk_warehouse_types_plant_code'
    ) THEN
        ALTER TABLE warehouse_types 
        ADD CONSTRAINT uk_warehouse_types_plant_code 
        UNIQUE (plant_id, code);
        RAISE NOTICE 'Added composite unique constraint uk_warehouse_types_plant_code';
    END IF;
END $$;

-- Step 5: Make plant_id NOT NULL (only after ensuring all records have plant_id)
-- Note: This step should be run after migration of existing data
-- For now, we'll allow NULL for existing records, but new records will require it at application level
-- Uncomment the following after verifying all existing records have plant_id:
-- ALTER TABLE warehouse_types ALTER COLUMN plant_id SET NOT NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_warehouse_types_plant_id ON warehouse_types(plant_id);

-- Add comment
COMMENT ON COLUMN warehouse_types.plant_id IS 'Reference to plant - warehouse types are plant-specific as per SAP standards';

