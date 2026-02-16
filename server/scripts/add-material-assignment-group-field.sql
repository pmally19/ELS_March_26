-- Add material_assignment_group_code field to materials table
-- This script is safe to run multiple times (uses IF NOT EXISTS)

DO $$
BEGIN
  -- Add material_assignment_group_code column to materials table
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'materials' 
    AND column_name = 'material_assignment_group_code'
  ) THEN
    ALTER TABLE materials 
    ADD COLUMN material_assignment_group_code VARCHAR(4);
    
    -- Add index for better query performance
    CREATE INDEX idx_materials_mat_assign_group ON materials(material_assignment_group_code);
    
    RAISE NOTICE 'Added material_assignment_group_code column to materials table';
  ELSE
    RAISE NOTICE 'material_assignment_group_code column already exists in materials table';
  END IF;
END $$;

-- Verify the column exists
SELECT column_name, data_type, character_maximum_length
FROM information_schema.columns
WHERE table_name = 'materials'
AND column_name = 'material_assignment_group_code';
