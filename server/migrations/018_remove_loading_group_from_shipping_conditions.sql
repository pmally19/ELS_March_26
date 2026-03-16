-- Remove loading_group column from sd_shipping_conditions table
ALTER TABLE sd_shipping_conditions DROP COLUMN IF EXISTS loading_group;
