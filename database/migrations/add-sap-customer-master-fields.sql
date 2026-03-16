-- Add missing SAP standard customer master fields (without SAP terminology)
-- General Data fields
ALTER TABLE erp_customers ADD COLUMN IF NOT EXISTS search_term VARCHAR(20);
ALTER TABLE erp_customers ADD COLUMN IF NOT EXISTS language_code VARCHAR(2);

-- Company Code Data fields
ALTER TABLE erp_customers ADD COLUMN IF NOT EXISTS sort_key VARCHAR(2);

-- Sales Area Data fields
ALTER TABLE erp_customers ADD COLUMN IF NOT EXISTS sales_org_code VARCHAR(10);
ALTER TABLE erp_customers ADD COLUMN IF NOT EXISTS distribution_channel_code VARCHAR(5);
ALTER TABLE erp_customers ADD COLUMN IF NOT EXISTS division_code VARCHAR(5);
ALTER TABLE erp_customers ADD COLUMN IF NOT EXISTS shipping_conditions VARCHAR(4);
ALTER TABLE erp_customers ADD COLUMN IF NOT EXISTS delivery_priority VARCHAR(2);
ALTER TABLE erp_customers ADD COLUMN IF NOT EXISTS sales_district VARCHAR(6);
ALTER TABLE erp_customers ADD COLUMN IF NOT EXISTS sales_office_code VARCHAR(4);
ALTER TABLE erp_customers ADD COLUMN IF NOT EXISTS sales_group_code VARCHAR(3);
ALTER TABLE erp_customers ADD COLUMN IF NOT EXISTS price_list VARCHAR(10);

-- Add foreign key constraints (optional, for data integrity)
-- Note: These will only work if the referenced tables exist
-- ALTER TABLE erp_customers ADD CONSTRAINT fk_sales_org FOREIGN KEY (sales_org_code) REFERENCES sd_sales_organizations(code);
-- ALTER TABLE erp_customers ADD CONSTRAINT fk_dist_channel FOREIGN KEY (distribution_channel_code) REFERENCES sd_distribution_channels(code);
-- ALTER TABLE erp_customers ADD CONSTRAINT fk_division FOREIGN KEY (division_code) REFERENCES sd_divisions(code);

-- Remove default values from existing columns (if they exist)
ALTER TABLE erp_customers ALTER COLUMN status DROP DEFAULT;
ALTER TABLE erp_customers ALTER COLUMN is_b2b DROP DEFAULT;
ALTER TABLE erp_customers ALTER COLUMN is_b2c DROP DEFAULT;
ALTER TABLE erp_customers ALTER COLUMN is_vip DROP DEFAULT;
ALTER TABLE erp_customers ALTER COLUMN is_active DROP DEFAULT;
ALTER TABLE erp_customers ALTER COLUMN active DROP DEFAULT;
ALTER TABLE erp_customers ALTER COLUMN dunning_block DROP DEFAULT;
ALTER TABLE erp_customers ALTER COLUMN payment_block DROP DEFAULT;
ALTER TABLE erp_customers ALTER COLUMN posting_block DROP DEFAULT;
ALTER TABLE erp_customers ALTER COLUMN deletion_flag DROP DEFAULT;
ALTER TABLE erp_customers ALTER COLUMN credit_limit_currency DROP DEFAULT;
ALTER TABLE erp_customers ALTER COLUMN credit_exposure DROP DEFAULT;
ALTER TABLE erp_customers ALTER COLUMN version DROP DEFAULT;
ALTER TABLE erp_customers ALTER COLUMN created_at DROP DEFAULT;
ALTER TABLE erp_customers ALTER COLUMN updated_at DROP DEFAULT;

