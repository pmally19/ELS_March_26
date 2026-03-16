-- Migration: Make critical fields required (NOT NULL)
-- Date: 2025-01-28
-- Purpose: Make document_type and sales_org_id required fields

-- Note: This will fail if existing records have NULL values
-- First, update existing NULL values to a default, then make NOT NULL

DO $$
DECLARE
  null_count INTEGER;
BEGIN
  -- Check and update document_type
  SELECT COUNT(*) INTO null_count 
  FROM sales_orders 
  WHERE document_type IS NULL;
  
  IF null_count > 0 THEN
    -- Update NULL values to a placeholder (you may want to set a specific default)
    UPDATE sales_orders 
    SET document_type = 'STANDARD' 
    WHERE document_type IS NULL;
    
    RAISE NOTICE 'Updated % records with NULL document_type', null_count;
  END IF;

  -- Check and update sales_org_id
  SELECT COUNT(*) INTO null_count 
  FROM sales_orders 
  WHERE sales_org_id IS NULL;
  
  IF null_count > 0 THEN
    -- Get first available sales org or leave NULL (will need manual fix)
    -- For now, we'll just warn - you may want to set a default
    RAISE NOTICE 'Found % records with NULL sales_org_id - these need manual update before making field required', null_count;
  END IF;
END $$;

-- Make document_type NOT NULL (only if no NULLs exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM sales_orders WHERE document_type IS NULL
  ) THEN
    ALTER TABLE sales_orders 
    ALTER COLUMN document_type SET NOT NULL;
    RAISE NOTICE 'Made document_type NOT NULL';
  ELSE
    RAISE WARNING 'Cannot make document_type NOT NULL - NULL values exist. Please update them first.';
  END IF;
END $$;

-- Make sales_org_id NOT NULL (only if no NULLs exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM sales_orders WHERE sales_org_id IS NULL
  ) THEN
    ALTER TABLE sales_orders 
    ALTER COLUMN sales_org_id SET NOT NULL;
    RAISE NOTICE 'Made sales_org_id NOT NULL';
  ELSE
    RAISE WARNING 'Cannot make sales_org_id NOT NULL - NULL values exist. Please update them first.';
  END IF;
END $$;

