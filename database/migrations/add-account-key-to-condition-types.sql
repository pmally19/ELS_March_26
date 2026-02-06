-- Migration: Add account_key field to condition_types table
-- Purpose: Enable GL account determination for condition types

BEGIN;

-- Step 1: Add account_key column to condition_types table
ALTER TABLE condition_types 
ADD COLUMN IF NOT EXISTS account_key VARCHAR(3);

-- Step 2: Add comment to the column
COMMENT ON COLUMN condition_types.account_key IS 'Account key for GL account determination (references fi_account_keys)';

-- Step 3: Add index for performance
CREATE INDEX IF NOT EXISTS idx_condition_types_account_key 
ON condition_types(account_key) 
WHERE account_key IS NOT NULL;

COMMIT;

-- Verification
DO $$
BEGIN
  RAISE NOTICE '✅ Account Key column added to condition_types table';
  RAISE NOTICE '  - Column: account_key VARCHAR(3)';
  RAISE NOTICE '  - Indexed for performance';
  RAISE NOTICE '  - NULL allowed (optional field)';
END $$;
