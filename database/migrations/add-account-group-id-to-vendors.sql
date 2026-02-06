-- Migration: Add account_group_id to vendors table
-- Date: 2025-12-26
-- Purpose: Add account group reference to vendors for SAP-standard vendor code auto-generation

-- Step 1: Add account_group_id column if it doesn't exist
ALTER TABLE vendors 
  ADD COLUMN IF NOT EXISTS account_group_id INTEGER REFERENCES account_groups(id);

-- Step 2: Migrate existing account_group text to account_group_id if possible
DO $$ 
DECLARE
  migrated_count INTEGER;
BEGIN
  -- Update vendors that have account_group text matching account_groups.code
  UPDATE vendors v
  SET account_group_id = (
    SELECT id FROM account_groups ag
    WHERE ag.code = v.account_group 
      AND ag.account_type = 'VENDOR'
      AND ag.is_active = true
    LIMIT 1
  )
  WHERE v.account_group IS NOT NULL 
    AND v.account_group_id IS NULL
    AND EXISTS (
      SELECT 1 FROM account_groups ag 
      WHERE ag.code = v.account_group 
        AND ag.account_type = 'VENDOR'
        AND ag.is_active = true
    );
  
  GET DIAGNOSTICS migrated_count = ROW_COUNT;
  RAISE NOTICE 'Migrated % vendors from account_group text to account_group_id', migrated_count;
END $$;

-- Step 3: For vendors without account_group_id, assign a default VENDOR account group
DO $$
DECLARE
  default_account_group_id INTEGER;
BEGIN
  -- Find or create a default account group for vendors
  SELECT id INTO default_account_group_id
  FROM account_groups
  WHERE account_type = 'VENDOR' AND is_active = true
  ORDER BY id
  LIMIT 1;
  
  -- If no account group exists, create one
  IF default_account_group_id IS NULL THEN
    INSERT INTO account_groups (code, name, description, account_type, is_active, created_at, updated_at)
    VALUES ('VEN01', 'Standard Vendors', 'Default account group for standard vendors', 'VENDOR', true, NOW(), NOW())
    RETURNING id INTO default_account_group_id;
  END IF;
  
  -- Update all vendors without account_group_id to use the default
  UPDATE vendors
  SET account_group_id = default_account_group_id
  WHERE account_group_id IS NULL;
  
  RAISE NOTICE 'Assigned default account group % to vendors without account_group_id', 
    default_account_group_id;
END $$;

-- Step 4: Create index for performance
CREATE INDEX IF NOT EXISTS idx_vendors_account_group_id 
  ON vendors(account_group_id);

-- Step 5: Add comment
COMMENT ON COLUMN vendors.account_group_id IS 
  'Required: Account Group (KTOKD equivalent) - Controls vendor code generation, field visibility, and vendor classification. SAP Standard: Required field.';

