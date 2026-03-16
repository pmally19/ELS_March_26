-- Migration: Add reconciliation_account_id to vendors table
-- Date: 2025-12-26
-- Purpose: Add reconciliation account field for vendor GL account assignment (SAP standard)

-- Step 1: Add reconciliation_account_id column if it doesn't exist
ALTER TABLE vendors 
  ADD COLUMN IF NOT EXISTS reconciliation_account_id INTEGER REFERENCES reconciliation_accounts(id);

-- Step 2: Create index for performance
CREATE INDEX IF NOT EXISTS idx_vendors_reconciliation_account_id 
  ON vendors(reconciliation_account_id);

-- Step 3: Add comment
COMMENT ON COLUMN vendors.reconciliation_account_id IS 
  'Reconciliation Account (SAP Standard) - GL account for vendor reconciliation. Links to reconciliation_accounts table where account_type = AP (Accounts Payable).';

