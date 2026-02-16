-- Add weight_group column to sd_shipping_conditions table
ALTER TABLE sd_shipping_conditions ADD COLUMN IF NOT EXISTS weight_group VARCHAR(4);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_shipping_conditions_weight_group ON sd_shipping_conditions(weight_group);
