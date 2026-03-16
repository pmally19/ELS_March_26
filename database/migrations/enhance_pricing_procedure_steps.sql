-- Migration: Enhance pricing_procedure_steps table with SAP-compatible fields
-- Date: 2026-02-05
-- Description: Add missing columns for subtotals, requirements, and statistical steps

-- Add new columns to pricing_procedure_steps
ALTER TABLE pricing_procedure_steps 
  ADD COLUMN IF NOT EXISTS from_step INTEGER,
  ADD COLUMN IF NOT EXISTS to_step INTEGER,
  ADD COLUMN IF NOT EXISTS requirement VARCHAR(10),
  ADD COLUMN IF NOT EXISTS is_statistical BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_printable BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_subtotal BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS manual_entry BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS accrual_key VARCHAR(10);

-- Add comments for documentation
COMMENT ON COLUMN pricing_procedure_steps.from_step IS 'Starting step number for subtotal calculation';
COMMENT ON COLUMN pricing_procedure_steps.to_step IS 'Ending step number for subtotal calculation';
COMMENT ON COLUMN pricing_procedure_steps.requirement IS 'Requirement code for conditional step execution';
COMMENT ON COLUMN pricing_procedure_steps.is_statistical IS 'If true, step is calculated but does not affect total';
COMMENT ON COLUMN pricing_procedure_steps.is_printable IS 'If true, step appears on printed documents';
COMMENT ON COLUMN pricing_procedure_steps.is_subtotal IS 'If true, step is a subtotal/formula step (no condition type)';
COMMENT ON COLUMN pricing_procedure_steps.manual_entry IS 'If true, allows manual override of calculated value';
COMMENT ON COLUMN pricing_procedure_steps.accrual_key IS 'Key for accrual posting';

-- Add constraint to ensure subtotal steps have from/to defined
ALTER TABLE pricing_procedure_steps 
  DROP CONSTRAINT IF EXISTS check_subtotal_range;

ALTER TABLE pricing_procedure_steps 
  ADD CONSTRAINT check_subtotal_range 
  CHECK (
    (is_subtotal = false) OR 
    (is_subtotal = true AND from_step IS NOT NULL AND to_step IS NOT NULL)
  );

-- Add index for performance on from_step/to_step queries
CREATE INDEX IF NOT EXISTS idx_pricing_steps_subtotal 
  ON pricing_procedure_steps(procedure_id, is_subtotal) 
  WHERE is_subtotal = true;

-- Allow condition_type_code to be nullable for subtotal steps
ALTER TABLE pricing_procedure_steps 
  ALTER COLUMN condition_type_code DROP NOT NULL;

COMMENT ON COLUMN pricing_procedure_steps.condition_type_code IS 'Condition type code - NULL for subtotal steps';
