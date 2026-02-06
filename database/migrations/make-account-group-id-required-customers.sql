-- Migration: Make account_group_id Required for Customer Master
-- Date: 2025-01-28
-- Purpose: Enforce SAP standard requirement that Account Group is mandatory for customer master

-- Step 1: Ensure account_group_id column exists (if migration fix-account-groups-standard.sql hasn't run)
ALTER TABLE erp_customers 
  ADD COLUMN IF NOT EXISTS account_group_id INTEGER REFERENCES account_groups(id);

-- Step 2: For existing customers without account_group_id, assign a default account group
-- First, ensure we have at least one CUSTOMER type account group
DO $$
DECLARE
  default_account_group_id INTEGER;
BEGIN
  -- Find or create a default account group for customers
  SELECT id INTO default_account_group_id
  FROM account_groups
  WHERE account_type = 'CUSTOMER' AND is_active = true
  ORDER BY id
  LIMIT 1;
  
  -- If no account group exists, create one
  IF default_account_group_id IS NULL THEN
    INSERT INTO account_groups (code, name, description, account_type, is_active, created_at, updated_at)
    VALUES ('01', 'Standard Customers', 'Default account group for standard customers', 'CUSTOMER', true, NOW(), NOW())
    RETURNING id INTO default_account_group_id;
  END IF;
  
  -- Update all customers without account_group_id to use the default
  UPDATE erp_customers
  SET account_group_id = default_account_group_id
  WHERE account_group_id IS NULL;
  
  RAISE NOTICE 'Assigned default account group % to % customers', 
    default_account_group_id, 
    (SELECT COUNT(*) FROM erp_customers WHERE account_group_id = default_account_group_id);
END $$;

-- Step 3: Add NOT NULL constraint to account_group_id
ALTER TABLE erp_customers 
  ALTER COLUMN account_group_id SET NOT NULL;

-- Step 4: Add index for performance (if it doesn't exist)
CREATE INDEX IF NOT EXISTS idx_erp_customers_account_group_id 
  ON erp_customers(account_group_id);

-- Step 5: Add comment
COMMENT ON COLUMN erp_customers.account_group_id IS 
  'Required: Account Group (KTOKD equivalent) - Controls field visibility, number ranges, and customer classification. SAP Standard: Required field.';

