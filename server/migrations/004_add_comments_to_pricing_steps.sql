-- Migration: Add comments field to pricing_procedure_steps
-- Date: 2026-02-05
-- Purpose: Add comments column to match SAP reference image

ALTER TABLE pricing_procedure_steps 
ADD COLUMN IF NOT EXISTS comments TEXT;

COMMENT ON COLUMN pricing_procedure_steps.comments IS 'Additional notes or comments for the pricing step';
