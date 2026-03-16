-- Migration: Remove calculation_base from pricing_procedure_steps
-- Date: 2026-02-05
-- Purpose: Remove field as requested by user

ALTER TABLE pricing_procedure_steps 
DROP COLUMN IF EXISTS calculation_base;
