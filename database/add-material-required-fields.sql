-- Add missing required fields for Material Master
-- Based on SAP ECC requirements (without SAP terminology)

-- Accounting View: Price Control (S=Standard, V=Moving Average)
ALTER TABLE materials ADD COLUMN IF NOT EXISTS price_control VARCHAR(1);

-- Sales View: Sales Organization and Distribution Channel
ALTER TABLE materials ADD COLUMN IF NOT EXISTS sales_organization VARCHAR(10);
ALTER TABLE materials ADD COLUMN IF NOT EXISTS distribution_channel VARCHAR(10);

-- Purchasing View: Purchasing Group
ALTER TABLE materials ADD COLUMN IF NOT EXISTS purchasing_group VARCHAR(10);

-- Work Scheduling View: Production Storage Location
ALTER TABLE materials ADD COLUMN IF NOT EXISTS production_storage_location VARCHAR(10);

-- Add comments for documentation
COMMENT ON COLUMN materials.price_control IS 'Price control method: S=Standard Price, V=Moving Average';
COMMENT ON COLUMN materials.sales_organization IS 'Sales organization code for sales materials';
COMMENT ON COLUMN materials.distribution_channel IS 'Distribution channel code for sales materials';
COMMENT ON COLUMN materials.purchasing_group IS 'Purchasing group code for purchased materials';
COMMENT ON COLUMN materials.production_storage_location IS 'Storage location for production materials';

