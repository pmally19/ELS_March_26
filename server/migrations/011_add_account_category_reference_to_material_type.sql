-- Migration: Add Account Category Reference to Material Types (Product Types)
-- Description: Adds account_category_reference_id foreign key column to product_types table
-- This enables linking material types to account category references for default material valuation settings

-- Add account_category_reference_id column to product_types table
ALTER TABLE product_types
ADD COLUMN account_category_reference_id INTEGER;

-- Add foreign key constraint
ALTER TABLE product_types
ADD CONSTRAINT fk_product_types_account_category_reference
FOREIGN KEY (account_category_reference_id)
REFERENCES account_category_references(id)
ON DELETE SET NULL;

-- Add index for performance
CREATE INDEX idx_product_types_account_category_reference_id 
ON product_types(account_category_reference_id);

-- Add comment
COMMENT ON COLUMN product_types.account_category_reference_id 
IS 'Foreign key to account_category_references table - default account category for materials of this type';
