-- Migration: Add requires_reference Column to Payment Methods
-- Date: 2025-10-28
-- Description: Add requires_reference column to payment_methods table
--              to indicate whether a payment method requires a reference number

-- Add requires_reference column
ALTER TABLE payment_methods 
ADD COLUMN IF NOT EXISTS requires_reference BOOLEAN DEFAULT false;

-- Update existing payment methods based on common requirements
UPDATE payment_methods 
SET requires_reference = true 
WHERE code IN ('CHECK', 'WIRE', 'ACH', 'CARD') 
  AND requires_reference IS NULL;

UPDATE payment_methods 
SET requires_reference = false 
WHERE code = 'CASH' 
  AND requires_reference IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN payment_methods.requires_reference IS 'Whether this payment method requires a reference number (e.g., check number, transaction ID)';

