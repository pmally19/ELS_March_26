-- Add Standard Fields to Account Groups
-- This migration adds all standard fields per ERP standards without SAP terminology

-- Field Status Group - Controls field status in document entry
ALTER TABLE account_groups 
  ADD COLUMN IF NOT EXISTS field_status_group VARCHAR(4);

-- One-time Account Indicator - Allows one-time accounts
ALTER TABLE account_groups 
  ADD COLUMN IF NOT EXISTS one_time_account_indicator BOOLEAN DEFAULT false;

-- Authorization Group - For authorization checks
ALTER TABLE account_groups 
  ADD COLUMN IF NOT EXISTS authorization_group VARCHAR(4);

-- Sort Key - For sorting line items
ALTER TABLE account_groups 
  ADD COLUMN IF NOT EXISTS sort_key VARCHAR(2);

-- Block Indicator - To block the account group
ALTER TABLE account_groups 
  ADD COLUMN IF NOT EXISTS block_indicator BOOLEAN DEFAULT false;

-- Reconciliation Account Indicator - Indicates if reconciliation account is used
ALTER TABLE account_groups 
  ADD COLUMN IF NOT EXISTS reconciliation_account_indicator BOOLEAN DEFAULT false;

-- Account Number Format - Format/length for account numbers
ALTER TABLE account_groups 
  ADD COLUMN IF NOT EXISTS account_number_format VARCHAR(20);

-- Account Number Length - Maximum length for account numbers
ALTER TABLE account_groups 
  ADD COLUMN IF NOT EXISTS account_number_length INTEGER;

-- Screen Layout - Controls screen layout for master data entry
ALTER TABLE account_groups 
  ADD COLUMN IF NOT EXISTS screen_layout VARCHAR(4);

-- Payment Terms - Default payment terms
ALTER TABLE account_groups 
  ADD COLUMN IF NOT EXISTS payment_terms VARCHAR(4);

-- Dunning Area - For dunning procedures
ALTER TABLE account_groups 
  ADD COLUMN IF NOT EXISTS dunning_area VARCHAR(2);

-- Create indexes for new fields (after all columns are added)
DO $$ 
BEGIN
  -- Only create indexes if columns exist
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'account_groups' AND column_name = 'field_status_group') THEN
    CREATE INDEX IF NOT EXISTS idx_account_groups_field_status_group ON account_groups(field_status_group);
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'account_groups' AND column_name = 'authorization_group') THEN
    CREATE INDEX IF NOT EXISTS idx_account_groups_authorization_group ON account_groups(authorization_group);
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'account_groups' AND column_name = 'sort_key') THEN
    CREATE INDEX IF NOT EXISTS idx_account_groups_sort_key ON account_groups(sort_key);
  END IF;
END $$;

-- Add comments for documentation
COMMENT ON COLUMN account_groups.field_status_group IS 'Controls field status in document entry (required, optional, display, suppress)';
COMMENT ON COLUMN account_groups.one_time_account_indicator IS 'Allows creation of one-time accounts';
COMMENT ON COLUMN account_groups.authorization_group IS 'Authorization group for access control';
COMMENT ON COLUMN account_groups.sort_key IS 'Default sort sequence for line items';
COMMENT ON COLUMN account_groups.block_indicator IS 'Blocks the account group from being used';
COMMENT ON COLUMN account_groups.reconciliation_account_indicator IS 'Indicates if reconciliation account is used';
COMMENT ON COLUMN account_groups.account_number_format IS 'Format pattern for account numbers';
COMMENT ON COLUMN account_groups.account_number_length IS 'Maximum length for account numbers';
COMMENT ON COLUMN account_groups.screen_layout IS 'Controls screen layout for master data entry';
COMMENT ON COLUMN account_groups.payment_terms IS 'Default payment terms for this account group';
COMMENT ON COLUMN account_groups.dunning_area IS 'Dunning area for dunning procedures';

