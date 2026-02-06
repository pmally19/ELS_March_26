-- Migration: Add description field to pricing_procedure_steps
-- Date: 2026-02-05
-- Purpose: Add description field for custom step labels (e.g. Subtotals)

-- Step 1: Add description column
ALTER TABLE pricing_procedure_steps 
ADD COLUMN IF NOT EXISTS description VARCHAR(255);

-- Step 2: Comment
COMMENT ON COLUMN pricing_procedure_steps.description IS 'Custom description for the step, overrides condition type name if present';
