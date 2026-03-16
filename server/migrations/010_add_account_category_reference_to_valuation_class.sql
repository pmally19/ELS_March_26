-- Migration: Add Account Category Reference to Valuation Classes
-- Description: Adds account_category_reference_id foreign key column to valuation_classes table
-- This enables linking valuation classes to account category references for material valuation

-- Add account_category_reference_id column to valuation_classes table
ALTER TABLE valuation_classes
ADD COLUMN account_category_reference_id INTEGER;

-- Add foreign key constraint
ALTER TABLE valuation_classes
ADD CONSTRAINT fk_valuation_classes_account_category_reference
FOREIGN KEY (account_category_reference_id)
REFERENCES account_category_references(id)
ON DELETE SET NULL;

-- Add index for performance
CREATE INDEX idx_valuation_classes_account_category_reference_id 
ON valuation_classes(account_category_reference_id);

-- Add comment
COMMENT ON COLUMN valuation_classes.account_category_reference_id 
IS 'Foreign key to account_category_references table - links valuation class to account category for GL account determination';
