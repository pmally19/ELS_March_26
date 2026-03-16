-- Migration: Increase PO Document Type code length from 2 to 3 characters
-- Purpose: Allow more flexible document type codes

BEGIN;

-- Step 1: Alter the code column to allow 3 characters
ALTER TABLE po_document_types 
ALTER COLUMN code TYPE VARCHAR(3);

-- Step 2: Update any existing codes if needed (optional - add padding if desired)
-- Example: UPDATE po_document_types SET code = code || 'A' WHERE length(code) = 2;

COMMIT;
