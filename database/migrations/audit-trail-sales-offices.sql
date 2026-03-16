ALTER TABLE sd_sales_offices ADD COLUMN IF NOT EXISTS _tenantId CHAR(3) DEFAULT '001';
ALTER TABLE sd_sales_offices ADD COLUMN IF NOT EXISTS _deletedAt TIMESTAMPTZ;
ALTER TABLE sd_sales_offices ADD COLUMN IF NOT EXISTS created_by INT;
ALTER TABLE sd_sales_offices ADD COLUMN IF NOT EXISTS updated_by INT;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS trigger_updated_at_sd_sales_offices ON sd_sales_offices;
CREATE TRIGGER trigger_updated_at_sd_sales_offices
    BEFORE UPDATE ON sd_sales_offices
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
