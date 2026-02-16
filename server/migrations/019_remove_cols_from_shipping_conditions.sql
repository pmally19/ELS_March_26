-- Remove description, plant_code, and proposed_shipping_point columns from sd_shipping_conditions table
ALTER TABLE sd_shipping_conditions DROP COLUMN IF EXISTS description;
ALTER TABLE sd_shipping_conditions DROP COLUMN IF EXISTS plant_code;
ALTER TABLE sd_shipping_conditions DROP COLUMN IF EXISTS proposed_shipping_point;
