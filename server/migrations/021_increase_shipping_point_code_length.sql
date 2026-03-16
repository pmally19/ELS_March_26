
-- Increase character limit for shipping point codes
ALTER TABLE sd_shipping_points ALTER COLUMN code TYPE VARCHAR(20);

-- Increase character limit for shipping point determination columns
ALTER TABLE shipping_point_determination ALTER COLUMN proposed_shipping_point TYPE VARCHAR(20);
ALTER TABLE shipping_point_determination ALTER COLUMN shipping_condition_key TYPE VARCHAR(20);
ALTER TABLE shipping_point_determination ALTER COLUMN loading_group_code TYPE VARCHAR(20);
ALTER TABLE shipping_point_determination ALTER COLUMN plant_code TYPE VARCHAR(20);
