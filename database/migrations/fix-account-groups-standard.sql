-- Fix Account Groups to Standard Structure
-- This migration fixes account groups per standard practices, removes hardcoded data, and removes SAP terminology

-- Step 1: Ensure account_groups table has the correct structure
ALTER TABLE account_groups 
  ADD COLUMN IF NOT EXISTS code VARCHAR(10);
  
ALTER TABLE account_groups 
  ADD COLUMN IF NOT EXISTS name VARCHAR(100);
  
ALTER TABLE account_groups 
  ADD COLUMN IF NOT EXISTS description TEXT;
  
ALTER TABLE account_groups 
  ADD COLUMN IF NOT EXISTS account_type VARCHAR(20) DEFAULT 'CUSTOMER';
  
ALTER TABLE account_groups 
  ADD COLUMN IF NOT EXISTS number_range_from VARCHAR(20);
  
ALTER TABLE account_groups 
  ADD COLUMN IF NOT EXISTS number_range_to VARCHAR(20);
  
ALTER TABLE account_groups 
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
  
ALTER TABLE account_groups 
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
  
ALTER TABLE account_groups 
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Make chart_id nullable if it's NOT NULL (it's an old column)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'account_groups' 
    AND column_name = 'chart_id' 
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE account_groups ALTER COLUMN chart_id DROP NOT NULL;
  END IF;
END $$;

-- Step 2: Migrate existing data if needed
UPDATE account_groups 
SET code = COALESCE(code, chart_id, LPAD(id::TEXT, 2, '0')),
    name = COALESCE(name, group_name, 'Account Group ' || id),
    description = COALESCE(description, group_name),
    account_type = COALESCE(account_type, 'CUSTOMER'),
    number_range_from = COALESCE(number_range_from, account_range_from),
    number_range_to = COALESCE(number_range_to, account_range_to),
    is_active = COALESCE(is_active, active, true),
    updated_at = CURRENT_TIMESTAMP
WHERE code IS NULL OR name IS NULL;

-- Step 3: Ensure code is unique and not null
UPDATE account_groups 
SET code = LPAD(id::TEXT, 2, '0')
WHERE code IS NULL OR code = '';

ALTER TABLE account_groups 
  ALTER COLUMN code SET NOT NULL;

-- Add unique constraint if it doesn't exist (composite: code + account_type)
DO $$ 
BEGIN
  -- Drop old constraint if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'account_groups_code_key'
  ) THEN
    ALTER TABLE account_groups DROP CONSTRAINT account_groups_code_key;
  END IF;
  
  -- Add composite unique constraint
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'account_groups_code_account_type_key'
  ) THEN
    ALTER TABLE account_groups ADD CONSTRAINT account_groups_code_account_type_key UNIQUE (code, account_type);
  END IF;
END $$;

-- Step 4: Add account_group_id to erp_customers if it doesn't exist
ALTER TABLE erp_customers 
  ADD COLUMN IF NOT EXISTS account_group_id INTEGER REFERENCES account_groups(id);

-- Step 5: Add account_group_id to materials if it doesn't exist  
ALTER TABLE materials 
  ADD COLUMN IF NOT EXISTS material_account_group_id INTEGER REFERENCES account_groups(id);

-- Step 6: Migrate existing account_group text fields to account_group_id references
-- For customers: If account_group column exists, map it to account_groups.code
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'erp_customers' AND column_name = 'account_group'
  ) THEN
    UPDATE erp_customers ec
    SET account_group_id = (
      SELECT id FROM account_groups ag
      WHERE ag.code = ec.account_group 
        AND ag.is_active = true
      LIMIT 1
    )
    WHERE ec.account_group IS NOT NULL 
      AND ec.account_group_id IS NULL;
  END IF;
END $$;

-- For materials: map existing material_group text to account_groups.code
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'materials' AND column_name = 'material_group'
  ) THEN
    UPDATE materials m
    SET material_account_group_id = (
      SELECT id FROM account_groups ag
      WHERE ag.code = m.material_group 
        AND ag.is_active = true
      LIMIT 1
    )
    WHERE m.material_group IS NOT NULL 
      AND m.material_account_group_id IS NULL;
  END IF;
END $$;

-- Step 7: Update account_determination table to use account_group_id instead of text codes
ALTER TABLE account_determination 
  ADD COLUMN IF NOT EXISTS customer_account_group_id INTEGER REFERENCES account_groups(id);
  
ALTER TABLE account_determination 
  ADD COLUMN IF NOT EXISTS material_account_group_id INTEGER REFERENCES account_groups(id);

-- Migrate customer_group text to customer_account_group_id
UPDATE account_determination ad
SET customer_account_group_id = (
  SELECT id FROM account_groups ag
  WHERE (ag.code = ad.customer_group OR (ad.customer_group = '*' AND ag.code = 'DEFAULT'))
    AND ag.is_active = true
  LIMIT 1
)
WHERE ad.customer_group IS NOT NULL 
  AND ad.customer_account_group_id IS NULL;

-- Migrate material_group text to material_account_group_id  
UPDATE account_determination ad
SET material_account_group_id = (
  SELECT id FROM account_groups ag
  WHERE (ag.code = ad.material_group OR (ad.material_group = '*' AND ag.code = 'DEFAULT'))
    AND ag.is_active = true
  LIMIT 1
)
WHERE ad.material_group IS NOT NULL 
  AND ad.material_account_group_id IS NULL;

-- Step 8: Replace SAP terminology in account_determination with generic keys
-- First, alter account_key column to support longer values
ALTER TABLE account_determination 
  ALTER COLUMN account_key TYPE VARCHAR(30);

-- ERL -> REVENUE, ERF -> REVENUE_FINAL, ERS -> REVENUE_STATISTICAL
UPDATE account_determination
SET account_key = CASE 
  WHEN account_key = 'ERL' THEN 'REVENUE'
  WHEN account_key = 'ERF' THEN 'REVENUE_FINAL'
  WHEN account_key = 'ERS' THEN 'REVENUE_STATISTICAL'
  ELSE account_key
END
WHERE account_key IN ('ERL', 'ERF', 'ERS');

-- Step 9: Create default account groups if they don't exist
INSERT INTO account_groups (code, chart_id, group_name, name, description, account_type, number_range_from, number_range_to, is_active, active)
SELECT '01', '01', 'Standard Customers', 'Standard Customers', 'Standard customer account group', 'CUSTOMER', '1000000', '1999999', true, true
WHERE NOT EXISTS (SELECT 1 FROM account_groups WHERE code = '01' AND account_type = 'CUSTOMER');

INSERT INTO account_groups (code, chart_id, group_name, name, description, account_type, number_range_from, number_range_to, is_active, active)
SELECT '02', '02', 'Retail Customers', 'Retail Customers', 'Retail customer account group', 'CUSTOMER', '2000000', '2999999', true, true
WHERE NOT EXISTS (SELECT 1 FROM account_groups WHERE code = '02' AND account_type = 'CUSTOMER');

INSERT INTO account_groups (code, chart_id, group_name, name, description, account_type, number_range_from, number_range_to, is_active, active)
SELECT '01', '01', 'Raw Materials', 'Raw Materials', 'Raw materials group', 'MATERIAL', '4000000', '4999999', true, true
WHERE NOT EXISTS (SELECT 1 FROM account_groups WHERE code = '01' AND account_type = 'MATERIAL');

INSERT INTO account_groups (code, chart_id, group_name, name, description, account_type, number_range_from, number_range_to, is_active, active)
SELECT '03', '03', 'Finished Goods', 'Finished Goods', 'Finished goods material group', 'MATERIAL', '3000000', '3999999', true, true
WHERE NOT EXISTS (SELECT 1 FROM account_groups WHERE code = '03' AND account_type = 'MATERIAL');

INSERT INTO account_groups (code, chart_id, group_name, name, description, account_type, number_range_from, number_range_to, is_active, active)
SELECT 'DEFAULT', 'DEFAULT', 'Default Account Group', 'Default Account Group', 'Default group for wildcard matching', 'CUSTOMER', NULL, NULL, true, true
WHERE NOT EXISTS (SELECT 1 FROM account_groups WHERE code = 'DEFAULT' AND account_type = 'CUSTOMER');

-- Step 10: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_account_groups_code ON account_groups(code);
CREATE INDEX IF NOT EXISTS idx_account_groups_account_type ON account_groups(account_type);
CREATE INDEX IF NOT EXISTS idx_erp_customers_account_group_id ON erp_customers(account_group_id);
CREATE INDEX IF NOT EXISTS idx_materials_material_account_group_id ON materials(material_account_group_id);
CREATE INDEX IF NOT EXISTS idx_account_determination_customer_group_id ON account_determination(customer_account_group_id);
CREATE INDEX IF NOT EXISTS idx_account_determination_material_group_id ON account_determination(material_account_group_id);

-- Step 11: Add triggers for updated_at
CREATE OR REPLACE FUNCTION update_account_groups_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_account_groups_updated_at ON account_groups;
CREATE TRIGGER trigger_update_account_groups_updated_at
  BEFORE UPDATE ON account_groups
  FOR EACH ROW
  EXECUTE FUNCTION update_account_groups_updated_at();

COMMENT ON TABLE account_groups IS 'Account groups for classifying customers, vendors, and materials without SAP terminology';
COMMENT ON COLUMN account_groups.code IS 'Unique code for the account group (standard format: 01, 02, etc.)';
COMMENT ON COLUMN account_groups.name IS 'Display name of the account group';
COMMENT ON COLUMN account_groups.account_type IS 'Type: CUSTOMER, VENDOR, or MATERIAL';
COMMENT ON COLUMN account_groups.number_range_from IS 'Starting number range for account numbers';
COMMENT ON COLUMN account_groups.number_range_to IS 'Ending number range for account numbers';


