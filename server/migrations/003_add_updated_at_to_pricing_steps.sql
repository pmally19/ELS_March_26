-- Migration: Add updated_at field to pricing_procedure_steps
-- Date: 2026-02-05
-- Purpose: Add missing updated_at column required by backend update logic

ALTER TABLE pricing_procedure_steps 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Create trigger to automatically update updated_at (optional but good practice, 
-- though the backend is currently handling it explicitly in the query)
-- For now, just adding the column is enough to fix the error.
