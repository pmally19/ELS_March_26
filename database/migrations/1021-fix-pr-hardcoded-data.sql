-- Fix Purchase Requisitions - Remove hardcoded data and SAP terminology
-- Migration: 1021-fix-pr-hardcoded-data.sql (CORRECTED VERSION)

BEGIN;

-- Step 1: Expand status column from VARCHAR(1) to VARCHAR(30)
-- SAP uses 1-char codes like 'O', we need full words
ALTER TABLE purchase_requisitions 
  ALTER COLUMN status TYPE VARCHAR(30);

-- Step 2: Remove the default 'O' value (SAP terminology)
ALTER TABLE purchase_requisitions 
  ALTER COLUMN status DROP DEFAULT;

-- Step 3: Update any existing 'O' values to proper status
UPDATE purchase_requisitions 
SET status = 'SUBMITTED' 
WHERE status = 'O';

-- Step 4: Add constraint for allowed status values (no SAP codes)
ALTER TABLE purchase_requisitions
  DROP CONSTRAINT IF EXISTS chk_pr_status;

ALTER TABLE purchase_requisitions
  ADD CONSTRAINT chk_pr_status 
  CHECK (status IN (
    'DRAFT',              -- Initial creation
    'SUBMITTED',          -- Sent for approval
    'PENDING_APPROVAL',   -- Waiting for approval
    'APPROVED',           -- Approved by manager/finance
    'REJECTED',           -- Rejected
    'CONVERTED_TO_PO',    -- Converted to Purchase Order
    'CLOSED'              -- Closed/Cancelled
  ));

-- Step 5: Make requisition_number NOT NULL (no defaults)
ALTER TABLE purchase_requisitions
  ALTER COLUMN requisition_number SET NOT NULL;

-- Step 6: Make currency_code NOT NULL (must be specified, no hardcoded default)
ALTER TABLE purchase_requisitions
  ALTER COLUMN currency_code SET NOT NULL;

-- Step 7: Add helpful comments for developers
COMMENT ON COLUMN purchase_requisitions.status IS 
  'Requisition status: DRAFT, SUBMITTED, PENDING_APPROVAL, APPROVED, REJECTED, CONVERTED_TO_PO, CLOSED. No SAP codes, no defaults.';

COMMENT ON COLUMN purchase_requisitions.currency_code IS 
  'Currency code (e.g., USD, EUR, GBP) - must be explicitly set, no default value';

COMMENT ON TABLE purchase_requisitions IS 
  'Purchase requisitions - internal request to buy materials. All hardcoded defaults removed.';

COMMIT;
