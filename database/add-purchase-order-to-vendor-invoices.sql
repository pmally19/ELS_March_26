-- Add purchase_order column to vendor_invoices table
-- This allows linking vendor invoices to purchase orders

-- Add the column
ALTER TABLE vendor_invoices 
ADD COLUMN IF NOT EXISTS purchase_order VARCHAR(20);

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_vendor_invoices_purchase_order 
ON vendor_invoices(purchase_order);

-- Add comment
COMMENT ON COLUMN vendor_invoices.purchase_order IS 'Purchase Order number that this invoice is linked to';

-- Display current structure
SELECT column_name, data_type, character_maximum_length, is_nullable
FROM information_schema.columns
WHERE table_name = 'vendor_invoices'
ORDER BY ordinal_position;
