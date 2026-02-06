-- Migration: Add counter field to pricing_procedure_steps
-- Date: 2026-02-05
-- Purpose: Add SAP-standard counter field for sequential processing order

-- Step 1: Add counter column (nullable first to allow data population)
ALTER TABLE pricing_procedure_steps 
ADD COLUMN IF NOT EXISTS counter INTEGER;

-- Step 2: Populate counter for existing rows based on step_number order
UPDATE pricing_procedure_steps pps
SET counter = subq.row_num
FROM (
  SELECT id, 
         ROW_NUMBER() OVER (PARTITION BY procedure_id ORDER BY step_number) as row_num
  FROM pricing_procedure_steps
  WHERE counter IS NULL
) subq
WHERE pps.id = subq.id;

-- Step 3: Make counter NOT NULL now that all rows have values
ALTER TABLE pricing_procedure_steps 
ALTER COLUMN counter SET NOT NULL;

-- Step 4: Add index for performance on (procedure_id, counter)
CREATE INDEX IF NOT EXISTS idx_pricing_steps_counter 
ON pricing_procedure_steps(procedure_id, counter);

-- Step 5: Add comment for documentation
COMMENT ON COLUMN pricing_procedure_steps.counter IS 'Sequential processing order (1, 2, 3...) - SAP standard field';
