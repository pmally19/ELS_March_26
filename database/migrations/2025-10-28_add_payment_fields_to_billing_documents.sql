-- Migration: Add Payment Tracking Fields to Billing Documents
-- Date: 2025-10-28
-- Description: Add paid_amount and outstanding_amount columns to billing_documents table
--              to properly track payment status and outstanding balances

-- Add paid_amount column to track total payments received
ALTER TABLE billing_documents 
ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(15,2) DEFAULT 0.00;

-- Add outstanding_amount column to track remaining balance
ALTER TABLE billing_documents 
ADD COLUMN IF NOT EXISTS outstanding_amount NUMERIC(15,2);

-- Initialize outstanding_amount for existing records based on total_amount
UPDATE billing_documents 
SET outstanding_amount = COALESCE(total_amount, 0) - COALESCE(paid_amount, 0)
WHERE outstanding_amount IS NULL;

-- Set outstanding_amount default for future records
ALTER TABLE billing_documents 
ALTER COLUMN outstanding_amount SET DEFAULT 0.00;

-- Add comments for documentation
COMMENT ON COLUMN billing_documents.paid_amount IS 'Total amount paid against this invoice';
COMMENT ON COLUMN billing_documents.outstanding_amount IS 'Remaining balance to be paid (total_amount - paid_amount)';

-- Create index for better query performance on payment-related queries
CREATE INDEX IF NOT EXISTS idx_billing_documents_outstanding_amount 
ON billing_documents(outstanding_amount) 
WHERE outstanding_amount > 0;

