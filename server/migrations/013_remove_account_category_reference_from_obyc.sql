-- Migration: Remove Account Category Reference from Material Account Determination
-- Description: User requested to remove this field from the OBYC setup

-- Drop the unique constraint first (it depends on the column)
ALTER TABLE material_account_determination 
DROP CONSTRAINT IF EXISTS uq_material_account_det;

-- Drop the foreign key constraint
ALTER TABLE material_account_determination 
DROP CONSTRAINT IF EXISTS fk_account_category_ref;

-- Drop the column
ALTER TABLE material_account_determination 
DROP COLUMN IF EXISTS account_category_reference_id;

-- Re-create unique constraint without the dropped column
ALTER TABLE material_account_determination 
ADD CONSTRAINT uq_material_account_det UNIQUE (
  chart_of_accounts_id, 
  valuation_grouping_code_id, 
  valuation_class_id,
  transaction_key_id
);
